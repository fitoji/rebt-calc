import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BASIC_MAX_SURFACE_M2,
  ELECTRIFICATION_GRADE_SOURCE,
  ELECTRIFICATION_TRIGGERS,
  electrificationGradeWarning,
  requiredGradeFor,
} from '../lib/electrification-grade.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

test('the cited threshold is the strict one of the ITC-BT-25 §2.3.2', () => {
  assert.equal(BASIC_MAX_SURFACE_M2, 160)
  assert.equal(ELECTRIFICATION_GRADE_SOURCE, 'ITC-BT-25 §2.3.2')
  assert.deepEqual(ELECTRIFICATION_TRIGGERS.map(trigger => trigger.id), ['surface', 'cooling', 'heating', 'automation', 'dryer'])
})

test('160 m² exactly still admits the basic grade', () => {
  const required = requiredGradeFor({ areaM2: 160 })
  assert.equal(required.grade, 'basic')
  assert.deepEqual(required.reasons, [])
})

test('any surface above 160 m² requires the elevated grade and names the article', () => {
  const required = requiredGradeFor({ areaM2: 160.01 })
  assert.equal(required.grade, 'elevated')
  assert.equal(required.reasons.length, 1)
  assert.equal(required.reasons[0].id, 'surface')
  assert.equal(required.reasons[0].source, 'ITC-BT-25 §2.3.2')
  assert.match(required.reasons[0].condition, /Superficie útil de 160,01 m², superior a los 160 m² de la electrificación básica \(ITC-BT-25 §2\.3\.2\)/)
})

test('a missing or non-numeric surface never requires the elevated grade', () => {
  for (const areaM2 of [undefined, null, Number.NaN, 0]) {
    const required = requiredGradeFor({ areaM2 })
    assert.equal(required.grade, 'basic', `area ${String(areaM2)} must not elevate`)
    assert.deepEqual(required.reasons, [])
  }
})

test('aire acondicionado and calefacción eléctrica each require the elevated grade', () => {
  const cooling = requiredGradeFor({ hasCooling: true })
  assert.equal(cooling.grade, 'elevated')
  assert.deepEqual(cooling.reasons.map(reason => reason.id), ['cooling'])
  assert.match(cooling.reasons[0].condition, /aire acondicionado \(ITC-BT-25 §2\.3\.2\)/)

  const heating = requiredGradeFor({ hasHeating: true })
  assert.equal(heating.grade, 'elevated')
  assert.deepEqual(heating.reasons.map(reason => reason.id), ['heating'])
  assert.match(heating.reasons[0].condition, /calefacción eléctrica \(ITC-BT-25 §2\.3\.2\)/)
})

test('automatización and secadora each require the elevated grade', () => {
  const automation = requiredGradeFor({ hasAutomation: true })
  assert.equal(automation.grade, 'elevated')
  assert.match(automation.reasons[0].condition, /automatización, gestión técnica de la energía y seguridad/)

  // La secadora no está en el literal del §2.3.2: se apoya en la Guía BT-25 y en C10.
  const dryer = requiredGradeFor({ hasDryer: true })
  assert.equal(dryer.grade, 'elevated')
  assert.deepEqual(dryer.reasons.map(reason => reason.id), ['dryer'])
  assert.equal(dryer.reasons[0].source, 'Guía BT-25')
  assert.match(dryer.reasons[0].condition, /secadora independiente: el circuito C10 solo existe en la electrificación elevada \(Guía BT-25\)/)
})

test('false flags never trigger a reason', () => {
  const required = requiredGradeFor({ areaM2: 90, hasCooling: false, hasHeating: false, hasAutomation: false, hasDryer: false })
  assert.equal(required.grade, 'basic')
  assert.deepEqual(required.reasons, [])
})

test('every violated condition is reported, in the order of the article', () => {
  const required = requiredGradeFor({ areaM2: 210, hasCooling: true, hasHeating: true, hasAutomation: true, hasDryer: true })
  assert.equal(required.grade, 'elevated')
  assert.deepEqual(required.reasons.map(reason => reason.id), ['surface', 'cooling', 'heating', 'automation', 'dryer'])
})

