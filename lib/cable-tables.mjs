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
 * Grouping reduction factor, ITC-BT-19 Table E (UNE 20460-5-523 Table A.52-3),
 * row 1: circuits embedded or sunk in thermally insulating walls. The published
 * table has no value for 5, 7, 8, 10, 11 or 13..15 circuits, so the next
 * tabulated count applies.
 */
export const GROUPING_FACTORS = [
  { circuits: 1, factor: 1 },
  { circuits: 2, factor: 0.8 },
  { circuits: 3, factor: 0.7 },
  { circuits: 4, factor: 0.7 },
  { circuits: 6, factor: 0.55 },
  { circuits: 9, factor: 0.5 },
  { circuits: 12, factor: 0.45 },
  { circuits: 16, factor: 0.4 },
  { circuits: 20, factor: 0.4 },
]

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
 * @returns {number}
 */
export function groupingFactor(circuits) {
  if (!Number.isFinite(circuits) || circuits < 1) throw new RangeError('Circuit count must be at least 1.')
  const match = GROUPING_FACTORS.find(entry => entry.circuits >= circuits)
  return match ? match.factor : GROUPING_FACTORS[GROUPING_FACTORS.length - 1].factor
}

/**
 * Table value reduced by the grouping factor.
 * @param {number} section
 * @param {{ method: string, loadedConductors: 2 | 3, insulation: 'PVC' | 'XLPE' }} variant
 * @param {number} circuits
 * @returns {number | null}
 */
export function correctedAdmissibleCurrent(section, variant, circuits) {
  const base = admissibleCurrent(section, variant)
  return base == null ? null : base * groupingFactor(circuits)
}
