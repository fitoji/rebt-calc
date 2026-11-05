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

test('the LGA tab stays open and explains the single-user scenario', () => {
  assert.doesNotMatch(calc, /<TabsTrigger value="lga" disabled=/, 'the tab is never disabled: the card lives there')
  assert.match(calc, /Único usuario sin línea general\./, 'the panel explains why there is no LGA')
  assert.match(calc, /installationType === 'single-user'\s*\? <p/, 'the notice replaces the LGA panel in that scenario')
  assert.match(calc, /<MeterCenterCard/, 'the meter card is always reachable')
})

test('the scenario is shown as derived from the meter centre, not as a second selector', () => {
  assert.match(lines, /Se deriva de la centralización de contadores/, 'the field names where the scenario comes from')
  assert.match(lines, /INSTALLATION_SCENARIOS\.find\(scenario => scenario\.id === value\)\?\.label/, 'the field maps ids to Spanish labels')
  assert.doesNotMatch(lines, /id="installation-type"/, 'the old scenario selector is gone')
  assert.match(calc, /<MeterCenterCard/, 'the meter centre card is the source of the scenario')
})
