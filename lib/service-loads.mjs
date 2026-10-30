/**
 * P2 – Servicios generales (ITC-BT-10 e ITC-BT-47).
 *
 * Rules applied:
 * - Elevators: 1,3 × the nominal motor power (ITC-BT-10).
 * - Motors and other loads: nominal power, with no simultaneity reduction.
 * - Only the largest motor adds an extra (coefficient − 1) of its own power,
 *   which is the 25 % step required by ITC-BT-47.
 * - Common-area lighting carries its own 1,8 factor for discharge lamps and is
 *   passed in already resolved, so it is never multiplied again here.
 */

/** ITA elevator types from ITC-BT-10, reference motor power in kW. */
export const ITA_POWER_KW = {
  'ITA-1': 4.5,
  'ITA-2': 7.5,
  'ITA-3': 11.5,
  'ITA-4': 18.5,
  'ITA-5': 29.5,
  'ITA-6': 46,
}

/**
 * Reference motor power for an ITA type, in watts.
 *
 * @param {keyof typeof ITA_POWER_KW} ita
 * @returns {number}
 */
export function itaPowerW(ita) {
  return (ITA_POWER_KW[ita] ?? 0) * 1000
}

/**
 * Extra power added by the largest motor.
 *
 * @param {number[]} motorPowers nominal power of every motor, in W
 * @param {number} coefficient coefficient of the largest motor (1,25 by default)
 * @returns {number}
 */
export function largestMotorIncrement(motorPowers, coefficient) {
  const largest = motorPowers.reduce((max, power) => Math.max(max, power || 0), 0)

  return Math.max(0, coefficient - 1) * largest
}

/**
 * P2 total for the building services block.
 *
 * @param {{ elevatorPower: number, motorPowers: number[], otherPower: number, lightingPower: number }} loads
 * @param {{ elevatorCoefficient: number, motorCoefficient: number }} settings
 * @returns {number}
 */
export function sumServiceGeneralPowers({ elevatorPower, motorPowers, otherPower, lightingPower }, settings) {
  const motorPower = motorPowers.reduce((sum, power) => sum + Math.max(0, power || 0), 0)

  return elevatorPower * settings.elevatorCoefficient
    + motorPower
    + largestMotorIncrement(motorPowers, settings.motorCoefficient)
    + Math.max(0, otherPower || 0)
    + Math.max(0, lightingPower || 0)
}
