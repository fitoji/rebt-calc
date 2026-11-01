/**
 * Cross-sections that the instalaciones de enlace instructions tie to the
 * phase section.
 *
 * ITC-BT-14 §3 (Guía-BT-14, sep 03 rev. 1, Tabla 1) publishes the neutral
 * section per phase section, and the text adds that the neutral "tendrá una
 * sección de aproximadamente el 50 por 100 de la correspondiente al conductor
 * de fase, no siendo inferior a los valores especificados en la tabla 1".
 * ITC-BT-15 §3 makes the DI neutral equal to the phase section unless the
 * absence of unbalanced loads and harmonics is justified.
 *
 * ITC-BT-18 Tabla 2 fixes the protective conductor independently of the line.
 */

import { SECTIONS } from './cable-tables.mjs'

/** ITC-BT-14 Tabla 1, copper phase → neutral. */
const LGA_NEUTRAL_SECTION = new Map([
  [10, 10],
  [16, 10],
  [25, 16],
  [35, 16],
  [50, 25],
  [70, 35],
  [95, 50],
  [120, 70],
  [150, 70],
  [185, 95],
  [240, 120],
])

/** Smallest nominal section that is not below a value. */
function nextSectionAtLeast(value) {
  return SECTIONS.find(section => section >= value) ?? SECTIONS[SECTIONS.length - 1]
}

/**
 * Neutral section for a line general de alimentación.
 *
 * @param {number | null | undefined} phaseSection
 * @param {'copper' | 'aluminium'} [material]
 * @returns {number | null} null when there is no phase section yet
 */
export function lgaNeutralSection(phaseSection, material = 'copper') {
  if (phaseSection == null || !Number.isFinite(phaseSection) || phaseSection <= 0) return null

  // The table only splits by material at 16 mm², where aluminium keeps its
  // section because aluminium has no 10 mm² column.
  if (material === 'aluminium' && phaseSection === 16) return 16

  const tabulated = LGA_NEUTRAL_SECTION.get(phaseSection)
  if (tabulated != null) return tabulated

  // Below the table the smallest published floor applies; above it, half the
  // phase section rounded up to a nominal section.
  if (phaseSection < 10) return material === 'aluminium' ? 16 : 10
  return nextSectionAtLeast(phaseSection / 2)
}

/**
 * ITC-BT-18 Tabla 2: protective conductor cross-section.
 *
 * @param {number} phaseSection
 * @returns {number}
 */
export function protectiveSection(phaseSection) {
  if (phaseSection <= 16) return phaseSection
  if (phaseSection <= 35) return 16
  return Math.ceil(phaseSection / 2)
}
