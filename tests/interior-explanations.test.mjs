import assert from 'node:assert/strict'
import test from 'node:test'

import { explainInterior } from '../lib/calculation-explanations.mjs'
import { normalizeDifferentials } from '../lib/differentials.mjs'
import { housingCircuitsFor } from '../lib/housing-circuits.mjs'
import { evaluateInterior } from '../lib/interior-installation.mjs'

const state = {
  igaA: 25,
  powerW: 5750,
  contractedPowerW: 5750,
  circuits: 7,
  hasSurge: false,
  lengths: { C1: 40 },
  sectionOverride: { C1: 1.5, C2: 1.5 },
  c4Mode: 3,
  c4Pair: 'lavadora-lavavajillas',
  differentialType: 'A',
}

const circuits = housingCircuitsFor(5750, { c4Mode: 3 })
const differentialDevices = normalizeDifferentials({
  differentialType: 'A',
  circuitIds: circuits.map(circuit => circuit.id),
  minimum: 1,
}).devices
const explanation = explainInterior(state, evaluateInterior(state), { grade: 'basic', circuits, differentialDevices })
const step = id => explanation.steps.find(candidate => candidate.id === id)

test('el modo didáctico explica la subdivisión de C4', () => {
  const c4 = step('interior-c4')
  assert.ok(c4, 'hay un paso de C4')
  assert.deepEqual(c4.rows.map(row => row.label), ['C4.1', 'C4.2', 'C4.3'])
  assert.match(c4.note, /nota \(8\)/)
  assert.match(c4.note, /no (?:añade|suma) diferencial/i)
})

test('el modo didáctico explica los diferenciales declarados y sus reglas', () => {
  const differentials = step('interior-differential-devices')
  assert.ok(differentials, 'hay un paso de diferenciales')
  assert.equal(differentials.rows.length, differentialDevices.length)
  assert.match(differentials.note, /30 mA/)
  assert.match(differentials.note, /300 mA/)
  assert.match(differentials.note, /C13/)
})

test('el modo didáctico explica la sección recomendada y los overrides', () => {
  const criteria = step('interior-section-criteria')
  assert.ok(criteria, 'siempre se explica de dónde sale la sección')
  assert.match(criteria.text, /tabla 1/)
  assert.match(criteria.text, /3 %/)

  const chosen = step('interior-sections')
  assert.ok(chosen, 'se listan las secciones elegidas')
  assert.equal(chosen.rows.length, 2)
  assert.ok(chosen.rows.some(row => /no cumple la tabla 1/.test(row.value)), 'la sección bajo la tabla se explica')
  assert.ok(chosen.rows.some(row => /no cumple la caída/.test(row.value)), 'la sección que falla la caída se explica')
  assert.match(chosen.note, /no se imprime en el ELEC-3/i)
})
