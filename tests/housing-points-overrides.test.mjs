import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_POINTS, POINT_CIRCUITS, applyPointOverrides, totalPoints } from '../lib/housing-points.mjs'
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

test('an override replaces the computed minimum of its circuit and nothing else', () => {
  const base = totalPoints(rooms)
  const result = applyPointOverrides(base, { C2: 41 })

  assert.equal(result.totals.C2, 41, 'the edited number is the number of points')
  assert.deepEqual(
    POINT_CIRCUITS.filter(circuit => circuit !== 'C2').map(circuit => result.totals[circuit]),
    POINT_CIRCUITS.filter(circuit => circuit !== 'C2').map(circuit => base.totals[circuit]),
    'the other circuits keep their computed minimum',
  )
  assert.deepEqual(result.overridden, ['C2'], 'the result names the circuits the user edited')
  assert.equal(result.totalPoints, base.totalPoints - base.totals.C2 + 41)
  assert.equal(result.minimums.C2, base.totals.C2, 'the computed minimum stays available for the reset')
})

test('zero is a real number of points, not a missing override', () => {
  const base = totalPoints(rooms)
  const result = applyPointOverrides(base, { C5: 0 })

  assert.equal(result.totals.C5, 0, 'installing no points is allowed')
  assert.equal(result.requiredCircuits.C5, 0, 'a circuit without points needs no circuit')
  assert.deepEqual(result.overridden, ['C5'], 'zero counts as an override')
  assert.equal(result.totalPoints, base.totalPoints - base.totals.C5)
})

test('invalid entries are ignored and leave the minimum in place', () => {
  const base = totalPoints(rooms)
  const result = applyPointOverrides(base, {
    C1: -3,
    C2: Number.NaN,
    C3: '4',
    C4: null,
    C5: 2.5,
    C8: undefined,
    ZZ: 5,
  })

  assert.deepEqual(result.totals, base.totals, 'nothing valid was edited')
  assert.deepEqual(result.requiredCircuits, base.requiredCircuits)
  assert.equal(result.totalPoints, base.totalPoints)
  assert.deepEqual(result.overridden, [], 'no circuit is flagged as edited')
})

test('the circuits each count needs follow the same rule as totalPoints', () => {
  const base = totalPoints(rooms)
  const result = applyPointOverrides(base, { C1: 0, C2: 41, C3: 0, C4: 6, C5: 4 })

  assert.equal(result.requiredCircuits.C1, 0, 'no light points need no C1 circuit')
  assert.equal(result.requiredCircuits.C2, 3, '41 sockets do not fit in two C2 circuits (20 each)')
  assert.equal(result.requiredCircuits.C2, Math.ceil(41 / MAX_POINTS.C2), 'the table 1 cap decides the count')
  assert.equal(result.requiredCircuits.C4, 2, 'six points need two C4 circuits (three each)')
  assert.equal(result.requiredCircuits.C5, 1, 'four points still fit in one C5 circuit')
  for (const circuit of POINT_CIRCUITS) {
    const max = MAX_POINTS[circuit]
    assert.equal(result.requiredCircuits[circuit], max == null ? 0 : Math.ceil(result.totals[circuit] / max), `${circuit} uses the shared rule`)
  }
})

test('without overrides the result is identical to totalPoints', () => {
  const base = totalPoints(rooms)
  for (const overrides of [undefined, {}, null]) {
    const result = applyPointOverrides(base, overrides)
    assert.deepEqual(result.totals, base.totals)
    assert.deepEqual(result.requiredCircuits, base.requiredCircuits)
    assert.equal(result.totalPoints, base.totalPoints)
    assert.deepEqual(result.overridden, [])
  }
})

test('totalPoints keeps its previous numbers when no override is used', () => {
  const result = totalPoints(rooms)
  assert.deepEqual(result.totals, { C1: 8, C2: 12, C3: 1, C4: 3, C5: 4, C8: 0, C9: 0, C10: 0, C13: 0 })
  assert.deepEqual(result.requiredCircuits, { C1: 1, C2: 1, C3: 1, C4: 1, C5: 1, C8: 0, C9: 0, C10: 0, C13: 0 })
  assert.equal(result.totalPoints, 28)
})

test('the per-dwelling interior merges the override map', () => {
  const resolved = resolveInterior(5750, { ...baseInterior, pointsOverride: { C2: 41, C5: 0 } })
  assert.deepEqual(resolved.pointsOverride, { C2: 41, C5: 0 }, 'the project value survives the merge')
  assert.equal(resolveInterior(5750, baseInterior).pointsOverride, undefined, 'an older project has no override')
})

