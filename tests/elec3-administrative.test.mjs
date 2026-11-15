import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDwellingDocument } from '../lib/elec3.mjs'

/** Hoja 2 of the model `G146NSIN-157-00`: the administrative data the caller already owns. */
const administrativeInput = {
  titular: '  Ana Pérez Ruiz  ',
  uso: ' Vivienda habitual ',
  emplazamiento: {
    calle: ' Carrer Major ',
    numero: '12',
    piso: '3º',
    puerta: 'B',
    localidad: ' Girona ',
    codigoPostal: '17001',
  },
  instalacion: 'ampliacion',
  distribuidora: 'e-Distribución',
  resistenciaTierraOhm: 12.5,
  superficieLocalM2: 84.6,
  seccionDi: 16,
  potenciaMaximaAdmisibleKw: 9.2,
  tensionV: 230,
  potenciaInstalarKw: 5.75,
  igaA: 40,
  diferenciales: [
    { circuito: 'C1', nombre: 'Iluminación', inA: 10, sensibilidadMa: 30 },
    { circuito: 'C3', nombre: 'Cocina y horno', inA: 25, sensibilidadMa: 30 },
    { circuito: 'C4', nombre: 'Lavadora', inA: 20, sensibilidadMa: 30 },
  ],
}

const EMPTY_EMPLAZAMIENTO = {
  calle: null,
  numero: null,
  piso: null,
  puerta: null,
  localidad: null,
  codigoPostal: null,
}

function emptyDifferential() {
  return { circuito: null, nombre: null, inA: null, sensibilidadMa: null }
}

test('the administrative block carries the declared data verbatim, trimmed', () => {
  const { administrative } = buildDwellingDocument({ administrative: administrativeInput })

  assert.equal(administrative.titular, 'Ana Pérez Ruiz', 'the trailing blanks around the text are dropped')
  assert.equal(administrative.uso, 'Vivienda habitual')
  assert.deepEqual(administrative.emplazamiento, {
    calle: 'Carrer Major',
    numero: '12',
    piso: '3º',
    puerta: 'B',
    localidad: 'Girona',
    codigoPostal: '17001',
  })
  assert.equal(administrative.distribuidora, 'e-Distribución')
  assert.equal(administrative.resistenciaTierraOhm, 12.5)
  assert.equal(administrative.superficieLocalM2, 84.6)
  assert.equal(administrative.seccionDi, 16)
  assert.equal(administrative.potenciaMaximaAdmisibleKw, 9.2)
  assert.equal(administrative.tensionV, 230)
  assert.equal(administrative.potenciaInstalarKw, 5.75)
  assert.equal(administrative.igaA, 40)
  assert.deepEqual(administrative.diferenciales, administrativeInput.diferenciales, 'the differentials pass through untouched')
})

test('the installation type becomes the Spanish label of the printed form', () => {
  const label = (instalacion) => buildDwellingDocument({ administrative: { instalacion } }).administrative.instalacion

  assert.equal(label('nueva'), 'Nueva')
  assert.equal(label('ampliacion'), 'Ampliación')
  assert.equal(label('reforma'), 'Reforma')
})

test('an unknown installation token is not echoed as a label', () => {
  const label = (instalacion) => buildDwellingDocument({ administrative: { instalacion } }).administrative.instalacion

  assert.equal(label('nuevaa'), null)
  assert.equal(label('Ampliación'), null, 'the accepted tokens are the Latin ones, not the printed label')
  assert.equal(label(''), null)
  assert.equal(label(42), null)
})

test('a document with no administrative input still carries the block, all null and no differentials', () => {
  for (const input of [{}, { derivation: {}, circuits: [] }, { administrative: undefined }]) {
    const { administrative } = buildDwellingDocument(input)

    assert.deepEqual(administrative, {
      titular: null,
      uso: null,
      emplazamiento: EMPTY_EMPLAZAMIENTO,
      instalacion: null,
      distribuidora: null,
      resistenciaTierraOhm: null,
      superficieLocalM2: null,
      seccionDi: null,
      potenciaMaximaAdmisibleKw: null,
      tensionV: null,
      potenciaInstalarKw: null,
      igaA: null,
      diferenciales: [],
    })
  }
})

