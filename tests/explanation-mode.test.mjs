import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  explanationModeLabel,
  nextExplanationMode,
  resolveExplanationMode,
} from '../lib/explanation-mode.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

test('the explanation mode only accepts the two real values', () => {
  assert.equal(resolveExplanationMode('didactic'), 'didactic')
  assert.equal(resolveExplanationMode('calculation'), 'calculation')
  assert.equal(resolveExplanationMode('other'), 'calculation', 'unknown values fall back to the compact mode')
  assert.equal(resolveExplanationMode(null), 'calculation')
})

test('the explanation mode toggles between the two values', () => {
  assert.equal(nextExplanationMode('calculation'), 'didactic')
  assert.equal(nextExplanationMode('didactic'), 'calculation')
})

test('the switch labels are stable and readable', () => {
  assert.equal(explanationModeLabel('calculation'), 'Cálculo')
  assert.equal(explanationModeLabel('didactic'), 'Didáctico')
})

test('the header carries the switch and persists the choice', () => {
  const calc = read('components/load-calculator.tsx')
  assert.ok(calc.includes('aria-label="Activar modo didáctico"'), 'the switch is labelled')
  assert.ok(calc.includes('explanationModeLabel(explanationMode)'), 'the active mode text is shown')
  assert.ok(calc.includes('onCheckedChange={checked => changeExplanationMode'), 'the switch changes the mode')
  assert.ok(calc.includes('EXPLANATION_MODE_STORAGE_KEY'), 'the choice is persisted')
  assert.ok(calc.includes('explanationMode={explanationMode}'), 'the panels receive the chosen mode')
})

test('the didactic mode renders the shared explanation steps', () => {
  const modules = read('components/line-modules.tsx')
  assert.ok(modules.includes('explainLineCalculation'), 'the explanation module is consumed')
  assert.ok(modules.includes("explanationMode === 'didactic'"), 'the didactic mode is conditional')
  assert.ok(modules.includes('<CalculationSteps steps={explanation.steps'), 'the shared steps render')
})

test('each mode carries its own subtle UI treatment', () => {
  const css = read('app/globals.css')
  const calc = read('components/load-calculator.tsx')

  assert.match(css, /main\[data-explanation-mode="didactic"\]/, 'didactic mode scopes its tokens')
  assert.match(css, /--input: oklch\(0\.922 0 0\)/, 'didactic mode restores the soft field border')
  assert.match(css, /--ring: oklch\(0\.708 0 0\)/, 'didactic mode restores the soft focus ring')
  assert.match(css, /main\[data-explanation-mode="calculation"\]/, 'calculation mode scopes its radius')
  assert.match(css, /--radius: 0\.375rem/, 'calculation mode uses less curved cards')
  assert.match(calc, /data-explanation-mode=\{explanationMode\}/, 'the main element exposes the active mode')
})
