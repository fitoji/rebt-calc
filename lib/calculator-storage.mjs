export const CALCULATOR_INPUTS_STORAGE_KEY = 'electrocalc-inputs:v1'

const PROJECT_INFO_STORAGE_KEY = 'electrocalc-project-info'

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @param {unknown} value */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/** @param {unknown} value */
function isHousingRow(value) {
  return isRecord(value)
    && (value.level === 'Básica' || value.level === 'Elevada')
    && isFiniteNumber(value.power)
    && Number.isInteger(value.homes)
    && value.homes >= 0
}

/** @param {unknown} value */
function isLocalRow(value) {
  return isRecord(value)
    && typeof value.name === 'string'
    && (value.type === 'Comercial/oficina' || value.type === 'Industria')
    && isFiniteNumber(value.area)
    && isFiniteNumber(value.real)
}

/** @param {unknown} value */
function isGarageRow(value) {
  return isRecord(value)
    && typeof value.name === 'string'
    && (value.ventilation === 'Forzada' || value.ventilation === 'Natural')
    && isFiniteNumber(value.area)
}

/** @param {unknown} value */
function isElevatorRow(value) {
  return isRecord(value)
    && typeof value.name === 'string'
    && /^ITA-[1-6]$/.test(String(value.ita))
    && isFiniteNumber(value.power)
    && (value.unit === 'W' || value.unit === 'CV')
}

/** @param {unknown} value */
function isMotorRow(value) {
  return isRecord(value)
    && typeof value.name === 'string'
    && isFiniteNumber(value.power)
    && (value.unit === 'W' || value.unit === 'CV')
}

/** @param {unknown} value */
function isOtherLoadRow(value) {
  return isRecord(value)
    && typeof value.name === 'string'
    && isFiniteNumber(value.power)
}

/** @param {unknown} value */
function isLightingRow(value) {
  return isRecord(value)
    && ['portal', 'stair', 'known'].includes(String(value.id))
    && (value.lamp === 'Incandescencia' || value.lamp === 'Fluorescencia/LED')
    && isFiniteNumber(value.area)
    && isFiniteNumber(value.power)
}

const LINE_METHODS = ['A1', 'A2', 'B1', 'B2', 'C', 'E', 'F']
const LINE_LAYOUTS = ['embedded', 'single-layer-wall', 'single-layer-ceiling', 'perforated-tray', 'ladder-tray', 'tubes-air']

/** @param {unknown} value */
function isLineState(value) {
  return isRecord(value)
    && isFiniteNumber(value.powerW)
    && isFiniteNumber(value.voltageV)
    && isFiniteNumber(value.cosPhi)
    && isFiniteNumber(value.lengthM)
    && isFiniteNumber(value.maxDropPercent)
    && isFiniteNumber(value.gamma)
    && LINE_METHODS.includes(String(value.method))
    && (value.insulation === 'PVC' || value.insulation === 'XLPE')
    && isFiniteNumber(value.circuits)
    && isFiniteNumber(value.protectionA)
    && isFiniteNumber(value.neutralSection)
    && isFiniteNumber(value.peSection)
    && isFiniteNumber(value.controlSection)
    && isFiniteNumber(value.tubeDiameter)
    && (value.installation === 'air' || value.installation === 'buried')
    && LINE_LAYOUTS.includes(String(value.layout))
    && Number.isInteger(value.layers)
    && value.layers >= 1
    && Number.isInteger(value.tubes)
    && value.tubes >= 1
}

