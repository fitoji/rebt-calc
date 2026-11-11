import assert from 'node:assert/strict'
import test from 'node:test'
import { NORMATIVE_REGISTRY } from '../lib/normative-tables.mjs'

test('T2 normative values live in cited registry entries', () => {
  assert.equal(NORMATIVE_REGISTRY['housing.power'].source, 'ITC-BT-10 §2.2; ITC-BT-25 §§2.1, 3')
  assert.deepEqual(NORMATIVE_REGISTRY['housing.power'].values.steps, [
    ['Básica', 5750, 25], ['Básica', 7360, 32], ['Elevada', 9200, 40],
    ['Elevada', 11500, 50], ['Elevada', 14490, 63],
  ])
  assert.equal(NORMATIVE_REGISTRY['housing.power'].values.voltageV, 230)
  assert.equal(NORMATIVE_REGISTRY['simultaneity.dwellings'].source, 'ITC-BT-10 §3.1, tabla 1')
  assert.equal(NORMATIVE_REGISTRY['voltage-drop.enlace'].source, 'ITC-BT-14 §3; ITC-BT-15 §3')
  assert.equal(NORMATIVE_REGISTRY['differential.housing'].source, 'ITC-BT-25 §§2.1, 2.3.2')
})

test('registry T2 exports retain the existing public values', async () => {
  const { HOUSING_POWER_STEPS, ITC_BT_10_COEFFICIENTS } = await import('../lib/normative-tables.mjs')
  assert.deepEqual(HOUSING_POWER_STEPS, NORMATIVE_REGISTRY['housing.power'].values.steps)
  assert.deepEqual(ITC_BT_10_COEFFICIENTS, NORMATIVE_REGISTRY['simultaneity.dwellings'].values.coefficients)
})

test('load densities, interior drops, and C8/C9 limits are registered with precise scope', () => {
  assert.deepEqual(NORMATIVE_REGISTRY['loads.commercial'].values, { powerPerM2W: 100, minimumSupplyPowerW: 3450, simultaneity: 1 })
  assert.deepEqual(NORMATIVE_REGISTRY['loads.garage'].values, { naturalPowerPerM2W: 10, forcedPowerPerM2W: 20, minimumSupplyPowerW: 3450, simultaneity: 1 })
  assert.equal(NORMATIVE_REGISTRY['loads.industry-concentration'].source, 'ITC-BT-10 §4.2')
  assert.equal(NORMATIVE_REGISTRY['loads.industry-specific-default'].values.powerPerM2W, 125)
  assert.match(NORMATIVE_REGISTRY['loads.industry-specific-default'].source, /Project default/)
  assert.deepEqual(NORMATIVE_REGISTRY['voltage-drop.interior'].values, {
    dwelling: 3, lighting: 3, other: 5, industryOwnTransformerLighting: 4.5, industryOwnTransformerOther: 6.5,
  })
  assert.deepEqual(NORMATIVE_REGISTRY['housing.circuit-limits'].values, { C8: 5750, C9: 5750, maxDropPercent: 3 })
  assert.match(NORMATIVE_REGISTRY['service-load.project-defaults'].source, /Project criteria/)
})

test('T3 classification rules and thresholds live in the cited normative registry', () => {
  const entry = NORMATIVE_REGISTRY['documentation.classification']
  assert.equal(entry.source, 'ITC-BT-04 §3.1')
  assert.deepEqual(Object.keys(entry.values.groups), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'z'])
  assert.deepEqual(
    Object.fromEntries(Object.entries(entry.values.groups).filter(([, rule]) => rule.limitW).map(([id, rule]) => [id, rule.limitW])),
    { a: 20_000, b: 10_000, c: 10_000, d: 50_000, e: 100_000, f: 50_000, k: 5_000, n: 5_000 },
  )
  assert.deepEqual(entry.values.groups.h.limitSpaces, 5)
  assert.deepEqual(
    [entry.values.groups.z.irveIndoorLimitW, entry.values.groups.z.irveOutdoorLimitW, entry.values.groups.z.irveMode4Unconditional],
    [50_000, 10_000, true],
  )
})
