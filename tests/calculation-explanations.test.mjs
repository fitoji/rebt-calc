import assert from 'node:assert/strict'
import test from 'node:test'
import { explainLineCalculation } from '../lib/calculation-explanations.mjs'
import { sizeLine } from '../lib/line-sizing.mjs'

const lgaInput = overrides => ({
  role: 'lga',
  system: 'three-phase',
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  gamma: 44,
  variant: { method: 'B1', loadedConductors: 3, insulation: 'PVC' },
  ...overrides,
})

const diInput = overrides => ({
  role: 'di',
  system: 'single-phase',
  powerW: 9200,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  gamma: 48.5,
  variant: { method: 'B1', loadedConductors: 2, insulation: 'PVC' },
  ...overrides,
})

const lgaState = overrides => ({
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  gamma: 44,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 35,
  peSection: 35,
  controlSection: 1.5,
  tubeDiameter: 140,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
  ...overrides,
})

const diState = overrides => ({
  powerW: 9200,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  gamma: 48.5,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 16,
  peSection: 16,
  controlSection: 1.5,
  tubeDiameter: 40,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
  ...overrides,
})

test('sizeLine exposes the candidate trace without changing the result', () => {
  const result = sizeLine(lgaInput())
  assert.equal(result.finalSection, 70, 'the chosen section is unchanged')
  assert.ok(Array.isArray(result.candidates) && result.candidates.length > 0, 'candidates are returned')

  const chosen = result.candidates.find(candidate => candidate.section === 70)
  assert.equal(chosen.meetsMinimum, true)
  assert.equal(chosen.meetsDrop, true)
  assert.equal(chosen.meetsCurrent, true)

  const belowDrop = result.candidates.find(candidate => candidate.section === 50)
  assert.equal(belowDrop.meetsDrop, false, '50 mm2 does not reach the drop requirement')
  assert.equal(result.minimumSection, 10, 'the normative minimum is reported')
})

test('the explanation lists every step and keeps the engine result', () => {
  const result = sizeLine(lgaInput())
  const explanation = explainLineCalculation(lgaState(), result, { system: 'three-phase', line: 'lga' })

  assert.deepEqual(explanation.steps.map(step => step.id), [
    'inputs', 'current', 'moment', 'drop', 'thermal', 'minimum', 'selection', 'conductors', 'protection', 'protection-drop', 'reference',
  ])

  const current = explanation.steps.find(step => step.id === 'current')
  assert.equal(current.formula, 'I_b = P / (√3 · U · cos φ)')
  assert.equal(current.result, '108,25 A', 'the explanation repeats the engine current')

  const drop = explanation.steps.find(step => step.id === 'drop')
  assert.equal(drop.result, '53,27 mm²', 'the explanation repeats the engine drop section')

  const selection = explanation.steps.find(step => step.id === 'selection')
  assert.equal(selection.result, '70 mm²', 'the explanation repeats the chosen section')
})

const esNumber = (value, digits = 2) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

test('S1: the moment step repeats the engine value and names the ELEC-3 column', () => {
  const result = sizeLine(lgaInput())
  const moment = explainLineCalculation(lgaState(), result, { system: 'three-phase', line: 'lga' })
    .steps.find(step => step.id === 'moment')

  assert.equal(moment.kind, 'formula')
  assert.equal(moment.formula, 'M = P(kW) · L')
  assert.equal(moment.substitution, 'M = 75,00 kW · 25,00 m')
  assert.equal(moment.result, '1875,00 kW·m', '75 kW over 25 m; es-ES no agrupa los cuatro dígitos')
  assert.match(moment.note, /ELEC-3/, 'the model that asks for the column is named')
  assert.match(moment.note, /0,0788/, 'the 230 V shortcut of the guide is offered')
})

test('S2: the drop step separates the partial drop from the total one', () => {
  const drop = explainLineCalculation(lgaState(), sizeLine(lgaInput()), { system: 'three-phase', line: 'lga' })
    .steps.find(step => step.id === 'drop')

  assert.match(drop.note, /parcial/i, 'the step says which drop it computes')
  assert.match(drop.note, /total/i, 'and that the memoria also asks for the total')
  assert.match(drop.note, /compensa/i, 'the guide compensation of partial limits is explained')
})

