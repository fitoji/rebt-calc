import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * La tarjeta oscura del rail deja de mostrar siempre la previsión: sigue a la
 * pestaña activa. Estos pins sostienen el cableado (qué pestaña elige qué
 * tarjeta), los encabezados, la rama sin LGA y las clases que el rail ya tenía
 * fijadas por tests/project-rail.test.mjs. El render no se puede ejercitar sin
 * navegador, así que se fija la estructura, no el DOM.
 *
 * Desde la consolidación, el desglose completo de la LGA y de la derivación
 * seleccionada vive acá: el panel sólo conserva sus controles. Por eso los
 * rótulos de esas dos líneas se fijan en esta tarjeta y no en el panel.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => readFileSync(path.join(root, relative), 'utf8')
const calc = read('components/load-calculator.tsx')
const resultPath = 'components/rail-result.tsx'
const modulesPath = 'components/line-modules.tsx'

// Lectura perezosa: sin el componente, cada test falla por su propio motivo en
// vez de tumbar el archivo entero en tiempo de carga.
const railResult = () => read(resultPath)
const lineModules = () => read(modulesPath)

const asideAt = calc.indexOf('<aside ')
const tabsAt = calc.indexOf('<Tabs ')
const tabsEnd = calc.indexOf('</Tabs>', tabsAt)
const rail = calc.slice(asideAt, tabsEnd)

/** Una variante del rail llega hasta la siguiente función: así se mide la tarjeta, no el módulo. */
const cardBody = name => {
  const source = railResult()
  const start = source.indexOf(`function ${name}(`)
  assert.ok(start > 0, `${name} exists`)
  const end = source.indexOf('\nfunction ', start + 1)
  return source.slice(start, end === -1 ? undefined : end)
}

