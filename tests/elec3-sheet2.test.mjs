import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildDwellingDocument } from '../lib/elec3.mjs'
import { ELEC3_TEXT } from '../lib/elec3-i18n.mjs'

/**
 * Hoja 2 administrativa tal como la pinta el diálogo. La arma el modelo real, así que
 * las claves que se pinean son las que el documento lleva, no una copia del componente.
 */
const preview = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../components/elec3-preview.tsx'),
  'utf8',
)

const administrative = buildDwellingDocument({
  administrative: {
    titular: 'Ana Pérez Ruiz',
    uso: 'Vivienda habitual',
    emplazamiento: {
      calle: 'Carrer Major',
      numero: '12',
      piso: '3º',
      puerta: 'B',
      localidad: 'Girona',
      codigoPostal: '17001',
    },
    instalacion: 'nueva',
    distribuidora: 'e-Distribución',
    resistenciaTierraOhm: 12.5,
    superficieLocalM2: 84.6,
    seccionDi: 16,
    potenciaMaximaAdmisibleKw: 9.2,
    tensionV: 230,
    potenciaInstalarKw: 5.75,
    igaA: 40,
    diferenciales: [{ sensibilidadMa: 30 }, { sensibilidadMa: 30 }],
  },
}).administrative

/** El trozo del archivo que pinta la hoja 2: su componente y lo que cuelga de él. */
const sheet2 = preview.slice(preview.indexOf('function Sheet2('))
assert.ok(sheet2.length > 0, 'la hoja 2 tiene su propio componente')

test('la hoja 2 pinta los ocho grupos del impreso, en el orden en que se leen', () => {
  const groups = ['titular', 'segell', 'emplacament', 'instalacio', 'caracteristiques', 'dades', 'diferencial', 'signatura']

  let previous = -1
  for (const group of groups) {
    const at = preview.indexOf(`sheet.groups.${group}`)
    assert.ok(at > previous, `«${group}» se pinta después del grupo anterior`)
    previous = at
  }

  assert.ok(
    preview.indexOf('sheet.groups.titular') > preview.indexOf('<table'),
    'la hoja 2 va debajo de la tabla de la hoja 1, en el mismo diálogo',
  )
  assert.equal(ELEC3_TEXT.es.sheet2.groups.signatura, 'FECHA Y FIRMA DEL INSTALADOR')
  assert.equal(ELEC3_TEXT.ca.sheet2.groups.signatura, 'DATA I SIGNATURA INSTAL·LADOR')
})

test('la hoja 2 lee cada dato que declara el bloque administrativo del modelo', () => {
  for (const key of Object.keys(administrative)) {
    assert.ok(preview.includes(`administrative?.${key}`), `la vista lee administrative.${key}`)
  }
  for (const field of Object.keys(administrative.emplazamiento)) {
    assert.ok(preview.includes(`emplazamiento?.${field}`), `la vista lee el campo «${field}» del emplazamiento`)
  }
  for (const key of Object.keys(administrative.diferenciales[0])) {
    assert.ok(preview.includes(`key: '${key}'`), `la columna «${key}» del diferencial está declarada en la hoja 2`)
  }
  assert.match(
    preview,
    /<Value value=\{differential\?\.\[column\.key\] \?\? null\} \/>/,
    'cada columna del diferencial se lee de su fila, sin suponerle un valor',
  )
})

