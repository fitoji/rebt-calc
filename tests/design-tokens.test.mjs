import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const globals = read('app/globals.css')
const appFiles = ['components/load-calculator.tsx', 'components/line-modules.tsx', 'app/globals.css']

const rawPalette = /\b(?:bg|text|border(?:-[lrtb])?|ring|divide|from|to|via|fill|stroke|shadow)-(?:slate|cyan|emerald|violet|amber|red|white|black)(?:-\d{2,3})?(?:\/\d{1,3})?\b/
const arbitraryColor = /\b(?:bg|text|border|ring)-\[](?:#|rgb|hsl|oklch)/

test('no component reaches for the raw Tailwind palette', () => {
  for (const file of appFiles) {
    const source = read(file)
    assert.doesNotMatch(source, rawPalette, `${file} usa solo tokens semánticos`)
    assert.doesNotMatch(source, arbitraryColor, `${file} no declara colores arbitrarios`)
  }
})

test('every semantic token is declared in :root and exposed as a utility', () => {
  const groups = [
    ['surface-page', 'surface-muted'],
    ['line', 'line-soft'],
    ['ink', 'ink-strong', 'ink-soft', 'ink-muted', 'ink-subtle', 'ink-faint', 'ink-ghost'],
    ['brand', 'brand-strong', 'brand-ink', 'brand-soft', 'brand-line', 'brand-mark', 'brand-on-panel'],
    ['panel', 'panel-foreground', 'panel-muted', 'panel-line', 'panel-edge'],
    ['warning-soft', 'warning-ink', 'warning-mark', 'warning-on-panel', 'danger'],
    ['tab-lga', 'tab-lga-soft', 'tab-lga-ink', 'tab-di', 'tab-di-soft', 'tab-di-ink'],
  ].flat()

  for (const token of groups) {
    assert.match(globals, new RegExp(`--${token}:`), `--${token} declared in :root`)
    assert.match(globals, new RegExp(`--color-${token}: var\\(--${token}\\)`), `--color-${token} aliased in @theme inline`)
  }
})

test('the PDF keeps its colours in one module because jsPDF cannot read CSS', () => {
  const pdfTheme = read('lib/pdf-theme.mjs')
  const calc = read('components/load-calculator.tsx')

  assert.match(pdfTheme, /export const PDF_COLORS/, 'PDF palette is exported')
  assert.doesNotMatch(calc, /set(?:Fill|Text|Draw)Color\(\d/, 'no numeric colour literals left in the PDF builder')
  assert.match(calc, /PDF_COLORS\./, 'the PDF builder consumes the palette')
})

test('Tailwind does not scan the archived app or the skills documentation', () => {
  assert.match(globals, /@source not "\.\.\/conversion-de-planilla-a-web"/, 'archived app excluded')
  assert.match(globals, /@source not "\.\.\/\.agents"/, 'skills docs excluded')
})

test('the tab edges keep their accent colour after the token migration', () => {
  const calc = read('components/load-calculator.tsx')

  for (const token of ['brand-mark', 'tab-lga', 'tab-di']) {
    assert.ok(calc.includes(`absolute inset-y-1 left-0 w-[3px] rounded-r-full group-data-[active]/tab:inset-y-0 bg-${token}/40`), `edge base colour uses ${token}`)
    assert.ok(calc.includes('group-data-[active]/tab:inset-y-0'), 'the active tab changes shape, not only colour (1.4.1)')
    assert.ok(calc.includes(`group-data-[active]/tab:bg-${token}`), `edge active colour uses ${token}`)
  }
  assert.doesNotMatch(calc, /-soft\d/, 'no token name was truncated while renaming')
})
