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
  assert.equal(count(modules, /onClick=\{\(\) => onOpenTables\(\)\}/g), 2, 'one general table button per module')
  assert.equal(count(modules, /> Tablas\b/g), 2, 'the button reads Tablas')
  assert.ok(modules.includes('aria-label="Cerrar tablas de referencia"'), 'dialog close keeps a Spanish label')
})

test('each control opens only the tables it uses', () => {
  assert.ok(modules.includes("label=\"Tipo de instalación\""), 'installation field present')
  assert.ok(modules.includes("tables={['A', 'D']}"), 'installation offers tables A and D')
  assert.ok(modules.includes("tables={['E', 'G']}"), 'disposition offers tables E and G')
  assert.ok(modules.includes("tables={['E', 'F', 'G', 'I']}"), 'layers offer tables E, F, G and I')
  assert.ok(modules.includes("tables={['G', 'H', 'I']}"), 'tubes offer tables G, H and I')
  assert.ok(modules.includes('onOpenTables(tables)'), 'field button forwards its own table set')
  assert.match(modules, /const shows = \(key: TableKey\) => !tables \|\| tables\.includes\(key\)/, 'dialog filters by requested tables')
  assert.ok(calc.includes('tables={lineTableFocus ?? undefined}'), 'calculator passes the focused set to the dialog')
})

test('the panels size lines through the shared engine, not inline formula copies', () => {
  assert.match(modules, /import \{ sizeLine \} from '@\/lib\/line-sizing\.mjs'/, 'engine imported')
  assert.match(modules, /import \{ lineInputFromState \} from '@\/lib\/line-state\.mjs'/, 'line input builder imported')
  assert.equal(count(modules, /sizeLine\(lineInputFromState/g), 1, 'one sizing call, inside computeLine')
  assert.equal(count(modules, /export function computeLine/g), 1, 'one shared helper')
  assert.ok(modules.includes("computeLine(state, 'three-phase')"), 'LGA panel uses the helper')
  assert.ok(modules.includes('computeLine(state, system)'), 'DI panel uses the helper with its own system')
  assert.match(read('lib/line-state.mjs'), /loadedConductors:.*system === 'three-phase' \? 3 : 2/, 'loaded conductors follow the system')
  assert.ok(calc.includes("computeLine(lga, 'three-phase')"), 'JSON and PDF use the same LGA result')
  assert.ok(calc.includes("computeLine(di, 'single-phase')"), 'JSON and PDF use the same DI result')
  assert.doesNotMatch(modules, /Math\.max\([^)]*\* 100/, 'no hardcoded 100 W/m2 ladder')
  assert.doesNotMatch(modules, /recommendedPhase|admissibleCurrent = recommendedPhase/, 'no capped section ladder')
})

test('line inputs persist and reach the exports', () => {
  assert.match(calc, /lga: lineTouched \? lga : null/, 'LGA saved only once touched')
  assert.match(calc, /di: lineTouched \? di : null/, 'DI saved only once touched')
  assert.match(calc, /setLga\(savedInputs\.lga as LineState\)/, 'LGA restored from storage')
  assert.match(calc, /lines: \{/, 'JSON export carries a lines block')
  assert.ok(calc.includes("'6. Línea General de Alimentación · ITC-BT-14'"), 'PDF has an LGA page')
  assert.ok(calc.includes("'7. Derivación Individual · ITC-BT-15'"), 'PDF has a DI page')
})

test('the table viewer shows the reference source instead of an unattributed list', () => {
  assert.match(modules, /UNE 20460-5-523/, 'norm cited')
  assert.match(modules, /Guía-BT-19/, 'official guide cited')
  assert.match(modules, /40 °C/, 'reference ambient temperature stated')
  assert.match(modules, /400 mm²/, 'published erratum disclosed')
  assert.ok(modules.includes('GROUPING_LAYOUTS'), 'grouping layouts shown')
  assert.ok(modules.includes('TUBES_CONTACT_AIR'), 'tubes-in-contact table shown')
  assert.ok(modules.includes('TUBES_CONTACT_BURIED'), 'buried tubes table shown')
  assert.ok(modules.includes('BURIED_CABLE_SPACING'), 'buried cable spacing table shown')
  assert.ok(modules.includes('BURIED_TUBE_CURRENT'), 'buried admissible currents shown')
  assert.ok(modules.includes('SOIL_RESISTIVITY'), 'soil resistivity shown')
  assert.ok(modules.includes('LAYER_FACTORS'), 'layer factor shown')
})

test('the selected derivation label lives inside the DI card header', () => {
  assert.ok(modules.includes('editingLabel?: string'), 'DiPanel accepts the selected label')
  assert.ok(modules.includes('Editando: {editingLabel}'), 'the label renders as a chip inside the card')
  assert.ok(calc.includes('editingLabel={selectedDerivation?.label}'), 'the calculator forwards the selected derivation')
  assert.doesNotMatch(calc, /<p className="mb-2 text-sm font-semibold text-ink">\{selectedDerivation/, 'the old label outside the card is gone')
})