test('blank text is pending, never an empty string', () => {
  const { administrative } = buildDwellingDocument({
    administrative: { titular: '   ', uso: '', emplazamiento: { calle: ' ', numero: ' 4 ' } },
  })

  assert.equal(administrative.titular, null)
  assert.equal(administrative.uso, null)
  assert.equal(administrative.emplazamiento.calle, null)
  assert.equal(administrative.emplazamiento.numero, '4')
  assert.equal(administrative.emplazamiento.piso, null, 'a missing emplazamiento field is null')
})

test('a number that is not a finite number is pending, not carried', () => {
  const { administrative } = buildDwellingDocument({
    administrative: {
      resistenciaTierraOhm: Number.NaN,
      superficieLocalM2: Number.POSITIVE_INFINITY,
      seccionDi: /** @type {any} */ ('12'),
      potenciaMaximaAdmisibleKw: Number.NEGATIVE_INFINITY,
      tensionV: null,
      potenciaInstalarKw: /** @type {any} */ ('5,75'),
      igaA: Number.NaN,
    },
  })

  for (const key of ['resistenciaTierraOhm', 'superficieLocalM2', 'seccionDi', 'potenciaMaximaAdmisibleKw', 'tensionV', 'potenciaInstalarKw', 'igaA']) {
    assert.equal(administrative[key], null, `${key} is pending`)
  }
})

test('only the three differential rows of the printed form are written, in order', () => {
  const diferenciales = [
    { circuito: 'C1', nombre: 'Iluminación', inA: 10, sensibilidadMa: 30 },
    { circuito: 'C2', nombre: 'Tomas de uso general', inA: 16, sensibilidadMa: 30 },
    { circuito: 'C3', nombre: 'Cocina y horno', inA: 25, sensibilidadMa: 30 },
    { circuito: 'C4', nombre: 'Lavadora', inA: 20, sensibilidadMa: 30 },
  ]

  const { administrative } = buildDwellingDocument({ administrative: { diferenciales } })

  assert.equal(administrative.diferenciales.length, 3, 'the sheet has three differential rows')
  assert.deepEqual(administrative.diferenciales, diferenciales.slice(0, 3))
})

test('a partial differential row leaves its missing cells pending', () => {
  const { administrative } = buildDwellingDocument({
    administrative: { diferenciales: [{ circuito: ' C1 ', inA: 10, sensibilidadMa: Number.NaN }, {}] },
  })

  assert.deepEqual(administrative.diferenciales, [
    { circuito: 'C1', nombre: null, inA: 10, sensibilidadMa: null },
    emptyDifferential(),
  ])
})

test('sheet 1 of the dwelling is untouched by the administrative block', () => {
  const baseline = buildDwellingDocument({ derivation: { powerW: 5750, result: { finalSection: 16 } } })
  const withAdmin = buildDwellingDocument({
    derivation: { powerW: 5750, result: { finalSection: 16 } },
    administrative: administrativeInput,
  })

  assert.deepEqual(Object.keys(withAdmin).sort(), ['administrative', 'circuitsBeyondModel', 'data', 'files', 'lga', 'obra', 'totalKw'])
  assert.deepEqual(withAdmin.files, baseline.files, 'the rows of the derivación individual are identical')
  assert.equal(withAdmin.circuitsBeyondModel, 0)
  assert.equal(withAdmin.totalKw, baseline.totalKw)
  assert.equal(withAdmin.lga, null)
  assert.equal(withAdmin.obra, '')
  assert.deepEqual(withAdmin.circuitsBeyondModel, baseline.circuitsBeyondModel)
})
