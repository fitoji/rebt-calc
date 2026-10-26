export const ITC_BT_10_COEFFICIENTS = [
  0, 1, 2, 3, 3.8, 4.6, 5.4, 6.2, 7, 7.8, 8.5,
  9.2, 9.9, 10.6, 11.3, 11.9, 12.5, 13.1, 13.7, 14.3, 14.8, 15.3,
]

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
