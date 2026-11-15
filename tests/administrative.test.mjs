import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveAdministrative } from '../lib/administrative.mjs'

/**
 * S5: un dato de la instalación se declara en el proyecto y la vivienda lo hereda;
 * sólo se overridea cuando difiere. Lo que no está en ninguno de los dos niveles
 * queda pendiente (`null`), nunca se rellena por parecido.
 *
 * El titular y el emplazamiento compartido salen del proyecto; número, piso,
 * puerta, superficie y tierra son de la instalación y no se heredan de otra
 * vivienda ni del proyecto.
 */
const projectInfo = {
  companyName: 'Instalaciones Ejemplo S.L.',
  companyAddress: 'Carrer Major 4',
  workAddress: 'Carrer de la Obra 12',
  phone: '600 000 000',
  email: 'obra@example.com',
  logo: 'data:image/png;base64,AAAA',
  titularName: 'Ana Pérez Ruiz',
  uso: 'Vivienda habitual',
  addressCity: 'Girona',
  addressPostalCode: '17001',
  installType: 'reforma',
  distributorName: 'e-Distribución',
}

/** @param {Record<string, string>} [administrative] */
const derivation = administrative => ({
  id: 'dwelling-0-0',
  kind: 'dwelling',
  label: 'Vivienda 1',
  sourceKey: 'housing:0',
  system: 'single-phase',
  ...(administrative === undefined ? {} : { administrative }),
})

test('S5: a dwelling with nothing of its own inherits the project data', () => {
  assert.deepEqual(resolveAdministrative(projectInfo, derivation()), {
    titular: 'Ana Pérez Ruiz',
    uso: 'Vivienda habitual',
    emplazamiento: {
      calle: 'Carrer de la Obra 12',
      numero: null,
      piso: null,
      puerta: null,
      localidad: 'Girona',
      codigoPostal: '17001',
    },
    instalacion: 'reforma',
    distribuidora: 'e-Distribución',
    resistenciaTierraOhm: null,
    superficieLocalM2: null,
    instalador: {
      nombre: 'Instalaciones Ejemplo S.L.',
      nif: null,
      direccion: 'Carrer Major 4',
      telefono: '600 000 000',
      email: 'obra@example.com',
      carnet: null,
    },
  })
})

test('S5: the installation overrides the project field by field', () => {
  const resolved = resolveAdministrative(projectInfo, derivation({
    numero: '12',
    piso: '3º',
    puerta: 'B',
    superficieLocalM2: '84.6',
    resistenciaTierraOhm: '12.5',
    titularName: 'Luis Gómez',
  }))

  assert.equal(resolved.titular, 'Luis Gómez', 'the dwelling titular wins')
  assert.deepEqual(resolved.emplazamiento, {
    calle: 'Carrer de la Obra 12',
    numero: '12',
    piso: '3º',
    puerta: 'B',
    localidad: 'Girona',
    codigoPostal: '17001',
  })
  assert.equal(resolved.superficieLocalM2, 84.6)
  assert.equal(resolved.resistenciaTierraOhm, 12.5)
})

test('S5: numero, piso and puerta never come from the project', () => {
  const projectWithNumbers = {
    ...projectInfo,
    addressNumber: '99',
    addressFloor: 'ático',
    addressDoor: 'Z',
    localAreaM2: '120',
    groundResistanceOhm: '80',
  }

  const resolved = resolveAdministrative(projectWithNumbers, derivation())

  assert.equal(resolved.emplazamiento.numero, null, 'the number of the installation is not a project datum')
  assert.equal(resolved.emplazamiento.piso, null, 'the floor of the installation is not a project datum')
  assert.equal(resolved.emplazamiento.puerta, null, 'the door of the installation is not a project datum')
  assert.equal(resolved.superficieLocalM2, null, 'the local surface is not a project datum')
  assert.equal(resolved.resistenciaTierraOhm, null, 'the ground resistance is not a project datum')
})

test('S5: calle comes from the project work address, never from the installation', () => {
  const resolved = resolveAdministrative(projectInfo, derivation({ calle: 'Calle inventada 1' }))

  assert.equal(resolved.emplazamiento.calle, 'Carrer de la Obra 12')
})

test('S5: a blank string counts as not declared and never leaks through', () => {
  const blankProject = {
    ...projectInfo,
    titularName: '   ',
    uso: '',
    workAddress: ' ',
    addressCity: '',
    addressPostalCode: '  ',
    installType: '',
    distributorName: '   ',
    companyName: '',
    companyAddress: ' ',
    phone: '',
    email: '  ',
  }
  const blankDerivation = derivation({
    numero: ' ',
    piso: '',
    puerta: '   ',
    superficieLocalM2: ' ',
    resistenciaTierraOhm: '',
    titularName: '   ',
  })

  const resolved = resolveAdministrative(blankProject, blankDerivation)

  assert.deepEqual(resolved, {
    titular: null,
    // El `uso` no se declaró, pero el tipo de la derivación sí lo dice (S6).
    uso: 'Vivienda',
    emplazamiento: { calle: null, numero: null, piso: null, puerta: null, localidad: null, codigoPostal: null },
    instalacion: null,
    distribuidora: null,
    resistenciaTierraOhm: null,
    superficieLocalM2: null,
    instalador: { nombre: null, nif: null, direccion: null, telefono: null, email: null, carnet: null },
  })
})

