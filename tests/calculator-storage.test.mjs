import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CALCULATOR_INPUTS_STORAGE_KEY,
  NEW_PROJECT_STORAGE_KEY,
  clearProjectData,
  loadCalculatorInputs,
  marksClearedProject,
  opensWithExample,
  readProjectExport,
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
  assert.equal(snapshot.version, 3)
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

test('persists the derivation list in a v3 snapshot', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [sampleDerivation] })
  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.equal(snapshot.version, 3)
  assert.deepEqual(snapshot.derivations, [sampleDerivation])
  assert.deepEqual(loadCalculatorInputs(storage).derivations, [sampleDerivation])
})

test('persists the meter centre and drops a malformed one without losing the project', () => {
  const meterCenter = {
    placement: 'concentrated',
    meters: null,
    concentrations: 2,
    assembly: 'local',
    cabinet: 'adosado',
    floor: 'baja',
    buildingFloors: 4,
    mainSwitchA: 250,
    hasMando: true,
    hasTelecom: false,
    exterior: false,
  }
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, meterCenter })
  assert.deepEqual(loadCalculatorInputs(storage).meterCenter, meterCenter, 'the centre survives a reload')

  storage.setItem(CALCULATOR_INPUTS_STORAGE_KEY, JSON.stringify({
    version: 3,
    ...sampleInputs,
    meterCenter: { ...meterCenter, assembly: 'garaje' },
  }))
  const loaded = loadCalculatorInputs(storage)
  assert.notEqual(loaded, null, 'a malformed centre never discards the project')
  assert.equal(loaded.meterCenter, undefined, 'the block falls back to the default centre')
})

test('a default meter centre is not written, so clearing the project still clears storage', () => {
  const storage = createMemoryStorage()
  const defaults = {
    placement: 'concentrated',
    meters: null,
    concentrations: 1,
    assembly: 'local',
    cabinet: 'adosado',
    floor: 'baja',
    buildingFloors: 1,
    mainSwitchA: 160,
    hasMando: false,
    hasTelecom: false,
    exterior: false,
  }

  saveCalculatorInputs(storage, { ...sampleInputs, meterCenter: defaults })
  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.equal('meterCenter' in snapshot, false, 'the untouched centre is not project data')

  saveCalculatorInputs(storage, {
    housing: [], locals: [], garages: [], elevators: [], motors: [], otherLoads: [],
    parking: 0, irveOption: 1, meterCenter: defaults,
  })
  assert.equal(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY), null, 'an empty project with the default centre leaves no snapshot')
})

test('persists the interior circuits of a supply and drops a malformed block', () => {
  const circuits = [{ id: 'c1', description: 'Alumbrado', use: 'alumbrado', powerW: 500, lengthM: 12 }]
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [{ ...sampleDerivation, interiorCircuits: circuits }] })
  assert.deepEqual(loadCalculatorInputs(storage).derivations[0].interiorCircuits, circuits, 'the board survives a reload')

  storage.setItem(CALCULATOR_INPUTS_STORAGE_KEY, JSON.stringify({
    version: 3,
    ...sampleInputs,
    derivations: [{ ...sampleDerivation, interiorCircuits: [{ ...circuits[0], use: 'otro' }] }],
  }))
  const loaded = loadCalculatorInputs(storage)
  assert.notEqual(loaded, null, 'a malformed board never discards the project')
  assert.equal(loaded.derivations, undefined, 'the derivation block falls back instead of loading half of it')
})

test('persists the circuit lengths of a dwelling', () => {
  const interior = { contractedPowerW: 5750, circuits: 5, hasSurge: false, lengths: { C1: 20, C2: 15.5 } }
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [{ ...sampleDerivation, interior }] })
  assert.deepEqual(loadCalculatorInputs(storage).derivations[0].interior, interior, 'the lengths survive a reload')
})

test('persists the dwelling rooms and their systems', () => {
  const interior = {
    contractedPowerW: 5750,
    circuits: 5,
    hasSurge: false,
    lengths: { C1: 20 },
    rooms: [{ id: 'room-1', type: 'salon', area: 20, length: 0 }],
    hasHeating: true,
    hasCooling: false,
    hasDryer: true,
  }
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [{ ...sampleDerivation, housingAreaM2: 90, interior }] })
  assert.deepEqual(loadCalculatorInputs(storage).derivations[0].interior, interior, 'the rooms survive a reload')
  assert.equal(loadCalculatorInputs(storage).derivations[0].housingAreaM2, 90, 'the dwelling surface survives a reload')
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

const sampleProjectInfo = {
  companyName: 'Estudio',
  companyAddress: 'Calle 1',
  workAddress: 'Obra 2',
  phone: '600 000 000',
  email: 'obra@example.com',
  logo: 'data:image/png;base64,AAAA',
}

