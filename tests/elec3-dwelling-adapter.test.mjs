import assert from 'node:assert/strict'
import test from 'node:test'

import { dwellingDocumentInput } from '../lib/elec3-dwelling.mjs'
import { buildDwellingDocument, PENDING_CELLS } from '../lib/elec3.mjs'
import { housingCircuitsFor } from '../lib/housing-circuits.mjs'

/**
 * La DI de una vivienda de 9 200 W tal como la deja el motor de líneas, con los
 * datos que son de esa instalación en su bloque `administrative` (S5).
 */
const derivation = {
  id: 'dwelling-0-0',
  kind: 'dwelling',
  label: 'Vivienda 1',
  powerW: 9200,
  cosPhi: 1,
  lengthM: 20,
  installation: 'air',
  tubeDiameter: 40,
  housingIgaA: 40,
  housingAreaM2: 90,
  administrative: {
    numero: '12',
    piso: '3º',
    puerta: 'B',
    resistenciaTierraOhm: '12.5',
    superficieLocalM2: '84.6',
  },
  result: {
    finalSection: 16,
    ratedCurrent: 40,
    dropPercent: 0.906,
    momentKwM: 184,
    cableType: 'RZ1-K 0,6/1 kV',
    neutralSection: 16,
    protectiveSection: 16,
    maxAdmissiblePowerW: 9200,
  },
}

/** La LGA del proyecto, ya calculada por `calculateProject`. */
const lga = {
  powerW: 194676,
  tubeDiameter: 140,
  result: { finalSection: 150, protection: 315, neutralSection: 70, protectiveSection: 95, dropPercent: 0.461 },
}

/**
 * Los datos administrativos del edificio, tal como los guarda `ProjectInfo`. El
 * número, el piso, la puerta, la superficie del local y la resistencia de tierra
 * no están acá: son de cada instalación y viajan en su derivación.
 */
const projectInfo = {
  companyName: 'Estudio',
  companyAddress: '',
  workAddress: 'Carrer Major 12, Girona',
  phone: '',
  email: '',
  logo: '',
  titularName: 'Ana Pérez Ruiz',
  uso: 'Vivienda habitual',
  addressCity: 'Girona',
  addressPostalCode: '17001',
  installType: 'reforma',
  distributorName: 'e-Distribución',
}

const circuits = housingCircuitsFor(9200, { hasIrve: false }).slice(0, 3)
const interior = { lengths: { C1: 12, C2: 18, C3: 9 }, circuitPowerOverride: {}, pointsOverride: { C1: 10, C2: 20, C3: 2 } }

function documentFor(overrides = {}) {
  return buildDwellingDocument(dwellingDocumentInput({
    derivation,
    interior,
    circuits,
    projectInfo,
    lga,
    date: '15/11/2026',
    ...overrides,
  }))
}

