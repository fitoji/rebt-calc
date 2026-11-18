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
  icpRatingFor,
  resolveInterior,
} from '../lib/interior-installation.mjs'
import { ICP_RATINGS, NORMATIVE_REGISTRY } from '../lib/normative-tables.mjs'
import { explainInterior } from '../lib/calculation-explanations.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

test('la protección diferencial se declara por dispositivo, no con un tipo global', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /Diferenciales exigidos/, 'el mínimo reglamentario sigue visible')
  assert.match(panel, /evaluation\.differentials/, 'el mínimo sale del motor')
  assert.match(panel, /DIFFERENTIAL_TYPE_ITEMS\.map/, 'los cuatro tipos siguen disponibles por dispositivo')
  assert.doesNotMatch(panel, /id="interior-differential-type"/, 'el selector global desapareció')
  for (const type of ['AC', 'A', 'F', 'B']) assert.match(panel, new RegExp(`value: '${type}'`), `el tipo ${type} está disponible`)
})

test('el tipo de protector aparece solo con la protección contra sobretensiones activa', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /\{inputs\.hasSurge && \(/, 'el select está condicionado al checkbox')
  assert.match(panel, /id="interior-surge-type"/, 'el selector existe')
  assert.match(panel, /value=\{inputs\.surgeType \?\? ''\}/, 'el Select siempre recibe un valor definido')
  assert.match(panel, /surgeType: checked === true \? inputs\.surgeType : undefined/, 'al desactivar el checkbox se limpia el tipo')
  assert.match(panel, /Tipo 1/, 'la clasificación por tipos está disponible')
})

test('la previsión de C8, C9 y C10 sale de los puntos de la tabla, no de checkboxes', () => {
  const panel = read('components/interior-panel.tsx')
  for (const id of ['interior-heating', 'interior-cooling', 'interior-dryer']) {
    assert.doesNotMatch(panel, new RegExp(id), `${id} ya no se dibuja`)
  }
  assert.match(panel, /pointsOverride\?\.\[circuitId\]/, 'el punto declarado manda sobre la previsión')
  assert.match(panel, /foreseen\('C8', inputs\.hasHeating\)/, 'C8 rige la calefacción')
  assert.match(panel, /foreseen\('C9', inputs\.hasCooling\)/, 'C9 rige el aire acondicionado')
  assert.match(panel, /foreseen\('C10', inputs\.hasDryer\)/, 'C10 rige la secadora')
})

test('la card permite declarar el aislamiento de toda la vivienda', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /Aislamiento de la instalación \(kΩ\)/, 'la etiqueta explica la unidad')
  assert.match(panel, /id="interior-insulation"/, 'un solo campo para la vivienda seleccionada')
  assert.match(panel, /insulationKohm/, 'el valor viaja en el estado del interior')
})

