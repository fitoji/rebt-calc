import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const calc = read('components/load-calculator.tsx')
const modules = read('components/line-modules.tsx')
const count = (text, re) => text.match(re)?.length ?? 0

test('the three calculation modules are reachable through tabs', () => {
  for (const name of ['tabs']) {
    assert.ok(existsSync(path.join(root, 'components/ui', `${name}.tsx`)), `${name}.tsx installed`)
  }
  assert.match(calc, /from '@\/components\/ui\/tabs'/, 'calculator imports the shadcn tabs')
  for (const value of ['cargas', 'lga', 'di']) {
    assert.ok(calc.includes(`<TabsTrigger value="${value}"`), `tab trigger ${value} present`)
    assert.ok(calc.includes(`<TabsContent value="${value}"`), `tab panel ${value} present`)
  }
  assert.ok(calc.includes('<LgaPanel '), 'LGA panel rendered')
  assert.ok(calc.includes('<DiPanel '), 'DI panel rendered')
})

test('each module offers its reference table viewer', () => {
  assert.ok(calc.includes('<LineTablesDialog '), 'table dialog rendered from the calculator')
  assert.equal(count(modules, /onClick=\{onOpenTables\}/g), 2, 'one table button per module')
  assert.equal(count(modules, /<Table2 data-icon="inline-start" \/> Tabla/g), 2, 'one table button per module')
  assert.ok(modules.includes('aria-label="Cerrar tablas de referencia"'), 'dialog close keeps a Spanish label')
})

test('the panels size lines through the shared engine, not inline formula copies', () => {
  assert.match(modules, /import \{ sizeLine \} from '@\/lib\/line-sizing\.mjs'/, 'engine imported')
  assert.equal(count(modules, /sizeLine\(\{/g), 2, 'one sizing call per module')
  assert.match(modules, /system: 'three-phase'/, 'LGA is three-phase')
  assert.match(modules, /system: 'single-phase'/, 'DI is single-phase')
  assert.doesNotMatch(modules, /Math\.max\([^)]*\* 100/, 'no hardcoded 100 W/m2 ladder')
  assert.doesNotMatch(modules, /recommendedPhase|admissibleCurrent = recommendedPhase/, 'no capped section ladder')
})

test('the table viewer shows the reference source instead of an unattributed list', () => {
  assert.match(modules, /UNE 20460-5-523/, 'norm cited')
  assert.match(modules, /Guía-BT-19/, 'official guide cited')
  assert.match(modules, /40 °C/, 'reference ambient temperature stated')
  assert.match(modules, /400 mm²/, 'published erratum disclosed')
  assert.ok(modules.includes('GROUPING_FACTORS'), 'grouping factors shown')
})
