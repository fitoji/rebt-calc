import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DOCUMENTATION_SNAPSHOT_STORAGE_KEY,
  clearProjectData,
  loadDocumentationSnapshot,
  saveDocumentationSnapshot,
} from '../lib/calculator-storage.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const page = read('app/requisitos/page.tsx')
/** El almacenamiento de la calculadora: la instantánea se lee y se escribe ahí. */
const snapshotSource = read('lib/calculator-storage.mjs')

/** Los módulos que la página importa, tal cual los declara. */
const imports = [...page.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1])

/** Los identificadores de grupo del checklist de 19 ítems que la página eliminaba. */
const CHECKLIST_GROUPS = [
  'Datos del proyecto',
  'Previsión de cargas',
  'Línea General de Alimentación',
  'Derivaciones individuales',
  'Cuadros e instalación interior',
  'Esquema unifilar',
  'Exportación y memoria',
]

/** Módulos que recalculan la previsión: la página no debe tocarlos. */
const FORECAST_MODULES = ['project-model', 'load-previews', 'simultaneity']

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries))

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
    keys() {
      return [...values.keys()]
    },
  }
}

/** La instantánea derivada tal como la escribe el cálculo para /requisitos. */
const snapshot = {
  totalW: 6690,
  homes: 1,
  localPowers: [3450],
  localTypes: ['Comercial/oficina'],
  garages: [{ name: 'Garaje 1', ventilation: 'Forzada', plazas: 12 }],
  irvePowerW: 3680,
  cgpCount: 2,
  hasLiftingMachines: true,
}

