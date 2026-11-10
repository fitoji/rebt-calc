import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HOUSING_CIRCUIT_TABLE, circuitPowerW, housingCircuitSizing, housingCircuitsFor } from '../lib/housing-circuits.mjs'
import { resolveInterior } from '../lib/interior-installation.mjs'
import { CALCULATOR_INPUTS_STORAGE_KEY, loadCalculatorInputs, readProjectExport, saveCalculatorInputs } from '../lib/calculator-storage.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

/** The same dwelling the shared rules are already tested with: C1 8, C2 12, C3 1, C4 3, C5 4. */
const rooms = [
  { type: 'salon', area: 24, length: 0 },
  { type: 'dormitorio', area: 12, length: 0 },
  { type: 'dormitorio', area: 12, length: 0 },
  { type: 'bano', area: 5, length: 0 },
  { type: 'cocina', area: 10, length: 0 },
]

const line = {
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
  sectionOverride: 0,
}

const projectInputs = (derivations) => ({
  housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }],
  locals: [],
  garages: [],
  elevators: [],
  motors: [],
  otherLoads: [],
  parking: 0,
  irveOption: 1,
  derivations,
})

const dwellingDerivation = interior => ({
  ...line,
  id: 'dwelling-0-0',
  kind: 'dwelling',
  label: 'Vivienda 1',
  sourceKey: 'housing:0',
  system: 'single-phase',
  interior,
})

const baseInterior = {
  contractedPowerW: 5750,
  circuits: 5,
  hasSurge: false,
  rooms: rooms.map((room, index) => ({ id: `room-${index}`, ...room })),
}

function createMemoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  }
}

test('a circuit without table power declares the manual power and nothing while it is empty', () => {
  assert.equal(circuitPowerW('C8'), null, 'an empty field declares no power')
  assert.equal(circuitPowerW('C8', {}), null)
  assert.equal(circuitPowerW('C8', { C8: 3000 }), 3000, 'the typed power is the declared power')
  assert.equal(circuitPowerW('C9', { C9: 4500 }), 4500)
  assert.equal(circuitPowerW('C13', { C13: 7400 }), 7400)
  assert.equal(circuitPowerW('C11', { C11: 2300 }), 2300)
})

test('a table power is never replaced by a manual value', () => {
  assert.equal(circuitPowerW('C1', { C1: 9999 }), 200, 'C1 keeps the table power')
  assert.equal(circuitPowerW('C2', { C2: 1 }), 3450, 'C2 keeps the table power')
  assert.equal(circuitPowerW('C3', { C3: 1 }), 5400)
  assert.equal(circuitPowerW('C4', { C4: 1 }), 3450)
  assert.equal(circuitPowerW('C5', { C5: 1 }), 3450)
  assert.equal(circuitPowerW('C10', { C10: 1 }), 3450)

  for (const circuit of HOUSING_CIRCUIT_TABLE) {
    const declared = circuitPowerW(circuit.id, { [circuit.id]: 1 })
    if (circuit.powerPerPointW == null) {
      assert.equal(declared, 1, `${circuit.id} has no table power: the manual value is what it declares`)
    } else {
      assert.equal(declared, circuit.powerPerPointW, `${circuit.id} declares its published power`)
    }
    assert.equal(circuitPowerW(circuit.id), circuit.powerPerPointW, `${circuit.id} is unchanged without an override`)
  }
})

test('invalid manual values are ignored', () => {
  assert.equal(circuitPowerW('C8', { C8: -1 }), null, 'a negative power is not a power')
  assert.equal(circuitPowerW('C9', { C9: Number.NaN }), null)
  assert.equal(circuitPowerW('C13', { C13: Number.POSITIVE_INFINITY }), null)
  assert.equal(circuitPowerW('C11', { C11: '2300' }), null, 'a string is not a power')
  assert.equal(circuitPowerW('C8', { C8: null }), null)
  assert.equal(circuitPowerW('C8', { C9: 4500 }), null, 'the override belongs to its own circuit')
  assert.equal(circuitPowerW('ZZ', { ZZ: 1000 }), null, 'an unknown circuit declares no power')
  assert.equal(circuitPowerW('C1', { C8: 3000 }), 200, 'an override of another circuit does not reach C1')
})

test('the declared power does not touch the sizing of the circuit', () => {
  const c8 = housingCircuitsFor(9200).find(circuit => circuit.id === 'C8')
  assert.ok(c8)
  assert.equal(circuitPowerW('C8', { C8: 5750 }), 5750, 'the manual power is declared')

  const sizing = housingCircuitSizing(c8, 20)
  assert.equal(c8.breakerA, 25, 'the PIA of table 1 stays')
  assert.equal(sizing.tableSection, 6, 'the section of table 1 stays')
  assert.equal(c8.tube, 25, 'the tube of table 1 stays')
  assert.equal(c8.powerPerPointW, null, 'the roster keeps the table power, not the manual one')
})

test('zero is a declared value, not a missing override', () => {
  assert.equal(circuitPowerW('C8', { C8: 0 }), 0, 'zero is a number the validator accepts')
})

