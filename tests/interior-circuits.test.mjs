import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BOARD_SERIES,
  INTERIOR_DROP_LIMITS,
  circuitInput,
  evaluateBoard,
  generalSwitchFor,
  sizeInteriorCircuit,
} from '../lib/interior-circuits.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const supply = {
  id: 'local-0',
  label: 'Local 1',
  system: 'single-phase',
  powerW: 3450,
  method: 'B1',
  insulation: 'PVC',
  installation: 'air',
  layout: 'embedded',
}

const circuit = { id: 'c1', description: 'Alumbrado', use: 'alumbrado', powerW: 500, lengthM: 12 }

test('the circuit input follows ITC-BT-19 and the supply', () => {
  const lighting = circuitInput(circuit, supply)
  assert.equal(lighting.role, 'interior')
  assert.equal(lighting.maxDropPercent, INTERIOR_DROP_LIMITS.alumbrado)
  assert.equal(lighting.maxDropPercent, 3)
  assert.equal(lighting.voltageV, 230)
  assert.equal(lighting.variant.loadedConductors, 2)
  assert.equal(lighting.gamma, 48, 'PVC uses γ at 70 °C')

  const socket = circuitInput({ ...circuit, use: 'otros' }, supply)
  assert.equal(socket.maxDropPercent, 5, 'other uses allow 5 %')

  const threePhase = circuitInput(circuit, { ...supply, system: 'three-phase', insulation: 'XLPE' })
  assert.equal(threePhase.voltageV, 400)
  assert.equal(threePhase.variant.loadedConductors, 3)
  assert.equal(threePhase.gamma, 44, 'XLPE uses γ at 90 °C')
})

test('a lighting circuit starts at the smallest commercial section', () => {
  const result = sizeInteriorCircuit(circuit, supply)
  assert.equal(result.finalSection, 1.5, '500 W over 12 m needs the 1.5 mm² minimum')
  assert.ok(result.dropPercent != null && result.dropPercent <= 3, 'the drop stays within 3 %')
  assert.ok(result.protection != null && result.protection >= result.ratedCurrent, 'Ib ≤ In')
})

test('a larger circuit grows the section', () => {
  const result = sizeInteriorCircuit({ ...circuit, use: 'otros', powerW: 3000, lengthM: 25 }, supply)
  assert.ok(result.finalSection != null && result.finalSection >= 1.5)
  assert.ok(result.dropPercent != null && result.dropPercent <= 5, 'the drop stays within 5 %')
})

test('the general switch is the first rating that covers the board current', () => {
  assert.equal(generalSwitchFor(0), 10)
  assert.equal(generalSwitchFor(15), 16)
  assert.equal(generalSwitchFor(16), 16)
  assert.equal(generalSwitchFor(16.1), 20)
  assert.equal(generalSwitchFor(5000), null, 'beyond the series there is no rating')
  assert.ok(BOARD_SERIES.includes(160))
})

test('the board adds its circuits and checks them against the supply power', () => {
  const board = evaluateBoard([circuit, { ...circuit, id: 'c2', use: 'otros', powerW: 1000 }], supply)
  assert.equal(board.totalPowerW, 1500)
  assert.equal(board.differentials, 1)
  assert.equal(board.sensitivityMa, 30)
  assert.deepEqual(board.problems, [])

  assert.equal(board.supplyIb, 3450 / 230, 'the supply current comes from its forecast power')
  assert.equal(board.supplySwitchA, 16, '15 A needs a 16 A general switch')
  assert.equal(board.supplyMaxPowerW, 16 * 230, 'the switch admits 230 × In')

  const threePhase = evaluateBoard([circuit], { ...supply, system: 'three-phase', powerW: 10_000 })
  assert.equal(threePhase.supplySwitchA, 16, '10 kW three-phase needs 16 A')
  assert.ok(threePhase.supplyMaxPowerW > 10_000)

  const over = evaluateBoard([{ ...circuit, powerW: 4000 }], supply)
  assert.match(over.problems.join(' '), /supera la potencia prevista del suministro/)

  const empty = evaluateBoard([], supply)
  assert.match(empty.problems.join(' '), /no tiene circuitos definidos/)
  assert.equal(empty.switchA, 10, 'an empty board still shows the smallest general switch')
  assert.equal(empty.supplySwitchA, 16, 'the supply switch is independent from the circuits')
})

test('the Cuadros tab hosts the circuits panel and the reports carry it', () => {
  const calc = read('components/load-calculator.tsx')
  assert.match(calc, /<TabsTrigger value="interiores"[^>]*>.*Cuadros<\/TabsTrigger>/, 'the tab is named Cuadros')
  assert.match(calc, /<InteriorCircuitsPanel/, 'the circuits panel is rendered')
  assert.match(calc, /title: '10\. Cuadros interiores de locales y servicios generales · ITC-BT-19'/, 'the report has its section')
  assert.match(calc, /'11\. Cuadros interiores de locales y servicios generales · ITC-BT-19'/, 'the PDF has its page')
  assert.match(read('components/interior-circuits-panel.tsx'), /Interruptor general/, 'the board summary shows the general switch')
  assert.match(read('components/interior-circuits-panel.tsx'), /Potencia prevista del suministro/, 'the card shows the supply forecast power')
  assert.match(read('components/interior-circuits-panel.tsx'), /IGA del suministro/, 'the card shows the supply IGA')
  assert.match(read('components/interior-circuits-panel.tsx'), /Caída máxima permitida/, 'the drop cell states the limit on hover')
  assert.match(read('components/interior-circuits-panel.tsx'), /text-danger/, 'an exceeding drop is painted red')
  assert.match(read('components/interior-circuits-panel.tsx'), /TriangleAlert/, 'an exceeding drop carries the warning icon')
  assert.match(read('components/interior-circuits-panel.tsx'), /INTERIOR_DROP_LIMITS\[circuit\.use\]/, 'the limit follows the circuit use')
  assert.match(read('components/interior-circuits-panel.tsx'), /explanationMode === 'didactic' && <CalculationSteps/, 'the didactic mode explains the board')

  const panel = read('components/interior-circuits-panel.tsx')
  assert.match(panel, /aria-label="Suministro anterior"/, 'the previous-supply button exists')
  assert.match(panel, /aria-label="Suministro siguiente"/, 'the next-supply button exists')
  assert.match(panel, /supplies\[currentIndex \+ delta\]/, 'the buttons move through the supply list')
  assert.match(panel, /disabled=\{currentIndex <= 0\}/, 'the first supply disables the previous button')
  assert.match(panel, /disabled=\{currentIndex >= supplies\.length - 1\}/, 'the last supply disables the next button')

  assert.match(read('components/help-doc.tsx'), /id="interiores"/, 'the help explains the tab')
})
