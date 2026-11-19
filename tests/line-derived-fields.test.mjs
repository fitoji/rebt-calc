import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { lineInputFromState, nominalVoltageFor } from '../lib/line-state.mjs'
import { sizeLine } from '../lib/line-sizing.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const state = overrides => ({
  powerW: 9200, voltageV: 230, cosPhi: 1, lengthM: 20, maxDropPercent: 1,
  method: 'B1', insulation: 'PVC', circuits: 1, protectionA: 0,
  neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 40,
  installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
  ...overrides,
})

test('la tensión sale del sistema, no del valor guardado', () => {
  assert.equal(nominalVoltageFor('single-phase'), 230)
  assert.equal(nominalVoltageFor('three-phase'), 400)

  const di = lineInputFromState(state({ voltageV: 380 }), 'single-phase', 'di')
  assert.equal(di.voltageV, 230, 'una monofásica no puede dimensionar a 380 V')

  const lga = lineInputFromState(state({ voltageV: 230 }), 'three-phase', 'lga')
  assert.equal(lga.voltageV, 400, 'una trifásica no puede dimensionar a 230 V')
})

test('el resultado declara la tensión con la que dimensionó', () => {
  const input = lineInputFromState(state(), 'single-phase', 'di')
  const result = sizeLine(input)
  assert.equal(result.voltageV, 230, 'el motor informa la tensión aplicada')
  assert.equal(result.ratedCurrent, 40, 'Ib = 9200 / 230')
})

test('el panel muestra la tensión como dato, no como input', () => {
  const modules = read('components/line-modules.tsx')
  assert.match(modules, /function VoltageField\(/, 'hay un campo de tensión derivado')
  assert.ok(modules.includes('<VoltageField id="lga-voltage" label="Tensión entre fases" system="three-phase" />'), 'la LGA usa la tensión del sistema')
  assert.ok(modules.includes('<VoltageField id="di-voltage"'), 'la DI usa la tensión del sistema')
  assert.doesNotMatch(modules, /<NumberField id="lga-voltage"/, 'la LGA ya no ofrece un número libre')
  assert.doesNotMatch(modules, /<NumberField id="di-voltage"/, 'la DI ya no ofrece un número libre')
  assert.match(modules, /Red de distribución 230\/400 V/, 'el panel explica de dónde sale')
})

test('la potencia de una DI generada se muestra como dato de la previsión', () => {
  const modules = read('components/line-modules.tsx')
  const calc = read('components/load-calculator.tsx')

  assert.match(modules, /function PowerFromForecastField\(/, 'hay un campo de potencia de solo lectura')
  assert.match(modules, /Origen: previsión de cargas/, 'el dato declara su origen')
  assert.match(modules, /Editar en Previsión/, 'ofrece el acceso a la pestaña que la edita')
  assert.match(modules, /powerReadOnly\s*\?/, 'el panel decide entre dato e input')
  assert.match(calc, /powerReadOnly=\{selectedDerivation != null && selectedDerivation\.sourceKey != null\}/, 'solo las derivaciones generadas lo usan')
  assert.match(calc, /onEditPower=\{\(\) => changeTab\('cargas'\)\}/, 'el botón lleva a Previsión')
})
