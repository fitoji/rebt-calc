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

test('both consumers read the rule from this module instead of reimplementing it', () => {
  const calculator = read('components/load-calculator.tsx')
  assert.match(calculator, /from '\.\.\/lib\/electrification-grade\.mjs'/)
  assert.match(calculator, /electrificationGradeWarning\(/)
  assert.match(calculator, /BASIC_MAX_SURFACE_M2/)

  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /from '\.\.\/lib\/electrification-grade\.mjs'/)
  assert.match(panel, /electrificationGradeWarning\(/)
})
