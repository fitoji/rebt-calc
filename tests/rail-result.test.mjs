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
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => readFileSync(path.join(root, relative), 'utf8')
const calc = read('components/load-calculator.tsx')
const resultPath = 'components/rail-result.tsx'

// Lectura perezosa: sin el componente, cada test falla por su propio motivo en
// vez de tumbar el archivo entero en tiempo de carga.
const railResult = () => read(resultPath)

const asideAt = calc.indexOf('<aside ')
const tabsAt = calc.indexOf('<Tabs ')
const tabsEnd = calc.indexOf('</Tabs>', tabsAt)
const rail = calc.slice(asideAt, tabsEnd)

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
  const source = railResult()
  const headings = {
    CargasRailCard: 'Resultado del proyecto',
    LgaRailCard: 'Resultado de la LGA',
    DiRailCard: 'Resultado de las derivaciones',
    CuadrosRailCard: 'Resultado del cuadro',
    EsquemaRailCard: 'Resultado del esquema',
  }
  // Cada variante llega hasta la siguiente: así se mide la tarjeta, no el módulo.
  const variantBody = name => {
    const start = source.indexOf(`function ${name}(`)
    assert.ok(start > 0, `${name} exists`)
    const end = source.indexOf('\nfunction ', start + 1)
    return source.slice(start, end === -1 ? undefined : end)
  }

  for (const [name, heading] of Object.entries(headings)) {
    assert.match(variantBody(name), new RegExp(`heading="${heading}"`), `${name} se titula «${heading}»`)
    for (const [otherName, otherHeading] of Object.entries(headings)) {
      if (otherName === name) continue
      assert.doesNotMatch(variantBody(name), new RegExp(`heading="${otherHeading}"`), `${name} no se titula «${otherHeading}»`)
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
