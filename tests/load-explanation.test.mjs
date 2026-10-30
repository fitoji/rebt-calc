import assert from 'node:assert/strict'
import test from 'node:test'
import { explainLoadForecast } from '../lib/calculation-explanations.mjs'
import { getSimultaneityCoefficient } from '../lib/simultaneity.mjs'

const settings = {
  basicHousingPower: 5750,
  elevatedHousingPower: 9200,
  localPowerPerM2: 100,
  industrialPowerPerM2: 125,
  minimumSupplyPower: 3450,
  industrialMinimumSupplyPower: 10350,
  forcedGaragePowerPerM2: 20,
  naturalGaragePowerPerM2: 10,
  elevatorCoefficient: 1.3,
  motorCoefficient: 1.25,
  evChargerPower: 3680,
  cvToWatts: 735.5,
  portalLightPowerPerM2: 15,
  portalLightLedPowerPerM2: 8,
  stairLightPowerPerM2: 7,
  stairLightLedPowerPerM2: 4,
  dischargeLampCoefficient: 1.8,
  showSourceNotes: true,
}

const baseState = overrides => ({
  housing: [{ level: 'Básica', power: 5750, homes: 10 }],
  locals: [],
  garages: [],
  elevators: [],
  motors: [],
  otherLoads: [],
  lighting: [],
  parking: 30,
  irveOption: 1,
  ...overrides,
})

const baseResult = overrides => {
  const homes = 10
  const housingPower = 57500
  const average = housingPower / homes
  const cs = getSimultaneityCoefficient(homes)
  const p1 = average * cs
  const p5 = 30 * settings.evChargerPower
  return {
    homes,
    housingPower,
    average,
    cs,
    p1,
    p2: 0,
    p3: 0,
    p4: 0,
    p5,
    total: p1 + p5,
    plazas: 30,
    lightingPower: 0,
    motorIncrement: 0,
    elevatorPower: 0,
    motorPower: 0,
    largestMotorPower: 0,
    otherPower: 0,
    localPowers: [],
    garagePowers: [],
    irveCs: 1,
    ...overrides,
  }
}

test('the load explanation lists the five forecasts and the total', () => {
  const explanation = explainLoadForecast(baseState(), baseResult(), settings)

  assert.deepEqual(explanation.steps.map(step => step.id), [
    'housing', 'p1', 'p2', 'locals-rows', 'p3', 'garages-rows', 'p4', 'p5', 'total', 'reference',
  ])

  const p1 = explanation.steps.find(step => step.id === 'p1')
  assert.equal(p1.result, '48.875 W', 'P1 repeats the engine result')

  const p5 = explanation.steps.find(step => step.id === 'p5')
  assert.equal(p5.result, '110.400 W', 'P5 repeats the engine result')

  const total = explanation.steps.find(step => step.id === 'total')
  assert.equal(total.result, '159.275 W', 'the total repeats the engine result')
})

test('the services step explains elevators, motors and the largest-motor increment', () => {
  const result = baseResult({
    elevatorPower: 3680,
    motorPower: 3000,
    largestMotorPower: 3000,
    motorIncrement: 750,
    otherPower: 500,
    lightingPower: 1000,
    p2: 3680 * 1.3 + 3000 + 750 + 500 + 1000,
  })
  const explanation = explainLoadForecast(baseState(), result, settings)
  const p2 = explanation.steps.find(step => step.id === 'p2')

  assert.match(p2.formula, /P_motor_mayor/)
  assert.match(p2.substitution, /Incremento motor mayor/)
  assert.match(p2.note, /ITC-BT-47/)
})

test('the locals and garages steps list each row and sum the engine values', () => {
  const state = baseState({
    locals: [{ name: 'Local 1', type: 'Comercial/oficina', area: 20, real: 0 }],
    garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 100 }],
  })
  const result = baseResult({ localPowers: [3450], garagePowers: [2000], p3: 3450, p4: 2000 })
  const explanation = explainLoadForecast(state, result, settings)

  const locals = explanation.steps.find(step => step.id === 'locals-rows')
  assert.equal(locals.rows[0].label, 'Local 1')
  assert.equal(locals.rows[0].value, '3450 W')

  const p3 = explanation.steps.find(step => step.id === 'p3')
  assert.equal(p3.result, '3450 W')

  const garages = explanation.steps.find(step => step.id === 'garages-rows')
  assert.equal(garages.rows[0].value, '2000 W')

  const p4 = explanation.steps.find(step => step.id === 'p4')
  assert.equal(p4.result, '2000 W')
})

test('the IRVE step follows the chosen simultaneity option', () => {
  const withSpl = explainLoadForecast(baseState({ irveOption: 2 }), baseResult({ plazas: 4, p5: 4 * 3680 * 0.3, irveCs: 0.3 }), settings)
  const p5Spl = withSpl.steps.find(step => step.id === 'p5')
  assert.match(p5Spl.formula, /0,3/)
  assert.equal(p5Spl.result, '4416 W')

  const minimum = explainLoadForecast(baseState({ irveOption: 3, parking: 30 }), baseResult({ plazas: 3, p5: 3 * 3680, irveCs: 1 }), settings)
  const p5Minimum = minimum.steps.find(step => step.id === 'p5')
  assert.match(p5Minimum.note, /10 %/)
})

test('the load explanation formats the result instead of recalculating it', () => {
  const result = baseResult({ p1: 999, p3: 1234, p4: 5678, p5: 4321, total: 999 + 1234 + 5678 + 4321 })
  const explanation = explainLoadForecast(baseState(), result, settings)

  assert.equal(explanation.steps.find(step => step.id === 'p1').result, '999 W')
  assert.equal(explanation.steps.find(step => step.id === 'p3').result, '1234 W')
  assert.equal(explanation.steps.find(step => step.id === 'p4').result, '5678 W')
  assert.equal(explanation.steps.find(step => step.id === 'p5').result, '4321 W')
  assert.equal(explanation.steps.find(step => step.id === 'total').result, '12.232 W')
})
