/**
 * Admissible currents and correction factors for copper conductors, ITC-BT-19.
 *
 * The values live in `normative-tables.mjs`; this module keeps the derivation
 * that reads them. Everything exported here is re-exported from the data file,
 * so callers keep importing from this module as before.
 *
 * Source: Guia-BT-19 (Ministerio de Industria, Turismo y Comercio, feb 09
 * rev. 2), which reproduces the UNE 20460-5-523:2004 tables.
 */

import {
  BURIED_CABLE_SPACING,
  BURIED_TUBE_CURRENT,
  COLUMN_BY_VARIANT,
  COLUMN_VALUES,
  GROUPING_COUNTS,
  GROUPING_LAYOUTS,
  LAYER_FACTORS,
  METHODS,
  INSULATIONS,
  SECTIONS,
  TUBES_CONTACT_AIR,
  TUBES_CONTACT_BURIED,
} from './normative-tables.mjs'

export {
  BURIED_CABLE_SPACING,
  BURIED_TUBE_CURRENT,
  COLUMN_BY_VARIANT,
  COLUMN_VALUES,
  GROUPING_COUNTS,
  GROUPING_LAYOUTS,
  INSULATIONS,
  LAYER_FACTORS,
  METHODS,
  SECTIONS,
  SOIL_RESISTIVITY,
  TUBES_CONTACT_AIR,
  TUBES_CONTACT_BURIED,
} from './normative-tables.mjs'

/**
 * @param {number} section
 * @param {{ method: string, loadedConductors: 2 | 3, insulation: 'PVC' | 'XLPE' }} variant
 * @returns {number | null} admissible current, or null when the table gives no value
 */
export function admissibleCurrent(section, variant) {
  const index = SECTIONS.indexOf(section)
  if (index === -1) throw new RangeError(`Unknown nominal section: ${section} mm2`)
  const column = COLUMN_BY_VARIANT[`${variant.method}|${variant.loadedConductors}|${variant.insulation}`]
  if (column == null) {
    throw new RangeError(`Unknown installation variant: ${variant.method} ${variant.loadedConductors}x ${variant.insulation}`)
  }
  return COLUMN_VALUES[column][index]
}

/**
 * @param {number} circuits
 * @param {keyof typeof GROUPING_LAYOUTS} [layout]
 * @returns {number}
 */
export function groupingFactor(circuits, layout = 'embedded') {
  const table = GROUPING_LAYOUTS[layout]
  if (!table) throw new RangeError(`Unknown grouping layout: ${layout}`)
  if (!Number.isFinite(circuits) || circuits < 1) throw new RangeError('Circuit count must be at least 1.')

  const limit = table.cappedAtNine ? 9 : Infinity
  const counts = GROUPING_COUNTS.filter(count => count <= limit)
  const index = counts.findIndex(count => count >= circuits)
  const resolved = index === -1 ? counts.length - 1 : index
  return table.factors[resolved]
}

/**
 * @param {number} layers
 * @returns {number}
 */
export function layerFactor(layers) {
  if (!Number.isFinite(layers) || layers < 1) throw new RangeError('Layer count must be at least 1.')
  if (layers < 2) return 1
  const match = LAYER_FACTORS.find(entry => entry.layers >= layers)
  return match ? match.factor : LAYER_FACTORS[LAYER_FACTORS.length - 1].factor
}

/**
 * Combined reduction for a grouped installation, as the guide prescribes:
 * Table E times Table F when the circuits are installed in several layers.
 * @param {{ layout?: keyof typeof GROUPING_LAYOUTS, circuits?: number, layers?: number }} grouping
 * @returns {number}
 */
export function groupingReduction({ layout = 'embedded', circuits = 1, layers = 1 } = {}) {
  return groupingFactor(circuits, layout) * (layers > 1 ? layerFactor(layers) : 1)
}

/**
 * @param {number} tubes number of tubes in horizontal, 1 to 6
 * @param {number} layers number of vertical layers, 1 to 6
 * @returns {number}
 */
export function tubesContactAirFactor(tubes, layers) {
  const row = TUBES_CONTACT_AIR[Math.min(Math.max(layers, 1), 6) - 1]
  return row[Math.min(Math.max(tubes, 1), 6) - 1]
}

/**
 * @param {number} tubes number of tubes in horizontal, 2 to 6
 * @param {number} layers number of vertical layers, 1 to 6
 * @returns {number}
 */
export function tubesContactBuriedFactor(tubes, layers) {
  const row = TUBES_CONTACT_BURIED[Math.min(Math.max(tubes, 2), 6)]
  return row[Math.min(Math.max(layers, 1), 6) - 1]
}

/**
 * @param {number} cables number of buried cables, 2 to 6
 * @param {number} spacing distance between tubes in metres
 * @returns {number}
 */
export function buriedSpacingFactor(cables, spacing) {
  const row = BURIED_CABLE_SPACING.factors[Math.min(Math.max(cables, 2), 6)]
  const { spacings } = BURIED_CABLE_SPACING
  // A distance between two tabulated points takes the factor of the smaller
  // one: less separation means less admissible current, so rounding up would
  // size the cable below what the table allows.
  let index = spacings.length - 1
  for (let position = 0; position < spacings.length; position += 1) {
    if (spacings[position] > spacing) {
      index = Math.max(position - 1, 0)
      break
    }
  }
  return row[index]
}

/**
 * Admissible current for a buried tube installation.
 * @param {number} section
 * @param {{ loadedConductors: 2 | 3, material?: 'copper' | 'aluminium' }} variant
 * @returns {number | null}
 */
export function buriedAdmissibleCurrent(section, variant) {
  const index = SECTIONS.indexOf(section)
  if (index === -1) throw new RangeError(`Unknown nominal section: ${section} mm2`)
  const material = variant.material ?? 'copper'
  const row = BURIED_TUBE_CURRENT[material]?.[variant.loadedConductors]
  if (!row) throw new RangeError(`Unknown buried variant: ${material} ${variant.loadedConductors}x`)
  return row[index]
}

/**
 * Table value reduced by the grouping factor.
 * @param {number} section
 * @param {{ method: string, loadedConductors: 2 | 3, insulation: 'PVC' | 'XLPE' }} variant
 * @param {number} circuits
 * @param {keyof typeof GROUPING_LAYOUTS} [layout]
 * @returns {number | null}
 */
export function correctedAdmissibleCurrent(section, variant, circuits, layout = 'embedded') {
  const base = admissibleCurrent(section, variant)
  return base == null ? null : base * groupingFactor(circuits, layout)
}
