/**
 * Enlace configurations and the voltage-drop limits the REBT ties to each one.
 *
 * ITC-BT-14 §3 and ITC-BT-15 §3 do not give a single limit per line: the limit
 * depends on how the meters are arranged. Keeping that pairing in one table
 * stops a project default from becoming a regulatory mistake.
 */

/**
 * @typedef {'centralized' | 'partial' | 'single-user'} InstallationType
 * @typedef {{ id: InstallationType, label: string, lga: number | null, di: number }} InstallationScenario
 */

/** @type {InstallationScenario[]} */
export const INSTALLATION_SCENARIOS = [
  { id: 'centralized', label: 'Contadores totalmente centralizados', lga: 0.5, di: 1 },
  { id: 'partial', label: 'Contadores en más de un lugar', lga: 1, di: 0.5 },
  { id: 'single-user', label: 'Único usuario sin LGA', lga: null, di: 1.5 },
]

/**
 * Limits for one scenario. `lga` is null when the installation has no LGA.
 *
 * @param {InstallationType} type
 * @returns {{ lga: number | null, di: number }}
 */
export function limitsForInstallation(type) {
  const scenario = INSTALLATION_SCENARIOS.find(entry => entry.id === type)
  if (!scenario) throw new RangeError(`Unknown installation type: ${type}`)

  return { lga: scenario.lga, di: scenario.di }
}

/**
 * Whether a configured drop differs from the scenario limit.
 *
 * @param {number | null} limit
 * @param {number} configured
 * @returns {boolean}
 */
export function mismatchesLimit(limit, configured) {
  return limit != null && Math.abs(limit - configured) > 0.001
}
