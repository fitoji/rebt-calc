/**
 * Instalaciones interiores de vivienda, ITC-BT-25.
 *
 * The interior installation starts after the meter: the DGMP (IGA + differential
 * protections), the ICP that the distributor seals, and the circuits. This
 * module does not size circuits yet; it fixes the protections the instruction
 * requires for a dwelling and checks them against its power step.
 *
 * Sources (RD 842/2002):
 *   ITC-BT-25 §2.1  IGA omnipolar, independent from the ICP; one or more 30 mA
 *                   differentials with rated current ≥ IGA; one differential per
 *                   five circuits; surge protection when required (ITC-BT-23).
 *   ITC-BT-17       the ICP sits in a sealable enclosure and its rating depends
 *                   on the contracted power.
 */

import { HOUSING_POWER_STEPS } from './normative-tables.mjs'

/** Sensitivity the general differentials must not exceed. */
export const DIFFERENTIAL_SENSITIVITY_MA = 30

/** One differential for every five installed circuits, as a minimum. */
export const CIRCUITS_PER_DIFFERENTIAL = 5

/**
 * Circuits a dwelling is assumed to have, by electrification grade. They are a
 * starting point for the differential count, not a regulation minimum: the
 * project can change them.
 */
export const DEFAULT_CIRCUITS = { basic: 5, elevated: 10 }

/** Voltage the housing power steps are published at. */
export const HOUSING_VOLTAGE = 230

/**
 * Default circuit count for a dwelling, from the grade of its power step.
 *
 * @param {number} powerW
 * @returns {number}
 */
export function defaultCircuitsFor(powerW) {
  const step = HOUSING_POWER_STEPS.find(([, watts]) => Number(watts) === powerW)
  return step?.[0] === 'Elevada' ? DEFAULT_CIRCUITS.elevated : DEFAULT_CIRCUITS.basic
}

/**
 * Interior inputs of a dwelling, with the circuit default of its grade when the
 * project has not set one. The points of each circuit are an optional map: a
 * project without it keeps using the minimum of the rooms. The power per point
 * of the circuits table 1 leaves open is another optional map: a project
 * without it declares no power for those circuits.
 *
 * @param {number} powerW
 * @param {Partial<InteriorInputs> | null | undefined} interior
 * @returns {InteriorInputs}
 */
export function resolveInterior(powerW, interior) {
  const merged = {
    ...DEFAULT_INTERIOR,
    circuits: defaultCircuitsFor(powerW),
    ...(interior ?? {}),
  }
  // La potencia contratada arranca en la prevista de la vivienda: prever y
  // contratar son pasos seguidos, y un cuadro sin valor dejaba el ICP sin
  // calcular aunque la previsión ya tuviera la potencia. Sigue siendo editable
  // para declarar una contratada menor.
  if (!(merged.contractedPowerW > 0)) merged.contractedPowerW = Math.max(0, powerW || 0)
  return merged
}

/**
 * Differential protections the installation needs.
 *
 * @param {number} circuits
 * @returns {number}
 */
export function differentialsFor(circuits) {
  return Math.max(1, Math.ceil(Math.max(0, Math.round(circuits)) / CIRCUITS_PER_DIFFERENTIAL))
}

/**
 * Current the contracted power implies, for choosing the ICP. It is a current,
 * not a device rating: the distributor fixes the sealed ICP.
 *
 * @param {number} contractedPowerW
 * @param {{ voltageV?: number, cosPhi?: number }} [options]
 * @returns {number | null}
 */
export function icpCurrentFor(contractedPowerW, { voltageV = HOUSING_VOLTAGE, cosPhi = 1 } = {}) {
  if (!Number.isFinite(contractedPowerW) || contractedPowerW <= 0) return null
  const denominator = voltageV * cosPhi
  return denominator > 0 ? contractedPowerW / denominator : null
}

/**
 * @typedef {{ type: string, area: number, length: number }} InteriorRoom
 * @typedef {Record<string, number>} PointsOverride circuit id → points the project installs
 * @typedef {Record<string, number>} CircuitPowerOverride circuit id → W per point declared by the project
 * @typedef {{ contractedPowerW: number, circuits: number, hasSurge: boolean, lengths?: Record<string, number>, rooms?: InteriorRoom[], hasHeating?: boolean, hasCooling?: boolean, hasDryer?: boolean, pointsOverride?: PointsOverride, circuitPowerOverride?: CircuitPowerOverride }} InteriorInputs
 * @typedef {{ igaA: number | null, powerW: number, contractedPowerW: number, circuits: number, hasSurge: boolean, lengths?: Record<string, number>, rooms?: InteriorRoom[], hasHeating?: boolean, hasCooling?: boolean, hasDryer?: boolean, pointsOverride?: PointsOverride, circuitPowerOverride?: CircuitPowerOverride }} InteriorState
 */

/** @type {InteriorInputs} */
export const DEFAULT_INTERIOR = { contractedPowerW: 0, circuits: 0, hasSurge: false, lengths: {}, rooms: [], hasHeating: false, hasCooling: false, hasDryer: false }

/**
 * Requirements and checks for one dwelling.
 *
 * @param {InteriorState} state
 * @param {{ voltageV?: number, cosPhi?: number }} [options]
 * @returns {{ igaA: number | null, maxPowerW: number | null, contractedPowerW: number, icpCurrentA: number | null, differentials: number, sensitivityMa: number, problems: string[], requirements: string[] }}
 */
export function evaluateInterior(state, { voltageV = HOUSING_VOLTAGE, cosPhi = 1 } = {}) {
  const igaA = state.igaA ?? null
  const maxPowerW = igaA == null ? null : igaA * voltageV
  const contractedPowerW = Math.max(0, state.contractedPowerW ?? 0)
  const circuits = Math.max(0, Math.round(state.circuits ?? 0))
  const differentials = differentialsFor(circuits)
  const problems = []

  if (igaA == null) {
    problems.push('La vivienda no tiene un escalón de potencia de la tabla A: no se puede fijar el IGA.')
  }
  if (maxPowerW != null && state.powerW > maxPowerW) {
    problems.push(`La potencia prevista (${state.powerW} W) supera la potencia máxima admisible del IGA de ${igaA} A (${maxPowerW} W).`)
  }
  if (maxPowerW != null && contractedPowerW > maxPowerW) {
    problems.push('La potencia contratada supera la potencia máxima admisible del IGA.')
  }

  const requirements = [
    `IGA omnipolar, independiente del ICP y no sustituible por él (ITC-BT-25 §2.1): ${igaA == null ? 'sin fijar' : `${igaA} A`}.`,
    `Al menos ${differentials} ${differentials === 1 ? 'interruptor diferencial' : 'interruptores diferenciales'} de ${DIFFERENTIAL_SENSITIVITY_MA} mA, con intensidad asignada igual o superior a la del IGA (uno por cada ${CIRCUITS_PER_DIFFERENTIAL} circuitos).`,
    'ICP en envolvente precintable; su calibre lo fija la potencia contratada con la distribuidora (ITC-BT-17).',
    ...(state.hasSurge ? ['Protección contra sobretensiones conforme a la ITC-BT-23.'] : []),
    'La derivación individual llega al DGMP; la protección de la línea se comprueba en su módulo con Ib ≤ In ≤ Iz.',
  ]

  return {
    igaA,
    maxPowerW,
    contractedPowerW,
    icpCurrentA: icpCurrentFor(contractedPowerW, { voltageV, cosPhi }),
    differentials,
    sensitivityMa: DIFFERENTIAL_SENSITIVITY_MA,
    problems,
    requirements,
  }
}
