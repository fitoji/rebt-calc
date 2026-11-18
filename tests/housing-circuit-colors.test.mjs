import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')
const panel = read('components/interior-panel.tsx')
const globals = read('app/globals.css')

const families = {
  C1: 'yellow',
  C6: 'yellow',
  C2: 'red',
  C7: 'red',
  C3: 'gray',
  C12: 'gray',
  C4: 'gray-soft',
  C8: 'orange',
  C9: 'sky',
  C10: 'green-soft',
  C11: 'lilac',
  C13: 'green',
}

test('every housing circuit family keeps the requested row tint', () => {
  for (const [id, tint] of Object.entries(families)) {
    assert.match(panel, new RegExp(`${id}: 'bg-circuit-${tint} hover:bg-circuit-${tint}'`), `${id} uses the ${tint} tint`)
  }
})

test('C5 stays untinted: the request never assigned it a family', () => {
  assert.doesNotMatch(panel, /\bC5: 'bg-circuit-/)
})

test('the card table and the normative dialog share the mapping', () => {
  assert.ok((panel.match(/CIRCUIT_ROW_TINT\[circuit\.id\]/g)?.length ?? 0) >= 2, 'the housing rows and their section selects are tinted')
})

test('all nine tints exist in both themes and are exposed as utilities', () => {
  const start = globals.indexOf('.dark {')
  const dark = globals.slice(start, globals.indexOf('\n}', start))

  for (const tint of new Set(Object.values(families))) {
    assert.match(globals, new RegExp(`--circuit-${tint}:`), `--circuit-${tint} declared in :root`)
    assert.match(globals, new RegExp(`--color-circuit-${tint}: var\\(--circuit-${tint}\\)`), `--color-circuit-${tint} aliased in @theme inline`)
    assert.match(dark, new RegExp(`--circuit-${tint}:`), `--circuit-${tint} has a dark value`)
  }
})
