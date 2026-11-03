import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  CALCULATOR_INPUTS_STORAGE_KEY,
  NEW_PROJECT_STORAGE_KEY,
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
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

const line = {
  powerW: 9200,
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
  sectionOverride: 0,
}

const projectInfo = {
  companyName: 'Estudio',
  companyAddress: 'Calle 1',
  workAddress: 'Obra 2',
  phone: '600 000 000',
  email: 'obra@example.com',
  logo: 'data:image/png;base64,AAAA',
}

const inputs = {
  housing: [{ level: 'Básica', power: 5750, homes: 2, area: 90 }],
  locals: [{ name: 'Local', type: 'Comercial/oficina', area: 40, real: 0 }],
  garages: [{ name: 'Garaje', ventilation: 'Forzada', area: 120, plazas: 12 }],
  elevators: [{ name: 'Ascensor', ita: 'ITA-1', power: 4000, unit: 'W' }],
  motors: [{ name: 'Motor', power: 2, unit: 'CV' }],
  otherLoads: [{ name: 'Otra', power: 500 }],
  lighting: [{ id: 'portal', area: 30, lamp: 'Fluorescencia/LED', power: 0 }],
  installationType: 'partial',
  parking: 12,
  irveOption: 2,
  lga: { ...line, powerW: 40000, voltageV: 400 },
  lgaPowerMode: 'manual',
  di: line,
  derivations: [{ id: 'd0', kind: 'dwelling', label: 'Vivienda 1', sourceKey: 'housing:0', system: 'single-phase', ...line }],
}

/** The exact object `downloadJson` writes in `components/load-calculator.tsx`. */
const exportFile = overrides => ({
  exportedAt: '2026-11-03T00:00:00.000Z',
  projectInfo,
  inputs,
  settings: { basicHousingPower: 999999 },
  calculations: { total: 999999, marker: 'CALC-MARKER' },
  lines: { lga: { inputs: { ...line, powerW: 111111 }, result: { marker: 'LINES-MARKER' } }, di: { inputs: line, result: {} } },
  project: { summary: { marker: 'PROJECT-MARKER' } },
  ...overrides,
})

const wrap = value => JSON.stringify(exportFile({ inputs: value }))

test('S3: a malformed optional block rejects the file instead of dropping it', () => {
  const cases = {
    'one invalid derivation': { ...inputs, derivations: [{ id: 'd0' }] },
    'an invalid housing IGA on a derivation': { ...inputs, derivations: [{ ...inputs.derivations[0], housingIgaA: 0 }] },
    'a malformed LGA': { ...inputs, lga: { powerW: 'mucho' } },
    'a malformed DI layout': { ...inputs, di: { ...inputs.di, layout: 'nope' } },
    'a malformed lighting row': { ...inputs, lighting: [{ id: 'portal' }] },
    'an unknown installation type': { ...inputs, installationType: 'otra' },
    'an unknown power mode': { ...inputs, lgaPowerMode: 'manual?' },
  }

  for (const [name, variant] of Object.entries(cases)) {
    const parsed = readProjectExport(wrap(variant))

    assert.equal(parsed.ok, false, `${name} must reject the file`)
    assert.equal(parsed.project, undefined, `${name}: no half project is handed to the caller`)
  }
})

test('S3: an empty derivation list and absent optional blocks still load', () => {
  assert.equal(readProjectExport(wrap({ ...inputs, derivations: [] })).ok, true, 'an empty schedule is a valid schedule')

  const { lga, lgaPowerMode, di, derivations, lighting, installationType, ...forecastOnly } = inputs
  assert.equal(readProjectExport(wrap(forecastOnly)).ok, true, 'a file without the optional blocks loads the rest')
})

test('S2/S4: the JSON export round-trips inputs and projectInfo', () => {
  const parsed = readProjectExport(wrap(inputs))

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.project.inputs, inputs, 'every restored input field matches the exported one')

  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, parsed.project.inputs)
  assert.deepEqual(loadCalculatorInputs(storage), parsed.project.inputs, 'the restored inputs survive save+load')
})

