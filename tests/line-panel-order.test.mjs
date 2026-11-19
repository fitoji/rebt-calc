import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const modules = readFileSync(new URL('../components/line-modules.tsx', import.meta.url), 'utf8')
const at = text => modules.indexOf(text)

/** Devuelve el cuerpo de un panel, desde su export hasta el siguiente. */
function panel(name, nextName) {
  const start = at(`export function ${name}`)
  const end = at(nextName.startsWith('export') ? nextName : `function ${nextName}`)
  assert.ok(start >= 0, `${name} exists`)
  assert.ok(end > start, `${nextName} follows ${name}`)
  return modules.slice(start, end)
}

test('la LGA se lee en el orden de la ITC-BT-14: instalación (§2) y después cables (§3)', () => {
  const lga = panel('LgaPanel', 'DiPanel')
  const order = [
    'title="Instalación"',
    'clause="ITC-BT-14 §2"',
    'title="Cables"',
    'clause="ITC-BT-14 §3"',
  ]

  for (let index = 1; index < order.length; index += 1) {
    assert.ok(
      lga.indexOf(order[index - 1]) >= 0 && lga.indexOf(order[index - 1]) < lga.indexOf(order[index]),
      `${order[index - 1]} va antes de ${order[index]}`,
    )
  }

  assert.ok(lga.indexOf('title="Cables"') < lga.indexOf('<LineSectionField role="lga"'), 'la sección adoptada vive en Cables')
  assert.ok(lga.indexOf('<InstallationFields') < lga.indexOf('<LineSectionField role="lga"'), 'la instalación va antes que los cables')
  assert.ok(lga.indexOf('id="lga-protection"') > lga.indexOf('title="Cables"'), 'la protección cierra Cables')
})

test('la derivación se lee en el orden de la ITC-BT-15: instalación (§2) y después cables (§3)', () => {
  const di = panel('DiPanel', 'SimpleTable')
  const order = [
    'title="Instalación"',
    'clause="ITC-BT-15 §2"',
    'title="Cables"',
    'clause="ITC-BT-15 §3"',
  ]

  for (let index = 1; index < order.length; index += 1) {
    assert.ok(
      di.indexOf(order[index - 1]) >= 0 && di.indexOf(order[index - 1]) < di.indexOf(order[index]),
      `${order[index - 1]} va antes de ${order[index]}`,
    )
  }

  assert.ok(di.indexOf('title="Cables"') < di.indexOf('<LineSectionField role="di"'), 'la sección adoptada vive en Cables')
  assert.ok(di.indexOf('<InstallationFields') < di.indexOf('<LineSectionField role="di"'), 'la instalación va antes que los cables')

  // Neutro, PE, hilo de mando y protección son conductores de la §3: van juntos
  // y después de los criterios de cálculo.
  for (const id of ['id="di-neutral"', 'id="di-pe"', 'id="di-control"', 'id="di-protection"']) {
    assert.ok(di.indexOf(id) > di.indexOf('title="Cables"'), `${id} vive en Cables`)
  }
})

test('los campos físicos no se repiten en el bloque de cables', () => {
  const installation = modules.slice(at('function InstallationFields'), at('function LgaInsulationField'))
  const cables = modules.slice(at('title="Cables"'), at('{showSourceNotes && <SourceNote label="ITC-BT-14 §3">'))

  for (const id of ['-installation', '-method', '-layout', '-circuits', '-layers', '-tubes', '-tube']) {
    assert.ok(installation.includes(`id={\`\${idPrefix}${id}\`}`), `Instalación declara ${id}`)
    assert.ok(!cables.includes(`${id}\``), `Cables no repite ${id}`)
  }
})

test('el sello del apartado acompaña al título, sin rótulo encima', () => {
  assert.match(modules, /<h4 id=\{id\} className="text-xs font-semibold uppercase tracking-wide text-ink-muted">\{title\}<\/h4>/,
    'el título del bloque es el encabezado')
  assert.match(modules, /<span className="rounded-control border border-line px-1\.5 py-0\.5 text-\[11px\] font-medium tabular-nums text-ink-faint">\{clause\}<\/span>/,
    'el apartado va en la misma línea, como sello')
})

test('aislamiento y conductividad se leen juntos, uno al lado del otro', () => {
  const lga = panel('LgaPanel', 'DiPanel')
  const di = panel('DiPanel', 'SimpleTable')

  for (const [name, body, insulation] of [
    ['LGA', lga, '<LgaInsulationField'],
    ['DI', di, '<InsulationField'],
  ]) {
    const start = body.indexOf(insulation)
    const end = body.indexOf('<ConductivityField')
    assert.ok(start >= 0 && end > start, `${name}: el aislamiento va antes que la conductividad`)
    assert.doesNotMatch(body.slice(start, end), /<NumberField/, `${name}: no hay otro campo entre aislamiento y conductividad`)
  }
})

test('el modo didáctico añade la lectura de cada apartado', () => {
  assert.match(modules, /const didactic = explanationMode === 'didactic'/, 'el panel conoce el modo')
  assert.equal([...modules.matchAll(/note=\{didactic \?/g)].length, 2, 'la §2 explica su alcance sólo en didáctico')
  assert.equal([...modules.matchAll(/\{didactic && '/g)].length, 2, 'la §3 añade el mínimo en didáctico')
})
