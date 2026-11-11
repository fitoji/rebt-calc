/**
 * Housing supply data: the power steps of ITC-BT-25 tabla A and the two numbers
 * the memoria derives from them.
 *
 * The guide repeats it in one line: the power of the dwelling is what the IGA
 * admits, `P = U · I`, at 230 V single-phase. The IGA is not the ICP, so the
 * number is a design limit, not the contracted power.
 */

import { HOUSING_POWER_STEPS, HOUSING_POWER_VOLTAGE } from './normative-tables.mjs'

/** Voltage the housing steps are published at. */
export const HOUSING_VOLTAGE = HOUSING_POWER_VOLTAGE

/**
 * IGA of a housing power step, or `null` when the power is not one of the five
 * tabulated ones (a hand-edited or imported value).
 *
 * @param {number} powerW
 * @returns {number | null}
 */
export function igaForHousingPower(powerW) {
  if (!Number.isFinite(powerW)) return null
  const step = HOUSING_POWER_STEPS.find(([, watts]) => Number(watts) === powerW)
  return step ? Number(step[2]) : null
}

/**
 * Active power a general automatic switch admits, `U · IGA`.
 *
 * @param {number | null | undefined} igaA
 * @param {number} [voltageV]
 * @returns {number | null}
 */
export function maxAdmissiblePowerW(igaA, voltageV = HOUSING_VOLTAGE) {
  if (igaA == null || !Number.isFinite(igaA) || igaA <= 0) return null
  return igaA * voltageV
}
