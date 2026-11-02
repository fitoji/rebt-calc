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

test('hover emphasis is its own token, not a paler copy of the resting state', () => {
  const button = read('components/ui/button.tsx')

  for (const token of ['primary-hover', 'control-hover', 'control-hover-line']) {
    assert.match(globals, new RegExp(`--${token}:`), `--${token} declared`)
    assert.match(globals, new RegExp(`--color-${token}: var\\(--${token}\\)`), `--color-${token} aliased in @theme inline`)
  }

  // El hover deja de ser `muted` (un gris casi igual al papel) y pasa a un velo
  // de tinta con el doble de paso, más el borde densificado.
  assert.ok(button.includes('hover:bg-control-hover'), 'ghost and outline hover with the ink veil')
  assert.ok(button.includes('hover:border-control-hover-line'), 'outline buttons define their edge on hover')
  assert.ok(button.includes('hover:bg-primary-hover'), 'the brand fill steps away from its own text')
  assert.doesNotMatch(button, /hover:bg-muted|hover:bg-primary\/\d+/, 'no hover returns to muted or a transparent fill')
  assert.match(globals, /\.tab-trigger:hover\s*\{[^}]*background: var\(--control-hover\)/, 'tabs speak the same hover language')
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

test('the tab bar keeps each module accent and moves the active state, not just its colour', () => {
  const calc = read('components/load-calculator.tsx')

  // Cada módulo conserva su acento en el punto que lo identifica.
  for (const token of ['brand-mark', 'tab-lga', 'tab-di']) {
    assert.ok(calc.includes(`tab-dot size-1.5 shrink-0 rounded-full bg-${token}`), `tab dot uses ${token}`)
  }

  // La barra reasigna el acento del indicador según el módulo activo.
  for (const [tab, token] of [['lga', 'tab-lga'], ['di', 'tab-di']]) {
    assert.match(
      globals,
      new RegExp(`\\.tab-bar\\[data-active-tab='${tab}'\\]\\s*\\{[^}]*--tab-accent: var\\(--${token}\\)`),
      `${tab} repaints the indicator with ${token}`,
    )
  }
  assert.match(globals, /\.tab-bar\s*\{[^}]*--tab-accent: var\(--brand-mark\)/, 'cargas is the default accent')

  // El estado activo es una forma que viaja: posición y tamaño, no solo color (1.4.1).
  assert.match(globals, /\.tab-indicator\s*\{[^}]*translate: var\(--active-tab-left\) var\(--active-tab-top\)/, 'indicator follows Base UI tab position')
  assert.match(globals, /\.tab-indicator\s*\{[^}]*transition:/, 'the indicator animates between modules')
  assert.ok(calc.includes('<TabsIndicator />'), 'the tab bar renders the sliding indicator')
  assert.doesNotMatch(calc, /w-\[3px\]/, 'the static left spine is gone')

  // Sin movimiento pedido por el sistema sigue habiendo estado visible.
  assert.match(globals, /@media \(prefers-reduced-motion: reduce\)/, 'motion has a reduced path')
})

test('shape and relief are named by role, and each mode sets its own', () => {
  const calc = read('components/load-calculator.tsx')
  const modules = read('components/line-modules.tsx')

  // Los nombres están declarados y expuestos como utilidad `rounded-*`.
  for (const token of ['tab-radius', 'tab-track-radius', 'control-radius', 'card-radius', 'panel-radius']) {
    assert.match(globals, new RegExp(`--${token}:`), `--${token} declared`)
  }
  for (const [alias, raw] of [['tab', 'tab-radius'], ['tab-track', 'tab-track-radius'], ['control', 'control-radius'], ['card', 'card-radius'], ['panel', 'panel-radius']]) {
    assert.match(globals, new RegExp(`--radius-${alias}: var\\(--${raw}\\)`), `rounded-${alias} exposed`)
  }
  for (const token of ['shadow-ink', 'rim']) {
    assert.match(globals, new RegExp(`--${token}:`), `--${token} declared for the relief system`)
  }

  // Ninguna pieza vuelve a un tamaño suelto: el radio dice qué es, no cuánto mide.
  for (const file of [calc, modules]) {
    assert.doesNotMatch(file, /rounded-(?:xl|2xl|3xl)\b/, 'surfaces use rounded-card / rounded-panel')
    assert.doesNotMatch(file, /shadow-(?:sm|xl|2xl)\b/, 'surfaces use shadow-card / shadow-panel')
  }
  assert.ok(calc.includes('rounded-tab'), 'the tab bar uses the short tab radius')
  assert.ok(calc.includes('rounded-card'), 'cards use the card radius')

  // Los campos de entrada comparten el radio de control.
  for (const file of ['input', 'select', 'button']) {
    assert.match(read(`components/ui/${file}.tsx`), /rounded-control/, `${file} uses the control radius`)
  }
  assert.match(read('components/ui/input.tsx'), /shadow-control/, 'text fields are seated, not floating')

  // El relieve cambia de física por modo: cálculo talla un borde de contacto sin
  // desenfoque (base :root), didáctico separa con una sombra difusa.
  const block = start => {
    const from = globals.indexOf(start)
    assert.notEqual(from, -1, `${start} block exists`)
    return globals.slice(from, globals.indexOf('\n}', from))
  }
  const base = block(':root {')
  const didactic = block('html[data-explanation-mode="didactic"] {')
  const calculation = block('html[data-explanation-mode="calculation"] {')

  assert.match(didactic, /--tab-radius: 6px/, 'didactic tabs stay soft but short')
  assert.match(didactic, /--card-lift:\s*\n\s*0 1px 2px /, 'didactic lifts with a blurred shadow')
  assert.match(calculation, /--tab-radius: 4px/, 'calculation tabs are nearly square')
  assert.match(base, /--card-lift:\s*\n\s*0 1px 0 /, 'calculation cuts a zero-blur contact edge')
  assert.match(base, /--control-lift:[\s\S]*inset 0 1px 2px/, 'calculation seats its fields')
})

test('no semantic token name is truncated', () => {
  // Un sufijo numérico pegado a un token (`bg-brand-soft5`, `text-ink-muted200`)
  // no lo detecta el guard de paleta cruda: no es un color de Tailwind, es un
  // token mal escrito que resuelve en silencio a nada.
  const truncated = /\b(?:bg|text|border(?:-[lrtb])?|ring|divide|from|to|via|fill|stroke|shadow)-(?:surface|line|ink|brand|panel|tab|paper|accent)[a-z-]*-\d{1,3}\b/
  for (const file of appFiles) {
    assert.doesNotMatch(read(file), truncated, `${file} referencia un token truncado`)
  }
})
