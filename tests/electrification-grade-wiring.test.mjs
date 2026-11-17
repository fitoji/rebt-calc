import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDerivations, syncDerivationPowers } from '../lib/project-model.mjs'
import { declaredGradeOf } from '../lib/electrification-grade.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const defaults = {
  cosPhi: 1, lengthM: 20, maxDropPercent: 1, method: 'B1', insulation: 'PVC',
  neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 32, installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
}

const build = housing => buildDerivations({ housing, locals: [], garages: [] }, { p2: 0, p5: 0 }, defaults)[0]

test('declaredGradeOf reads the P1 labels and rejects anything else', () => {
  assert.equal(declaredGradeOf('Básica'), 'basic')
  assert.equal(declaredGradeOf('Elevada'), 'elevated')
  for (const value of [undefined, null, '', 'basica', 'Elevada ', 'BÁSICA']) {
    assert.equal(declaredGradeOf(value), null, `${String(value)} is not a declared level`)
  }
})

test('S6: the derivation carries the declared level, not the grade the power step implies', () => {
  // Una vivienda declarada elevada con escalón de 5.750 W: el panel interior no
  // puede deducir el grado de la potencia y avisar en falso.
  const elevated = build([{ level: 'Elevada', power: 5750, homes: 1, area: 90 }])
  assert.equal(elevated.housingDeclaredGrade, 'Elevada')
  assert.equal(declaredGradeOf(elevated.housingDeclaredGrade), 'elevated')

  // Y al revés: declarada básica con escalón de 9.200 W sigue siendo básica, que es
  // justo el caso en el que la ITC-BT-25 §2.3.2 tiene algo que decir.
  const basic = build([{ level: 'Básica', power: 9200, homes: 1, area: 90 }])
  assert.equal(basic.housingDeclaredGrade, 'Básica')
  assert.equal(declaredGradeOf(basic.housingDeclaredGrade), 'basic')
})

test('S6: syncDerivationPowers refreshes the declared level with the forecast', () => {
  const [dwelling] = buildDerivations({ housing: [{ level: 'Básica', power: 9200, homes: 1, area: 90 }], locals: [], garages: [] }, { p2: 0, p5: 0 }, defaults)
  assert.equal(dwelling.housingDeclaredGrade, 'Básica')

  const [synced] = syncDerivationPowers([dwelling], { housing: [{ level: 'Elevada', power: 9200, homes: 1, area: 90 }] }, { p2: 0, p5: 0 })
  assert.equal(synced.housingDeclaredGrade, 'Elevada', 'the declared level follows P1, not the old row')
})

test('S7: the interior panel passes the declared points of every circuit into the rule', () => {
  const panel = read('components/interior-panel.tsx')
  // Un solo aviso: la previsión ya no tiene checkboxes, sale de los puntos declarados.
  const calls = panel.match(/pointsByCircuit: effectivePoints\.totals/g) ?? []
  assert.equal(calls.length, 1, 'the single warning reads the declared points')
  assert.match(panel, /const effectivePoints = applyPointOverrides\(points, inputs\.pointsOverride\)/, 'the declared points still come from applyPointOverrides')
  assert.match(panel, /hasHeating: pointFlags\.hasHeating/, 'the warning sees the prevision derived from C8/C9/C10')
})

test('S7: no consumer reimplements the table-1 point maxima', () => {
  // `components/electrification-grade.mjs` no existe: la regla vive en lib/.
  for (const file of ['components/interior-panel.tsx', 'lib/electrification-grade.mjs']) {
    assert.doesNotMatch(read(file), /[<>]=?\s*(?:30|20|6)\b/, `${file} must compare through MAX_POINTS`)
  }
  assert.match(read('lib/electrification-grade.mjs'), /BASIC_CIRCUIT_IDS/)
})

// S8: el toast sale cuando el exceso aparece, no en cada tecla ni al montar.
test('S8: the point-overflow toast fires only when the overflow appears', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /useRef\(false\)/)
  assert.match(panel, /useEffect\(/)
  assert.match(panel, /reason\.id\.startsWith\('points:'\)/)
  assert.match(panel, /overflowing && !pointOverflowSeen\.current/, 'the toast must be gated by the previous render')
})

test('S6: no consumer reimplements the 160 m² threshold', () => {
  for (const file of ['components/load-calculator.tsx', 'components/interior-panel.tsx']) {
    assert.doesNotMatch(read(file), /[<>]=?\s*160\b/, `${file} must compare through BASIC_MAX_SURFACE_M2`)
  }
})

test('S6: the P1 toast fires only when the surface crosses the threshold upwards', () => {
  assert.match(read('components/load-calculator.tsx'), /previous\.area <= BASIC_MAX_SURFACE_M2 && area > BASIC_MAX_SURFACE_M2/)
})

test('S6: the interior panel warns with the declared grade, never with the power-derived one', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /declaredGradeOf\(dwelling\.housingDeclaredGrade\)/)
  assert.match(panel, /electrificationGradeWarning\(\{\s*declaredGrade,/)
  assert.doesNotMatch(panel, /declaredGrade: grade\b/, 'the power-derived grade must never be the declared one')
})