const close = (actual, expected, message) => {
  assert.equal(typeof actual, 'number', message)
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} ≈ ${expected}`)
}

test('la hoja 1 arranca en la derivación individual y sigue con los circuitos de la vivienda', () => {
  const document = documentFor()

  assert.equal(document.files.length, 4, 'la DI más los tres circuitos')
  assert.equal(document.files[0].nom, 'Derivación individual')
  assert.equal(document.files[0].tipus, 'VIVIENDA')
  assert.deepEqual(document.files.slice(1).map(row => row.tipus), ['CIRCUITO', 'CIRCUITO', 'CIRCUITO'])
  assert.deepEqual(document.files.slice(1).map(row => row.id), ['C1', 'C2', 'C3'])
  assert.match(String(document.files[1].nom), /^C1 · /, 'el tramo nombra el circuito y su descripción')
  assert.equal(document.circuitsBeyondModel, 0, 'tres circuitos caben de sobra')

  assert.equal(document.obra, 'Carrer Major 12, Girona')
  assert.equal(document.data, '15/11/2026')
  assert.equal(document.totalKw, 9.2, 'la potencia de la vivienda, en kW')
})

test('la fila de la DI toma la sección, la caída y el momento que ya calculó el motor', () => {
  const row = documentFor().files[0]

  assert.equal(row.potencia, 9.2)
  assert.equal(row.cosPhi, 1)
  assert.equal(row.intensitat, 40)
  assert.equal(row.seccio, 16)
  assert.equal(row.longitud, 20)
  assert.equal(row.moment, 184)
  assert.equal(row.caigudaParcial, 0.906)
  assert.equal(row.conductor, 'RZ1-K')
  assert.equal(row.tensio, '0,6/1 kV')
  assert.equal(row.canalitzacio, 'Bajo tubo · Ø 40 mm')
  assert.equal(row.neutre, 16)
  assert.equal(row.proteccio, 16)
})

test('la fila de un circuito usa la tabla 1 y la caída del motor de vivienda', () => {
  const [c1, c2] = documentFor().files.slice(1)

  assert.equal(c1.potencia, 2, 'los 10 puntos de C1 por los 200 W que la tabla 1 declara por toma')
  assert.equal(c1.intensitat, 10, 'la intensidad es el PIA de la tabla')
  assert.equal(c1.seccio, 1.5)
  assert.equal(c1.longitud, 12)
  close(c1.moment, 24, 'el momento es kW · m de la potencia instalada')
  close(c1.caigudaParcial, (2 * 10 * 12 * 100) / (48 * 1.5 * 230), 'la caída del motor de vivienda')
  assert.equal(c1.canalitzacio, 'Bajo tubo · Ø 16 mm')

  assert.equal(c2.potencia, 69, 'los 20 puntos de C2 por los 3 450 W por toma')
  assert.equal(c2.intensitat, 16)
  assert.equal(c2.seccio, 2.5)
  close(c2.moment, 69 * 18, 'el momento es kW · m')
})

test('sin puntos declarados la potencia del circuito queda pendiente, no se supone', () => {
  const withoutPoints = documentFor({ interior: { lengths: { C1: 12 } } }).files[1]

  assert.equal(withoutPoints.potencia, null, 'nadie declaró cuántos puntos lleva el circuito')
  assert.equal(withoutPoints.moment, null, 'sin potencia no hay momento')
  assert.equal(withoutPoints.seccio, 1.5, 'la sección sigue saliendo de la tabla 1')
  assert.equal(withoutPoints.intensitat, 10, 'y el PIA también')
})

test('la hoja 2 lleva lo declarado en la instalación y lo que la app ya deriva de la vivienda', () => {
  const { administrative } = documentFor()

  assert.equal(administrative.titular, 'Ana Pérez Ruiz', 'el titular no es de la instalación: se hereda del proyecto')
  assert.equal(administrative.uso, 'Vivienda habitual', 'el uso declarado por el proyecto gana')
  assert.deepEqual(administrative.emplazamiento, {
    calle: 'Carrer Major 12, Girona',
    numero: '12',
    piso: '3º',
    puerta: 'B',
    localidad: 'Girona',
    codigoPostal: '17001',
  }, 'la calle, la localidad y el CP vienen del proyecto; número, piso y puerta de la instalación')
  assert.equal(administrative.instalacion, 'Reforma', 'el token se imprime con la etiqueta del impreso')
  assert.equal(administrative.distribuidora, 'e-Distribución')
  assert.equal(administrative.resistenciaTierraOhm, 12.5, 'el texto declarado se convierte')
  assert.equal(administrative.superficieLocalM2, 84.6)
  assert.equal(administrative.seccionDi, 16, 'la sección final de la DI')
  assert.equal(administrative.tensionV, 230, 'la tensión de la vivienda')
  assert.equal(administrative.potenciaInstalarKw, 9.2)
  assert.equal(administrative.igaA, 40)
  assert.equal(administrative.potenciaMaximaAdmisibleKw, 9.2, 'la potencia admisible que ya calcula el motor')

  assert.equal(administrative.diferenciales.length, 2, 'la vivienda elevada exige dos diferenciales por cada cinco circuitos')
  for (const differential of administrative.diferenciales) {
    assert.equal(differential.sensibilidadMa, 30, 'la sensibilidad que exige la ITC-BT-25 §2.1')
    assert.equal(differential.inA, null, 'la app no elige el calibre del diferencial: queda pendiente')
  }
})

test('el contexto de la LGA del edificio viaja con el documento', () => {
  assert.deepEqual(documentFor().lga, {
    potencia: 194.676,
    seccio: 150,
    proteccio: 315,
    neutre: 70,
    terra: 95,
    tub: 140,
    caiguda: 0.461,
  })
  assert.equal(documentFor({ lga: null }).lga, null, 'sin LGA el contexto queda vacío')
})

test('una vivienda sin resultado ni datos opcionales deja nulls y no rompe', () => {
  const input = dwellingDocumentInput({
    derivation: { powerW: 5750 },
    circuits: housingCircuitsFor(5750),
  })
  const document = buildDwellingDocument(input)
  const [di, ...rows] = document.files

  assert.equal(di.potencia, 5.75, 'la potencia de la vivienda sí la trae el estado')
  for (const key of ['cosPhi', 'intensitat', 'seccio', 'longitud', 'moment', 'caigudaParcial', 'conductor', 'tensio', 'canalitzacio', 'neutre', 'proteccio']) {
    assert.equal(di[key], null, `la DI sin resultado deja ${key} pendiente`)
  }
  for (const row of rows) {
    assert.equal(row.longitud, 0, 'sin longitudes declaradas no hay longitud, y no se estima')
    assert.equal(row.moment, null, 'sin puntos no hay potencia, y sin potencia ni longitud no hay momento')
    assert.equal(row.caigudaParcial, null, 'sin longitud no hay caída')
  }

  const { administrative } = document
  for (const key of ['titular', 'uso', 'instalacion', 'distribuidora', 'resistenciaTierraOhm', 'superficieLocalM2', 'seccionDi', 'potenciaMaximaAdmisibleKw', 'igaA']) {
    assert.equal(administrative[key], null, `sin datos declarados ${key} queda pendiente`)
  }
  assert.equal(administrative.potenciaInstalarKw, 5.75, 'la potencia a instalar sale de la vivienda')
  for (const value of Object.values(administrative.emplazamiento)) {
    assert.equal(value, null, 'el emplazamiento sin dirección queda pendiente')
  }
  assert.equal(administrative.tensionV, 230, 'la tensión de la vivienda es una constante, no un dato del usuario')

  const { administrative: empty } = buildDwellingDocument(dwellingDocumentInput({}))
  assert.equal(empty.titular, null)
  assert.equal(empty.seccionDi, null)
})

test('un número declarado ilegible queda pendiente en lugar de romper', () => {
  const document = buildDwellingDocument(dwellingDocumentInput({
    derivation: { ...derivation, administrative: { ...derivation.administrative, resistenciaTierraOhm: 'sin dato', superficieLocalM2: '' } },
    circuits,
    projectInfo,
  }))

  assert.equal(document.administrative.resistenciaTierraOhm, null)
  assert.equal(document.administrative.superficieLocalM2, null)
  assert.equal(document.administrative.titular, 'Ana Pérez Ruiz', 'el resto de la hoja sigue en pie')
})

test('S5: la instalación gana cuando el mismo dato está declarado en los dos niveles', () => {
  const { administrative } = documentFor({
    projectInfo: {
      ...projectInfo,
      titularName: 'Ana Pérez Ruiz',
      // Claves que `ProjectInfo` ya no declara; si alguna sobrevive en un store
      // viejo, la instalación sigue ganando.
      addressNumber: '99',
      addressFloor: 'ático',
      addressDoor: 'Z',
      groundResistanceOhm: '80',
      localAreaM2: '120',
    },
  })

  assert.equal(administrative.titular, 'Ana Pérez Ruiz', 'la instalación no declara titular propio: hereda el del proyecto')
  assert.equal(administrative.emplazamiento.numero, '12', 'el número de la instalación no se hereda ni se pisa')
  assert.equal(administrative.emplazamiento.piso, '3º')
  assert.equal(administrative.emplazamiento.puerta, 'B')
  assert.equal(administrative.resistenciaTierraOhm, 12.5, 'la tierra es de la instalación, no del proyecto')
  assert.equal(administrative.superficieLocalM2, 84.6, 'la superficie es de la instalación, no del proyecto')
})

test('S5: un titular declarado por la instalación gana sobre el del proyecto', () => {
  const { administrative } = documentFor({
    derivation: { ...derivation, administrative: { ...derivation.administrative, titularName: 'Luis Gómez' } },
  })

  assert.equal(administrative.titular, 'Luis Gómez')
})

test('S5: la instalación hereda calle, localidad y código postal del proyecto', () => {
  const { administrative } = documentFor()

  assert.equal(administrative.emplazamiento.calle, 'Carrer Major 12, Girona', 'la calle es del edificio')
  assert.equal(administrative.emplazamiento.localidad, 'Girona', 'la localidad es del edificio')
  assert.equal(administrative.emplazamiento.codigoPostal, '17001', 'el código postal es del edificio')
})

test('S5: número, piso y puerta nunca se heredan del proyecto', () => {
  const withoutOwnNumbers = {
    ...derivation,
    administrative: { ...derivation.administrative, numero: '', piso: ' ', puerta: undefined },
  }
  const { administrative } = documentFor({
    derivation: withoutOwnNumbers,
    projectInfo: { ...projectInfo, addressNumber: '99', addressFloor: 'ático', addressDoor: 'Z' },
  })

  assert.equal(administrative.emplazamiento.numero, null, 'sin número declarado la celda queda pendiente')
  assert.equal(administrative.emplazamiento.piso, null, 'sin piso declarado la celda queda pendiente')
  assert.equal(administrative.emplazamiento.puerta, null, 'sin puerta declarada la celda queda pendiente')
  assert.equal(administrative.emplazamiento.calle, 'Carrer Major 12, Girona', 'el resto del emplazamiento sigue heredándose')
})

test('S6: el uso se deriva del tipo de derivación cuando el proyecto no lo declara', () => {
  const labels = {
    dwelling: 'Vivienda',
    local: 'Comercial',
    garage: 'Garaje',
    'common-services': 'Servicios generales',
    irve: 'Recarga de vehículo eléctrico',
  }

  for (const [kind, label] of Object.entries(labels)) {
    const { uso } = documentFor({
      derivation: { ...derivation, kind },
      projectInfo: { ...projectInfo, uso: '' },
    }).administrative
    assert.equal(uso, label, `una derivación de tipo ${kind} se imprime como «${label}»`)
  }

  for (const kind of ['custom', 'desconocido']) {
    const { uso } = documentFor({
      derivation: { ...derivation, kind },
      projectInfo: { ...projectInfo, uso: '' },
    }).administrative
    assert.equal(uso, null, `el tipo ${kind} no se adivina: la celda queda pendiente`)
  }
})

test('S6: el uso declarado por el proyecto gana sobre el que sale del tipo', () => {
  const { uso } = documentFor({
    derivation: { ...derivation, kind: 'garage' },
    projectInfo: { ...projectInfo, uso: 'Vivienda habitual' },
  }).administrative

  assert.equal(uso, 'Vivienda habitual')
})

test('S5: la coma decimal se acepta en las cifras que se escriben a mano', () => {
  const withNumbers = administrative => documentFor({
    derivation: { ...derivation, administrative: { ...derivation.administrative, ...administrative } },
  }).administrative

  assert.equal(withNumbers({ resistenciaTierraOhm: '12,5' }).resistenciaTierraOhm, 12.5, 'la coma decimal de un usuario español')
  assert.equal(withNumbers({ resistenciaTierraOhm: '12.5' }).resistenciaTierraOhm, 12.5, 'el punto sigue valiendo')
  assert.equal(withNumbers({ superficieLocalM2: '84,6' }).superficieLocalM2, 84.6, 'y vale para las dos cifras de la hoja')

  for (const text of ['12,5.5', '1.234,5', '']) {
    assert.equal(
      withNumbers({ resistenciaTierraOhm: text }).resistenciaTierraOhm,
      null,
      `«${text}» es ambiguo o vacío y queda pendiente`,
    )
  }
})

test('una vivienda sin circuitos documenta su DI y nada más', () => {
  const document = documentFor({ circuits: [] })

  assert.equal(document.files.length, 1)
  assert.equal(document.files[0].tipus, 'VIVIENDA')
  assert.equal(document.circuitsBeyondModel, 0)
})

test('más de doce circuitos reporta los que no caben en el modelo', () => {
  const base = housingCircuitsFor(9200, { hasIrve: false })
  const thirteen = [...base, { ...base[0], id: 'C14', name: 'Adicional de iluminación' }]
  const document = documentFor({ circuits: thirteen })

  assert.equal(document.files.length, 13, 'la DI y las doce filas que tiene el impreso')
  assert.equal(document.files.filter(row => row.tipus === 'CIRCUITO').length, 12)
  assert.equal(document.circuitsBeyondModel, 1, 'el que no cabe se declara, no se inventa una fila')
})

test('las celdas que la app no puede rellenar quedan pendientes y se declaran acá', () => {
  const document = documentFor()

  for (const row of document.files) {
    for (const pending of PENDING_CELLS) {
      assert.equal(row[pending.key], null, `${row.nom} · ${pending.label} sigue pendiente`)
    }
  }

  for (const row of document.files.slice(1)) {
    assert.equal(row.cosPhi, null, 'un circuito no declara cos φ: no se asume 1')
    assert.equal(row.conductor, null, 'el motor de vivienda no expone el tipo de cable')
    assert.equal(row.tensio, null, 'ni su tensión nominal de aislamiento')
    assert.equal(row.neutre, null, 'ni la sección del neutro')
    assert.equal(row.proteccio, null, 'ni la del conductor de protección')
  }

  const c8 = buildDwellingDocument(dwellingDocumentInput({
    derivation,
    circuits: housingCircuitsFor(9200).filter(circuit => circuit.id === 'C8'),
    interior,
  })).files[1]
  assert.equal(c8.potencia, null, 'C8 no tiene potencia por toma en la tabla 1 ni declarada por el proyecto')
  assert.equal(c8.moment, null, 'sin potencia no hay momento')
  assert.equal(c8.seccio, 6, 'la sección sí sale de la tabla 1')
  assert.equal(c8.intensitat, 25, 'y el PIA también')
})
