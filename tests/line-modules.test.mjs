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
  assert.ok(modules.includes("tables={role === 'lga' ? ['BT14-A', 'BT14-B'] : ['BT15-C', 'BT15-D', 'BT15-E']}"),
    'installation offers the guide tables of its own instruction')
  assert.ok(modules.includes("tables={['E', 'G']}"), 'disposition offers tables E and G')
  assert.ok(modules.includes("tables={['E', 'F', 'G', 'I']}"), 'layers offer tables E, F, G and I')
  assert.ok(modules.includes("tables={['G', 'H', 'I']}"), 'tubes offer tables G, H and I')
  assert.ok(modules.includes('onOpenTables(tables)'), 'field button forwards its own table set')
  assert.match(modules, /const shows = \(key: TableKey\) => !tables \|\| tables\.includes\(key\)/, 'dialog filters by requested tables')
  assert.ok(calc.includes('tables={lineTableFocus ?? undefined}'), 'calculator passes the focused set to the dialog')
})

test('the panels size lines through the shared engine, not inline formula copies', () => {
  assert.match(modules, /import \{[^}]*\bsizeLine\b[^}]*\} from '@\/lib\/line-sizing\.mjs'/, 'engine imported')
  assert.match(modules, /import \{[^}]*\blineInputFromState\b[^}]*\} from '@\/lib\/line-state\.mjs'/, 'line input builder imported')
  assert.equal(count(modules, /sizeLine\(lineInputFromState/g), 1, 'one sizing call, inside computeLine')
  assert.equal(count(modules, /export function computeLine/g), 1, 'one shared helper')
  assert.ok(modules.includes("computeLine(state, 'three-phase', 'lga')"), 'LGA panel uses the helper')
  assert.ok(modules.includes("computeLine(state, system, 'di')"), 'DI panel uses the helper with its own system')
  assert.match(read('lib/line-state.mjs'), /loadedConductors:.*system === 'three-phase' \? 3 : 2/, 'loaded conductors follow the system')
  assert.ok(calc.includes("computeLine(lga, 'three-phase', 'lga')"), 'JSON and PDF use the same LGA result')
  assert.ok(calc.includes("computeLine(di, 'single-phase', 'di')"), 'JSON and PDF use the same DI result')
  assert.doesNotMatch(modules, /Math\.max\([^)]*\* 100/, 'no hardcoded 100 W/m2 ladder')
  assert.doesNotMatch(modules, /recommendedPhase|admissibleCurrent = recommendedPhase/, 'no capped section ladder')
})

