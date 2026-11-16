import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TAB_ORDER, computeVisibleTabs } from '../lib/tab-visibility.mjs'

// La hoja 2 del ELEC-3 pide datos administrativos del proyecto: la empresa
// instaladora (una sola para todo el edificio, S7) y el titular, el
// emplazamiento, la distribuidora y el tipo de instalación (S2). Los datos de
// cada vivienda —número, piso, puerta, superficie del local, tierra y el titular
// cuando difiere— no son de este tab: viajan en su derivación (S5).
//
// Estos pines son de texto de archivo, como el resto de pines de marcado del
// repo: no renderizan React, así que comprueban el cableado —el tab existe, el
// panel está montado y cada campo escribe la clave correcta de `ProjectInfo`—,
// no el aspecto.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = p => readFileSync(path.join(root, p), 'utf8')

const calc = read('components/load-calculator.tsx')
const panel = read('components/administrative-panel.tsx')
const storage = read('lib/calculator-storage.mjs')

const triggerAt = value => calc.indexOf(`<TabsTrigger value="${value}"`)
const contentAt = value => calc.indexOf(`<TabsContent value="${value}"`)

test('S2: el tab «Administrativos» existe, se llama así y no se deshabilita', () => {
  const tag = calc.slice(triggerAt('administrativos'), calc.indexOf('</TabsTrigger>', triggerAt('administrativos')))
  assert.ok(triggerAt('administrativos') > 0, 'the Administrativos trigger exists')
  assert.match(tag, /Administrativos/, 'the tab is labelled Administrativos')
  assert.doesNotMatch(calc, /<TabsTrigger value="administrativos" disabled=/, 'the tab is always reachable')
})

test('S2: el tab va después de los tabs de cálculo, en la barra y en el panel', () => {
  const tabsListEnd = calc.indexOf('</TabsList>')
  assert.ok(tabsListEnd > 0)
  assert.ok(triggerAt('administrativos') < tabsListEnd, 'el trigger vive dentro de la barra de tabs')

  for (const calculationTab of ['cargas', 'lga', 'di', 'interiores', 'esquema']) {
    assert.ok(triggerAt(calculationTab) < triggerAt('administrativos'), `Administrativos va después de ${calculationTab}`)
    assert.ok(contentAt(calculationTab) < contentAt('administrativos'), `el panel de Administrativos va después del de ${calculationTab}`)
  }
  assert.ok(contentAt('administrativos') > 0, 'the tab body is rendered')
})

test('S2: Administrativos es del proyecto, no de un cálculo, y se ve siempre', () => {
  const zero = computeVisibleTabs({ homes: 0, hasDerivations: false, cuadrosStarted: false })
  const started = computeVisibleTabs({ homes: 11, hasDerivations: true, cuadrosStarted: true })

  assert.ok(zero.includes('administrativos'), 'un proyecto de cero ya la muestra')
  assert.ok(started.includes('administrativos'), 'un proyecto avanzado también')
  assert.equal(TAB_ORDER.at(-1), 'administrativos', 'cierra la barra, después de los tabs de cálculo')
  // El panel usa la misma lista que la barra: una sola fuente para el orden y
  // para la navegación con teclado que resuelve el componente de tabs.
  assert.match(calc, /visibleTabs\.includes\('administrativos'\)/)
})

test('T3: el panel monta los dos grupos, cada uno con su título', () => {
  assert.match(calc, /<AdministrativePanel\b/, 'the tab body renders the panel')
  assert.match(panel, /Empresa instaladora/)
  assert.match(panel, /Datos del proyecto/)
})

test('T4: la pestaña también monta la card de datos administrativos por vivienda', () => {
  const body = calc.slice(contentAt('administrativos'), calc.indexOf('</TabsContent>', contentAt('administrativos')))

  assert.match(body, /<InteriorAdministrativeCard\b/, 'la card por vivienda vive en esta pestaña')
  assert.ok(body.indexOf('<AdministrativePanel') < body.indexOf('<InteriorAdministrativeCard'), 'va después de los bloques del proyecto (A4)')
  assert.match(body, /dwellings=\{interiorDwellings\}/, 'recibe las mismas viviendas que Cuadros')
  assert.match(body, /onChange=\{updateDerivationAdministrative\}/, 'escribe el bloque de la derivación, no ProjectInfo')
  assert.match(body, /powerUnit=\{powerUnit\}/, 'lee las potencias en la unidad elegida')
  assert.match(body, /projectTitular=\{projectInfo\.titularName \?\? ''\}/, 'sólo lee el titular del proyecto para explicar la herencia')
  assert.match(body, /onViewElec3=\{setElec3DwellingId\}/, 'el atajo abre la hoja 2 de esa vivienda')
})

test('S7: el texto del panel manda a la pestaña Administrativos, no a Cuadros', () => {
  assert.match(panel, /se declaran en la pestaña Administrativos/, 'el panel dice dónde están ahora los datos de cada instalación')
  assert.doesNotMatch(panel, /en cada vivienda, en Cuadros/, 'la frase que mandaba a Cuadros ya no está')
})

