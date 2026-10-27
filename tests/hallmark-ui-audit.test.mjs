import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const globals = read('app/globals.css')
const calc = read('components/load-calculator.tsx')

const sourceFiles = ['app', 'components', 'lib']
  .flatMap(dir => readdirSync(path.join(root, dir), { recursive: true })
    .map(entry => path.join(dir, entry)))
  .filter(file => /\.(ts|tsx|css|mjs)$/.test(file) && existsSync(path.join(root, file)))
const allSource = sourceFiles.map(read).join('\n')

test('mobile tables keep desktop tables and clip root overflow', () => {
  assert.ok(calc.includes('grid gap-3 md:hidden'), 'mobile card layouts present')
  assert.ok(calc.includes('hidden overflow-x-auto md:block'), 'desktop tables kept for md and up')
  assert.match(globals, /html,\s*body\s*{\s*overflow-x: clip;/, 'root clips horizontal overflow')
  assert.ok(calc.includes('min-w-[620px]'), 'housing desktop min-width preserved')
  assert.ok(calc.includes('min-w-[580px]'), 'editable desktop min-width preserved')
})

test('unused button component stays removed and unreferenced', () => {
  assert.ok(!existsSync(path.join(root, 'components/ui/button.tsx')), 'button.tsx deleted')
  assert.doesNotMatch(allSource, /ui\/button|@base-ui\/react\/button/, 'no references remain')
})

test('no pure-white surfaces remain in tokens or markup', () => {
  assert.ok(!globals.includes('--background: oklch(1 0 0)'), 'background token tinted')
  assert.ok(!globals.includes('--card: oklch(1 0 0)'), 'card token tinted')
  assert.ok(!globals.includes('--popover: oklch(1 0 0)'), 'popover token tinted')
  assert.match(globals, /--color-paper:/, 'paper theme token exists')
  assert.doesNotMatch(allSource, /bg-white(?!\/)/, 'no plain bg-white surfaces (overlay bg-white/ allowed)')
})

test('shared controls use scoped transition properties', () => {
  assert.doesNotMatch(allSource, /transition-all/, 'transition-all gone from source')
  assert.match(globals, /transition-\[background-color,border-color,box-shadow\]/, 'scoped transition set in place')
})

test('numeric readouts use tabular figures while form fields stay out of scope', () => {
  assert.ok(calc.includes('mt-1 font-bold tabular-nums'), 'Metric values use tabular figures')
  assert.ok(calc.includes('text-4xl font-bold tabular-nums'), 'results total uses tabular figures')
  assert.ok(calc.includes('font-semibold tabular-nums'), 'result rows use tabular figures')
  assert.ok(calc.includes('px-4 py-3 text-right tabular-nums'), 'ITA desktop cells use tabular figures')
  assert.doesNotMatch(globals, /\.field\s*\{[^}]*tabular-nums/, 'form fields deliberately out of scope')
})

test('section numbers read as eyebrows and housing metrics sit outside the card', () => {
  assert.ok(calc.includes('block text-xs font-bold tracking-wide text-cyan-600'), 'number renders as eyebrow')
  assert.doesNotMatch(calc, /mb-5 flex gap-3/, 'left-of-heading number tag removed')
  const firstSectionTitle = calc.indexOf('number="01"')
  assert.ok(firstSectionTitle > 0, 'section 01 present')
  const section01Close = calc.indexOf('</section>', firstSectionTitle)
  assert.ok(calc.indexOf('<Metric label="Total viviendas"') > section01Close, 'metrics cluster after section close')
  assert.ok(calc.indexOf('<Metric label="P1 · Viviendas"') < section01Close, 'P1 metric stays with its controls')
})
