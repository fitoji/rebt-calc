/**
 * Minimum section of the polar conductors, as the two instructions prescribe.
 *
 * ITC-BT-14 §3 (LGA): "La sección mínima será de 10 mm2 en cobre o 16 mm2 en
 * aluminio." ITC-BT-15 §3 (DI): "La sección mínima será de 6 mm2 para los
 * cables polares, neutro y protección". Neither depends on the system, so the
 * floor follows the line role and the conductor material.
 */
const MINIMUM_SECTION = {
  lga: { copper: 10, aluminium: 16 },
  di: { copper: 6, aluminium: 6 },
}

function minimumSectionFor(input) {
  const byMaterial = MINIMUM_SECTION[input.role]
  if (!byMaterial) throw new RangeError(`Unknown line role: ${input.role}`)
  return byMaterial[input.material === 'aluminium' ? 'aluminium' : 'copper']
}

/**
 * Section sizing for the LGA (ITC-BT-14) and the individual derivations
 * (ITC-BT-15).
 *
 * Two criteria must hold at the same time: the voltage drop at the end of the
 * line and the admissible current of the conductor, reduced by the grouping
 * factor. The final section is the smallest standard section that satisfies
 * both and the role's minimum, so the result never hides an unmet criterion
 * behind the next size up.
 *
 * Voltage drop is expressed as a section, which removes cos phi from the
 * formula: with I = P / (sqrt(3) * U * cos phi), the drop
 * dU = sqrt(3) * I * L * cos phi / (gamma * S) simplifies to
 * S = P * L / (gamma * U * dU) for three-phase and to
 * S = 2 * P * L / (gamma * U * dU) for single-phase.
 */

import {
  SECTIONS,
  admissibleCurrent,
  buriedAdmissibleCurrent,
  buriedSpacingFactor,
  groupingReduction,
  tubesContactAirFactor,
  tubesContactBuriedFactor,
} from './cable-tables.mjs'
import { guideAdmissibleCurrent } from './guide-tables.mjs'

/** Rated currents of the usual circuit breakers, in amperes. */
export const PROTECTION_SERIES = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250,
]

/**
 * Admissible current of a section for the installation being sized.
 *
 * ITC-BT-14 and ITC-BT-15 publish their own tables for the cable families the
 * LGA and the DI may use, so those are consulted first. When the guide does not
 * tabulate the combination (a method other than B, a single-phase LGA, a
 * section outside the published range) the ITC-BT-19 tables apply: buried
 * lines from table D, everything else from table A.
 */
function baseCurrent(section, input) {
  const fromGuide = guideAdmissibleCurrent({
    role: input.role,
    system: input.system,
    insulation: input.variant.insulation,
    installation: input.installation,
    method: input.variant.method,
    material: input.material,
    section,
  })
  if (fromGuide != null) return fromGuide

  if (input.installation === 'buried') {
    return buriedAdmissibleCurrent(section, {
      loadedConductors: input.variant.loadedConductors,
      material: input.material ?? 'copper',
    })
  }
  return admissibleCurrent(section, input.variant)
}

/**
 * Reduction applied to the table value. The grouping family follows the
 * installation: circuits in air use Table E (times Table F for several layers),
 * tubes in contact use Table G or I, and buried cables use Table H.
 */
export function reductionFor(input) {
  const grouping = input.grouping ?? {}
  if (grouping.kind === 'tubes-air') return tubesContactAirFactor(grouping.tubes ?? 1, grouping.layers ?? 1)
  if (grouping.kind === 'tubes-buried') return tubesContactBuriedFactor(grouping.tubes ?? 2, grouping.layers ?? 1)
  if (grouping.kind === 'buried-cables') return buriedSpacingFactor(grouping.cables ?? 1, grouping.spacing ?? 0)
  return groupingReduction({
    layout: grouping.layout ?? input.layout ?? 'embedded',
    circuits: grouping.circuits ?? input.circuits ?? 1,
    layers: grouping.layers ?? input.layers ?? 1,
  })
}

const SYSTEMS = {
  'three-phase': { voltageFactor: 1, currentFactor: Math.sqrt(3), dropFactor: 1 },
  'single-phase': { voltageFactor: 2, currentFactor: 1, dropFactor: 2 },
}

/**
 * @typedef {object} LineInput
 * @property {'lga' | 'di'} role which instruction governs the minimum section
 * @property {'three-phase' | 'single-phase'} system
 * @property {number} powerW active power at the origin of the line
 * @property {number} voltageV line-to-line voltage (three-phase) or line-to-neutral (single-phase)
 * @property {number} cosPhi
 * @property {number} lengthM
 * @property {number} maxDropPercent
 * @property {number} gamma conductivity, m/(ohm*mm2)
 * @property {{ method: string, loadedConductors: 2 | 3, insulation: 'PVC' | 'XLPE' }} variant
 * @property {'air' | 'buried'} [installation] defaults to air
 * @property {'copper' | 'aluminium'} [material] only used for buried installations
 * @property {number} [circuits] circuits sharing the same conduit, default 1
 * @property {number} [layers] vertical layers, default 1
 * @property {string} [layout] Table E disposition, default embedded
 * @property {object} [grouping] explicit grouping selection (tubes or buried spacing)
 * @property {number | null} [protectionA] rated current of the chosen breaker, when already known
 */

