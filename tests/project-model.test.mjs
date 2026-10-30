import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDerivations, buildProjectSummary, calculateProject, syncDerivationPowers } from '../lib/project-model.mjs'

const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ~${expected}, got ${actual}`)

const defaults = {
  powerW: 0,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  gamma: 48.5,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 16,
  peSection: 16,
  controlSection: 1.5,
  tubeDiameter: 40,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
}

const load = {
  housing: [{ level: 'Básica', power: 5750, homes: 3 }],
  locals: [{ name: 'Local 1', type: 'Comercial/oficina', area: 20, real: 0 }],
  garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 100 }],
  parking: 30,
  irveOption: 1,
}

const loadResult = {
  localPowers: [3450],
  garagePowers: [2000],
  p2: 0,
  p5: 30 * 3680,
  total: 50000,
}

const lga = {
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  gamma: 44,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 35,
  peSection: 35,
  controlSection: 1.5,
  tubeDiameter: 140,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
}

test('buildDerivations creates one derivation per consumer', () => {
  const derivations = buildDerivations(load, loadResult, defaults)

  assert.equal(derivations.length, 7, '3 dwellings + local + common services + garage + IRVE')
  assert.deepEqual(derivations.map(item => item.kind), [
    'dwelling', 'dwelling', 'dwelling', 'local', 'common-services', 'garage', 'irve',
  ])
  assert.equal(derivations.filter(item => item.kind === 'dwelling').length, 3, 'one per dwelling unit')
  assert.equal(derivations[0].powerW, 5750, 'dwelling uses its installed power')
  assert.equal(derivations[3].powerW, 3450, 'local uses its preview power')
  assert.equal(derivations[4].powerW, 0, 'common services uses P2')
  assert.equal(derivations[5].powerW, 2000, 'garage uses its preview power')
  assert.equal(derivations[6].powerW, loadResult.p5, 'IRVE uses P5')
})

test('each derivation keeps its own system and voltage', () => {
  const derivations = buildDerivations(load, loadResult, defaults)

  assert.equal(derivations[0].system, 'single-phase')
  assert.equal(derivations[0].voltageV, 230)
  assert.equal(derivations[3].system, 'single-phase', 'commercial local is single-phase by default')
  assert.equal(derivations[4].system, 'three-phase', 'common services is three-phase')
  assert.equal(derivations[4].voltageV, 400)
  assert.equal(derivations[6].system, 'three-phase', 'IRVE is three-phase')
})

test('the project LGA defaults to the forecast total and can be overridden', () => {
  const derivations = buildDerivations(load, loadResult, defaults)

  const auto = calculateProject({ loadTotal: loadResult.total, lga, lgaPowerMode: 'auto', derivations })
  assert.equal(auto.lga.powerW, loadResult.total, 'auto mode follows the forecast total')
  near(auto.lga.result.ratedCurrent, loadResult.total / (Math.sqrt(3) * 400), 0.01, 'LGA current follows the total')

  const manual = calculateProject({ loadTotal: loadResult.total, lga, lgaPowerMode: 'manual', derivations })
  assert.equal(manual.lga.powerW, lga.powerW, 'manual mode keeps the edited power')
})

test('each derivation is sized with its own power, not the building total', () => {
  const derivations = buildDerivations(load, loadResult, defaults)
  const project = calculateProject({ loadTotal: loadResult.total, lga, derivations })

  const firstDwelling = project.derivations[0]
  near(firstDwelling.result.ratedCurrent, 5750 / 230, 0.01, 'dwelling current uses 5.750 W at 230 V')

  const irve = project.derivations[6]
  near(irve.result.ratedCurrent, loadResult.p5 / (Math.sqrt(3) * 400), 0.01, 'IRVE current uses its own three-phase power')
})

test('the summary reports the derivation count, power and coordination warnings', () => {
  const derivations = buildDerivations(load, loadResult, defaults)
  const project = calculateProject({ loadTotal: loadResult.total, lga, derivations })
  const expectedPower = 3 * 5750 + 3450 + 0 + 2000 + loadResult.p5

  assert.equal(project.summary.derivationCount, 7)
  assert.equal(project.summary.derivationPower, expectedPower)
  assert.ok(project.summary.lgaSection != null, 'the LGA section is reported')
  assert.ok(project.summary.warnings.some(warning => warning.includes('LGA')), 'selectivity warning is reported')
})

test('an empty derivation list is reported instead of hidden', () => {
  const summary = buildProjectSummary({ loadTotal: 1000, lgaResult: { protection: 10, finalSection: 10 }, derivations: [] })

  assert.equal(summary.derivationCount, 0)
  assert.equal(summary.derivationPower, 0)
  assert.ok(summary.warnings.some(warning => warning.includes('No hay derivaciones')))
})

test('syncDerivationPowers refreshes generated powers and leaves custom rows', () => {
  const seeds = buildDerivations(load, loadResult, defaults)
  const nextLoad = {
    ...load,
    housing: [{ ...load.housing[0], power: 9200 }],
  }
  const nextResult = {
    ...loadResult,
    localPowers: [10350],
    garagePowers: [3000],
    p2: 5000,
    p5: 20000,
  }

  const synced = syncDerivationPowers(seeds, nextLoad, nextResult)
  assert.equal(synced[0].powerW, 9200, 'dwelling follows the housing row')
  assert.equal(synced[3].powerW, 10350, 'local follows its preview')
  assert.equal(synced[4].powerW, 5000, 'common services follows P2')
  assert.equal(synced[5].powerW, 3000, 'garage follows its preview')
  assert.equal(synced[6].powerW, 20000, 'IRVE follows P5')

  const industrialLoad = { ...load, locals: [{ ...load.locals[0], type: 'Industria' }] }
  const industrial = syncDerivationPowers(seeds, industrialLoad, nextResult)
  assert.equal(industrial[3].system, 'three-phase', 'local follows its industrial system')
  assert.equal(industrial[3].voltageV, 400, 'industrial local moves to 400 V')

  const custom = { ...seeds[0], id: 'custom', sourceKey: null, powerW: 1234 }
  assert.equal(syncDerivationPowers([custom], nextLoad, nextResult)[0].powerW, 1234, 'custom DI keeps its power')
})
