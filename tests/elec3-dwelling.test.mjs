import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDwellingDocument, ELEC3_COLUMNS, PENDING_CELLS } from '../lib/elec3.mjs'

/** A dwelling already sized by the engine: its own derivación individual plus ITC-BT-25 circuits. */
const dwellingInput = {
  obra: 'Carrer Major 12, Girona',
  data: '15/11/2026',
  totalKw: 9.2,
  lga: { potencia: 9.2, seccio: 16, proteccio: 40, neutre: 16, terra: 16, tub: 40, caiguda: 0.4 },
  derivation: {
    label: 'Derivación individual',
    powerW: 9200,
    cosPhi: 1,
    lengthM: 20,
    installation: 'air',
    tubeDiameter: 40,
    result: {
      finalSection: 16,
      ratedCurrent: 40,
      dropPercent: 0.906,
      momentKwM: 184,
      cableType: 'RZ1-K 0,6/1 kV',
      neutralSection: 16,
      protectiveSection: 16,
    },
  },
  circuits: [
    { id: 'C1', label: 'C1 Iluminación', powerW: 1150, lengthM: 12, breakerA: 10, section: 1.5, momentKwM: 13.8, dropPercent: 0.86, cableType: 'ES07Z1-K 450/750 V', neutralSection: 1.5, protectiveSection: 1.5, installation: 'air', tubeDiameter: 16 },
    { id: 'C2', label: 'C2 Tomas de uso general', powerW: 3450, lengthM: 18, breakerA: 16, section: 2.5, momentKwM: 62.1, dropPercent: 1.09, cableType: 'ES07Z1-K 450/750 V', neutralSection: 2.5, protectiveSection: 2.5, installation: 'air', tubeDiameter: 20 },
    { id: 'C3', label: 'C3 Cocina y horno', powerW: 4600, lengthM: 9, breakerA: 25, section: 6, momentKwM: 41.4, dropPercent: 0.6, cableType: 'ES07Z1-K 450/750 V', neutralSection: 6, protectiveSection: 6, installation: 'buried', tubeDiameter: 25 },
  ],
}

test('a dwelling becomes its derivación row followed by one row per circuit, in order', () => {
  const document = buildDwellingDocument(dwellingInput)

  assert.equal(document.files.length, 4, 'the DI plus the three circuits')
  assert.equal(document.files[0].nom, 'Derivación individual')
  assert.equal(document.files[0].tipus, 'VIVIENDA')
  assert.equal(document.files[0].id, 'di')
  assert.deepEqual(document.files.slice(1).map(row => row.nom), ['C1 Iluminación', 'C2 Tomas de uso general', 'C3 Cocina y horno'])
  assert.deepEqual(document.files.slice(1).map(row => row.tipus), ['CIRCUITO', 'CIRCUITO', 'CIRCUITO'])
  assert.deepEqual(document.files.slice(1).map(row => row.id), ['C1', 'C2', 'C3'])
})

test('the derivación row fills every column from the sized derivation', () => {
  const row = buildDwellingDocument(dwellingInput).files[0]

  assert.equal(row.potencia, 9.2, 'W become kW')
  assert.equal(row.cosPhi, 1)
  assert.equal(row.intensitat, 40)
  assert.equal(row.seccio, 16)
  assert.equal(row.longitud, 20)
  assert.equal(row.moment, 184)
  assert.equal(row.caigudaParcial, 0.906)
  assert.equal(row.conductor, 'RZ1-K', 'the cable type splits into type and rated voltage')
  assert.equal(row.tensio, '0,6/1 kV')
  assert.equal(row.canalitzacio, 'Bajo tubo · Ø 40 mm')
  assert.equal(row.neutre, 16)
  assert.equal(row.proteccio, 16)
})

