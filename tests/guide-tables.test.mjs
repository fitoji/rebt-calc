import assert from 'node:assert/strict'
import test from 'node:test'
import { GUIDE_TABLES, guideAdmissibleCurrent } from '../lib/guide-tables.mjs'

test('the guide tables reproduce the anchors printed in the PDFs', () => {
  const byKey = Object.fromEntries(GUIDE_TABLES.map(table => [table.key, table]))
  const row = (key, index) => byKey[key].rows[index]

  // Guía-BT-14 tabla A: copper RZ1-K, 60 A at 10 mm2 in air and 77 A buried.
  assert.equal(row('BT14-A', 0)[1], 60)
  assert.equal(row('BT14-A', 1)[1], 77)
  assert.equal(row('BT14-A', 0)[11], 455, '240 mm2 in air')
  assert.equal(row('BT14-A', 1)[11], 440, '240 mm2 buried')

  // Guía-BT-14 tabla B: aluminium starts at 16 mm2.
  assert.equal(byKey['BT14-B'].head[1], '16', 'the aluminium table has no 10 mm2 column')
  assert.equal(row('BT14-B', 0)[1], 65)
  assert.equal(row('BT14-B', 1)[1], 78)

  // Guía-BT-14 tabla 1: phase, neutral and tube.
  assert.deepEqual(byKey['BT14-1'].rows[0], ['10 (Cu)', '10 (Cu)', 75])
  assert.deepEqual(byKey['BT14-1'].rows[2], ['16 (Al)', '16 (Al)', 75])
  assert.deepEqual(byKey['BT14-1'].rows[11], ['240', '120', 200])

  // Guía-BT-15 tabla C: ES07Z1-K.
  assert.equal(row('BT15-C', 0)[1], 36, 'monofásico 6 mm2')
  assert.equal(row('BT15-C', 1)[1], 32, 'trifásico 6 mm2')
  assert.equal(row('BT15-C', 0)[6], null, 'the guide stops the single-phase column at 35 mm2')

  // Guía-BT-15 tablas D and E.
  assert.equal(row('BT15-D', 0)[1], 71, 'buried unipolar 6 mm2')
  assert.equal(row('BT15-D', 1)[1], 58, 'buried unipolar 6 mm2, three loaded')
  assert.equal(row('BT15-E', 0)[1], 65, 'buried multiconductor 6 mm2')
  assert.equal(row('BT15-E', 1)[1], 53, 'buried multiconductor 6 mm2, three loaded')
})

test('the LGA reads tabla A for copper and tabla B for aluminium', () => {
  const lga = (overrides) => guideAdmissibleCurrent({ role: 'lga', system: 'three-phase', insulation: 'XLPE', section: 10, ...overrides })

  assert.equal(lga({}), 60, 'air')
  assert.equal(lga({ installation: 'buried' }), 77, 'buried')
  assert.equal(lga({ section: 240 }), 455)
  assert.equal(lga({ section: 240, installation: 'buried' }), 440)
  assert.equal(lga({ section: 16, material: 'aluminium' }), 65)
  assert.equal(lga({ section: 16, material: 'aluminium', installation: 'buried' }), 78)
  assert.equal(lga({ section: 10, material: 'aluminium' }), null, 'no 10 mm2 aluminium column')
})

test('the LGA falls back when the guide does not tabulate the case', () => {
  const lga = (overrides) => guideAdmissibleCurrent({ role: 'lga', system: 'three-phase', insulation: 'XLPE', section: 10, ...overrides })

  assert.equal(lga({ method: 'A1' }), null, 'tabla A only covers method B')
  assert.equal(lga({ system: 'single-phase' }), null, 'the guide publishes only three loaded conductors')
  assert.equal(lga({ section: 6 }), null, 'below the published range')
  assert.equal(lga({ section: 400 }), null, 'above the published range')
})

test('the DI reads tabla C for PVC, tabla D for XLPE and tabla E when buried', () => {
  const di = (overrides) => guideAdmissibleCurrent({ role: 'di', system: 'single-phase', insulation: 'PVC', section: 6, ...overrides })

  assert.equal(di({}), 36, 'ES07Z1-K monofásico')
  assert.equal(di({ system: 'three-phase' }), 32, 'ES07Z1-K trifásico')
  assert.equal(di({ insulation: 'XLPE' }), 49, 'RZ1-K unipolar monofásico')
  assert.equal(di({ insulation: 'XLPE', system: 'three-phase', section: 10 }), 60)
  assert.equal(di({ installation: 'buried' }), 65, 'buried runs use the multiconductor table')
  assert.equal(di({ installation: 'buried', system: 'three-phase', section: 10 }), 70)
  assert.equal(di({ installation: 'buried', section: 400 }), null, 'outside the published range')
})
