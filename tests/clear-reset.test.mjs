import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultLineState } from '../lib/line-state.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const calc = read('components/load-calculator.tsx')
const lineState = read('lib/line-state.mjs')

const clearBody = (() => {
  const start = calc.indexOf('const clear = () => {')
  if (start < 0) throw new Error('clear() not found in load-calculator.tsx')
  const closing = calc.indexOf('\n  }', start)
  return calc.slice(start, closing)
})()

test('clear() restores the shared default line states, not a hand-rolled copy', () => {
  assert.match(lineState, /export function defaultLineState\(/, 'lib/line-state.mjs exports defaultLineState')
  assert.match(calc, /import \{[^}]*\bdefaultLineState\b[^}]*\} from '\.\.\/lib\/line-state\.mjs'/, 'calculator imports the defaults instead of inlining them')
  assert.match(calc, /useState<LineState>\(defaultLineState\('lga'\)\)/, 'the initial LGA state is the shared default')
  assert.match(calc, /useState<LineState>\(defaultLineState\('di'\)\)/, 'the initial DI state is the shared default')
  assert.match(clearBody, /setLga\(defaultLineState\('lga'\)\)/, 'clear restores the LGA default')
  assert.match(clearBody, /setDi\(defaultLineState\('di'\)\)/, 'clear restores the DI default')
})

test('clear() stops persisting the cleared line inputs across a reload', () => {
  assert.match(clearBody, /setLineTouched\(false\)/, 'the lines leave the snapshot or the old inputs survive a reload')
})

test('clear() drops every stale selection left by the emptied data', () => {
  for (const setter of ['setSelectedDerivationId', 'setSelectedDwellingId', 'setSelectedSupplyId']) {
    assert.match(clearBody, new RegExp(`${setter}\\(null\\)`), `${setter} resets with the cleared data`)
  }
})

test('the defaults match the values the app shipped with', () => {
  assert.deepEqual(defaultLineState('lga'), {
    powerW: 75000, voltageV: 400, cosPhi: 1, lengthM: 25, maxDropPercent: 0.5,
    method: 'B1', insulation: 'XLPE', circuits: 1, protectionA: 0,
    neutralSection: 35, peSection: 35, controlSection: 1.5, tubeDiameter: 140,
    installation: 'air', layout: 'embedded', layers: 1, tubes: 1, sectionOverride: 0,
  })
  assert.deepEqual(defaultLineState('di'), {
    powerW: 9200, voltageV: 230, cosPhi: 1, lengthM: 20, maxDropPercent: 1,
    method: 'B1', insulation: 'PVC', circuits: 1, protectionA: 0,
    neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 40,
    installation: 'air', layout: 'embedded', layers: 1, tubes: 1, sectionOverride: 0,
  })
})
