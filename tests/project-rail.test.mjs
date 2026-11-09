import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')
const calc = read('components/load-calculator.tsx')

const asideAt = calc.indexOf('<aside ')
const lastPanelEnd = calc.lastIndexOf('</TabsContent>')
const tabsAt = calc.indexOf('<Tabs ')
const tabsEnd = calc.indexOf('</Tabs>', tabsAt)

// El problema que motiva el cambio: las acciones de proyecto viven dentro del
// panel de Previsión y desaparecen al cambiar de pestaña.
test('el rail de proyecto vive fuera de los paneles y dentro de las tabs', () => {
  assert.ok(asideAt > 0, 'the project rail exists')
  assert.ok(lastPanelEnd > 0, 'the tab panels exist')
  assert.ok(
    asideAt > lastPanelEnd,
    'the rail must sit after the last TabsContent so it persists on every tab',
  )
  assert.ok(tabsAt < asideAt && asideAt < tabsEnd, 'the rail stays inside the Tabs container')
})

// Las acciones se agrupan por lo que la persona reconoce, no por su origen.
test('el rail agrupa las acciones por propósito', () => {
  const rail = calc.slice(asideAt, tabsEnd)
  for (const group of ['Proyecto', 'Configuración', 'Salida', 'Referencias']) {
    assert.match(
      rail,
      new RegExp(`<RailGroup title="${group}"`),
      `the rail groups actions under «${group}»`,
    )
  }
})

// Una sola CTA primaria en el rail: descargar. El resto queda como secundaria.
// Los botones dentro de un diálogo cuentan como primarios de su modal, no del
// rail, así que se excluyen: acá se mide lo que compite a la vista.
test('Descargar datos es la única acción primaria del rail', () => {
  const rail = calc.slice(asideAt, tabsEnd)
  const visible = rail
    .replace(/<Dialog[\s\S]*?<\/Dialog>/g, '')
    .replace(/<Elec3PreviewDialog[\s\S]*?\/>/g, '')
  const primaries = visible.match(/variant="default"/g) ?? []
  assert.equal(primaries.length, 1, 'exactly one primary button among the visible rail actions')
  assert.match(visible, /variant="default"[^>]*onClick=\{\(\) => setShowDownload\(true\)\}/)
})

// Lo destructivo se separa al final, después de las acciones de salida.
test('Limpiar queda al final y separado de las acciones de salida', () => {
  const rail = calc.slice(asideAt, tabsEnd)
  assert.ok(
    rail.indexOf('Descargar datos') < rail.indexOf('Limpiar'),
    'the destructive action follows the output actions',
  )
  assert.match(rail, /aria-label="Limpiar datos del proyecto y memoria técnica"/)
})

// El rail alto no debe cortar sus últimas acciones en pantallas bajas.
test('el rail tiene scroll propio cuando no entra en la altura visible', () => {
  const railTag = calc.slice(asideAt, calc.indexOf('>', asideAt))
  assert.match(railTag, /xl:sticky/)
  assert.match(railTag, /xl:max-h-\[calc\(100dvh-3rem\)\]/)
  assert.match(railTag, /xl:overflow-y-auto/)
})
