/**
 * Per-row power previews for premises and garages.
 *
 * The totals memo and the per-row "P prevista (W)" cells must both call these
 * helpers. Keeping a second copy of the formula let the row values drift away
 * from the editable calculation settings.
 */

/**
 * @param {{ area?: number, real?: number }} row
 * @param {{ localPowerPerM2: number, minimumSupplyPower: number }} settings
 * @returns {number}
 */
export function previewLocalPower(row, settings) {
  return Math.max(
    row.real || 0,
    row.area * settings.localPowerPerM2,
    row.area ? settings.minimumSupplyPower : 0,
  )
}

/**
 * @param {{ area?: number, ventilation?: string }} row
 * @param {{ forcedGaragePowerPerM2: number, naturalGaragePowerPerM2: number, minimumSupplyPower: number }} settings
 * @returns {number}
 */
export function previewGaragePower(row, settings) {
  const powerPerSquareMeter = row.ventilation === 'Forzada'
    ? settings.forcedGaragePowerPerM2
    : settings.naturalGaragePowerPerM2

  return Math.max(row.area * powerPerSquareMeter, row.area ? settings.minimumSupplyPower : 0)
}

/**
 * @param {Array<{ area?: number, real?: number }>} rows
 * @param {{ localPowerPerM2: number, minimumSupplyPower: number }} settings
 * @returns {number}
 */
export function sumLocalPowers(rows, settings) {
  return rows.reduce((total, row) => total + previewLocalPower(row, settings), 0)
}

/**
 * @param {Array<{ area?: number, ventilation?: string }>} rows
 * @param {{ forcedGaragePowerPerM2: number, naturalGaragePowerPerM2: number, minimumSupplyPower: number }} settings
 * @returns {number}
 */
export function sumGaragePowers(rows, settings) {
  return rows.reduce((total, row) => total + previewGaragePower(row, settings), 0)
}
