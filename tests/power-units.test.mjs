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
  assert.equal((calc.match(/powerUnit=\{powerUnit\}/g) ?? []).length, 2, 'both line panels')
  assert.match(modules, /powerUnit\?: 'W' \| 'kW'/, 'the panels accept the unit')
  assert.match(explanations, /formatPower\(state\.powerW, powerUnit\)/, 'the didactic data follows the unit')
  assert.match(explanations, /const unit = settings\.powerUnit \?\? 'W'/, 'the load forecast follows it too')
})

test('the export keeps the watt as the unit of record', () => {
  assert.match(calc, /inputs: \{ housing, locals, garages, elevators, motors, otherLoads, lighting, installationType, meterCenter, documentation, parking, irveOption, lga, lgaPowerMode, di, derivations \}/, 'the JSON carries the raw inputs in watts')
  assert.match(calc, /momentKwM/, 'the moment stays in kW·m whatever the preference')
})