/**
 * @typedef {{ level: 'Básica' | 'Elevada', power: number, homes: number }} HousingRow
 * @typedef {{ name: string, type: 'Comercial/oficina' | 'Industria', area: number, real: number }} LocalRow
 * @typedef {{ name: string, ventilation: 'Forzada' | 'Natural', area: number }} GarageRow
 * @typedef {{ name: string, ita: 'ITA-1' | 'ITA-2' | 'ITA-3' | 'ITA-4' | 'ITA-5' | 'ITA-6', power: number, unit: 'W' | 'CV' }} ElevatorRow
 * @typedef {{ name: string, power: number, unit: 'W' | 'CV' }} MotorRow
 * @typedef {{ name: string, power: number }} OtherLoadRow
 * @typedef {{ id: 'portal' | 'stair' | 'known', area: number, lamp: 'Incandescencia' | 'Fluorescencia/LED', power: number }} LightingRow
 * @typedef {object} LineState
 * @property {number} powerW
 * @property {number} voltageV
 * @property {number} cosPhi
 * @property {number} lengthM
 * @property {number} maxDropPercent
 * @property {number} gamma
 * @property {string} method
 * @property {'PVC' | 'XLPE'} insulation
 * @property {number} circuits
 * @property {number} protectionA
 * @property {number} neutralSection
 * @property {number} peSection
 * @property {number} controlSection
 * @property {number} tubeDiameter
 * @property {'air' | 'buried'} installation
 * @property {string} layout
 * @property {number} layers
 * @property {number} tubes
 * @typedef {{ housing: HousingRow[], locals: LocalRow[], garages: GarageRow[], elevators: ElevatorRow[], motors: MotorRow[], otherLoads: OtherLoadRow[], lighting?: LightingRow[], parking: number, irveOption: number, lga?: LineState | null, di?: LineState | null }} CalculatorInputs
 * @typedef {{ getItem(key: string): string | null, setItem(key: string, value: string): void, removeItem(key: string): void }} StorageLike
 */

/** @param {StorageLike} storage @returns {CalculatorInputs | null} */
export function loadCalculatorInputs(storage) {
  try {
    const raw = storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY)
    if (!raw) return null

    const snapshot = JSON.parse(raw)
    if (
      !isRecord(snapshot)
      || snapshot.version !== 1
      || !Array.isArray(snapshot.housing)
      || !snapshot.housing.every(isHousingRow)
      || !Array.isArray(snapshot.locals)
      || !snapshot.locals.every(isLocalRow)
      || !Array.isArray(snapshot.garages)
      || !snapshot.garages.every(isGarageRow)
      || !Array.isArray(snapshot.elevators)
      || !snapshot.elevators.every(isElevatorRow)
      || !Array.isArray(snapshot.motors)
      || !snapshot.motors.every(isMotorRow)
      || !Array.isArray(snapshot.otherLoads)
      || !snapshot.otherLoads.every(isOtherLoadRow)
      || !isFiniteNumber(snapshot.parking)
      || snapshot.parking < 0
      || ![1, 2, 3].includes(snapshot.irveOption)
    ) return null

    const inputs = {
      housing: snapshot.housing,
      locals: snapshot.locals,
      garages: snapshot.garages,
      elevators: snapshot.elevators,
      motors: snapshot.motors,
      otherLoads: snapshot.otherLoads,
      parking: snapshot.parking,
      irveOption: snapshot.irveOption,
    }
    if (isLineState(snapshot.lga)) inputs.lga = snapshot.lga
    if (isLineState(snapshot.di)) inputs.di = snapshot.di
    if (Array.isArray(snapshot.lighting) && snapshot.lighting.every(isLightingRow)) inputs.lighting = snapshot.lighting
    return inputs
  } catch {
    return null
  }
}

/** @param {StorageLike} storage @param {CalculatorInputs} inputs */
export function saveCalculatorInputs(storage, inputs) {
  const hasProjectInputs = inputs.lga != null
    || inputs.di != null
    || inputs.housing.length > 0
    || inputs.locals.length > 0
    || inputs.garages.length > 0
    || inputs.elevators.length > 0
    || inputs.motors.length > 0
    || inputs.otherLoads.length > 0
    || (inputs.lighting ?? []).some(row => row.area > 0 || row.power > 0)
    || inputs.parking > 0
    || inputs.irveOption !== 1

  try {
    if (!hasProjectInputs) {
      storage.removeItem(CALCULATOR_INPUTS_STORAGE_KEY)
      return
    }

    const snapshot = { version: 1, ...inputs }
    if (inputs.lga != null) snapshot.lga = inputs.lga
    else delete snapshot.lga
    if (inputs.di != null) snapshot.di = inputs.di
    else delete snapshot.di

    storage.setItem(CALCULATOR_INPUTS_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage can be unavailable or full; the calculator remains usable in memory.
  }
}

/** @param {StorageLike} storage */
export function clearProjectData(storage) {
  for (const key of [CALCULATOR_INPUTS_STORAGE_KEY, PROJECT_INFO_STORAGE_KEY]) {
    try {
      storage.removeItem(key)
    } catch {
      // Continue clearing other app-owned data when storage is partially unavailable.
    }
  }
}
