import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CALCULATOR_INPUTS_STORAGE_KEY,
  clearProjectData,
  loadCalculatorInputs,
  saveCalculatorInputs,
} from '../lib/calculator-storage.mjs'

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries))

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

const sampleInputs = {
  housing: [{ level: 'Básica', power: 5750, homes: 1 }],
  locals: [{ name: 'Local 1', type: 'Comercial/oficina', area: 40, real: 0 }],
  garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 120 }],
  elevators: [{ name: 'Ascensor 1', ita: 'ITA-1', power: 4000, unit: 'W' }],
  motors: [{ name: 'Motor 1', power: 2, unit: 'CV' }],
  otherLoads: [{ name: 'Alumbrado', power: 500 }],
  lighting: [
    { id: 'portal', area: 30, lamp: 'Fluorescencia/LED', power: 0 },
    { id: 'stair', area: 20, lamp: 'Incandescencia', power: 0 },
    { id: 'known', area: 0, lamp: 'Fluorescencia/LED', power: 1500 },
  ],
  parking: 12,
  irveOption: 2,
}

test('persists calculator inputs using a versioned snapshot', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, sampleInputs)

  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.equal(snapshot.version, 1)
  assert.deepEqual(loadCalculatorInputs(storage), sampleInputs)
})

test('does not retain an empty calculator snapshot', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, sampleInputs)

  saveCalculatorInputs(storage, {
    housing: [], locals: [], garages: [], elevators: [], motors: [], otherLoads: [], parking: 0, irveOption: 1,
  })

  assert.equal(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY), null)
})

test('loads older snapshots without lighting data', () => {
  const { lighting, ...legacyInputs } = sampleInputs
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({ version: 1, ...legacyInputs }),
  })

  const loaded = loadCalculatorInputs(storage)
  assert.equal(loaded.lighting, undefined, 'missing lighting falls back to the calculator defaults')
  assert.deepEqual(loaded.housing, legacyInputs.housing)
})

test('keeps lighting rows out of the snapshot when they are empty', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, {
    housing: [], locals: [], garages: [], elevators: [], motors: [], otherLoads: [],
    lighting: [
      { id: 'portal', area: 0, lamp: 'Fluorescencia/LED', power: 0 },
      { id: 'stair', area: 0, lamp: 'Fluorescencia/LED', power: 0 },
      { id: 'known', area: 0, lamp: 'Fluorescencia/LED', power: 0 },
    ],
    parking: 0, irveOption: 1,
  })

  assert.equal(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY), null)
})

test('clears project inputs and technical data while preserving calculation settings', () => {
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: '{"version":1}',
    'electrocalc-project-info': '{"companyName":"Example"}',
    'electrocalc-settings': '{"basicHousingPower":5750}',
  })

  clearProjectData(storage)

  assert.equal(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY), null)
  assert.equal(storage.getItem('electrocalc-project-info'), null)
  assert.notEqual(storage.getItem('electrocalc-settings'), null)
})

test('ignores unsupported or malformed calculator snapshots', () => {
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: '{"version":2}',
  })
  assert.equal(loadCalculatorInputs(storage), null)

  storage.setItem(CALCULATOR_INPUTS_STORAGE_KEY, '{broken')
  assert.equal(loadCalculatorInputs(storage), null)

  storage.setItem(CALCULATOR_INPUTS_STORAGE_KEY, JSON.stringify({
    version: 1,
    ...sampleInputs,
    garages: [{ name: 'Garaje', ventilation: 'Invalid', area: 20 }],
  }))
  assert.equal(loadCalculatorInputs(storage), null)
})
