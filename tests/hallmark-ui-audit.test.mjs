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

test('shadcn button component is installed and referenced', () => {
  assert.ok(existsSync(path.join(root, 'components/ui/button.tsx')), 'button.tsx installed')
  assert.match(calc, /from '@\/components\/ui\/button'/, 'calculator imports Button')
})

test('no pure-white surfaces remain in tokens or markup', () => {
  assert.ok(!globals.includes('--background: oklch(1 0 0)'), 'background token tinted')
  assert.ok(!globals.includes('--card: oklch(1 0 0)'), 'card token tinted')
  assert.ok(!globals.includes('--popover: oklch(1 0 0)'), 'popover token tinted')
  assert.match(globals, /--color-paper:/, 'paper theme token exists')
  assert.doesNotMatch(allSource, /bg-white(?!\/)/, 'no plain bg-white surfaces (overlay bg-white/ allowed)')
})

test('shared controls use scoped transition properties', () => {
  const ownSource = sourceFiles
    .filter(file => !file.startsWith('components/ui/'))
    .map(read)
    .join('\n')
  assert.doesNotMatch(ownSource, /transition-all/, 'transition-all banned from own source (vendored shadcn exempt)')
  assert.match(calc, /transition-colors/, 'interactive controls keep scoped transitions')
})

test('numeric readouts use tabular figures while form fields stay out of scope', () => {
  assert.ok(calc.includes('mt-1 font-bold tabular-nums'), 'Metric values use tabular figures')
  assert.ok(calc.includes('text-4xl font-bold tabular-nums'), 'results total uses tabular figures')
  assert.ok(calc.includes('font-semibold tabular-nums'), 'result rows use tabular figures')
  assert.ok(calc.includes('px-4 py-3 text-right tabular-nums'), 'ITA desktop cells use tabular figures')
  assert.doesNotMatch(globals, /\.field\s*\{[^}]*tabular-nums/, 'form fields deliberately out of scope')
})

test('section numbers read as eyebrows and housing metrics live inside the card', () => {
  assert.ok(calc.includes('block text-xs font-bold tracking-wide text-brand-strong'), 'number renders as eyebrow')
  assert.doesNotMatch(calc, /mb-5 flex gap-3/, 'left-of-heading number tag removed')
  const firstSectionTitle = calc.indexOf('number="01"')
  assert.ok(firstSectionTitle > 0, 'section 01 present')
  const section01Close = calc.indexOf('</section>', firstSectionTitle)
  assert.ok(calc.indexOf('<Metric label="Total viviendas"') > 0, 'metrics cluster present')
  assert.ok(calc.indexOf('<Metric label="Total viviendas"') < section01Close, 'metrics cluster inside the Viviendas card')
  assert.ok(calc.indexOf('<Metric label="P1 · Viviendas"') < section01Close, 'P1 metric stays with its controls')
})

test('the project letterhead preview shows the uploaded logo without stretching it', () => {
  assert.match(calc, /\{\(projectInfo\.logo \|\| projectInfo\.companyName\) && <div/, 'preview only renders when there is something to show')
  assert.match(calc, /projectInfo\.logo && <span className="flex h-10 max-w-\[140px\]/, 'logo sits in a fixed-height chip that caps wide logos')
  assert.match(calc, /alt=\{`Logo de \$\{projectInfo\.companyName \|\| 'la empresa'\}`\}/, 'logo has a descriptive alt')
  assert.match(calc, /max-h-full w-auto max-w-\[132px\] object-contain/, 'logo keeps its aspect ratio')
  assert.match(calc, /Membrete del PDF/, 'preview is labelled as the PDF letterhead')
})