test('S5: a blank override falls back to the project instead of emptying the cell', () => {
  const resolved = resolveAdministrative(projectInfo, derivation({ titularName: '   ' }))

  assert.equal(resolved.titular, 'Ana Pérez Ruiz')
})

test('S5: the declared numbers are parsed from text, and an unparsable one is pending', () => {
  assert.equal(resolveAdministrative(projectInfo, derivation({ superficieLocalM2: '84.6' })).superficieLocalM2, 84.6)
  assert.equal(resolveAdministrative(projectInfo, derivation({ resistenciaTierraOhm: ' 12.5 ' })).resistenciaTierraOhm, 12.5)
  assert.equal(resolveAdministrative(projectInfo, derivation({ resistenciaTierraOhm: '0' })).resistenciaTierraOhm, 0, 'a declared zero is a declared value')

  for (const text of ['sin dato', 'Infinity', '']) {
    assert.equal(
      resolveAdministrative(projectInfo, derivation({ resistenciaTierraOhm: text })).resistenciaTierraOhm,
      null,
      `"${text}" is not a plain finite number and stays pending`,
    )
  }
})

test('S5: una sola coma decimal vale lo mismo que un punto', () => {
  const parsed = text => resolveAdministrative(projectInfo, derivation({ resistenciaTierraOhm: text })).resistenciaTierraOhm
  const surface = text => resolveAdministrative(projectInfo, derivation({ superficieLocalM2: text })).superficieLocalM2

  assert.equal(parsed('12,5'), 12.5, 'la coma decimal de un usuario español')
  assert.equal(parsed('12.5'), 12.5, 'el punto sigue valiendo')
  assert.equal(parsed(' 12,5 '), 12.5, 'y el texto se recorta antes de convertir')
  assert.equal(parsed('0,5'), 0.5)
  assert.equal(parsed('-3,25'), -3.25, 'el signo también se declara')
  assert.equal(surface('84,6'), 84.6, 'vale para las dos cifras de la hoja')
  assert.equal(resolveAdministrative(projectInfo, derivation({ resistenciaTierraOhm: 12.5 })).resistenciaTierraOhm, 12.5, 'un número ya convertido sigue entrando')
})

test('S5: dos separadores en la misma cifra son ambiguos y quedan pendientes', () => {
  const parsed = text => resolveAdministrative(projectInfo, derivation({ resistenciaTierraOhm: text })).resistenciaTierraOhm

  for (const text of ['12,5.5', '1.234,5', '12,5,5', '1.234.567,8', '12,,5']) {
    assert.equal(parsed(text), null, `"${text}" se podría leer de dos maneras y no se adivina`)
  }

  assert.equal(parsed(''), null, 'una cifra vacía queda pendiente')
  assert.equal(parsed('   '), null)
})

test('S6: el uso sale del tipo de derivación cuando el proyecto no lo declara', () => {
  const useOf = (kind, projectValue) => resolveAdministrative(
    { ...projectInfo, uso: projectValue },
    { ...derivation(), kind },
  ).uso

  assert.equal(useOf('dwelling', ''), 'Vivienda')
  assert.equal(useOf('local', ''), 'Comercial')
  assert.equal(useOf('garage', ''), 'Garaje')
  assert.equal(useOf('common-services', ''), 'Servicios generales')
  assert.equal(useOf('irve', ''), 'Recarga de vehículo eléctrico')

  for (const kind of ['custom', 'otro', undefined, null, 42]) {
    assert.equal(useOf(kind, ''), null, `el tipo ${String(kind)} no se adivina: la celda queda pendiente`)
  }

  assert.equal(useOf('garage', 'Vivienda habitual'), 'Vivienda habitual', 'el uso declarado gana sobre el tipo')
  assert.equal(useOf('garage', '   '), 'Garaje', 'un uso en blanco no gana: se deriva del tipo')
})

test('S5: the installation data block maps the company block defensively', () => {
  const withCompanyIds = {
    ...projectInfo,
    companyNif: 'B12345678',
    installerNumber: 'CARNET-09',
  }

  const resolved = resolveAdministrative(withCompanyIds, derivation())
  assert.equal(resolved.instalador.nif, 'B12345678')
  assert.equal(resolved.instalador.carnet, 'CARNET-09', 'the installer number is the carnet the sheet prints')

  const without = resolveAdministrative(projectInfo, derivation())
  assert.equal(without.instalador.nif, null, 'the NIF is not registered in ProjectInfo yet')
  assert.equal(without.instalador.carnet, null, 'the installer number is not registered in ProjectInfo yet')
})

test('S5: a missing project or derivation resolves to pending cells instead of throwing', () => {
  const onlyProject = resolveAdministrative(projectInfo, undefined)
  assert.equal(onlyProject.emplazamiento.numero, null)
  assert.equal(onlyProject.titular, 'Ana Pérez Ruiz')

  const onlyDerivation = resolveAdministrative(undefined, derivation({ numero: '3' }))
  assert.equal(onlyDerivation.emplazamiento.numero, '3')
  assert.equal(onlyDerivation.emplazamiento.calle, null)
  assert.equal(onlyDerivation.titular, null)

  const nothing = resolveAdministrative(null, null)
  assert.equal(nothing.titular, null)
  assert.equal(nothing.instalador.nombre, null)
})
