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

const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ~${expected}, got ${actual}`)

const lgaInput = overrides => ({
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
  assert.equal(result.tableCurrent, 149, 'B1 3x PVC 70 mm2 rating')
  near(result.dropPercent, 0.38, 0.02, 'drop at the final section')
  assert.ok(result.ok, `no problems expected: ${result.problems.join(' ')}`)
  assert.equal(result.protection, 125, 'smallest breaker above 108.25 A that stays below 171 A')
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
  assert.ok(result.problems.some(problem => problem.includes('exceeds the corrected admissible current')))
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

test('the buried table D is used for buried installations', () => {
  assert.equal(buriedAdmissibleCurrent(70, { loadedConductors: 3 }), 190)
  assert.equal(buriedAdmissibleCurrent(70, { loadedConductors: 2 }), 225)
  assert.equal(buriedAdmissibleCurrent(70, { loadedConductors: 2, material: 'aluminium' }), 170)
  assert.equal(buriedAdmissibleCurrent(1.5, { loadedConductors: 2, material: 'aluminium' }), null)

  const result = sizeLine(lgaInput({
    installation: 'buried',
    grouping: { kind: 'tubes-buried', tubes: 2, layers: 1 },
  }))
  assert.equal(result.finalSection, 70)
  assert.equal(result.tableCurrent, 190, 'base current comes from table D, not table A')
  near(result.correctedCurrent, 190 * 0.87, 0.01, 'table I reduction applied')
  assert.equal(result.groupingFactor, 0.87)
})

test('an air installation ignores the buried tables', () => {
  const air = sizeLine(lgaInput())
  assert.equal(air.tableCurrent, 149, 'table A for B1 3x PVC 70')
})

test('the normative minimum section floors LGA and DI', () => {
  const tinyLga = sizeLine(lgaInput({ powerW: 2000, lengthM: 1, maxDropPercent: 5 }))
  assert.equal(tinyLga.finalSection, 10, 'ITC-BT-14 sets 10 mm² of copper as the LGA minimum')

  const tinyDi = sizeLine(diInput({ powerW: 1000, lengthM: 1, maxDropPercent: 5 }))
  assert.equal(tinyDi.finalSection, 6, 'ITC-BT-15 sets 6 mm² of copper as the DI minimum')
})