/**
 * @param {LineInput} input
 */
export function sizeLine(input) {
  const system = SYSTEMS[input.system]
  if (!system) throw new RangeError(`Unknown system: ${input.system}`)

  const cosPhi = Math.max(input.cosPhi, 0.01)
  const voltage = Math.max(input.voltageV, 1)
  const length = Math.max(input.lengthM, 0)
  const maxDrop = Math.max(input.maxDropPercent, 0.01)
  const gamma = Math.max(input.gamma, 0.01)
  const circuits = input.circuits ?? 1

  const dropVoltLimit = voltage * (maxDrop / 100)
  const sectionByDrop = (system.voltageFactor * Math.max(input.powerW, 0) * length)
    / (gamma * voltage * dropVoltLimit)
  const ratedCurrent = Math.max(input.powerW, 0) / (system.currentFactor * voltage * cosPhi)
  const reduction = reductionFor({ ...input, circuits })

  const candidates = []
  const minimumSection = minimumSectionFor(input)
  for (const section of SECTIONS) {
    const tableCurrent = baseCurrent(section, input)
    if (tableCurrent == null) continue
    const candidate = {
      section,
      tableCurrent,
      correctedCurrent: tableCurrent * reduction,
      dropPercent: dropPercentAt(section, input, system),
    }
    candidate.meetsMinimum = candidate.section >= minimumSection
    candidate.meetsDrop = candidate.section >= sectionByDrop
    candidate.meetsCurrent = candidate.correctedCurrent >= ratedCurrent
    candidates.push(candidate)
  }

  const feasible = candidates.filter(candidate =>
    candidate.meetsMinimum && candidate.meetsDrop && candidate.meetsCurrent)

  const chosen = feasible[0] ?? null
  const suggestedProtection = chooseProtection(ratedCurrent, chosen?.correctedCurrent ?? null)
  const protection = input.protectionA ?? suggestedProtection?.rating ?? null

  const problems = []
  if (!chosen) {
    const byCurrent = candidates.filter(candidate => candidate.correctedCurrent >= ratedCurrent)
    const byDrop = candidates.filter(candidate => candidate.section >= sectionByDrop)
    if (byCurrent.length === 0) {
      problems.push(`No admissible current in the table reaches ${format(ratedCurrent)} A for this installation method.`)
    }
    if (byDrop.length === 0) {
      problems.push(`No nominal section reaches the ${format(sectionByDrop)} mm2 required by the voltage drop.`)
    }
    if (problems.length === 0) {
      problems.push('No single section satisfies both the voltage drop and the admissible current.')
    }
  }
  if (chosen && protection != null) {
    if (protection < ratedCurrent) {
      problems.push(`The breaker (${format(protection)} A) is below the line current (${format(ratedCurrent)} A).`)
    }
    if (protection > chosen.correctedCurrent) {
      problems.push(`The breaker (${format(protection)} A) exceeds the corrected admissible current (${format(chosen.correctedCurrent)} A).`)
    }
  }
  if (chosen && chosen.dropPercent > maxDrop) {
    problems.push(`The voltage drop (${chosen.dropPercent.toFixed(2)} %) exceeds the ${maxDrop} % limit.`)
  }

  return {
    sectionByDrop,
    ratedCurrent,
    groupingFactor: reduction,
    circuits,
    minimumSection,
    candidates,
    protection,
    suggestedProtection,
    finalSection: chosen?.section ?? null,
    tableCurrent: chosen?.tableCurrent ?? null,
    correctedCurrent: chosen?.correctedCurrent ?? null,
    dropPercent: chosen?.dropPercent ?? null,
    dropVoltLimit,
    ok: chosen != null && problems.length === 0,
    problems,
  }
}

function dropPercentAt(section, input, system) {
  if (section <= 0) return 0
  const dropVolts = (system.dropFactor * Math.max(input.powerW, 0) * Math.max(input.lengthM, 0))
    / (Math.max(input.gamma, 0.01) * section * Math.max(input.voltageV, 1))
  return (dropVolts / Math.max(input.voltageV, 1)) * 100
}

function chooseProtection(ratedCurrent, admissible) {
  if (admissible == null) return null
  const rating = PROTECTION_SERIES.find(value => value >= ratedCurrent && value <= admissible)
  if (rating == null) return null
  return { rating, admissible }
}

function format(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)
}
