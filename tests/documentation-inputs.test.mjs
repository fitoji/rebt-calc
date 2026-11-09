import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const calc = read('components/load-calculator.tsx')
const panel = read('components/documentation-panel.tsx')

/**
 * Cuerpo de una función del componente: desde su declaración hasta la llave que
 * la cierra, que es la única a dos espacios de sangría.
 *
 * @param {string} start
 */
function body(start) {
  const from = calc.indexOf(start)
  assert.notEqual(from, -1, `${start} existe en load-calculator.tsx`)
  const to = calc.indexOf('\n  }', from)
  assert.notEqual(to, -1, `${start} se cierra`)
  return calc.slice(from, to)
}

/** El objeto que el autoguardado entrega a `saveCalculatorInputs`. */
const autosaveInputs = (() => {
  const start = calc.indexOf('saveCalculatorInputs(window.localStorage, {')
  assert.notEqual(start, -1, 'el cálculo guarda sus entradas con saveCalculatorInputs')
  const end = calc.indexOf('})', start)
  assert.notEqual(end, -1, 'el objeto de entradas del autoguardado se cierra')
  return calc.slice(start, end)
})()

/** El bloque de la pestaña «Previsión de cargas». */
const cargas = (() => {
  const start = calc.indexOf('<TabsContent value="cargas"')
  assert.notEqual(start, -1, 'la pestaña de previsión existe')
  const end = calc.indexOf('<TabsContent value="lga"', start)
  assert.notEqual(end, -1, 'la pestaña de previsión termina antes de la LGA')
  return calc.slice(start, end)
})()

const POWER_LABELS = ['Potencia de alumbrado exterior', 'Potencia de piscinas y fuentes']

const TOGGLE_LABELS = [
  'Local de pública concurrencia',
  'Local con riesgo de incendio o explosión',
  'Quirófanos y salas de intervención',
  'Locales húmedos, polvorientos o con riesgo de corrosión',
  'Locales mojados',
  'Instalación de carácter temporal',
  'Máquinas de elevación y transporte y afines',
  'Recarga de vehículo eléctrico en el exterior',
  'Estaciones de recarga en modo de carga 4',
]

test('S6: el autoguardado lleva el bloque de documentación', () => {
  assert.match(autosaveInputs, /\bdocumentation\b/, 'sin el bloque en las entradas, un proyecto importado se pierde en el siguiente autoguardado')
  assert.match(calc, /useState<Documentation>\(/, 'el cálculo guarda el bloque como estado propio')
  assert.match(calc, /import \{[^}]*\bDEFAULT_DOCUMENTATION\b[^}]*\} from '\.\.\/lib\/project-documentation\.mjs'/, 'los valores por defecto vienen del módulo, no se copian a mano')
  assert.match(calc, /import \{[^}]*\bnormalizeDocumentation\b[^}]*\} from '\.\.\/lib\/project-documentation\.mjs'/, 'la normalización viene del módulo')
})

test('S6: restaurar y limpiar mueven el bloque con el resto del proyecto', () => {
  assert.match(calc, /setDocumentation\(normalizeDocumentation\(savedInputs\.documentation\)\)/, 'el proyecto restaurado siembra el estado con normalizeDocumentation')
  assert.match(body('const clear = () => {'), /setDocumentation\([^\n]*DEFAULT_DOCUMENTATION/, 'Limpiar devuelve el bloque a los valores por defecto')
})

test('S6: importar un proyecto aplica su bloque de documentación', () => {
  assert.match(
    body('const applyProject = ('),
    /setDocumentation\(normalizeDocumentation\(inputs\.documentation\)\)/,
    'applyProject aplica el bloque del archivo normalizado',
  )
})

test('S6: la exportación JSON lleva el bloque de documentación', () => {
  assert.match(body('const downloadJson = () => {'), /\bdocumentation\b/, 'Descargar datos → JSON guarda los datos de documentación')
})

test('S6: el panel se monta al final de la previsión, después de P5', () => {
  assert.match(cargas, /<DocumentationPanel documentation=\{documentation\} onChange=\{/, 'el panel recibe el estado y su onChange')
  const p5 = cargas.indexOf('title="Recarga de vehículos eléctricos"')
  assert.ok(p5 > -1, 'P5 sigue en la previsión')
  assert.ok(cargas.indexOf('<DocumentationPanel') > p5, 'el panel de documentación va después de P5')
})

test('S6: el panel ofrece las dos potencias de documentación', () => {
  for (const label of POWER_LABELS) assert.ok(panel.includes(label), `el panel rotula «${label}»`)
  assert.match(panel, /type="number"/, 'las potencias se escriben como números')
  assert.match(panel, /min="0"/, 'ninguna potencia admite valores negativos')
})

test('S6: el panel ofrece los nueve criterios cualitativos', () => {
  const declared = [...panel.matchAll(/label: '([^']+)'/g)].map(match => match[1])
  for (const label of TOGGLE_LABELS) {
    assert.ok(declared.includes(label), `el panel declara «${label}»`)
    assert.ok(panel.includes(label), `el panel rotula «${label}»`)
  }
  assert.match(panel, /<Switch/, 'cada criterio se enciende con un interruptor')
  assert.match(panel, /onCheckedChange=\{/, 'el interruptor avisa del cambio')
  assert.doesNotMatch(panel, /calculator-storage/, 'el panel es presentacional: no toca el almacenamiento')
})

test('S6: el panel se explica y remite al veredicto de /requisitos', () => {
  assert.ok(panel.includes('ITC-BT-04 §3'), 'el panel cita la instrucción')
  assert.ok(panel.includes('datos de documentación'), 'el panel dice qué son estos datos')
  assert.ok(panel.includes('no suman a la previsión'), 'el panel dice que no suman a la previsión')
  assert.ok(panel.includes('P1–P5'), 'el panel nombra las potencias que no cambia')
  assert.match(panel, /href="\/requisitos"/, 'el veredicto vive en /requisitos y el panel enlaza allí')
})

test('S8: la potencia total prevista no lee el bloque de documentación', () => {
  const start = calc.indexOf('const result = useMemo(')
  assert.notEqual(start, -1, 'el cálculo mantiene un useMemo para la previsión')
  const end = calc.indexOf('}, [housing, locals, garages, elevators, motors, otherLoads, lighting, parking, irveOption, settings])', start)
  assert.notEqual(end, -1, 'el useMemo declara sus dependencias')
  const forecast = calc.slice(start, end)
  assert.doesNotMatch(forecast, /documentation/i, 'los datos de documentación no entran en P1–P5 ni en el total')
  assert.match(forecast, /total: p1 \+ p2 \+ p3 \+ p4 \+ p5/, 'el total sigue siendo la suma de P1 a P5')
})
