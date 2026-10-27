import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  previewGaragePower,
  previewLocalPower,
  sumGaragePowers,
  sumLocalPowers,
} from '../lib/load-previews.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')

const defaults = {
  localPowerPerM2: 100,
  minimumSupplyPower: 3450,
  forcedGaragePowerPerM2: 20,
  naturalGaragePowerPerM2: 10,
}

const edited = {
  localPowerPerM2: 150,
  minimumSupplyPower: 5000,
  forcedGaragePowerPerM2: 30,
  naturalGaragePowerPerM2: 12,
}

test('locals preview keeps the historical defaults', () => {
  assert.equal(previewLocalPower({ area: 50, real: 0 }, defaults), 5000, 'area x 100 wins over the minimum')
  assert.equal(previewLocalPower({ area: 10, real: 0 }, defaults), 3450, 'minimum supply power floors small premises')
  assert.equal(previewLocalPower({ area: 5, real: 9000 }, defaults), 9000, 'declared real demand wins over surface estimates')
  assert.equal(previewLocalPower({ area: 0, real: 0 }, defaults), 0, 'empty area contributes nothing, not the minimum')
})

test('locals preview follows edited settings instead of literals', () => {
  assert.equal(previewLocalPower({ area: 20, real: 0 }, edited), 5000, 'edited minimum replaces the hardcoded 3450')
  assert.equal(previewLocalPower({ area: 40, real: 0 }, edited), 6000, 'edited power per m2 replaces the hardcoded 100')
  assert.notEqual(
    previewLocalPower({ area: 20, real: 0 }, edited),
    previewLocalPower({ area: 20, real: 0 }, defaults),
    'settings must change the row preview',
  )
})

test('garage preview keeps the historical defaults', () => {
  assert.equal(previewGaragePower({ area: 300, ventilation: 'Forzada' }, defaults), 6000, 'forced ventilation uses 20 W/m2')
  assert.equal(previewGaragePower({ area: 400, ventilation: 'Natural' }, defaults), 4000, 'natural ventilation uses 10 W/m2')
  assert.equal(previewGaragePower({ area: 100, ventilation: 'Forzada' }, defaults), 3450, 'minimum supply power floors small garages')
  assert.equal(previewGaragePower({ area: 0, ventilation: 'Forzada' }, defaults), 0, 'empty area contributes nothing')
})

test('garage preview follows edited settings instead of literals', () => {
  assert.equal(previewGaragePower({ area: 200, ventilation: 'Forzada' }, edited), 6000, 'edited forced W/m2 replaces the hardcoded 20')
  assert.equal(previewGaragePower({ area: 500, ventilation: 'Natural' }, edited), 6000, 'edited natural W/m2 replaces the hardcoded 10')
  assert.notEqual(
    previewGaragePower({ area: 100, ventilation: 'Forzada' }, edited),
    previewGaragePower({ area: 100, ventilation: 'Forzada' }, defaults),
    'settings must change the row preview',
  )
})

test('helpers reproduce the previous literal formula exactly at default settings', () => {
  const legacyLocal = row => Math.max(row.real || 0, row.area * 100, row.area ? 3450 : 0)
  const legacyGarage = row => Math.max(row.area * (row.ventilation === 'Forzada' ? 20 : 10), row.area ? 3450 : 0)
  const areas = [0, 1, 10, 50, 172, 200, 400, 1000]

  for (const area of areas) {
    for (const real of [0, 1, 9000]) {
      const row = { area, real }
      assert.equal(previewLocalPower(row, defaults), legacyLocal(row), `locals match the legacy formula at area ${area}, real ${real}`)
    }
  }

  for (const ventilation of ['Forzada', 'Natural']) {
    for (const area of areas) {
      const row = { area, ventilation }
      assert.equal(previewGaragePower(row, defaults), legacyGarage(row), `garages match the legacy formula at area ${area}, ${ventilation}`)
    }
  }
})

test('row previews add up to the totals for the same settings', () => {
  const locals = [{ area: 20, real: 0 }, { area: 80, real: 0 }, { area: 0, real: 0 }]
  const garages = [
    { area: 100, ventilation: 'Forzada' },
    { area: 400, ventilation: 'Natural' },
  ]
  for (const settings of [defaults, edited]) {
    const localSum = sumLocalPowers(locals, settings)
    assert.equal(
      localSum,
      locals.reduce((sum, row) => sum + previewLocalPower(row, settings), 0),
      'P3 equals the sum of the rendered row previews',
    )
    const garageSum = sumGaragePowers(garages, settings)
    assert.equal(
      garageSum,
      garages.reduce((sum, row) => sum + previewGaragePower(row, settings), 0),
      'P4 equals the sum of the rendered row previews',
    )
  }
})

test('the calculator renders row previews through the shared helpers', () => {
  assert.match(calc, /from '\.\.\/lib\/load-previews\.mjs'/, 'calculator imports the preview helpers')
  assert.match(calc, /fmt\(previewLocalPower\(row, settings\)\)/, 'local rows render the shared preview')
  assert.match(calc, /fmt\(previewGaragePower\(row, settings\)\)/, 'garage rows render the shared preview')
  assert.match(calc, /sumLocalPowers\(locals, settings\)/, 'P3 uses the shared sum')
  assert.match(calc, /sumGaragePowers\(garages, settings\)/, 'P4 uses the shared sum')
  assert.doesNotMatch(calc, /row\.area \* 100/, 'no hardcoded 100 W/m2 in the rows')
  assert.doesNotMatch(calc, /row\.area \? 3450 : 0/, 'no hardcoded 3450 W minimum in the rows')
  assert.doesNotMatch(calc, /'Forzada' \? 20 : 10/, 'no hardcoded garage W/m2 in the rows')
})