test('no warning when the declared grade is already elevated', () => {
  assert.equal(electrificationGradeWarning({ declaredGrade: 'elevated', areaM2: 210, hasCooling: true, hasDryer: true }), null)
})

test('no warning when the declared basic grade is conforming', () => {
  assert.equal(electrificationGradeWarning({ declaredGrade: 'basic', areaM2: 160 }), null)
})

test('the warning names the instruction and the declared grade', () => {
  const warning = electrificationGradeWarning({ declaredGrade: 'basic', areaM2: 180 })
  assert.ok(warning != null)
  assert.equal(warning.title, 'La ITC-BT-25 §2.3.2 exige electrificación elevada')
  assert.equal(
    warning.description,
    'Superficie útil de 180 m², superior a los 160 m² de la electrificación básica (ITC-BT-25 §2.3.2). El grado declarado es básico.',
  )
  assert.deepEqual(warning.reasons.map(reason => reason.id), ['surface'])
})

test('the warning joins every violated condition into one sentence', () => {
  const warning = electrificationGradeWarning({ declaredGrade: 'basic', hasHeating: true, hasDryer: true })
  assert.ok(warning != null)
  assert.equal(
    warning.description,
    'Previsión de calefacción eléctrica (ITC-BT-25 §2.3.2). Previsión de secadora independiente: el circuito C10 solo existe en la electrificación elevada (Guía BT-25). El grado declarado es básico.',
  )
})

// S7 — «viviendas con una previsión importante de aparatos electrodomésticos que
// obligue a instalar más de un circuito de cualquiera de los tipos descritos
// anteriormente» (ITC-BT-25 §2.3.2): el máximo de la tabla 1 es el límite.
test('S7: one point above the table-1 maximum of C1 requires the elevated grade', () => {
  const atMax = requiredGradeFor({ pointsByCircuit: { C1: 30 } })
  assert.equal(atMax.grade, 'basic')
  assert.deepEqual(atMax.reasons, [])

  const overMax = requiredGradeFor({ pointsByCircuit: { C1: 31 } })
  assert.equal(overMax.grade, 'elevated')
  assert.deepEqual(overMax.reasons.map(reason => reason.id), ['points:C1'])
  assert.equal(overMax.reasons[0].source, 'ITC-BT-25 §2.3.2')
  // El texto es exacto: nombra el circuito, el número declarado y el máximo pasado.
  assert.equal(overMax.reasons[0].condition, '31 puntos de luz, más de los 30 que admite el circuito C1 (ITC-BT-25 §2.3.2 y §3, tabla 1)')
})

test('S7: the tables-1 maximum of C2 is 20 general sockets', () => {
  assert.equal(requiredGradeFor({ pointsByCircuit: { C2: 20 } }).grade, 'basic')

  const required = requiredGradeFor({ pointsByCircuit: { C2: 21 } })
  assert.equal(required.grade, 'elevated')
  assert.equal(required.reasons[0].id, 'points:C2')
  assert.equal(required.reasons[0].condition, '21 tomas de uso general, más de los 20 que admite el circuito C2 (ITC-BT-25 §2.3.2 y §3, tabla 1)')
})

test('S7: C3, C4 and C5 elevate one point above their table-1 maximum', () => {
  for (const [circuit, max] of [['C3', 2], ['C4', 3], ['C5', 6]]) {
    const atMax = requiredGradeFor({ pointsByCircuit: { [circuit]: max } })
    assert.equal(atMax.grade, 'basic', `${circuit} with ${max} points still admits the basic grade`)
    assert.deepEqual(atMax.reasons, [], `${circuit} at its maximum triggers nothing`)

    const overMax = requiredGradeFor({ pointsByCircuit: { [circuit]: max + 1 } })
    assert.equal(overMax.grade, 'elevated', `${circuit} with ${max + 1} points requires the elevated grade`)
    assert.deepEqual(overMax.reasons.map(reason => reason.id), [`points:${circuit}`])
    assert.match(overMax.reasons[0].condition, new RegExp(`^${max + 1} .+, más de los ${max} que admite el circuito ${circuit} \\(ITC-BT-25 §2\\.3\\.2 y §3, tabla 1\\)$`))
  }
})

