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
import { LGA_TUBE_DIAMETER } from './normative-tables.mjs'
import { maxAdmissiblePowerW } from './housing-supply.mjs'
import { lgaNeutralSection, protectiveSection } from './conductor-sections.mjs'

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
  'three-phase': { voltageFactor: 1, currentFactor: Math.sqrt(3), dropFactor: 1, currentDropFactor: Math.sqrt(3) },
  'single-phase': { voltageFactor: 2, currentFactor: 1, dropFactor: 2, currentDropFactor: 2 },
}

/**
 * Outer tube diameter the instruction ties to the phase section. Only the LGA
 * publishes one in the guides transcribed here, so the DI returns null instead
 * of guessing a value.
 */
function minimumTubeFor(role, section) {
  if (role !== 'lga' || section == null) return null
  return LGA_TUBE_DIAMETER.get(section) ?? null
}

/**
 * Conductor designation the instruction publishes for the line.
 *
 * ITC-BT-14 §3 admits only RZ1-K (AS) or DZ1-K (AS) in the LGA. The DI in air is
 * the 450/750 V ES07Z1-K of Guía-BT-15 tabla C; underground it is the
 * multiconductor RZ1-K of tabla E, which is the one the instruction asks for.
 */
function cableTypeFor(role, installation) {
  if (role === 'lga') return 'RZ1-K 0,6/1 kV'
  return installation === 'buried' ? 'RZ1-K 0,6/1 kV' : 'ES07Z1-K 450/750 V'
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
 * @property {number} [tubeDiameter] outer tube diameter the user adopted, when known
 * @property {number | null} [housingIgaA] IGA of the housing power step, for a dwelling derivation
 * @property {number | null} [sectionOverride] phase section fixed by the user. When it
 *   is present the engine keeps every criterion visible over that section instead of
 *   replacing it with the smallest compliant one, so a larger cable can be adopted and
 *   a smaller one is reported as non-compliant rather than silently ignored.
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
  /**
   * The drop criterion follows the device when the user pinned one: the training
   * material states the calculation with In (`M = 230 · In · L`), and a suggested
   * device only informs. Keeping the split means no existing automatic result
   * moves.
   */
  const fixedProtection = input.protectionA != null && input.protectionA > 0 ? input.protectionA : null

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
      dropPercentIn: fixedProtection == null ? null : dropPercentForCurrent(section, fixedProtection, input, system),
    }
    candidate.meetsMinimum = candidate.section >= minimumSection
    candidate.meetsDrop = candidate.section >= sectionByDrop
    candidate.meetsDropIn = fixedProtection == null || (candidate.dropPercentIn != null && candidate.dropPercentIn <= maxDrop)
    candidate.meetsCurrent = candidate.correctedCurrent >= ratedCurrent
    candidates.push(candidate)
  }

  const feasible = candidates.filter(candidate =>
    candidate.meetsMinimum && candidate.meetsDrop && candidate.meetsDropIn && candidate.meetsCurrent)

  const automatic = feasible[0] ?? null
  const overrideSection = input.sectionOverride != null && input.sectionOverride > 0
    ? input.sectionOverride
    : null
  const overrideCandidate = overrideSection == null
    ? null
    : candidates.find(candidate => candidate.section === overrideSection) ?? null
  const chosen = overrideCandidate ?? automatic
  const suggestedProtection = chooseProtection(ratedCurrent, chosen?.correctedCurrent ?? null)
  const protection = input.protectionA ?? suggestedProtection?.rating ?? null
  const dropPercentIn = chosen == null || protection == null
    ? null
    : dropPercentForCurrent(chosen.section, protection, input, system)
  const momentKwM = (Math.max(input.powerW, 0) / 1000) * length
  const minimumTube = minimumTubeFor(input.role, chosen?.section ?? null)
  const tubeDiameter = input.tubeDiameter != null && input.tubeDiameter > 0 ? input.tubeDiameter : null
  const cableType = cableTypeFor(input.role, input.installation ?? 'air')
  // Neutral and protective conductor as the instructions derive them, so an
  // export describes the line without the reader repeating the table rules.
  const phaseSection = chosen?.section ?? null
  const neutralSection = phaseSection == null
    ? null
    : (input.role === 'lga' ? lgaNeutralSection(phaseSection) : phaseSection)
  const sectionProtective = phaseSection == null ? null : protectiveSection(phaseSection)
  const housingIga = input.housingIgaA ?? null
  const maxAdmissiblePower = maxAdmissiblePowerW(housingIga)

  const problems = []
  if (overrideSection != null && overrideCandidate == null) {
    problems.push(`La sección fijada (${format(overrideSection)} mm²) no tiene intensidad admisible publicada para esta instalación.`)
  }
  if (overrideCandidate != null && !overrideCandidate.meetsMinimum) {
    problems.push(`La sección fijada (${format(overrideCandidate.section)} mm²) está por debajo del mínimo de ${format(minimumSection)} mm² de la instrucción.`)
  }
  if (overrideCandidate != null && !overrideCandidate.meetsCurrent) {
    problems.push(`La sección fijada (${format(overrideCandidate.section)} mm²) no admite la intensidad de línea: Iz ${format(overrideCandidate.correctedCurrent)} A es inferior a Ib ${format(ratedCurrent)} A.`)
  }
  if (!chosen) {
    const byCurrent = candidates.filter(candidate => candidate.correctedCurrent >= ratedCurrent)
    const byDrop = candidates.filter(candidate => candidate.meetsDrop && candidate.meetsDropIn)
    if (byCurrent.length === 0) {
      problems.push(`Ninguna sección de la tabla alcanza los ${format(ratedCurrent)} A con este método de instalación.`)
    }
    if (byDrop.length === 0 && fixedProtection != null) {
      problems.push(`Ninguna sección normalizada cumple la caída del ${format(maxDrop)} % con In de ${format(fixedProtection)} A.`)
    } else if (byDrop.length === 0) {
      problems.push(`Ninguna sección normalizada alcanza los ${format(sectionByDrop)} mm² que exige la caída de tensión.`)
    }
    if (problems.length === 0) {
      problems.push('Ninguna sección cumple a la vez la caída de tensión y la intensidad admisible.')
    }
  }
  if (chosen && protection != null) {
    if (protection < ratedCurrent) {
      problems.push(`La protección (${format(protection)} A) queda por debajo de la intensidad de línea (${format(ratedCurrent)} A).`)
    }
    if (protection > chosen.correctedCurrent) {
      problems.push(`La protección (${format(protection)} A) supera la intensidad admisible corregida (${format(chosen.correctedCurrent)} A).`)
    }
  }
  if (chosen && chosen.dropPercent > maxDrop) {
    problems.push(`La caída de tensión (${format(chosen.dropPercent)} %) supera el límite del ${format(maxDrop)} %.`)
  }
  if (chosen && fixedProtection != null && dropPercentIn != null && dropPercentIn > maxDrop) {
    problems.push(`La caída de tensión con In (${format(dropPercentIn)} %) supera el límite del ${format(maxDrop)} %.`)
  }
  if (chosen && minimumTube != null && tubeDiameter != null && tubeDiameter < minimumTube) {
    problems.push(`El tubo de ${format(tubeDiameter)} mm es menor que los ${format(minimumTube)} mm que la tabla 1 de la ITC-BT-14 pide para ${format(chosen.section)} mm².`)
  }
  if (maxAdmissiblePower != null && input.powerW > maxAdmissiblePower) {
    problems.push(`La potencia prevista (${format(input.powerW)} W) supera la potencia máxima admisible del IGA de ${format(housingIga)} A (${format(maxAdmissiblePower)} W).`)
  }

  return {
    sectionByDrop,
    ratedCurrent,
    groupingFactor: reduction,
    circuits,
    minimumSection,
    minimumTube,
    cableType,
    neutralSection,
    protectiveSection: sectionProtective,
    momentKwM,
    gamma,
    housingIga,
    maxAdmissiblePowerW: maxAdmissiblePower,
    candidates,
    protection,
    suggestedProtection,
    autoSection: automatic?.section ?? null,
    sectionOverride: overrideCandidate?.section ?? null,
    finalSection: chosen?.section ?? null,
    tableCurrent: chosen?.tableCurrent ?? null,
    correctedCurrent: chosen?.correctedCurrent ?? null,
    dropPercent: chosen?.dropPercent ?? null,
    dropPercentIn,
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

/**
 * Drop over a section for a known current. The power form above collapses the
 * system factor into U; with a current the factor is √3 or 2 and multiplies the
 * current, which is what the training material writes as `M = 230 · In · L`.
 *
 * @returns {number | null} null when there is no current to apply
 */
function dropPercentForCurrent(section, current, input, system) {
  if (section <= 0 || current == null || !Number.isFinite(current)) return null
  const dropVolts = (system.currentDropFactor * current * Math.max(input.cosPhi, 0.01) * Math.max(input.lengthM, 0))
    / (Math.max(input.gamma, 0.01) * section)
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
