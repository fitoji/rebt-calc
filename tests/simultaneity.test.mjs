import assert from 'node:assert/strict'
import test from 'node:test'
import { getSimultaneityCoefficient } from '../lib/simultaneity.mjs'

test('uses the ITC-BT-10 simultaneity table and formula above 21 dwellings', () => {
  const expected = [
    1, 2, 3, 3.8, 4.6, 5.4, 6.2, 7, 7.8, 8.5, 9.2,
    9.9, 10.6, 11.3, 11.9, 12.5, 13.1, 13.7, 14.3, 14.8, 15.3,
  ]

  assert.equal(getSimultaneityCoefficient(0), 0)
  assert.throws(() => getSimultaneityCoefficient(-1), RangeError)
  assert.throws(() => getSimultaneityCoefficient(1.5), RangeError)
  expected.forEach((coefficient, index) => {
    assert.equal(getSimultaneityCoefficient(index + 1), coefficient, `dwellings: ${index + 1}`)
  })
  assert.equal(getSimultaneityCoefficient(22), 15.8)
  assert.equal(getSimultaneityCoefficient(30), 19.8)
})
