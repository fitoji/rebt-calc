import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')

const notes = [...calc.matchAll(/<SourceNote\b([\s\S]*?)<\/SourceNote>/g)].map(match => match[1])

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
  const shared = readFileSync(path.join(root, 'components/source-note.tsx'), 'utf8')

  assert.match(shared, /https:\/\/www\.boe\.es\/buscar\/act\.php\?id=BOE-A-2002-18099/, 'REBT consolidated text')
  assert.match(shared, /https:\/\/www\.boe\.es\/buscar\/doc\.php\?id=BOE-A-2014-13681/, 'RD 1053/2014 for the EV section')
})

test('source notes can be switched off from the calculation settings', () => {
  assert.equal(
    [...calc.matchAll(/\{settings\.showSourceNotes && <SourceNote\b/g)].length,
    5,
    'every source note is behind the toggle',
  )
  assert.match(calc, /showSourceNotes: true/, 'legends are visible by default')
  assert.match(calc, /<Checkbox checked=\{settings\.showSourceNotes\}/, 'the dialog exposes a checkbox')
  assert.match(calc, /Leyendas en el pie de cada card/, 'the checkbox is labelled in plain language')
  assert.equal(
    [...calc.matchAll(/<SourceNote\b/g)].length,
    [...calc.matchAll(/\{settings\.showSourceNotes && <SourceNote\b/g)].length,
    'no note renders unconditionally',
  )
})

test('the line modules cite their own norm and follow the same toggle', () => {
  const lines = readFileSync(path.join(root, 'components/line-modules.tsx'), 'utf8')
  const notes = [...lines.matchAll(/<SourceNote\b([\s\S]*?)<\/SourceNote>/g)].map(match => match[1])

  assert.equal(notes.length, 2, 'LGA and DI each carry a source note')
  assert.match(notes[0], /ITC-BT-14 §3/, 'LGA cites ITC-BT-14')
  assert.match(notes[0], /0,5 %/, 'LGA cites the centralised-meter limit')
  assert.match(notes[1], /ITC-BT-15 §3/, 'DI cites ITC-BT-15')
  assert.match(notes[1], /0,5 %[\s\S]*1 %[\s\S]*1,5 %/, 'DI cites all three drop limits')
  for (const note of notes) assert.match(note, /BoeLink/, 'each note links to the BOE')

  assert.equal(
    [...lines.matchAll(/\{showSourceNotes && <SourceNote\b/g)].length,
    2,
    'both notes are behind the settings toggle',
  )
  assert.match(lines, /showSourceNotes\?: boolean/, 'the panels accept the toggle as a prop')
})

test('the on-screen note is only the short reference; the detail lives in the hover card', () => {
  const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')
  const lines = readFileSync(path.join(root, 'components/line-modules.tsx'), 'utf8')
  const shared = readFileSync(path.join(root, 'components/source-note.tsx'), 'utf8')

  const labels = ['ITC-BT-10 §2.2 y §3.1', 'ITC-BT-10 §3.2', 'ITC-BT-10 §3.3 y §4.2', 'ITC-BT-10 §3.4', 'ITC-BT-10 §5.2', 'ITC-BT-14 §3', 'ITC-BT-15 §3']
  for (const label of labels) assert.ok(`${calc}\n${lines}`.includes(`label="${label}"`), `short label present: ${label}`)

  assert.match(shared, /<HoverCard>/, 'the note uses the shadcn hover card')
  assert.match(shared, /<HoverCardTrigger/, 'the trigger carries the short reference')
  assert.match(shared, /<HoverCardContent/, 'the full text lives in the popup')
  assert.match(shared, /Fuente: \{label\}/, 'the visible text is Fuente + short label')
  assert.match(shared, /type="button"/, 'the trigger is a real button, so keyboard users get the detail on focus')
})
