import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * WCAG 2.x contrast guard.
 *
 * Reads the real tokens from app/globals.css, converts oklch to sRGB and checks
 * the pairs the interface actually renders. If someone retunes the palette and
 * a pair drops below AA, this fails before the change ships.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8')

function block(start) {
  const from = css.indexOf(start)
  assert.notEqual(from, -1, `${start} block exists`)
  return css.slice(from, css.indexOf('\n}', from))
}

function rawTokens(source) {
  const tokens = new Map()
  for (const match of source.matchAll(/--([a-z0-9-]+):\s*(oklch\([^)]*\)|var\(--[a-z0-9-]+\));/g)) {
    tokens.set(match[1], match[2])
  }
  return tokens
}

function resolve(tokens, name) {
  let value = tokens.get(name)
  assert.ok(value, `--${name} is declared`)
  if (value.startsWith('var(')) value = tokens.get(value.slice(6, -1))
  assert.ok(value && value.startsWith('oklch('), `--${name} resolves to oklch`)
  return value
}

function parseOklch(value) {
  const [l, c, h] = value.slice(6, -1).trim().split(/\s+/)
  const lightness = l.endsWith('%') ? Number.parseFloat(l) / 100 : Number.parseFloat(l)
  return { l: lightness, c: Number.parseFloat(c), h: Number.parseFloat(h ?? '0') }
}

function toSrgb({ l, c, h }) {
  const rad = (h * Math.PI) / 180
  const a = c * Math.cos(rad)
  const b = c * Math.sin(rad)
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const channels = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ]
  return channels.map(channel => {
    const clamped = Math.min(1, Math.max(0, channel))
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055
  })
}

function luminance(value) {
  const [r, g, b] = toSrgb(parseOklch(value)).map(channel =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(fg, bg) {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

const TEXT_PAIRS = [
  ['ink', 'paper'],
  ['ink-soft', 'paper'],
  ['ink-muted', 'paper'],
  ['ink-subtle', 'paper'],
  ['ink-faint', 'paper'],
  ['ink-faint', 'surface-muted'],
  ['ink', 'surface-muted'],
  ['brand', 'paper'],
  ['brand-strong', 'paper'],
  ['brand-ink', 'brand-soft'],
  ['warning-ink', 'warning-soft'],
  ['tab-lga-ink', 'tab-lga-soft'],
  ['tab-di-ink', 'tab-di-soft'],
  ['danger', 'paper'],
  ['note-sand-ink', 'note-sand'],
  ['panel-foreground', 'panel'],
  ['panel-muted', 'panel'],
  ['brand-on-panel', 'panel'],
]

const UI_PAIRS = [
  ['input', 'paper'],
  ['ring', 'paper'],
]

for (const [name, start] of [['light', ':root {'], ['dark', '.dark {']]) {
  const tokens = rawTokens(block(start))

  test(`${name} theme: body text keeps AA contrast`, () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const value = ratio(resolve(tokens, fg), resolve(tokens, bg))
      assert.ok(value >= 4.5, `${name}: ${fg} on ${bg} is ${value.toFixed(2)}:1, needs 4.5:1`)
    }
  })

  test(`${name} theme: field borders and focus ring reach 3:1`, () => {
    for (const [fg, bg] of UI_PAIRS) {
      const value = ratio(resolve(tokens, fg), resolve(tokens, bg))
      assert.ok(value >= 3, `${name}: ${fg} on ${bg} is ${value.toFixed(2)}:1, needs 3:1`)
    }
  })
}

test('faint ink is reserved for decorative marks, never for informative text', () => {
  const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')
  const lines = readFileSync(path.join(root, 'components/line-modules.tsx'), 'utf8')
  const usages = [...`${calc}\n${lines}`.matchAll(/text-ink-ghost[^"`]*/g)].map(match => match[0])

  assert.equal(usages.length, 1, 'only the empty-cell dash may use the faintest ink')
  assert.match(calc, /text-ink-ghost">—<\/span>/, 'and it is the placeholder dash')
})

test('no focus ring is rendered at half opacity', () => {
  const files = ['button', 'input', 'select', 'checkbox', 'radio-group', 'tabs', 'field']
  for (const file of files) {
    const source = readFileSync(path.join(root, `components/ui/${file}.tsx`), 'utf8')
    assert.doesNotMatch(source, /ring-ring\/\d+/, `${file} keeps a full-strength focus ring`)
  }
})

test('every editable table control carries a programmatic name', () => {
  const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')
  const expected = [
    'aria-label={`Superficie (m²) · ${row.name}`}',
    'aria-label={`Previsión real (W) · ${row.name}`}',
    'aria-label={`Potencia · ${row.name}`}',
    'aria-label={`Descripción · Ascensor ${i + 1}`}',
    'aria-label={`Descripción · Motor ${i + 1}`}',
    'aria-label={`Descripción · Carga ${i + 1}`}',
    'aria-label={`Potencia (W) · Vivienda ${i + 1}`}',
    'aria-label={`Viviendas (uds.) · Vivienda ${i + 1}`}',
    'aria-label={`Potencia directa (W) · ${LIGHTING_LABELS[row.id]}`}',
    'label={`Tipo · ${row.name}`}',
    'label={`Ventilación · ${row.name}`}',
    'label={`Tipo ITA · ${row.name}`}',
    'label={`Unidad · ${row.name}`}',
    'label={`Electrificación · Vivienda ${i + 1}`}',
    'label={`Tipo de lámpara · ${LIGHTING_LABELS[row.id]}`}',
  ]

  for (const snippet of expected) {
    assert.ok(calc.includes(snippet), `table control labelled: ${snippet}`)
  }
  assert.match(calc, /aria-label=\{label\}/, 'ChoiceSelect forwards the label to its trigger')
  assert.match(calc, /\{header\}<\/span>/, 'the visual column label stays for sighted users')
})
