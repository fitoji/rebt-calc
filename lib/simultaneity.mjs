/**
 * Simultaneity coefficient for the number of dwellings, ITC-BT-10.
 *
 * The table lives in `normative-tables.mjs`; this module keeps the extension
 * beyond the last tabulated row.
 */

import { ITC_BT_10_COEFFICIENTS } from './normative-tables.mjs'

export { ITC_BT_10_COEFFICIENTS } from './normative-tables.mjs'

/**
 * @param {number} dwellingCount
 * @returns {number}
 */
export function getSimultaneityCoefficient(dwellingCount) {
  if (!Number.isInteger(dwellingCount) || dwellingCount < 0) {
    throw new RangeError('The number of dwellings must be a non-negative integer.')
  }

  if (dwellingCount === 0) return 0
  if (dwellingCount <= 21) return ITC_BT_10_COEFFICIENTS[dwellingCount]

  return 15.3 + (dwellingCount - 21) * 0.5
}
