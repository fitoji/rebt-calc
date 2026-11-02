/**
 * Admissible currents that the instalaciones de enlace guides publish for the
 * two lines this app sizes, and the lookup that picks one.
 *
 * The transcribed values live in `normative-tables.mjs`, next to every other
 * table the calculator consults. This module keeps only the selection rule and
 * re-exports the two constants callers already import.
 *
 * Why a separate table set exists, and which document each one comes from, is
 * documented in the data file under the ITC-BT-14 / ITC-BT-15 group.
 */

import {
  BT14_AIR_ALUMINIUM,
  BT14_AIR_COPPER,
  BT14_BURIED_ALUMINIUM,
  BT14_BURIED_COPPER,
  BT15_C_SINGLE,
  BT15_C_THREE,
  BT15_D_AIR_SINGLE,
  BT15_D_AIR_THREE,
  BT15_E_BURIED_SINGLE,
  BT15_E_BURIED_THREE,
  SECTIONS_DI,
  SECTIONS_LGA,
} from './normative-tables.mjs'

export { BT14_NEUTRAL_ROWS, GUIDE_TABLES } from './normative-tables.mjs'

function pick(values, sections, section) {
  const index = sections.indexOf(section)
  if (index === -1) return null
  return values[index] ?? null
}

/**
 * Admissible current the guide publishes for this line, or `null` when the
 * guide does not tabulate that combination and the caller must fall back to
 * the ITC-BT-19 tables.
 *
 * @param {{ role: 'lga' | 'di', system: 'three-phase' | 'single-phase', insulation: 'PVC' | 'XLPE',
 *   installation?: 'air' | 'buried', method?: string, material?: 'copper' | 'aluminium', section: number }} input
 * @returns {number | null}
 */
export function guideAdmissibleCurrent(input) {
  const { role, system, insulation, section } = input
  const installation = input.installation ?? 'air'
  const method = input.method ?? 'B1'
  const material = input.material ?? 'copper'

  if (role === 'lga') {
    // Tabla A/B are method B (tube, surface or channel) and three loaded
    // conductors; a single-phase LGA is not tabulated by the guide.
    if (method !== 'B1' || system !== 'three-phase') return null
    if (material === 'aluminium') {
      return installation === 'buried'
        ? pick(BT14_BURIED_ALUMINIUM, SECTIONS_LGA.slice(1), section)
        : pick(BT14_AIR_ALUMINIUM, SECTIONS_LGA.slice(1), section)
    }
    return installation === 'buried'
      ? pick(BT14_BURIED_COPPER, SECTIONS_LGA, section)
      : pick(BT14_AIR_COPPER, SECTIONS_LGA, section)
  }

  const three = system === 'three-phase'
  if (installation === 'buried') {
    // The guide routes buried DI through multiconductor RZ1-K (tabla E).
    return three
      ? pick(BT15_E_BURIED_THREE, SECTIONS_DI, section)
      : pick(BT15_E_BURIED_SINGLE, SECTIONS_DI, section)
  }
  if (method !== 'B1') return null
  if (insulation === 'PVC') {
    return three
      ? pick(BT15_C_THREE, SECTIONS_DI, section)
      : pick(BT15_C_SINGLE, SECTIONS_DI, section)
  }
  return three
    ? pick(BT15_D_AIR_THREE, SECTIONS_DI, section)
    : pick(BT15_D_AIR_SINGLE, SECTIONS_DI, section)
}
