import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { lineInputFromState, nominalVoltageFor } from '../lib/line-state.mjs'
import { sizeLine } from '../lib/line-sizing.mjs'
import { INSTALLATION_SCENARIOS } from '../lib/installation-config.mjs'

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

test('la tensión no ocupa un campo: se lee en la cabecera', () => {
  const modules = read('components/line-modules.tsx')
  assert.doesNotMatch(modules, /VoltageField/, 'no hay campo de tensión')
  assert.doesNotMatch(modules, /id="lga-voltage"/, 'la LGA no tiene campo de tensión')
  assert.doesNotMatch(modules, /id="di-voltage"/, 'la DI no tiene campo de tensión')
  assert.match(modules, /Trifásica · 400 V/, 'la LGA declara la tensión en la cabecera')
  assert.match(modules, /· \{nominalVoltageFor\(system\)\} V/, 'la DI declara la tensión de su sistema')
})

test('la LGA esconde la potencia hasta que se edita a mano', () => {
  const modules = read('components/line-modules.tsx')
  assert.match(modules, /powerMode === 'manual' &&/, 'la potencia aparece sólo en modo manual')
  assert.ok(modules.includes('id="lga-power"'), 'el campo sigue existiendo para el modo manual')
  assert.match(modules, /Potencia automática desde la previsión/, 'el valor automático se lee en la banda')
})

test('la caída se elige entre los valores de la instrucción y marca la recomendada', () => {
  const di = INSTALLATION_SCENARIOS.map(scenario => scenario.di).sort((a, b) => a - b)
  assert.deepEqual(di, [0.5, 1, 1.5], 'ITC-BT-15 sólo publica 0,5, 1 y 1,5 %')
  const lga = INSTALLATION_SCENARIOS.map(scenario => scenario.lga).filter(value => value != null).sort((a, b) => a - b)
  assert.deepEqual(lga, [0.5, 1], 'ITC-BT-14 sólo publica 0,5 y 1 %')

  const modules = read('components/line-modules.tsx')
  const select = read('components/line-drop-select.tsx')
  assert.match(modules, /function dropOptions\(/, 'las opciones salen del supuesto de enlace')
  assert.match(modules, /INSTALLATION_SCENARIOS/, 'los valores salen del registro normativo')
  assert.match(modules, /valor del proyecto/, 'un valor viejo se conserva como opción')
  assert.ok(modules.includes('<DropField id="lga-drop" role="lga"'), 'la LGA usa el desplegable')
  assert.ok(modules.includes('<DropField id="di-drop" role="di"'), 'la DI usa el desplegable')
  assert.doesNotMatch(modules, /<NumberField id="(lga|di)-drop"/, 'no queda un número libre')

  assert.match(select, /from '@ui-sdk\/react\/select'/, 'usa el Select de UI SDK, como Cuadros')
  assert.match(select, /SelectItemIndicator/, 'el ítem seleccionado lleva su check')
  assert.match(select, /Recomendada/, 'el valor del supuesto se marca como recomendado')
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
