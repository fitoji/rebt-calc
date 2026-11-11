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

/**
 * Una sección de la previsión: desde su título hasta el cierre de la card.
 *
 * @param {string} code
 * @param {string} title
 */
function sectionBlock(code, title) {
  const start = cargas.indexOf(`<SectionTitle code="${code}" title="${title}"`)
  assert.notEqual(start, -1, `${code} sigue en la previsión`)
  const end = cargas.indexOf('</section>', start)
  assert.notEqual(end, -1, `${code} se cierra`)
  return cargas.slice(start, end)
}

const p2 = sectionBlock('P2', 'Servicios generales')
const p3 = sectionBlock('P3', 'Locales, oficinas e industrias')
const p5 = sectionBlock('P5', 'Recarga de vehículos eléctricos')

const POWER_LABELS = ['Potencia de alumbrado exterior', 'Potencia de piscinas y fuentes']

const P2_LABELS = ['Líneas con apoyos comunes con AT, tensiones especiales, rótulos luminosos o cercas eléctricas']

const P3_LABELS = [
  'Local de pública concurrencia',
  'Local con riesgo de incendio o explosión',
  'Quirófanos y salas de intervención',
  'Locales húmedos, polvorientos o con riesgo de corrosión',
  'Locales mojados',
]

const P5_LABELS = [
  'Recarga de vehículo eléctrico en el exterior',
  'Estaciones de recarga en modo de carga 4',
]

const CARD_LABELS = ['Instalación de carácter temporal']

const TOGGLE_LABELS = [...P2_LABELS, ...P3_LABELS, ...P5_LABELS, ...CARD_LABELS]

/** La tabla de criterios del panel: rótulo y nota de cada clave. */
const togglesTable = (() => {
  const start = panel.indexOf('const TOGGLES:')
  assert.notEqual(start, -1, 'el panel declara la tabla de criterios')
  const end = panel.indexOf('\n]', start)
  assert.notEqual(end, -1, 'la tabla de criterios se cierra')
  return panel.slice(start, end)
})()

/** Rótulo de cada criterio: se declara una sola vez, en el panel. */
const TOGGLE_LABEL_BY_KEY = new Map(
  [...togglesTable.matchAll(/key: '([A-Za-z0-9]+)',\s*\n\s*label: '([^']+)',/g)].map(match => [match[1], match[2]]),
)

/** La tabla de potencias del panel: la clave y su rótulo, declarados una sola vez. */
const POWER_LABEL_BY_KEY = (() => {
  const start = panel.indexOf('const POWER_FIELDS:')
  assert.notEqual(start, -1, 'el panel declara la tabla de potencias')
  const end = panel.indexOf('\n]', start)
  assert.notEqual(end, -1, 'la tabla de potencias se cierra')
  return new Map(
    [...panel.slice(start, end).matchAll(/key: '([A-Za-z0-9]+)',\s*\n\s*label: '([^']+)',/g)].map(match => [match[1], match[2]]),
  )
})()

/**
 * Claves que el panel entrega a cada destino. El reparto es la única fuente de
 * la colocación: la card y los grupos de P3/P5 filtran la misma tabla.
 *
 * @param {string} name
 */
function groupKeys(name) {
  const declared = panel.indexOf(`const ${name}:`)
  assert.notEqual(declared, -1, `el panel declara ${name}`)
  const open = panel.indexOf('[', declared)
  const close = panel.indexOf(']', open)
  assert.ok(open > -1 && close > open, `${name} es una lista literal`)
  return [...panel.slice(open + 1, close).matchAll(/'([A-Za-z0-9]+)'/g)].map(match => match[1])
}

/**
 * Rótulos de una lista de claves, en su orden.
 *
 * @param {string[]} keys
 */
function labelsOf(keys) {
  return keys.map(key => {
    const label = TOGGLE_LABEL_BY_KEY.get(key)
    assert.ok(label, `el panel rotula la clave ${key}`)
    return label
  })
}

/**
 * Rótulos de una lista de potencias de documentación, en su orden.
 *
 * @param {string[]} keys
 */
function powerLabelsOf(keys) {
  return keys.map(key => {
    const label = POWER_LABEL_BY_KEY.get(key)
    assert.ok(label, `el panel rotula la potencia ${key}`)
    return label
  })
}

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
  assert.deepEqual([...POWER_LABEL_BY_KEY.values()], POWER_LABELS, 'cada potencia se rotula una sola vez, en su tabla')
  assert.match(panel, /type="number"/, 'las potencias se escriben como números')
  assert.match(panel, /min="0"/, 'ninguna potencia admite valores negativos')
})