test('a circuit row fills every column from the circuit it belongs to', () => {
  const row = buildDwellingDocument(dwellingInput).files[1]

  assert.equal(row.potencia, 1.15, 'W become kW')
  assert.equal(row.intensitat, 10, 'Ib is the breaker rating the caller sized')
  assert.equal(row.seccio, 1.5)
  assert.equal(row.longitud, 12)
  assert.equal(row.moment, 13.8)
  assert.equal(row.caigudaParcial, 0.86)
  assert.equal(row.conductor, 'ES07Z1-K')
  assert.equal(row.tensio, '450/750 V')
  assert.equal(row.canalitzacio, 'Bajo tubo · Ø 16 mm')
  assert.equal(row.neutre, 1.5)
  assert.equal(row.proteccio, 1.5)
  assert.equal(row.cosPhi, null, 'a circuit carries no cos φ, so it is not assumed to be 1')
  assert.equal(buildDwellingDocument(dwellingInput).files[3].canalitzacio, 'Enterrado · profundidad pendiente')
})

test('the three cells the model does not carry stay null, and the grid stays 16 columns', () => {
  const document = buildDwellingDocument(dwellingInput)

  assert.equal(ELEC3_COLUMNS.length, 16, 'the legal model keeps its sixteen columns')
  assert.equal(ELEC3_COLUMNS.some(column => ['simultaneitat', 'caigudaTotal', 'aillament'].includes(column.key)), true)
  assert.deepEqual(PENDING_CELLS.map(pending => pending.key), ['simultaneitat', 'caigudaTotal', 'aillament'])
  for (const row of document.files) {
    for (const pending of PENDING_CELLS) {
      assert.equal(row[pending.key], null, `${row.nom} · ${pending.key} is pending, never estimated`)
    }
  }
})

test('an input that is absent leaves a null cell, never a zero and never a guess', () => {
  const document = buildDwellingDocument({
    derivation: {},
    circuits: [{ id: 'C1', label: 'C1 Iluminación' }],
  })

  const [di, circuit] = document.files
  for (const row of [di, circuit]) {
    for (const key of ['potencia', 'cosPhi', 'intensitat', 'seccio', 'longitud', 'moment', 'caigudaParcial', 'conductor', 'tensio', 'canalitzacio', 'neutre', 'proteccio']) {
      assert.equal(row[key], null, `${row.nom} · ${key} is absent, so it is null`)
    }
  }
  assert.equal(buildDwellingDocument({ derivation: { powerW: 0 }, circuits: [] }).files[0].potencia, 0, 'an explicit zero is a value, not a gap')
})

test('the model emits at most twelve circuits and reports the ones that did not fit', () => {
  const circuits = Array.from({ length: 13 }, (_, index) => ({ id: `C${index + 1}`, label: `C${index + 1}` }))

  const document = buildDwellingDocument({ derivation: {}, circuits })
  assert.equal(document.files.length, 13, 'one DI row plus the twelve rows the sheet has')
  assert.equal(document.files.filter(row => row.tipus === 'CIRCUITO').length, 12)
  assert.equal(document.files[12].nom, 'C12', 'the first twelve are kept, in order')
  assert.equal(document.circuitsBeyondModel, 1)

  assert.equal(buildDwellingDocument({ derivation: {}, circuits, circuitsBeyondModel: 2 }).circuitsBeyondModel, 3, 'the caller\'s own overflow is added')
  assert.equal(buildDwellingDocument(dwellingInput).circuitsBeyondModel, 0, 'nothing left over')
})

test('obra and data follow the defaults when the input does not carry them', () => {
  const today = new Date().toLocaleDateString('es-ES')
  const document = buildDwellingDocument({ derivation: {}, circuits: [] })

  assert.equal(document.obra, '', 'no work address, no invention')
  assert.equal(document.data, today, 'dated today, as the sheet is printed')
  assert.equal(document.totalKw, null)
  assert.equal(document.lga, null)

  const explicit = buildDwellingDocument(dwellingInput)
  assert.equal(explicit.obra, 'Carrer Major 12, Girona')
  assert.equal(explicit.data, '15/11/2026')
  assert.equal(explicit.totalKw, 9.2)
  assert.deepEqual(explicit.lga, dwellingInput.lga, 'the LGA context passes through untouched')
})
