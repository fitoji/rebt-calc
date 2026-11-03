import assert from 'node:assert/strict'
import test from 'node:test'
import {
  admissibleCurrent,
  buriedAdmissibleCurrent,
  buriedSpacingFactor,
  correctedAdmissibleCurrent,
  groupingFactor,
  groupingReduction,
  layerFactor,
  METHODS,
  SECTIONS,
  COLUMN_BY_VARIANT,
  tubesContactAirFactor,
  tubesContactBuriedFactor,
} from '../lib/cable-tables.mjs'
import { PROTECTION_SERIES, sizeLine } from '../lib/line-sizing.mjs'
import { lineInputFromState } from '../lib/line-state.mjs'

const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ~${expected}, got ${actual}`)

const lgaInput = overrides => ({
  role: 'lga',
  system: 'three-phase',
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  gamma: 44,
  variant: { method: 'B1', loadedConductors: 3, insulation: 'PVC' },
  ...overrides,
})

const diInput = overrides => ({
  role: 'di',
  system: 'single-phase',
  powerW: 9200,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  gamma: 48.5,
  variant: { method: 'B1', loadedConductors: 2, insulation: 'PVC' },
  ...overrides,
})

test('table matches published anchors', () => {
  assert.equal(admissibleCurrent(2.5, { method: 'B1', loadedConductors: 2, insulation: 'PVC' }), 21, 'B1 2x PVC 2.5')
  assert.equal(admissibleCurrent(2.5, { method: 'B1', loadedConductors: 2, insulation: 'XLPE' }), 26.5, 'B1 2x XLPE 2.5')
  assert.equal(admissibleCurrent(2.5, { method: 'B2', loadedConductors: 2, insulation: 'PVC' }), 18.5, 'B2 2x PVC 2.5')
  assert.equal(admissibleCurrent(2.5, { method: 'A2', loadedConductors: 3, insulation: 'PVC' }), 15, 'A2 3x PVC 2.5')
  assert.equal(admissibleCurrent(25, { method: 'B1', loadedConductors: 2, insulation: 'PVC' }), 84, 'B1 2x PVC 25')
  assert.equal(admissibleCurrent(630, { method: 'B1', loadedConductors: 3, insulation: 'PVC' }), 565, 'B1 3x PVC 630')
  assert.equal(admissibleCurrent(630, { method: 'A1', loadedConductors: 3, insulation: 'PVC' }), null, 'A1 stops at 500')
})

test('every variant is monotonic in section and XLPE never rates below PVC', () => {
  for (const key of Object.keys(COLUMN_BY_VARIANT)) {
    const [method, conductors, insulation] = key.split('|')
    const variant = { method, loadedConductors: Number(conductors), insulation }
    const values = SECTIONS
      .map(section => ({ section, value: admissibleCurrent(section, variant) }))
      .filter(entry => entry.value != null)
      .filter(entry => entry.section !== 400)
    for (let i = 1; i < values.length; i += 1) {
      assert.ok(values[i].value >= values[i - 1].value, `${key} must not decrease with section`)
    }
    if (insulation === 'PVC') {
      const xlpe = { ...variant, insulation: 'XLPE' }
      for (const section of SECTIONS) {
        const pvcValue = admissibleCurrent(section, variant)
        const xlpeValue = admissibleCurrent(section, xlpe)
        if (pvcValue == null || xlpeValue == null) continue
        assert.ok(xlpeValue >= pvcValue, `${method} ${conductors}x ${section} mm2: XLPE must not be below PVC`)
      }
    }
  }
})

test('the published 400 mm2 erratum is preserved instead of silently corrected', () => {
  assert.equal(admissibleCurrent(400, { method: 'C', loadedConductors: 3, insulation: 'XLPE' }), 699, 'printed column 9')
  assert.equal(admissibleCurrent(400, { method: 'F', loadedConductors: 2, insulation: 'PVC' }), 645, 'printed column 10')
  assert.equal(admissibleCurrent(500, { method: 'C', loadedConductors: 3, insulation: 'XLPE' }), 687)
  assert.equal(admissibleCurrent(500, { method: 'F', loadedConductors: 2, insulation: 'PVC' }), 741)
})

test('grouping factor follows the published table', () => {
  assert.equal(groupingFactor(1), 1)
  assert.equal(groupingFactor(3), 0.7)
  assert.equal(groupingFactor(4), 0.7)
  assert.equal(groupingFactor(5), 0.55, 'untabulated counts take the next published column')
  assert.equal(groupingFactor(7), 0.5)
  assert.equal(groupingFactor(30), 0.4)
  assert.equal(
    correctedAdmissibleCurrent(2.5, { method: 'B1', loadedConductors: 2, insulation: 'PVC' }, 3),
    21 * 0.7,
    'corrected current applies the factor',
  )
})

test('cos phi does not change the section required by the voltage drop', () => {
  const unity = sizeLine(lgaInput({ cosPhi: 1 }))
  const lagging = sizeLine(lgaInput({ cosPhi: 0.9 }))
  near(unity.sectionByDrop, 53.27, 0.05, 'three-phase section at cos phi 1')
  near(lagging.sectionByDrop, 53.27, 0.05, 'three-phase section at cos phi 0.9 must be identical')
  assert.ok(lagging.ratedCurrent > unity.ratedCurrent, 'cos phi below 1 raises the rated current')
})

test('LGA sizing returns the smallest section that meets drop and current', () => {
  const result = sizeLine(lgaInput())
  near(result.sectionByDrop, 53.27, 0.05, 'section by drop')
  near(result.ratedCurrent, 108.25, 0.05, 'rated current')
  assert.equal(result.finalSection, 70, '70 mm2 is the first standard section above 53.27')
  assert.equal(result.tableCurrent, 202, 'guía-BT-14 tabla A rates 70 mm2 of copper at 202 A')
  near(result.dropPercent, 0.38, 0.02, 'drop at the final section')
  assert.ok(result.ok, `no problems expected: ${result.problems.join(' ')}`)
  assert.equal(result.protection, 125, 'smallest breaker above 108.25 A that stays below 202 A')
})

test('a larger section fixed by the user keeps the automatic one as reference', () => {
  const automatic = sizeLine(lgaInput())
  const fixed = sizeLine(lgaInput({ sectionOverride: 95 }))
  assert.equal(fixed.autoSection, automatic.finalSection)
  assert.equal(fixed.sectionOverride, 95)
  assert.equal(fixed.finalSection, 95, 'the fixed section is adopted, not replaced by the automatic one')
  assert.ok(fixed.ok, `no problems expected: ${fixed.problems.join(' ')}`)
  assert.ok(fixed.tableCurrent > automatic.tableCurrent, 'the table current grows with the section')
  assert.ok(fixed.dropPercent < automatic.dropPercent, 'the drop falls with the section')
})

test('a fixed section that fails a criterion is reported instead of swapped', () => {
  const fixed = sizeLine(lgaInput({ sectionOverride: 50 }))
  assert.equal(fixed.finalSection, 50, 'the card must keep showing what the user fixed')
  assert.equal(fixed.ok, false)
  assert.ok(fixed.problems.some(problem => problem.includes('caída de tensión')), 'the unmet drop is named')
})

test('a fixed section that is not nominal is ignored and reported', () => {
  const automatic = sizeLine(lgaInput())
  const fixed = sizeLine(lgaInput({ sectionOverride: 123 }))
  assert.equal(fixed.sectionOverride, null, 'an untabulated section is not adopted')
  assert.equal(fixed.finalSection, automatic.finalSection, 'the automatic section is still offered')
  assert.ok(fixed.problems.some(problem => problem.includes('intensidad admisible publicada')))
  assert.equal(fixed.ok, false)
})

test('DI sizing is single-phase and respects the 3 % drop', () => {
  const result = sizeLine(diInput())
  near(result.sectionByDrop, 4.78, 0.05, 'single-phase section by drop')
  near(result.ratedCurrent, 40, 0.01, 'single-phase rated current')
  assert.equal(result.finalSection, 10, '6 mm2 fails the current check, 10 mm2 passes')
  assert.ok(result.dropPercent <= 3, 'drop stays inside the limit')
  assert.ok(result.ok, `no problems expected: ${result.problems.join(' ')}`)
})

test('grouping raises the section when the corrected current no longer covers the load', () => {
  const alone = sizeLine(diInput())
  const grouped = sizeLine(diInput({ circuits: 3 }))
  assert.equal(alone.finalSection, 10)
  assert.equal(grouped.finalSection, 16, '10 mm2 at 0.7 gives 35 A, below the 40 A line current')
  assert.equal(grouped.groupingFactor, 0.7)
})

test('a breaker above the corrected current is reported, not hidden', () => {
  const result = sizeLine(diInput({ protectionA: 63 }))
  assert.equal(result.finalSection, 10)
  assert.equal(result.ok, false)
  assert.ok(result.problems.some(problem => problem.includes('supera la intensidad admisible corregida')))
})

test('an impossible line says so instead of returning the largest section', () => {
  const result = sizeLine(lgaInput({ powerW: 5_000_000, maxDropPercent: 0.1 }))
  assert.equal(result.finalSection, null)
  assert.equal(result.ok, false)
  assert.ok(result.problems.length > 0)
})

test('the protection series starts at 6 A and is strictly increasing', () => {
  assert.equal(PROTECTION_SERIES[0], 6)
  for (let i = 1; i < PROTECTION_SERIES.length; i += 1) {
    assert.ok(PROTECTION_SERIES[i] > PROTECTION_SERIES[i - 1])
  }
})

test('grouping table E covers every published layout and stops at nine circuits where the source does', () => {
  assert.equal(groupingFactor(3, 'embedded'), 0.7)
  assert.equal(groupingFactor(20, 'embedded'), 0.4)
  assert.equal(groupingFactor(3, 'single-layer-wall'), 0.8)
  assert.equal(groupingFactor(12, 'single-layer-wall'), 0.7, 'rows 2..5 keep the nine-circuit factor')
  assert.equal(groupingFactor(3, 'single-layer-ceiling'), 0.7)
  assert.equal(groupingFactor(4, 'perforated-tray'), 0.75)
  assert.equal(groupingFactor(6, 'ladder-tray'), 0.8)
})

test('layers multiply the grouping factor with table F', () => {
  assert.equal(layerFactor(1), 1)
  assert.equal(layerFactor(2), 0.8)
  assert.equal(layerFactor(3), 0.73)
  assert.equal(layerFactor(4), 0.7)
  assert.equal(layerFactor(8), 0.68)
  assert.equal(layerFactor(12), 0.66)
  near(groupingReduction({ circuits: 3, layers: 3 }), 0.7 * 0.73, 1e-9, 'E x F')
})

test('tube and buried grouping tables match the published values', () => {
  assert.equal(tubesContactAirFactor(1, 1), 1)
  assert.equal(tubesContactAirFactor(4, 2), 0.81)
  assert.equal(tubesContactAirFactor(6, 6), 0.68)
  assert.equal(tubesContactBuriedFactor(2, 1), 0.87)
  assert.equal(tubesContactBuriedFactor(3, 2), 0.62)
  assert.equal(tubesContactBuriedFactor(6, 6), 0.32)
  assert.equal(buriedSpacingFactor(2, 0), 0.85)
  assert.equal(buriedSpacingFactor(4, 0.5), 0.85)
  assert.equal(buriedSpacingFactor(6, 1), 0.9)
})

test('a buried LGA reads the guide table with the factor of 0,8 already applied', () => {
  assert.equal(buriedAdmissibleCurrent(70, { loadedConductors: 3 }), 190)
  assert.equal(buriedAdmissibleCurrent(70, { loadedConductors: 2 }), 225)
  assert.equal(buriedAdmissibleCurrent(70, { loadedConductors: 2, material: 'aluminium' }), 170)
  assert.equal(buriedAdmissibleCurrent(1.5, { loadedConductors: 2, material: 'aluminium' }), null)

  const result = sizeLine(lgaInput({
    installation: 'buried',
    grouping: { kind: 'tubes-buried', tubes: 2, layers: 1 },
  }))
  assert.equal(result.finalSection, 70)
  assert.equal(result.tableCurrent, 224, 'guía-BT-14 tabla A, fila de tubos enterrados')
  near(result.correctedCurrent, 224 * 0.87, 0.01, 'table I reduction applied')
  assert.equal(result.groupingFactor, 0.87)
})

test('an air installation ignores the buried tables', () => {
  const air = sizeLine(lgaInput())
  assert.equal(air.tableCurrent, 202, 'guía-BT-14 tabla A, fila de tubos en superficie')
})

test('a method the guide does not tabulate falls back to ITC-BT-19', () => {
  const ladder = sizeLine(lgaInput({ variant: { method: 'E', loadedConductors: 3, insulation: 'XLPE' } }))
  assert.equal(ladder.tableCurrent, 214, 'ITC-BT-19 column E 3x XLPE at 70 mm2')
})

test('the minimum section follows the line role, not the system', () => {
  const tiny = { powerW: 2000, lengthM: 1, maxDropPercent: 5 }

  const threePhaseLga = sizeLine(lgaInput(tiny))
  assert.equal(threePhaseLga.finalSection, 10, 'ITC-BT-14 sets 10 mm² of copper as the LGA minimum')

  const singlePhaseLga = sizeLine(lgaInput({
    ...tiny,
    system: 'single-phase',
    voltageV: 230,
    variant: { method: 'B1', loadedConductors: 2, insulation: 'XLPE' },
  }))
  assert.equal(singlePhaseLga.finalSection, 10, 'a single-phase LGA still needs 10 mm² of copper')

  const singlePhaseDi = sizeLine(diInput({ powerW: 1000, lengthM: 1, maxDropPercent: 5 }))
  assert.equal(singlePhaseDi.finalSection, 6, 'ITC-BT-15 sets 6 mm² of copper as the DI minimum')

  const threePhaseDi = sizeLine(diInput({
    powerW: 1000,
    lengthM: 1,
    maxDropPercent: 5,
    system: 'three-phase',
    voltageV: 400,
    variant: { method: 'B1', loadedConductors: 3, insulation: 'PVC' },
  }))
  assert.equal(threePhaseDi.finalSection, 6, 'a three-phase DI still needs only 6 mm² of copper')
})

test('the LGA minimum follows the conductor material', () => {
  const aluminiumLga = sizeLine(lgaInput({
    powerW: 2000,
    lengthM: 1,
    maxDropPercent: 5,
    installation: 'buried',
    material: 'aluminium',
    grouping: { kind: 'tubes-buried', tubes: 2, layers: 1 },
  }))
  assert.equal(aluminiumLga.finalSection, 16, 'ITC-BT-14 sets 16 mm² of aluminium as the LGA minimum')

  const copperLga = sizeLine(lgaInput({
    powerW: 2000,
    lengthM: 1,
    maxDropPercent: 5,
    installation: 'buried',
    grouping: { kind: 'tubes-buried', tubes: 2, layers: 1 },
  }))
  assert.equal(copperLga.finalSection, 10, 'the aluminium floor does not leak into copper')
})

test('spacing between two tabulated columns takes the smaller distance', () => {
  assert.equal(buriedSpacingFactor(2, 0), 0.85, 'in contact')
  assert.equal(buriedSpacingFactor(2, 0.05), 0.85, '5 cm is closer to contact than to 25 cm')
  assert.equal(buriedSpacingFactor(2, 0.2), 0.85, '20 cm is still below the 25 cm column')
  assert.equal(buriedSpacingFactor(2, 0.25), 0.9, 'the column value applies exactly at 25 cm')
  assert.equal(buriedSpacingFactor(2, 0.4), 0.9, '40 cm is below the 50 cm column')
  assert.equal(buriedSpacingFactor(2, 0.5), 0.95, 'the column value applies exactly at 50 cm')
  assert.equal(buriedSpacingFactor(2, 0.9), 0.95, '90 cm is below the 1 m column')
})

test('the LGA is always sized on the XLPE column, whatever the stored state says', () => {
  const state = {
    powerW: 75000, voltageV: 400, cosPhi: 1, lengthM: 25, maxDropPercent: 0.5, gamma: 44,
    method: 'B1', insulation: 'PVC', circuits: 1, protectionA: 0,
    installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
  }

  const lga = lineInputFromState(state, 'three-phase', 'lga')
  assert.equal(lga.variant.insulation, 'XLPE', 'ITC-BT-14 only admits RZ1-K/DZ1-K')

  const di = lineInputFromState(state, 'three-phase', 'di')
  assert.equal(di.variant.insulation, 'PVC', 'the DI keeps the user choice')

  const sized = sizeLine({ ...lgaInput({}), variant: lga.variant })
  assert.equal(sized.tableCurrent, 202, 'guía-BT-14 tabla A governs the LGA')

  const stalePvc = sizeLine({ ...lgaInput({}), variant: { ...lga.variant, insulation: 'PVC' } })
  assert.equal(stalePvc.tableCurrent, 202, 'a PVC variant cannot drag the LGA onto the ITC-BT-19 PVC column')
})
