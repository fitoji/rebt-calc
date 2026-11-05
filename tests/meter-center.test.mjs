import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_METER_CENTER,
  installationTypeFor,
  mainSwitchFor,
  meterCenterFromInstallationType,
  metersPerConcentration,
  evaluateMeterCenter,
  suggestMeterCount,
} from '../lib/meter-center.mjs'
import { explainMeterCenter } from '../lib/calculation-explanations.mjs'

const base = { ...DEFAULT_METER_CENTER, meters: 10 }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('the suggested meter count adds every supply and never drops below one', () => {
  assert.equal(suggestMeterCount({ dwellings: 0, locals: 0 }), 1, 'an empty project still needs one meter')
  assert.equal(suggestMeterCount({ dwellings: 12, locals: 2 }), 14, 'dwellings plus locals')
  assert.equal(suggestMeterCount({ dwellings: 12, locals: 2, hasCommonServices: true }), 15, 'common services have their own meter')
  assert.equal(suggestMeterCount({ dwellings: 12, locals: 2, hasCommonServices: true, hasIrve: true }), 16, 'the EV infrastructure adds one')
  assert.equal(suggestMeterCount({ dwellings: -3, locals: 1.6 }), 2, 'negative counts are ignored and fractions are rounded')
})

test('the placement decides the link scenario', () => {
  assert.equal(installationTypeFor({ ...base, placement: 'individual' }), 'single-user', 'individual meters have no LGA')
  assert.equal(installationTypeFor({ ...base, placement: 'concentrated', concentrations: 1 }), 'centralized', 'one concentration is fully centralized')
  assert.equal(installationTypeFor({ ...base, placement: 'concentrated', concentrations: 2 }), 'partial', 'two concentrations are partial')
  assert.equal(installationTypeFor({ ...base, placement: 'concentrated', concentrations: 0 }), 'centralized', 'a missing count falls back to one')
})

test('a centre rebuilt from an old scenario keeps its limits', () => {
  assert.equal(installationTypeFor(meterCenterFromInstallationType('partial')), 'partial', 'a partial project stays partial')
  assert.equal(installationTypeFor(meterCenterFromInstallationType('single-user')), 'single-user', 'a single user stays without LGA')
  assert.equal(installationTypeFor(meterCenterFromInstallationType(undefined)), 'centralized', 'a missing scenario is the default')
})

test('meters per concentration round up', () => {
  assert.equal(metersPerConcentration({ ...base, meters: 16, concentrations: 1 }), 16)
  assert.equal(metersPerConcentration({ ...base, meters: 17, concentrations: 1 }), 17)
  assert.equal(metersPerConcentration({ ...base, meters: 40, concentrations: 3 }), 14, '40 meters in 3 concentrations')
  assert.equal(metersPerConcentration({ ...base, meters: 0, concentrations: 0 }), 0)
})

test('the main switch follows the published power steps', () => {
  assert.deepEqual(mainSwitchFor(80_000, 2), { required: false, amps: null, outOfRange: false }, 'two users do not need the switch')
  assert.deepEqual(mainSwitchFor(80_000, 3), { required: true, amps: 160, outOfRange: false }, 'up to 90 kW the switch is 160 A')
  assert.deepEqual(mainSwitchFor(90_000, 3), { required: true, amps: 160, outOfRange: false }, '90 kW is the last 160 A step')
  assert.deepEqual(mainSwitchFor(90_001, 3), { required: true, amps: 250, outOfRange: false }, 'above 90 kW the switch is 250 A')
  assert.deepEqual(mainSwitchFor(150_000, 3), { required: true, amps: 250, outOfRange: false }, '150 kW is the last tabulated step')
  assert.deepEqual(mainSwitchFor(150_001, 3), { required: true, amps: null, outOfRange: true }, 'above 150 kW the table stops')
})