test('S2: settings, calculations, lines and project never reach the restored project', () => {
  const parsed = readProjectExport(wrap(inputs))

  assert.deepEqual(Object.keys(parsed.project).sort(), ['inputs', 'projectInfo'])
  const wire = JSON.stringify(parsed.project)
  for (const marker of ['CALC-MARKER', 'LINES-MARKER', 'PROJECT-MARKER', '999999', '111111']) {
    assert.equal(wire.includes(marker), false, `${marker} must stay out`)
  }
  assert.equal('lga' in parsed.project.inputs, true, 'lga comes from inputs, not from lines')
  assert.equal(parsed.project.inputs.lga.powerW, 40000)
})

test('S3: rejection is all-or-nothing and never returns a partial project', () => {
  const cases = [
    '{"inputs": {',
    '',
    '   ',
    'null',
    '[]',
    JSON.stringify({ projectInfo: {} }),
    wrap(null),
    wrap({ ...inputs, housing: undefined }),
    wrap({ ...inputs, housing: [inputs.housing[0], { level: 'Media', power: 1, homes: 1, area: 1 }] }),
    wrap({ ...inputs, parking: -1 }),
    wrap({ ...inputs, irveOption: 4 }),
  ]
  const before = JSON.stringify(inputs)

  for (const text of cases) {
    const parsed = readProjectExport(text)

    assert.equal(parsed.ok, false, `must reject: ${text.slice(0, 40)}`)
    assert.equal(parsed.project, undefined, 'no project is handed to the caller')
    assert.equal(JSON.stringify(inputs), before, 'the current project is untouched')
  }
})

test('S3: empty, invalid JSON, no project data and invalid data have their own reason', () => {
  assert.equal(readProjectExport('').error, 'El archivo está vacío.')
  assert.equal(readProjectExport('   ').error, 'El archivo está vacío.')
  assert.equal(readProjectExport('{').error, 'El archivo no es un JSON válido.')
  assert.match(readProjectExport('{}').error, /no contiene los datos de un proyecto/i)
  assert.match(readProjectExport(wrap({ ...inputs, parking: -1 })).error, /no son válidos.*No se cargó nada/i)
})

test('S4: the required core is read the same way by the file and by localStorage', () => {
  const variants = [
    inputs,
    { ...inputs, lighting: [], installationType: 'single-user' },
    { ...inputs, housing: [{ level: 'Básica', power: 5750, homes: 1 }] },
    { ...inputs, garages: [{ name: 'G', ventilation: 'Natural', area: 30 }] },
    { ...inputs, housing: [{ level: 'Media', power: 1, homes: 1, area: 1 }] },
    { ...inputs, locals: [{ name: 'L', type: 'Oficina', area: 1, real: 0 }] },
    { ...inputs, elevators: [{ name: 'A', ita: 'ITA-9', power: 1, unit: 'W' }] },
    { ...inputs, motors: [{ name: 'M', power: 1, unit: 'kW' }] },
    { ...inputs, otherLoads: [{ name: 'O', power: '500' }] },
    { ...inputs, parking: -1 },
    { ...inputs, parking: '12' },
    { ...inputs, irveOption: 0 },
    { ...inputs, housing: {} },
  ]

  for (const variant of variants) {
    const file = readProjectExport(wrap(variant))
    const snapshot = loadCalculatorInputs(createMemoryStorage({
      [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({ ...variant, version: 2 }),
    }))

    assert.equal(file.ok, snapshot !== null, `file and snapshot disagree on: ${JSON.stringify(variant).slice(0, 80)}`)
  }
})

test('S4: an unreadable optional block is dropped by the snapshot and rejects the file', () => {
  const variants = [
    { ...inputs, installationType: 'otra' },
    { ...inputs, lgaPowerMode: 'manual?' },
    { ...inputs, lighting: [{ id: 'portal' }] },
    { ...inputs, lga: { powerW: 'mucho' } },
    { ...inputs, di: { ...inputs.di, layout: 'nope' } },
    { ...inputs, derivations: [{ id: 'd0' }] },
  ]

  for (const variant of variants) {
    const file = readProjectExport(wrap(variant))
    const snapshot = loadCalculatorInputs(createMemoryStorage({
      [CALCULATOR_INPUTS_STORAGE_KEY]: JSON.stringify({ ...variant, version: 2 }),
    }))

    assert.equal(file.ok, false, `the import rejects the file: ${JSON.stringify(variant).slice(0, 80)}`)
    assert.notEqual(snapshot, null, 'a saved project survives one unreadable block')
  }
})

test('S4: a file without derivations, lga or di loads the rest', () => {
  const { lga, lgaPowerMode, di, derivations, ...forecastOnly } = inputs
  const parsed = readProjectExport(wrap(forecastOnly))

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.project.inputs, forecastOnly)
})

