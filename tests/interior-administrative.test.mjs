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
 * El grupo administrativo de la card vive al final del archivo: su lista de
 * campos y su componente. Así el pin no depende de dónde lo monta la card ni del
 * resto de la tabla de circuitos.
 */
const installationFields = panel.slice(panel.indexOf('const ADMINISTRATIVE_FIELDS'))

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
  assert.match(panel, /<InteriorAdministrativeFields/, 'the card mounts the group')
})

test('superficie y tierra son campos de texto: la coma decimal sobrevive', () => {
  assert.match(installationFields, /id=\{`interior-admin-\$\{field\.key\}`\} type="text"/, 'every field is a text input')
  assert.doesNotMatch(installationFields, /type="number"/, 'no numeric input would drop the comma a Spanish user writes')
  assert.match(installationFields, /onChange=\{event => onChange\(field\.key, event\.target\.value\)\}/, 'the declared text is stored as typed')
  assert.doesNotMatch(installationFields, /Number\(|parseFloat|parseInt/, 'the card never parses: lib/administrative.mjs converts at the edge')
  assert.match(installationFields, /value=\{administrative\[field\.key\] \?\? ''\}/, 'each field shows its own declared value')
})

test('los campos escriben en la derivación y no en ProjectInfo', () => {
  assert.match(panel, /const administrative = dwelling\.administrative \?\? \{\}/, 'the panel reads the block of the selected dwelling')
  assert.doesNotMatch(panel, /projectInfo/, 'the card never reads ProjectInfo for these fields')

  const handler = calc.slice(calc.indexOf('const updateDerivationAdministrative'), calc.indexOf('const circuitSupplies'))
  assert.ok(handler.length > 0, 'the calculator owns the write path of the administrative block')
  assert.match(handler, /derivation\.administrative/, 'the write keeps the block that is already stored')
  assert.match(handler, /administrative: \{ \.\.\.EMPTY_INTERIOR_ADMINISTRATIVE/, 'the six declared keys are always written')
  assert.doesNotMatch(handler, /setProjectInfo|updateProjectInfo/, 'the installation data never lands in ProjectInfo')

  assert.match(calc, /administrative\?: InteriorAdministrative/, 'the derivation state carries its own administrative block')
  assert.match(calc, /administrative: derivation\.administrative,/, 'the dwelling handed to the card is the one of the derivation')
  assert.match(calc, /onAdministrativeChange=\{updateDerivationAdministrative\}/, 'the panel persists through the derivation update')
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