test('S2: the In drop step repeats the engine value and says whether it governs', () => {
  const autoResult = sizeLine(lgaInput())
  const auto = explainLineCalculation(lgaState(), autoResult, { system: 'three-phase', line: 'lga' })
    .steps.find(step => step.id === 'protection-drop')

  assert.equal(auto.kind, 'formula')
  assert.match(auto.formula, /I_n/, 'the formula uses the device current')
  assert.equal(auto.result, `${esNumber(autoResult.dropPercentIn)} %`, 'the value is the engine one')
  assert.match(auto.criterion, /no cambia la sección/, 'an automatic device does not decide')

  const fixedInput = lgaInput({ powerW: 30000, lengthM: 30, maxDropPercent: 0.4, protectionA: 50 })
  const fixedResult = sizeLine(fixedInput)
  const fixed = explainLineCalculation(
    lgaState({ powerW: 30000, lengthM: 30, maxDropPercent: 0.4, protectionA: 50 }),
    fixedResult,
    { system: 'three-phase', line: 'lga' },
  ).steps.find(step => step.id === 'protection-drop')

  assert.equal(fixed.result, `${esNumber(fixedResult.dropPercentIn)} %`)
  assert.match(fixed.criterion, /decide la sección/, 'a fixed device is the criterion')
})

test('S2: a section discarded by the In drop says so', () => {
  const input = lgaInput({ powerW: 30000, lengthM: 30, maxDropPercent: 0.4, protectionA: 50 })
  const selection = explainLineCalculation(
    lgaState({ powerW: 30000, lengthM: 30, maxDropPercent: 0.4, protectionA: 50 }),
    sizeLine(input),
    { system: 'three-phase', line: 'lga' },
  ).steps.find(step => step.id === 'selection')

  const thirtyFive = selection.rows.find(row => row.section === 35)
  assert.equal(thirtyFive.status, 'discarded')
  assert.match(thirtyFive.reason, /con In/, 'the reason names the device drop, not the load one')
  assert.equal(thirtyFive.dropPercentIn > thirtyFive.dropPercent, true, 'the row carries both drops')
})

test('S4: the conductors step reads the neutral and the PE from the result', () => {
  const result = { ...sizeLine(lgaInput()), neutralSection: 99, protectiveSection: 77 }
  const rows = Object.fromEntries(
    explainLineCalculation(lgaState(), result, { system: 'three-phase', line: 'lga' })
      .steps.find(step => step.id === 'conductors').rows.map(row => [row.label, row.value]),
  )

  assert.equal(rows.Neutro, '99 mm² Cu', 'the step does not recompute the neutral')
  assert.equal(rows['Protección (PE)'], '77 mm² Cu', 'nor the PE')
})

test('S4: the conductors step states the designation and the tube of the line', () => {
  const lgaRows = Object.fromEntries(
    explainLineCalculation(lgaState(), sizeLine(lgaInput()), { system: 'three-phase', line: 'lga' })
      .steps.find(step => step.id === 'conductors').rows.map(row => [row.label, row.value]),
  )
  assert.equal(lgaRows.Designación, 'RZ1-K 0,6/1 kV', 'the LGA designation comes from the engine')

  const buried = sizeLine(diInput({ installation: 'buried', grouping: { kind: 'buried-cables', cables: 2, spacing: 0 } }))
  const diRows = Object.fromEntries(
    explainLineCalculation(diState({ installation: 'buried' }), buried, { system: 'single-phase', line: 'di' })
      .steps.find(step => step.id === 'conductors').rows.map(row => [row.label, row.value]),
  )
  assert.equal(diRows.Designación, 'RZ1-K 0,6/1 kV', 'an underground DI is the multiconductor of table E')

  const fake = { ...sizeLine(lgaInput()), minimumTube: 75 }
  const tube = Object.fromEntries(
    explainLineCalculation(lgaState({ tubeDiameter: 40 }), fake, { system: 'three-phase', line: 'lga' })
      .steps.find(step => step.id === 'conductors').rows.map(row => [row.label, row.value]),
  )['Tubo protector']
  assert.equal(tube, '40 mm · mínimo de tabla 75 mm', 'the adopted tube is shown next to the table minimum')
})

