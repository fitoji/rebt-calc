import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BASIC_CIRCUIT_IDS,
  ELEVATED_CIRCUIT_IDS,
  HOUSING_CIRCUIT_MAX_DROP,
  housingCircuitSizing,
  housingCircuitsFor,
  housingGradeFor,
  sectionForDrop,
} from '../lib/housing-circuits.mjs'
import { HOUSING_CIRCUITS, HOUSING_CIRCUIT_SOURCE, HOUSING_DERIVED_CIRCUITS } from '../lib/normative-tables.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

test('the cited table 1 registry distinguishes published and derived circuits', () => {
  assert.match(HOUSING_CIRCUIT_SOURCE, /ITC-BT-25 §3, tabla 1/)
  assert.deepEqual(Object.keys(HOUSING_CIRCUITS), ['C1', 'C2', 'C3', 'C4', 'C5', 'C8', 'C9', 'C10', 'C11', 'C13'])
  assert.deepEqual(HOUSING_DERIVED_CIRCUITS.C6, { base: 'C1', name: 'Adicional de iluminación (C1)' })
  assert.equal(HOUSING_CIRCUITS.C4.section, 4)
})

test('the grade follows the power step of the dwelling', () => {
  assert.equal(housingGradeFor(5750), 'basic')
  assert.equal(housingGradeFor(7360), 'basic')
  assert.equal(housingGradeFor(9200), 'elevated')
  assert.equal(housingGradeFor(11500), 'elevated')
  assert.equal(housingGradeFor(14490), 'elevated')
  assert.equal(housingGradeFor(1000), 'basic', 'an unknown step falls back to the minimum')
})

test('the basic grade lists the five mandatory circuits', () => {
  const circuits = housingCircuitsFor(5750)
  assert.deepEqual(circuits.map(circuit => circuit.id), BASIC_CIRCUIT_IDS)
  assert.equal(circuits.length, 5)
  assert.equal(circuits.some(circuit => circuit.id === 'C13'), false, 'C13 needs the EV case')

  const c1 = circuits[0]
  assert.deepEqual(
    { power: c1.powerPerPointW, fs: c1.fs, fu: c1.fu, breaker: c1.breakerA, max: c1.maxPoints, section: c1.section, tube: c1.tube },
    { power: 200, fs: 0.75, fu: 0.5, breaker: 10, max: 30, section: 1.5, tube: 16 },
  )
  assert.equal(circuits[2].section, 6, 'C3 cocina y horno uses 6 mm²')
})

test('the elevated grade adds the additional circuits', () => {
  const circuits = housingCircuitsFor(9200)
  assert.deepEqual(circuits.map(circuit => circuit.id), ELEVATED_CIRCUIT_IDS)
  assert.equal(circuits.length, 12)

  const c6 = circuits.find(circuit => circuit.id === 'C6')
  const c7 = circuits.find(circuit => circuit.id === 'C7')
  const c12 = circuits.find(circuit => circuit.id === 'C12')
  assert.equal(c6.section, 1.5, 'C6 repeats C1')
  assert.equal(c7.section, 2.5, 'C7 repeats C2')
  assert.equal(c12.section, null, 'C12 depends on the base circuit it expands')
  assert.match(c12.note, /circuito base/)

  const c8 = circuits.find(circuit => circuit.id === 'C8')
  assert.equal(c8.breakerA, 25)
  assert.equal(c8.section, 6)
  assert.match(c8.note, /5\.750 W/)
})

test('C13 appears only when the project foresees EV charging', () => {
  const without = housingCircuitsFor(9200)
  const withEv = housingCircuitsFor(9200, { hasIrve: true })
  assert.equal(without.some(circuit => circuit.id === 'C13'), false)
  assert.equal(withEv.at(-1).id, 'C13')
  assert.equal(withEv.at(-1).section, 2.5)
  assert.match(withEv.at(-1).note, /ITC-BT-52/)
})

test('the housing circuits keep the 3 % drop limit of ITC-BT-25', () => {
  assert.equal(HOUSING_CIRCUIT_MAX_DROP, 3)
})

test('the drop grows the table section when the length demands it', () => {
  const c1 = housingCircuitsFor(5750)[0]

  const short = housingCircuitSizing(c1, 20)
  assert.equal(short.section, 1.5, '20 m stay on the table minimum')
  assert.ok(short.dropPercent != null && short.dropPercent < 3)
  assert.equal(short.over, false)

  const long = housingCircuitSizing(c1, 40)
  assert.equal(long.tableSection, 1.5)
  assert.equal(long.requiredSection, 2.5, '40 m at 10 A need 2.5 mm² for 3 %')
  assert.equal(long.section, 2.5, 'the adopted section is the larger one')
  assert.ok(long.dropPercent != null && long.dropPercent < 3)

  const noLength = housingCircuitSizing(c1, 0)
  assert.equal(noLength.dropPercent, null, 'without length there is nothing to verify')
  assert.equal(noLength.section, 1.5)
})

test('a circuit beyond the section series is flagged as over the limit', () => {
  const c1 = housingCircuitsFor(5750)[0]
  const extreme = housingCircuitSizing(c1, 5000)
  assert.equal(extreme.requiredSection, null, 'the series has no section left')
  assert.equal(extreme.section, 1.5)
  assert.ok(extreme.dropPercent > 3)
  assert.equal(extreme.over, true)
})

test('the drop uses the PIA and skips circuits without a breaker', () => {
  assert.equal(sectionForDrop({ breakerA: null, lengthM: 20 }), null, 'without PIA there is no drop check')
  assert.equal(sectionForDrop({ breakerA: 10, lengthM: 0 }), null, 'without length there is no drop check')
  assert.equal(sectionForDrop({ breakerA: 10, lengthM: 40 }), 2.5)
})

test('the dwelling card shows the circuit table', () => {
  const panel = read('components/interior-panel.tsx')
  const calc = read('components/load-calculator.tsx')

  assert.match(panel, /housingCircuitsFor\(dwelling\.powerW, \{ hasIrve \}\)/, 'the card builds the roster from the grade')
  assert.match(panel, /Circuitos de la vivienda ·/, 'the table has its heading')
  assert.match(panel, /Máx\. puntos/, 'the table shows the maximum points')
  assert.match(panel, /P\/toma/, 'the table shows the power per point')
  assert.match(panel, /aria-controls="housing-circuits-dialog"/, 'the Tabla button opens the reference dialog')
  assert.match(panel, /HOUSING_CIRCUIT_TABLE\.map/, 'the dialog renders the published table 1')
  assert.match(panel, /HOUSING_CIRCUIT_TABLE_NOTES\.map/, 'the dialog carries the table notes')
  assert.match(panel, /ITC-BT-25 §3 · tabla 1/, 'the section cites the table in a source note')
  assert.match(panel, /<SourceNote label="ITC-BT-25 §3, tabla 1">/, 'the table dialog cites its source in a hover note')
  assert.doesNotMatch(panel, /Fuente: ITC-BT-25 §3, tabla 1 ·/, 'no plain Fuente line is left in the dialog')
  assert.match(calc, /hasIrve=\{parking > 0\}/, 'the EV circuit depends on the project parking')
})
