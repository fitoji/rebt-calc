import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const modules = readFileSync(new URL('../components/line-modules.tsx', import.meta.url), 'utf8')
// El desglose de la LGA y de la derivación se pinta en la tarjeta del rail: ahí
// se fijan los rótulos que antes vivían en el bloque de resultado del panel.
const card = readFileSync(new URL('../components/rail-result.tsx', import.meta.url), 'utf8')
const calculator = readFileSync(new URL('../components/load-calculator.tsx', import.meta.url), 'utf8')

test('S1/S2/S4: the cards show the moment, the conductivity, both drops and the designation', () => {
  // La etiqueta ya no nombra la tabla: el nombre vive en el panel y en la SourceNote.
  for (const label of ['Momento eléctrico (M)', 'Conductividad (γ)', 'Caída con Ib', 'Caída con In', 'IGA · potencia máxima']) {
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

test('T8/A4: las opciones de línea describen la condición, no la tabla', () => {
  // El campo ya tiene su botón `Tablas`: repetir el nombre en la opción sobra.
  for (const option of [
    "{ value: 'air', label: 'Al aire' }",
    "{ value: 'buried', label: 'Enterrada bajo tubo' }",
    "{ value: 'tubes-air', label: 'Tubos en contacto al aire' }",
  ]) {
    assert.ok(modules.includes(option), `la opción se lee «${option}»`)
  }
  assert.match(modules, /Object\.entries\(GROUPING_LAYOUTS\)\.map\(\(\[value, entry\]\) => \(\{ value, label: entry\.label \}\)\)/,
    'las disposiciones conservan su valor y pierden el «· Tabla E»')
  assert.doesNotMatch(modules, /· Tabla [A-I]\b/, 'ninguna opción de la línea nombra la tabla que el botón ya abre')
  // El valor guardado no cambia: sólo la etiqueta visible (A4).
  assert.match(modules, /id={`\$\{idPrefix\}-installation`}/, 'el campo de instalación sigue siendo el mismo')
  assert.match(modules, /onChange=\{value => onChange\(\{ installation: value as 'air' \| 'buried' \}\)\}/, 'la instalación sigue guardando air/buried')
  assert.match(modules, /onOpenTables\(tables\)/, 'el botón de la tabla sigue pidiendo su conjunto')
})
