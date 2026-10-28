import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  previewGaragePower,
  previewLightingPower,
  previewLocalPower,
  sumGaragePowers,
  sumLightingPowers,
  sumLocalPowers,
} from '../lib/load-previews.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')

const defaults = {
  localPowerPerM2: 100,
  minimumSupplyPower: 3450,
  forcedGaragePowerPerM2: 20,
  naturalGaragePowerPerM2: 10,
  portalLightPowerPerM2: 15,
  portalLightLedPowerPerM2: 8,
  stairLightPowerPerM2: 7,
  stairLightLedPowerPerM2: 4,
  dischargeLampCoefficient: 1.8,
  industrialPowerPerM2: 125,
  industrialMinimumSupplyPower: 10350,
}

const edited = {
  localPowerPerM2: 150,
  minimumSupplyPower: 5000,
  forcedGaragePowerPerM2: 30,
  naturalGaragePowerPerM2: 12,
  portalLightPowerPerM2: 20,
  portalLightLedPowerPerM2: 10,
  stairLightPowerPerM2: 9,
  stairLightLedPowerPerM2: 6,
  dischargeLampCoefficient: 2,
  industrialPowerPerM2: 150,
  industrialMinimumSupplyPower: 12000,
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

test('lighting preview follows the ITC-BT-10 guide densities', () => {
  assert.equal(previewLightingPower({ id: 'portal', area: 100, lamp: 'Incandescencia', power: 0 }, defaults), 1500, 'portal incandescent uses 15 W/m2 without a coefficient')
  assert.equal(previewLightingPower({ id: 'portal', area: 100, lamp: 'Fluorescencia/LED', power: 0 }, defaults), 1440, 'portal discharge lamps use 8 W/m2 x 1,8')
  assert.equal(previewLightingPower({ id: 'stair', area: 50, lamp: 'Incandescencia', power: 0 }, defaults), 350, 'stair incandescent uses 7 W/m2 without a coefficient')
  assert.equal(previewLightingPower({ id: 'stair', area: 50, lamp: 'Fluorescencia/LED', power: 0 }, defaults), 360, 'stair discharge lamps use 4 W/m2 x 1,8')
})

test('a declared installed power wins over the surface estimate', () => {
  assert.equal(previewLightingPower({ id: 'portal', area: 100, lamp: 'Fluorescencia/LED', power: 900 }, defaults), 1620, 'declared power replaces the W/m2 estimate')
  assert.equal(previewLightingPower({ id: 'known', area: 500, lamp: 'Fluorescencia/LED', power: 1500 }, defaults), 2700, 'known power ignores the row area')
  assert.equal(previewLightingPower({ id: 'known', area: 500, lamp: 'Incandescencia', power: 1500 }, defaults), 1500, 'incandescent lamps take no 1,8 factor')
  assert.equal(previewLightingPower({ id: 'known', area: 0, lamp: 'Fluorescencia/LED', power: 0 }, defaults), 0, 'empty rows contribute nothing')
})

test('lighting preview follows edited settings instead of literals', () => {
  assert.equal(previewLightingPower({ id: 'portal', area: 100, lamp: 'Incandescencia', power: 0 }, edited), 2000, 'edited portal density replaces the hardcoded 15')
  assert.equal(previewLightingPower({ id: 'portal', area: 100, lamp: 'Fluorescencia/LED', power: 0 }, edited), 2000, 'edited portal LED density and coefficient apply')
  assert.equal(previewLightingPower({ id: 'stair', area: 100, lamp: 'Fluorescencia/LED', power: 0 }, edited), 1200, 'edited stair LED density and coefficient apply')
  assert.equal(previewLightingPower({ id: 'known', area: 0, lamp: 'Fluorescencia/LED', power: 1000 }, edited), 2000, 'edited discharge coefficient replaces the hardcoded 1,8')
})

test('lighting subtotal equals the sum of its row previews', () => {
  const lighting = [
    { id: 'portal', area: 30, lamp: 'Fluorescencia/LED', power: 0 },
    { id: 'stair', area: 40, lamp: 'Incandescencia', power: 0 },
    { id: 'known', area: 0, lamp: 'Fluorescencia/LED', power: 1500 },
  ]
  for (const settings of [defaults, edited]) {
    assert.equal(
      sumLightingPowers(lighting, settings),
      lighting.reduce((sum, row) => sum + previewLightingPower(row, settings), 0),
      'the lighting subtotal equals the rendered row previews',
    )
  }
})

test('industrial premises use their own density and minimum', () => {
  assert.equal(previewLocalPower({ type: 'Industria', area: 100, real: 0 }, defaults), 12500, 'industry uses 125 W/m2')
  assert.equal(previewLocalPower({ type: 'Industria', area: 20, real: 0 }, defaults), 10350, 'industry minimum is 10350 W')
  assert.equal(previewLocalPower({ type: 'Comercial/oficina', area: 100, real: 0 }, defaults), 10000, 'commercial keeps 100 W/m2')
  assert.equal(previewLocalPower({ type: 'Industria', area: 200, real: 30000 }, defaults), 30000, 'declared industrial demand wins over estimates')
  assert.equal(previewLocalPower({ type: 'Industria', area: 0, real: 0 }, defaults), 0, 'an empty industrial row contributes nothing')
})

test('industrial settings are editable', () => {
  assert.equal(previewLocalPower({ type: 'Industria', area: 100, real: 0 }, edited), 15000, 'edited industrial density replaces the hardcoded 125')
  assert.equal(previewLocalPower({ type: 'Industria', area: 50, real: 0 }, edited), 12000, 'edited industrial minimum replaces the hardcoded 10350')
  assert.equal(previewLocalPower({ type: 'Comercial/oficina', area: 100, real: 0 }, edited), 15000, 'commercial settings are independent')
})

test('mixed premises sum commercial and industrial rows', () => {
  const locals = [
    { type: 'Comercial/oficina', area: 50, real: 0 },
    { type: 'Industria', area: 100, real: 0 },
    { type: 'Industria', area: 0, real: 0 },
  ]
  assert.equal(sumLocalPowers(locals, defaults), 5000 + 12500, 'P3 adds both uses with their own rules')
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
  assert.match(calc, /fmt\(previewLightingPower\(row, settings\)\)/, 'lighting rows render the shared preview')
  assert.match(calc, /sumLightingPowers\(lighting, settings\)/, 'P2 uses the shared lighting sum')
  assert.doesNotMatch(calc, /row\.area \* 100/, 'no hardcoded 100 W/m2 in the rows')
  assert.doesNotMatch(calc, /row\.area \? 3450 : 0/, 'no hardcoded 3450 W minimum in the rows')
  assert.doesNotMatch(calc, /'Forzada' \? 20 : 10/, 'no hardcoded garage W/m2 in the rows')
})