test('S7: several overflowing circuits are reported once each, in circuit order', () => {
  const required = requiredGradeFor({ pointsByCircuit: { C2: 21, C1: 31, C5: 7 } })
  assert.equal(required.grade, 'elevated')
  assert.deepEqual(required.reasons.map(reason => reason.id), ['points:C1', 'points:C2', 'points:C5'])
  assert.equal(new Set(required.reasons.map(reason => reason.id)).size, 3)
})

test('S7: the point reasons come after the five declared conditions, never interleaved', () => {
  const required = requiredGradeFor({
    areaM2: 210,
    hasCooling: true,
    hasHeating: true,
    hasAutomation: true,
    hasDryer: true,
    pointsByCircuit: { C5: 7, C1: 31 },
  })
  assert.equal(required.grade, 'elevated')
  assert.deepEqual(required.reasons.map(reason => reason.id), ['surface', 'cooling', 'heating', 'automation', 'dryer', 'points:C1', 'points:C5'])
})

test('S7: no points declared leaves the rule exactly as it was', () => {
  const before = requiredGradeFor({ areaM2: 180, hasHeating: true })
  for (const pointsByCircuit of [undefined, null, 'nope', {}, { C1: 0 }]) {
    const after = requiredGradeFor({ areaM2: 180, hasHeating: true, pointsByCircuit })
    assert.deepEqual(after, before, `pointsByCircuit ${String(pointsByCircuit)} must change nothing`)
  }
})

test('S7: a junk point count is ignored instead of throwing', () => {
  for (const value of [-5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, null, {}, 'siete']) {
    const required = requiredGradeFor({ pointsByCircuit: { C1: value } })
    assert.equal(required.grade, 'basic', `C1 with ${String(value)} points must not elevate`)
    assert.deepEqual(required.reasons, [])
  }

  // Un número escrito como texto se lee con Number(), como el resto del módulo:
  // '7' no supera el máximo de C1 y '31' sí lo supera, sin lanzar en ningún caso.
  assert.equal(requiredGradeFor({ pointsByCircuit: { C1: '7' } }).grade, 'basic')
  assert.equal(requiredGradeFor({ pointsByCircuit: { C1: '31' } }).grade, 'elevated')
})

test('S7: the warning reports the point overflow and still quotes the article', () => {
  const warning = electrificationGradeWarning({ declaredGrade: 'basic', pointsByCircuit: { C1: 31 } })
  assert.ok(warning != null)
  assert.equal(warning.title, 'La ITC-BT-25 §2.3.2 exige electrificación elevada')
  assert.equal(
    warning.description,
    '31 puntos de luz, más de los 30 que admite el circuito C1 (ITC-BT-25 §2.3.2 y §3, tabla 1). El grado declarado es básico.',
  )
  assert.deepEqual(warning.reasons.map(reason => reason.id), ['points:C1'])
  // El grado elevado declarado sigue sin aviso: nada que corregir (S1).
  assert.equal(electrificationGradeWarning({ declaredGrade: 'elevated', pointsByCircuit: { C1: 31 } }), null)
})

// Del §3, tabla 1: los máximos no viven en este módulo, salen de MAX_POINTS.
test('S7: the maximums come from the table-1 source, never from this module', () => {
  const source = read('lib/electrification-grade.mjs')
  assert.match(source, /MAX_POINTS/)
  assert.match(source, /from '\.\/housing-points\.mjs'/)
})

test('both consumers read the rule from this module instead of reimplementing it', () => {
  const calculator = read('components/load-calculator.tsx')
  assert.match(calculator, /from '\.\.\/lib\/electrification-grade\.mjs'/)
  assert.match(calculator, /electrificationGradeWarning\(/)
  assert.match(calculator, /BASIC_MAX_SURFACE_M2/)

  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /from '\.\.\/lib\/electrification-grade\.mjs'/)
  assert.match(panel, /electrificationGradeWarning\(/)
})