test('S7: la empresa instaladora se edita una sola vez, con sus seis datos', () => {
  const installer = panel.slice(panel.indexOf('INSTALLER_FIELDS'), panel.indexOf('PROJECT_TEXT_FIELDS'))

  for (const [key, label] of [
    ['companyName', 'Nombre de empresa'],
    ['companyNif', 'NIF de la empresa'],
    ['companyAddress', 'Dirección de empresa'],
    ['phone', 'Teléfono'],
    ['email', 'Correo electrónico'],
    ['installerNumber', 'Número de instalador autorizado'],
  ]) {
    assert.match(installer, new RegExp(`key: '${key}'`), `${label} writes ProjectInfo.${key}`)
    assert.match(installer, new RegExp(`label: '${label}'`), `el campo se rotula «${label}»`)
  }
})

test('S3: los datos del proyecto escriben titular, uso y emplazamiento', () => {
  const project = panel.slice(panel.indexOf('PROJECT_TEXT_FIELDS'), panel.indexOf('const INSTALLATION_TYPE_ITEMS'))

  for (const [key, label] of [
    ['titularName', 'Titular del proyecto'],
    ['uso', 'Uso'],
    ['workAddress', 'Calle de la obra'],
    ['addressCity', 'Localidad'],
    ['addressPostalCode', 'Código postal'],
    ['distributorName', 'Empresa distribuidora'],
  ]) {
    assert.match(project, new RegExp(`key: '${key}'`), `${label} writes ProjectInfo.${key}`)
    assert.match(project, new RegExp(`label: '${label}'`), `el campo se rotula «${label}»`)
  }

  assert.match(project, /hint:/, 'el uso se declara opcional en su propio texto')
})

test('T3: el tipo de instalación ofrece Nueva, Ampliación y Reforma, y escribe installType', () => {
  assert.match(panel, /value: 'nueva', label: 'Nueva'/)
  assert.match(panel, /value: 'ampliacion', label: 'Ampliación'/)
  assert.match(panel, /value: 'reforma', label: 'Reforma'/)
  assert.match(panel, /onChange\('installType'/, 'the select writes ProjectInfo.installType')
})

test('S9: el panel dice que la firma y el sello se completan a mano', () => {
  assert.match(panel, /La firma del titular y el sello del instalador se completan a mano sobre el impreso/)
  assert.match(panel, /la aplicación no los genera ni los sustituye/)
})

test('S7: el diálogo del rail y el tab comparten el mismo editor, no hay dos', () => {
  // El editor vive una sola vez, en el panel; el diálogo del membrete monta las
  // mismas piezas. Un segundo editor a mano volvería a escribir los campos.
  assert.match(panel, /export function InstallerFields/)
  assert.match(panel, /export function ProjectDataFields/)
  assert.match(calc, /<InstallerFields\b/)
  assert.match(calc, /<ProjectDataFields\b/)
  assert.doesNotMatch(calc, /updateProjectInfo\('companyName'/, 'el diálogo no vuelve a escribir el nombre de empresa a mano')
  assert.doesNotMatch(calc, /updateProjectInfo\('phone'/, 'el diálogo no vuelve a escribir el teléfono a mano')
  assert.doesNotMatch(calc, /updateProjectInfo\('workAddress'/, 'el diálogo no vuelve a escribir la dirección de obra a mano')
})

test('T3: cada campo lleva su rótulo y el selector se asocia con htmlFor/id', () => {
  const field = panel.slice(panel.indexOf('function TextField'), panel.indexOf('export function InstallerFields'))
  assert.match(field, /<label\b/, 'cada campo envuelve su control en un <label>')
  assert.match(field, /<span className="label">\{field\.label\}<\/span>/, 'el rótulo visible sale del mismo dato que el campo')
  assert.match(field, /<Input\b/, 'el control es el Input de la app')
  assert.match(field, /htmlFor=\{id\}/, 'el rótulo apunta al id del control')
  assert.match(field, /id=\{id\}/, 'el control recibe su id')

  assert.match(panel, /<label htmlFor="admin-install-type" className="label">Tipo de instalación<\/label>/, 'el rótulo del selector apunta a su control')
  assert.match(panel, /<SelectTrigger id="admin-install-type"/, 'el selector declara el id que el rótulo referencia')
})

test('T3: los dos ids nuevos son los únicos que el panel agrega a ProjectInfo', () => {
  assert.match(storage, /'companyNif'/)
  assert.match(storage, /'installerNumber'/)
  // Lo que es de la instalación no vuelve al proyecto: eso es T4, no este corte.
  for (const installationKey of ['addressNumber', 'addressFloor', 'addressDoor', 'superficieLocalM2', 'groundResistanceOhm']) {
    assert.doesNotMatch(panel, new RegExp(`'${installationKey}'`), `${installationKey} belongs to the derivation`)
  }
})

test('el rail conserva su tarjeta: Administrativos no calcula nada', () => {
  // `RailTab` (components/rail-result.tsx) no tiene tarjeta administrativa y ese
  // archivo no es superficie de este corte, así que el rail sigue resumiendo la
  // previsión de cargas mientras se editan los datos del proyecto.
  assert.match(calc, /tab=\{effectiveActiveTab\}/, 'the rail keeps receiving the tab it knows')
  assert.match(calc, /'administrativos' \? 'cargas' : activeTabValue/, 'la pestaña administrativa cae en la previsión')
  assert.match(calc, /<Tabs value=\{activeTabValue\}/, 'la barra sí navega a la pestaña administrativa')
})