test('a room is mandatory above sixteen meters per concentration', () => {
  const sixteen = evaluateMeterCenter({ ...base, meters: 16, assembly: 'armario' })
  assert.equal(sixteen.requiredAssembly, null, 'sixteen meters still fit in a cabinet')
  assert.deepEqual(sixteen.problems, [], 'sixteen meters in a cabinet is valid')

  const seventeen = evaluateMeterCenter({ ...base, meters: 17, assembly: 'armario' })
  assert.equal(seventeen.requiredAssembly, 'local', 'seventeen meters need a room')
  assert.match(seventeen.problems.join(' '), /la ubicación debe ser un local/)

  const split = evaluateMeterCenter({ ...base, meters: 40, concentrations: 3, assembly: 'armario' })
  assert.equal(split.requiredAssembly, null, 'forty meters in three concentrations are fourteen each')
  assert.deepEqual(split.problems, [], 'the per-concentration count is what matters')
})

test('each assembly carries its own instruction requirements', () => {
  const cpm = evaluateMeterCenter({ ...base, placement: 'individual', assembly: 'cpm' })
  assert.match(cpm.requirements.join(' '), /ITC-BT-13/)

  const local = evaluateMeterCenter({ ...base, assembly: 'local' })
  assert.match(local.requirements.join(' '), /2,30 m/)
  assert.match(local.requirements.join(' '), /0,70 × 2 m/)
  assert.match(local.requirements.join(' '), /21B/)

  const armario = evaluateMeterCenter({ ...base, assembly: 'armario' })
  assert.match(armario.requirements.join(' '), /PF 30/)
  assert.match(armario.requirements.join(' '), /1,5 m/)

  assert.match(evaluateMeterCenter({ ...base, assembly: 'modulos' }).requirements.join(' '), /UNE-EN 60439/)
  assert.match(evaluateMeterCenter({ ...base, assembly: 'paneles' }).requirements.join(' '), /UNE-EN 60439/)
})

test('individual and concentrated placements reject the wrong assembly', () => {
  const individualCpm = evaluateMeterCenter({ ...base, meters: 1, placement: 'individual', assembly: 'cpm' })
  assert.equal(individualCpm.requiredAssembly, 'cpm', 'individual asks for a CPM')
  assert.deepEqual(individualCpm.problems, [])

  const individualLocal = evaluateMeterCenter({ ...base, placement: 'individual', assembly: 'local' })
  assert.match(individualLocal.problems.join(' '), /caja de protección y medida, no con una concentración/)

  const concentratedCpm = evaluateMeterCenter({ ...base, placement: 'concentrated', assembly: 'cpm' })
  assert.match(concentratedCpm.problems.join(' '), /no se resuelve con una caja de protección y medida/)
})

test('floor rules follow the twelve-floor threshold and the six-floor coverage', () => {
  const overTwelve = evaluateMeterCenter({ ...base, floor: 'intermedias', buildingFloors: 13 })
  assert.deepEqual(overTwelve.problems, [], 'intermediate floors are allowed above twelve')
  assert.match(overTwelve.notes.join(' '), /cubre 13 plantas/)

  const diluted = evaluateMeterCenter({ ...base, floor: 'intermedias', buildingFloors: 13, concentrations: 3 })
  assert.match(diluted.problems.join(' '), /6 o más plantas/, '13 floors in three concentrations leave fewer than six each')

  const twelve = evaluateMeterCenter({ ...base, floor: 'intermedias', buildingFloors: 12 })
  assert.match(twelve.problems.join(' '), /más de 12 plantas/)

  const perFloor = evaluateMeterCenter({ ...base, meters: 10, floor: 'por-plantas' })
  assert.match(perFloor.problems.join(' '), /más de 16 contadores/)

  const perFloorOk = evaluateMeterCenter({ ...base, meters: 20, floor: 'por-plantas' })
  assert.deepEqual(perFloorOk.problems, [], 'a per-floor concentration with more than sixteen meters is valid')
})

