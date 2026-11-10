import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_POINTS, ROOM_TYPES, roomPoints, totalPoints } from '../lib/housing-points.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

test('the room list covers the table 2 uses', () => {
  assert.deepEqual(ROOM_TYPES, ['acceso', 'vestibulo', 'salon', 'dormitorio', 'bano', 'pasillo', 'cocina', 'terraza', 'garaje'])
})

test('the salon and the bedroom follow surface', () => {
  const small = roomPoints({ type: 'salon', area: 8, length: 0 })
  assert.equal(small.C1, 1)
  assert.equal(small.C2, 3, 'the minimum is three sockets')

  const large = roomPoints({ type: 'salon', area: 24, length: 0 })
  assert.equal(large.C1, 2, 'more than 10 m² needs two light points')
  assert.equal(large.C2, 4, 'one socket per 6 m², rounded up')

  const bedroom = roomPoints({ type: 'dormitorio', area: 12, length: 0 })
  assert.equal(bedroom.C1, 2)
  assert.equal(bedroom.C2, 3, '12 m² still need the three minimum sockets')
})

test('heating, cooling and dryer only count when the dwelling has them', () => {
  const salon = { type: 'salon', area: 20, length: 0 }
  const without = roomPoints(salon)
  const withSystems = roomPoints(salon, { hasHeating: true, hasCooling: true })
  assert.equal(without.C8, 0)
  assert.equal(without.C9, 0)
  assert.equal(withSystems.C8, 2, 'more than 10 m² need two heating points')
  assert.equal(withSystems.C9, 2)

  const kitchen = roomPoints({ type: 'cocina', area: 8, length: 0 }, { hasDryer: true })
  assert.equal(kitchen.C10, 1, 'the dryer adds its socket')
  assert.equal(roomPoints({ type: 'cocina', area: 8, length: 0 }).C10, 0)
})

test('the kitchen, the bathroom and the corridor carry their own minimums', () => {
  const kitchen = roomPoints({ type: 'cocina', area: 8, length: 0 })
  assert.deepEqual(
    { C1: kitchen.C1, C2: kitchen.C2, C3: kitchen.C3, C4: kitchen.C4, C5: kitchen.C5 },
    { C1: 1, C2: 2, C3: 1, C4: 3, C5: 3 },
  )

  const bathroom = roomPoints({ type: 'bano', area: 5, length: 0 }, { hasHeating: true })
  assert.equal(bathroom.C1, 1)
  assert.equal(bathroom.C5, 1)
  assert.equal(bathroom.C8, 1)

  const corridor = roomPoints({ type: 'pasillo', area: 0, length: 12 })
  assert.equal(corridor.C1, 3, 'one light every 5 m')
  assert.equal(corridor.C2, 2, 'more than 5 m needs two sockets')
})

test('the garage adds the EV point only with the EV case', () => {
  assert.equal(roomPoints({ type: 'garaje', area: 15, length: 0 }).C13, 0)
  assert.equal(roomPoints({ type: 'garaje', area: 15, length: 0 }, { hasIrve: true }).C13, 1)
})

test('the totals feed the number of circuits each one needs', () => {
  const rooms = [
    { type: 'salon', area: 24, length: 0 },
    { type: 'dormitorio', area: 12, length: 0 },
    { type: 'dormitorio', area: 12, length: 0 },
    { type: 'bano', area: 5, length: 0 },
    { type: 'cocina', area: 10, length: 0 },
  ]
  const result = totalPoints(rooms)
  assert.equal(result.totals.C1, 2 + 2 + 2 + 1 + 1)
  assert.equal(result.totals.C2, 4 + 3 + 3 + 0 + 2)
  assert.equal(result.requiredCircuits.C2, 1, '12 sockets fit in one C2 circuit')
  assert.equal(result.requiredCircuits.C3, 1)
  assert.equal(MAX_POINTS.C1, 30)
  assert.equal(result.requiredCircuits.C8, 0, 'a circuit without a fixed cap is not counted')
})

test('the dwelling card shows the rooms and the point summary', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /<Table aria-label="Estancias de la vivienda"/, 'the rooms table exists')
  assert.match(panel, /Estancias y puntos de utilización · ITC-BT-25 §4/, 'the section cites the instruction')
  assert.match(panel, /totalPoints\(rooms, pointFlags\)/, 'the summary comes from the shared rules')
  assert.match(panel, /aria-label=\{`Puntos · \$\{circuit\.id\}/, 'the points are editable in the circuits table')
  assert.match(panel, /Añadir estancia/, 'rooms can be added')
  assert.match(panel, /Superficie de la vivienda/, 'the card shows the dwelling surface')
  assert.match(panel, /Suma de estancias/, 'the card sums the rooms')
  assert.match(panel, /Excedida en/, 'the card flags when the rooms exceed the dwelling')
  assert.match(panel, /dwelling\.housingAreaM2/, 'the surface comes from the housing row')
  assert.match(panel, />Máx\. puntos</, 'the maximum keeps its own read-only column')
  assert.match(panel, /\{circuit\.note &&/, 'each circuit prints its own note, including why C8 and C9 have no cap')
  assert.match(panel, /explanationMode === 'didactic' && <CalculationSteps/, 'the didactic mode explains the DGMP and the points')
  const calc = read('components/load-calculator.tsx')
  assert.match(calc, /title: '11\. Circuitos de vivienda · ITC-BT-25'/, 'the report carries the dwelling circuits')
  assert.match(calc, /title: '12\. Estancias de vivienda · ITC-BT-25 §4'/, 'the report carries the rooms')
  assert.match(calc, /title: '13\. Puntos por vivienda · mínimos y declarados · ITC-BT-25 §4'/, 'the report carries the points')
  assert.match(calc, /'14\. Puntos por vivienda · mínimos y declarados · ITC-BT-25 §4'/, 'the PDF carries the points page')
})
