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
  'ITC_BT_10_COEFFICIENTS', 'ITA_POWER_KW', 'ITA_TYPES',
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

/** Las tres tablas que vivían fuera del registro del panel (T6). */
const PANEL_TABLE_KEYS = ['T25-A', 'T10-CS', 'ITA']

test('T6 · el registro del panel reúne también las tablas de la previsión', () => {
  const keys = normative.GUIDE_TABLES.map(table => table.key)
  assert.deepEqual(keys.slice(0, 6), ['BT14-A', 'BT14-B', 'BT14-1', 'BT15-C', 'BT15-D', 'BT15-E'],
    'las seis claves de línea siguen en el registro, y en su orden')
  for (const key of PANEL_TABLE_KEYS) {
    const table = normative.GUIDE_TABLES.find(entry => entry.key === key)
    assert.ok(table, `el registro tiene una entrada para ${key}`)
    for (const field of ['title', 'doc', 'head', 'rows']) {
      assert.ok(table[field] != null, `${key} declara ${field}, como las demás entradas`)
    }
    assert.ok(table.title.length > 0 && table.doc.length > 0, `${key} se titula y cita su documento`)
    assert.equal(table.head.length, table.rows[0].length, `${key} tiene tantas columnas como celdas por fila`)
  }
  assert.equal(normative.GUIDE_TABLES.find(table => table.key === 'T25-A').title, 'Tabla A · Escalones de potencia prevista · ITC-BT-25')
  assert.equal(normative.GUIDE_TABLES.find(table => table.key === 'T10-CS').title, 'Coeficiente de simultaneidad · ITC-BT-10 §3.1')
  assert.equal(normative.GUIDE_TABLES.find(table => table.key === 'ITA').title, 'Tipos de ascensor · ITA')
})

test('T6 · las tres tablas nuevas leen sus filas de las constantes, sin copiar cifras', () => {
  const byKey = key => normative.GUIDE_TABLES.find(table => table.key === key)
  assert.equal(byKey('T25-A').rows, normative.HOUSING_POWER_STEPS,
    'la tabla A de la ITC-BT-25 es la lista de escalones que ya usa la previsión')
  assert.deepEqual(byKey('T10-CS').rows, [
    ...normative.ITC_BT_10_COEFFICIENTS.slice(1).map((coefficient, index) => [index + 1, coefficient]),
    ['n > 21', '15,3 + (n − 21) × 0,5'],
  ], 'el coeficiente se lee de la tabla 1 y su continuación se escribe con las cifras publicadas')
  assert.deepEqual(byKey('ITA').rows, normative.ITA_TYPES.map(ita => [ita.type, ita.carga, ita.personas, ita.velocidad, ita.potencia]),
    'las filas del ITA salen de la constante, no de un literal paralelo')
})

test('T6 · los tipos ITA viven junto a su fuente de potencia, no en el componente', () => {
  assert.deepEqual(normative.ITA_TYPES.map(ita => ita.type), ['ITA-1', 'ITA-2', 'ITA-3', 'ITA-4', 'ITA-5', 'ITA-6'])
  for (const ita of normative.ITA_TYPES) {
    assert.equal(ita.potencia, normative.ITA_POWER_KW[ita.type], `${ita.type} toma su potencia de ITA_POWER_KW`)
  }
  assert.doesNotMatch(read('components/load-calculator.tsx'), /const ITA_TYPES = /,
    'el componente no vuelve a declarar la tabla que ahora vive en el registro')
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
