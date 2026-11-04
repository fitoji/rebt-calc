/**
 * Power units for the interface.
 *
 * The engine, the persisted project and the JSON export always work in watts:
 * this module only converts at the edges, when a value is shown or typed. That
 * keeps one unit of record and prevents a unit switch from rewriting a project.
 */

export const POWER_UNITS = ['W', 'kW']

/** @param {unknown} value */
export function isPowerUnit(value) {
  return value === 'W' || value === 'kW'
}

/**
 * Watts as the interface shows them.
 * @param {number} watts
 * @param {'W' | 'kW'} unit
 */
export function displayPower(watts, unit) {
  const value = Number.isFinite(watts) ? watts : 0
  return unit === 'kW' ? value / 1000 : value
}

/**
 * A value typed in the chosen unit, back to the watts the engine stores.
 * @param {number} value
 * @param {'W' | 'kW'} unit
 */
export function storePower(value, unit) {
  const number = Number.isFinite(value) ? value : 0
  return unit === 'kW' ? number * 1000 : number
}

/** Decimals that make sense at each scale: whole watts, cents of a kilowatt. */
export function powerDigits(unit) {
  return unit === 'kW' ? 2 : 0
}

/**
 * The value a form field shows: the conversion rounded to the decimals of the
 * unit, so a field in kW never reads 95,316 next to a card that says 95,32 kW.
 * The stored watt only changes if the user edits the field.
 * @param {number} watts
 * @param {'W' | 'kW'} unit
 */
export function powerFieldValue(watts, unit) {
  const decimals = powerDigits(unit)
  return Number(displayPower(watts, unit).toFixed(decimals))
}

/**
 * The number alone, for a cell whose column header already carries the unit.
 * @param {number} watts
 * @param {'W' | 'kW'} unit
 */
export function formatPowerValue(watts, unit) {
  const digits = powerDigits(unit)
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(displayPower(watts, unit))
}

/**
 * `5.750 W` or `5,75 kW`, with the Spanish grouping the rest of the app uses.
 * @param {number} watts
 * @param {'W' | 'kW'} unit
 */
export function formatPower(watts, unit) {
  return `${formatPowerValue(watts, unit)} ${unit}`
}
