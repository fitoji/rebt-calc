import assert from 'node:assert/strict'
import test from 'node:test'
import { sizeLine } from '../lib/line-sizing.mjs'
import { lineInputFromState } from '../lib/line-state.mjs'
import { buildDerivations, calculateProject, syncDerivationPowers } from '../lib/project-model.mjs'
import { BT14_NEUTRAL_ROWS, LGA_TUBE_DIAMETER } from '../lib/normative-tables.mjs'

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

test('S3: the tube column of table 1 has a single source of truth', () => {
  const fromTable = new Map(BT14_NEUTRAL_ROWS.map(([phase, , tube]) => [Number.parseInt(String(phase), 10), tube]))

  assert.deepEqual([...LGA_TUBE_DIAMETER], [...fromTable], 'the lookup cannot drift away from the printed table')
})

test('S3: every published LGA section gets its tube from the table', () => {
  for (const [section, tube] of LGA_TUBE_DIAMETER) {
    const result = sizeLine(input({
      role: 'lga', system: 'three-phase', powerW: 6000, voltageV: 400, lengthM: 20, maxDropPercent: 0.5, gamma: 44,
      sectionOverride: section,
      variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' },
    }))

    assert.equal(result.finalSection, section)
    assert.equal(result.minimumTube, tube, `${section} mm²`)
  }
})

test('S5: the derivation keeps its IGA when the housing power changes', () => {
  const defaults = {
    cosPhi: 1, lengthM: 20, maxDropPercent: 1, method: 'B1', insulation: 'PVC',
    neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 32, installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
  }
  const [dwelling] = buildDerivations({ housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }], locals: [], garages: [] }, { p2: 0, p5: 0 }, defaults)
  assert.equal(dwelling.housingIgaA, 25)

  const [grown] = syncDerivationPowers([dwelling], { housing: [{ level: 'Elevada', power: 9200, homes: 1, area: 90 }] }, { p2: 0, p5: 0 })
  assert.equal(grown.powerW, 9200)
  assert.equal(grown.housingIgaA, 40, 'the IGA follows the step, not the old power')
})

test('S1/S5: a calculated project serializes the new numbers', () => {
  const state = {
    system: 'single-phase',
    powerW: 5750, voltageV: 230, cosPhi: 1, lengthM: 21, maxDropPercent: 1, method: 'B1', insulation: 'PVC',
    circuits: 1, protectionA: 0, neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 40,
    installation: 'air', layout: 'embedded', layers: 1, tubes: 1, housingIgaA: 25,
  }
  const project = calculateProject({
    loadTotal: 75000,
    lga: { ...state, powerW: 75000, voltageV: 400, lengthM: 25, insulation: 'XLPE', tubeDiameter: 140 },
    derivations: [state],
  })
  const exported = JSON.parse(JSON.stringify({ lga: project.lga.result, derivation: project.derivations[0].result }))

  for (const key of ['momentKwM', 'gamma', 'minimumTube', 'cableType', 'dropPercentIn']) {
    assert.ok(key in exported.lga, `the LGA export carries ${key}`)
  }
  for (const key of ['momentKwM', 'gamma', 'cableType', 'housingIga', 'maxAdmissiblePowerW', 'dropPercentIn']) {
    assert.ok(key in exported.derivation, `the derivation export carries ${key}`)
  }
  assert.equal(exported.lga.momentKwM, 1875, '75 kW over 25 m')
  assert.equal(exported.derivation.housingIga, 25)
})

test('S1: the result states the neutral and protective conductors of the adopted section', () => {
  const small = sizeLine(input({ role: 'lga', system: 'three-phase', powerW: 6000, voltageV: 400, lengthM: 20, maxDropPercent: 0.5, gamma: 44, variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' } }))
  assert.equal(small.finalSection, 10)
  assert.equal(small.neutralSection, 10, 'ITC-BT-14 tabla 1: 10 mm² phase, 10 mm² neutral')
  assert.equal(small.protectiveSection, 10, 'ITC-BT-18 tabla 2: S ≤ 16 keeps the phase section')

  const large = sizeLine(input({ role: 'lga', system: 'three-phase', powerW: 120000, voltageV: 400, lengthM: 20, maxDropPercent: 0.5, gamma: 44, variant: { method: 'B1', loadedConductors: 3, insulation: 'XLPE' } }))
  assert.equal(large.finalSection, 70)
  assert.equal(large.neutralSection, 35, 'the neutral is half the phase from 25 mm² up')
  assert.equal(large.protectiveSection, 35, 'and the PE, above 35 mm², half the phase')

  const di = sizeLine(input())
  assert.equal(di.neutralSection, 10, 'a DI neutral equals its phase')
  assert.equal(di.protectiveSection, 10)
})

test('S1: every exported line satisfies M = P(kW) · L', () => {
  const defaults = {
    cosPhi: 0.95, lengthM: 22, maxDropPercent: 1, method: 'B1', insulation: 'PVC',
    neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 32, installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
  }
  const load = {
    housing: [{ level: 'Básica', power: 5750, homes: 4, area: 90 }, { level: 'Elevada', power: 11500, homes: 2, area: 130 }],
    locals: [{ name: 'Local', type: 'Comercial/oficina', area: 60, real: 0 }],
    garages: [{ name: 'Garaje', ventilation: 'Forzada', area: 240, plazas: 12 }],
  }
  const derivations = buildDerivations(load, { p2: 8600, p5: 7360, localPowers: [6000], garagePowers: [4800] }, defaults)
  const project = calculateProject({
    loadTotal: 75000,
    lgaPowerMode: 'auto',
    lga: {
      powerW: 75000, voltageV: 400, cosPhi: 0.95, lengthM: 25, maxDropPercent: 0.5, method: 'B1', insulation: 'XLPE',
      circuits: 1, protectionA: 0, neutralSection: 35, peSection: 35, controlSection: 1.5, tubeDiameter: 140,
      installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
    },
    derivations,
  })

  for (const line of [project.lga, ...project.derivations]) {
    const expected = (line.powerW / 1000) * line.lengthM
    assert.ok(
      Math.abs(line.result.momentKwM - expected) < 1e-9,
      `${line.label ?? 'LGA'}: ${line.result.momentKwM} kW·m does not match ${expected} kW·m`,
    )
  }
})

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