test('S1: la página responde proyecto o memoria técnica de diseño', () => {
  assert.match(page, /Requiere proyecto/, 'la página nombra el veredicto «Requiere proyecto»')
  assert.match(page, /Solo memoria técnica de diseño/, 'la página nombra el veredicto «Solo memoria técnica de diseño»')
  assert.match(page, /classifyDocumentation\(/, 'el veredicto sale del clasificador, no de umbrales propios')
  assert.match(page, /\.verdict/, 'la etiqueta se elige con el veredicto clasificado')
})

test('S7: el checklist genérico de 19 ítems ya no se renderiza', () => {
  for (const group of CHECKLIST_GROUPS) {
    assert.ok(!page.includes(group), `la página ya no renderiza el grupo «${group}»`)
  }
  assert.doesNotMatch(page, /evaluateRequirements|REQUIREMENT_GROUPS/, 'la página no evalúa el checklist')
  assert.doesNotMatch(page, /Progreso:/, 'la página ya no cuenta requisitos válidos')
  assert.match(page, /\.groups\.map\(/, 'en su lugar se audita la tabla completa de grupos')
})

test('S1: la página lee la instantánea derivada y los datos de documentación', () => {
  assert.ok(
    imports.includes('@/lib/calculator-storage.mjs'),
    'la página lee el almacenamiento de la calculadora',
  )
  assert.match(page, /\bloadDocumentationSnapshot\(/, 'la previsión llega como instantánea derivada')
  assert.match(page, /\bloadCalculatorInputs\(/, 'los datos de documentación llegan con las entradas guardadas')
  assert.match(page, /\bdocumentation\b/, 'el bloque de documentación entra en la clasificación')
})

test('S1: la página nunca recalcula la previsión', () => {
  for (const module of FORECAST_MODULES) {
    assert.ok(
      !imports.some(specifier => specifier.includes(module)),
      `la página no importa ${module}: duplicar P1–P5 se separaría de la calculadora`,
    )
  }
  assert.doesNotMatch(page, /previewLocalPower|sumLocalPowers|previewGaragePower|getSimultaneityCoefficient|calculateProject/, 'la página no llama al motor de la previsión')
})

test('S1: la elevación viaja en la instantánea y llega al clasificador', () => {
  assert.match(page, /\.\.\.state\.snapshot/, 'la instantánea viaja entera al clasificador')
  assert.match(snapshotSource, /hasLiftingMachines/, 'el dato derivado se guarda con la instantánea')
})

test('S1: sin previsión la página explica qué falta y vuelve a la calculadora', () => {
  assert.match(page, /Qué falta/, 'la página rotula lo que falta')
  assert.match(page, /href="\/"/, 'la página enlaza de vuelta a la calculadora')
  assert.match(page, /previsión de cargas/i, 'la página nombra la previsión que hay que completar')
})

test('S5: la página cita la instrucción, la tabla de grupos y el margen autonómico', () => {
  assert.ok(
    page.includes('ITC-BT-04 §3 y §4 · ITC-BT-05 §4.1 · RD 842/2002 (BOE-A-2002-18099)'),
    'la línea de cita transcribe la referencia completa',
  )
  assert.match(page, /comunidad aut[óo]noma/i, 'la página avisa de que la comunidad autónoma puede añadir requisitos')
  assert.match(page, /§4/, 'la página nombra el apartado 4 para el caso de memoria técnica')
  assert.match(page, /tabular-nums/, 'los valores y límites se alinean para poder compararlos')
})

test('la página conserva el armazón y el sondeo del almacenamiento', () => {
  assert.match(page, /'use client'/, 'la página es un componente cliente')
  assert.match(page, /<SiteHeader/, 'la página conserva la cabecera')
  assert.match(page, /<SiteFooter \/>/, 'la página conserva el pie')
  assert.match(page, /window\.setInterval\(update, 2000\)/, 'el sondeo de mismo documento sigue ligero')
  assert.match(page, /addEventListener\('storage'/, 'los cambios de otra pestaña siguen llegando')
})

test('la instantánea va y vuelve por la API de almacenamiento, y Limpiar la borra', () => {
  const storage = createMemoryStorage()

  assert.equal(loadDocumentationSnapshot(storage), null, 'sin proyecto guardado no hay instantánea')

  saveDocumentationSnapshot(storage, snapshot)
  assert.ok(storage.keys().includes(DOCUMENTATION_SNAPSHOT_STORAGE_KEY), 'la instantánea vive bajo su propia clave')
  assert.deepEqual(loadDocumentationSnapshot(storage), snapshot, 'la instantánea vuelve tal como se guardó')

  clearProjectData(storage)
  assert.equal(loadDocumentationSnapshot(storage), null, 'Limpiar borra también la instantánea')
  assert.ok(!storage.keys().includes(DOCUMENTATION_SNAPSHOT_STORAGE_KEY), 'la clave no sobrevive a Limpiar')
})

test('una previsión vacía no deja instantánea: /requisitos puede pedir los datos', () => {
  const storage = createMemoryStorage()
  saveDocumentationSnapshot(storage, snapshot)

  saveDocumentationSnapshot(storage, {
    totalW: 0, homes: 0, localPowers: [], localTypes: [], garages: [], irvePowerW: 0, cgpCount: 1,
  })

  assert.equal(loadDocumentationSnapshot(storage), null, 'sin cargas no hay veredicto que dar')
})

test('una instantánea anterior sin el dato de elevación sigue leyéndose', () => {
  const storage = createMemoryStorage({
    [DOCUMENTATION_SNAPSHOT_STORAGE_KEY]: JSON.stringify({
      version: 1, totalW: 6690, homes: 1, localPowers: [], localTypes: [], garages: [], irvePowerW: 0, cgpCount: 1,
    }),
  })

  const loaded = loadDocumentationSnapshot(storage)
  assert.ok(loaded, 'una instantánea de antes del cambio sigue valiendo')
  assert.equal(loaded.hasLiftingMachines, false, 'sin el dato, la previsión no declara elevación')
})

test('la instantánea descarta lo que no puede leer entero', () => {
  const storage = createMemoryStorage({
    [DOCUMENTATION_SNAPSHOT_STORAGE_KEY]: JSON.stringify({ version: 1, totalW: 'mucho' }),
  })

  assert.equal(loadDocumentationSnapshot(storage), null, 'una instantánea corrupta no se clasifica a medias')

  storage.setItem(DOCUMENTATION_SNAPSHOT_STORAGE_KEY, 'no es json')
  assert.equal(loadDocumentationSnapshot(storage), null, 'un JSON inválido no rompe la página')
})

test('S7: lib/requirements.mjs se eliminó con el checklist', () => {
  assert.equal(existsSync(path.join(root, 'lib/requirements.mjs')), false, 'nadie más importaba el checklist')
})

test('la página clasifica la inspección inicial de la ITC-BT-05 §4.1 con la previsión ya guardada', () => {
  assert.ok(imports.includes('@/lib/inspection.mjs'), 'la inspección sale del clasificador, no del texto de la página')
  assert.ok(page.includes('classifyInspection'), 'la página llama al clasificador de inspección')
  assert.ok(page.includes('ITC-BT-05 §4.1'), 'la sección nombra la instrucción que la escribe')
  assert.ok(page.includes('Será objeto de inspección inicial'), 'el veredicto de inspección usa las palabras de la instrucción')
  const registrySource = read('lib/normative-tables.mjs')
  assert.ok(registrySource.includes("'inspection.initial'"), 'la lista se declara en el registro normativo, una sola vez')
})