test('S5: the housing step appears only when the line carries an IGA', () => {
  const withIga = explainLineCalculation(diState({ housingIgaA: 25 }), sizeLine(diInput({ housingIgaA: 25 })), { system: 'single-phase', line: 'di' })
  const step = withIga.steps.find(candidate => candidate.id === 'housing-iga')

  assert.ok(step, 'the step exists for a dwelling')
  assert.equal(step.formula, 'P_máx = U · I_GA')
  assert.equal(step.result, '5750 W', '230 V × 25 A; es-ES no agrupa los cuatro dígitos')
  assert.match(step.note, /ICP/, 'the step says what the IGA is not')

  const without = explainLineCalculation(diState(), sizeLine(diInput()), { system: 'single-phase', line: 'di' })
  assert.equal(without.steps.some(candidate => candidate.id === 'housing-iga'), false, 'a generic line has no housing step')
})

test('the selection step explains why lower sections are discarded', () => {
  const result = sizeLine(lgaInput())
  const explanation = explainLineCalculation(lgaState(), result, { system: 'three-phase', line: 'lga' })
  const selection = explanation.steps.find(step => step.id === 'selection')

  const fifty = selection.rows.find(row => row.section === 50)
  assert.equal(fifty.status, 'discarded')
  assert.match(fifty.reason, /caída/i, 'the drop criterion is named')

  const seventy = selection.rows.find(row => row.section === 70)
  assert.equal(seventy.status, 'chosen')
  assert.match(seventy.reason, /Cumple/, 'the chosen section explains its three criteria')
})

test('the selection step names the current criterion when it is the limiting one', () => {
  const result = sizeLine(diInput({ circuits: 3 }))
  const explanation = explainLineCalculation(diState({ circuits: 3 }), result, { system: 'single-phase', line: 'di' })
  const selection = explanation.steps.find(step => step.id === 'selection')

  const ten = selection.rows.find(row => row.section === 10)
  assert.equal(ten.status, 'discarded')
  assert.match(ten.reason, /intensidad corregida/i, 'the current criterion is named')
})

test('the explanation formats values from the result instead of recalculating them', () => {
  const result = sizeLine(lgaInput())
  const fake = { ...result, ratedCurrent: 999, sectionByDrop: 123.45, finalSection: 95 }
  const explanation = explainLineCalculation(lgaState(), fake, { system: 'three-phase', line: 'lga' })

  const current = explanation.steps.find(step => step.id === 'current')
  const drop = explanation.steps.find(step => step.id === 'drop')
  const selection = explanation.steps.find(step => step.id === 'selection')

  assert.equal(current.result, '999,00 A')
  assert.equal(drop.result, '123,45 mm²')
  assert.equal(selection.result, '95 mm²')
})

test('a fixed section explains itself against the automatic one', () => {
  const result = sizeLine(lgaInput({ sectionOverride: 95 }))
  const explanation = explainLineCalculation(lgaState({ sectionOverride: 95 }), result, { system: 'three-phase', line: 'lga' })
  const selection = explanation.steps.find(step => step.id === 'selection')

  assert.match(selection.criterion, /sección fijada \(95 mm²\)/, 'the fixed section is named as the adopted one')
  assert.match(selection.criterion, /70 mm²/, 'the automatic section stays visible as the reference')
  const seventy = selection.rows.find(row => row.section === 70)
  assert.equal(seventy.status, 'discarded')
  assert.match(seventy.reason, /se adoptó la sección fijada/, 'a compliant section below the fixed one explains why it was not adopted')
})

test('warnings from the engine become their own step', () => {
  const result = sizeLine(lgaInput({ powerW: 5_000_000, maxDropPercent: 0.1 }))
  const explanation = explainLineCalculation(lgaState({ powerW: 5_000_000, maxDropPercent: 0.1 }), result, { system: 'three-phase', line: 'lga' })
  const warnings = explanation.steps.find(step => step.id === 'warnings')

  assert.ok(warnings, 'a warnings step is present')
  assert.deepEqual(warnings.items, result.problems, 'the warnings are the engine problems, not a copy')
})

