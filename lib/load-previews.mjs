/**
 * Per-row power previews for premises and garages.
 *
 * The totals memo and the per-row "P prevista (W)" cells must both call these
 * helpers. Keeping a second copy of the formula let the row values drift away
 * from the editable calculation settings.
 */

/**
 * @param {{ area?: number, real?: number, type?: string }} row
 * @param {{ localPowerPerM2: number, minimumSupplyPower: number, industrialPowerPerM2: number, industrialMinimumSupplyPower: number }} settings
 * @returns {number}
 */
export function previewLocalPower(row, settings) {
  const industrial = row.type === 'Industria'
  const powerPerM2 = industrial ? settings.industrialPowerPerM2 : settings.localPowerPerM2
  const minimumPower = industrial ? settings.industrialMinimumSupplyPower : settings.minimumSupplyPower

  return Math.max(
    row.real || 0,
    row.area * powerPerM2,
    row.area ? minimumPower : 0,
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
 * Density keys per lighting row and lamp type (guía técnica ITC-BT-10).
 *
 * @type {Record<'portal' | 'stair', Record<'Incandescencia' | 'Fluorescencia/LED', string>>}
 */
const LIGHTING_DENSITY_KEYS = {
  portal: { Incandescencia: 'portalLightPowerPerM2', 'Fluorescencia/LED': 'portalLightLedPowerPerM2' },
  stair: { Incandescencia: 'stairLightPowerPerM2', 'Fluorescencia/LED': 'stairLightLedPowerPerM2' },
}

/**
 * Power forecast for a common-area lighting row.
 *
 * A known installed power (W) always wins over the surface estimate. Only
 * discharge lamps (fluorescent/LED) carry the 1,8 factor; incandescent lamps
 * are taken at face value.
 *
 * @param {{ id: 'portal' | 'stair' | 'known', area?: number, lamp: 'Incandescencia' | 'Fluorescencia/LED', power?: number }} row
 * @param {{ portalLightPowerPerM2: number, portalLightLedPowerPerM2: number, stairLightPowerPerM2: number, stairLightLedPowerPerM2: number, dischargeLampCoefficient: number }} settings
 * @returns {number}
 */
export function previewLightingPower(row, settings) {
  const base = row.id === 'known'
    ? (row.power || 0)
    : (row.power > 0 ? row.power : (row.area || 0) * settings[LIGHTING_DENSITY_KEYS[row.id][row.lamp]])
  const coefficient = row.lamp === 'Incandescencia' ? 1 : settings.dischargeLampCoefficient

  return base * coefficient
}

/**
 * @param {Array<{ id: 'portal' | 'stair' | 'known', area?: number, lamp: 'Incandescencia' | 'Fluorescencia/LED', power?: number }>} rows
 * @param {{ portalLightPowerPerM2: number, portalLightLedPowerPerM2: number, stairLightPowerPerM2: number, stairLightLedPowerPerM2: number, dischargeLampCoefficient: number }} settings
 * @returns {number}
 */
export function sumLightingPowers(rows, settings) {
  return rows.reduce((total, row) => total + previewLightingPower(row, settings), 0)
}

/**
 * @param {Array<{ area?: number, real?: number, type?: string }>} rows
 * @param {{ localPowerPerM2: number, minimumSupplyPower: number, industrialPowerPerM2: number, industrialMinimumSupplyPower: number }} settings
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
