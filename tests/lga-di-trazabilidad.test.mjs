import assert from 'node:assert/strict'
import test from 'node:test'
import { sizeLine } from '../lib/line-sizing.mjs'
import { lineInputFromState } from '../lib/line-state.mjs'
import { buildDerivations } from '../lib/project-model.mjs'

/** Inputs shared by the cases: copper, tube-in-wall, one circuit. */
function input(overrides = {}) {
  return {
    role: 'di',
    system: 'single-phase',
    powerW: 5750,
    voltageV: 230,
    cosPhi: 1,
    lengthM: 21,
    maxDropPercent: 1,
    gamma: 48,
    variant: { method: 'B1', loadedConductors: 2, insulation: 'PVC' },
    installation: 'air',
    grouping: { layout: 'embedded', circuits: 1, layers: 1 },
    circuits: 1,
    ...overrides,
  }
}

test('S1: the result states the electrical moment and the conductivity it used', () => {
  const di = sizeLine(input())

  assert.equal(di.momentKwM, 120.75, '5,75 kW over 21 m')
  assert.equal(di.gamma, 48, 'the conductivity echoes the one the sizing used')
  assert.equal(di.finalSection, 10, 'the worked case of the course still gives 10 mm²')
  assert.equal(di.dropPercent.toFixed(3), '0.951')
})