test('the DI explanation cites ITC-BT-15 and uses the single-phase formula', () => {
  const result = sizeLine(diInput())
  const explanation = explainLineCalculation(diState(), result, { system: 'single-phase', line: 'di' })

  const current = explanation.steps.find(step => step.id === 'current')
  assert.equal(current.formula, 'I_b = P / (U · cos φ)')

  const reference = explanation.steps.find(step => step.id === 'reference')
  assert.match(reference.text, /ITC-BT-15/)
})

test('the didactic steps name the rule that governs the minimum section', () => {
  const lga = explainLineCalculation(lgaState(), sizeLine(lgaInput()), { system: 'three-phase', line: 'lga' })
  const lgaMinimum = lga.steps.find(step => step.id === 'minimum')
  assert.match(lgaMinimum.text, /ITC-BT-14 §3/, 'the LGA cites its own instruction')
  assert.match(lgaMinimum.text, /10 mm2 en cobre o 16 mm2 en aluminio/, 'the quote is verbatim')
  assert.match(lgaMinimum.text, /Se aplica 10 mm²\.$/, 'the applied floor is stated')

  const threePhaseDi = sizeLine(diInput({
    system: 'three-phase',
    voltageV: 400,
    variant: { method: 'B1', loadedConductors: 3, insulation: 'PVC' },
  }))
  const di = explainLineCalculation(diState(), threePhaseDi, { system: 'three-phase', line: 'di' })
  const diMinimum = di.steps.find(step => step.id === 'minimum')
  assert.match(diMinimum.text, /ITC-BT-15 §3/)
  assert.match(diMinimum.text, /6 mm2 para los cables polares/, 'the quote is verbatim')
  assert.match(diMinimum.text, /Se aplica 6 mm²\.$/, 'a three-phase DI still floors at 6 mm²')
})

test('the didactic steps derive the neutral from the phase section', () => {
  const lga = explainLineCalculation(lgaState(), sizeLine(lgaInput()), { system: 'three-phase', line: 'lga' })
  const lgaConductors = lga.steps.find(step => step.id === 'conductors')
  const lgaRows = Object.fromEntries(lgaConductors.rows.map(row => [row.label, row.value]))
  assert.equal(lgaRows['Fase (R, S, T)'], '3 x 70 mm² Cu')
  assert.equal(lgaRows.Neutro, '35 mm² Cu', 'ITC-BT-14 tabla 1: 70 mm2 of phase, 35 mm2 of neutral')
  assert.equal(lgaRows['Protección (PE)'], '35 mm² Cu', 'ITC-BT-18 tabla 2')
  assert.match(lgaConductors.note, /tabla 1/, 'the table that fixes the neutral is named')

  const di = explainLineCalculation(diState(), sizeLine(diInput()), { system: 'single-phase', line: 'di' })
  const diRows = Object.fromEntries(di.steps.find(step => step.id === 'conductors').rows.map(row => [row.label, row.value]))
  assert.equal(diRows.Neutro, diRows.Fase, 'the DI neutral repeats the phase section')
  assert.equal(diRows['Hilo de mando'], '1,5 mm² Cu')
})

test('the inputs step states which conductor temperature the conductivity implies', () => {
  const explanation = explainLineCalculation(lgaState(), sizeLine(lgaInput()), { system: 'three-phase', line: 'lga' })
  const inputs = explanation.steps.find(step => step.id === 'inputs')

  assert.match(inputs.note, /anexo 2/i, 'the guide anexo is named')
  assert.match(inputs.note, /90 °C/, 'the LGA maximum service temperature is stated')
  assert.doesNotMatch(inputs.note, /≈ 52/, 'the superseded 40 °C reference is gone')

  const isolation = Object.fromEntries(inputs.rows.map(row => [row.label, row.value]))
  assert.equal(isolation.Aislamiento, 'XLPE · RZ1-K', 'the LGA reports the cable the engine used')
  assert.equal(isolation['Conductividad (γ)'], '44,00 m/(Ω·mm²)', 'the LGA always uses the 90 °C value')
})