test('the autosave keeps the override and restores it', () => {
  const storage = createMemoryStorage()
  const interior = { ...baseInterior, pointsOverride: { C2: 41 } }

  saveCalculatorInputs(storage, projectInputs([dwellingDerivation(interior)]))

  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.deepEqual(snapshot.derivations[0].interior.pointsOverride, { C2: 41 }, 'the snapshot stores the edited points')
  assert.deepEqual(loadCalculatorInputs(storage).derivations[0].interior.pointsOverride, { C2: 41 }, 'the restore reads it back')
})

test('an older saved project without the field still loads', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, projectInputs([dwellingDerivation(baseInterior)]))

  const restored = loadCalculatorInputs(storage)
  assert.equal(restored.derivations[0].interior.pointsOverride, undefined, 'no field, no override')
  assert.equal(applyPointOverrides(totalPoints(restored.derivations[0].interior.rooms)).totals.C2, 12, 'the minimum decides the number')
})

test('the JSON export round-trips the override', () => {
  const interior = { ...baseInterior, pointsOverride: { C2: 41, C1: 0 } }
  const text = JSON.stringify({ exportedAt: '2026-11-03T00:00:00.000Z', projectInfo: {}, inputs: projectInputs([dwellingDerivation(interior)]), settings: {} })

  const result = readProjectExport(text)
  assert.equal(result.ok, true, 'the exported project is valid')
  assert.deepEqual(result.project.inputs.derivations[0].interior.pointsOverride, { C2: 41, C1: 0 })
})

test('an imported override that is not a non-negative integer is rejected', () => {
  const interior = { ...baseInterior, pointsOverride: { C2: -4 } }
  const text = JSON.stringify({ inputs: projectInputs([dwellingDerivation(interior)]), projectInfo: {} })

  assert.equal(readProjectExport(text).ok, false, 'the file is refused instead of importing a negative number of points')
})

test('the dwelling card lets the user edit the points of each circuit', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /const points = totalPoints\(rooms, pointFlags\)/, 'the minimum still comes from the shared rules')
  assert.match(panel, /applyPointOverrides\(points, /, 'the card applies the project overrides on top of the minimum')
  assert.match(panel, /Puntos previstos/, 'the header says the value is the number to install, not only the minimum')
  assert.match(panel, /mínimo que sale de las estancias/, 'the card explains where the starting number comes from')
  assert.match(panel, /aria-label=\{`Puntos · \$\{circuit\} · \$\{POINT_CIRCUIT_LABELS\[circuit\]\}`\}/, 'the input names its circuit and its label')
  assert.match(panel, /type="number" min="0" step="1"/, 'the points are a non-negative whole number')
  assert.match(panel, /Volver al mínimo calculado · \$\{circuit\}/, 'the reset affordance is labelled per circuit')
  assert.match(panel, /mínimo calculado/, 'the reset affordance is visible')
  assert.match(panel, /effectivePoints\.requiredCircuits\[circuit\]/, 'the circuit count reacts to the edited number')
  assert.match(panel, /pointsOverride/, 'the edit travels through the interior patch')
})

test('the regulatory cap of table 1 stays read-only', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /Máx\. por circuito \(tabla 1\)/, 'the cap is still labelled as the table limit')
  assert.match(panel, /\{MAX_POINTS\[circuit\] \?\? '—'\}/, 'the cap is printed as text')
  assert.doesNotMatch(panel, /<Input[^\n]*MAX_POINTS/, 'the cap is never an input')
  assert.doesNotMatch(panel, /setPointOverride\(circuit, MAX_POINTS/, 'the cap is never the edited value')
})

test('the didactic walkthrough keeps explaining the table 2 minimum', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /explainHousingPoints\(rooms, points, pointFlags\)/, 'the walkthrough derives the minimum, not the installed points')
})

test('the report and the PDF print the installed points, not only the minimum', () => {
  const calc = read('components/load-calculator.tsx')
  const rows = calc.slice(calc.indexOf('const housingPointReportRows'), calc.indexOf('const buildReport'))
  assert.match(rows, /applyPointOverrides\(totalPoints\(interior\.rooms \?\? \[\], /, 'the report rows carry the points the project installs')
  assert.match(rows, /interior\.pointsOverride\)/, 'the override map of the dwelling reaches the report')
  assert.match(rows, /String\(points\.totals\[circuit\]\)/, 'the row still prints one column per circuit')
})

test('the persisted interior accepts the override map and rejects bad values', () => {
  const storage = read('lib/calculator-storage.mjs')
  assert.match(storage, /value\.pointsOverride == null/, 'an interior without the field stays valid')
  assert.match(storage, /isPointOverride\(value\.pointsOverride\)/, 'the override map is validated')
  assert.match(storage, /function isPointOverride/, 'the validation has a single home')
})
