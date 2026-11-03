export const CALCULATOR_INPUTS_STORAGE_KEY = 'electrocalc-inputs:v1'

const PROJECT_INFO_STORAGE_KEY = 'electrocalc-project-info'

/** Marca de «proyecto vaciado a propósito»: distingue Limpiar de una primera visita. */
export const NEW_PROJECT_STORAGE_KEY = 'electrocalc-new-project'

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

/**
 * Surface per dwelling is an informative field, so a missing or malformed
 * value never discards the project.
 *
 * @param {{ area?: unknown }} row
 * @returns {number}
 */
function housingSurface(row) {
  return isFiniteNumber(row.area) && row.area >= 0 ? row.area : 0
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

/**
 * Parking spaces are an informative count (ITC-BT-10 §5.2 needs them for the
 * EV minimum), so a missing or malformed value never discards the project.
 *
 * @param {{ plazas?: unknown }} row
 * @returns {number}
 */
function garageParkingSpaces(row) {
  return isFiniteNumber(row.plazas) && row.plazas >= 0 ? row.plazas : 0
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

const INSTALLATION_TYPES = ['centralized', 'partial', 'single-user']
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
    && (value.sectionOverride == null || (isFiniteNumber(value.sectionOverride) && value.sectionOverride >= 0))
}

function isDerivation(value) {
  return isRecord(value)
    && typeof value.id === 'string'
    && ['dwelling', 'local', 'common-services', 'garage', 'irve', 'custom'].includes(String(value.kind))
    && typeof value.label === 'string'
    && (value.sourceKey == null || typeof value.sourceKey === 'string')
    && (value.system === 'single-phase' || value.system === 'three-phase')
    && isLineState(value)
}

/**
 * @typedef {{ level: 'Básica' | 'Elevada', power: number, homes: number, area: number }} HousingRow
 * @typedef {{ name: string, type: 'Comercial/oficina' | 'Industria', area: number, real: number }} LocalRow
 * @typedef {{ name: string, ventilation: 'Forzada' | 'Natural', area: number, plazas: number }} GarageRow
 * @typedef {{ name: string, ita: 'ITA-1' | 'ITA-2' | 'ITA-3' | 'ITA-4' | 'ITA-5' | 'ITA-6', power: number, unit: 'W' | 'CV' }} ElevatorRow
 * @typedef {{ name: string, power: number, unit: 'W' | 'CV' }} MotorRow
 * @typedef {{ name: string, power: number }} OtherLoadRow
 * @typedef {'centralized' | 'partial' | 'single-user'} InstallationType
 * @typedef {{ id: 'portal' | 'stair' | 'known', area: number, lamp: 'Incandescencia' | 'Fluorescencia/LED', power: number }} LightingRow
 * @typedef {object} LineState
 * @property {number} powerW
 * @property {number} voltageV
 * @property {number} cosPhi
 * @property {number} lengthM
 * @property {number} maxDropPercent
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
 * @property {number} [sectionOverride] phase section fixed by the user (0 = automatic)
 * @typedef {{ id: string, kind: 'dwelling' | 'local' | 'common-services' | 'garage' | 'irve' | 'custom', label: string, sourceKey: string | null, system: 'single-phase' | 'three-phase' } & LineState} Derivation
 * @typedef {{ housing: HousingRow[], locals: LocalRow[], garages: GarageRow[], elevators: ElevatorRow[], motors: MotorRow[], otherLoads: OtherLoadRow[], lighting?: LightingRow[], installationType?: InstallationType, parking: number, irveOption: number, lga?: LineState | null, lgaPowerMode?: 'auto' | 'manual', di?: LineState | null, derivations?: Derivation[] }} CalculatorInputs
 * @typedef {{ getItem(key: string): string | null, setItem(key: string, value: string): void, removeItem(key: string): void }} StorageLike
 */

/** @param {StorageLike} storage @returns {CalculatorInputs | null} */
export function loadCalculatorInputs(storage) {
  try {
    const raw = storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY)
    if (!raw) return null

    const snapshot = JSON.parse(raw)
    if (!isRecord(snapshot) || (snapshot.version !== 1 && snapshot.version !== 2)) return null

    const inputs = readInputs(snapshot)
    if (!inputs) return null

    if (snapshot.version === 1 && isLineState(snapshot.di) && !inputs.derivations) {
      inputs.derivations = [{
        id: 'legacy-di',
        kind: 'custom',
        label: 'Derivación individual',
        sourceKey: null,
        system: 'single-phase',
        ...snapshot.di,
      }]
    }
    return inputs
  } catch {
    return null
  }
}

/**
 * Validates the input blocks of a persisted snapshot and of an exported project
 * file. Both paths share this reader, so the file and the browser cannot accept
 * different shapes.
 *
 * @param {unknown} value
 * @returns {CalculatorInputs | null}
 */
