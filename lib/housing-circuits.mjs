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
 *   note?: string,
 *   baseId?: string
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
  // C4.1/C4.2/C4.3 are independent branches of the published C4 row: they keep
  // its power per point, including a manual override typed on C4.
  const baseId = typeof circuitId === 'string' && /^C4\.\d+$/.test(circuitId) ? 'C4' : circuitId
  const circuit = CIRCUITS[baseId]
  if (circuit == null) return null
  if (circuit.powerPerPointW != null) return circuit.powerPerPointW

  const source = circuitPowerOverride != null && typeof circuitPowerOverride === 'object' ? circuitPowerOverride : {}
  const key = Object.hasOwn(source, circuitId) ? circuitId : baseId
  const value = source[key]
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
 * Factor de simultaneidad o de uso de un circuito. La tabla 1 deja fs y fu en
 * blanco cuando no hay reducción: el coeficiente que se aplica entonces es 1.
 *
 * @param {number | null | undefined} value
 * @returns {number}
 */
export function housingCircuitFactor(value) {
  return value ?? 1
}

/**
 * Potencia prevista de un circuito: P/toma · puntos · fs · fu.
 *
 * Sin P/toma no hay previsión, pero un factor no publicado vale 1 y no anula
 * la fila: C8, C9, C11, C13 y el derivado C12 se calculan con sus factores en 1.
 *
 * @param {{ powerPerPointW: number | null, points: number, fs: number | null, fu: number | null }} circuit
 * @returns {number | null}
 */
export function housingCircuitForecastW({ powerPerPointW, points, fs, fu }) {
  if (powerPerPointW == null) return null
  if (![powerPerPointW, points].every(Number.isFinite)) return null
  return powerPerPointW * points * housingCircuitFactor(fs) * housingCircuitFactor(fu)
}

/**
 * Carga simultánea que la hoja 1 del ELEC-3 pide para cada circuito, en %.
 * Es el producto de los coeficientes de simultaneidad y de uso; un factor no
 * publicado vale 1, así que esos circuitos salen al 100 %.
 *
 * @param {{ fs: number | null, fu: number | null }} circuit
 * @returns {number}
 */
export function housingCircuitSimultaneityPercent({ fs, fu }) {
  return housingCircuitFactor(fs) * housingCircuitFactor(fu) * 100
}

/** Intensidad de cálculo (Ib) de un circuito a la tensión de la tabla 1. */
export function housingCircuitIb(forecastW) {
  return forecastW == null || !Number.isFinite(forecastW) ? null : forecastW / HOUSING_CIRCUIT_VOLTAGE
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
 * Appliances of C4 and the three possible pairings for a two-circuit split.
 * ITC-BT-25 table 1 note (8) recommends two or three independent circuits but
 * does not prescribe which two appliances share one, so the project decides.
 */
export const C4_APPLIANCES = [
  { key: 'lavadora', name: 'Lavadora' },
  { key: 'lavavajillas', name: 'Lavavajillas' },
  { key: 'termo', name: 'Termo eléctrico' },
]

/** @type {Array<{ key: string, keys: string[], name: string }>} */
export const C4_PAIRS = [
  { key: 'lavadora-lavavajillas', keys: ['lavadora', 'lavavajillas'], name: 'Lavadora y lavavajillas' },
  { key: 'lavadora-termo', keys: ['lavadora', 'termo'], name: 'Lavadora y termo' },
  { key: 'lavavajillas-termo', keys: ['lavavajillas', 'termo'], name: 'Lavavajillas y termo' },
]

export const C4_MODES = [1, 2, 3]

/**
 * C4 split as stored by the project. Invalid values fall back to the single
 * published circuit, so an old project or a bad import never changes the grade.
 *
 * @param {Record<string, any> | null | undefined} [options]
 */
export function resolveC4Split({ c4Mode = 1, c4Pair } = {}) {
  const mode = C4_MODES.includes(c4Mode) ? c4Mode : 1
  const pair = C4_PAIRS.find(entry => entry.key === c4Pair)?.key ?? C4_PAIRS[0].key
  return { c4Mode: mode, c4Pair: pair }
}

/**
 * Independent C4 circuits. Note (8) fixes a 16 A breaker per circuit and
 * removes the fuses at the sockets; it does not publish a section, so the
 * branch uses 2,5 mm² (ITC-BT-19 for 16 A, and note (6) for individual C4
 * outlets) and the drop check still applies through `housingCircuitSizing`.
 */
export function c4Branches(c4Mode, c4Pair) {
  const { c4Mode: mode, c4Pair: pairKey } = resolveC4Split({ c4Mode, c4Pair })
  const base = CIRCUITS.C4
  const note = 'ITC-BT-25 tabla 1, nota (8): circuitos independientes por aparato con interruptor automático de 16 A; sin diferencial adicional.'
  const build = (id, name, maxPoints) => ({
    ...base,
    id,
    name,
    socket: 'Base 16 A 2p+T',
    breakerA: 16,
    section: 2.5,
    tube: 20,
    maxPoints,
    baseId: 'C4',
    note,
  })
  if (mode === 1) return [base]
  if (mode === 3) return C4_APPLIANCES.map((appliance, index) => build(`C4.${index + 1}`, appliance.name, 1))
  const pair = C4_PAIRS.find(entry => entry.key === pairKey)
  const single = C4_APPLIANCES.find(appliance => !pair.keys.includes(appliance.key))
  return [build('C4.1', pair.name, 2), build('C4.2', single.name, 1)]
}

/**
 * Length declared for a circuit. A C4 branch with no own length inherits the
 * one typed on C4, so switching modes never discards the project's measurement.
 *
 * @param {Record<string, number> | null | undefined} lengths
 * @param {HousingCircuit} circuit
 * @returns {number}
 */
export function housingCircuitLength(lengths, circuit) {
  const source = lengths ?? {}
  const own = source[circuit.id]
  if (typeof own === 'number' && Number.isFinite(own)) return own
  const base = circuit.baseId == null ? undefined : source[circuit.baseId]
  return typeof base === 'number' && Number.isFinite(base) ? base : 0
}

/**
 * C4 points distributed across its branches. Splitting a circuit never adds
 * points: the three outlets of table 2 are the same three, now on 2 or 3
 * breakers. The simultaneity factors stay those of C4.
 *
 * @returns {Record<string, number>} circuit id → points
 */
export function c4BranchPoints(totalPoints, c4Mode, c4Pair) {
  const branches = c4Branches(c4Mode, c4Pair)
  if (branches.length === 1) return { C4: Math.max(0, Math.round(totalPoints)) }
  const result = {}
  let remaining = Math.max(0, Math.round(totalPoints))
  for (const branch of branches) {
    const count = Math.min(branch.maxPoints, remaining)
    result[branch.id] = count
    remaining -= count
  }
  return result
}

/**
 * Circuits of a dwelling with the characteristics of its grade.
 *
 * @param {number} powerW
 * @param {{ hasIrve?: boolean, c4Mode?: number, c4Pair?: string }} [options]
 * @returns {HousingCircuit[]}
 */
export function housingCircuitsFor(powerW, { hasIrve = false, c4Mode = 1, c4Pair } = {}) {
  const elevated = housingGradeFor(powerW) === 'elevated'
  const rows = (elevated ? ELEVATED_CIRCUIT_IDS : BASIC_CIRCUIT_IDS).flatMap(id => {
    if (id === 'C4') return c4Branches(c4Mode, c4Pair)
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
