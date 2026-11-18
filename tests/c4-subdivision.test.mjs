import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { c4BranchPoints, c4Branches, housingCircuitLength, housingCircuitsFor } from '../lib/housing-circuits.mjs'
import { circuitsForDifferentials, evaluateInterior } from '../lib/interior-installation.mjs'
import { dwellingDocumentInput } from '../lib/elec3-dwelling.mjs'
import { buildDwellingDocument } from '../lib/elec3.mjs'
import { differentialsFor as unifilarDifferentials } from '../lib/unifilar.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const dwelling = (circuits, c4Mode) => ({
  igaA: 25,
  powerW: 5750,
  contractedPowerW: 5750,
  circuits,
  c4Mode,
})

test('C4 en dos o tres circuitos no añade diferencial, a diferencia de C1/C2/C5', () => {
  assert.equal(circuitsForDifferentials(5, 1), 5)
  assert.equal(circuitsForDifferentials(6, 2), 5, 'un circuito extra por C4 se descuenta')
  assert.equal(circuitsForDifferentials(7, 3), 5, 'dos circuitos extra por C4 se descuentan')
  assert.equal(circuitsForDifferentials(6, 1), 6, 'un circuito que no viene de C4 sí cuenta')

  assert.equal(evaluateInterior(dwelling(5, 1)).differentials, 1)
  assert.equal(evaluateInterior(dwelling(6, 2)).differentials, 1)
  assert.equal(evaluateInterior(dwelling(7, 3)).differentials, 1)
  assert.equal(evaluateInterior(dwelling(6, 1)).differentials, 2)
})

test('las ramas independientes de C4 son circuitos con PIA de 16 A', () => {
  const three = c4Branches(3)
  assert.deepEqual(three.map(circuit => circuit.id), ['C4.1', 'C4.2', 'C4.3'])
  assert.deepEqual(three.map(circuit => circuit.name), ['Lavadora', 'Lavavajillas', 'Termo eléctrico'])
  for (const circuit of three) {
    assert.equal(circuit.breakerA, 16)
    assert.equal(circuit.section, 2.5)
    assert.equal(circuit.maxPoints, 1)
    assert.equal(circuit.baseId, 'C4')
  }

  const two = c4Branches(2, 'lavadora-lavavajillas')
  assert.deepEqual(two.map(circuit => circuit.id), ['C4.1', 'C4.2'])
  assert.equal(two[0].name, 'Lavadora y lavavajillas')
  assert.equal(two[0].maxPoints, 2)
  assert.equal(two[1].name, 'Termo eléctrico')
  assert.equal(two[1].maxPoints, 1)
  assert.equal(c4Branches(2, 'pareja-inexistente')[0].name, 'Lavadora y lavavajillas', 'una pareja inválida cae a la primera')
})

test('al alternar modos no se pierde la longitud declarada en C4', () => {
  const branch = c4Branches(3)[0]
  assert.equal(housingCircuitLength({ C4: 18 }, branch), 18, 'la rama hereda la longitud de C4')
  assert.equal(housingCircuitLength({ C4: 18, 'C4.1': 12 }, branch), 12, 'la longitud propia manda')
  assert.equal(housingCircuitLength({}, branch), 0)
  assert.equal(housingCircuitLength({ C1: 9 }, c4Branches(1)[0]), 0, 'un circuito sin base no hereda')
})

test('los puntos de C4 se reparten entre las ramas sin cambiar el total', () => {
  assert.deepEqual(c4BranchPoints(3, 3), { 'C4.1': 1, 'C4.2': 1, 'C4.3': 1 })
  assert.deepEqual(c4BranchPoints(3, 2, 'lavadora-lavavajillas'), { 'C4.1': 2, 'C4.2': 1 })
  assert.deepEqual(c4BranchPoints(3, 2, 'lavavajillas-termo'), { 'C4.1': 2, 'C4.2': 1 })
})

test('el panel ofrece tres estados con RadioGroup y no con un checkbox', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /C4 · configuración/, 'el control está rotulado y es específico de C4')
  assert.match(panel, /<RadioGroup value=\{String\(c4Mode\)\}/, 'los tres estados son opciones pares')
  assert.match(panel, /c4-mode-\$\{mode\}/, 'cada opción tiene id propio')
  assert.match(panel, /No cambia el grado de electrificación ni añade diferencial/, 'el texto auxiliar explica la consecuencia')
  assert.match(panel, /C4_PAIRS\.map/, 'el modo 2 ofrece las tres parejas posibles')
  assert.doesNotMatch(panel, /Subdividir/, 'no hay checkbox «Subdividir»')
  assert.match(panel, /nota \(8\)/, 'la fuente normativa correcta está citada')
})

