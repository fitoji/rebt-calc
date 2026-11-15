/**
 * Adaptador entre el estado vivo de una vivienda y el modelo ELEC-3.
 *
 * El modelo (`lib/elec3.mjs`) no calcula: recibe la derivación individual y los
 * circuitos ya dimensionados. Este módulo arma esa entrada desde lo que la app
 * tiene en memoria —la DI de la pestaña Cuadros, los circuitos de la ITC-BT-25
 * de esa vivienda, sus longitudes y las dos hojas administrativas— sin leer
 * archivos, sin DOM y sin efectos.
 *
 * Regla del proyecto: ninguna celda se estima. Lo que una función existente del
 * proyecto no expone queda a `null` y se pinta como pendiente.
 */

import { HOUSING_CIRCUIT_VOLTAGE, circuitPowerW, housingCircuitSizing, housingCircuitsFor } from './housing-circuits.mjs'
import { applyPointOverrides, totalPoints } from './housing-points.mjs'
import { defaultCircuitsFor, evaluateInterior } from './interior-installation.mjs'

/**
 * @typedef {import('./elec3.mjs').DwellingDocumentInput} DwellingDocumentInput
 * @typedef {import('./elec3.mjs').AdministrativeInput} AdministrativeInput
 * @typedef {import('./elec3.mjs').LgaContext} LgaContext
 */

/** Tipos de instalación que el impreso reconoce; cualquier otro token queda pendiente. */
const INSTALLATION_TYPES = new Set(['nueva', 'ampliacion', 'reforma'])

/** Un número ya calculado por la app, o `null` si no lo hay. */
function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** Un vatio en kilovatios, como lo imprime la hoja. */
function kw(watts) {
  const value = num(watts)
  return value == null ? null : value / 1000
}

/**
 * Un número que `ProjectInfo` guarda como texto: se convierte acá y queda `null`
 * cuando el texto está vacío o no es un número.
 */