test('una celda nula se pinta con el pendiente de la tabla, nunca como 0 ni vacía', () => {
  const pendingMarkups = preview.match(/—<span className="sr-only">Pendiente<\/span>/g) ?? []
  assert.equal(pendingMarkups.length, 1, 'un solo tratamiento de pendiente, compartido por las dos hojas')
  assert.match(preview, /function Pending\(\)/, 'el pendiente es un componente, no un texto repetido')
  assert.match(
    preview,
    /function isEmpty\([\s\S]*?value === null \|\| value === undefined/,
    'el nulo y el indefinido caen en el pendiente',
  )
  assert.match(preview, /if \(isEmpty\(value\)\) return <Pending \/>/, 'el valor pendiente no se formatea como número')
  assert.doesNotMatch(preview, /administrative\?\.\w+ \|\|/, 'ningún dato administrativo se sustituye por un valor por defecto')
})

test('las tres filas del diferencial se pintan siempre y solo la sensibilidad viene de la app', () => {
  const differential = preview.slice(
    preview.indexOf('/* Hoja 2 del modelo: datos administrativos e interruptor diferencial. */'),
    preview.indexOf('sheet.groups.signatura'),
  )

  assert.match(preview, /const MODEL_DIFFERENTIAL_ROWS = 3/, 'el impreso tiene tres filas de diferencial')
  assert.match(
    preview,
    /Array\.from\(\{ length: MODEL_DIFFERENTIAL_ROWS \}/,
    'las tres filas se pintan aunque el bloque traiga menos: las que faltan quedan pendientes',
  )
  assert.match(differential, /sheet\.differential\[column\.key/, 'las columnas del diferencial salen del diccionario')
  for (const key of ['circuito', 'nombre', 'inA', 'sensibilidadMa']) {
    assert.ok(differential.includes(`key: '${key}'`), `la fila del diferencial lleva la columna «${key}»`)
  }
  assert.deepEqual(Object.values(ELEC3_TEXT.es.sheet2.differential), ['Circuito', 'Nombre', 'In', 'Sensibilidad'])
  assert.deepEqual(Object.values(ELEC3_TEXT.ca.sheet2.differential), ['Circuit', 'Nombre', 'In', 'Sensibilitat'])
  assert.match(
    differential,
    /<Value value=\{differential\?\.\[column\.key\] \?\? null\} \/>/,
    'la sensibilidad es el único dato que declara la app; las otras columnas se leen de la fila y quedan pendientes',
  )
})

test('la firma y la fecha se declaran manuscritas en ambos idiomas', () => {
  const signature = sheet2.slice(sheet2.indexOf('sheet.groups.signatura'))

  assert.match(signature, /\{sheet\.signaturaText\}/)
  assert.match(ELEC3_TEXT.es.sheet2.signaturaText, /La firma y la fecha se completan a mano/)
  assert.match(ELEC3_TEXT.ca.sheet2.signaturaText, /La firma y la data se completan a mano/)
})

test('el pie de la hoja 2 reproduce la nota y el código del impreso', () => {
  assert.match(sheet2, /\{sheet\.nota\}/)
  assert.match(ELEC3_TEXT.es.sheet2.nota, /NOTA \(1\) Es la máxima que puede soportar el conjunto de la instalación\./)
  assert.match(ELEC3_TEXT.ca.sheet2.nota, /NOTA \(1\) És la màxima que pot suportar el conjunt de la instal·lació\./)
  assert.match(ELEC3_TEXT.es.sheet2.formCode, /G146NSIN-157-00/)
})

test('la hoja 2 se monta aunque no haya bloque administrativo y pide su página al imprimir', () => {
  assert.match(preview, /administrative=\{document\?\.administrative\}/, 'se monta con el documento, no detrás de un condicional')
  assert.match(preview, /print:break-before-page/, 'al imprimir, la hoja 2 abre su propia página')
  assert.doesNotMatch(preview, /administrative &&/, 'un bloque ausente no esconde la hoja')
  assert.doesNotMatch(preview, /print:hidden/, 'nada de la hoja 2 se esconde al imprimir')
})

test('cada número de la hoja 2 se pinta con su unidad y ningún dato se recorta', () => {
  for (const [key, ca] of [
    ['terra', 'RESISTÈNCIA TERRA DE PROTEC. (Ω)'],
    ['superficie', 'SUPERFÍCIE LOCAL m2'],
    ['seccioDi', 'SECCIÓ DE LA DERIVACIÓ INDIV. mm2'],
    ['potenciaMax', 'Potència màxima admissible (1) kW'],
    ['tensio', 'TENSIÓ V'],
    ['potenciaInstalar', 'Potència a instal·lar kW'],
    ['iga', 'INTENSITAT INTERRUPTOR GENERAL AUTOMÀTIC A'],
  ]) {
    assert.equal(ELEC3_TEXT.ca.sheet2.fields[key], ca, `la unidad catalana viaja con su etiqueta: «${ca}»`)
    assert.notEqual(ELEC3_TEXT.es.sheet2.fields[key], ca, `la etiqueta castellana «${ELEC3_TEXT.es.sheet2.fields[key]}» es distinta de la catalana`)
  }

  assert.doesNotMatch(sheet2, /truncate/, 'ningún texto de la hoja 2 se recorta con puntos suspensivos')
})
