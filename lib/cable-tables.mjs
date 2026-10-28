/**
 * Admissible currents for copper conductors - ITC-BT-19.
 *
 * Source: Guia-BT-19 (Ministerio de Industria, Turismo y Comercio, feb 09 rev. 2),
 * "Tabla A - Intensidades admisibles para cables con conductores de cobre, no
 * enterrados", which reproduces Tabla A.52-1bis of UNE 20460-5-523:2004.
 * Amperes at 40 C ambient air, non-buried installations.
 *
 * The published table is deliberately simplified: installation methods whose
 * values are practically equal share one column, so a (method, loaded
 * conductors, insulation) triple maps onto one of twelve columns. Column numbers
 * below are the ones printed in the source table (2..13) so the viewer can point
 * at the exact column of the printed document.
 */

export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630]

export const INSULATIONS = ['PVC', 'XLPE']
export const METHODS = ['A1', 'A2', 'B1', 'B2', 'C', 'E', 'F']

/**
 * Column number as printed in the source table -> admissible current per section.
 *
 * Known erratum in the source: at 400 mm2 the printed values of columns 9 and 10
 * (699 A and 645 A) break the monotonic growth seen in every other row and look
 * transposed. They are kept verbatim rather than silently corrected, and the
 * table viewer shows the same numbers as the official document.
 */
export const COLUMN_VALUES = {
  2: [11, 15, 20, 25, 34, 45, 59, null, null, null, null, null, null, null, null, null, null, null, null],
  3: [11.5, 16, 21, 27, 37, 49, 64, 77, 94, null, null, null, null, null, null, null, null, null, null],
  4: [13, 17.5, 23, 30, 40, 54, 70, 86, 103, null, null, null, null, null, null, null, null, null, null],
  5: [13.5, 18.5, 24, 32, 44, 59, 77, 96, 117, 149, 180, 208, 236, 268, 315, 361, 431, 493, 565],
  6: [15, 21, 27, 36, 50, 66, 84, 104, 125, 160, 194, 225, 260, 297, 350, 401, 480, 551, 632],
  7: [16, 22, 30, 37, 52, 70, 88, 110, 133, 171, 207, 240, 278, 317, 374, 430, 515, 592, 681],
  8: [16.5, 23, 31, 40, 54, 73, 95, 119, 145, 185, 224, 260, 299, 341, 401, 461, 552, 633, 728],
  9: [19, 26, 34, 44, 60, 81, 103, 127, 155, 199, 241, 280, 322, 368, 435, 500, 699, 687, 790],
  10: [20, 26.5, 36, 46, 65, 87, 110, 137, 167, 214, 259, 301, 343, 391, 468, 538, 645, 741, 853],
  11: [21, 29, 38, 49, 68, 91, 116, 144, 175, 224, 271, 314, 363, 415, 490, 563, 674, 774, 890],
  12: [24, 33, 45, 57, 76, 105, 123, 154, 188, 244, 296, 348, 404, 464, 552, 638, 770, 889, 1_028],
  13: [null, null, null, null, null, null, 140, 174, 210, 269, 327, 380, 438, 500, 590, 678, 812, 931, 1_071],
}

/** Printed column that each installation variant uses. */
export const COLUMN_BY_VARIANT = {
  'A1|3|PVC': 3,
  'A1|2|PVC': 4,
  'A1|3|XLPE': 6,
  'A1|2|XLPE': 7,
  'A2|3|PVC': 2,
  'A2|2|PVC': 3,
  'A2|3|XLPE': 5,
  'A2|2|XLPE': 6,
  'B1|3|PVC': 5,
  'B1|2|PVC': 6,
  'B1|3|XLPE': 8,
  'B1|2|XLPE': 10,
  'B2|3|PVC': 4,
  'B2|2|PVC': 5,
  'B2|3|XLPE': 7,
  'B2|2|XLPE': 8,
  'C|3|PVC': 6,
  'C|2|PVC': 8,
  'C|3|XLPE': 9,
  'C|2|XLPE': 11,
  'E|3|PVC': 7,
  'E|2|PVC': 9,
  'E|3|XLPE': 10,
  'E|2|XLPE': 12,
  'F|3|PVC': 8,
  'F|2|PVC': 10,
  'F|3|XLPE': 11,
  'F|2|XLPE': 13,
}

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
 * Thermal resistivity of the ground by terrain type, Guia-BT-19 Table C.
 * Used to state the reference condition of the buried table, which assumes 1.5 K.m/W.
 */
export const SOIL_RESISTIVITY = [
  { terrain: 'Inundado', value: 0.4 },
  { terrain: 'Muy humedo', value: 0.5 },
  { terrain: 'Humedo', value: 0.7 },
  { terrain: 'Poco humedo', value: 0.85 },
  { terrain: 'Seco', value: 1.0 },
  { terrain: 'Arcilloso muy seco', value: 1.2 },
  { terrain: 'Arenoso muy seco', value: 1.5 },
  { terrain: 'De piedra arenisca', value: 2.0 },
  { terrain: 'De piedra caliza', value: 2.5 },
]

