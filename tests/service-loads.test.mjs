import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ITA_POWER_KW, itaPowerW, largestMotorIncrement, sumServiceGeneralPowers } from '../lib/service-loads.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')

const settings = { elevatorCoefficient: 1.3, motorCoefficient: 1.25 }

test('only the largest motor adds the increment', () => {
  assert.equal(largestMotorIncrement([1000, 4000, 736], 1.25), 1000, '25 % of the largest motor only')
  assert.equal(largestMotorIncrement([2000], 1.5), 1000, 'edited coefficient applies to the largest motor')
  assert.equal(largestMotorIncrement([], 1.25), 0, 'no motors add nothing')
  assert.equal(largestMotorIncrement([0], 1.25), 0, 'a zero motor adds nothing')
  assert.equal(largestMotorIncrement([2000], 1), 0, 'coefficient 1 adds no increment')
})

test('P2 keeps motors and other loads at nominal power', () => {
  assert.equal(
    sumServiceGeneralPowers({ elevatorPower: 3680, motorPowers: [735.5], otherPower: 0, lightingPower: 2700 }, settings),
    8403.375,
    'reference example: 3680 x 1,3 + 735,5 + 183,875 + 2700',
  )
  assert.equal(
    sumServiceGeneralPowers({ elevatorPower: 0, motorPowers: [1000, 4000], otherPower: 0, lightingPower: 0 }, settings),
    6000,
    'two motors: nominal sum plus 25 % of the largest, not of both',
  )
  assert.equal(
    sumServiceGeneralPowers({ elevatorPower: 0, motorPowers: [], otherPower: 1000, lightingPower: 0 }, settings),
    1000,
    'other loads carry no coefficient',
  )
  assert.equal(
    sumServiceGeneralPowers({ elevatorPower: 0, motorPowers: [], otherPower: 0, lightingPower: 1440 }, settings),
    1440,
    'lighting arrives already resolved and is added once',
  )
})

test('P2 ignores missing or negative values', () => {
  assert.equal(
    sumServiceGeneralPowers({ elevatorPower: 0, motorPowers: [0, 0], otherPower: -500, lightingPower: 0 }, settings),
    0,
    'negative other loads do not reduce the subtotal',
  )
})

test('the calculator assembles P2 through the shared helpers', () => {
  assert.match(calc, /sumServiceGeneralPowers\(/, 'P2 uses the shared service sum')
  assert.match(calc, /largestMotorIncrement\(/, 'the motor increment is rendered through the shared helper')
  assert.doesNotMatch(calc, /otherLoadCoefficient/, 'other loads no longer carry a coefficient')
  assert.doesNotMatch(calc, /motorPower \* settings\.motorCoefficient/, 'the motor coefficient is not applied to every motor')
})

test('ITA reference powers match the ITC-BT-10 table', () => {
  assert.equal(ITA_POWER_KW['ITA-1'], 4.5)
  assert.equal(ITA_POWER_KW['ITA-6'], 46)
  assert.equal(itaPowerW('ITA-1'), 4500, 'ITA-1 preloads 4.500 W')
  assert.equal(itaPowerW('ITA-3'), 11500, 'ITA-3 preloads 11.500 W')
  assert.equal(itaPowerW('unknown'), 0, 'unknown ITA has no power')
})

test('the elevator ITA select preloads the reference power and exposes a real-power field', () => {
  assert.match(calc, /itaPowerW\(value as ElevatorRow\['ita'\]\)/, 'ITA change preloads its reference power')
  assert.match(calc, /Potencia ITA/, 'the table shows the ITA reference column')
  assert.match(calc, /Potencia real/, 'the table shows the real-power field')
  assert.match(calc, /aria-label=\{`Potencia real · \$\{row.name\}`\}/, 'the real-power input is labelled')
})
