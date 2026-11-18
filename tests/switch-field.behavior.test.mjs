import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const { Switch, SwitchThumb } = await import(require.resolve('@ui-sdk/react/switch'))
const { Field, FieldLabel, FieldDescription } = await import(require.resolve('@ui-sdk/react/field'))
const h = React.createElement

test('el id, el aria-label y la descripción llegan al botón del switch', () => {
  for (const checked of [true, false]) {
    const html = renderToStaticMarkup(h(Field, null,
      h(FieldLabel, { htmlFor: 'doc-show' }, 'Datos administrativos'),
      h(FieldDescription, null, 'Se imprimen en la hoja 2'),
      h(Switch, {
        id: 'doc-show',
        'aria-label': 'Datos administrativos',
        checked,
        onCheckedChange() {},
      }, h(SwitchThumb, null))
    ))
    assert.match(html, /id="doc-show"/)
    assert.match(html, /aria-label="Datos administrativos"/)
    assert.match(html, /Se imprimen en la hoja 2/)
    assert.match(html, checked ? /data-checked=""/ : /data-unchecked=""/)
  }
})

test('el thumb recibe el estado para poder cambiar de icono', () => {
  const html = renderToStaticMarkup(h(Switch, { checked: true, onCheckedChange() {} },
    h(SwitchThumb, null, state => h('span', { 'data-probe': String(state.checked) }, 'icono'))
  ))
  assert.match(html, /data-probe="true"/, 'el children del thumb ve el estado')
  assert.match(html, /icono/)
})
