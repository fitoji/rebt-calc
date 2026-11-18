import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { housingCircuitSizing, housingCircuitsFor, sectionOverrideWarning } from '../lib/housing-circuits.mjs'
import { dwellingDocumentInput } from '../lib/elec3-dwelling.mjs'
import { buildDwellingDocument } from '../lib/elec3.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

test('la sección recomendada combina la tabla 1 y la caída', () => {
  const c1 = housingCircuitsFor(5750)[0]
  const short = housingCircuitSizing(c1, 20)
  assert.equal(short.recommendedSection, 1.5)
  assert.equal(short.section, 1.5)
  assert.equal(short.effectiveSection, 1.5)
  assert.equal(short.compliant, true)

  const long = housingCircuitSizing(c1, 40)
  assert.equal(long.recommendedSection, 2.5)
  assert.equal(long.section, 2.5)
  assert.equal(long.effectiveSection, 2.5)
})

test('una sección mayor se adopta y se propaga', () => {
  const c1 = housingCircuitsFor(5750)[0]
  const base = housingCircuitSizing(c1, 40)
  const bigger = housingCircuitSizing(c1, 40, 6)
  assert.equal(bigger.section, 6)
  assert.equal(bigger.effectiveSection, 6)
  assert.equal(bigger.compliant, true)
  assert.ok(bigger.dropPercent < base.dropPercent, 'una sección mayor reduce la caída')
})

test('una sección menor a la tabla 1 se marca y no se propaga', () => {
  const c2 = housingCircuitsFor(5750)[1]
  const invalid = housingCircuitSizing(c2, 20, 1.5)
  assert.equal(invalid.section, 1.5, 'la fila muestra lo elegido')
  assert.equal(invalid.effectiveSection, 2.5, 'el informe usa la recomendada')
  assert.equal(invalid.compliant, false)
  assert.equal(invalid.invalidReason, 'table')
  assert.match(sectionOverrideWarning(invalid), /tabla 1/)
})

test('una sección entre la tabla y la caída se marca por caída', () => {
  const c1 = housingCircuitsFor(5750)[0]
  const invalid = housingCircuitSizing(c1, 40, 1.5)
  assert.equal(invalid.section, 1.5)
  assert.equal(invalid.effectiveSection, 2.5)
  assert.equal(invalid.invalidReason, 'drop')
  assert.match(sectionOverrideWarning(invalid), /caída máxima del 3 %/)
})

test('el panel usa el Select de UI SDK y deja la recomendada marcada', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /CircuitSectionSelect/)
  assert.match(panel, /sectionOverride/)
  assert.match(panel, /role="alert"/)

  const select = read('components/circuit-section-select.tsx')
  assert.match(select, /from '@ui-sdk\/react\/select'/)
  assert.match(select, /Calculada ·/, 'la opción calculada se distingue')
  assert.match(select, /Recomendada/, 'la recomendada queda marcada siempre')
  assert.match(select, /Check/, 'la marca es un check')
  assert.match(select, /SelectItemIndicator/, 'el ítem seleccionado lleva su check')
  assert.match(select, /ChevronDown/, 'el trigger muestra el affordance del desplegable')
  assert.match(select, /tint/, 'el select recibe el color de su circuito')
  assert.match(panel, /tint=\{CIRCUIT_ROW_TINT\[circuit\.id\]/, 'el panel pasa el tinte de la tabla')
  assert.match(select, /text-danger/, 'la sección inválida se pinta en rojo')
})

test('el ELEC-3 no imprime una sección menor a la recomendada', () => {
  const interior = { contractedPowerW: 5750, circuits: 5, hasSurge: false, sectionOverride: { C1: 1.5 } }
  const invalid = buildDwellingDocument(dwellingDocumentInput({
    derivation: { powerW: 5750 },
    interior,
    circuits: housingCircuitsFor(5750),
  }))
  const c1 = invalid.files.slice(1).find(row => row.id === 'C1')
  assert.equal(c1.seccio, 1.5, 'sin longitud la recomendada es la tabla')

  const withLength = buildDwellingDocument(dwellingDocumentInput({
    derivation: { powerW: 5750 },
    interior: { ...interior, sectionOverride: { C1: 1.5 }, lengths: { C1: 40 } },
    circuits: housingCircuitsFor(5750),
  }))
  const longC1 = withLength.files.slice(1).find(row => row.id === 'C1')
  assert.equal(longC1.seccio, 2.5, 'con 40 m el ELEC-3 imprime la recomendada, no el override')

  const bigger = buildDwellingDocument(dwellingDocumentInput({
    derivation: { powerW: 5750 },
    interior: { ...interior, sectionOverride: { C1: 6 }, lengths: { C1: 40 } },
    circuits: housingCircuitsFor(5750),
  }))
  const biggerC1 = bigger.files.slice(1).find(row => row.id === 'C1')
  assert.equal(biggerC1.seccio, 6, 'una sección mayor sí se imprime en el ELEC-3')
})
