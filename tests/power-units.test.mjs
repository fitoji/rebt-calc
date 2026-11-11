import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { displayPower, formatPower, isPowerUnit, powerDigits, storePower } from '../lib/power-units.mjs'

test('the unit of record is always the watt', () => {
  assert.equal(storePower(5.75, 'kW'), 5750, 'a value typed in kW becomes watts')
  assert.equal(storePower(5750, 'W'), 5750, 'a value typed in W stays as it is')
  assert.equal(displayPower(5750, 'kW'), 5.75, 'a stored watt is shown in kW when asked')
  assert.equal(displayPower(5750, 'W'), 5750)
})

test('the round trip does not lose the stored value', () => {
  for (const unit of ['W', 'kW']) {
    assert.equal(storePower(displayPower(9200, unit), unit), 9200, `9 200 W survives ${unit}`)
  }
})

test('only the two supported units are accepted', () => {
  assert.equal(isPowerUnit('W'), true)
  assert.equal(isPowerUnit('kW'), true)
  assert.equal(isPowerUnit('MW'), false)
  assert.equal(isPowerUnit(''), false)
  assert.equal(isPowerUnit(undefined), false)
})

test('each unit has its own decimals', () => {
  assert.equal(powerDigits('W'), 0)
  assert.equal(powerDigits('kW'), 2)
})

test('the formatted power carries the unit the user chose', () => {
  assert.equal(formatPower(5750, 'W'), '5750 W', 'Spanish does not group four digits')
  assert.equal(formatPower(5750, 'kW'), '5,75 kW')
  assert.equal(formatPower(95316, 'W'), '95.316 W')
  assert.equal(formatPower(95316, 'kW'), '95,32 kW')
  assert.equal(formatPower(1234567, 'kW'), '1234,57 kW')
})

test('a missing number never becomes NaN on screen', () => {
  assert.equal(formatPower(undefined, 'kW'), '0,00 kW')
  assert.equal(displayPower(NaN, 'W'), 0)
  assert.equal(storePower(NaN, 'kW'), 0)
})

const calc = readFileSync(new URL('../components/load-calculator.tsx', import.meta.url), 'utf8')
const modules = readFileSync(new URL('../components/line-modules.tsx', import.meta.url), 'utf8')
const explanations = readFileSync(new URL('../lib/calculation-explanations.mjs', import.meta.url), 'utf8')

test('the preference lives in the calculation parameters and defaults to watts', () => {
  assert.match(calc, /powerUnit: 'W' \| 'kW'/, 'the settings type declares the unit')
  assert.match(calc, /powerUnit: 'W',/, 'the default is the watt')
  assert.match(calc, /Unidades de potencia/, 'the dialog offers it')
  assert.match(calc, /isPowerUnit\(parsed\.powerUnit\)/, 'a stored value is validated on read')
})

test('no power of the interface keeps a hardcoded W', () => {
  assert.doesNotMatch(calc, /\$\{fmt\(result\.(total|p[1-5]|average)\)\} W/, 'the summary follows the unit')
  assert.doesNotMatch(calc, /\{fmt\(result\.total\)\} W/, 'the sticky total too')
  assert.doesNotMatch(calc, /suffix="W" onChange/, 'power inputs use the chosen unit')
})

test('the line panels and the didactic steps receive the unit', () => {
  assert.equal((calc.match(/powerUnit=\{powerUnit\}/g) ?? []).length, 6, 'the line panels, the two Cuadros panels and the two documentation groups that declare a power')
  assert.match(modules, /powerUnit\?: 'W' \| 'kW'/, 'the panels accept the unit')
  assert.match(explanations, /formatPower\(state\.powerW, powerUnit\)/, 'the didactic data follows the unit')
  assert.match(explanations, /const unit = settings\.powerUnit \?\? 'W'/, 'the load forecast follows it too')
})

/** Components that show or ask for a power, and therefore own the unit switch. */
const UI_POWER_FILES = [
  'components/documentation-panel.tsx',
  'components/interior-panel.tsx',
  'components/interior-circuits-panel.tsx',
  'components/line-modules.tsx',
  'components/rail-result.tsx',
  'components/load-calculator.tsx',
]

/**
 * The only hardcoded watt left in those files: the selector has to name the unit
 * it offers. Anything else reads it from `powerUnit`.
 */
const WATT_EXCEPTIONS = [
  {
    file: 'components/load-calculator.tsx',
    literal: "'Vatios (W)'",
    reason: 'el selector de unidades nombra la unidad que aplica',
  },
]

/**
 * Unreadout or an input that fixes the unit instead of following the selector.
 *
 * Los vatios que la instrucción publica se quedan como están y no coinciden con
 * ninguno de estos patrones porque no van detrás de un placeholder ni de un
 * encabezado: los mínimos del ITC-BT-10 (3.450 W por abonado, 10.350 W de
 * industria), los escalones de la tabla A de la ITC-BT-25 que cita la nota de
 * P1, las densidades `W/m²`, la conversión `W/CV`, la resistividad `K·m/W` y el
 * umbral de 150 kW del interruptor general de maniobra. Tampoco se vigila el kW
 * suelto: el momento eléctrico va en kW·m y la tabla ITA en kW por prescripción.
 */
const HARDCODED_WATT = [
  { label: "formatPower(…, 'W') fija la unidad", pattern: /formatPower\([^\n]*'W'\)/ },
  { label: 'un template literal pega una W fija', pattern: /`[^`\n]*\} W`/ },
  { label: 'un placeholder va seguido de una W fija', pattern: /\} W(?=[`\s.,<])/ },
  { label: 'una W fija decora el campo', pattern: />W</ },
  { label: 'un encabezado fija la unidad', pattern: /\(W\)/ },
]

test('ningún componente de la interfaz fija el vatio fuera del selector', () => {
  const leaks = []
  for (const file of UI_POWER_FILES) {
    const source = WATT_EXCEPTIONS.filter(entry => entry.file === file)
      .reduce((text, entry) => text.replaceAll(entry.literal, ''), readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))
    for (const { label, pattern } of HARDCODED_WATT) {
      const leak = source.match(pattern)
      if (leak) leaks.push(`${file}: ${label} → ${leak[0]}`)
    }
  }
  assert.deepEqual(leaks, [], 'toda potencia leída o escrita sigue a powerUnit')
})

test('the export keeps the watt as the unit of record', () => {
  assert.match(calc, /inputs: \{ housing, locals, garages, elevators, motors, otherLoads, lighting, installationType, meterCenter, documentation, parking, irveOption, lga, lgaPowerMode, di, derivations \}/, 'the JSON carries the raw inputs in watts')
  assert.match(calc, /momentKwM/, 'the moment stays in kW·m whatever the preference')
})
