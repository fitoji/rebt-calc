import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { INSTALLATION_SCENARIOS, limitsForInstallation, mismatchesLimit } from '../lib/installation-config.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')
const calc = read('components/load-calculator.tsx')
const lines = read('components/line-modules.tsx')

test('each enlace scenario carries the limits of its own ITC', () => {
  assert.deepEqual(limitsForInstallation('centralized'), { lga: 0.5, di: 1 }, 'totalmente centralizados: 0,5 % LGA + 1 % DI')
  assert.deepEqual(limitsForInstallation('partial'), { lga: 1, di: 0.5 }, 'más de un lugar: 1 % LGA + 0,5 % DI')
  assert.deepEqual(limitsForInstallation('single-user'), { lga: null, di: 1.5 }, 'único usuario: sin LGA y 1,5 % DI')
})

test('the scenario list is complete and unique', () => {
  assert.equal(INSTALLATION_SCENARIOS.length, 3, 'three regulated arrangements')
  assert.equal(new Set(INSTALLATION_SCENARIOS.map(scenario => scenario.id)).size, 3, 'ids are unique')
  for (const scenario of INSTALLATION_SCENARIOS) {
    assert.ok(scenario.label.length > 10, `${scenario.id} has a readable label`)
    assert.ok(scenario.di > 0, `${scenario.id} sets a DI limit`)
  }
})

test('unknown scenarios fail loudly instead of defaulting', () => {
  assert.throws(() => limitsForInstallation('invented'), RangeError)
})

test('a configured limit that drifts from the scenario is flagged', () => {
  assert.equal(mismatchesLimit(1, 1), false, 'matching limit')
  assert.equal(mismatchesLimit(1, 1.5), true, 'edited limit differs')
  assert.equal(mismatchesLimit(null, 1.5), false, 'no LGA means nothing to compare')
})

test('the calculator applies the scenario to both lines', () => {
  assert.match(calc, /limitsForInstallation\(type\)/, 'the handler reads the scenario limits')
  assert.match(calc, /setLga\(current => \(\{ \.\.\.current, maxDropPercent: limits\.lga as number \}\)\)/, 'LGA limit follows the scenario')
  assert.match(calc, /setDi\(current => \(\{ \.\.\.current, maxDropPercent: limits\.di \}\)\)/, 'DI limit follows the scenario')
  assert.match(calc, /maxDropPercent: 1,/, 'DI starts at the centralised-meter limit')
})

test('the LGA tab is disabled when the scenario has no line', () => {
  assert.match(calc, /disabled=\{installationType === 'single-user'\}/, 'the tab follows the scenario')
  assert.match(calc, /no tiene línea general de alimentación/, 'the disabled tab explains why')
  assert.match(calc, /setActiveTab\(current => current === 'lga' \? 'di' : current\)/, 'an open LGA tab moves away when it disappears')
})

test('the scenario select shows Spanish labels, not internal ids', () => {
  assert.match(lines, /INSTALLATION_SCENARIOS\.find\(scenario => scenario\.id === selected\)\?\.label/, 'the trigger maps ids to labels')
  assert.doesNotMatch(lines, /<SelectValue \/>/, 'no bare SelectValue that would print the raw id')
  assert.match(lines, /<label htmlFor="installation-type"/, 'the visible label is a real label')
  assert.match(lines, /<SelectTrigger id="installation-type"/, 'the trigger is associated with that label')
})