test('line inputs persist and reach the exports', () => {
  assert.match(calc, /lga: lineTouched \? lga : null/, 'LGA saved only once touched')
  assert.match(calc, /di: lineTouched \? di : null/, 'DI saved only once touched')
  assert.match(calc, /setLga\(savedInputs\.lga as LineState\)/, 'LGA restored from storage')
  assert.match(calc, /lines: \{/, 'JSON export carries a lines block')
  assert.ok(calc.includes("'7. Línea General de Alimentación · ITC-BT-14'"), 'PDF has an LGA page')
  assert.ok(calc.includes("'8. Derivación Individual · ITC-BT-15'"), 'PDF has a DI page')
})

test('the table viewer shows the reference source instead of an unattributed list', () => {
  assert.match(modules, /UNE 20460-5-523/, 'norm cited')
  assert.match(modules, /guía BT-19/, 'official ITC-BT-19 guide cited')
  assert.match(modules, /guías BT-14/, 'the LGA guide is cited')
  assert.match(modules, /BT-15/, 'the DI guide is cited')
  assert.ok(modules.includes('GUIDE_TABLES'), 'the transcribed guide tables are rendered')
  assert.match(modules, /<SourceNote label=\{table\.doc\.split\('\.'\)\[0\]\}/, 'each guide table cites its source in a hover note')
  assert.match(read('lib/guide-tables.mjs'), /BT14_AIR_COPPER/, 'table A of the LGA guide is transcribed')
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

test('each conductor carries its identification colour as a rule under its name', () => {
  // El color físico del cable vive pegado al elemento que identifica: un filete
  // bajo el nombre, no una leyenda aparte que haya que cruzar con la fila.
  assert.match(modules, /const CONDUCTOR_COLORS = \{[\s\S]*?panel:/, 'each cable colour carries a tone for the dark panel')
  assert.ok(modules.includes('function colorRule'), 'one helper builds the rule for one colour or several')
  assert.ok(modules.includes('style={colorRule(item.colors)}'), 'the rule renders under the conductor name')
  assert.ok(modules.includes('aria-hidden="true" className="mt-1.5 block h-[3px]'), 'the rule is decoration, not information')
  assert.ok(modules.includes("{item.colors.map(color => color.name).join(' · ')}"), 'the colour is also written, never colour alone')

  assert.match(modules, /colors: PHASES/, 'the three phases share one segmented rule')
  assert.match(modules, /colors: system === 'three-phase' \? \[\.\.\.PHASES, CONDUCTOR_COLORS\.blue\] : \[CONDUCTOR_COLORS\.brown, CONDUCTOR_COLORS\.blue\]/,
    'the DI rule follows the system actually loaded')
  assert.match(modules, /colors: \[CONDUCTOR_COLORS\.greenYellow\]/, 'the protective conductor keeps its green-yellow')
  assert.match(modules, /colors: \[CONDUCTOR_COLORS\.red\]/, 'the control wire keeps its red')
  assert.ok(modules.includes('ITC-BT-19 §2.2'), 'the colour criterion is still cited')
  assert.doesNotMatch(modules, /Colores de identificación · ITC-BT-19/, 'the detached legend is gone')
})

// El vocabulario del resultado —Ib, Iz, la caída con sus unidades y los
// conductores— se fija en components/rail-result.tsx, que es donde se pinta
// desde la consolidación (tests/rail-result.test.mjs). Acá queda el control que
// sigue viviendo en el panel.
test('the panel lets the phase section be fixed', () => {
  assert.ok(modules.includes('htmlFor={`${role}-section`}'), 'the section control has an associated label')
  assert.ok(modules.includes('onChange({ sectionOverride: section ?? 0 })'), 'the panel persists the fixed section')
  assert.match(modules, /<LineSectionField role="lga"/, 'the LGA panel gets the section control')
  assert.match(modules, /<LineSectionField role="di"/, 'the DI panel gets the section control')
  assert.match(read('lib/line-sizing.mjs'), /sectionOverride/, 'the engine owns the override instead of the card')
})

test('the selected derivation label lives inside the DI card header', () => {
  assert.ok(modules.includes('editingLabel?: string'), 'DiPanel accepts the selected label')
  assert.ok(modules.includes('Editando: {editingLabel}'), 'the label renders as a chip inside the card')
  assert.ok(calc.includes('editingLabel={selectedDerivation?.label}'), 'the calculator forwards the selected derivation')
  assert.doesNotMatch(calc, /<p className="mb-2 text-sm font-semibold text-ink">\{selectedDerivation/, 'the old label outside the card is gone')
})

/* ------------------------------------------------------------------ */
/* T6/T7 · un solo panel: el registro crece y los diálogos ad hoc se van. */
/* ------------------------------------------------------------------ */

/** El cuerpo del panel único, desde su declaración hasta el final del archivo. */
const dialog = modules.slice(modules.indexOf('export function LineTablesDialog'))

test('T6 · las tres claves nuevas entran en `TableKey` y el panel las pinta desde el registro', () => {
  for (const key of ['T25-A', 'T10-CS', 'ITA']) {
    assert.ok(modules.includes(`'${key}'`), `TableKey declara ${key}`)
  }
  for (const key of ['BT14-A', 'BT14-B', 'BT14-1', 'BT15-C', 'BT15-D', 'BT15-E', 'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
    assert.ok(modules.includes(`'${key}'`), `la clave ${key} sigue declarada`)
  }
  assert.match(modules, /GUIDE_TABLES\.filter\(table => shows\(table\.key as TableKey\)\)/,
    'el panel pinta el registro filtrado por el foco, así que sumar la entrada basta')
})

test('T7 · el panel único se titula «Tablas y referencias» y tiene el id que usan los disparadores', () => {
  assert.ok(dialog.includes('>Tablas y referencias</DialogTitle>'), 'el título del panel es el nombre acordado')
  assert.doesNotMatch(dialog, /Tablas de referencia · ITC-BT-14, BT-15 y BT-19/, 'el título del panel de líneas ya no es el de una sola pestaña')
  assert.match(dialog, /<DialogContent id="line-tables-dialog"/, 'el panel tiene un id estable')
  assert.equal([...calc.matchAll(/aria-controls="line-tables-dialog"/g)].length, 1,
    'el disparador apunta al id del panel único')
  assert.doesNotMatch(calc, /references-dialog|simultaneity-dialog/, 'no quedan ids de los diálogos retirados')
})

test('T7 · el panel único lleva los criterios de previsión', () => {
  const start = dialog.indexOf('Criterios de previsión')
  assert.ok(start > 0, 'el panel declara los criterios de previsión')
  const criteria = dialog.slice(start, dialog.indexOf('</section>', start))
  for (const block of ['<b>Locales:</b>', '<b>Garajes:</b>', '<b>Alumbrado de zonas comunes:</b>', '<b>IRVE:</b>', '<b>Tarifa nocturna:</b>']) {
    assert.ok(criteria.includes(block), `los criterios dicen «${block}»`)
  }
})

test('T7 · la vista enfocada en BT-26 no arrastra la Tabla A ni los criterios de previsión', () => {
  assert.match(dialog, /const conductorOnly = tables != null && tables\.length === 1 && tables\[0\] === 'BT26'/,
    'el panel reconoce la vista de conductores por su foco')
  const guard = dialog.indexOf('{!conductorOnly && (')
  assert.ok(guard > -1, 'el texto ajeno a los conductores vive tras un guard')
  for (const fragment of ['La LGA y la derivación individual se dimensionan', 'Criterios de previsión · ITC-BT-10 e ITC-BT-25']) {
    const at = dialog.indexOf(fragment)
    assert.ok(at > guard, `«${fragment}» queda dentro del guard que excluye BT-26`)
    assert.ok(at < dialog.indexOf('</DialogContent>'), 'y sigue en el panel para el resto de tablas')
  }
})

test('T7 · la calculadora ya no guarda diálogos propios para tablas', () => {
  assert.doesNotMatch(calc, /showReferences|setShowReferences/, '«Tablas y referencias» es el panel único, no un diálogo aparte')
  assert.doesNotMatch(calc, /showSimultaneityTable/, 'la simultaneidad no tiene diálogo propio')
  assert.doesNotMatch(calc, /showItaTable/, 'el ITA no tiene diálogo propio')
  assert.doesNotMatch(calc, /ITC_BT_10_COEFFICIENTS/, 'la tabla de simultaneidad ya no se pinta —ni se duplica— en la calculadora')
})

test('T7 · los tres disparadores abren el panel único con su foco', () => {
  assert.match(calc, /const openReferenceTable = \(key: TableKey\) => openLineTables\(\[key\]\)/,
    'un helper con nombre abre una sola tabla, en vez de repetir el array')
  assert.equal([...calc.matchAll(/openReferenceTable\('T25-A'\)/g)].length, 3, 'las tres cards con IGA abren la tabla A')
  assert.match(calc, /<TableButton ariaLabel="Ver tabla del coeficiente de simultaneidad" onOpen=\{\(\) => openReferenceTable\('T10-CS'\)\} \/>/,
    'el coeficiente de simultaneidad abre su tabla')
  assert.match(calc, /<TableButton[^>]*ariaLabel="Ver tabla de tipos ITA"[^>]*onOpen=\{\(\) => openReferenceTable\('ITA'\)\}[^>]*\/>/,
    'el ITA abre su tabla')
  assert.match(calc, /onClick=\{\(\) => openLineTables\(\)\}/, 'el botón «Tablas y referencias» abre el panel sin foco')
  assert.match(calc, /tables=\{lineTableFocus \?\? undefined\}/, 'el foco llega al panel como conjunto pedido')
})
