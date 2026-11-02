import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CALCULATOR_INPUTS_STORAGE_KEY,
  NEW_PROJECT_STORAGE_KEY,
  clearProjectData,
  loadCalculatorInputs,
  marksClearedProject,
  opensWithExample,
  saveCalculatorInputs,
  setClearedProjectMark,
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
  housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }],
  locals: [{ name: 'Local 1', type: 'Comercial/oficina', area: 40, real: 0 }],
  garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 120, plazas: 12 }],
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

const sampleDerivation = {
  id: 'dwelling-0-0',
  kind: 'dwelling',
  label: 'Vivienda 1',
  sourceKey: 'housing:0',
  system: 'single-phase',
  powerW: 5750,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 1,
  gamma: 48.5,
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
}

test('persists calculator inputs using a versioned snapshot', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, sampleInputs)

  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.equal(snapshot.version, 2)
  assert.deepEqual(loadCalculatorInputs(storage), sampleInputs)
})

test('a dwelling saved before the surface column loads with zero surface', () => {
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({
      version: 2,
      ...sampleInputs,
      housing: [{ level: 'Básica', power: 5750, homes: 2 }],
    }),
  })

  const loaded = loadCalculatorInputs(storage)
  assert.notEqual(loaded, null, 'the project survives the missing field')
  assert.deepEqual(loaded.housing, [{ level: 'Básica', power: 5750, homes: 2, area: 0 }], 'the surface defaults to zero')
  assert.deepEqual(loaded.garages, sampleInputs.garages, 'the rest of the project is untouched')
})

test('a malformed dwelling surface becomes zero instead of discarding the project', () => {
  for (const area of ['wide', -20, null]) {
    const storage = createMemoryStorage({
      [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({
        version: 2,
        ...sampleInputs,
        housing: [{ level: 'Básica', power: 5750, homes: 1, area }],
      }),
    })

    const loaded = loadCalculatorInputs(storage)
    assert.notEqual(loaded, null, `dwelling with area ${JSON.stringify(area)} keeps the project`)
    assert.equal(loaded.housing[0].area, 0, `dwelling with area ${JSON.stringify(area)} falls back to zero`)
  }
})

test('a garage saved before the parking-space column loads with zero spaces', () => {
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({
      version: 2,
      ...sampleInputs,
      garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 120 }],
    }),
  })

  const loaded = loadCalculatorInputs(storage)
  assert.notEqual(loaded, null, 'the project survives the missing field')
  assert.deepEqual(loaded.garages, [{ name: 'Garaje 1', ventilation: 'Forzada', area: 120, plazas: 0 }], 'the parking count defaults to zero')
  assert.deepEqual(loaded.housing, sampleInputs.housing, 'the rest of the project is untouched')
})

test('a malformed parking count becomes zero instead of discarding the project', () => {
  for (const plazas of ['many', -3, null]) {
    const storage = createMemoryStorage({
      [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({
        version: 2,
        ...sampleInputs,
        garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 120, plazas }],
      }),
    })

    const loaded = loadCalculatorInputs(storage)
    assert.notEqual(loaded, null, `garage with plazas ${JSON.stringify(plazas)} keeps the project`)
    assert.equal(loaded.garages[0].plazas, 0, `garage with plazas ${JSON.stringify(plazas)} falls back to zero`)
  }
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
    [CALCULATOR_INPUTS_STORAGE_KEY]: '{"version":99}',
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

test('persists and restores the enlace scenario', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, installationType: 'partial' })
  assert.equal(loadCalculatorInputs(storage).installationType, 'partial', 'the scenario survives a reload')

  saveCalculatorInputs(storage, { ...sampleInputs, installationType: 'invented' })
  const loaded = loadCalculatorInputs(storage)
  assert.notEqual(loaded, null, 'an unknown scenario does not discard the project')
  assert.equal(loaded.installationType, undefined, 'it falls back to the calculator default')
})

test('persists the derivation list in a v2 snapshot', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [sampleDerivation] })
  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.equal(snapshot.version, 2)
  assert.deepEqual(snapshot.derivations, [sampleDerivation])
  assert.deepEqual(loadCalculatorInputs(storage).derivations, [sampleDerivation])
})

test('migrates a v1 single DI into a derivation seed', () => {
  const { id, kind, label, sourceKey, system, ...di } = sampleDerivation
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({ version: 1, ...sampleInputs, di }),
  })

  const loaded = loadCalculatorInputs(storage)
  assert.equal(loaded.di.powerW, 5750, 'the legacy single DI still loads')
  assert.equal(loaded.derivations.length, 1, 'the legacy DI becomes a derivation seed')
  assert.equal(loaded.derivations[0].id, 'legacy-di')
  assert.equal(loaded.derivations[0].kind, 'custom')
  assert.equal(loaded.derivations[0].system, 'single-phase')
})

test('ignores invalid derivations instead of discarding the project', () => {
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({
      version: 2,
      ...sampleInputs,
      derivations: [{ ...sampleDerivation, system: 'invented' }],
    }),
  })

  const loaded = loadCalculatorInputs(storage)
  assert.equal(loaded.derivations, undefined, 'invalid derivations are ignored')
  assert.deepEqual(loaded.housing, sampleInputs.housing, 'the rest of the project survives')
})

test('persists the LGA power mode', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, lgaPowerMode: 'manual' })
  assert.equal(loadCalculatorInputs(storage).lgaPowerMode, 'manual')

  saveCalculatorInputs(storage, { ...sampleInputs, lgaPowerMode: 'auto' })
  assert.equal(loadCalculatorInputs(storage).lgaPowerMode, 'auto')
})

test('opens a first visit with the example building', () => {
  const storage = createMemoryStorage()

  assert.equal(opensWithExample(storage, false), true, 'no saved project and no mark means a first visit')
})

test('keeps a deliberate clear across a reload', () => {
  const storage = createMemoryStorage()

  clearProjectData(storage)
  setClearedProjectMark(storage, true)

  assert.equal(marksClearedProject(storage), true)
  assert.equal(opensWithExample(storage, false), false, 'an emptied project stays empty instead of refilling with the example')
})

test('loading the example again retires the cleared mark', () => {
  const storage = createMemoryStorage({ [NEW_PROJECT_STORAGE_KEY]: '1' })

  setClearedProjectMark(storage, false)

  assert.equal(storage.getItem(NEW_PROJECT_STORAGE_KEY), null)
  assert.equal(opensWithExample(storage, false), true)
})

test('never overwrites a restored project with the example', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, sampleInputs)

  assert.equal(opensWithExample(storage, true), false, 'saved inputs win over the example seed')
})

test('falls back to the example when storage is unavailable', () => {
  const blocked = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }

  assert.equal(opensWithExample(blocked, false), true, 'an unreadable mark must not hide the example')
  assert.doesNotThrow(() => setClearedProjectMark(blocked, true))
})