test('S6: las dos potencias siguen la unidad elegida donde se montan', () => {
  for (const group of ['p2', 'p3']) {
    assert.match(
      cargas,
      new RegExp(`<DocumentationToggles group="${group}"[\\s\\S]{0,200}powerUnit=\\{powerUnit\\}`),
      `${group} recibe la unidad activa`,
    )
  }
  assert.match(panel, /powerFieldValue\(documentation\[field\.key\], powerUnit\)/, 'la potencia se lee en la unidad activa')
  assert.match(panel, /storePower\(Number\(event\.target\.value\), powerUnit\)/, 'el valor se guarda en vatios desde la unidad activa')
  assert.match(panel, /step=\{powerUnit === 'kW' \? '0\.01' : '1'\}/, 'el paso del campo cambia con la unidad')
})

test('S6: el alumbrado exterior se declara dentro de P2', () => {
  assert.deepEqual(powerLabelsOf(groupKeys('P2_POWER_KEYS')), ['Potencia de alumbrado exterior'], 'P2 recibe el alumbrado exterior')
  assert.match(
    p2,
    /<DocumentationToggles group="p2" documentation=\{documentation\} onChange=\{/,
    'P2 monta su grupo con el mismo estado y el mismo parche',
  )
  assert.match(panel, /no suman a P2/, 'el grupo de P2 dice que estos datos no suman a P2')
})

test('S6: las piscinas y fuentes se declaran dentro de P3', () => {
  assert.deepEqual(powerLabelsOf(groupKeys('P3_POWER_KEYS')), ['Potencia de piscinas y fuentes'], 'P3 recibe piscinas y fuentes')
  assert.match(panel, /no suman a P3/, 'el grupo de P3 dice que estos datos no suman a P3')
})

test('S6: los nueve criterios se declaran una sola vez y todos tienen destino', () => {
  const declared = [...panel.matchAll(/label: '([^']+)'/g)].map(match => match[1])
  for (const label of TOGGLE_LABELS) {
    assert.ok(declared.includes(label), `el panel declara «${label}»`)
    assert.ok(panel.includes(label), `el panel rotula «${label}»`)
  }
  const placed = [...groupKeys('P2_TOGGLE_KEYS'), ...groupKeys('P3_TOGGLE_KEYS'), ...groupKeys('P5_TOGGLE_KEYS'), ...groupKeys('CARD_TOGGLE_KEYS')]
  assert.equal(new Set(placed).size, TOGGLE_LABELS.length, 'cada criterio tiene un solo destino')
  assert.deepEqual([...placed].sort(), [...TOGGLE_LABEL_BY_KEY.keys()].sort(), 'no queda ningún criterio fuera del reparto')
  assert.match(panel, /<Switch/, 'cada criterio se enciende con un interruptor')
  assert.match(panel, /onCheckedChange=\{/, 'el interruptor avisa del cambio')
  assert.doesNotMatch(panel, /calculator-storage/, 'el panel es presentacional: no toca el almacenamiento')
})

test('S6: las categorías de locales se preguntan dentro de P3', () => {
  assert.deepEqual(labelsOf(groupKeys('P3_TOGGLE_KEYS')), P3_LABELS, 'P3 reúne las cinco categorías de locales')
  assert.match(
    p3,
    /<DocumentationToggles group="p3" documentation=\{documentation\} onChange=\{/,
    'P3 monta su grupo con el mismo estado y el mismo parche',
  )
})

test('S6: las líneas con apoyos comunes con AT se deciden dentro de P2', () => {
  assert.deepEqual(labelsOf(groupKeys('P2_TOGGLE_KEYS')), P2_LABELS, 'P2 reúne lo que la previsión de servicios generales no revela')
  assert.match(
    panel,
    /los ascensores y las máquinas de elevación y transporte se deducen de P2|se deducen de los ascensores y motores de P2/,
    'el interruptor manual dice que la elevación ya no se pregunta: se deduce de P2',
  )
})

test('S6: las categorías de recarga se preguntan dentro de P5', () => {
  assert.deepEqual(labelsOf(groupKeys('P5_TOGGLE_KEYS')), P5_LABELS, 'P5 reúne las dos categorías de recarga')
  assert.match(
    p5,
    /<DocumentationToggles group="p5" documentation=\{documentation\} onChange=\{/,
    'P5 monta su grupo con el mismo estado y el mismo parche',
  )
  assert.match(panel, /no suman a P5/, 'P5 dice por qué estas categorías viven aquí')
})

test('S6: la card de documentación solo conserva la instalación temporal', () => {
  assert.deepEqual(labelsOf(groupKeys('CARD_TOGGLE_KEYS')), CARD_LABELS, 'la card se queda solo con el criterio sin bloque de previsión')
  const start = panel.indexOf('export function DocumentationPanel(')
  assert.notEqual(start, -1, 'el panel de la card sigue existiendo')
  const card = panel.slice(start)
  for (const label of [...P2_LABELS, ...P3_LABELS, ...P5_LABELS]) {
    assert.ok(!card.includes(label), `«${label}» ya no se rotula en la card`)
  }
  assert.match(card, /CARD_TOGGLE_KEYS/, 'la card filtra sus criterios de la tabla común, no los copia')
  assert.doesNotMatch(card, /POWER_FIELDS/, 'las potencias se fueron con su sección')
  assert.doesNotMatch(card, /powerUnit/, 'la card ya no escribe potencias')
  assert.match(card, /los de servicios generales en P2/, 'la card dice que P2 pregunta sus criterios')
  assert.match(card, /los de locales en P3/, 'la card dice que P3 pregunta sus criterios')
  assert.match(card, /los de recarga en P5/, 'la card dice que P5 pregunta sus criterios')
  assert.match(card, /no suman a P1–P5/, 'la card dice que el conjunto nunca suma a P1–P5')
})

test('S6: los nueve criterios siguen llegando al clasificador', () => {
  const start = calc.indexOf('classifyDocumentation({')
  assert.notEqual(start, -1, 'la previsión clasifica su documentación')
  const end = calc.indexOf('}).verdict', start)
  assert.notEqual(end, -1, 'la llamada al clasificador se cierra')
  assert.match(calc.slice(start, end), /\bdocumentation,/, 'el clasificador recibe el bloque completo, viva donde viva cada interruptor')
  assert.match(calc, /saveDocumentationSnapshot\(window\.localStorage, \{[\s\S]*?\n\s*\}\)/, 'la instantánea de /requisitos se sigue guardando')
})

test('S6: la elevación sale de la previsión, no de una casilla', () => {
  const start = calc.indexOf('classifyDocumentation({')
  assert.notEqual(start, -1, 'la previsión clasifica su documentación')
  const end = calc.indexOf('}).verdict', start)
  assert.notEqual(end, -1, 'la llamada al clasificador se cierra')
  assert.match(
    calc.slice(start, end),
    /hasLiftingMachines: elevators\.length > 0 \|\| motors\.length > 0/,
    'el grupo j se deriva de los ascensores y motores de P2',
  )

  const snapshotArgs = calc.match(/saveDocumentationSnapshot\(window\.localStorage, \{[\s\S]*?\n\s*\}\)/)
  assert.ok(snapshotArgs, 'la instantánea se sigue guardando')
  assert.match(
    snapshotArgs[0],
    /hasLiftingMachines: elevators\.length > 0 \|\| motors\.length > 0/,
    'la instantánea de /requisitos lleva el dato derivado',
  )
})

test('S6: el panel se explica y remite al veredicto de /requisitos', () => {
  assert.ok(panel.includes('ITC-BT-04 §3'), 'el panel cita la instrucción')
  assert.ok(panel.includes('datos de documentación'), 'el panel dice qué son estos datos')
  assert.ok(panel.includes('no suman a P1–P5'), 'el panel dice que no suman a P1–P5')
  assert.ok(panel.includes('P1–P5'), 'el panel nombra las potencias que no cambia')
  assert.ok(panel.includes('los de recarga en P5'), 'el panel dice dónde vive cada categoría')
  assert.ok(panel.includes('los de servicios generales en P2'), 'el panel dice que P2 también pregunta sus criterios')
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

// El REBT no manda sumar estas instalaciones a la previsión del edificio: el
// alumbrado exterior es una instalación propia (ITC-BT-09 §1) y la ITC-BT-10 no
// les da bloque. La card lo dice con la cita, para que no parezca un olvido.
test('la card explica por qué esas potencias no suman, con la cita', () => {
  const panel = read('components/documentation-panel.tsx')
  assert.match(panel, /instalación propia \(ITC-BT-09 §1\)/, 'el alumbrado exterior se justifica con su ITC')
  assert.match(panel, /la ITC-BT-10 no (le asigna bloque|le da bloque)/, 'la previsión del edificio no tiene bloque para ellas')
  assert.match(panel, /piscinas y fuentes son una instalación propia/, 'las piscinas se justifican igual')
})