test('S1: the moment is P(kW) · L in three-phase too', () => {
  const lga = sizeLine(input({ role: 'lga', system: 'three-phase', powerW: 30000, voltageV: 400, lengthM: 30, maxDropPercent: 0.5, gamma: 44, variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' } }))

  assert.equal(lga.momentKwM, 900, '30 kW over 30 m')
  assert.equal(lga.gamma, 44)
})

test('S2: an automatic protection leaves the section as it was and reports the In drop', () => {
  const di = sizeLine(input())

  assert.equal(di.protection, 25, 'the suggested device is the IGA of the housing step')
  assert.equal(di.finalSection, 10, 'no protection fixed: the Ib criterion still decides')
  assert.equal(di.dropPercentIn.toFixed(3), '0.951', 'In equals Ib here, so both drops agree')
})

test('S2: a fixed protection moves the drop criterion to In', () => {
  const lga = sizeLine(input({
    role: 'lga',
    system: 'three-phase',
    powerW: 30000,
    voltageV: 400,
    lengthM: 30,
    maxDropPercent: 0.4,
    gamma: 44,
    protectionA: 50,
    variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' },
  }))

  assert.equal(lga.ratedCurrent.toFixed(2), '43.30', 'Ib stays the load current')
  assert.equal(lga.dropPercentIn > lga.dropPercent, true, 'In is above Ib, so its drop is larger')
  assert.equal(lga.finalSection, 50, '35 mm² passes with Ib (0,37 %) but not with In (0,42 %)')
  assert.equal(lga.ok, true)
  assert.equal(Number(lga.dropPercent.toFixed(2)), 0.26, 'the Ib drop is still reported')
  assert.equal(Number(lga.dropPercentIn.toFixed(2)), 0.3, 'and the In drop over the adopted section')
})

test('S2: a fixed protection below the load current is still reported', () => {
  const lga = sizeLine(input({
    role: 'lga',
    system: 'three-phase',
    powerW: 30000,
    voltageV: 400,
    lengthM: 30,
    maxDropPercent: 0.5,
    gamma: 44,
    protectionA: 40,
    variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' },
  }))

  assert.equal(lga.dropPercentIn < lga.dropPercent, true, 'the device is below Ib, so its drop is smaller')
  assert.equal(lga.problems.some(problem => problem.includes('por debajo de la intensidad de línea')), true)
})

test('S2: without a protective device there is no In drop', () => {
  const unprotectable = sizeLine(input({
    role: 'lga',
    system: 'three-phase',
    powerW: 900000,
    voltageV: 400,
    lengthM: 30,
    maxDropPercent: 0.5,
    gamma: 44,
    variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' },
  }))

  assert.equal(unprotectable.protection, null, 'no standard device fits')
  assert.equal(unprotectable.dropPercentIn, null, 'and no In drop can be claimed')
})

test('S3: the LGA minimum tube comes from the ITC-BT-14 table', () => {
  const ten = sizeLine(input({ role: 'lga', system: 'three-phase', powerW: 6000, voltageV: 400, lengthM: 20, maxDropPercent: 0.5, gamma: 44, variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' } }))
  assert.equal(ten.finalSection, 10)
  assert.equal(ten.minimumTube, 75, 'table 1 gives 75 mm for a 10 mm² phase')

  const larger = sizeLine(input({ role: 'lga', system: 'three-phase', powerW: 120000, voltageV: 400, lengthM: 20, maxDropPercent: 0.5, gamma: 44, variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' } }))
  assert.equal(larger.finalSection, 70)
  assert.equal(larger.minimumTube, 140, '70 mm² asks for 140 mm')
})

test('S3: a tube below the table is reported instead of accepted', () => {
  const base = input({ role: 'lga', system: 'three-phase', powerW: 6000, voltageV: 400, lengthM: 20, maxDropPercent: 0.5, gamma: 44, variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' } })

  const small = sizeLine({ ...base, tubeDiameter: 40 })
  assert.equal(small.minimumTube, 75)
  assert.equal(small.problems.some(problem => problem.includes('tubo') && problem.includes('75')), true, 'the problem names the minimum')
  assert.equal(small.ok, false)

  const enough = sizeLine({ ...base, tubeDiameter: 75 })
  assert.equal(enough.problems.some(problem => problem.includes('tubo')), false, 'the minimum itself is enough')
  assert.equal(enough.ok, true)

  const unknown = sizeLine({ ...base, tubeDiameter: 0 })
  assert.equal(unknown.problems.some(problem => problem.includes('tubo')), false, 'an unset diameter is not a defect to report')
})

test('S3: the DI does not invent a tube minimum', () => {
  const di = sizeLine({ ...input(), tubeDiameter: 20 })

  assert.equal(di.minimumTube, null, 'the guide table is not transcribed, so no value is claimed')
  assert.equal(di.problems.some(problem => problem.includes('tubo')), false)
})

test('S4: the conductor designation follows the line and its installation', () => {
  const lgaAir = sizeLine(input({ role: 'lga', system: 'three-phase', powerW: 6000, voltageV: 400, lengthM: 20, maxDropPercent: 0.5, gamma: 44, variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' } }))
  assert.equal(lgaAir.cableType, 'RZ1-K 0,6/1 kV', 'the LGA admits only RZ1-K or DZ1-K')

  assert.equal(sizeLine(input()).cableType, 'ES07Z1-K 450/750 V', 'a DI in air is the 450/750 V ES07Z1-K of table C')
  assert.equal(sizeLine(input({ installation: 'buried', grouping: { kind: 'buried-cables', cables: 2, spacing: 0 } })).cableType, 'RZ1-K 0,6/1 kV', 'buried is the multiconductor of table E')
})

test('S5: a dwelling derivation carries its IGA and maximum admissible power', () => {
  const withIga = sizeLine(input({ housingIgaA: 25 }))

  assert.equal(withIga.housingIga, 25)
  assert.equal(withIga.maxAdmissiblePowerW, 5750, '230 V × 25 A')
  assert.equal(withIga.problems.some(problem => problem.includes('potencia máxima admisible')), false, 'the step power is exactly what the IGA admits')

  const over = sizeLine(input({ powerW: 7360, housingIgaA: 25 }))
  assert.equal(over.maxAdmissiblePowerW, 5750)
  assert.equal(over.problems.some(problem => problem.includes('potencia máxima admisible')), true, '7 360 W does not fit a 25 A IGA')
})

test('S5: without a housing step there is no IGA to claim', () => {
  const plain = sizeLine(input())

  assert.equal(plain.housingIga, null)
  assert.equal(plain.maxAdmissiblePowerW, null)
  assert.equal(plain.problems.some(problem => problem.includes('potencia máxima admisible')), false)
})

test('S5: derivations built from the forecast carry the IGA of each housing step', () => {
  const load = { housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }, { level: 'Elevada', power: 9200, homes: 1, area: 130 }], locals: [], garages: [] }
  const derivations = buildDerivations(load, { p2: 0, p5: 0 }, {
    cosPhi: 1, lengthM: 20, maxDropPercent: 1, method: 'B1', insulation: 'PVC',
    neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 32, installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
  })

  const dwellings = derivations.filter(row => row.kind === 'dwelling')

  assert.deepEqual(dwellings.map(row => row.housingIgaA), [25, 40], 'the power step of each dwelling fixes its IGA')
  assert.equal(derivations.filter(row => row.kind !== 'dwelling').every(row => row.housingIgaA === undefined), true, 'no other consumer claims a housing step')
})

test('S5: the shared line input forwards the IGA to the engine', () => {
  const state = {
    powerW: 5750, voltageV: 230, cosPhi: 1, lengthM: 21, maxDropPercent: 1, method: 'B1', insulation: 'PVC',
    circuits: 1, protectionA: 0, neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 32,
    installation: 'air', layout: 'embedded', layers: 1, tubes: 1, housingIgaA: 25,
  }

  assert.equal(lineInputFromState(state, 'single-phase', 'di').housingIgaA, 25)
  assert.equal(lineInputFromState({ ...state, housingIgaA: undefined }, 'single-phase', 'di').housingIgaA, null)
})
