import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildDocument, ELEC3_COLUMNS, PENDING_CELLS, readCalculatorExport } from '../lib/elec3.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Shape of a real «Descargar datos → JSON», reduced to the fields the viewer reads. */
const exportFixture = {
  exportedAt: '2026-11-03T10:15:00.000Z',
  projectInfo: { companyName: 'Estudio', workAddress: 'Carrer Major 12, Girona' },
  calculations: { total: 194676 },
  lines: {
    lga: {
      inputs: { powerW: 194676, voltageV: 400, cosPhi: 1, lengthM: 25, installation: 'air', tubeDiameter: 140 },
      result: { finalSection: 150, protection: 315, neutralSection: 70, protectiveSection: 95, dropPercent: 0.461, ratedCurrent: 281, momentKwM: 4866.9, cableType: 'RZ1-K 0,6/1 kV' },
    },
    di: {
      inputs: { powerW: 9200, voltageV: 230, cosPhi: 1, lengthM: 20, installation: 'air', tubeDiameter: 40 },
      result: { finalSection: 16, ratedCurrent: 40, dropPercent: 0.906, protection: 40, momentKwM: 184, cableType: 'RZ1-K 0,6/1 kV', neutralSection: 16, protectiveSection: 16 },
    },
  },
  project: {
    lga: { powerW: 194676, tubeDiameter: 140, result: { finalSection: 150, protection: 315, neutralSection: 70, protectiveSection: 95, dropPercent: 0.461 } },
    derivations: [
      { id: 'dwelling-0-0', kind: 'dwelling', label: 'Vivienda 1', system: 'single-phase', powerW: 5750, voltageV: 230, cosPhi: 1, lengthM: 14, installation: 'air', tubeDiameter: 32, result: { finalSection: 10, ratedCurrent: 25, dropPercent: 0.97, momentKwM: 80.5, cableType: 'ES07Z1-K 450/750 V', neutralSection: 10, protectiveSection: 10 } },
      { id: 'irve', kind: 'irve', label: 'Recarga de vehículos eléctricos', system: 'three-phase', powerW: 30000, voltageV: 400, cosPhi: 1, lengthM: 30, installation: 'buried', tubeDiameter: 63, result: { finalSection: 25, ratedCurrent: 43.3, dropPercent: 0.65, momentKwM: 900, cableType: 'RZ1-K 0,6/1 kV', neutralSection: 25, protectiveSection: 16 } },
    ],
    summary: { loadTotal: 194676 },
  },
}

test('an export becomes one ELEC-3 row per line, with the building context', () => {
  const parsed = readCalculatorExport(JSON.stringify(exportFixture))
  assert.equal(parsed.ok, true)

  const document = parsed.document
  assert.equal(document.obra, 'Carrer Major 12, Girona')
  assert.equal(document.totalKw, 194.676, 'the total comes from calculations.total')
  assert.equal(document.lga.seccio, 150)
  assert.equal(document.lga.proteccio, 315)
  assert.equal(document.lga.terra, 95)
  assert.equal(document.files.length, 3, 'the DI in use plus the two derivations')

  assert.deepEqual(document.files.map(row => row.nom), ['Derivación individual', 'Vivienda 1', 'Recarga de vehículos eléctricos'])
  assert.deepEqual(document.files.map(row => row.tipus), ['MANUAL', 'VIVIENDA', 'IRVE'])
})

test('every column maps to a value the export carries, in kW and mm²', () => {
  const parsed = readCalculatorExport(JSON.stringify(exportFixture))
  assert.equal(parsed.ok, true)
  const dwelling = parsed.document.files[1]

  assert.equal(dwelling.potencia, 5.75, 'W become kW')
  assert.equal(dwelling.intensitat, 25)
  assert.equal(dwelling.seccio, 10)
  assert.equal(dwelling.longitud, 14)
  assert.equal(dwelling.moment, 80.5)
  assert.equal(dwelling.caigudaParcial, 0.97)
  assert.equal(dwelling.conductor, 'ES07Z1-K', 'the cable type splits into type and rated voltage')
  assert.equal(dwelling.tensio, '450/750 V')
  assert.equal(dwelling.canalitzacio, 'Bajo tubo · Ø 32 mm')
  assert.equal(dwelling.neutre, 10)
  assert.equal(dwelling.proteccio, 10)
})

test('buried lines say the depth is pending instead of inventing it', () => {
  const parsed = readCalculatorExport(JSON.stringify(exportFixture))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.document.files[2].canalitzacio, 'Enterrado · profundidad pendiente')
})

test('the three cells the export does not carry stay null and are listed', () => {
  const parsed = readCalculatorExport(JSON.stringify(exportFixture))
  assert.equal(parsed.ok, true)

  for (const pending of PENDING_CELLS) {
    assert.ok(parsed.document.files.every(row => row[pending.key] == null), `${pending.label} stays pending`)
  }
})

test('every column of the model has a value in every row, so the table cannot drift', () => {
  const document = buildDocument(exportFixture)

  assert.equal(ELEC3_COLUMNS.length, 16, 'the legal model has sixteen columns')
  assert.equal(ELEC3_COLUMNS[0].key, 'nom', 'the row label comes first')
  for (const column of ELEC3_COLUMNS) {
    for (const row of document.files) {
      assert.ok(column.key in row, `column ${String(column.key)} exists in the row`)
    }
  }
})

test('a file that is not an export is rejected with its own reason', () => {
  assert.deepEqual(readCalculatorExport(''), { ok: false, error: 'El archivo está vacío.' })
  assert.match(readCalculatorExport('{nope').error, /JSON válido/)
  assert.match(readCalculatorExport('[]').error, /no es una exportación/)
  assert.match(readCalculatorExport('{"lines":{}}').error, /falta el bloque de líneas/)
  assert.match(readCalculatorExport('{"lines":{"di":{}}}').error, /no trae ninguna línea dimensionada/)
})

test('the button lives under «Cargar proyecto» and opens the provisional view', () => {
  const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')
  const preview = readFileSync(path.join(root, 'components/elec3-preview.tsx'), 'utf8')

  assert.ok(calc.includes('Ver ELEC-3'), 'the button is labelled')
  assert.ok(calc.indexOf('Cargar proyecto') < calc.indexOf('Ver ELEC-3'), 'it sits below «Cargar proyecto»')
  assert.match(calc, /<Elec3PreviewDialog open=\{showElec3\}/, 'the dialog is wired to its own state')
  assert.match(preview, /readCalculatorExport/, 'the view reads the export, it does not recalculate')
  assert.match(preview, /Provisional/, 'the provisional status is visible in the dialog')
})