test('S6: a loaded project retires the mark and reloads instead of the example', () => {
  const storage = createMemoryStorage({ [NEW_PROJECT_STORAGE_KEY]: '1' })
  setClearedProjectMark(storage, true)
  const parsed = readProjectExport(wrap(inputs))

  // Component order: retire the mark, then apply the inputs (persisted by the autosave effect).
  setClearedProjectMark(storage, false)
  saveCalculatorInputs(storage, parsed.project.inputs)

  assert.equal(marksClearedProject(storage), false, 'the cleared mark is retired')
  const restored = loadCalculatorInputs(storage) !== null
  assert.equal(restored, true)
  assert.equal(opensWithExample(storage, restored), false, 'a reload keeps the imported project')
})

const component = readFileSync(new URL('../components/load-calculator.tsx', import.meta.url), 'utf8')

test('S1: Cargar proyecto sits below Limpiar and opens a JSON-only, single-file picker', () => {
  const sidebar = component.split('\n').find(line => line.includes('border-t border-line pt-4'))

  assert.ok(sidebar, 'sidebar action stack exists')
  assert.ok(sidebar.indexOf('Cargar proyecto') > sidebar.indexOf('Limpiar'), 'button follows Limpiar')
  assert.match(sidebar, /projectFileInput\.current\?\.click\(\)/, 'button opens the picker')
  const field = component.match(/<Input ref=\{projectFileInput\}[^]*?\/>/)
  assert.ok(field, 'hidden file input bound to the ref')
  assert.match(field[0], /type="file"/)
  assert.match(field[0], /accept="application\/json,\.json"/)
  assert.match(field[0], /className="hidden"/)
  assert.match(field[0], /event\.target\.value = ''/, 'same file can be picked again')
  assert.doesNotMatch(component, /<input\b/, 'no native input')
})

test('S3/S5: the handler guards before applying and announces both outcomes', () => {
  const handler = component.slice(component.indexOf('const loadProjectFile'), component.indexOf('const lgaResult'))

  assert.ok(handler.indexOf('if (!parsed.ok)') < handler.indexOf('applyProject(parsed.project.inputs'), 'rejection returns before applying')
  assert.match(component, /role=\{projectLoad\.kind === 'error' \? 'alert' : 'status'\}/)
  assert.match(component, /Proyecto cargado desde \$\{file\.name\}\. Se reemplazó el proyecto anterior\./)
  assert.match(component, /message: parsed\.error/)
})

test('S6: applyProject retires the mark first and lets imported lines reach the snapshot', () => {
  const apply = component.slice(component.indexOf('const applyProject'), component.indexOf('const loadProjectFile'))

  assert.ok(apply.indexOf('setClearedProjectMark(window.localStorage, false)') < apply.indexOf('setHousing('))
  assert.match(apply, /setLineTouched\(inputs\.lga != null \|\| inputs\.di != null\)/)
  assert.match(component, /lga: lineTouched \? lga : null/)
  assert.match(component, /di: lineTouched \? di : null/)
})

test('S7/S8: the docs and the download hint name the load path', () => {
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
  const help = readFileSync(new URL('../components/help-doc.tsx', import.meta.url), 'utf8')

  assert.match(readme, /### Cargar un proyecto desde el JSON/)
  assert.match(readme, /\*\*Cargar proyecto\*\* reemplaza el proyecto/)
  assert.match(help, /<Section id="exportar"/)
  assert.match(help, /Cargar proyecto/)
  assert.doesNotMatch(component, /para retomarlos/)
  assert.match(component, /para volver a cargarlos con «Cargar proyecto»/)
})
