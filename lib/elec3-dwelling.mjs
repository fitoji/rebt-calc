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

import { resolveAdministrative } from './administrative.mjs'
import { HOUSING_CIRCUIT_VOLTAGE, c4BranchPoints, circuitPowerW, housingCircuitLength, housingCircuitSimultaneityPercent, housingCircuitSizing, housingCircuitsFor, resolveC4Split } from './housing-circuits.mjs'
import { interiorConductorCableType } from './interior-conductors.mjs'
import { protectiveSection } from './conductor-sections.mjs'
import { applyPointOverrides, totalPoints } from './housing-points.mjs'
import { getSimultaneityCoefficient } from './simultaneity.mjs'
import { defaultCircuitsFor, evaluateInterior } from './interior-installation.mjs'
import { differentialLabel, normalizeDifferentials } from './differentials.mjs'

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
 * simultaneidad se escribe en su columna del modelo como fs · fu · 100, con los
 * factores no publicados en 1. El momento es la aritmética de unidades del motor: kW · m.
 *
 * @param {import('./housing-circuits.mjs').HousingCircuit} circuit
 * @param {{ lengths?: Record<string, number>, circuitPowerOverride?: Record<string, number>, sectionOverride?: Record<string, number> }} interior
 * @param {Record<string, number>} points puntos instalados por circuito
 */
function circuitInput(circuit, interior, points) {
  const lengthM = housingCircuitLength(interior?.lengths, circuit)
  const sizing = housingCircuitSizing(circuit, lengthM, interior?.sectionOverride?.[circuit.id] ?? null)
  const perPointW = circuitPowerW(circuit.id, interior?.circuitPowerOverride)
  const count = num(points?.[circuit.id])
  const powerW = perPointW == null || count == null || count <= 0 ? null : perPointW * count

  return {
    id: circuit.id,
    label: circuit.name == null ? circuit.id : `${circuit.id} · ${circuit.name}`,
    powerW: powerW ?? undefined,
    simultaneitat: housingCircuitSimultaneityPercent(circuit),
    lengthM,
    breakerA: num(circuit.breakerA) ?? undefined,
    section: sizing.effectiveSection,
    momentKwM: powerW == null || powerW <= 0 ? undefined : (powerW / 1000) * lengthM,
    dropPercent: sizing.dropPercent,
    // Neutro y PE de los circuitos interiores: el neutro iguala la fase y el PE
    // sigue la tabla ITC-BT-18 (igual hasta 16 mm², 16 hasta 35 y mitad después).
    neutralSection: sizing.effectiveSection ?? undefined,
    protectiveSection: sizing.effectiveSection == null ? undefined : protectiveSection(sizing.effectiveSection),
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
 *   conductorType?: import('./interior-conductors.mjs').InteriorConductor,
 * }} [source]
 * @returns {DwellingDocumentInput}
 */
