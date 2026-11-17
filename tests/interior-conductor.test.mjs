import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULT_INTERIOR_CONDUCTOR, INTERIOR_CONDUCTORS } from '../lib/interior-conductors.mjs'
import { dwellingDocumentInput } from '../lib/elec3-dwelling.mjs'
import { buildDwellingDocument } from '../lib/elec3.mjs'
import { housingCircuitsFor } from '../lib/housing-circuits.mjs'
import { loadCalculatorInputs, saveCalculatorInputs } from '../lib/calculator-storage.mjs'
import { GUIDE_TABLES, ITC_BT_26_CONDUCTORS } from '../lib/normative-tables.mjs'

const root = path.resolve(dirname(fileURLToPath(import.meta.url)), '..')
const readSource = file => readFileSync(path.join(root, file), 'utf8')

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, String(value)) },
    removeItem: key => { values.delete(key) },
  }
}

const derivation = {
  powerW: 9200,
  result: { cableType: 'RZ1-K 0,6/1 kV' },
}

const documentFor = overrides => buildDwellingDocument(dwellingDocumentInput({
  derivation,
  circuits: housingCircuitsFor(9200).slice(0, 3),
  ...overrides,
}))

test('ITC-BT-26 ofrece tres tipos de conductor y H07V-K es el predeterminado', () => {
  assert.deepEqual(INTERIOR_CONDUCTORS, ['H07V-U', 'H07V-R', 'H07V-K'])
  assert.equal(DEFAULT_INTERIOR_CONDUCTOR, 'H07V-K')
})

test('el tipo elegido se imprime en los circuitos del ELEC-3, no en la derivación', () => {
  const document = documentFor({ conductorType: 'H07V-U' })

  assert.equal(document.files[0].conductor, 'RZ1-K', 'la DI conserva el cable del motor')
  assert.deepEqual(document.files.slice(1).map(row => row.conductor), ['H07V-U', 'H07V-U', 'H07V-U'])
  assert.deepEqual(document.files.slice(1).map(row => row.tensio), ['450/750 V', '450/750 V', '450/750 V'], 'la tensión sale del tipo de conductor')
})

test('el H07V-K imprime su tensión nominal de aislamiento de 450/750 V', () => {
  const document = documentFor({ conductorType: 'H07V-K' })

  assert.equal(document.files[1].conductor, 'H07V-K')
  assert.equal(document.files[1].tensio, '450/750 V')
})

test('sin declarar el tipo, los circuitos siguen pendientes', () => {
  const document = documentFor()
  assert.deepEqual(document.files.slice(1).map(row => row.conductor), [null, null, null])
})

test('el tipo elegido se guarda y se recupera con el proyecto', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, {
    housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }],
    locals: [], garages: [], elevators: [], motors: [], otherLoads: [],
    parking: 0,
    irveOption: 1,
    interiorConductor: 'H07V-R',
  })

  assert.equal(loadCalculatorInputs(storage).interiorConductor, 'H07V-R')
})

test('la guía BT-26 publica la tabla de conductores con tipo, producto y norma', () => {
  const table = GUIDE_TABLES.find(entry => entry.key === 'BT26')

  assert.ok(table, 'el panel único tiene la tabla de la guía BT-26')
  assert.match(table.title, /Guía-BT-26/)
  assert.deepEqual(table.head, ['Tipo', 'Producto', 'Norma de aplicación'])
  assert.equal(table.rows, ITC_BT_26_CONDUCTORS, 'las filas salen de la constante transcrita')
  assert.deepEqual(table.rows.map(row => row[0]), INTERIOR_CONDUCTORS, 'los tipos coinciden con las opciones del selector')
  assert.deepEqual([...new Set(table.rows.map(row => row[2]))], ['UNE 21.031-3'], 'los tres productos citan la misma norma')
  assert.match(table.doc, /UNE 21 022/, 'la norma de las clases también se cita')
  for (const [number, symbol] of [['1', 'U'], ['2', 'R'], ['5', 'K']]) {
    assert.match(table.doc, new RegExp(`clase ${number}`), `la doc explica la clase ${number}`)
    assert.match(table.doc, new RegExp(`–${symbol}`), `y su símbolo –${symbol}`)
  }
})

test('el botón de tabla del selector abre el panel en la guía BT-26', () => {
  const calc = readSource('components/load-calculator.tsx')
  const panel = readSource('components/interior-panel.tsx')
  const modules = readSource('components/line-modules.tsx')

  assert.match(modules, /'BT26'/, 'BT26 entra en TableKey para que el panel sepa enfocarla')
  assert.match(calc, /onOpenConductorTable=\{\(\) => openReferenceTable\('BT26'\)\}/, 'Cuadros pasa el disparador de la tabla')
  assert.match(panel, /ariaLabel="Ver tabla de conductores · Guía-BT-26"/, 'el botón nombra la tabla que abre')
  assert.match(panel, /<TableButton[^>]*onOpen=\{onOpenConductorTable\}/, 'el botón usa el disparador del panel único')
})

test('la tabla BT-26 usa la paleta celeste generada, en claro y en oscuro', () => {
  const modules = readSource('components/line-modules.tsx')
  const css = readSource('app/globals.css')

  assert.match(modules, /tone=\{table\.key === 'BT26' \? 'conductor' : undefined\}/, 'solo la tabla de conductores recibe el tono')
  assert.match(modules, /tone === 'conductor' \? 'text-xs table-conductor' : 'text-xs'/, 'SimpleTable aplica la clase de la paleta')
  for (const hex of ['#0369a1', '#d6e3ef', '#e8f0f6', '#2c3b53', '#2c364a', '#ffffff']) {
    assert.ok(css.includes(hex), `la paleta generada conserva ${hex} sin redondear`)
  }
  assert.match(css, /\.table-conductor thead th \{ background: var\(--conductor-head\); color: var\(--conductor-head-text\); \}/, 'el header toma el tono generado')
  assert.match(css, /\.table-conductor tbody tr:nth-child\(odd\) \{ background: var\(--conductor-row-odd\); \}/, 'las filas alternan los dos tintes')
})

test('el selector queda sobre la tabla de circuitos, dentro del card de instalaciones interiores', () => {
  const calc = readSource('components/load-calculator.tsx')
  const panel = readSource('components/interior-panel.tsx')

  assert.match(calc, /DEFAULT_INTERIOR_CONDUCTOR/, 'el estado arranca en H07V-K')
  assert.match(calc, /conductorType: interiorConductor/, 'la elección se pasa al documento ELEC-3')
  assert.match(calc, /onInteriorConductorChange=\{setInteriorConductor\}/, 'el panel recibe el cambio')
  assert.doesNotMatch(calc, /INTERIOR_CONDUCTORS/, 'ya no es una card suelta en el tab Cuadros')

  const conductor = panel.indexOf('Tipo de conductor')
  const table = panel.indexOf('Circuitos de la vivienda')
  assert.ok(conductor > -1, 'el card ofrece los tres tipos de la ITC-BT-26')
  assert.ok(table > -1, 'existe la tabla de circuitos de vivienda')
  assert.ok(conductor < table, 'el selector queda arriba de la tabla')
  assert.match(panel, /INTERIOR_CONDUCTORS\.map/, 'las tres opciones salen de la tabla')
  assert.match(panel, /Instalaciones interiores/, 'dentro del card de instalaciones interiores')
})
