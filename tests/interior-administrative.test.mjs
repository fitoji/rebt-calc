import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveAdministrative } from '../lib/administrative.mjs'
import { CALCULATOR_INPUTS_STORAGE_KEY, loadCalculatorInputs, saveCalculatorInputs } from '../lib/calculator-storage.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const panel = read('components/interior-panel.tsx')
const card = read('components/interior-administrative-card.tsx')
const calc = read('components/load-calculator.tsx')

/** Los seis datos de una instalación, en el orden en que la card los pide. */
const ADMINISTRATIVE_KEYS = ['numero', 'piso', 'puerta', 'superficieLocalM2', 'resistenciaTierraOhm', 'titularName']

const LABELS = {
  numero: 'Número',
  piso: 'Piso',
  puerta: 'Puerta',
  superficieLocalM2: 'Superficie del local (m²)',
  resistenciaTierraOhm: 'Resistencia de tierra (Ω)',
  titularName: 'Titular de esta instalación',
}

/**
 * El grupo administrativo vive en su propio archivo, al final: su lista de campos
 * y su componente. Así el pin no depende de dónde lo monta la card ni del resto
 * de la tabla de circuitos.
 */
const installationFields = card.slice(card.indexOf('const ADMINISTRATIVE_FIELDS'))

test('los seis campos de la instalación existen y cada uno tiene su rótulo', () => {
  assert.ok(installationFields.length > 0, 'the card owns a component for the installation data')

  for (const key of ADMINISTRATIVE_KEYS) {
    assert.match(installationFields, new RegExp(`key: '${key}'`), `${key} is one of the six fields`)
    assert.ok(installationFields.includes(LABELS[key]), `${key} keeps its Spanish label: ${LABELS[key]}`)
    assert.ok(installationFields.includes('htmlFor={`interior-admin-${field.key}`}'), `${key} is labelled through htmlFor`)
    assert.ok(installationFields.includes('id={`interior-admin-${field.key}`}'), `${key} control carries the matching id`)
  }

  assert.equal((installationFields.match(/key: '/g) ?? []).length, 6, 'exactly six fields, no project-level copy')
})

test('el grupo es un grupo accesible con su encabezado', () => {
  assert.match(installationFields, /role="group" aria-labelledby="interior-administrative-title"/, 'the group names itself')
  assert.match(installationFields, /<h4 id="interior-administrative-title"[\s\S]{0,120}?>Datos administrativos de la instalación/, 'the heading is a real heading')
  assert.match(card, /<InteriorAdministrativeFields/, 'the new card mounts the group')
  assert.doesNotMatch(panel, /<InteriorAdministrativeFields/, 'Cuadros no la monta: los campos se mueven, no se duplican (S2)')
})

test('superficie y tierra son campos de texto: la coma decimal sobrevive', () => {
  assert.match(installationFields, /id=\{`interior-admin-\$\{field\.key\}`\} type="text"/, 'every field is a text input')
  assert.doesNotMatch(installationFields, /type="number"/, 'no numeric input would drop the comma a Spanish user writes')
  assert.match(installationFields, /onChange=\{event => onChange\(field\.key, event\.target\.value\)\}/, 'the declared text is stored as typed')
  assert.doesNotMatch(installationFields, /Number\(|parseFloat|parseInt/, 'the card never parses: lib/administrative.mjs converts at the edge')
  assert.match(installationFields, /value=\{administrative\[field\.key\] \?\? ''\}/, 'each field shows its own declared value')
})

test('los campos escriben en la derivación y no en ProjectInfo', () => {
  assert.match(card, /const administrative = dwelling\.administrative \?\? \{\}/, 'the card reads the block of the selected dwelling')
  assert.doesNotMatch(card, /projectInfo/, 'the card never reads ProjectInfo for these fields')

  const handler = calc.slice(calc.indexOf('const updateDerivationAdministrative'), calc.indexOf('const circuitSupplies'))
  assert.ok(handler.length > 0, 'the calculator owns the write path of the administrative block')
  assert.match(handler, /derivation\.administrative/, 'the write keeps the block that is already stored')
  assert.match(handler, /administrative: \{ \.\.\.EMPTY_INTERIOR_ADMINISTRATIVE/, 'the six declared keys are always written')
  assert.doesNotMatch(handler, /setProjectInfo|updateProjectInfo/, 'the installation data never lands in ProjectInfo')

  assert.match(calc, /administrative\?: InteriorAdministrative/, 'the derivation state carries its own administrative block')
  assert.match(calc, /administrative: derivation\.administrative,/, 'the dwelling handed to the card is the one of the derivation')
  assert.match(calc, /onChange=\{updateDerivationAdministrative\}/, 'the new card persists through the derivation update')
  assert.match(calc, /projectTitular=\{projectInfo\.titularName \?\? ''\}/, 'only the project titular is read, and only to explain the inheritance')
  assert.doesNotMatch(calc, /updateProjectInfo\('(numero|piso|puerta|superficieLocalM2|resistenciaTierraOhm)'/, 'none of the five installation fields touches ProjectInfo')
})

test('el titular vacío se muestra heredado, o pendiente cuando el proyecto tampoco lo declara', () => {
  assert.match(installationFields, /projectTitular/, 'the field knows the titular of the project')
  assert.match(installationFields, /hereda el titular del proyecto/, 'an empty override says where the value comes from')
  assert.match(installationFields, /lo deja pendiente/, 'with no project titular either, the cell is pending, never copied')
  assert.doesNotMatch(installationFields, /value=\{projectTitular/, 'the project titular is printed as a hint, never stored as the value')
})

/* ------------------------------------------------------------------ */
/* La card nueva: pestaña Administrativos, navegación y franja (S3, S4, S6). */
/* ------------------------------------------------------------------ */

const administrativeTab = calc.slice(contentAt('administrativos'), calc.indexOf('</TabsContent>', contentAt('administrativos')))

function contentAt(value) {
  return calc.indexOf(`<TabsContent value="${value}"`)
}

/** La card vacía, aislada del cuerpo, para no leerla junto a la franja. */
const emptyCard = card.slice(card.indexOf('function EmptyAdministrativeCard'), card.indexOf('export function InteriorAdministrativeCard'))

/** La franja de identidad de la instalación, entre el armazón y los campos. */
const identityStrip = card.slice(card.indexOf('sm:grid-cols-2 lg:grid-cols-4'), card.indexOf('<InteriorAdministrativeFields'))

/** El cuerpo renderizado de la card, sin sus comentarios de cabecera. */
const cardBody = card.slice(card.indexOf('export function InteriorAdministrativeCard'))

test('S2 · los campos ya no se renderizan en la card de Cuadros y no quedan props sin uso', () => {
  assert.doesNotMatch(panel, /ADMINISTRATIVE_FIELDS/, 'la lista de campos vive sólo en la card nueva')
  assert.doesNotMatch(panel, /InteriorAdministrativeFields/, 'Cuadros no monta el bloque')
  assert.doesNotMatch(panel, /projectTitular/, 'el titular del proyecto se va con el bloque')
  assert.doesNotMatch(panel, /onAdministrativeChange/, 'el handler administrativo se va con el bloque')
  assert.match(panel, /onViewElec3\?: \(dwellingId: string\) => void/, 'Cuadros conserva su botón Ver ELEC-3')
  assert.match(panel, /Potencia contratada \(/, 'Potencia contratada, ICP y sobretensiones siguen en Cuadros')
  assert.match(panel, /evaluation\.icpRatingA/, 'el ICP sigue en Cuadros')
  assert.match(panel, /id="interior-surge"/, 'la protección contra sobretensiones sigue en Cuadros')
})

test('S8 · una sola definición de los campos: el bloque se extrae y lo consume la card nueva', () => {
  assert.match(card, /export function InteriorAdministrativeFields/, 'el bloque se exporta desde su archivo')
  assert.match(card, /^const ADMINISTRATIVE_FIELDS/m, 'la lista de campos vive en el archivo del bloque')
  assert.match(card, /import type \{ InteriorAdministrative, InteriorDwelling \} from '@\/components\/interior-panel'/, 'los tipos se importan, no se mueven')
  assert.match(card, /import \{ resolveInteriorInputs, stepLabel \} from '@\/components\/interior-panel'/, 'el rótulo del escalón y los insumos se reusan en vez de copiarse')
})

test('T4 · la card se monta en la pestaña Administrativos, después de los datos del proyecto', () => {
  assert.ok(administrativeTab.length > 0, 'la pestaña Administrativos tiene cuerpo')
  assert.match(administrativeTab, /<AdministrativePanel\b/, 'los datos del proyecto siguen en la pestaña')
  assert.match(administrativeTab, /<InteriorAdministrativeCard\b/, 'la card por vivienda vive en esta pestaña')
  assert.ok(administrativeTab.indexOf('<AdministrativePanel') < administrativeTab.indexOf('<InteriorAdministrativeCard'), 'va después de los bloques del proyecto (A4)')
  assert.match(calc, /import \{ InteriorAdministrativeCard \} from '@\/components\/interior-administrative-card'/, 'la pestaña importa la card nueva')
})

test('A1 · la navegación de la card nueva es independiente de la de Cuadros', () => {
  assert.match(calc, /const \[selectedAdministrativeDwellingId, setSelectedAdministrativeDwellingId\] = useState<string \| null>\(null\)/, 'la card nueva tiene su propia vivienda seleccionada')
  assert.match(calc, /selectedAdministrativeDwellingId != null && interiorDwellings\.some\(dwelling => dwelling\.id === selectedAdministrativeDwellingId\)/, 'la selección cae a la primera vivienda, como en InteriorCircuitsPanel')
  assert.match(calc, /onSelect=\{setSelectedAdministrativeDwellingId\}/, 'la card mueve sólo su propia selección')
  assert.match(calc, /selectedId=\{effectiveDwellingId\} onSelect=\{setSelectedDwellingId\}/, 'Cuadros conserva la suya, intacta')
})

test('S3 · la card se navega por vivienda con el mismo armazón que la de Cuadros', () => {
  assert.match(card, /className="rounded-card border border-line bg-paper p-5 shadow-card"/, 'usa el lenguaje visual de la card de Cuadros')
  assert.match(card, /<Select value=\{dwelling\.id\}/, 'tiene selector de vivienda')
  assert.match(card, /id="interior-admin-dwelling"/, 'el selector tiene su id y su rótulo')
  assert.match(card, /aria-label="Vivienda anterior"/, 'botón anterior, con su nombre accesible')
  assert.match(card, /aria-label="Vivienda siguiente"/, 'botón siguiente, con su nombre accesible')
  assert.match(card, /disabled=\{currentIndex <= 0\}/, 'la primera vivienda desactiva «anterior»')
  assert.match(card, /disabled=\{currentIndex >= dwellings\.length - 1\}/, 'la última desactiva «siguiente»')
  assert.match(card, /dwellings\[currentIndex \+ delta\]/, 'los botones recorren la lista de viviendas')
  assert.match(card, /\.label \?\? dwelling\.label/, 'el nombre de la vivienda elegida queda a la vista')
})

test('S4 · la franja muestra la identidad de la instalación, calculada con los helpers de Cuadros', () => {
  for (const label of ['Escalón de potencia', 'IGA', 'Potencia máxima admisible', 'Diferenciales exigidos']) {
    assert.ok(identityStrip.includes(label), `la franja muestra «${label}»`)
  }

  assert.match(card, /resolveInteriorInputs\(dwelling\)/, 'los insumos se resuelven con el mismo helper')
  assert.match(card, /evaluateInterior\(\{ igaA: dwelling\.housingIgaA \?\? null, powerW: dwelling\.powerW, \.\.\.inputs, circuits: defaultCircuitsFor\(dwelling\.powerW\) \}\)/, 'la evaluación es la de Cuadros')
  assert.match(card, /housingGradeFor\(dwelling\.powerW\)/, 'el grado sale del escalón, no se escribe a mano')
  assert.match(card, /stepLabel\(dwelling\.powerW, powerUnit\)/, 'el escalón se rotula con el helper compartido')
  assert.match(identityStrip, /evaluation\.igaA/, 'el IGA de la tabla A')
  assert.match(identityStrip, /evaluation\.maxPowerW/, 'la potencia máxima admisible')
  assert.match(identityStrip, /evaluation\.differentials/, 'los diferenciales exigidos')
  assert.match(identityStrip, /rounded-control bg-surface-muted p-3 text-xs/, 'las celdas usan el estilo de la franja de Cuadros')
  assert.match(identityStrip, /text-ink-muted/, 'los rótulos usan el estilo de la franja de Cuadros')
})

test('S4 · la franja no lleva potencia contratada, ICP ni sobretensiones', () => {
  assert.doesNotMatch(cardBody, /Potencia contratada/, 'la potencia contratada sigue en Cuadros: es una decisión de diseño')
  assert.doesNotMatch(cardBody, /ICP/, 'el ICP sigue en Cuadros')
  assert.doesNotMatch(cardBody, /contra sobretensiones/, 'la protección contra sobretensiones sigue en Cuadros')
})

test('A2 · la card lleva el atajo «Ver ELEC-3» de la vivienda elegida', () => {
  assert.match(card, /onViewElec3\?: \(dwellingId: string\) => void/, 'la card recibe el callback y no importa el modelo')
  assert.match(card, /onViewElec3 && <Button/, 'el botón sólo aparece cuando hay callback')
  assert.match(card, /aria-label=\{`Ver ELEC-3 de \$\{dwelling\.label\}`\}/, 'su nombre accesible dice qué vivienda abre')
  assert.match(card, /onClick=\{\(\) => onViewElec3\(dwelling\.id\)\}/, 'abre la vivienda seleccionada')
  assert.doesNotMatch(card, /elec3\.mjs|buildDwellingDocument/, 'la card nunca arma el documento')
  assert.match(calc, /onViewElec3=\{setElec3DwellingId\}/, 'es el mismo diálogo que abre Cuadros')
})

test('S6 · sin viviendas la card explica por qué está vacía', () => {
  assert.match(card, /if \(dwellings\.length === 0\) return <EmptyAdministrativeCard \/>/, 'la card vacía vive fuera del cuerpo, como la de Cuadros')
  assert.match(emptyCard, /Todavía no hay viviendas/, 'dice qué falta')
  assert.match(emptyCard, /pestaña DI/, 'y dónde se generan las derivaciones')
  assert.match(emptyCard, /rounded-card border border-line bg-paper p-5 shadow-card/, 'con el mismo marco que la card vacía de Cuadros')
})

/* ------------------------------------------------------------------ */
/* Round-trip through the storage layer: the block is real, not a pin.  */
/* ------------------------------------------------------------------ */

function createMemoryStorage(initialEntries = {}) {
  const values = new Map(Object.entries(initialEntries))

  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
    removeItem(key) {
      values.delete(key)
    },
  }
}

const sampleInputs = {
  housing: [{ level: 'Básica', power: 5750, homes: 1, area: 90 }],
  locals: [{ name: 'Local 1', type: 'Comercial/oficina', area: 40, real: 0 }],
  garages: [{ name: 'Garaje 1', ventilation: 'Forzada', area: 120, plazas: 12 }],
  elevators: [{ name: 'Ascensor 1', ita: 'ITA-1', power: 4000, unit: 'W' }],
  motors: [{ name: 'Motor 1', power: 2, unit: 'CV' }],
  otherLoads: [{ name: 'Alumbrado', power: 500 }],
  parking: 12,
  irveOption: 2,
}

const sampleDerivation = {
  id: 'dwelling-0-0',
  kind: 'dwelling',
  label: 'Vivienda 1',
  sourceKey: 'housing:0',
  system: 'single-phase',
  powerW: 5750,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 1,
  method: 'B1',
  insulation: 'PVC',
  circuits: 1,
  protectionA: 0,
  neutralSection: 16,
  peSection: 16,
  controlSection: 1.5,
  tubeDiameter: 40,
  installation: 'air',
  layout: 'embedded',
  layers: 1,
  tubes: 1,
}

/** Lo que la card escribe en una vivienda: seis claves declaradas, todas texto. */
const installationData = {
  numero: '12',
  piso: '3',
  puerta: 'B',
  superficieLocalM2: '84,6',
  resistenciaTierraOhm: '12,5',
  titularName: 'Ana Pérez Ruiz',
}

test('el bloque de la instalación sobrevive el guardado y la carga del snapshot', () => {
  const storage = createMemoryStorage()
  const dwelling = { ...sampleDerivation, administrative: installationData }

  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [dwelling] })

  const snapshot = JSON.parse(storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY))
  assert.deepEqual(snapshot.derivations[0].administrative, installationData, 'the block is written inside the derivation')
  assert.deepEqual(loadCalculatorInputs(storage).derivations[0].administrative, installationData, 'every field comes back after a reload')
})

test('la coma decimal guardada en el snapshot llega convertida a la hoja 2', () => {
  const storage = createMemoryStorage()
  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [{ ...sampleDerivation, administrative: installationData }] })

  const resolved = resolveAdministrative({ titularName: 'Obra Ejemplo S.L.' }, loadCalculatorInputs(storage).derivations[0])
  assert.equal(resolved.superficieLocalM2, 84.6, '84,6 is one decimal comma, not a pending cell')
  assert.equal(resolved.resistenciaTierraOhm, 12.5, '12,5 is one decimal comma, not a pending cell')
  assert.equal(resolved.titular, 'Ana Pérez Ruiz', 'the installation overrides the titular of the project')
  assert.equal(resolved.emplazamiento.numero, '12')
  assert.equal(resolved.emplazamiento.piso, '3')
  assert.equal(resolved.emplazamiento.puerta, 'B')
})

test('el titular vacío de una vivienda hereda el del proyecto sin copiarlo', () => {
  const storage = createMemoryStorage()
  const emptyTitular = { ...installationData, titularName: '', superficieLocalM2: '' }
  saveCalculatorInputs(storage, { ...sampleInputs, derivations: [{ ...sampleDerivation, administrative: emptyTitular }] })

  const loaded = loadCalculatorInputs(storage)
  assert.equal(loaded.derivations[0].administrative.titularName, '', 'the installation declares no titular of its own')
  const resolved = resolveAdministrative({ titularName: 'Obra Ejemplo S.L.' }, loaded.derivations[0])
  assert.equal(resolved.titular, 'Obra Ejemplo S.L.', 'the empty field inherits instead of copying at save time')
  assert.equal(resolved.superficieLocalM2, null, 'an empty measurement stays pending')

  const orphan = resolveAdministrative({}, loaded.derivations[0])
  assert.equal(orphan.titular, null, 'with nothing declared in either level the titular is pending')
})

/* PRESERVE: el interior de la vivienda sigue por su camino de siempre. */

test('la card sigue guardando el interior de la vivienda como antes', () => {
  assert.match(calc, /onChange=\{updateDerivationInterior\}/, 'the interior patch keeps its own handler')
  assert.match(calc, /\{ \.\.\.derivation, interior: \{ \.\.\.resolveInterior\(derivation\.powerW, derivation\.interior\), \.\.\.patch \} \}/, 'the interior keeps resolving before merging')
  assert.match(calc, /interior: derivation\.interior,/, 'the dwelling still carries its interior block to the card')
})

/* ------------------------------------------------------------------ */
/* T2 · «IGA (tabla A)» → «IGA» + botón de tabla (S5).                 */
/* ------------------------------------------------------------------ */

/** El botón de tabla, con su nombre accesible, montado junto al rótulo «IGA». */
const IGA_BUTTON = /IGA<TableButton\s+ariaLabel="Ver tabla A · escalones de potencia"\s+onOpen=\{onOpenTables\}\s*\/>/

test('T2 · la franja administrativa rotula «IGA» y le pone el botón de la tabla A', () => {
  assert.match(identityStrip, IGA_BUTTON, 'el IGA de la franja abre la tabla A con su botón')
  assert.doesNotMatch(identityStrip, /IGA \(tabla A\)/, 'el rótulo ya no nombra la tabla A')
  assert.match(identityStrip, /evaluation\.igaA/, 'el valor del IGA no cambia')
})

test('T2 · la card de Cuadros rotula «IGA» y le pone el mismo botón', () => {
  assert.match(panel, IGA_BUTTON, 'el IGA de la card del DGMP abre la tabla A con su botón')
  assert.doesNotMatch(panel, /IGA \(tabla A\)/, 'el rótulo ya no nombra la tabla A')
  assert.match(panel, /evaluation\.igaA/, 'el valor del IGA no cambia')
  assert.match(panel, /Abre «Tablas y referencias», donde ya vive la tabla A/, 'la card dice qué panel abre y no lo posee')
})

test('T2 · las dos cards reciben el disparador y no son dueñas del diálogo', () => {
  assert.match(panel, /onOpenTables: \(\) => void/, 'Cuadros recibe el disparador por props')
  assert.match(card, /onOpenTables: \(\) => void/, 'la card administrativa también')
  assert.doesNotMatch(panel, /showReferences|setShowReferences/, 'Cuadros no guarda el estado del panel')
  assert.doesNotMatch(card, /useState|setShowReferences|<Dialog/, 'la card administrativa tampoco')
})

test('T2 · el panel que abre el botón es «Tablas y referencias», ya montado', () => {
  assert.match(calc, /const openReferenceTable = \(key: TableKey\) => openLineTables\(\[key\]\)/, 'un solo helper abre el panel de tablas en la tabla que se le pide')
  // `hasIrve={parking > 0}` lleva un `>`: el tag se acota por su cierre, no por ese símbolo.
  const tagOf = name => calc.slice(calc.indexOf(`<${name} `), calc.indexOf('/>', calc.indexOf(`<${name} `)))
  assert.match(tagOf('InteriorPanel'), /onOpenTables=\{\(\) => openReferenceTable\('T25-A'\)\}/, 'Cuadros lo recibe de la calculadora')
  assert.match(tagOf('InteriorAdministrativeCard'), /onOpenTables=\{\(\) => openReferenceTable\('T25-A'\)\}/, 'la card administrativa también')
  assert.match(calc, /<LineTablesDialog open=\{showLineTables\}/, 'el panel sigue siendo el mismo')
  assert.match(read('lib/normative-tables.mjs'), /Tabla A · Escalones de potencia prevista/, 'y el registro sigue titulando la tabla A que el botón promete')
})

test('la nota de sección muestra el mínimo sin nombrar la tabla', () => {
  assert.doesNotMatch(panel, /mín\. tabla/, 'la celda de sección ya no dice «mín. tabla 2,5»')
  assert.match(panel, /mín\. \{sizing\.tableSection\}/, 'muestra el mínimo que fija la tabla, sin nombrarla')
})
