import assert from 'node:assert/strict'
import test from 'node:test'
import { explainLineCalculation } from '../lib/calculation-explanations.mjs'
import { sizeLine } from '../lib/line-sizing.mjs'

const lgaInput = overrides => ({
  system: 'three-phase',
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  gamma: 44,
  variant: { method: 'B1', loadedConductors: 3, insulation: 'PVC' },
  ...overrides,
})

const diInput = overrides => ({
  system: 'single-phase',
  powerW: 9200,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  gamma: 48.5,
  variant: { method: 'B1', loadedConductors: 2, insulation: 'PVC' },
  ...overrides,
})

const lgaState = overrides => ({
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  gamma: 44,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 35,
  peSection: 35,
  controlSection: 1.5,
  tubeDiameter: 140,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
  ...overrides,
})

const diState = overrides => ({
  powerW: 9200,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  gamma: 48.5,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 16,
  peSection: 16,
  controlSection: 1.5,
  tubeDiameter: 40,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
  ...overrides,
})

test('sizeLine exposes the candidate trace without changing the result', () => {
  const result = sizeLine(lgaInput())
  assert.equal(result.finalSection, 70, 'the chosen section is unchanged')
  assert.ok(Array.isArray(result.candidates) && result.candidates.length > 0, 'candidates are returned')

  const chosen = result.candidates.find(candidate => candidate.section === 70)
  assert.equal(chosen.meetsMinimum, true)
  assert.equal(chosen.meetsDrop, true)
  assert.equal(chosen.meetsCurrent, true)

  const belowDrop = result.candidates.find(candidate => candidate.section === 50)
  assert.equal(belowDrop.meetsDrop, false, '50 mm2 does not reach the drop requirement')
  assert.equal(result.minimumSection, 10, 'the normative minimum is reported')
})

test('the explanation lists every step and keeps the engine result', () => {
  const result = sizeLine(lgaInput())
  const explanation = explainLineCalculation(lgaState(), result, { system: 'three-phase', line: 'lga' })

  assert.deepEqual(explanation.steps.map(step => step.id), [
    'inputs', 'current', 'drop', 'thermal', 'selection', 'protection', 'reference',
  ])

  const current = explanation.steps.find(step => step.id === 'current')
  assert.equal(current.formula, 'I_b = P / (√3 · U · cos φ)')
  assert.equal(current.result, '108,25 A', 'the explanation repeats the engine current')

  const drop = explanation.steps.find(step => step.id === 'drop')
  assert.equal(drop.result, '53,27 mm²', 'the explanation repeats the engine drop section')

  const selection = explanation.steps.find(step => step.id === 'selection')
  assert.equal(selection.result, '70 mm²', 'the explanation repeats the chosen section')
})

test('the selection step explains why lower sections are discarded', () => {
  const result = sizeLine(lgaInput())
  const explanation = explainLineCalculation(lgaState(), result, { system: 'three-phase', line: 'lga' })
  const selection = explanation.steps.find(step => step.id === 'selection')

  const fifty = selection.rows.find(row => row.section === 50)
  assert.equal(fifty.status, 'discarded')
  assert.match(fifty.reason, /caída/i, 'the drop criterion is named')

  const seventy = selection.rows.find(row => row.section === 70)
  assert.equal(seventy.status, 'chosen')
  assert.match(seventy.reason, /Cumple/, 'the chosen section explains its three criteria')
})

test('the selection step names the current criterion when it is the limiting one', () => {
  const result = sizeLine(diInput({ circuits: 3 }))
  const explanation = explainLineCalculation(diState({ circuits: 3 }), result, { system: 'single-phase', line: 'di' })
  const selection = explanation.steps.find(step => step.id === 'selection')

  const ten = selection.rows.find(row => row.section === 10)
  assert.equal(ten.status, 'discarded')
  assert.match(ten.reason, /intensidad corregida/i, 'the current criterion is named')
})

test('the explanation formats values from the result instead of recalculating them', () => {
  const result = sizeLine(lgaInput())
  const fake = { ...result, ratedCurrent: 999, sectionByDrop: 123.45, finalSection: 95 }
  const explanation = explainLineCalculation(lgaState(), fake, { system: 'three-phase', line: 'lga' })

  const current = explanation.steps.find(step => step.id === 'current')
  const drop = explanation.steps.find(step => step.id === 'drop')
  const selection = explanation.steps.find(step => step.id === 'selection')

  assert.equal(current.result, '999,00 A')
  assert.equal(drop.result, '123,45 mm²')
  assert.equal(selection.result, '95 mm²')
})

test('warnings from the engine become their own step', () => {
  const result = sizeLine(lgaInput({ powerW: 5_000_000, maxDropPercent: 0.1 }))
  const explanation = explainLineCalculation(lgaState({ powerW: 5_000_000, maxDropPercent: 0.1 }), result, { system: 'three-phase', line: 'lga' })
  const warnings = explanation.steps.find(step => step.id === 'warnings')

  assert.ok(warnings, 'a warnings step is present')
  assert.deepEqual(warnings.items, result.problems, 'the warnings are the engine problems, not a copy')
})

test('the DI explanation cites ITC-BT-15 and uses the single-phase formula', () => {
  const result = sizeLine(diInput())
  const explanation = explainLineCalculation(diState(), result, { system: 'single-phase', line: 'di' })

  const current = explanation.steps.find(step => step.id === 'current')
  assert.equal(current.formula, 'I_b = P / (U · cos φ)')

  const reference = explanation.steps.find(step => step.id === 'reference')
  assert.match(reference.text, /ITC-BT-15/)
})