test('the assembly grade follows the location', () => {
  const interior = evaluateMeterCenter({ ...base, exterior: false })
  const exterior = evaluateMeterCenter({ ...base, exterior: true })
  assert.match(interior.notes.join(' '), /interior IP40 · IK09/)
  assert.match(exterior.notes.join(' '), /exterior IP43 · IK09/)
})

test('individual placement serves one user, or two sharing a protection and measurement box', () => {
  const individual = { ...base, placement: 'individual', assembly: 'cpm' }
  assert.deepEqual(evaluateMeterCenter({ ...individual, meters: 1 }).problems, [])
  assert.deepEqual(evaluateMeterCenter({ ...individual, meters: 2 }).problems, [])
  assert.match(
    evaluateMeterCenter({ ...individual, meters: 3 }).problems.join(' '),
    /caja de protección y medida/,
  )
  assert.equal(evaluateMeterCenter({ ...individual, meters: 1 }).installationType, 'single-user')
})

test('the switch rating chosen in the card is checked against the power', () => {
  const under = evaluateMeterCenter({ ...base, meters: 10, mainSwitchA: 160 }, { powerW: 120_000 })
  assert.match(under.problems.join(' '), /debe ser de 250 A/)

  const right = evaluateMeterCenter({ ...base, meters: 10, mainSwitchA: 250 }, { powerW: 120_000 })
  assert.deepEqual(right.problems, [], '250 A covers 120 kW')

  const outOfRange = evaluateMeterCenter({ ...base, meters: 10, mainSwitchA: 250 }, { powerW: 200_000 })
  assert.match(outOfRange.problems.join(' '), /hasta 150 kW/)
})

test('the fixed mounting requirements are always reported', () => {
  const { notes } = evaluateMeterCenter(base)
  const text = notes.join(' ')
  assert.match(text, /0,25 m/, 'bottom of the assembly')
  assert.match(text, /1,80 m/, 'reading dial height')
  assert.match(text, /IP40 · IK09/, 'interior protection grade')
})

test('the card offers the meter forms and their requirements', () => {
  const card = readFileSync(path.join(root, 'components/meter-center-card.tsx'), 'utf8')
  assert.match(card, /label="Forma de colocación"/, 'placement select')
  assert.match(card, /Individual · caja de protección y medida/, 'individual arrangement')
  assert.match(card, /Concentrada en un lugar/, 'single-place arrangement')
  assert.match(card, /Concentrada en más de un lugar/, 'multiple-place arrangement')
  assert.match(card, /Caída admisible/, 'the card shows the drop limits of the arrangement')
  assert.match(card, /limitsForInstallation\(evaluation\.installationType\)/, 'the limits come from the shared scenario module')
  assert.match(card, /label="Conjunto de medida"/, 'assembly select')
  assert.match(card, /label="Tipo de armario"/, 'cabinet select')
  assert.match(card, /from '@\/components\/ui\/accordion'/, 'the requirements use the accordion primitive')
  assert.match(card, /<AccordionTrigger>Requisitos del cuarto/, 'requirements live in a collapsible header')
  assert.match(card, /<AccordionPanel>/, 'the requirements list is the accordion panel')
  assert.match(card, /ASSEMBLIES\.filter\(assembly => assembly !== 'cpm'\)/, 'individual and concentrated offer different assemblies')
})

test('the card reaches the LGA tab, the report and the help', () => {
  const read = file => readFileSync(path.join(root, file), 'utf8')
  const calc = read('components/load-calculator.tsx')
  assert.match(calc, /<MeterCenterCard/, 'the card is rendered')
  assert.match(calc, /title: '6\. Centralización de contadores \(ITC-BT-16\)'/, 'the report has its own section')
  assert.match(calc, /meterEvaluation/, 'the report reads the same evaluation as the card')
  assert.match(read('components/help-doc.tsx'), /id="contadores"/, 'the help explains the block')
})

