import assert from 'node:assert/strict'
import test from 'node:test'
import { DIFFERENTIAL_TYPES, assignCircuit, normalizeDifferentials } from '../lib/differentials.mjs'

const basicIds = ['C1', 'C2', 'C3', 'C4', 'C5']
const elevatedIds = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10']

test('un proyecto antiguo migra su tipo único a un diferencial que cubre todos los circuitos', () => {
  const { devices, warnings } = normalizeDifferentials({ differentialType: 'A', circuitIds: basicIds, minimum: 1 })
  assert.equal(devices.length, 1)
  assert.equal(devices[0].id, 'D1')
  assert.equal(devices[0].type, 'A')
  assert.equal(devices[0].sensitivityMa, 30)
  assert.deepEqual(devices[0].circuits, basicIds)
  assert.deepEqual(warnings, [])
})

test('el tipo no declarado queda pendiente, nunca se inventa', () => {
  const { devices } = normalizeDifferentials({ circuitIds: basicIds, minimum: 1 })
  assert.equal(devices[0].type, null)
  assert.ok(DIFFERENTIAL_TYPES.includes('F'))
})

test('los diferenciales declarados nunca bajan del mínimo reglamentario', () => {
  const one = normalizeDifferentials({ circuitIds: elevatedIds, minimum: 2 })
  assert.equal(one.devices.length, 2, 'elevada con diez circuitos exige dos')

  const declared = normalizeDifferentials({
    differentials: [{ id: 'D1', type: 'A', sensitivityMa: 30, circuits: basicIds }],
    circuitIds: elevatedIds,
    minimum: 3,
  })
  assert.equal(declared.devices.length, 3, 'se completan hasta el mínimo')
  assert.deepEqual(declared.devices.map(device => device.id), ['D1', 'D2', 'D3'])
})

test('300 mA sólo vale para el diferencial selectivo de cabecera', () => {
  const { devices } = normalizeDifferentials({
    differentials: [
      { id: 'D1', type: 'A', sensitivityMa: 300, selective: true, circuits: [] },
      { id: 'D2', type: 'A', sensitivityMa: 300, selective: false, circuits: [] },
    ],
    circuitIds: basicIds,
    minimum: 2,
  })
  assert.equal(devices[0].sensitivityMa, 300)
  assert.equal(devices[1].sensitivityMa, 30, 'una rama no puede tener 300 mA')
})

test('un circuito pertenece a un solo diferencial', () => {
  const devices = [
    { id: 'D1', type: 'A', sensitivityMa: 30, selective: false, circuits: ['C1', 'C2'] },
    { id: 'D2', type: 'F', sensitivityMa: 30, selective: false, circuits: ['C3'] },
  ]
  const moved = assignCircuit(devices, 'D2', 'C2')
  assert.deepEqual(moved[0].circuits, ['C1'])
  assert.deepEqual(moved[1].circuits, ['C3', 'C2'])
  assert.deepEqual(devices[0].circuits, ['C1', 'C2'], 'no muta el original')
})

test('la recarga de vehículo eléctrico exige un diferencial dedicado y declaración explícita', () => {
  const circuitIds = [...basicIds, 'C13']
  const proposed = normalizeDifferentials({ circuitIds, minimum: 1 })
  const ev = proposed.devices.find(device => device.circuits.includes('C13'))
  assert.ok(ev, 'se propone un diferencial para C13')
  assert.equal(ev.type, 'A')
  assert.equal(ev.rdcDd, false)
  assert.ok(proposed.warnings.some(warning => /RDC-DD|tipo B/.test(warning)), 'aviso hasta declarar la protección')

  const withRdc = normalizeDifferentials({
    differentials: [
      { id: 'D1', type: 'A', sensitivityMa: 30, circuits: basicIds },
      { id: 'D2', type: 'A', sensitivityMa: 30, rdcDd: true, circuits: ['C13'] },
    ],
    circuitIds,
    minimum: 2,
  })
  assert.ok(!withRdc.warnings.some(warning => /RDC-DD|tipo B/.test(warning)))

  const typeB = normalizeDifferentials({
    differentials: [
      { id: 'D1', type: 'A', sensitivityMa: 30, circuits: basicIds },
      { id: 'D2', type: 'B', sensitivityMa: 30, circuits: ['C13'] },
    ],
    circuitIds,
    minimum: 2,
  })
  assert.ok(!typeB.warnings.some(warning => /RDC-DD|tipo B/.test(warning)))
})
