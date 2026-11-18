import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

test('el switch compartido usa los behaviors de UI SDK y conserva su API', () => {
  const source = read('components/ui/switch.tsx')
  assert.match(source, /from '@ui-sdk\/react\/switch'/, 'usa el Switch del SDK')
  assert.match(source, /SwitchThumb/, 'el thumb viene del SDK')
  assert.match(source, /onCheckedChange\?:\s*\(checked: boolean\) => void/, 'la API pública sigue recibiendo un booleano')
  assert.match(source, /data-\[checked\]/, 'el estado se estila con data-checked')
  assert.match(source, /\bCheck\b/, 'el estado encendido muestra un check')
  assert.match(source, /\bX\b/, 'el estado apagado muestra una x')
  assert.match(source, /state\.checked/, 'el icono sigue al estado del switch')
  assert.match(source, /motion-reduce:transition-none/, 'la animación respeta movimiento reducido')
  assert.match(source, /data-\[checked\]:bg-primary/, 'el color encendido sale del tema')
  assert.doesNotMatch(source, /@base-ui\/react\/switch/, 'ya no depende del switch de Base UI')
})

test('SwitchField conecta rótulo, descripción y card completa', () => {
  const source = read('components/ui/switch-field.tsx')
  assert.match(source, /from '@ui-sdk\/react\/field'/, 'usa Field del SDK')
  assert.match(source, /FieldLabel/, 'el rótulo nombra el control')
  assert.match(source, /FieldDescription/, 'la descripción queda conectada')
  assert.match(source, /after:inset-0/, 'un clic en cualquier punto de la card alterna el switch')
  assert.match(source, /description\?:\s*string/, 'la descripción es opcional')
})

test('los dos switches de la app pasan por el nuevo patrón', () => {
  const docs = read('components/documentation-panel.tsx')
  assert.match(docs, /SwitchField/, 'las filas de documentación usan el field')
  assert.match(docs, /description=\{toggle\.hint\}/, 'la pista se pasa como descripción')
  assert.match(docs, /label=\{toggle\.label\}/, 'el rótulo se mantiene estable')

  const calc = read('components/load-calculator.tsx')
  assert.match(calc, /import \{ Switch \} from '@\/components\/ui\/switch'/, 'el modo didáctico conserva su import')
  assert.match(calc, /id="explanation-mode"/, 'conserva el id del switch')
})
