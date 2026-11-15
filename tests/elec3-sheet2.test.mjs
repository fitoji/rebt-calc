import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildDwellingDocument } from '../lib/elec3.mjs'

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

test('la hoja 2 pinta los seis grupos del impreso, en el orden en que se leen', () => {
  const groups = ['Titular y uso', 'Emplazamiento', 'Instalación', 'Características', 'Interruptor diferencial', 'Firma y sello']

  let previous = -1
  for (const group of groups) {
    const at = preview.indexOf(`title="${group}"`)
    assert.ok(at > previous, `«${group}» se pinta después del grupo anterior`)
    previous = at
  }

  assert.ok(
    preview.indexOf('title="Titular y uso"') > preview.indexOf('<table'),
    'la hoja 2 va debajo de la tabla de la hoja 1, en el mismo diálogo',
  )
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
    preview.indexOf('title="Firma y sello"'),
  )

  assert.match(preview, /const MODEL_DIFFERENTIAL_ROWS = 3/, 'el impreso tiene tres filas de diferencial')
  assert.match(
    preview,
    /Array\.from\(\{ length: MODEL_DIFFERENTIAL_ROWS \}/,
    'las tres filas se pintan aunque el bloque traiga menos: las que faltan quedan pendientes',
  )
  for (const header of ['Circuito', 'Nombre', 'In (A)', 'Sensibilidad (mA)']) {
    assert.ok(differential.includes(`'${header}'`), `la fila del diferencial lleva su columna «${header}»`)
  }
  assert.match(
    differential,
    /<Value value=\{differential\?\.\[column\.key\] \?\? null\} \/>/,
    'la sensibilidad es el único dato que declara la app; las otras columnas se leen de la fila y quedan pendientes',
  )
})

test('la firma y el sello se declaran manuscritos', () => {
  const signature = sheet2.slice(sheet2.indexOf('title="Firma y sello"'))

  assert.match(signature, /La firma del titular y el sello del instalador se completan a mano/)
  assert.match(signature, /la aplicación no los genera/)
})

test('el pie de la hoja 2 nombra las celdas que solo completa el instalador', () => {
  assert.match(sheet2, /Solo el instalador puede completar en la hoja 2/)
  assert.match(sheet2, /la firma con el sello/)
})

test('la hoja 2 se monta aunque no haya bloque administrativo y pide su página al imprimir', () => {
  assert.match(preview, /administrative=\{document\?\.administrative\}/, 'se monta con el documento, no detrás de un condicional')
  assert.match(preview, /print:break-before-page/, 'al imprimir, la hoja 2 abre su propia página')
  assert.doesNotMatch(preview, /administrative &&/, 'un bloque ausente no esconde la hoja')
  assert.doesNotMatch(preview, /print:hidden/, 'nada de la hoja 2 se esconde al imprimir')
})

test('cada número de la hoja 2 se pinta con su unidad y ningún dato se recorta', () => {
  for (const field of [
    'Resistencia de tierra (Ω)',
    'Superficie del local (m²)',
    'Sección de la derivación individual (mm²)',
    'Potencia máxima admisible (kW)',
    'Tensión (V)',
    'Potencia a instalar (kW)',
    'IGA (A)',
  ]) {
    assert.ok(sheet2.includes(field), `la unidad viaja con su etiqueta: «${field}»`)
  }

  assert.doesNotMatch(sheet2, /truncate/, 'ningún texto de la hoja 2 se recorta con puntos suspensivos')
})