export function dwellingDocumentInput({ derivation, interior, circuits, projectInfo, lga, hasIrve = false, date, conductorType } = {}) {
  const line = /** @type {Record<string, any>} */ (derivation ?? {})
  const info = /** @type {Record<string, string | undefined>} */ (projectInfo ?? {})
  const housing = interior ?? {}
  const powerW = num(line.powerW)
  const { c4Mode, c4Pair } = resolveC4Split(housing)
  // Los circuitos de la vivienda los resuelve la app; sin ellos se resuelven acá
  // con el grado de electrificación de su escalón de potencia y el modo de C4.
  const rows = Array.isArray(circuits) ? circuits : housingCircuitsFor(powerW ?? 0, { hasIrve, c4Mode, c4Pair })
  const result = /** @type {Record<string, unknown>} */ (line.result ?? {})
  // Las protecciones que la vivienda exige: mismo cálculo que muestra su cuadro.
  // C4 suma circuitos físicos pero no diferenciales (nota 8 de la tabla 1).
  const evaluation = evaluateInterior(
    { igaA: num(line.housingIgaA), powerW: powerW ?? 0, ...housing, circuits: defaultCircuitsFor(powerW ?? 0) + (c4Mode - 1), c4Mode },
  )
  // Los diferenciales declarados son la fuente de verdad del impreso. El tipo y
  // los circuitos se imprimen en las columnas existentes; el calibre queda
  // pendiente porque la app no elige la denominación comercial.
  const { devices: differentialDevices } = normalizeDifferentials({
    differentials: housing.differentials,
    differentialType: housing.differentialType,
    circuitIds: rows.map(circuit => circuit.id),
    minimum: evaluation.differentials,
  })
  // La hoja 2 no adivina nada: la herencia entre lo declarado en el proyecto y lo
  // declarado por esta instalación la resuelve `resolveAdministrative`, que además
  // deriva el `uso` del tipo de derivación (S5, S6).
  const resolved = resolveAdministrative(info, derivation)
  // Los puntos que la vivienda instala, por circuito: el mínimo de las estancias
  // con lo que el proyecto haya declarado encima. Sin puntos no hay potencia de
  // circuito que escribir, y la celda queda pendiente en vez de suponerse.
  const pointTotals = applyPointOverrides(
    totalPoints(housing.rooms ?? [], { hasHeating: housing.hasHeating, hasCooling: housing.hasCooling, hasDryer: housing.hasDryer }),
    housing.pointsOverride,
  ).totals
  // Los puntos de C4 se reparten entre sus ramas; dividir un circuito nunca
  // duplica la potencia prevista de la vivienda.
  const points = { ...pointTotals, ...c4BranchPoints(pointTotals.C4 ?? 0, c4Mode, c4Pair) }

  /** @type {AdministrativeInput} */
  const administrative = {
    titular: resolved.titular ?? undefined,
    uso: resolved.uso ?? undefined,
    emplazamiento: {
      calle: resolved.emplazamiento.calle ?? undefined,
      numero: resolved.emplazamiento.numero ?? undefined,
      piso: resolved.emplazamiento.piso ?? undefined,
      puerta: resolved.emplazamiento.puerta ?? undefined,
      localidad: resolved.emplazamiento.localidad ?? undefined,
      codigoPostal: resolved.emplazamiento.codigoPostal ?? undefined,
    },
    ...(INSTALLATION_TYPES.has(resolved.instalacion ?? '') ? { instalacion: /** @type {'nueva' | 'ampliacion' | 'reforma'} */ (resolved.instalacion) } : {}),
    distribuidora: resolved.distribuidora ?? undefined,
    resistenciaTierraOhm: resolved.resistenciaTierraOhm,
    superficieLocalM2: resolved.superficieLocalM2,
    seccionDi: num(result.finalSection),
    potenciaMaximaAdmisibleKw: kw(num(result.maxAdmissiblePowerW) ?? evaluation.maxPowerW),
    tensionV: HOUSING_CIRCUIT_VOLTAGE,
    potenciaInstalarKw: kw(powerW),
    igaA: num(line.housingIgaA),
    // El motor resuelve cuántos diferenciales exige la vivienda y con qué
    // sensibilidad; el calibre del aparato lo elige el instalador.
    diferenciales: differentialDevices.map(device => ({
      circuito: device.circuits.join(', ') || undefined,
      nombre: differentialLabel(device),
      sensibilidadMa: device.sensitivityMa,
    })),
  }

  // El tipo de conductor es una declaración del instalador (ITC-BT-26), no un
  // dato que el motor exponga: se imprime en los circuitos cuando se eligió y se
  // deja pendiente cuando nadie lo declaró. La DI conserva el cable del motor.
  const circuitRows = rows
    .map(circuit => circuitInput(circuit, housing, points))
    .map(circuit => conductorType ? { ...circuit, cableType: interiorConductorCableType(conductorType) } : circuit)

  return {
    obra: resolved.emplazamiento.calle ?? undefined,
    data: date,
    totalKw: kw(powerW),
    lga: lgaContext(lga),
    // Un solo valor de aislamiento para toda la vivienda; la hoja lo repite en
    // la DI y en cada circuito. Sin declararlo la celda queda pendiente.
    aillament: num(housing.insulationKohm) ?? undefined,
    installationType: housing.installationType,
    buriedDepthM: num(housing.buriedDepthM) ?? undefined,
    derivation: {
      label: line.label,
      method: line.method,
      // Una derivación individual alimenta una vivienda: el coeficiente de la
      // tabla ITC-BT-10 para n = 1 es 1, o sea 100 % en la celda del impreso.
      simultaneitat: getSimultaneityCoefficient(1) * 100,
      powerW: line.powerW,
      cosPhi: num(line.cosPhi) ?? undefined,
      lengthM: num(line.lengthM) ?? undefined,
      installation: line.installation,
      tubeDiameter: num(line.tubeDiameter) ?? undefined,
      result: line.result,
    },
    circuits: circuitRows,
    administrative,
  }
}
