import assert from 'node:assert/strict'
import test from 'node:test'
import { NORMATIVE_REGISTRY } from '../lib/normative-tables.mjs'
import { classifyInspection } from '../lib/inspection.mjs'

test('the registry declares the ITC-BT-05 §4.1 inspection groups a to h', () => {
  const entry = NORMATIVE_REGISTRY['inspection.initial']
  assert.equal(entry.source, 'ITC-BT-05 §4.1')
  assert.deepEqual(Object.keys(entry.values.groups), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
})

test('an installation that meets no group is not subject to initial inspection', () => {
  const result = classifyInspection({
    totalW: 6690,
    localTypes: [],
    irvePowerW: 0,
    documentation: {},
    requiresProject: false,
  })
  assert.equal(result.verdict, 'sin-inspeccion')
  assert.deepEqual(result.decidingGroups, [])
})

test('public concurrence is inspected with no power limit', () => {
  const result = classifyInspection({
    totalW: 100,
    localTypes: [],
    irvePowerW: 0,
    documentation: { publicConcurrence: true },
    requiresProject: false,
  })
  assert.equal(result.verdict, 'inspeccion')
  assert.deepEqual(result.decidingGroups, ['b'])
})

test('fire-risk class I locals are inspected regardless of power', () => {
  const result = classifyInspection({
    totalW: 100,
    localTypes: [],
    irvePowerW: 0,
    documentation: { fireRisk: true },
    requiresProject: false,
  })
  assert.equal(result.verdict, 'inspeccion')
  assert.deepEqual(result.decidingGroups, ['c'])
})

test('wet locals are inspected when the installed power exceeds 25 kW, not at the limit', () => {
  const at = classifyInspection({
    totalW: 25_000,
    localTypes: [],
    irvePowerW: 0,
    documentation: { wetLocales: true },
    requiresProject: false,
  })
  assert.equal(at.verdict, 'sin-inspeccion')
  const over = classifyInspection({
    totalW: 25_001,
    localTypes: [],
    irvePowerW: 0,
    documentation: { wetLocales: true },
    requiresProject: false,
  })
  assert.deepEqual(over.decidingGroups, ['d'])
})

test('pools are inspected above 10 kW, not at the limit', () => {
  const at = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 0,
    documentation: { poolsW: 10_000 },
    requiresProject: false,
  })
  assert.equal(at.verdict, 'sin-inspeccion')
  const over = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 0,
    documentation: { poolsW: 10_001 },
    requiresProject: false,
  })
  assert.deepEqual(over.decidingGroups, ['e'])
})

test('operating rooms are inspected with no power limit', () => {
  const result = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 0,
    documentation: { operatingRooms: true },
    requiresProject: false,
  })
  assert.deepEqual(result.decidingGroups, ['f'])
})

test('outdoor lighting is inspected above 5 kW, not at the limit', () => {
  const at = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 0,
    documentation: { outdoorLightingW: 5_000 },
    requiresProject: false,
  })
  assert.equal(at.verdict, 'sin-inspeccion')
  const over = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 0,
    documentation: { outdoorLightingW: 5_001 },
    requiresProject: false,
  })
  assert.deepEqual(over.decidingGroups, ['g'])
})

test('industrial installations need both a project and more than 100 kW installed', () => {
  const noProject = classifyInspection({
    totalW: 200_000,
    localTypes: ['Industria'],
    irvePowerW: 0,
    documentation: {},
    requiresProject: false,
  })
  assert.equal(noProject.verdict, 'sin-inspeccion')
  const notIndustrial = classifyInspection({
    totalW: 200_000,
    localTypes: ['Comercial/oficina'],
    irvePowerW: 0,
    documentation: {},
    requiresProject: true,
  })
  assert.equal(notIndustrial.verdict, 'sin-inspeccion')
  const at = classifyInspection({
    totalW: 100_000,
    localTypes: ['Industria'],
    irvePowerW: 0,
    documentation: {},
    requiresProject: true,
  })
  assert.equal(at.verdict, 'sin-inspeccion')
  const over = classifyInspection({
    totalW: 100_001,
    localTypes: ['Industria'],
    irvePowerW: 0,
    documentation: {},
    requiresProject: true,
  })
  assert.deepEqual(over.decidingGroups, ['a'])
})

test('EV charging stations are inspected when the project verdict already applies', () => {
  const noProject = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 7360,
    documentation: {},
    requiresProject: false,
  })
  assert.equal(noProject.verdict, 'sin-inspeccion')
  const withProject = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 7360,
    documentation: {},
    requiresProject: true,
  })
  assert.deepEqual(withProject.decidingGroups, ['h'])
})

test('several groups can decide at once and the verdict reports all of them', () => {
  const result = classifyInspection({
    totalW: 30_000,
    localTypes: [],
    irvePowerW: 0,
    documentation: { publicConcurrence: true, poolsW: 20_000 },
    requiresProject: false,
  })
  assert.equal(result.verdict, 'inspeccion')
  assert.deepEqual(result.decidingGroups, ['b', 'e'])
})

test('every row carries its ITC-BT-05 §4.1 source', () => {
  const result = classifyInspection({
    totalW: 0,
    localTypes: [],
    irvePowerW: 0,
    documentation: { publicConcurrence: true },
    requiresProject: false,
  })
  for (const row of result.groups) {
    assert.match(row.source, /ITC-BT-05 §4\.1 [a-h]/)
  }
})