function readInputs(value) {
  if (
    !isRecord(value)
    || !Array.isArray(value.housing)
    || !value.housing.every(isHousingRow)
    || !Array.isArray(value.locals)
    || !value.locals.every(isLocalRow)
    || !Array.isArray(value.garages)
    || !value.garages.every(isGarageRow)
    || !Array.isArray(value.elevators)
    || !value.elevators.every(isElevatorRow)
    || !Array.isArray(value.motors)
    || !value.motors.every(isMotorRow)
    || !Array.isArray(value.otherLoads)
    || !value.otherLoads.every(isOtherLoadRow)
    || !isFiniteNumber(value.parking)
    || value.parking < 0
    || ![1, 2, 3].includes(value.irveOption)
  ) return null

  const inputs = {
    housing: value.housing.map(row => ({ ...row, area: housingSurface(row) })),
    locals: value.locals,
    garages: value.garages.map(row => ({ ...row, plazas: garageParkingSpaces(row) })),
    elevators: value.elevators,
    motors: value.motors,
    otherLoads: value.otherLoads,
    parking: value.parking,
    irveOption: value.irveOption,
  }
  if (isLineState(value.lga)) inputs.lga = value.lga
  if (value.lgaPowerMode === 'auto' || value.lgaPowerMode === 'manual') inputs.lgaPowerMode = value.lgaPowerMode
  if (isLineState(value.di)) inputs.di = value.di
  if (Array.isArray(value.derivations) && value.derivations.every(isDerivation)) inputs.derivations = value.derivations
  if (Array.isArray(value.lighting) && value.lighting.every(isLightingRow)) inputs.lighting = value.lighting
  if (INSTALLATION_TYPES.includes(value.installationType)) inputs.installationType = value.installationType
  return inputs
}

const PROJECT_INFO_KEYS = ['companyName', 'companyAddress', 'workAddress', 'phone', 'email', 'logo']

/**
 * A malformed field is emptied instead of discarding the project: the letterhead
 * is informative, the calculation data is not.
 *
 * @param {unknown} value
 * @returns {{ companyName: string, companyAddress: string, workAddress: string, phone: string, email: string, logo: string }}
 */
function readProjectInfo(value) {
  const source = isRecord(value) ? value : {}
  const info = {}
  for (const key of PROJECT_INFO_KEYS) info[key] = typeof source[key] === 'string' ? source[key] : ''
  return info
}

/**
 * Reads the file written by «Descargar datos → JSON».
 *
 * The export carries the project, its inputs and the derived blocks. Only the
 * project data and the inputs are restored: the rest is recomputed by the engine,
 * and `settings` holds the user's normative parameters rather than project data.
 *
 * Validation is all-or-nothing: a rejected file returns no project at all, so the
 * caller can never apply half of it.
 *
 * @param {string} text
 * @returns {{ ok: true, project: { inputs: CalculatorInputs, projectInfo: { companyName: string, companyAddress: string, workAddress: string, phone: string, email: string, logo: string } } } | { ok: false, error: string }}
 */
export function readProjectExport(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'El archivo está vacío.' }
  }

  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }

  if (!isRecord(payload) || payload.inputs === undefined) {
    return { ok: false, error: 'El archivo no contiene los datos de un proyecto exportado por esta calculadora.' }
  }

  const inputs = readInputs(payload.inputs)
  if (!inputs) {
    return { ok: false, error: 'Los datos del proyecto del archivo no son válidos. No se cargó nada.' }
  }

  return { ok: true, project: { inputs, projectInfo: readProjectInfo(payload.projectInfo) } }
}

/** @param {StorageLike} storage @param {CalculatorInputs} inputs */
export function saveCalculatorInputs(storage, inputs) {
  const hasProjectInputs = inputs.lga != null
    || inputs.di != null
    || (inputs.derivations ?? []).length > 0
    || inputs.housing.length > 0
    || inputs.locals.length > 0
    || inputs.garages.length > 0
    || inputs.elevators.length > 0
    || inputs.motors.length > 0
    || inputs.otherLoads.length > 0
    || (inputs.lighting ?? []).some(row => row.area > 0 || row.power > 0)
    || (inputs.installationType != null && inputs.installationType !== 'centralized')
    || inputs.parking > 0
    || inputs.irveOption !== 1

  try {
    if (!hasProjectInputs) {
      storage.removeItem(CALCULATOR_INPUTS_STORAGE_KEY)
      return
    }

    const snapshot = { version: 2, ...inputs }
    if (inputs.lga != null) snapshot.lga = inputs.lga
    else delete snapshot.lga
    if (inputs.di != null) snapshot.di = inputs.di
    else delete snapshot.di
    if ((inputs.derivations ?? []).length > 0) snapshot.derivations = inputs.derivations
    else delete snapshot.derivations

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

/**
 * A first visit opens with the example building so the first screen shows real
 * numbers instead of a table of zeros. A deliberate clear must survive a reload,
 * so the marker disqualifies that path; loading the example again retires it.
 * @param {StorageLike} storage
 */
export function marksClearedProject(storage) {
  try {
    return storage.getItem(NEW_PROJECT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * @param {StorageLike} storage
 * @param {boolean} on
 */
export function setClearedProjectMark(storage, on) {
  try {
    if (on) storage.setItem(NEW_PROJECT_STORAGE_KEY, '1')
    else storage.removeItem(NEW_PROJECT_STORAGE_KEY)
  } catch {
    // The mark is a convenience, never a requirement: the calculator stays usable.
  }
}

/**
 * @param {StorageLike} storage
 * @param {boolean} restored whether a saved project was restored from storage
 */
export function opensWithExample(storage, restored) {
  if (restored) return false
  return !marksClearedProject(storage)
}