const sampleLine = {
  powerW: 5750,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 1,
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

const exportedInputs = {
  ...sampleInputs,
  lga: { ...sampleLine, powerW: 12000, voltageV: 400 },
  lgaPowerMode: 'manual',
  di: { ...sampleLine },
  derivations: [sampleDerivation],
}

/**
 * The shape `Descargar datos → JSON` writes: `inputs` has no `version`, and the
 * derived blocks travel alongside it.
 */
function exportedProject(overrides = {}) {
  return {
    exportedAt: '2026-11-03T00:00:00.000Z',
    projectInfo: sampleProjectInfo,
    inputs: exportedInputs,
    settings: { basicHousingPower: 9999 },
    calculations: { p1: 1 },
    lines: { lga: { inputs: {}, result: {} }, di: { inputs: {}, result: {} } },
    project: { lga: {}, derivations: [], summary: {} },
    ...overrides,
  }
}

test('a downloaded project file restores its inputs and project data', () => {
  const parsed = readProjectExport(JSON.stringify(exportedProject()))

  assert.equal(parsed.ok, true, 'a file written by the JSON export is accepted')
  assert.deepEqual(parsed.project.inputs, exportedInputs)
  assert.deepEqual(parsed.project.projectInfo, sampleProjectInfo)
})

test('only the persisted blocks are restored, never the derived ones', () => {
  const parsed = readProjectExport(JSON.stringify(exportedProject({ extra: 'ignored' })))

  assert.equal(parsed.ok, true, 'an unknown top-level key does not discard the project')
  assert.deepEqual(
    Object.keys(parsed.project).sort(),
    ['inputs', 'projectInfo'],
    'settings, calculations, lines and project stay out of the restored project',
  )
})

test('a file that is not JSON is rejected with its own reason', () => {
  const parsed = readProjectExport('{ esto no es json')

  assert.equal(parsed.ok, false)
  assert.match(parsed.error, /JSON/i)
  assert.equal(parsed.project, undefined, 'a rejected file leaves nothing to apply')
})

test('an empty file is rejected instead of clearing the project', () => {
  for (const text of ['', '   ']) {
    const parsed = readProjectExport(text)

    assert.equal(parsed.ok, false, `"${text}" carries no project`)
    assert.match(parsed.error, /vac[ií]o/i)
    assert.equal(parsed.project, undefined)
  }
})

test('a raw storage snapshot is not accepted as a project file', () => {
  const parsed = readProjectExport(JSON.stringify({ version: 2, ...sampleInputs }))

  assert.equal(parsed.ok, false, 'the import reads the export, not the internal snapshot')
  assert.match(parsed.error, /proyecto/i)
  assert.equal(parsed.project, undefined)
})

test('one malformed row rejects the whole file and applies nothing', () => {
  const parsed = readProjectExport(JSON.stringify(exportedProject({
    inputs: { ...exportedInputs, housing: [{ level: 'Media', power: 5750, homes: 1, area: 90 }] },
  })))

  assert.equal(parsed.ok, false)
  assert.match(parsed.error, /proyecto/i)
  assert.equal(parsed.project, undefined, 'the valid rows are not applied on their own')
})

test('project data from the file is sanitised field by field', () => {
  const parsed = readProjectExport(JSON.stringify(exportedProject({
    projectInfo: { companyName: 42, phone: null, email: 'obra@example.com', intruso: 'x' },
  })))

  assert.equal(parsed.ok, true, 'a malformed field never discards the calculation data')
  assert.deepEqual(parsed.project.projectInfo, {
    companyName: '',
    companyAddress: '',
    workAddress: '',
    phone: '',
    email: 'obra@example.com',
    logo: '',
  })
})

test('a file without lines or derivations loads the load forecast only', () => {
  const { lga, lgaPowerMode, di, derivations, ...forecastOnly } = exportedInputs
  const parsed = readProjectExport(JSON.stringify(exportedProject({ inputs: forecastOnly })))

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.project.inputs, forecastOnly)
  assert.equal('lga' in parsed.project.inputs, false)
  assert.equal('lgaPowerMode' in parsed.project.inputs, false, 'the power mode travels with the LGA')
  assert.equal('di' in parsed.project.inputs, false)
  assert.equal('derivations' in parsed.project.inputs, false)
})

test('a centre saved with the old enclosure field keeps its cabinet choice', () => {
  const legacy = {
    placement: 'concentrated',
    meters: null,
    concentrations: 1,
    cabinet: 'adosado',
    floor: 'baja',
    buildingFloors: 1,
    mainSwitchA: 160,
    hasMando: false,
    hasTelecom: false,
    exterior: false,
    enclosure: 'armario',
  }
  const storage = createMemoryStorage({
    [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({ version: 3, ...sampleInputs, meterCenter: legacy }),
  })

  const migrated = loadCalculatorInputs(storage)
  assert.equal(migrated.meterCenter.assembly, 'armario', 'the legacy enclosure field is migrated')
  assert.equal('enclosure' in migrated.meterCenter, false, 'the legacy key is dropped')
  assert.equal(migrated.meterCenter.cabinet, 'adosado', 'the cabinet survives')
})

test('an imported meter centre is restored, and a malformed one rejects the whole file', () => {
  const meterCenter = {
    placement: 'concentrated',
    meters: null,
    concentrations: 2,
    assembly: 'local',
    cabinet: 'adosado',
    floor: 'intermedias',
    buildingFloors: 14,
    mainSwitchA: 160,
    hasMando: false,
    hasTelecom: true,
    exterior: true,
  }

  const ok = readProjectExport(JSON.stringify(exportedProject({ inputs: { ...exportedInputs, meterCenter } })))
  assert.equal(ok.ok, true, 'a valid centre is accepted')
  assert.deepEqual(ok.project.inputs.meterCenter, meterCenter, 'every field round-trips')

  const broken = readProjectExport(JSON.stringify(exportedProject({
    inputs: { ...exportedInputs, meterCenter: { ...meterCenter, placement: 'otra' } },
  })))
  assert.equal(broken.ok, false, 'an unknown placement rejects the file instead of losing the block')
})

test('unknown keys inside the file inputs never reach the calculator', () => {
  const parsed = readProjectExport(JSON.stringify(exportedProject({
    inputs: { ...exportedInputs, version: 9, intruso: 'x' },
  })))

  assert.equal(parsed.ok, true)
  assert.equal('version' in parsed.project.inputs, false)
  assert.equal('intruso' in parsed.project.inputs, false)
})
