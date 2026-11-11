import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const modules = readFileSync(new URL('../components/line-modules.tsx', import.meta.url), 'utf8')
// El desglose de la LGA y de la derivación se pinta en la tarjeta del rail: ahí
// se fijan los rótulos que antes vivían en el bloque de resultado del panel.
const card = readFileSync(new URL('../components/rail-result.tsx', import.meta.url), 'utf8')
const calculator = readFileSync(new URL('../components/load-calculator.tsx', import.meta.url), 'utf8')

test('S1/S2/S4: the cards show the moment, the conductivity, both drops and the designation', () => {
  for (const label of ['Momento eléctrico (M)', 'Conductividad (γ)', 'Caída con Ib', 'Caída con In', 'IGA (tabla A)']) {
    assert.ok(card.includes(label), `the card names ${label}`)
  }
  assert.ok(modules.includes('${result.cableType}'), 'the conductor designation comes from the result, not from a literal')
  assert.equal(modules.includes('(RZ1-K 0,6/1 kV)`'), false, 'the hardcoded RZ1-K of the DI is gone')
  assert.match(modules, /id="lga-tube"/, 'the LGA tube can be set, so its minimum is actionable')
  assert.match(card, /El IGA no es el ICP ni la protección In/, 'the card tells the IGA, the ICP and In apart')
})

test('S1/S4/S5: the memoria prints the same numbers as the card', () => {
  assert.equal((calculator.match(/\['Momento eléctrico \(M\)'/g) ?? []).length, 4, 'summary report and PDF pages print the moment of both lines')
  assert.equal((calculator.match(/\['Conductividad \(γ\)'/g) ?? []).length, 4, 'and the conductivity of both lines')
  assert.equal((calculator.match(/lgaResult\.cableType/g) ?? []).length, 6, 'three LGA conductors in each document')
  assert.equal((calculator.match(/diResult\.cableType/g) ?? []).length, 2, 'the DI conductors use the result too')
  assert.equal((calculator.match(/resultante con In/g) ?? []).length, 4, 'the In drop reaches the memoria')
  assert.match(calculator, /diResult\.housingIga/, 'the housing IGA reaches the memoria when the line has one')
})
