import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')
const count = (text, re) => text.match(re)?.length ?? 0

const calc = read('components/load-calculator.tsx')
const dialog = read('components/ui/dialog.tsx')
const button = read('components/ui/button.tsx')
const globals = read('app/globals.css')

test('S-dialog: all 6 calculator dialogs are controlled Base UI Dialog roots', () => {
  const roots = calc.match(/<Dialog\s+open=\{[^}]+\}\s+onOpenChange=\{[^}]+\}>/g) ?? []
  assert.equal(roots.length, 6, 'six <Dialog open= onOpenChange=> roots')
  assert.equal(count(calc, /<DialogContent\b/g), 6, 'one DialogContent per dialog')
  assert.equal(count(calc, /<DialogTitle\b/g), 6, 'DialogTitle per dialog (accessible name)')
  assert.equal(count(calc, /<DialogDescription\b/g), 6, 'DialogDescription per dialog')
})

test('S-dialog: every dialog ships a custom DialogClose with a Spanish aria-label', () => {
  const closes = calc.match(/<DialogClose\b[^>]*>/g) ?? []
  assert.equal(closes.length, 6, 'one custom close button per dialog')
  for (const close of closes) {
    assert.match(close, /aria-label="Cerrar [^"]+"/, `close button keeps a Spanish aria-label: ${close.slice(0, 80)}`)
  }
  assert.equal(count(calc, /showCloseButton=\{false\}/g), 6, 'default English close button disabled on every dialog')
})

test('S-dialog: no hand-rolled dialog scaffolding survives', () => {
  for (const leftover of [/useDialogFocus/, /role="dialog"/, /role="presentation"/,
    /DialogRef/, /TriggerRef/, /useRef\(/, /getFocusableElements/, /handleKeyDown/, /aria-modal/]) {
    assert.doesNotMatch(calc, leftover, `leftover removed: ${leftover}`)
  }
})

test('S-dialog: dialog primitive still traps focus, closes on Escape and sets initial focus', () => {
  assert.match(dialog, /from "@base-ui\/react\/dialog"/, 'Base UI dialog primitive')
  assert.match(dialog, /<DialogPortal>\s*<DialogOverlay\s*\/>/, 'content is portalled with an overlay')
  assert.doesNotMatch(dialog, /modal\s*=/, 'no modal opt-out that would disable the focus trap')
  assert.doesNotMatch(dialog, /initialFocus\s*=\s*\{?\s*(false|null|undefined)/, 'initial focus not disabled')
  assert.doesNotMatch(dialog, /onKeyDown|onEscapeKeyDown|preventDefault/, 'no key-event swallowing wrapper')
  assert.match(dialog, /function DialogClose[\s\S]*DialogPrimitive\.Close/, 'DialogClose is the primitive')
})

test('S-button: every py-3 full-width action button cancels the base h-8', () => {
  assert.match(button, /default:\s*"h-8 /, 'base size still declares h-8 (so h-auto is required)')
  const buttons = calc.match(/<Button\b[^>]*>/g) ?? []
  const action = buttons.filter(tag => /w-full/.test(tag) && /py-3/.test(tag))
  assert.equal(action.length, 14, 'fourteen full-width multiline action buttons')
  for (const tag of action) {
    assert.match(tag, /\bh-auto\b/, `action button needs h-auto so h-8 cannot squeeze py-3: ${tag.slice(0, 90)}`)
  }
  const fullWidth = buttons.filter(tag => /w-full/.test(tag))
  for (const tag of fullWidth) {
    assert.match(tag, /\bh-auto\b/, `every w-full button keeps h-auto: ${tag.slice(0, 90)}`)
  }
})

test('S-select: ChoiceSelect tolerates a null onValueChange payload', () => {
  assert.ok(calc.includes('onValueChange={next => onChange(next == null ? value : String(next))}'),
    'null-safe String() wrapper keeps typed values intact')
  assert.match(calc, /function SelectTrigger|SelectTrigger id=\{id\}/, 'trigger still accepts an id for label association')
})

test('S-label: IRVE radios keep htmlFor <-> id association', () => {
  assert.match(calc, /htmlFor=\{`irve-\$\{i \+ 1\}`\}/, 'FieldLabel points at the radio id')
  assert.match(calc, /<RadioGroupItem id=\{`irve-\$\{i \+ 1\}`\} value=\{i \+ 1\}/, 'RadioGroupItem renders the matching id')
  assert.equal(count(calc, /<RadioGroupItem\b/g), 1, 'one RadioGroupItem template renders all three options')
  assert.equal(count(calc, /<FieldLabel\b/g), 1, 'one FieldLabel template per option')
})

test('S-label: LabeledInput and SettingInput keep implicit label association', () => {
  for (const helper of ['LabeledInput', 'SettingInput']) {
    const body = calc.match(new RegExp(`function ${helper}\\([^]*?\\n`))?.[0] ?? ''
    assert.match(body, /<label>/, `${helper} wraps its control in a <label>`)
    assert.match(body, /<Input\b/, `${helper} renders the shadcn Input inside that label`)
  }
})

test('S-css: legacy helper classes are gone and nothing still references them', () => {
  assert.match(globals, /\.label\s*\{/, '.label kept for dt/label typography')
  for (const gone of ['.field', '.action-primary', '.action-secondary']) {
    assert.doesNotMatch(globals, new RegExp(`\\${gone}\\s*\\{`), `${gone} removed from globals`)
  }
  const own = ['app/page.tsx', 'app/layout.tsx', 'components/load-calculator.tsx']
    .filter(f => { try { read(f); return true } catch { return false } })
    .map(read).join('\n')
  assert.doesNotMatch(own, /className="field[\s"]|action-primary|action-secondary/, 'no orphaned class references')
  const legacyLabelUses = count(calc, /className="label"/g)
  assert.ok(legacyLabelUses >= 13, `.label still used by the migrated markup (${legacyLabelUses} sites)`)
})

test('S-theme: the OS color scheme never flips the app by itself', () => {
  assert.doesNotMatch(globals, /@media\s*\(prefers-color-scheme:\s*dark\)/,
    'no OS-driven dark token flip: the explicit .dark class is the only switch')
  assert.match(globals, /\.dark\s*\{/, '.dark block drives the opt-in night mode')
})