test('la tarjeta de resultado del rail se extrae a components/rail-result.tsx', () => {
  assert.ok(existsSync(path.join(root, resultPath)), `${resultPath} exists`)
  assert.match(railResult(), /export function RailResult/, 'the module exports the rail result card')
  assert.match(calc, /import \{ RailResult/, 'the rail imports it')
})

// El rail no repite cifras por su cuenta: sólo pinta lo que ya calcularon la
// previsión, el motor de líneas y el cuadro interior.
test('la tarjeta del rail sólo pinta cifras ya calculadas', () => {
  const source = railResult()
  for (const helper of ['computeLine', 'sizeLine', 'evaluateInterior', 'resolveInterior', 'calculateProject']) {
    assert.doesNotMatch(source, new RegExp(`\\b${helper}\\b`), `the card does not re-run ${helper}`)
  }
  assert.match(source, /from '\.\.\/lib\/power-units\.mjs'/, 'power is formatted with the project helper')
  // Los conductores y sus colores se pintan con la pieza que ya existe en el
  // panel: la tarjeta no vuelve a declarar colores de cable.
  assert.match(source, /import \{ ConductorList, type ResultElement \} from '\.\/line-modules'/,
    'the conductor rows come from the panel module, not from a copy')
})

test('el rail renderiza la tarjeta de la pestaña activa', () => {
  assert.ok(asideAt > 0 && tabsEnd > asideAt, 'the rail lives inside the tabs')
  assert.match(rail, /<RailResult/, 'the rail renders the result card')
  assert.match(rail, /tab=\{effectiveActiveTab\}/, 'the card follows the active tab')
})

// Una tarjeta por pestaña, elegida en un solo punto de decisión.
test('hay un componente de resultado por pestaña', () => {
  const source = railResult()
  for (const variant of ['CargasRailCard', 'LgaRailCard', 'DiRailCard', 'CuadrosRailCard', 'EsquemaRailCard']) {
    assert.match(source, new RegExp(`function ${variant}\\(`), `${variant} exists`)
  }
  assert.match(source, /case 'lga': return <LgaRailCard/, 'LGA has its own card')
  assert.match(source, /case 'di': return <DiRailCard/, 'DI has its own card')
  assert.match(source, /case 'interiores': return <CuadrosRailCard/, 'Cuadros has its own card')
  assert.match(source, /case 'esquema': return <EsquemaRailCard/, 'Esquema has its own card')
  assert.match(source, /default: return <CargasRailCard/, 'Previsión is the default card')
})

// Cada tarjeta se nombra con su propio encabezado, sin encabezados cruzados.
test('cada tarjeta se nombra con su propio encabezado', () => {
  const headings = {
    CargasRailCard: 'Resultado del proyecto',
    LgaRailCard: 'Resultado de la LGA',
    DiRailCard: 'Resultado de las derivaciones',
    CuadrosRailCard: 'Resultado del cuadro',
    EsquemaRailCard: 'Resultado del esquema',
  }

  for (const [name, heading] of Object.entries(headings)) {
    assert.match(cardBody(name), new RegExp(`heading="${heading}"`), `${name} se titula «${heading}»`)
    for (const [otherName, otherHeading] of Object.entries(headings)) {
      if (otherName === name) continue
      assert.doesNotMatch(cardBody(name), new RegExp(`heading="${otherHeading}"`), `${name} no se titula «${otherHeading}»`)
    }
  }
})

// Un único usuario no tiene línea general: la tarjeta lo dice en lugar de
// enseñar una sección, una caída y una protección en cero.
test('la rama sin LGA dice que no hay LGA', () => {
  const source = railResult()
  assert.match(source, /installationType === 'single-user'/, 'the card branches on the single-user scenario')
  assert.match(source, /Sin línea general de alimentación/, 'the card says the project has no LGA')
  assert.match(source, /Único usuario/, 'and names the scenario')
})

// Rótulos del resultado de la LGA: se fijan acá porque el desglose se pinta en
// esta tarjeta y ya no dentro del panel.
test('la tarjeta de la LGA lleva el desglose completo de la línea', () => {
  const card = cardBody('LgaRailCard')
  const labels = [
    'Supuesto de enlace',
    'Intensidad de cálculo (Ib)',
    'Intensidad admisible corregida (Iz)',
    'Sección de fase',
    'Conductores y caída de tensión',
    'Sección por caída',
    'Caída con Ib',
    'Caída con In',
    'Momento eléctrico (M)',
    'Conductividad (γ)',
    'Iz de tabla',
    'Factor de agrupamiento',
    'Protección (In)',
  ]
  for (const label of labels) assert.ok(card.includes(label), `la tarjeta de la LGA muestra «${label}»`)
  assert.ok(card.includes('mm²'), 'sections keep their unit')
  assert.ok(card.includes('kW·m'), 'the electric moment keeps its unit')
  assert.ok(card.includes('m/(Ω·mm²)'), 'conductivity keeps its unit')
  assert.ok(card.includes('<ConductorList'), 'the conductor rows are rendered')
})

test('la tarjeta de la LGA encabeza su resultado con las corrientes', () => {
  const source = railResult()
  assert.ok(source.includes('Intensidad de cálculo'), 'the line current leads the card')
  assert.ok(source.includes('Intensidad admisible corregida'), 'the admissible current sits beside it')
  assert.ok(source.includes('(Ib)') && source.includes('(Iz)'), 'both rows name their symbol')
  assert.ok(source.includes('fmtTrim('), 'the headline currents drop the trailing zeros')
  assert.equal([...source.matchAll(/Intensidad de línea \(Ib\)/g)].length, 0, 'one name for Ib in the whole app')
  assert.ok(source.includes('Conductores y caída de tensión'), 'the drop criterion lives with the conductors')
})

// Rótulos del resultado de la DI: incluye la sección normalizada, los
// conductores de la derivación y la rama sin derivación seleccionada.
test('la tarjeta de la DI lleva el desglose completo de la derivación', () => {
  const card = cardBody('DiRailCard')
  const labels = [
    'Potencia total derivada',
    'Sección de fase normalizada',
    'Intensidad de cálculo (Ib)',
    'Sección por caída',
    'Momento eléctrico (M)',
    'Conductividad (γ)',
    'Iz de tabla',
    'Factor de agrupamiento',
    'Iz corregida',
    'Caída con Ib',
    'Caída con In',
    'Protección (In)',
    'IGA (tabla A) · potencia máxima',
    'Elementos de la instalación',
  ]
  for (const label of labels) assert.ok(card.includes(label), `la tarjeta de la DI muestra «${label}»`)
  assert.ok(card.includes('<ConductorList'), 'the element rows are rendered')
  assert.ok(card.includes('Selecciona una derivación'), 'without a selected derivation the card says so')
  assert.doesNotMatch(card, /id="di-power"/, 'the panel inputs do not move into the card')
})

// El panel deja de repetir el resultado: los dos bloques internos desaparecen
// con sus cartas y la tarjeta del rail pasa a ser el único sitio del desglose.
test('el panel ya no pinta su propio bloque de resultado', () => {
  const source = lineModules()
  assert.doesNotMatch(source, /Resultado LGA/, 'the in-panel LGA result card is gone')
  assert.doesNotMatch(source, /Resultado DI/, 'the in-panel DI result is gone')
  assert.doesNotMatch(source, /<LineResult/, 'the shared line card is gone')
  assert.doesNotMatch(source, /function LineResult\(/, 'LineResult no longer exists')
  assert.doesNotMatch(source, /function ResultCard\(/, 'ResultCard had no other caller')
})

test('el panel conserva todos sus controles', () => {
  const source = lineModules()
  assert.ok(source.includes('<InstallationField'), 'the enlace scenario field stays')
  assert.ok(source.includes('id="lga-power"') && source.includes('id="di-power"'), 'the power inputs stay')
  assert.ok(source.includes('id="lga-length"') && source.includes('id="di-length"'), 'the length inputs stay')
  assert.ok(source.includes('onPowerModeChange'), 'the power-mode control stays')
  assert.ok(source.includes('htmlFor="lga-section"'), 'the fixed-section control keeps its label')
  assert.ok(source.includes('onChange({ sectionOverride: section })'), 'the panel persists the fixed section')
  assert.equal([...source.matchAll(/> Tablas\b/g)].length, 2, 'the Tablas button stays in both panels')
})

// El rail no recalcula ninguna línea: recibe el resultado que ya produjo el
// motor y los elementos que arma el panel.
test('el rail recibe el resultado del motor en vez de recalcularlo', () => {
  assert.match(calc, /lga=\{railLga\}/, 'the rail receives the LGA result')
  assert.match(calc, /selectedDerivation=\{railSelectedDerivation\}/, 'and the selected derivation')
  assert.match(calc, /\.\.\.lgaResult/, 'the LGA card gets the engine result as it came out')
  assert.match(calc, /lgaResultElements\(lga, lgaResult\)/, 'the LGA conductors come from the panel module')
  assert.match(calc, /elements: diResultElements\(/, 'the DI conductors come from the panel module')
})

// La receta visual del rail: misma tarjeta oscura, mismo eyebrow, misma cifra
// grande y mismas barras P1–P5.
test('la tarjeta conserva la receta visual del rail', () => {
  const source = railResult()
  assert.match(source, /rounded-panel bg-panel text-panel-foreground shadow-panel/, 'the dark panel is reused')
  assert.match(source, /text-xs font-semibold uppercase tracking-\[0\.2em\] text-brand-on-panel/, 'the eyebrow is reused')
  assert.match(source, /mt-5 text-4xl font-bold tabular-nums tracking-tight/, 'the big figure is reused')
  assert.match(source, /bg-brand-on-panel\/80/, 'the share bars are reused')
  assert.match(source, /bg-panel-line/, 'the card dividers are reused')
})

// Grupos, órdenes y clases del rail: los pins de tests/project-rail.test.mjs
// siguen valiendo sobre load-calculator.tsx.
test('el rail conserva sus clases fijadas', () => {
  const railTag = calc.slice(asideAt, calc.indexOf('<RailResult', asideAt))
  assert.match(railTag, /\[\&\>\*\]:shrink-0/, 'rail children keep their intrinsic height')
  assert.match(railTag, /xl:sticky/, 'the rail is still sticky')
  assert.match(railTag, /xl:max-h-\[calc\(100dvh-3rem\)\]/, 'the rail keeps its height cap')
  assert.match(railTag, /xl:overflow-y-auto/, 'the rail keeps its own scroll')
})

// Sin colores nuevos: la tarjeta usa los tokens del proyecto.
test('la tarjeta no introduce colores nuevos', () => {
  const source = railResult()
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, 'no hex colours')
  assert.doesNotMatch(source, /rgba?\(/, 'no rgb() colours')
  assert.doesNotMatch(source, /bg-\[\S+\]/, 'no arbitrary colour utilities')
})