test('las ramas derivan puntos y potencia de C4 sin duplicar la previsión', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /c4BranchPoints\(pointsFor\('C4'\), c4Mode, c4Pair\)/, 'los puntos se reparten desde C4')
  assert.match(panel, /circuit\.baseId === 'C4'/, 'la fila de rama muestra puntos derivados')
  assert.match(panel, /setLength\(circuit\.id/, 'la longitud se guarda por rama')
  const calc = read('components/load-calculator.tsx')
  assert.match(calc, /resolveC4Split\(dwelling\.interior\)/, 'el informe usa el mismo modo persistido')
  const lib = read('lib/housing-circuits.mjs')
  assert.ok(lib.includes('/^C4\\.\\d+$/'), 'las ramas heredan la potencia por toma de C4')
})

test('el unifilar consume el mismo recuento de diferenciales que el cuadro', () => {
  const dwelling = c4Mode => ({ kind: 'dwelling', powerW: 5750, interior: { contractedPowerW: 5750, circuits: 6, hasSurge: false, c4Mode } })
  assert.equal(unifilarDifferentials(dwelling(1)).differentials, 2, 'sin subdivisión, seis circuitos exigen dos')
  assert.equal(unifilarDifferentials(dwelling(2)).differentials, 1, 'la rama extra de C4 se descuenta')
  assert.equal(unifilarDifferentials(dwelling(3)).differentials, 1)
})

test('el ELEC-3 imprime cada rama de C4 sin duplicar potencia ni diferenciales', () => {
  const rooms = [{ id: 'cocina', type: 'cocina', area: 12, length: 0 }]
  const interior = { contractedPowerW: 5750, circuits: 5, hasSurge: false, rooms, c4Mode: 3 }
  const document = buildDwellingDocument(dwellingDocumentInput({
    derivation: { powerW: 5750 },
    interior,
    circuits: housingCircuitsFor(5750, { c4Mode: 3 }),
  }))
  const rows = document.files.slice(1)
  const branches = rows.filter(row => row.id.startsWith('C4.'))

  assert.deepEqual(branches.map(row => row.id), ['C4.1', 'C4.2', 'C4.3'])
  for (const row of branches) {
    assert.equal(row.intensitat, 16, 'la nota (8) fija 16 A por rama')
    assert.equal(row.seccio, 2.5)
    assert.equal(row.nom, `C4.${row.id.at(-1)} · ${['Lavadora', 'Lavavajillas', 'Termo eléctrico'][Number(row.id.at(-1)) - 1]}`)
  }
  const single = buildDwellingDocument(dwellingDocumentInput({
    derivation: { powerW: 5750 },
    interior: { ...interior, c4Mode: 1 },
    circuits: housingCircuitsFor(5750),
  }))
  const singleC4 = single.files.slice(1).find(row => row.id === 'C4')
  const sum = branches.reduce((total, row) => total + row.potencia, 0)
  assert.ok(Math.abs(sum - singleC4.potencia) < 1e-9, 'los tres puntos siguen siendo tres')
  assert.equal(document.administrative.diferenciales.length, 1, 'siete circuitos físicos, pero un diferencial')
})

test('el grado y el número de circuitos de tabla no cambian al subdividir', () => {
  const single = housingCircuitsFor(5750)
  assert.deepEqual(single.map(circuit => circuit.id), ['C1', 'C2', 'C3', 'C4', 'C5'])
  const three = housingCircuitsFor(5750, { c4Mode: 3 })
  assert.deepEqual(three.map(circuit => circuit.id), ['C1', 'C2', 'C3', 'C4.1', 'C4.2', 'C4.3', 'C5'])
  const two = housingCircuitsFor(5750, { c4Mode: 2, c4Pair: 'lavavajillas-termo' })
  assert.deepEqual(two.map(circuit => circuit.id), ['C1', 'C2', 'C3', 'C4.1', 'C4.2', 'C5'])
  assert.equal(two.find(circuit => circuit.id === 'C4.1').name, 'Lavavajillas y termo')
})