test('the per-dwelling interior merges the manual power map', () => {
  const resolved = resolveInterior(5750, { ...baseInterior, circuitPowerOverride: { C8: 3000, C9: 4500 } })
  assert.deepEqual(resolved.circuitPowerOverride, { C8: 3000, C9: 4500 }, 'the project value survives the merge')
  assert.equal(resolveInterior(5750, baseInterior).circuitPowerOverride, undefined, 'an older project has no override')
  assert.equal(circuitPowerW('C8', resolved.circuitPowerOverride), 3000, 'the merged map is what the table reads')
})

test('the autosave keeps the manual power and restores it', () => {
  const storage = createMemoryStorage()
  const interior = { ...baseInterior, circuitPowerOverride: { C8: 3000 } }

  saveCalculatorInputs(storage, projectInputs([dwellingDerivation(interior)]))

  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.deepEqual(snapshot.derivations[0].interior.circuitPowerOverride, { C8: 3000 }, 'the snapshot stores the typed power')
  assert.deepEqual(loadCalculatorInputs(storage).derivations[0].interior.circuitPowerOverride, { C8: 3000 }, 'the restore reads it back')
})

test('an older saved project without the field still loads', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, projectInputs([dwellingDerivation(baseInterior)]))

  const restored = loadCalculatorInputs(storage)
  assert.equal(restored.derivations[0].interior.circuitPowerOverride, undefined, 'no field, no manual power')
  assert.equal(circuitPowerW('C8', restored.derivations[0].interior.circuitPowerOverride), null, 'C8 declares no power')
})

test('the JSON export round-trips the manual power', () => {
  const interior = { ...baseInterior, circuitPowerOverride: { C8: 3000, C13: 7400 } }
  const text = JSON.stringify({ exportedAt: '2026-11-03T00:00:00.000Z', projectInfo: {}, inputs: projectInputs([dwellingDerivation(interior)]), settings: {} })

  const result = readProjectExport(text)
  assert.equal(result.ok, true, 'the exported project is valid')
  assert.deepEqual(result.project.inputs.derivations[0].interior.circuitPowerOverride, { C8: 3000, C13: 7400 })
})

test('an imported manual power that is negative or not a number is rejected', () => {
  const negative = JSON.stringify({ inputs: projectInputs([dwellingDerivation({ ...baseInterior, circuitPowerOverride: { C8: -3000 } })]), projectInfo: {} })
  const text = JSON.stringify({ inputs: projectInputs([dwellingDerivation({ ...baseInterior, circuitPowerOverride: { C8: '3000' } })]), projectInfo: {} })

  assert.equal(readProjectExport(negative).ok, false, 'the file is refused instead of importing a negative power')
  assert.equal(readProjectExport(text).ok, false, 'the file is refused instead of importing a string')
})

test('the dwelling card lets the user type the power of the circuits the table leaves open', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /\{circuit\.powerPerPointW != null\s*\n?\s*\?\s*`\$\{fmt\(circuit\.powerPerPointW\)\} W`/, 'a circuit with table power prints the plain number')
  assert.match(panel, /Potencia manual · \$\{circuit\.id\} · \$\{circuit\.name\}/, 'the input names its circuit for screen readers')
  assert.match(panel, /aria-label=\{`Potencia manual[\s\S]{0,200}type="number" min="0"/, 'the manual power is a non-negative number input')
  assert.match(panel, /circuitPowerW\(circuit\.id, inputs\.circuitPowerOverride\)/, 'the cell shows the declared power, manual when present')
  assert.match(panel, /circuitPowerOverride/, 'the edit travels through the interior patch')
  assert.doesNotMatch(panel, /value=\{circuit\.powerPerPointW\}/, 'the table power is never the edited value')
})

test('the circuits with a table power keep their plain value', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /fmt\(circuit\.powerPerPointW\)/, 'the table power is printed as text')
  assert.doesNotMatch(panel, /<Input[^\n]*powerPerPointW/, 'the table power is never an input')
  assert.doesNotMatch(panel, /HOUSING_CIRCUIT_TABLE[\s\S]{0,200}<Input/, 'the published table stays read-only')
})

test('the card reuses the note of each circuit instead of repeating the regulatory maximum', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /\{circuit\.note &&/, 'each circuit still prints its own note')
  assert.match(panel, /la nota de cada circuito/, 'the hint points at the note instead of copying it')
  assert.equal((panel.match(/5\.750 W/g) ?? []).length, 1, 'the 5.750 W cap is written once')
})

test('the report keeps its columns and the sizing keeps the table values', () => {
  const calc = read('components/load-calculator.tsx')
  const rows = calc.slice(calc.indexOf('const housingCircuitReportRows'), calc.indexOf('const housingRoomReportRows'))
  assert.match(rows, /circuit\.breakerA/, 'the PIA of the report is the table value')
  assert.match(rows, /housingCircuitSizing\(circuit, lengthM\)/, 'the sizing of the report is unchanged')
  assert.match(calc, /title: '11\. Circuitos de vivienda · ITC-BT-25',\s*\n\s*columns: \['Vivienda', 'Circuito', 'PIA', 'Sección', 'Longitud', 'Caída'\]/, 'no power column is invented in the report')
})

test('the persisted interior validates the manual power map like the points map', () => {
  const storage = read('lib/calculator-storage.mjs')
  assert.match(storage, /value\.circuitPowerOverride == null/, 'an interior without the field stays valid')
  assert.match(storage, /isCircuitPowerOverride\(value\.circuitPowerOverride\)/, 'the map is validated')
  assert.match(storage, /function isCircuitPowerOverride/, 'the validation has a single home')
})