function declaredNumber(value) {
  if (typeof value === 'number') return num(value)
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * El contexto del edificio que la hoja imprime junto a la vivienda. Sale de la
 * LGA ya calculada por `calculateProject`, con las mismas columnas que usa
 * `buildDocument` para una exportación.
 *
 * @param {{ powerW?: number, tubeDiameter?: number, result?: Record<string, unknown> } | null | undefined} lga
 * @returns {LgaContext | null}
 */
function lgaContext(lga) {
  if (lga == null) return null
  const result = /** @type {Record<string, unknown>} */ (lga.result ?? {})
  return {
    potencia: kw(lga.powerW),
    seccio: num(result.finalSection),
    proteccio: num(result.protection),
    neutre: num(result.neutralSection),
    terra: num(result.protectiveSection),
    tub: num(lga.tubeDiameter),
    caiguda: num(result.dropPercent),
  }
}

/**
 * Un circuito de la ITC-BT-25 ya resuelto para la hoja.
 *
 * La sección y la caída salen de `housingCircuitSizing` con la longitud que el
 * proyecto declara; el PIA y el tubo, de la tabla 1. La potencia del tramo es la
 * que el circuito instala: los puntos que el proyecto declara por la potencia de
 * cada toma (tabla 1, o la que el proyecto fija en C8/C9/C11/C13). El factor de
 * simultaneidad no se aplica acá: el modelo lo lleva en su propia columna, que
 * sigue pendiente. El momento es la aritmética de unidades del motor: kW · m.
 *
 * @param {import('./housing-circuits.mjs').HousingCircuit} circuit
 * @param {{ lengths?: Record<string, number>, circuitPowerOverride?: Record<string, number> }} interior
 * @param {Record<string, number>} points puntos instalados por circuito
 */
function circuitInput(circuit, interior, points) {
  const lengthM = Math.max(0, num(interior?.lengths?.[circuit.id]) ?? 0)
  const sizing = housingCircuitSizing(circuit, lengthM)
  const perPointW = circuitPowerW(circuit.id, interior?.circuitPowerOverride)
  const count = num(points?.[circuit.id])
  const powerW = perPointW == null || count == null || count <= 0 ? null : perPointW * count

  return {
    id: circuit.id,
    label: circuit.name == null ? circuit.id : `${circuit.id} · ${circuit.name}`,
    powerW: powerW ?? undefined,
    lengthM,
    breakerA: num(circuit.breakerA) ?? undefined,
    section: sizing.section,
    momentKwM: powerW == null || powerW <= 0 ? undefined : (powerW / 1000) * lengthM,
    dropPercent: sizing.dropPercent,
    // Los circuitos de vivienda de la ITC-BT-25 van bajo tubo: la tabla 1 fija el
    // diámetro, y la canalización de la hoja se escribe con ese dato.
    installation: /** @type {'air'} */ ('air'),
    tubeDiameter: num(circuit.tube) ?? undefined,
  }
}

/**
 * La entrada de `buildDwellingDocument` para una vivienda, desde el estado vivo.
 *
 * @param {{
 *   derivation?: object,
 *   interior?: { lengths?: Record<string, number>, circuitPowerOverride?: Record<string, number> } | null,
 *   circuits?: import('./housing-circuits.mjs').HousingCircuit[],
 *   projectInfo?: Partial<Record<string, string>> | null,
 *   lga?: object | null,
 *   hasIrve?: boolean,
 *   date?: string,
 * }} [source]
 * @returns {DwellingDocumentInput}
 */
export function dwellingDocumentInput({ derivation, interior, circuits, projectInfo, lga, hasIrve = false, date } = {}) {
  const line = /** @type {Record<string, any>} */ (derivation ?? {})
  const info = /** @type {Record<string, string | undefined>} */ (projectInfo ?? {})
  const housing = interior ?? {}
  const powerW = num(line.powerW)
  // Los circuitos de la vivienda los resuelve la app; sin ellos se resuelven acá
  // con el grado de electrificación de su escalón de potencia.
  const rows = Array.isArray(circuits) ? circuits : housingCircuitsFor(powerW ?? 0, { hasIrve })
  const result = /** @type {Record<string, unknown>} */ (line.result ?? {})
  // Las protecciones que la vivienda exige: mismo cálculo que muestra su cuadro.
  const evaluation = evaluateInterior(
    { igaA: num(line.housingIgaA), powerW: powerW ?? 0, ...housing, circuits: defaultCircuitsFor(powerW ?? 0) },
  )
  const instalacion = typeof info.installType === 'string' ? info.installType.trim() : ''
  // Los puntos que la vivienda instala, por circuito: el mínimo de las estancias
  // con lo que el proyecto haya declarado encima. Sin puntos no hay potencia de
  // circuito que escribir, y la celda queda pendiente en vez de suponerse.
  const points = applyPointOverrides(
    totalPoints(housing.rooms ?? [], { hasHeating: housing.hasHeating, hasCooling: housing.hasCooling, hasDryer: housing.hasDryer }),
    housing.pointsOverride,
  ).totals

  /** @type {AdministrativeInput} */
  const administrative = {
    titular: info.titularName,
    uso: info.uso,
    emplazamiento: {
      calle: info.workAddress,
      numero: info.addressNumber,
      piso: info.addressFloor,
      puerta: info.addressDoor,
      localidad: info.addressCity,
      codigoPostal: info.addressPostalCode,
    },
    ...(INSTALLATION_TYPES.has(instalacion) ? { instalacion: /** @type {'nueva' | 'ampliacion' | 'reforma'} */ (instalacion) } : {}),
    distribuidora: info.distributorName,
    resistenciaTierraOhm: declaredNumber(info.groundResistanceOhm),
    superficieLocalM2: declaredNumber(info.localAreaM2),
    seccionDi: num(result.finalSection),
    potenciaMaximaAdmisibleKw: kw(num(result.maxAdmissiblePowerW) ?? evaluation.maxPowerW),
    tensionV: HOUSING_CIRCUIT_VOLTAGE,
    potenciaInstalarKw: kw(powerW),
    igaA: num(line.housingIgaA),
    // El motor resuelve cuántos diferenciales exige la vivienda y con qué
    // sensibilidad; el calibre del aparato lo elige el instalador.
    diferenciales: Array.from({ length: evaluation.differentials }, () => ({ sensibilidadMa: evaluation.sensitivityMa })),
  }

  return {
    obra: info.workAddress,
    data: date,
    totalKw: kw(powerW),
    lga: lgaContext(lga),
    derivation: {
      label: line.label,
      powerW: line.powerW,
      cosPhi: num(line.cosPhi) ?? undefined,
      lengthM: num(line.lengthM) ?? undefined,
      installation: line.installation,
      tubeDiameter: num(line.tubeDiameter) ?? undefined,
      result: line.result,
    },
    circuits: rows.map(circuit => circuitInput(circuit, housing, points)),
    administrative,
  }
}
