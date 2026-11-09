import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_DOCUMENTATION,
  classifyDocumentation,
  normalizeDocumentation,
} from '../lib/project-documentation.mjs'
import {
  CALCULATOR_INPUTS_STORAGE_KEY,
  loadCalculatorInputs,
  readProjectExport,
  saveCalculatorInputs,
} from '../lib/calculator-storage.mjs'

/** The verdict table of ITC-BT-04 §3.1, in the order the instruction lists it. */
const GROUP_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'z']

/** @param {ReturnType<typeof classifyDocumentation>} classification @param {string} id */
function group(classification, id) {
  const entry = classification.groups.find(candidate => candidate.id === id)
  assert.ok(entry, `the classification must publish group ${id}`)
  return entry
}

/**
 * Calls the classifier with only the data a test cares about; every other input
 * stays at its neutral value, so a test only proves the rule it names.
 *
 * @param {Record<string, unknown>} overrides
 */
function classify(overrides = {}) {
  return classifyDocumentation({
    totalW: 0,
    homes: 0,
    localPowers: [],
    localTypes: [],
    garages: [],
    parking: 0,
    irvePowerW: 0,
    cgpCount: 1,
    documentation: {},
    ...overrides,
  })
}

test('grupo a: industrias por encima de 20 kW', () => {
  const atLimit = classify({ totalW: 20_000, localPowers: [20_000], localTypes: ['Industria'] })
  assert.equal(group(atLimit, 'a').applies, true)
  assert.equal(group(atLimit, 'a').value, 20_000)
  assert.equal(group(atLimit, 'a').limit, 20_000)
  assert.equal(group(atLimit, 'a').requiresProject, false, 'exactly 20 kW stays MTD')
  assert.equal(atLimit.verdict, 'memoria-tecnica')

  const above = classify({ totalW: 20_001, localPowers: [12_000, 8_001], localTypes: ['Industria', 'Industria'] })
  assert.equal(group(above, 'a').value, 20_001, 'the group sums the industry rows')
  assert.equal(group(above, 'a').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  const commercialOnly = classify({ totalW: 90_000, localPowers: [90_000], localTypes: ['Comercial/oficina'] })
  assert.equal(group(commercialOnly, 'a').applies, false, 'a commercial local never feeds group a')
  assert.equal(group(commercialOnly, 'a').value, 0)
})

test('grupo b: locales húmedos, polvorientos o corrosivos por encima de 10 kW', () => {
  const atLimit = classify({ totalW: 10_000, documentation: { dampLocales: true } })
  assert.equal(group(atLimit, 'b').applies, true)
  assert.equal(group(atLimit, 'b').value, 10_000)
  assert.equal(group(atLimit, 'b').requiresProject, false, 'exactly 10 kW stays MTD')

  const above = classify({ totalW: 10_001, documentation: { dampLocales: true } })
  assert.equal(group(above, 'b').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  const undeclared = classify({ totalW: 90_000 })
  assert.equal(group(undeclared, 'b').applies, false)
  assert.equal(group(undeclared, 'b').requiresProject, false)
})

test('grupo c: locales mojados por encima de 10 kW', () => {
  const atLimit = classify({ totalW: 10_000, documentation: { wetLocales: true } })
  assert.equal(group(atLimit, 'c').applies, true)
  assert.equal(group(atLimit, 'c').requiresProject, false, 'exactly 10 kW stays MTD')

  const above = classify({ totalW: 10_001, documentation: { wetLocales: true } })
  assert.equal(group(above, 'c').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  assert.equal(group(classify({ totalW: 90_000 }), 'c').applies, false)
})

test('grupo d: instalaciones temporales por encima de 50 kW', () => {
  const atLimit = classify({ totalW: 50_000, documentation: { temporary: true } })
  assert.equal(group(atLimit, 'd').applies, true)
  assert.equal(group(atLimit, 'd').requiresProject, false, 'exactly 50 kW stays MTD')

  const above = classify({ totalW: 50_001, documentation: { temporary: true } })
  assert.equal(group(above, 'd').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  assert.equal(group(classify({ totalW: 90_000 }), 'd').applies, false)
})

test('grupo e: edificios de viviendas, locales y oficinas por encima de 100 kW por CGP', () => {
  const atLimit = classify({ totalW: 100_000, homes: 4 })
  assert.equal(group(atLimit, 'e').applies, true)
  assert.equal(group(atLimit, 'e').value, 100_000)
  assert.equal(group(atLimit, 'e').limit, 100_000)
  assert.equal(group(atLimit, 'e').requiresProject, false, 'exactly 100 kW per CGP stays MTD')

  const above = classify({ totalW: 100_001, homes: 4 })
  assert.equal(group(above, 'e').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  const localOnly = classify({
    totalW: 100_001,
    localPowers: [100_001],
    localTypes: ['Comercial/oficina'],
  })
  assert.equal(group(localOnly, 'e').applies, true, 'a local is enough for group e without dwellings')

  const singleHome = classify({ totalW: 100_001, homes: 1 })
  assert.equal(group(singleHome, 'e').applies, false, 'a unifamiliar falls under group f, not e')
})

test('grupo e: el mismo total con una o dos CGP cambia el veredicto', () => {
  const sameTotal = { totalW: 150_000, homes: 4 }

  const twoCgp = classify({ ...sameTotal, cgpCount: 2 })
  assert.equal(group(twoCgp, 'e').value, 75_000, 'the power is measured per CGP')
  assert.equal(group(twoCgp, 'e').requiresProject, false)
  assert.equal(twoCgp.verdict, 'memoria-tecnica')

  const oneCgp = classify({ ...sameTotal, cgpCount: 1 })
  assert.equal(group(oneCgp, 'e').value, 150_000)
  assert.equal(group(oneCgp, 'e').requiresProject, true)
  assert.equal(oneCgp.verdict, 'proyecto')

  assert.equal(group(classify({ ...sameTotal, cgpCount: 0 }), 'e').value, 150_000, 'zero CGP never divides by zero')
})

test('grupo f: vivienda unifamiliar por encima de 50 kW', () => {
  const atLimit = classify({ totalW: 50_000, homes: 1 })
  assert.equal(group(atLimit, 'f').applies, true)
  assert.equal(group(atLimit, 'f').value, 50_000)
  assert.equal(group(atLimit, 'f').limit, 50_000)
  assert.equal(group(atLimit, 'f').requiresProject, false, 'exactly 50 kW is still MTD')
  assert.equal(atLimit.verdict, 'memoria-tecnica', 'the unifamiliar boundary is strict')

  const above = classify({ totalW: 50_001, homes: 1 })
  assert.equal(group(above, 'f').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  assert.equal(group(classify({ totalW: 10_000, homes: 2 }), 'f').applies, false, 'group f is for one dwelling only')
})

test('grupo g: aparcamiento con ventilación forzada exige proyecto a cualquier potencia', () => {
  const classification = classify({
    totalW: 1_000,
    garages: [{ name: 'Sótano', ventilation: 'Forzada', plazas: 4, area: 120 }],
  })

  assert.equal(group(classification, 'g').applies, true)
  assert.equal(group(classification, 'g').requiresProject, true, '1 kW is already a project')
  assert.equal(classification.verdict, 'proyecto')
  assert.deepEqual(classification.decidingGroups, ['g'])
  assert.equal(group(classification, 'g').limit, 'cualquiera que sea su ocupación')
  assert.equal(group(classification, 'h').applies, false, 'the forced garage does not feed group h')
})

test('grupo h: aparcamiento con ventilación natural por encima de 5 plazas', () => {
  const atLimit = classify({
    garages: [
      { name: 'Patio', ventilation: 'Natural', plazas: 5, area: 100 },
      { name: 'Sótano', ventilation: 'Forzada', plazas: 20, area: 300 },
    ],
  })
  assert.equal(group(atLimit, 'h').applies, true)
  assert.equal(group(atLimit, 'h').value, 5, 'only the natural-ventilation garages count')
  assert.equal(group(atLimit, 'h').limit, 'más de 5 plazas')
  assert.equal(group(atLimit, 'h').requiresProject, false, 'five spaces stay MTD')

  const above = classify({ garages: [{ name: 'Patio', ventilation: 'Natural', plazas: 6, area: 100 }] })
  assert.equal(group(above, 'h').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  assert.equal(group(classify({ garages: [{ name: 'Patio', ventilation: 'Forzada', plazas: 9, area: 100 }] }), 'h').applies, false)
})

test('grupo i: local de pública concurrencia exige proyecto sin límite de potencia', () => {
  const classification = classify({ documentation: { publicConcurrence: true } })
  assert.equal(group(classification, 'i').applies, true)
  assert.equal(group(classification, 'i').requiresProject, true)
  assert.equal(group(classification, 'i').limit, 'sin límite')
  assert.equal(classification.verdict, 'proyecto', 'it applies with zero forecast power')
  assert.deepEqual(classification.decidingGroups, ['i'])

  assert.equal(group(classify({ documentation: { publicConcurrence: false } }), 'i').applies, false)
})

test('grupo j: máquinas de elevación y transporte y afines exigen proyecto sin límite de potencia', () => {
  const classification = classify({ documentation: { liftingMachines: true } })
  assert.equal(group(classification, 'j').applies, true)
  assert.equal(group(classification, 'j').requiresProject, true)
  assert.equal(group(classification, 'j').limit, 'sin límite de potencia')
  assert.equal(classification.verdict, 'proyecto')

  assert.equal(group(classify(), 'j').applies, false)
})

test('grupo k: alumbrado exterior por encima de 5 kW', () => {
  const atLimit = classify({ documentation: { outdoorLightingW: 5_000 } })
  assert.equal(group(atLimit, 'k').applies, true, 'a declared power applies even at the threshold')
  assert.equal(group(atLimit, 'k').value, 5_000)
  assert.equal(group(atLimit, 'k').limit, 5_000)
  assert.equal(group(atLimit, 'k').requiresProject, false, 'exactly 5 kW stays MTD')

  const above = classify({ documentation: { outdoorLightingW: 5_001 } })
  assert.equal(group(above, 'k').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  const absent = classify({ documentation: { outdoorLightingW: 0 } })
  assert.equal(group(absent, 'k').applies, false, 'zero outdoor lighting is not the group')
})

test('grupo l: locales con riesgo de incendio o explosión exigen proyecto', () => {
  const classification = classify({ documentation: { fireRisk: true } })
  assert.equal(group(classification, 'l').applies, true)
  assert.equal(group(classification, 'l').requiresProject, true)
  assert.equal(group(classification, 'l').limit, 'sin límite')
  assert.equal(classification.verdict, 'proyecto')

  assert.equal(group(classify(), 'l').applies, false)
})

test('grupo m: quirófanos y salas de intervención exigen proyecto', () => {
  const classification = classify({ documentation: { operatingRooms: true } })
  assert.equal(group(classification, 'm').applies, true)
  assert.equal(group(classification, 'm').requiresProject, true)
  assert.equal(group(classification, 'm').limit, 'sin límite')
  assert.equal(classification.verdict, 'proyecto')

  assert.equal(group(classify(), 'm').applies, false)
})

test('grupo n: piscinas y fuentes por encima de 5 kW', () => {
  const atLimit = classify({ documentation: { poolsW: 5_000 } })
  assert.equal(group(atLimit, 'n').applies, true)
  assert.equal(group(atLimit, 'n').value, 5_000)
  assert.equal(group(atLimit, 'n').requiresProject, false, 'exactly 5 kW stays MTD')

  const above = classify({ documentation: { poolsW: 5_001 } })
  assert.equal(group(above, 'n').requiresProject, true)
  assert.equal(above.verdict, 'proyecto')

  assert.equal(group(classify({ documentation: { poolsW: 0 } }), 'n').applies, false)
})

test('grupo z: recarga de vehículo eléctrico sin límite en modo 4', () => {
  const mode4 = classify({ documentation: { irveMode4: true } })
  assert.equal(group(mode4, 'z').applies, true)
  assert.equal(group(mode4, 'z').requiresProject, true, 'mode 4 has no power limit')
  assert.equal(mode4.verdict, 'proyecto')

  const outdoorAtLimit = classify({ irvePowerW: 10_000, documentation: { irveOutdoor: true } })
  assert.equal(group(outdoorAtLimit, 'z').applies, true)
  assert.equal(group(outdoorAtLimit, 'z').requiresProject, false, '10 kW outdoors stays MTD')

  const outdoorAbove = classify({ irvePowerW: 10_001, documentation: { irveOutdoor: true } })
  assert.equal(group(outdoorAbove, 'z').requiresProject, true)
  assert.equal(outdoorAbove.verdict, 'proyecto')

  const indoorAtLimit = classify({ irvePowerW: 50_000 })
  assert.equal(group(indoorAtLimit, 'z').requiresProject, false, 'exactly 50 kW indoors stays MTD')

  const indoorAbove = classify({ irvePowerW: 50_001 })
  assert.equal(group(indoorAbove, 'z').requiresProject, true)
  assert.equal(indoorAbove.verdict, 'proyecto')

  assert.equal(group(classify(), 'z').applies, false, 'no EV data is not the group')
})

test('§4: sin ningún grupo aplicable la instalación exige MTD', () => {
  const classification = classify({ totalW: 10_000 })

  assert.deepEqual(classification.groups.map(entry => entry.id), GROUP_IDS, 'every group of the table is published')
  assert.equal(classification.verdict, 'memoria-tecnica')
  assert.deepEqual(classification.decidingGroups, [])
  for (const entry of classification.groups) {
    assert.equal(entry.applies, false, `group ${entry.id} does not apply to an empty declaration`)
    assert.equal(entry.requiresProject, false, `group ${entry.id} does not require a project`)
    assert.equal(typeof entry.title, 'string')
    assert.match(entry.source, /^ITC-BT-04 §3\.1 /)
  }
  assert.equal(classification.source, 'ITC-BT-04 §3 y §4')
})

test('§3.3: cuando varios grupos aplican gana el criterio más exigente', () => {
  const classification = classify({
    totalW: 15_000,
    homes: 2,
    documentation: { dampLocales: true, outdoorLightingW: 6_000 },
  })

  assert.equal(group(classification, 'e').applies, true, 'group e applies but stays below its limit')
  assert.equal(group(classification, 'e').requiresProject, false)
  assert.equal(group(classification, 'b').requiresProject, true)
  assert.equal(group(classification, 'k').requiresProject, true)
  assert.deepEqual(classification.decidingGroups, ['b', 'k'], 'every project-requiring group is named')
  assert.equal(classification.verdict, 'proyecto')
  assert.equal(classification.source, 'ITC-BT-04 §3 y §4')
})

test('normalizeDocumentation completa huecos y coacciona los valores', () => {
  assert.deepEqual(normalizeDocumentation(undefined), DEFAULT_DOCUMENTATION)
  assert.deepEqual(normalizeDocumentation(null), DEFAULT_DOCUMENTATION)
  assert.deepEqual(normalizeDocumentation('no es un objeto'), DEFAULT_DOCUMENTATION)

  const malformed = normalizeDocumentation({
    outdoorLightingW: -5_000,
    poolsW: Number.NaN,
    publicConcurrence: 'sí',
    fireRisk: 1,
    dampLocales: 0,
    operatingRooms: null,
    temporary: 'false',
    irveOutdoor: true,
  })
  assert.equal(malformed.outdoorLightingW, 0, 'a negative power falls back to zero')
  assert.equal(malformed.poolsW, 0, 'NaN falls back to zero')
  assert.equal(malformed.publicConcurrence, true, 'a flag is coerced to Boolean')
  assert.equal(malformed.fireRisk, true)
  assert.equal(malformed.dampLocales, false)
  assert.equal(malformed.operatingRooms, false)
  assert.equal(malformed.temporary, true, 'a non-empty string is truthy')
  assert.equal(malformed.irveOutdoor, true)
  assert.equal(malformed.wetLocales, false, 'a missing flag keeps its default')
  assert.equal(malformed.liftingMachines, false)
  assert.equal(malformed.irveMode4, false)

  const fractional = normalizeDocumentation({ outdoorLightingW: 4_500.5 })
  assert.equal(fractional.outdoorLightingW, 4_500.5, 'a finite power is kept as given')

  const normalized = normalizeDocumentation({})
  normalized.outdoorLightingW = 9_999
  assert.equal(DEFAULT_DOCUMENTATION.outdoorLightingW, 0, 'the defaults are never mutated')
})

/* ---------------------------------------------------------------- persistencia */

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries))

  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

const forecastInputs = {
  housing: [
    { level: 'Básica', power: 5_750, homes: 2, area: 90 },
    { level: 'Elevada', power: 9_200, homes: 1, area: 120 },
  ],
  locals: [
    { name: 'Nave', type: 'Industria', area: 100, real: 25_000 },
    { name: 'Oficina', type: 'Comercial/oficina', area: 40, real: 0 },
  ],
  garages: [{ name: 'Sótano', ventilation: 'Forzada', area: 120, plazas: 12 }],
  elevators: [{ name: 'Ascensor', ita: 'ITA-1', power: 4_000, unit: 'W' }],
  motors: [{ name: 'Motor', power: 2, unit: 'CV' }],
  otherLoads: [{ name: 'Otras', power: 500 }],
  lighting: [{ id: 'portal', area: 30, lamp: 'Fluorescencia/LED', power: 0 }],
  parking: 12,
  irveOption: 2,
}

const declaredDocumentation = {
  outdoorLightingW: 6_000,
  poolsW: 7_500,
  publicConcurrence: true,
  fireRisk: false,
  operatingRooms: false,
  dampLocales: true,
  wetLocales: false,
  temporary: false,
  liftingMachines: false,
  irveOutdoor: true,
  irveMode4: false,
}

test('la documentación viaja con la previsión: guardar y cargar', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...forecastInputs, documentation: declaredDocumentation })

  const loaded = loadCalculatorInputs(storage)
  assert.notEqual(loaded, null)
  assert.deepEqual(loaded.documentation, declaredDocumentation, 'every declared value survives a reload')
  const { documentation, ...forecast } = loaded
  assert.deepEqual(forecast, forecastInputs, 'the load forecast is untouched by the documentation block')
})

test('la documentación viaja con la previsión: exportar e importar', () => {
  const parsed = readProjectExport(JSON.stringify({
    projectInfo: {},
    inputs: { ...forecastInputs, documentation: declaredDocumentation },
  }))

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.project.inputs.documentation, declaredDocumentation, 'the JSON export keeps the block')
  const { documentation, ...forecast } = parsed.project.inputs
  assert.deepEqual(forecast, forecastInputs, 'the exported load forecast is untouched')

  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, parsed.project.inputs)
  assert.deepEqual(loadCalculatorInputs(storage).documentation, declaredDocumentation, 'an imported project reloads its block')
})

test('la documentación ausente se completa con los valores por defecto', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, forecastInputs)
  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.equal('documentation' in snapshot, false, 'an absent block is not written')

  assert.deepEqual(
    normalizeDocumentation(loadCalculatorInputs(storage).documentation),
    DEFAULT_DOCUMENTATION,
    'an older snapshot opens with the default documentation',
  )

  assert.equal(readProjectExport(JSON.stringify({ inputs: forecastInputs })).ok, true, 'an older export still imports')
  assert.deepEqual(
    normalizeDocumentation(readProjectExport(JSON.stringify({ inputs: forecastInputs })).project.inputs.documentation),
    DEFAULT_DOCUMENTATION,
    'an older export opens with the default documentation',
  )

  storage.setItem(CALCULATOR_INPUTS_STORAGE_KEY, JSON.stringify({ version: 1, ...forecastInputs }))
  assert.deepEqual(
    normalizeDocumentation(loadCalculatorInputs(storage).documentation),
    DEFAULT_DOCUMENTATION,
    'a v1 snapshot still loads',
  )
})

