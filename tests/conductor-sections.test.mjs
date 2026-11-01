import assert from 'node:assert/strict'
import test from 'node:test'
import { lgaNeutralSection, protectiveSection } from '../lib/conductor-sections.mjs'

test('the LGA neutral follows ITC-BT-14 tabla 1', () => {
  const expected = {
    10: 10, 16: 10, 25: 16, 35: 16, 50: 25, 70: 35,
    95: 50, 120: 70, 150: 70, 185: 95, 240: 120,
  }
  for (const [phase, neutral] of Object.entries(expected)) {
    assert.equal(lgaNeutralSection(Number(phase)), neutral, `phase ${phase} mm2`)
  }
})

test('aluminium keeps 16 mm2 for a 16 mm2 phase', () => {
  assert.equal(lgaNeutralSection(16, 'aluminium'), 16, 'the guide lists 16 (Al) -> 16 (Al)')
  assert.equal(lgaNeutralSection(25, 'aluminium'), 16)
  assert.equal(lgaNeutralSection(120, 'aluminium'), 70, 'the table is material independent above 16')
})

test('sections outside the table fall back to the rule, never to zero', () => {
  assert.equal(lgaNeutralSection(300), 150, 'above 240 mm2 the neutral is half, rounded up')
  assert.equal(lgaNeutralSection(400), 240, 'half of 400 is 200, the next nominal is 240')
  assert.equal(lgaNeutralSection(null), null, 'no phase section, no neutral')
  assert.equal(lgaNeutralSection(0), null, 'zero is not a section')
  assert.equal(lgaNeutralSection(6), 10, 'below the table the smallest published floor applies')
})

test('the protective conductor follows ITC-BT-18 tabla 2', () => {
  assert.equal(protectiveSection(10), 10)
  assert.equal(protectiveSection(16), 16)
  assert.equal(protectiveSection(25), 16)
  assert.equal(protectiveSection(35), 16)
  assert.equal(protectiveSection(50), 25)
  assert.equal(protectiveSection(120), 60)
})
