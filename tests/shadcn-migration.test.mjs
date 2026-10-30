import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const calc = read('components/load-calculator.tsx')
const globals = read('app/globals.css')

const occurrences = (text, pattern) => text.match(pattern)?.length ?? 0

test('calculator imports shadcn primitives from components/ui', () => {
  for (const name of ['button', 'dialog', 'field', 'input', 'radio-group', 'select', 'table']) {
    assert.ok(calc.includes(`@/components/ui/${name}`), `imports @/components/ui/${name}`)
  }
  for (const name of ['button', 'dialog', 'field', 'input', 'label', 'radio-group', 'select', 'separator', 'table']) {
    assert.ok(existsSync(path.join(root, 'components/ui', `${name}.tsx`)), `${name}.tsx installed`)
  }
})

test('hand-rolled dialog scaffolding replaced by shadcn Dialog', () => {
  assert.doesNotMatch(calc, /role="dialog"/, 'no hand-rolled dialog roles')
  assert.doesNotMatch(calc, /role="presentation"/, 'no hand-rolled overlay backdrops')
  assert.doesNotMatch(calc, /useDialogFocus/, 'focus and Escape handled by Base UI')
  assert.doesNotMatch(calc, /DialogRef|TriggerRef/, 'manual dialog refs removed')
  assert.equal(occurrences(calc, /<Dialog open=/g), 6, 'six Dialog roots')
  assert.equal(occurrences(calc, /<DialogTitle/g), 6, 'DialogTitle per dialog')
  assert.equal(occurrences(calc, /<DialogDescription/g), 6, 'DialogDescription per dialog')
  assert.equal(occurrences(calc, /showCloseButton=\{false\}/g), 6, 'custom close buttons per dialog')
  assert.ok(occurrences(calc, /aria-label="Cerrar/g) >= 5, 'close buttons keep Spanish labels')
})

test('native controls migrated to shadcn components', () => {
  assert.doesNotMatch(calc, /className="field/, 'legacy .field class usage gone')
  assert.doesNotMatch(calc, /action-primary|action-secondary|icon-button/, 'legacy action classes gone')
  assert.doesNotMatch(calc, /<input[\s>]/, 'no native inputs remain')
  assert.doesNotMatch(calc, /<select[\s>]/, 'no native selects remain')
  assert.doesNotMatch(calc, /<table[\s>]/, 'no native tables remain')
  assert.equal(occurrences(calc, /<button[\s>]/g), 2, 'only the two card trigger buttons stay native')
  assert.ok(occurrences(calc, /<Button[\s>]/g) >= 30, 'shadcn Button used for every other button')
  assert.ok(occurrences(calc, /<Table[ >]/g) >= 5, 'shadcn tables used throughout')
  assert.ok(calc.includes('function ChoiceSelect'), 'ChoiceSelect helper defined')
  assert.ok(occurrences(calc, /<ChoiceSelect[ >]/g) >= 6, 'six ChoiceSelect usages')
  assert.doesNotMatch(calc, /function Input\(/, 'local Input renamed to avoid the shadcn collision')
  assert.ok(calc.includes('function LabeledInput'), 'LabeledInput helper present')
})

test('IRVE radios use FieldSet and RadioGroup with label association', () => {
  assert.ok(calc.includes('<FieldSet>'), 'FieldSet wraps the radio group')
  assert.ok(calc.includes('<FieldLegend'), 'FieldLegend replaces the bare label')
  assert.ok(calc.includes('<RadioGroup '), 'RadioGroup controls irveOption')
  assert.ok(calc.includes('<RadioGroupItem'), 'RadioGroupItem renders each option')
  assert.ok(calc.includes('htmlFor={`irve-'), 'FieldLabel points at each radio id')
  assert.ok(calc.includes('onClick={() => setIrveOption(i + 1)}'), 'explicit click keeps selection working')
})

test('globals keep .label but drop migrated helper classes', () => {
  assert.match(globals, /\.label\s*\{/, '.label stays for dt labels')
  assert.doesNotMatch(globals, /\.field\s*\{/, '.field removed')
  assert.doesNotMatch(globals, /\.action-primary\s*\{/, '.action-primary removed')
  assert.doesNotMatch(globals, /\.action-secondary\s*\{/, '.action-secondary removed')
})
