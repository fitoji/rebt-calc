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

test('each mode carries its own theme', () => {
  const css = read('app/globals.css')
  const calc = read('components/load-calculator.tsx')

  assert.match(css, /html\[data-explanation-mode="didactic"\]/, 'didactic mode scopes its tokens')
  assert.match(css, /--background: #f7f9f3/, 'didactic mode uses the Soft Pop light background')
  assert.match(css, /--accent: #f59e0b/, 'didactic mode uses the Soft Pop amber accent')
  assert.match(css, /--font-sans: var\(--font-dm-sans\)/, 'didactic mode uses the Soft Pop sans stack')
  assert.match(css, /html\.dark\[data-explanation-mode="didactic"\]/, 'didactic mode has a dark variant')
  assert.match(css, /--background: #000000/, 'the dark variant uses the Soft Pop dark background')
  assert.match(css, /--radius: 1rem/, 'didactic mode uses the Soft Pop radius')
  assert.match(css, /html\[data-explanation-mode="calculation"\]/, 'calculation mode scopes its radius')
  assert.match(css, /--radius: 0\.75rem/, 'calculation mode uses the Darkmatter radius')
  assert.match(css, /--primary: #d87943/, 'calculation mode uses the Darkmatter light primary')
  assert.match(css, /html\.dark\[data-explanation-mode="calculation"\]/, 'calculation mode has a dark variant')
  assert.match(css, /--primary: #e78a53/, 'the dark variant uses the Darkmatter dark primary')
  assert.match(css, /--font-sans: var\(--font-geist-mono\)/, 'calculation mode uses the Darkmatter mono stack')
  assert.match(calc, /data-explanation-mode=\{explanationMode\}/, 'the main element exposes the active mode')
  assert.match(calc, /document\.documentElement\.dataset\.explanationMode/, 'the document root carries the mode for portals')
})

test('the mode fonts load through next/font', () => {
  const layout = read('app/layout.tsx')
  assert.ok(layout.includes('Geist_Mono'), 'Geist Mono is imported')
  assert.ok(layout.includes('JetBrains_Mono'), 'JetBrains Mono is imported')
  assert.ok(layout.includes('DM_Sans'), 'DM Sans is imported')
  assert.ok(layout.includes('Space_Mono'), 'Space Mono is imported')
  assert.ok(layout.includes('--font-geist-mono'), 'the Geist Mono variable is exposed')
  assert.ok(layout.includes('--font-jetbrains-mono'), 'the JetBrains Mono variable is exposed')
  assert.ok(layout.includes('--font-dm-sans'), 'the DM Sans variable is exposed')
  assert.ok(layout.includes('--font-space-mono'), 'the Space Mono variable is exposed')
})

test('the PDF report carries the same explanation steps', () => {
  const calc = read('components/load-calculator.tsx')
  assert.ok(calc.includes('explainLineCalculation'), 'the PDF consumes the explanation module')
  assert.ok(calc.includes('addExplanationPage('), 'the PDF has an explanation page helper')
  assert.ok(calc.includes("'6.1 Desarrollo del cálculo · LGA'"), 'LGA explanation page is added')
  assert.ok(calc.includes("'7.1 Desarrollo del cálculo · DI'"), 'DI explanation page is added')
})
