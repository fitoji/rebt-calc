import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')

const notes = [...calc.matchAll(/<SourceNote>([\s\S]*?)<\/SourceNote>/g)].map(match => match[1])

test('every load card documents its regulatory source', () => {
  assert.equal(notes.length, 5, 'the five previsión cards carry a source note')
  for (const note of notes) {
    assert.match(note, /ITC-BT-10 §/, 'each note cites the ITC-BT-10 section')
    assert.match(note, /BoeLink/, 'each note links to the BOE')
  }
})

test('source notes cite the verified sections', () => {
  const [housing, services, premises, garages, irve] = notes
  assert.match(housing, /§2\.2/, 'dwelling powers come from ITC-BT-10 §2.2')
  assert.match(housing, /§3\.1/, 'simultaneity comes from ITC-BT-10 §3.1')
  assert.match(services, /§3\.2/, 'services come from ITC-BT-10 §3.2')
  assert.match(premises, /§3\.3/, 'commercial premises come from ITC-BT-10 §3.3')
  assert.match(premises, /§4\.2/, 'industry concentration comes from ITC-BT-10 §4.2')
  assert.match(garages, /§3\.4/, 'garages come from ITC-BT-10 §3.4')
  assert.match(irve, /§5\.2/, 'EV charging comes from ITC-BT-10 §5.2')
})

test('BOE links point to the consolidated regulation', () => {
  assert.match(calc, /https:\/\/www\.boe\.es\/buscar\/act\.php\?id=BOE-A-2002-18099/, 'REBT consolidated text')
  assert.match(calc, /https:\/\/www\.boe\.es\/buscar\/doc\.php\?id=BOE-A-2014-13681/, 'RD 1053/2014 for the EV section')
})

test('source notes can be switched off from the calculation settings', () => {
  assert.equal(
    [...calc.matchAll(/\{settings\.showSourceNotes && <SourceNote>/g)].length,
    5,
    'every source note is behind the toggle',
  )
  assert.match(calc, /showSourceNotes: true/, 'legends are visible by default')
  assert.match(calc, /<Checkbox checked=\{settings\.showSourceNotes\}/, 'the dialog exposes a checkbox')
  assert.match(calc, /Leyendas en el pie de cada card/, 'the checkbox is labelled in plain language')
  assert.equal(
    [...calc.matchAll(/<SourceNote>/g)].length,
    [...calc.matchAll(/\{settings\.showSourceNotes && <SourceNote>/g)].length,
    'no note renders unconditionally',
  )
})
