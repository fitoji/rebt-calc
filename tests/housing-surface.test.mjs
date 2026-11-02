import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')

test('P1 keeps its own formula: the dwelling surface never enters the power', () => {
  assert.match(calc, /const housingPower = housing\.reduce\(\(sum, row\) => sum \+ row\.power \* Math\.max\(0, row\.homes\), 0\)/, 'installed power is power × dwellings')
  assert.match(calc, /const p1 = average \* cs/, 'P1 is still the average power times the simultaneity coefficient')
  assert.doesNotMatch(calc, /housingPower[^\n]*row\.area/, 'the surface is never added to the installed power')
})

test('the built surface multiplies the per-dwelling area by the number of dwellings', () => {
  assert.match(
    calc,
    /const dwellingArea = housing\.reduce\(\(sum, row\) => sum \+ Math\.max\(0, row\.area \|\| 0\) \* Math\.max\(0, row\.homes\), 0\)/,
    'a row of ten 90 m² dwellings counts 900 m²',
  )
  assert.match(calc, /Superficie construida · informativo/, 'the total is labelled as informative')
})

test('every housing row records the surface of one dwelling', () => {
  assert.match(calc, /M² \/ Vivienda/, 'the column header is per dwelling, not per row')
  assert.match(calc, /aria-label=\{`Superficie \(m²\/viv\.\) · Vivienda \$\{i \+ 1\}`\}/, 'the desktop table exposes the field')
  assert.match(calc, /aria-label="Superficie \(m²\/viv\.\)"/, 'the mobile card exposes the field')
})
