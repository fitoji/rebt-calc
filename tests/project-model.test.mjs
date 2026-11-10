import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDerivations, buildProjectSummary, calculateProject, mergeDerivations, syncDerivationPowers } from '../lib/project-model.mjs'

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
  housing: [{ level: 'Básica', power: 5750, homes: 3, area: 90 }],
  locals: [{ name: 'Local 1', type: 'Comercial/oficina', area: 20, real: 0 }],
  garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 100 }],
  parking: 30,
  irveOption: 1,
}

const loadResult = {
  localPowers: [3450],
  garagePowers: [2000],
  p2: 3450,
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
  assert.equal(derivations[4].powerW, 3450, 'common services uses P2')
  assert.equal(derivations[5].powerW, 2000, 'garage uses its preview power')
  assert.equal(derivations[6].powerW, loadResult.p5, 'IRVE uses P5')
})

test('generated dwellings carry the surface of their housing row', () => {
  const derivations = buildDerivations(load, loadResult, defaults)
  const dwellings = derivations.filter(item => item.kind === 'dwelling')
  assert.ok(dwellings.every(item => item.housingAreaM2 === 90), 'every dwelling inherits the row surface')

  const changed = syncDerivationPowers(derivations, { ...load, housing: [{ ...load.housing[0], area: 110 }] }, loadResult)
  assert.ok(changed.filter(item => item.kind === 'dwelling').every(item => item.housingAreaM2 === 110), 'the surface follows the row edit')
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
  const expectedPower = 3 * 5750 + 3450 + 3450 + 2000 + loadResult.p5

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

// Regla pedida: «Servicios generales» e IRVE no deben aparecer en DI cuando
// están en cero: una línea de 0 W no se dimensiona, solo ensucia la lista.
test('servicios generales e IRVE se omiten de DI cuando su potencia es cero', () => {
  const minimal = { housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }], locals: [], garages: [], parking: 0 }
  const derivations = buildDerivations(minimal, { p2: 0, p5: 0, localPowers: [], garagePowers: [] }, defaults)

  assert.deepEqual(derivations.map(d => d.kind), ['dwelling'], 'only the dwelling line survives')
  assert.ok(!derivations.some(d => d.sourceKey === 'common-services'), 'no common-services line at 0 W')
  assert.ok(!derivations.some(d => d.sourceKey === 'irve'), 'no IRVE line at 0 W')
})

test('servicios generales e IRVE siguen apareciendo cuando tienen potencia', () => {
  const minimal = { housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }], locals: [], garages: [], parking: 10 }
  const derivations = buildDerivations(minimal, { p2: 8600, p5: 3680, localPowers: [], garagePowers: [] }, defaults)
  const keys = derivations.map(d => d.sourceKey)

  assert.ok(keys.includes('common-services'), 'the common-services line is kept above 0 W')
  assert.ok(keys.includes('irve'), 'the IRVE line is kept above 0 W')
})

// Misma regla para las filas manuales: una fila de local o garaje que no
// aporta potencia no se convierte en una DI de 0 W.
test('locales y garajes sin potencia no generan DI', () => {
  const withRows = {
    housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }],
    locals: [{ name: 'Local vacío', type: 'Comercial/oficina', area: 0, real: 0 }],
    garages: [{ name: 'Garaje vacío', ventilation: 'Forzada', area: 0 }],
    parking: 0,
  }
  const derivations = buildDerivations(withRows, { p2: 0, p5: 0, localPowers: [0], garagePowers: [0] }, defaults)

  assert.deepEqual(derivations.map(d => d.kind), ['dwelling'], 'zero-power rows are skipped')
})

test('locales y garajes con potencia siguen generando su DI', () => {
  const withRows = {
    housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }],
    locals: [{ name: 'Local 1', type: 'Comercial/oficina', area: 20, real: 0 }],
    garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 100 }],
    parking: 0,
  }
  const derivations = buildDerivations(withRows, { p2: 0, p5: 0, localPowers: [3450], garagePowers: [2000] }, defaults)

  assert.deepEqual(derivations.map(d => d.kind), ['dwelling', 'local', 'garage'], 'priced rows keep their line')
})

// Una instalación de único usuario no tiene LGA: avisar de su protección sería
// advertir sobre una línea que no existe.
test('sin LGA no se advierte sobre su protección', () => {
  const derivations = buildDerivations(load, loadResult, defaults)
  const withLga = calculateProject({ loadTotal: loadResult.total, lga: { ...lga, protectionA: 10 }, derivations })
  const withoutLga = calculateProject({ loadTotal: loadResult.total, lga: { ...lga, protectionA: 10 }, derivations, hasLga: false })

  assert.ok(withLga.summary.warnings.some(warning => warning.includes('LGA')), 'con LGA el aviso se emite')
  assert.ok(!withoutLga.summary.warnings.some(warning => warning.includes('LGA')), 'sin LGA no hay aviso de LGA')
})

// Regenerar las DI desde la previsión no puede borrar el trabajo hecho en los
// cuadros: la derivación que sigue existiendo conserva lo que el usuario editó.
test('mergeDerivations conserva el trabajo del usuario en las derivaciones que siguen', () => {
  const previous = [
    { id: 'dwelling-0-0', kind: 'dwelling', powerW: 5750, lengthM: 14, interior: { circuits: 5 }, interiorCircuits: [{ id: 'c1' }] },
    { id: 'dwelling-9-0', kind: 'dwelling', powerW: 5750, interior: { circuits: 9 } },
  ]
  const next = [
    { id: 'dwelling-0-0', kind: 'dwelling', powerW: 9200, lengthM: 20, interior: undefined },
    { id: 'dwelling-1-0', kind: 'dwelling', powerW: 5750, lengthM: 20 },
  ]
  const merged = mergeDerivations(previous, next)

  assert.equal(merged.length, 2, 'las derivaciones nuevas entran y las que ya no existen salen')
  assert.equal(merged[0].powerW, 9200, 'la potencia sigue a la previsión')
  assert.equal(merged[0].lengthM, 14, 'la longitud editada se conserva')
  assert.deepEqual(merged[0].interior, { circuits: 5 }, 'el cuadro editado se conserva')
  assert.deepEqual(merged[0].interiorCircuits, [{ id: 'c1' }], 'los circuitos del cuadro se conservan')
  assert.equal(merged[1].id, 'dwelling-1-0', 'la DI nueva aparece')
  assert.equal(merged[1].lengthM, 20, 'la DI nueva usa los valores por defecto')
})

test('mergeDerivations sin derivaciones previas devuelve las nuevas tal cual', () => {
  const next = [{ id: 'dwelling-0-0', kind: 'dwelling', powerW: 5750, lengthM: 20 }]
  assert.deepEqual(mergeDerivations([], next), next)
})