/**
 * Buried under tube, Guia-BT-19 Table D. Reference conditions: soil thermal
 * resistivity 1.5 K.m/W, ground temperature 25 C, burial depth 70 cm.
 * Only XLPE insulation is tabulated.
 */
export const BURIED_TUBE_CURRENT = {
  copper: {
    3: [23, 30, 39, 48, 64, 82, 105, 130, 155, 190, 225, 260, 300, 335, 400, 455, 530, 610, 710],
    2: [27, 36, 46, 58, 77, 100, 130, 155, 183, 225, 265, 305, 340, 385, 440, 500, 570, 660, 735],
  },
  aluminium: {
    3: [null, 23, 30, 37, 49, 62, 82, 98, 115, 145, 175, 200, 230, 260, 305, 350, 405, 465, 530],
    2: [null, 27, 36, 44, 58, 77, 98, 120, 139, 170, 205, 230, 265, 295, 340, 385, 445, 510, 575],
  },
}

/** Circuit counts tabulated by the grouping tables. */
export const GROUPING_COUNTS = [1, 2, 3, 4, 6, 9, 12, 16, 20]

/**
 * Grouping of several circuits, Guia-BT-19 Table E (UNE 20460-5-523 Table A.52-3).
 * Rows 2 to 5 are only tabulated up to 9 circuits: beyond that the published
 * table states that no additional reduction applies, so the 9-circuit value holds.
 */
export const GROUPING_LAYOUTS = {
  embedded: {
    label: 'Empotrados o embutidos',
    factors: [1, 0.8, 0.7, 0.7, 0.55, 0.5, 0.45, 0.4, 0.4],
    cappedAtNine: false,
  },
  'single-layer-wall': {
    label: 'Capa unica sobre pared, suelo o superficie sin perforar',
    factors: [1, 0.85, 0.8, 0.75, 0.7, 0.7],
    cappedAtNine: true,
  },
  'single-layer-ceiling': {
    label: 'Capa unica fijada bajo techo',
    factors: [0.95, 0.8, 0.7, 0.7, 0.65, 0.6],
    cappedAtNine: true,
  },
  'perforated-tray': {
    label: 'Capa unica en bandeja perforada vertical u horizontal',
    factors: [1, 0.9, 0.8, 0.75, 0.75, 0.7],
    cappedAtNine: true,
  },
  'ladder-tray': {
    label: 'Capa unica con apoyo de bandeja escalera o abrazaderas',
    factors: [1, 0.85, 0.8, 0.8, 0.8, 0.8],
    cappedAtNine: true,
  },
}

/** Additional factor for cables installed in several layers, Guia-BT-19 Table F. */
export const LAYER_FACTORS = [
  { layers: 2, factor: 0.8 },
  { layers: 3, factor: 0.73 },
  { layers: 5, factor: 0.7 },
  { layers: 8, factor: 0.68 },
  { layers: 9, factor: 0.66 },
]

/**
 * Tubes in contact, horizontal, installed in air, Guia-BT-19 Table G.
 * Rows are the number of vertical layers, columns the number of tubes in
 * horizontal, from 1 to 6.
 */
export const TUBES_CONTACT_AIR = [
  [1.0, 0.94, 0.91, 0.88, 0.87, 0.86],
  [0.92, 0.87, 0.84, 0.81, 0.8, 0.79],
  [0.85, 0.81, 0.78, 0.76, 0.75, 0.74],
  [0.82, 0.78, 0.74, 0.73, 0.72, 0.72],
  [0.8, 0.76, 0.72, 0.71, 0.7, 0.7],
  [0.79, 0.75, 0.71, 0.7, 0.69, 0.68],
]

/**
 * Multiconductor cables in buried tubes, one cable per tube, Guia-BT-19 Table H.
 * Columns are the distance between tubes: in contact, 0.25 m, 0.50 m and 1.0 m.
 */
export const BURIED_CABLE_SPACING = {
  spacings: [0, 0.25, 0.5, 1.0],
  factors: {
    2: [0.85, 0.9, 0.95, 0.95],
    3: [0.75, 0.85, 0.9, 0.95],
    4: [0.7, 0.8, 0.85, 0.9],
    5: [0.65, 0.8, 0.85, 0.9],
    6: [0.6, 0.8, 0.8, 0.9],
  },
}

/**
 * Tubes in contact, buried or embedded in concrete, several layers,
 * Guia-BT-19 Table I. Rows are the number of tubes in horizontal (2 to 6),
 * columns the number of vertical layers (1 to 6).
 */
export const TUBES_CONTACT_BURIED = {
  2: [0.87, 0.71, 0.62, 0.57, 0.53, 0.5],
  3: [0.77, 0.62, 0.53, 0.48, 0.45, 0.42],
  4: [0.72, 0.57, 0.48, 0.44, 0.4, 0.38],
  5: [0.68, 0.53, 0.45, 0.4, 0.37, 0.35],
  6: [0.65, 0.5, 0.42, 0.38, 0.35, 0.32],
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
  let index = BURIED_CABLE_SPACING.spacings.findIndex(value => value >= spacing)
  if (index === -1) index = BURIED_CABLE_SPACING.spacings.length - 1
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