test('una documentación incompleta se completa sin perder el proyecto', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, { ...forecastInputs, documentation: { outdoorLightingW: 6_000, dampLocales: true } })
  const loaded = loadCalculatorInputs(storage)
  assert.deepEqual(loaded.documentation, {
    ...DEFAULT_DOCUMENTATION,
    outdoorLightingW: 6_000,
    dampLocales: true,
  }, 'the missing fields are defaulted and the declared ones survive')

  const parsed = readProjectExport(JSON.stringify({
    inputs: { ...forecastInputs, documentation: { outdoorLightingW: -5_000, poolsW: 'mucho', publicConcurrence: 'sí' } },
  }))
  assert.equal(parsed.ok, true, 'a malformed field never discards the whole project')
  assert.deepEqual(parsed.project.inputs.documentation, {
    ...DEFAULT_DOCUMENTATION,
    publicConcurrence: true,
  }, 'the block is normalised field by field')
})

test('una previsión sin datos de documentación no se guarda como proyecto', () => {
  const storage = createMemoryStorage()

  saveCalculatorInputs(storage, {
    housing: [], locals: [], garages: [], elevators: [], motors: [], otherLoads: [],
    parking: 0, irveOption: 1, documentation: { ...DEFAULT_DOCUMENTATION },
  })
  assert.equal(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY), null, 'the default block is not project data')
})

test('S8: la documentación no alimenta la previsión ni la potencia total', () => {
  const component = readFileSync(new URL('../components/load-calculator.tsx', import.meta.url), 'utf8')
  const totalMemo = component.slice(component.indexOf('const result = useMemo'), component.indexOf('}, [housing'))

  assert.ok(totalMemo.length > 0, 'the load forecast memo is found')
  assert.doesNotMatch(totalMemo, /documentation/, 'the total never reads the documentation block')
})
