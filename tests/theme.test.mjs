import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isTheme, nextTheme, resolveInitialTheme, THEME_STORAGE_KEY, toggleLabel } from '../lib/theme.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')
const calc = read('components/load-calculator.tsx')
const layout = read('app/layout.tsx')
const globals = read('app/globals.css')

test('theme helpers only accept the two real modes', () => {
  assert.equal(isTheme('dark'), true)
  assert.equal(isTheme('light'), true)
  assert.equal(isTheme('system'), false)
  assert.equal(isTheme(null), false)
  assert.equal(nextTheme('dark'), 'light')
  assert.equal(nextTheme('light'), 'dark')
})

test('an unknown or unreadable preference falls back to light', () => {
  assert.equal(resolveInitialTheme(null), 'light')
  assert.equal(resolveInitialTheme(undefined), 'light')
  assert.equal(resolveInitialTheme('sepia'), 'light')
  assert.equal(resolveInitialTheme('dark'), 'dark')
})

test('the toggle label describes the action, not the state', () => {
  assert.equal(toggleLabel('light'), 'Cambiar a modo noche')
  assert.equal(toggleLabel('dark'), 'Cambiar a modo día')
})

test('the header carries the toggle and it writes the choice', () => {
  assert.match(calc, /<Button type="button" variant="ghost" size="icon" aria-label=\{toggleLabel\(theme\)\}/, 'an icon button labelled by the helper')
  assert.match(calc, /document\.documentElement\.classList\.toggle\('dark', next === 'dark'\)/, 'the class is applied on the document')
  assert.match(calc, /localStorage\.setItem\(THEME_STORAGE_KEY, next\)/, 'the choice is remembered')
  assert.match(calc, new RegExp(`THEME_STORAGE_KEY`), 'the storage key comes from the shared module')
})

test('a stored dark theme is applied before the first paint', () => {
  assert.match(layout, /localStorage\.getItem\('electrocalc-theme'\)==='dark'/, 'the boot script reads the stored theme')
  assert.match(layout, /classList\.add\('dark'\)/, 'and applies the class before hydration')
  assert.equal(THEME_STORAGE_KEY, 'electrocalc-theme', 'script and module share the key')
})

test('the dark theme overrides every semantic token', () => {
  const start = globals.indexOf('.dark {')
  const dark = globals.slice(start, globals.indexOf('\n}', start))
  const tokens = [
    'paper', 'surface-page', 'surface-muted', 'line', 'line-soft',
    'ink', 'ink-strong', 'ink-soft', 'ink-muted', 'ink-subtle', 'ink-faint', 'ink-ghost',
    'brand', 'brand-strong', 'brand-ink', 'brand-soft', 'brand-line', 'brand-mark', 'brand-on-panel',
    'panel', 'panel-foreground', 'panel-muted', 'panel-line', 'panel-edge',
    'warning-soft', 'warning-ink', 'warning-mark', 'warning-on-panel', 'danger',
    'note-sand', 'note-sand-ink',
    'tab-lga', 'tab-lga-soft', 'tab-lga-ink', 'tab-di', 'tab-di-soft', 'tab-di-ink',
  ]

  for (const token of tokens) {
    assert.match(dark, new RegExp(`--${token}:`), `--${token} has a dark value`)
  }
})

test('nothing flips with the operating system', () => {
  assert.doesNotMatch(globals, /@media\s*\(prefers-color-scheme:\s*dark\)/, 'no OS-driven flip: the class opt-in is the only switch')
  assert.match(globals, /\.dark \{\s*color-scheme: dark/, 'native controls follow the class')
})