test('the default circuit count follows the electrification grade', () => {
  assert.equal(DEFAULT_CIRCUITS.basic, 5)
  assert.equal(DEFAULT_CIRCUITS.elevated, 10)
  assert.equal(defaultCircuitsFor(5750), 5, 'básica 25 A')
  assert.equal(defaultCircuitsFor(7360), 5, 'básica 32 A')
  assert.equal(defaultCircuitsFor(9200), 10, 'elevada 40 A')
  assert.equal(defaultCircuitsFor(11500), 10, 'elevada 50 A')
  assert.equal(defaultCircuitsFor(14490), 10, 'elevada 63 A')
  assert.equal(defaultCircuitsFor(1234), 5, 'an unknown step falls back to the basic default')

  assert.deepEqual(resolveInterior(9200, undefined), { contractedPowerW: 9200, circuits: 10, hasSurge: false, lengths: {}, rooms: [], hasHeating: false, hasCooling: false, hasDryer: false })
  assert.equal(resolveInterior(9200, { contractedPowerW: 4600 }).contractedPowerW, 4600, 'a declared contracted power is respected')
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

test('the normalized contracting series starts at 1,5 A and ends at 63 A', () => {
  assert.deepEqual(ICP_RATINGS, [1.5, 3, 3.5, 5, 7.5, 10, 16, 20, 25, 32, 40, 50, 63], 'the modern series: 16 A and 32 A, without the 15 · 30 · 35 · 45 of the old ICP-M')
  assert.deepEqual(ICP_RATINGS, NORMATIVE_REGISTRY['icp.ratings'].values.ratingsA, 'the registry is the only source')
  assert.match(NORMATIVE_REGISTRY['icp.ratings'].source, /Potencias de contratación normalizadas por ICP/)
  assert.match(NORMATIVE_REGISTRY['icp.ratings'].source, /UNE 20-317/)

  for (const rating of ICP_RATINGS) {
    assert.equal(icpRatingFor(rating), rating, `${rating} A is its own calibre`)
  }
})

test('each power step of table A maps to the calibre the registry already declares', () => {
  const steps = [[5750, 25], [7360, 32], [9200, 40], [11500, 50], [14490, 63]]
  for (const [watts, rating] of steps) {
    assert.equal(icpRatingFor(icpCurrentFor(watts)), rating, `${watts} W → ${rating} A`)
  }
  assert.equal(icpRatingFor(14490 / 230), 63, 'the maximum step stays inside the series despite the floating-point division')
})

test('the calibre rounds the current up, never down', () => {
  assert.equal(icpRatingFor(icpCurrentFor(5751)), 32, '5751 W goes to the calibre above 25 A')
  assert.equal(icpRatingFor(icpCurrentFor(5749)), 25, '5749 W stays on 25 A')
  assert.equal(icpRatingFor(icpCurrentFor(1000)), 5, '1000 W → 4,35 A → 5 A')
  assert.equal(icpRatingFor(0.5), 1.5, 'below the first rating the smallest one applies')
})

test('above the last calibre no rating is invented', () => {
  const current = icpCurrentFor(15000)
  assert.equal(typeof current, 'number', 'the current is still calculated')
  assert.equal(icpRatingFor(current), null, 'nothing above 63 A')

  const evaluation = evaluateInterior({ igaA: 63, powerW: 14490, ...DEFAULT_INTERIOR, contractedPowerW: 15000 })
  assert.equal(evaluation.icpCurrentA, 15000 / 230, 'the current survives at icpCurrentA')
  assert.equal(evaluation.icpRatingA, null, 'without a calibre of the series')
})

test('junk input to the calibre never throws and never invents a rating', () => {
  for (const value of [null, undefined, NaN, 0, -5, -0.0001, Infinity, -Infinity, 'veinte']) {
    assert.equal(icpRatingFor(value), null, `${String(value)} has no calibre`)
  }
})

test('evaluateInterior keeps the old current next to the new calibre', () => {
  const cases = [[5750, 25], [7360, 32], [9200, 40], [11500, 50], [14490, 63], [7000, 32], [4600, 20]]
  for (const [contractedPowerW, rating] of cases) {
    const result = evaluateInterior({ igaA: null, powerW: 5750, ...DEFAULT_INTERIOR, contractedPowerW })
    assert.equal(result.icpCurrentA, contractedPowerW / 230, 'the current is the contracted power divided by 230 V')
    assert.equal(result.icpRatingA, rating, `${contractedPowerW} W → ${rating} A`)
  }

  const withoutPower = evaluateInterior({ igaA: 25, powerW: 5750, ...DEFAULT_INTERIOR })
  assert.equal(withoutPower.icpCurrentA, null, 'without contracted power there is no current')
  assert.equal(withoutPower.icpRatingA, null, 'and no calibre')
})

test('the series lives only in the normative registry', () => {  const engine = read('lib/interior-installation.mjs')
  assert.doesNotMatch(engine, /7\.5, 10, 16/, 'the engine reads the series, it does not rewrite it')
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
  assert.doesNotMatch(panel, /Circuitos instalados/, 'the circuit count comes from the grade, not from a field')
  assert.match(panel, /La potencia contratada puede ser diferente a la prevista/, 'the didactic mode explains that contracted and forecast power differ')
  assert.match(panel, /explanationMode === 'didactic' && <span[^>]*>La potencia contratada/, 'the note only shows in didactic mode')
  assert.match(panel, /aria-label="Vivienda anterior"/, 'the previous-dwelling button exists')
  assert.match(panel, /aria-label="Vivienda siguiente"/, 'the next-dwelling button exists')
  assert.match(panel, /ChevronLeft/, 'the previous button uses the left icon')
  assert.match(panel, /ChevronRight/, 'the next button uses the right icon')
  assert.match(panel, /dwellings\[currentIndex \+ delta\]/, 'the buttons move through the dwelling list')
  assert.match(panel, /disabled=\{currentIndex <= 0\}/, 'the first dwelling disables the previous button')
  assert.match(panel, /disabled=\{currentIndex >= dwellings\.length - 1\}/, 'the last dwelling disables the next button')
  assert.match(help, /id="interiores"/, 'the help explains the tab')
})

test('the didactic step keeps the division and shows the rounding to the calibre', () => {
  const input = { igaA: 25, powerW: 5750, ...DEFAULT_INTERIOR, contractedPowerW: 5750 }
  const step = explainInterior(input, evaluateInterior(input)).steps.find(candidate => candidate.id === 'interior-icp')
  assert.equal(step.substitution, 'I_ICP = 5750 W / 230 V', 'the division stays visible as the substitution')
  assert.equal(step.result, '25,00 A → ICP 25 A', 'the result is the calibre the current rounds up to')

  const above = { ...input, contractedPowerW: 15000 }
  const aboveStep = explainInterior(above, evaluateInterior(above)).steps.find(candidate => candidate.id === 'interior-icp')
  assert.match(aboveStep.result, /65,22 A → sin calibre: fuera de la serie normalizada/, 'above the last calibre the current is shown and flagged')
})

test('every place that reads the ICP shows the calibre of the series', () => {
  const calc = read('components/load-calculator.tsx')
  const panel = read('components/interior-panel.tsx')
  const help = read('components/help-doc.tsx')
  const explanations = read('lib/calculation-explanations.mjs')

  assert.match(panel, /evaluation\.icpRatingA/, 'the DGMP card reads the calibre')
  assert.match(panel, /fuera de la serie normalizada/, 'the card flags a current outside the series')
  assert.equal(calc.split('\n').filter(line => line.includes('evaluation.icpRatingA')).length, 2, 'the installations table and the PDF page read the calibre')
  assert.match(calc, /fuera de serie/, 'the PDF flags a current outside the series')
  assert.match(explanations, /evaluation\.icpRatingA/, 'the didactic step shows the rounding to the calibre')

  assert.doesNotMatch(help, /calibre inventado/, 'the help no longer denies that the ICP is a calibre')
  assert.match(help, /serie normalizada/, 'the help names the normalized series')
  assert.match(help, /redondea .*nunca .*abajo/, 'the help states that the current is rounded up, never down')
})
