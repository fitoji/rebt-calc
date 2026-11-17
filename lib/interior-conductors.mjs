/**
 * Tipos de conductor de los circuitos interiores, ITC-BT-26.
 *
 * El instalador declara uno de los tres cables de la tabla en el tab Cuadros.
 * La elección se imprime en la columna «Tipo de conductor» del ELEC-3;
 * H07V-K es la opción por defecto. No es un dato que calcule el motor.
 */

/** @typedef {'H07V-U' | 'H07V-R' | 'H07V-K'} InteriorConductor */

/** @type {InteriorConductor[]} */
export const INTERIOR_CONDUCTORS = ['H07V-U', 'H07V-R', 'H07V-K']

/** @type {InteriorConductor} */
export const DEFAULT_INTERIOR_CONDUCTOR = 'H07V-K'

/**
 * Tensión nominal de aislamiento de cada tipo. La designación H07 declara
 * 450/750 V para los tres cables de la tabla ITC-BT-26.
 * @type {Record<InteriorConductor, string>}
 */
export const INTERIOR_CONDUCTOR_VOLTAGE = {
  'H07V-U': '450/750 V',
  'H07V-R': '450/750 V',
  'H07V-K': '450/750 V',
}

/**
 * Designación y tensión en un solo texto, como lo espera la hoja del ELEC-3.
 * @param {InteriorConductor} type
 */
export function interiorConductorCableType(type) {
  const voltage = INTERIOR_CONDUCTOR_VOLTAGE[type]
  return voltage == null ? type : `${type} ${voltage}`
}

/** @param {unknown} value @returns {value is InteriorConductor} */
export function isInteriorConductor(value) {
  return INTERIOR_CONDUCTORS.includes(/** @type {InteriorConductor} */ (value))
}
