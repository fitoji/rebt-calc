import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeVisibleTabs, cuadrosHasEdits, resolveActiveTab, TAB_ORDER } from '../lib/tab-visibility.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const calc = read('components/load-calculator.tsx')
const lib = read('lib/tab-visibility.mjs')

// Regla pedida: "al comenzar de 0, quiero que solo se vea prevision de cargas tab".
// Los datos administrativos del proyecto no dependen de ningún cálculo, así que su
// tab es la única que acompaña a Previsión de cargas desde el primer momento.
test('un proyecto de cero muestra Previsión de cargas y Datos administrativos, y nada más', () => {
  assert.deepEqual(computeVisibleTabs({ homes: 0, hasDerivations: false, cuadrosStarted: false }), ['cargas', 'administrativos'])
})

// Regla pedida: "al agregar una vivienda surga la tab de DI".
test('una vivienda hace surgir DI, y solo DI', () => {
  assert.deepEqual(computeVisibleTabs({ homes: 1, hasDerivations: false, cuadrosStarted: false }), ['cargas', 'di', 'administrativos'])
})

// Decisión del usuario: "segun normatiba del rebt, una vivienda unifamiliar o dos
// viviendas adosadas no necesitan LGA".
test('dos viviendas siguen sin LGA (REBT: unifamiliar o dos adosadas no la necesitan)', () => {
  assert.deepEqual(computeVisibleTabs({ homes: 2, hasDerivations: false, cuadrosStarted: false }), ['cargas', 'di', 'administrativos'])
})

// Regla pedida: "al agregar mas de 2 viviendas surga LGA"; LGA va antes que DI en
// el orden de la barra, así que la lista devuelta respeta TAB_ORDER.
test('más de dos viviendas hacen surgir LGA antes que DI, en orden de barra', () => {
  assert.deepEqual(computeVisibleTabs({ homes: 3, hasDerivations: false, cuadrosStarted: false }), ['cargas', 'lga', 'di', 'administrativos'])
  assert.deepEqual(computeVisibleTabs({ homes: 11, hasDerivations: false, cuadrosStarted: false }), ['cargas', 'lga', 'di', 'administrativos'])
})

// Regla pedida: "al completar DI, surga cuadros" — resuelta por el usuario:
// "cuando cliqueon en el boton 'generar desde prevision'".
test('generar las derivaciones desde la previsión hace surgir Cuadros', () => {
  assert.deepEqual(computeVisibleTabs({ homes: 3, hasDerivations: true, cuadrosStarted: false }), ['cargas', 'lga', 'di', 'interiores', 'administrativos'])
})

// Regla pedida: "al empezar a editar cuadros surga esquema".
test('la primera edición de Cuadros hace surgir Esquema', () => {
  assert.deepEqual(computeVisibleTabs({ homes: 3, hasDerivations: true, cuadrosStarted: true }), TAB_ORDER)
})

// Los datos administrativos son del proyecto: ninguna combinación de cálculo los
// oculta ni los duplica en la lista.
test('Datos administrativos nunca depende del cálculo: está en todas las combinaciones', () => {
  for (const homes of [0, 1, 2, 3, 11]) {
    for (const hasDerivations of [false, true]) {
      for (const cuadrosStarted of [false, true]) {
        const visible = computeVisibleTabs({ homes, hasDerivations, cuadrosStarted })
        assert.equal(visible.filter(tab => tab === 'administrativos').length, 1, `una sola vez con ${homes}/${hasDerivations}/${cuadrosStarted}`)
      }
    }
  }
})

// Casos que la regla de Esquema nombra: sin edición, edición de interior de
// vivienda y circuitos de no-vivienda.
test('cuadrosHasEdits es falso hasta que se edita algo de Cuadros', () => {
  assert.equal(cuadrosHasEdits([]), false)
  assert.equal(cuadrosHasEdits(null), false)
  assert.equal(cuadrosHasEdits([{ id: 'v1', kind: 'dwelling' }]), false)
  assert.equal(cuadrosHasEdits([{ id: 's1', kind: 'garage', interiorCircuits: [] }]), false)
})

test('cuadrosHasEdits se activa con interior de vivienda o circuitos de no-vivienda', () => {
  assert.equal(cuadrosHasEdits([{ id: 'v1', kind: 'dwelling', interior: { circuits: 5 } }]), true)
  assert.equal(cuadrosHasEdits([{ id: 's1', kind: 'garage', interiorCircuits: [{ id: 'c1' }] }]), true)
})

// Comportamiento añadido: si la pestaña activa queda oculta (p. ej. al limpiar el
// proyecto estando en Cuadros), la vista cae a Previsión de cargas.
test('resolveActiveTab conserva una pestaña visible y cae a cargas si queda oculta', () => {
  assert.equal(resolveActiveTab('di', ['cargas', 'di']), 'di')
  assert.equal(resolveActiveTab('esquema', ['cargas']), 'cargas')
})

// Pines de cableado: un refactor no puede perder la feature sin romper este test.
test('la calculadora deriva las pestañas visibles y resuelve la activa', () => {
  assert.match(calc, /from '\.\.\/lib\/tab-visibility\.mjs'/)
  assert.match(calc, /computeVisibleTabs\(\{/)
  assert.match(calc, /cuadrosHasEdits\(derivations\)/)
  assert.match(calc, /resolveActiveTab\(activeTab, visibleTabs\)/)
})

// Pines de marcado: los triggers condicionados conservan su literal (los tests
// existentes de marcado lo exigen) y no se deshabilitan, se omiten.
test('las pestañas condicionadas conservan el trigger literal y nunca se deshabilitan', () => {
  for (const tab of ['lga', 'di', 'interiores', 'esquema']) {
    assert.match(calc, new RegExp(`visibleTabs\\.includes\\('${tab}'\\)`))
    assert.doesNotMatch(calc, new RegExp(`<TabsTrigger value="${tab}" disabled=`))
  }
})

// El orden de barra vive duplicado (componente tipado y módulo puro): este pin
// impide que deriven.
test('el orden de barra es cargas, lga, di, interiores, esquema, administrativos en módulo y componente', () => {
  assert.deepEqual(TAB_ORDER, ['cargas', 'lga', 'di', 'interiores', 'esquema', 'administrativos'])
  assert.match(lib, /\['cargas', 'lga', 'di', 'interiores', 'esquema', 'administrativos'\]/)
  assert.match(calc, /\['cargas', 'lga', 'di', 'interiores', 'esquema', 'administrativos'\]/)
})
