import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { COPPER_CONDUCTIVITY } from '../lib/normative-tables.mjs'
import { lineInputFromState } from '../lib/line-state.mjs'
import { sizeLine } from '../lib/line-sizing.mjs'
import { explainLineCalculation } from '../lib/calculation-explanations.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const diState = overrides => ({
  powerW: 9200,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 16,
  peSection: 16,
  controlSection: 1.5,
  tubeDiameter: 40,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
  ...overrides,
})

const lgaState = overrides => ({
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  method: 'B1',
  insulation: 'XLPE',
  circuits: 1,
  protectionA: 0,
  neutralSection: 35,
  peSection: 35,
  controlSection: 1.5,
  tubeDiameter: 140,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
  ...overrides,
})

test('the anexo 2 conductivity table keeps the three reference temperatures', () => {
  assert.deepEqual(COPPER_CONDUCTIVITY, { 20: 56, 70: 48, 90: 44 })
})

test('PVC sizes with 48 and XLPE with 44, the maximum service temperature of each', () => {
  assert.equal(lineInputFromState(diState({ insulation: 'PVC' }), 'single-phase', 'di').gamma, 48)
  assert.equal(lineInputFromState(diState({ insulation: 'XLPE' }), 'single-phase', 'di').gamma, 44)
})

test('the LGA always sizes at 90 °C because ITC-BT-14 only admits XLPE', () => {
  assert.equal(lineInputFromState(lgaState(), 'three-phase', 'lga').gamma, 44)
  assert.equal(lineInputFromState(lgaState({ insulation: 'PVC' }), 'three-phase', 'lga').gamma, 44)
})

test('a gamma stored by an older snapshot cannot reach the engine', () => {
  const clean = sizeLine(lineInputFromState(diState(), 'single-phase', 'di'))
  const stale = sizeLine(lineInputFromState(diState({ gamma: 56 }), 'single-phase', 'di'))
  const warm = sizeLine({ ...lineInputFromState(diState(), 'single-phase', 'di'), gamma: 48 })

  assert.equal(stale.sectionByDrop, clean.sectionByDrop, 'the stored 56 is ignored')
  assert.equal(clean.sectionByDrop, warm.sectionByDrop, '48 is the value actually applied')
})

test('the didactic step cites the anexo and the temperature of each insulation', () => {
  const state = diState()
  const explanation = explainLineCalculation(state, sizeLine(lineInputFromState(state, 'single-phase', 'di')), { system: 'single-phase', line: 'di' })
  const inputs = explanation.steps.find(step => step.id === 'inputs')
  const rows = Object.fromEntries(inputs.rows.map(row => [row.label, row.value]))

  assert.equal(rows['Conductividad (γ)'], '48,00 m/(Ω·mm²)', 'the applied value, not the stored one')
  assert.match(inputs.note, /anexo 2/i, 'the anexo that fixes the value is named')
  assert.match(inputs.note, /ITC-BT-07/, 'the instruction that fixes the maximum temperature is named')
  assert.match(inputs.note, /70 °C/, 'PVC maximum service temperature')
  assert.match(inputs.note, /90 °C/, 'XLPE maximum service temperature')
  assert.match(inputs.note, /56/, 'the 20 °C value is named as the one the guide rules out')
  assert.doesNotMatch(inputs.note, /≈ 52/, 'the superseded 40 °C reference is gone')
})

test('the panels derive γ instead of offering an editable field', () => {
  const modules = readFileSync(path.join(root, 'components/line-modules.tsx'), 'utf8')

  assert.doesNotMatch(modules, /id="lga-gamma"/, 'the LGA has no editable conductivity')
  assert.doesNotMatch(modules, /id="di-gamma"/, 'the DI has no editable conductivity')
  assert.match(modules, /gammaFor\(/, 'the panel reads the guide value')
})

test('the symbols keep their case inside the uppercased labels', () => {
  const modules = readFileSync(path.join(root, 'components/line-modules.tsx'), 'utf8')
  const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8')

  assert.match(css, /\.label-symbol \{\s*text-transform: none;/, 'the symbol is exempt from the uppercase label')
  assert.match(modules, /Conductividad \(<span className="label-symbol">γ<\/span>\)/, 'gamma stays lowercase, not Γ')
  assert.equal([...modules.matchAll(/<span className="label-symbol">φ<\/span>/g)].length, 2, 'both cos φ labels')
})

test('the anexo 2 PDF is tracked next to the other guides', () => {
  const pdfPath = path.join(root, 'data/documentacion/guia_bt_anexo_2_sep03R1.pdf')

  assert.equal(readFileSync(pdfPath).subarray(0, 5).toString('latin1'), '%PDF-', 'the source document is a real PDF')

  const tables = readFileSync(path.join(root, 'lib/normative-tables.mjs'), 'utf8')
  assert.match(tables, /guia_bt_anexo_2_sep03R1\.pdf/, 'the data file names the PDF it was transcribed from')
})

test('the help page explains the worst-case rule with its sources', () => {
  const help = readFileSync(path.join(root, 'components/help-doc.tsx'), 'utf8')

  assert.match(help, /anexo 2/i, 'the help cites the anexo')
  assert.match(help, /ITC-BT-07/, 'the help cites the maximum service temperature')
  assert.match(help, /48/, 'the PVC value is stated')
  assert.match(help, /44/, 'the XLPE value is stated')
  assert.doesNotMatch(help, /≈ 52 m\/\(Ω·mm²\)/, 'the superseded 40 °C reference is gone')
})
