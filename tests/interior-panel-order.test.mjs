import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const panel = readFileSync(path.join(root, 'components/interior-panel.tsx'), 'utf8')
const at = text => panel.indexOf(text)

test('Cuadros ordena contratación, protecciones, canalización y circuitos', () => {
  const order = [
    'Contratación y medida',
    'Protección general',
    'Protección contra sobretensiones',
    'Canalización y conductores',
    'Circuitos de la vivienda',
  ]
  for (let index = 1; index < order.length; index += 1) {
    assert.ok(at(order[index - 1]) >= 0 && at(order[index - 1]) < at(order[index]), `${order[index - 1]} va antes de ${order[index]}`)
  }
})

test('la potencia contratada y su ICP quedan juntos y antes que el IGA', () => {
  assert.ok(at('Potencia contratada') < at('ICP · calibre de la potencia contratada'), 'el ICP acompaña a la potencia contratada')
  assert.ok(at('ICP · calibre de la potencia contratada') < at('Protección general'), 'contratación antes que protección general')
  assert.ok(at('Protección general') < at('IGA<TableButton'), 'el IGA vive en protección general')
})

test('sobretensiones es un bloque propio con su tipo condicionado', () => {
  assert.match(panel, /<PanelSection title="Protección contra sobretensiones">/)
  assert.match(panel, /\{inputs\.hasSurge && \(/)
  assert.match(panel, /id="interior-surge-type"/)
})