test('the card lives first in the LGA tab, even in the single-user scenario', () => {
  const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')
  const lgaTab = calc.slice(calc.indexOf('<TabsContent value="lga"'), calc.indexOf('<TabsContent value="di"'))
  const diTab = calc.slice(calc.indexOf('<TabsContent value="di"'))

  assert.match(lgaTab, /<MeterCenterCard/, 'the LGA tab renders the card')
  assert.doesNotMatch(diTab, /<MeterCenterCard/, 'the DI tab does not duplicate it')
  assert.ok(lgaTab.indexOf('<MeterCenterCard') < lgaTab.indexOf('<LgaPanel'), 'the card comes before the LGA module')
  assert.doesNotMatch(calc, /<TabsTrigger value="lga" disabled=/, 'the LGA tab is always reachable')
  assert.match(lgaTab, /Único usuario sin línea general/, 'single user shows a notice instead of the LGA panel')
})

test('the didactic mode explains the meter centre', () => {
  const card = readFileSync(path.join(root, 'components/meter-center-card.tsx'), 'utf8')
  const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')

  assert.match(card, /explanationMode === 'didactic' && <CalculationSteps/, 'the card renders the steps in didactic mode')
  assert.match(calc, /explainMeterCenter\(effectiveMeterCenter, meterEvaluation\)/, 'the explanation comes from the shared module')
  assert.match(calc, /explanation=\{meterExplanation\}/, 'the card receives the same steps as the PDF')
  assert.match(calc, /addExplanationPage\('6\.1 Desarrollo del cálculo · Contadores'/, 'the PDF has its didactic page')
})

test('the meter centre explanation walks through the chosen options', () => {
  const center = {
    ...base,
    meters: 20,
    concentrations: 2,
    assembly: 'armario',
    cabinet: 'empotrado',
    floor: 'intermedias',
    buildingFloors: 14,
  }
  const evaluation = evaluateMeterCenter(center, { powerW: 90_000 })
  const { steps } = explainMeterCenter(center, evaluation)
  const text = JSON.stringify(steps)

  assert.match(text, /Concentrada en 2 lugares/, 'the placement is spelled out')
  assert.match(text, /Concentración en armario/, 'the assembly is named')
  assert.match(text, /Empotrado/, 'the cabinet type is named')
  assert.match(text, /la LGA admite un 1 % de caída/, 'the derived LGA limit is explained')
  assert.match(text, /Requisitos del cuarto/, 'the room requirements are listed')
  assert.match(text, /Interruptor general de maniobra: obligatorio, 160 A/, 'the main switch ruling is explained')
})

test('the PDF and the numbered reports carry the meter centre without repeating a number', () => {
  const calc = readFileSync(path.join(root, 'components/load-calculator.tsx'), 'utf8')
  const report = calc.slice(calc.indexOf('const buildReport'), calc.indexOf('const downloadJson'))
  const reportNumbers = [...report.matchAll(/title: '(\d+)\./g)].map(match => match[1])
  assert.equal(new Set(reportNumbers).size, reportNumbers.length, 'Markdown/text numbers are unique')
  assert.ok(reportNumbers.includes('6'), 'the meter centre keeps section 6')
  assert.match(report, /title: '6\. Centralización de contadores/, 'section 6 is the meter centre')

  const pdf = calc.slice(calc.indexOf('const downloadReport'))
  assert.match(pdf, /Centralización de contadores · ITC-BT-16/, 'the PDF has the meter centre page')
  const pdfNumbers = [...pdf.matchAll(/addDetailPage\('(\d+)\./g)].map(match => match[1])
  assert.equal(new Set(pdfNumbers).size, pdfNumbers.length, 'PDF page numbers are unique')

  assert.match(calc, /meterCenter: \{ inputs: effectiveMeterCenter, result: meterEvaluation \}/, 'the JSON carries the centre inputs and its evaluation')
})
