import { HOUSING_CIRCUITS, HOUSING_CIRCUIT_NOTES, HOUSING_CIRCUIT_POWER_LIMITS, HOUSING_DERIVED_CIRCUITS } from './normative-tables.mjs'

/**
 * Circuitos de la instalación interior de una vivienda, ITC-BT-25 tabla 1.
 *
 * Values transcribed from the consolidated REBT (BOE-A-2002-18099, ITC-BT-25
 * §3, table 1, last update by RD 1053/2014). C6, C7 and C12 are additional
 * circuits of the basic types and inherit their characteristics; C13 depends on
 * ITC-BT-52 and only appears when the project foresees EV charging.
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   powerPerPointW: number | null,
 *   fs: number | null,
 *   fu: number | null,
 *   socket: string,
 *   breakerA: number | null,
 *   maxPoints: number | null,
 *   section: number | null,
 *   tube: number | null,
 *   note?: string
 * }} HousingCircuit
 */

/** @type {Record<string, HousingCircuit>} */
const CIRCUITS = Object.fromEntries(Object.entries(HOUSING_CIRCUITS).map(([id, circuit]) => [id, { id, ...circuit }]))

/**
 * Power per point a circuit declares.
 *
 * Table 1 fixes the power of C1–C5 and C10, so those circuits keep the
 * published value and ignore any manual entry. C8, C9, C11 and C13 have no
 * power per point in the table: they declare the value the project types, and
 * nothing while the project has not typed one. The result never changes the
 * PIA, the section or the tube of the circuit.
 *
 * @param {string} circuitId
 * @param {Record<string, number> | null | undefined} [circuitPowerOverride] circuit id → W per point
 * @returns {number | null}
 */
export function circuitPowerW(circuitId, circuitPowerOverride = {}) {
  const circuit = CIRCUITS[circuitId]
  if (circuit == null) return null
  if (circuit.powerPerPointW != null) return circuit.powerPerPointW

  const source = circuitPowerOverride != null && typeof circuitPowerOverride === 'object' ? circuitPowerOverride : {}
  const value = source[circuitId]
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** Circuits of each electrification grade, ITC-BT-25 §2.3. */
export const BASIC_CIRCUIT_IDS = ['C1', 'C2', 'C3', 'C4', 'C5']
export const ELEVATED_CIRCUIT_IDS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12']

/** Rows of table 1 as published, without the derived C6/C7/C12. */
export const HOUSING_CIRCUIT_TABLE = ['C1', 'C2', 'C3', 'C4', 'C5', 'C8', 'C9', 'C10', 'C11', 'C13'].map(id => CIRCUITS[id])

/** Notes of table 1, abridged to the ones that change a design decision. */
export const HOUSING_CIRCUIT_TABLE_NOTES = HOUSING_CIRCUIT_NOTES

/** Reference for the maximum drop of a housing circuit, ITC-BT-25 §3. */
export const HOUSING_CIRCUIT_MAX_DROP = HOUSING_CIRCUIT_POWER_LIMITS.maxDropPercent

/** Conductivity of copper at 70 °C (PVC), the table-1 reference installation. */
export const HOUSING_CIRCUIT_GAMMA = 48

/** Voltage of the housing circuits, ITC-BT-25 table 1 note 1. */
export const HOUSING_CIRCUIT_VOLTAGE = 230

/** Standard sections the drop criterion can adopt. */
export const HOUSING_CIRCUIT_SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240]

/**
 * Section the drop criterion requires, at the rated current of the circuit
 * breaker and the farthest point, for a two-conductor single-phase circuit.
 *
 * @param {{ breakerA: number | null, lengthM: number, maxDrop?: number }} input
 * @returns {number | null}
 */
export function sectionForDrop({ breakerA, lengthM, maxDrop = HOUSING_CIRCUIT_MAX_DROP }) {
  if (breakerA == null || !Number.isFinite(lengthM) || lengthM <= 0 || maxDrop <= 0) return null
  const required = (2 * breakerA * lengthM * 100) / (HOUSING_CIRCUIT_GAMMA * HOUSING_CIRCUIT_VOLTAGE * maxDrop)
  return HOUSING_CIRCUIT_SECTIONS.find(section => section >= required) ?? null
}

/**
 * Drop of a circuit at the rated current of its breaker, over its length, with
 * the section adopted after checking both the table and the drop.
 *
 * @param {HousingCircuit} circuit
 * @param {number} lengthM
 * @returns {{ tableSection: number | null, requiredSection: number | null, section: number | null, dropPercent: number | null, over: boolean }}
 */
export function housingCircuitSizing(circuit, lengthM) {
  const tableSection = circuit.section
  const requiredSection = sectionForDrop({ breakerA: circuit.breakerA, lengthM })
  const section = tableSection == null
    ? null
    : Math.max(tableSection, requiredSection ?? tableSection)
  const dropPercent = section == null || circuit.breakerA == null || lengthM <= 0
    ? null
    : (2 * circuit.breakerA * lengthM * 100) / (HOUSING_CIRCUIT_GAMMA * section * HOUSING_CIRCUIT_VOLTAGE)

  return {
    tableSection,
    requiredSection,
    section,
    dropPercent,
    over: dropPercent != null && dropPercent > HOUSING_CIRCUIT_MAX_DROP,
  }
}

/**
 * Grade of a dwelling from its power step. An unknown power is treated as
 * basic, the minimum the instruction provides.
 *
 * @param {number} powerW
 * @returns {'basic' | 'elevated'}
 */
export function housingGradeFor(powerW) {
  return powerW >= 9200 ? 'elevated' : 'basic'
}

/**
 * Circuits of a dwelling with the characteristics of its grade.
 *
 * @param {number} powerW
 * @param {{ hasIrve?: boolean }} [options]
 * @returns {HousingCircuit[]}
 */
export function housingCircuitsFor(powerW, { hasIrve = false } = {}) {
  const elevated = housingGradeFor(powerW) === 'elevated'
  const rows = (elevated ? ELEVATED_CIRCUIT_IDS : BASIC_CIRCUIT_IDS).map(id => {
    if (id === 'C6' || id === 'C7') {
      const { base, name } = HOUSING_DERIVED_CIRCUITS[id]
      return { ...CIRCUITS[base], id, name }
    }
    if (id === 'C12') return { ...CIRCUITS.C3, id, ...HOUSING_DERIVED_CIRCUITS.C12, powerPerPointW: null, fs: null, fu: null, socket: '—', breakerA: null, maxPoints: null, section: null, tube: null }
    return CIRCUITS[id]
  })

  // C13 es un circuito adicional de la electrificación elevada: la básica se
  // queda en sus cinco circuitos obligatorios aunque la vivienda tenga recarga.
  return hasIrve && elevated ? [...rows, CIRCUITS.C13] : rows
}
