import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  UNIFILAR_LAYOUT,
  busEndX,
  columnX,
  diagramWidth,
  differentialsFor,
  kindColor,
  kindInk,
  kindLabel,
  polesFor,
  shortCable,
  truncateLabel,
} from '../lib/unifilar.mjs'

test('the cable is labelled with the designation the reader knows', () => {
  assert.equal(shortCable('RZ1-K 0,6/1 kV'), 'RZ1-K', 'the LGA keeps only its family')
  assert.equal(shortCable('ES07Z1-K 450/750 V'), 'ES07Z1-K', 'the DI keeps only its family')
  assert.equal(shortCable('H07V-K'), 'H07V-K', 'an unknown designation is printed as it is')
  assert.equal(shortCable(''), '—', 'a line without a result has no cable')
  assert.equal(shortCable(null), '—', 'a missing cable is a dash, not "null"')
})

test('poles follow the system, not the load', () => {
  assert.equal(polesFor('single-phase'), '2P')
  assert.equal(polesFor('three-phase'), '4P')
})

test('a long load label is cut before it leaves its box', () => {
  assert.equal(truncateLabel('Vivienda 1'), 'Vivienda 1', 'a short label is untouched')
  assert.equal(truncateLabel('Recarga de vehículos eléctricos'), 'Recarga de vehí…', 'a long label is cut')
  assert.equal(truncateLabel('Recarga de vehículos eléctricos').length, 16, 'the cut respects the box width')
  assert.equal(truncateLabel(''), '', 'an empty label stays empty')
})

test('the sheet grows with the derivations instead of compressing them', () => {
  assert.equal(diagramWidth(0), UNIFILAR_LAYOUT.minWidth, 'an empty project keeps the minimum width')
  assert.ok(diagramWidth(1) >= UNIFILAR_LAYOUT.minWidth, 'one derivation does not shrink below the minimum')
  assert.equal(diagramWidth(12) - diagramWidth(8), UNIFILAR_LAYOUT.colWidth * 4, 'each derivation adds one column')
  assert.equal(columnX(0), UNIFILAR_LAYOUT.firstColumn, 'the first derivation opens the row')
  assert.equal(columnX(3) - columnX(2), UNIFILAR_LAYOUT.colWidth, 'columns are evenly spaced')
})

test('the busbar ends on the last tap, or on a stub when there is none', () => {
  assert.equal(busEndX(0), UNIFILAR_LAYOUT.lgaX + 18, 'without derivations the busbar is a stub')
  assert.equal(busEndX(1), columnX(0) + 12, 'one tap sets the end')
  assert.equal(busEndX(4), columnX(3) + 12, 'the last tap sets the end')
})

test('the differential is the one the consumer board requires', () => {
  assert.deepEqual(
    differentialsFor({ kind: 'dwelling', powerW: 9200, housingIgaA: 40, interior: { circuits: 10 } }),
    { differentials: 2, sensitivityMa: 30 },
    'ten circuits need two 30 mA differentials',
  )
  assert.deepEqual(
    differentialsFor({ kind: 'dwelling', powerW: 5750, housingIgaA: 25 }),
    { differentials: 1, sensitivityMa: 30 },
    'a dwelling without interior data keeps the basic five-circuit default',
  )
  assert.deepEqual(
    differentialsFor({ kind: 'local', powerW: 10350 }),
    { differentials: 1, sensitivityMa: 30 },
    'a local takes the ITC-BT-24 protection',
  )
  assert.deepEqual(
    differentialsFor({ kind: 'irve', powerW: 20000 }),
    { differentials: 1, sensitivityMa: 30 },
    'the EV charger also takes the ITC-BT-24 protection',
  )
})

test('every derivation kind has a label and a colour, including a manual one', () => {
  for (const kind of ['dwelling', 'local', 'common-services', 'garage', 'irve', 'custom']) {
    assert.ok(kindLabel(kind).length > 0, `${kind} has a label`)
    assert.match(kindColor(kind), /^var\(--kind-[a-z-]+\)$/, `${kind} paints with its own token, never a hex literal`)
    assert.match(kindInk(kind), /^var\(--kind-[a-z-]+-ink\)$/, `${kind} writes with its own ink token`)
  }
  assert.equal(kindLabel('unknown'), 'Manual', 'an unknown kind falls back to the manual label')
  assert.equal(kindColor(undefined), 'var(--kind-custom)', 'a missing kind still paints')
  assert.equal(kindInk(undefined), 'var(--kind-custom-ink)', 'a missing kind still writes')
})

test('the six kinds never share a colour: the plan is read by category', () => {
  const kinds = ['dwelling', 'local', 'common-services', 'garage', 'irve', 'custom']
  assert.equal(new Set(kinds.map(kindColor)).size, kinds.length, 'each kind has its own line colour')
  assert.equal(new Set(kinds.map(kindInk)).size, kinds.length, 'each kind has its own label colour')
  assert.equal(kindColor('dwelling'), 'var(--kind-dwelling)')
  assert.equal(kindInk('dwelling'), 'var(--kind-dwelling-ink)')
})

test('the categorical tokens are declared for both themes', () => {
  // El plano se lee igual en modo didáctico y cálculo, así que estos tokens no
  // viven en los bloques de modo: solo en :root y .dark.
  const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
  const blocks = [
    ['light', css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')))],
    ['dark', css.slice(css.indexOf('.dark {'), css.indexOf('\n}', css.indexOf('.dark {')))],
  ]

  for (const [theme, block] of blocks) {
    for (const token of ['dwelling', 'local', 'common', 'garage', 'irve', 'custom']) {
      assert.match(block, new RegExp(`--kind-${token}: #`), `${theme} declares --kind-${token}`)
      assert.match(block, new RegExp(`--kind-${token}-ink: #`), `${theme} declares --kind-${token}-ink`)
    }
  }
})
