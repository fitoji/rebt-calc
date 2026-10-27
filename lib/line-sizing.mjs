/**
 * Section sizing for LGA (ITC-BT-14) and DI (ITC-BT-15) lines.
 *
 * Two criteria must hold at the same time: the voltage drop at the end of the
 * line and the admissible current of the conductor, reduced by the grouping
 * factor. The final section is the smallest standard section that satisfies
 * both, so the result never hides an unmet criterion behind the next size up.
 *
 * Voltage drop is expressed as a section, which removes cos phi from the
 * formula: with I = P / (sqrt(3) * U * cos phi), the drop
 * dU = sqrt(3) * I * L * cos phi / (gamma * S) simplifies to
 * S = P * L / (gamma * U * dU) for three-phase and to
 * S = 2 * P * L / (gamma * U * dU) for single-phase.
 */

import { SECTIONS, admissibleCurrent, correctedAdmissibleCurrent, groupingFactor } from './cable-tables.mjs'

/** Rated currents of the usual circuit breakers, in amperes. */
export const PROTECTION_SERIES = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250,
]

const SYSTEMS = {
  'three-phase': { voltageFactor: 1, currentFactor: Math.sqrt(3), dropFactor: 1 },
  'single-phase': { voltageFactor: 2, currentFactor: 1, dropFactor: 2 },
}

/**
 * @typedef {object} LineInput
 * @property {'three-phase' | 'single-phase'} system
 * @property {number} powerW active power at the origin of the line
 * @property {number} voltageV line-to-line voltage (three-phase) or line-to-neutral (single-phase)
 * @property {number} cosPhi
 * @property {number} lengthM
 * @property {number} maxDropPercent
 * @property {number} gamma conductivity, m/(ohm*mm2)
 * @property {{ method: string, loadedConductors: 2 | 3, insulation: 'PVC' | 'XLPE' }} variant
 * @property {number} [circuits] circuits sharing the same conduit, default 1
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
  const reduction = groupingFactor(circuits)

  const candidates = []
  for (const section of SECTIONS) {
    const tableCurrent = admissibleCurrent(section, input.variant)
    if (tableCurrent == null) continue
    candidates.push({
      section,
      tableCurrent,
      correctedCurrent: correctedAdmissibleCurrent(section, input.variant, circuits),
      dropPercent: dropPercentAt(section, input, system),
    })
  }

  const feasible = candidates.filter(candidate =>
    candidate.section >= sectionByDrop && candidate.correctedCurrent >= ratedCurrent)

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
