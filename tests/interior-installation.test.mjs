import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  CIRCUITS_PER_DIFFERENTIAL,
  DEFAULT_CIRCUITS,
  DEFAULT_INTERIOR,
  DIFFERENTIAL_SENSITIVITY_MA,
  defaultCircuitsFor,
  differentialsFor,
  evaluateInterior,
  icpCurrentFor,
  resolveInterior,
} from '../lib/interior-installation.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

test('the default circuit count follows the electrification grade', () => {
  assert.equal(DEFAULT_CIRCUITS.basic, 5)
  assert.equal(DEFAULT_CIRCUITS.elevated, 10)
  assert.equal(defaultCircuitsFor(5750), 5, 'básica 25 A')
  assert.equal(defaultCircuitsFor(7360), 5, 'básica 32 A')
  assert.equal(defaultCircuitsFor(9200), 10, 'elevada 40 A')
  assert.equal(defaultCircuitsFor(11500), 10, 'elevada 50 A')
  assert.equal(defaultCircuitsFor(14490), 10, 'elevada 63 A')
  assert.equal(defaultCircuitsFor(1234), 5, 'an unknown step falls back to the basic default')

  assert.deepEqual(resolveInterior(9200, undefined), { contractedPowerW: 0, circuits: 10, hasSurge: false, lengths: {}, rooms: [], hasHeating: false, hasCooling: false, hasDryer: false })
  assert.equal(resolveInterior(5750, null).circuits, 5)
  assert.equal(resolveInterior(9200, { contractedPowerW: 0, circuits: 0, hasSurge: false }).circuits, 0, 'an explicit zero is respected')
})

test('one differential for every five circuits, and never less than one', () => {
  assert.equal(CIRCUITS_PER_DIFFERENTIAL, 5)
  assert.equal(DIFFERENTIAL_SENSITIVITY_MA, 30)
  assert.equal(differentialsFor(0), 1, 'a dwelling always has at least one')
  assert.equal(differentialsFor(5), 1)
  assert.equal(differentialsFor(6), 2, 'the sixth circuit needs a second differential')
  assert.equal(differentialsFor(10), 2)
  assert.equal(differentialsFor(11), 3)
})

test('the ICP current comes from the contracted power, not from a made-up rating', () => {
  assert.equal(icpCurrentFor(0), null, 'without contracted power there is no current')
  assert.equal(icpCurrentFor(5750), 25, '5750 W at 230 V')
  assert.equal(icpCurrentFor(9200), 40, '9200 W at 230 V')
  assert.equal(icpCurrentFor(1000, { voltageV: 0 }), null, 'a zero voltage never divides')
})

test('a dwelling without a power step cannot fix the IGA', () => {
  const result = evaluateInterior({ igaA: null, powerW: 5750, ...DEFAULT_INTERIOR })
  assert.equal(result.igaA, null)
  assert.equal(result.maxPowerW, null)
  assert.match(result.problems.join(' '), /no se puede fijar el IGA/)
})

test('the IGA checks the forecast and the contracted power', () => {
  const ok = evaluateInterior({ igaA: 25, powerW: 5750, ...DEFAULT_INTERIOR })
  assert.equal(ok.maxPowerW, 5750)
  assert.deepEqual(ok.problems, [], '5750 W fits a 25 A IGA')

  const overForecast = evaluateInterior({ igaA: 25, powerW: 6000, ...DEFAULT_INTERIOR })
  assert.match(overForecast.problems.join(' '), /supera la potencia máxima admisible/)

  const overContracted = evaluateInterior({ igaA: 25, powerW: 5750, contractedPowerW: 7000, circuits: 6, hasSurge: false })
  assert.match(overContracted.problems.join(' '), /potencia contratada supera/)
})

test('the requirements follow ITC-BT-25 and ITC-BT-17', () => {
  const result = evaluateInterior({ igaA: 40, powerW: 9200, contractedPowerW: 8000, circuits: 11, hasSurge: true })
  const text = result.requirements.join(' ')

  assert.equal(result.differentials, 3)
  assert.equal(result.icpCurrentA, 8000 / 230)
  assert.match(text, /IGA omnipolar, independiente del ICP/)
  assert.match(text, /30 mA/)
  assert.match(text, /uno por cada 5 circuitos/)
  assert.match(text, /envolvente precintable/)
  assert.match(text, /ITC-BT-23/)
})

test('the tab, the panel and the report carry the interior installation', () => {
  const calc = read('components/load-calculator.tsx')
  const panel = read('components/interior-panel.tsx')
  const help = read('components/help-doc.tsx')

  assert.match(calc, /<TabsTrigger value="interiores"/, 'the tab exists')
  assert.match(calc, /<InteriorPanel/, 'the panel is rendered')
  assert.match(calc, /title: '9\. Instalaciones interiores · ITC-BT-25'/, 'the report has its section')
  assert.match(calc, /'10\. Instalaciones interiores · ITC-BT-25'/, 'the PDF has its page')
  assert.match(panel, /Requisitos|evaluation\.requirements/, 'the panel lists the requirements')
  assert.match(panel, /Potencia contratada/, 'the panel asks for the contracted power')
  assert.match(panel, /Circuitos instalados/, 'the panel asks for the circuit count')
  assert.match(panel, /aria-label="Vivienda anterior"/, 'the previous-dwelling button exists')
  assert.match(panel, /aria-label="Vivienda siguiente"/, 'the next-dwelling button exists')
  assert.match(panel, /ChevronLeft/, 'the previous button uses the left icon')
  assert.match(panel, /ChevronRight/, 'the next button uses the right icon')
  assert.match(panel, /dwellings\[currentIndex \+ delta\]/, 'the buttons move through the dwelling list')
  assert.match(panel, /disabled=\{currentIndex <= 0\}/, 'the first dwelling disables the previous button')
  assert.match(panel, /disabled=\{currentIndex >= dwellings\.length - 1\}/, 'the last dwelling disables the next button')
  assert.match(help, /id="interiores"/, 'the help explains the tab')
})
