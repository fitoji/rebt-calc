import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as normative from '../lib/normative-tables.mjs'
import * as cableTables from '../lib/cable-tables.mjs'
import * as guideTables from '../lib/guide-tables.mjs'
import * as simultaneity from '../lib/simultaneity.mjs'
import * as serviceLoads from '../lib/service-loads.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

/**
 * Every table the calculator consults, by the name the app uses. A new table
 * belongs here, not inside the module that happens to read it.
 */
const TABLES = [
  'SECTIONS', 'INSULATIONS', 'METHODS',
  'COLUMN_VALUES', 'COLUMN_BY_VARIANT',
  'SOIL_RESISTIVITY', 'BURIED_TUBE_CURRENT',
  'GROUPING_COUNTS', 'GROUPING_LAYOUTS', 'LAYER_FACTORS',
  'TUBES_CONTACT_AIR', 'BURIED_CABLE_SPACING', 'TUBES_CONTACT_BURIED',
  'SECTIONS_LGA', 'SECTIONS_DI',
  'BT14_AIR_COPPER', 'BT14_BURIED_COPPER', 'BT14_AIR_ALUMINIUM', 'BT14_BURIED_ALUMINIUM',
  'BT15_C_SINGLE', 'BT15_C_THREE',
  'BT15_D_AIR_SINGLE', 'BT15_D_AIR_THREE', 'BT15_D_BURIED_SINGLE', 'BT15_D_BURIED_THREE',
  'BT15_E_AIR_SINGLE', 'BT15_E_AIR_THREE', 'BT15_E_BURIED_SINGLE', 'BT15_E_BURIED_THREE',
  'BT14_NEUTRAL_ROWS', 'GUIDE_TABLES', 'LGA_NEUTRAL_SECTION',
  'ITC_BT_10_COEFFICIENTS', 'ITA_POWER_KW',
  'HOUSING_POWER_STEPS',
]

test('the tables file declares every normative table', () => {
  for (const name of TABLES) {
    assert.ok(normative[name] != null, `normative-tables.mjs is missing ${name}`)
  }
})

test('the tables file holds values only, no derivation', () => {
  const source = read('lib/normative-tables.mjs')
  assert.doesNotMatch(source, /^export function/m, 'a table file with functions cannot be audited by reading it')
  assert.doesNotMatch(source, /^export (?:async )?function/m, 'no function exports')
})

test('the logic modules re-export the same object, never a copy', () => {
  // Identity, not deep equality: a copy would drift the moment one side is
  // edited, and that drift is exactly what this refactor exists to prevent.
  assert.equal(cableTables.SECTIONS, normative.SECTIONS)
  assert.equal(cableTables.COLUMN_VALUES, normative.COLUMN_VALUES)
  assert.equal(cableTables.GROUPING_LAYOUTS, normative.GROUPING_LAYOUTS)
  assert.equal(cableTables.SOIL_RESISTIVITY, normative.SOIL_RESISTIVITY)
  assert.equal(cableTables.TUBES_CONTACT_BURIED, normative.TUBES_CONTACT_BURIED)
  assert.equal(guideTables.GUIDE_TABLES, normative.GUIDE_TABLES)
  assert.equal(guideTables.BT14_NEUTRAL_ROWS, normative.BT14_NEUTRAL_ROWS)
  assert.equal(simultaneity.ITC_BT_10_COEFFICIENTS, normative.ITC_BT_10_COEFFICIENTS)
  assert.equal(serviceLoads.ITA_POWER_KW, normative.ITA_POWER_KW)
})

test('every module that reads a table imports it from the tables file', () => {
  for (const file of ['cable-tables', 'guide-tables', 'simultaneity', 'service-loads', 'conductor-sections']) {
    assert.match(
      read(`lib/${file}.mjs`),
      /from '\.\/normative-tables\.mjs'/,
      `${file} must read its values from the single tables file`,
    )
  }
})

test('tabla A keeps the five power steps of a dwelling, with their IGA', () => {
  // ITC-BT-25 tabla A, suministros monofásicos a 230 V: dos escalones básicos y
  // tres elevados. El calibre del IGA es el que fija cada potencia.
  assert.deepEqual(normative.HOUSING_POWER_STEPS, [
    ['Básica', 5750, 25],
    ['Básica', 7360, 32],
    ['Elevada', 9200, 40],
    ['Elevada', 11500, 50],
    ['Elevada', 14490, 63],
  ])
})

test('the neutral table keeps both shapes for the same table 1', () => {
  // The printed rows are shown verbatim, the map is consulted. Both describe
  // ITC-BT-14 tabla 1, so the copper pairs have to agree.
  for (const [phase, neutral] of normative.LGA_NEUTRAL_SECTION) {
    const printed = normative.BT14_NEUTRAL_ROWS.find(row => row[0] === `${phase} (Cu)` || row[0] === String(phase))
    assert.ok(printed, `tabla 1 has no printed row for ${phase} mm²`)
    assert.equal(Number(printed[1].replace(' (Cu)', '')), neutral, `neutral for ${phase} mm² disagrees between shapes`)
  }
})
