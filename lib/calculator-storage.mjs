import { ASSEMBLIES, CABINETS, FLOOR_LOCATIONS, PLACEMENTS, isDefaultMeterCenter } from './meter-center.mjs'
import { DEFAULT_DOCUMENTATION, normalizeDocumentation } from './project-documentation.mjs'

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

/** A power or a count that cannot go below zero. @param {unknown} value */
function nonNegative(value) {
  return isFiniteNumber(value) && value > 0 ? value : 0
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
 * Parking spaces are an informative count (Guía-BT-52, Anexo 2 needs them for
 * the EV minimum), so a missing or malformed value never discards the project.
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

/**
 * The meter centre is optional project data: a malformed block is dropped on
 * load, and an imported file with a malformed one is rejected as a whole.
 *
 * @param {unknown} value
 */
function isMeterCenter(value) {
  if (!isRecord(value)) return false
  const assembly = ASSEMBLIES.includes(value.assembly)
    || value.enclosure === 'local' || value.enclosure === 'armario'

  return PLACEMENTS.includes(value.placement)
    && (value.meters == null || (Number.isInteger(value.meters) && value.meters >= 0))
    && Number.isInteger(value.concentrations)
    && value.concentrations >= 1
    && assembly
    && (value.cabinet == null || CABINETS.includes(value.cabinet))
    && FLOOR_LOCATIONS.includes(value.floor)
    && Number.isInteger(value.buildingFloors)
    && value.buildingFloors >= 1
    && [160, 250].includes(value.mainSwitchA)
    && typeof value.hasMando === 'boolean'
    && typeof value.hasTelecom === 'boolean'
    && (value.exterior == null || typeof value.exterior === 'boolean')
}

/**
 * Normalises the centre, including the `enclosure` field saved by the first
 * version of this block, so a project opened mid-change does not lose its room
 * or cabinet choice.
 *
 * @param {Record<string, unknown>} value
 * @returns {import('./meter-center.mjs').MeterCenter}
 */
function readMeterCenter(value) {
  const { enclosure, ...rest } = /** @type {Record<string, unknown> & { enclosure?: string }} */ (value)
  const assembly = ASSEMBLIES.includes(value.assembly)
    ? value.assembly
    : (enclosure === 'armario' ? 'armario' : 'local')

  return /** @type {import('./meter-center.mjs').MeterCenter} */ ({
    ...rest,
    assembly,
    cabinet: CABINETS.includes(value.cabinet) ? value.cabinet : 'adosado',
    exterior: value.exterior ?? false,
  })
}

/**
 * Documentation data (ITC-BT-04 criteria) is optional project data: it travels
 * with the load forecast but never feeds P1–P5, so a malformed block is
 * normalised field by field instead of discarding the project.
 *
 * @param {unknown} value
 */
function isDefaultDocumentation(value) {
  const documentation = normalizeDocumentation(value)
  return Object.entries(DEFAULT_DOCUMENTATION).every(([key, defaultValue]) => documentation[key] === defaultValue)
}

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
    && (value.housingIgaA == null || (isFiniteNumber(value.housingIgaA) && value.housingIgaA > 0))
}

/**
 * Interior installation data that travels with a dwelling derivation.
 *
 * @param {unknown} value
 */
function isInterior(value) {
  return isRecord(value)
    && isFiniteNumber(value.contractedPowerW)
    && value.contractedPowerW >= 0
    && Number.isInteger(value.circuits)
    && value.circuits >= 0
    && typeof value.hasSurge === 'boolean'
    && (value.lengths == null || (isRecord(value.lengths) && Object.values(value.lengths).every(length => isFiniteNumber(length) && length >= 0)))
    && (value.rooms == null || (Array.isArray(value.rooms) && value.rooms.every(isInteriorRoom)))
    && (value.hasHeating == null || typeof value.hasHeating === 'boolean')
    && (value.hasCooling == null || typeof value.hasCooling === 'boolean')
    && (value.hasDryer == null || typeof value.hasDryer === 'boolean')
    && (value.pointsOverride == null || isPointOverride(value.pointsOverride))
}

/**
 * Points the project installs per circuit: whole, non-negative numbers only.
 * An interior without the map is an older project and keeps working.
 *
 * @param {unknown} value
 */
function isPointOverride(value) {
  return isRecord(value)
    && Object.values(value).every(points => isFiniteNumber(points) && Number.isInteger(points) && points >= 0)
}

/**
 * @param {unknown} value
 */
function isInteriorRoom(value) {
  return isRecord(value)
    && typeof value.type === 'string'
    && isFiniteNumber(value.area) && value.area >= 0
    && isFiniteNumber(value.length) && value.length >= 0
}

/**
 * One free circuit of a non-dwelling interior board.
 *
 * @param {unknown} value
 */
function isInteriorCircuit(value) {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.description === 'string'
    && (value.use === 'alumbrado' || value.use === 'otros')
    && isFiniteNumber(value.powerW)
    && value.powerW >= 0
    && isFiniteNumber(value.lengthM)
    && value.lengthM >= 0
}

function isDerivation(value) {
  return isRecord(value)
    && typeof value.id === 'string'
    && ['dwelling', 'local', 'common-services', 'garage', 'irve', 'custom'].includes(String(value.kind))
    && typeof value.label === 'string'
    && (value.sourceKey == null || typeof value.sourceKey === 'string')
    && (value.system === 'single-phase' || value.system === 'three-phase')
    && (value.housingAreaM2 == null || (isFiniteNumber(value.housingAreaM2) && value.housingAreaM2 >= 0))
    && (value.interior == null || isInterior(value.interior))
    && (value.interiorCircuits == null || (Array.isArray(value.interiorCircuits) && value.interiorCircuits.every(isInteriorCircuit)))
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
 * @typedef {{ housing: HousingRow[], locals: LocalRow[], garages: GarageRow[], elevators: ElevatorRow[], motors: MotorRow[], otherLoads: OtherLoadRow[], lighting?: LightingRow[], installationType?: InstallationType, meterCenter?: import('./meter-center.mjs').MeterCenter, documentation?: import('./project-documentation.mjs').Documentation, parking: number, irveOption: number, lga?: LineState | null, lgaPowerMode?: 'auto' | 'manual', di?: LineState | null, derivations?: Derivation[] }} CalculatorInputs
 * @typedef {{ getItem(key: string): string | null, setItem(key: string, value: string): void, removeItem(key: string): void }} StorageLike
 */

/** @param {StorageLike} storage @returns {CalculatorInputs | null} */
export function loadCalculatorInputs(storage) {
  try {
    const raw = storage.getItem(CALCULATOR_INPUTS_STORAGE_KEY)
    if (!raw) return null

    const snapshot = JSON.parse(raw)
    if (!isRecord(snapshot) || (snapshot.version !== 1 && snapshot.version !== 2 && snapshot.version !== 3)) return null

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
 * file.
 *
 * The required core (the load forecast) is shared, so both paths accept the same
 * rows. The optional blocks are where the two paths deliberately differ: a saved
 * snapshot drops a block it cannot read instead of discarding the whole project,
 * while an imported file rejects everything, because it promised all-or-nothing
 * and silently losing the line state would be a lie.
 *
 * @param {unknown} value
 * @param {{ strict?: boolean }} [options]
 * @returns {CalculatorInputs | null}
 */
function readInputs(value, { strict = false } = {}) {
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

  if (strict) {
    const optionalBlocksReadable =
      (value.lga == null || isLineState(value.lga))
      && (value.di == null || isLineState(value.di))
      && (value.lgaPowerMode == null || value.lgaPowerMode === 'auto' || value.lgaPowerMode === 'manual')
      && (value.derivations == null || (Array.isArray(value.derivations) && value.derivations.every(isDerivation)))
      && (value.lighting == null || (Array.isArray(value.lighting) && value.lighting.every(isLightingRow)))
      && (value.meterCenter == null || isMeterCenter(value.meterCenter))
      && (value.installationType == null || INSTALLATION_TYPES.includes(value.installationType))
    if (!optionalBlocksReadable) return null
  }

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
  if (isMeterCenter(value.meterCenter)) inputs.meterCenter = readMeterCenter(value.meterCenter)
  if (isRecord(value.documentation)) inputs.documentation = normalizeDocumentation(value.documentation)
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

  const inputs = readInputs(payload.inputs, { strict: true })
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
    || !isDefaultDocumentation(inputs.documentation)
    || !isDefaultMeterCenter(inputs.meterCenter)
    || (inputs.installationType != null && inputs.installationType !== 'centralized')
    || inputs.parking > 0
    || inputs.irveOption !== 1

  try {
    if (!hasProjectInputs) {
      storage.removeItem(CALCULATOR_INPUTS_STORAGE_KEY)
      return
    }

    const snapshot = { version: 3, ...inputs }
    if (inputs.lga != null) snapshot.lga = inputs.lga
    else delete snapshot.lga
    if (inputs.di != null) snapshot.di = inputs.di
    else delete snapshot.di
    if ((inputs.derivations ?? []).length > 0) snapshot.derivations = inputs.derivations
    else delete snapshot.derivations
    if (!isDefaultMeterCenter(inputs.meterCenter)) snapshot.meterCenter = inputs.meterCenter
    else delete snapshot.meterCenter
    if (!isDefaultDocumentation(inputs.documentation)) snapshot.documentation = normalizeDocumentation(inputs.documentation)
    else delete snapshot.documentation

    storage.setItem(CALCULATOR_INPUTS_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage can be unavailable or full; the calculator remains usable in memory.
  }
}

/**
 * Instantánea derivada de la previsión de cargas, para el veredicto de
 * ITC-BT-04 que resuelve `/requisitos`.
 *
 * La página no recalcula la previsión: repetir P1–P5 allí la separaría de la
 * calculadora a la primera corrección. El cálculo guarda aquí el resumen ya
 * calculado —potencia total, viviendas, previsión de cada local, garajes, P5 de
 * recarga y cajas generales de protección— y la página solo lo clasifica con
 * `classifyDocumentation`. Vive bajo su propia clave: es dato derivado, no
 * entrada del proyecto, y por eso no entra en la exportación ni en el JSON de
 * importación.
 */
export const DOCUMENTATION_SNAPSHOT_STORAGE_KEY = 'electrocalc-documentation-snapshot:v1'

/**
 * @typedef {object} DocumentationSnapshot
 * @property {number} totalW potencia total prevista P, en W
 * @property {number} homes viviendas de la previsión
 * @property {number[]} localPowers previsión de cada local, en W
 * @property {Array<'Comercial/oficina' | 'Industria'>} localTypes tipo de cada local, en paralelo con `localPowers`
 * @property {Array<{ name: string, ventilation: 'Forzada' | 'Natural', plazas: number }>} garages garajes de la previsión
 * @property {number} irvePowerW previsión P5, en W
 * @property {number} cgpCount cajas generales de protección, al menos 1
 */

/**
 * Un garaje de la instantánea conserva lo único que leen los grupos g y h de la
 * ITC-BT-04 §3.1: la ventilación y las plazas. Una fila sin ventilación
 * conocida no puede decidir nada, así que se descarta entera.
 *
 * @param {unknown} value
 * @returns {{ name: string, ventilation: 'Forzada' | 'Natural', plazas: number } | null}
 */
function readSnapshotGarage(value) {
  if (!isRecord(value) || (value.ventilation !== 'Forzada' && value.ventilation !== 'Natural')) return null

  return {
    name: typeof value.name === 'string' ? value.name : '',
    ventilation: value.ventilation,
    plazas: nonNegative(value.plazas),
  }
}

/**
 * Los tipos se normalizan sin cambiar de posición: `classifyDocumentation` los
 * lee en paralelo con `localPowers`, así que descartar uno desplazaría al resto.
 *
 * @param {unknown} value
 * @returns {Array<'Comercial/oficina' | 'Industria'>}
 */
function readSnapshotTypes(value) {
  return Array.isArray(value) ? value.map(type => type === 'Industria' ? 'Industria' : 'Comercial/oficina') : []
}

/** @param {unknown} value */
function readSnapshotPowers(value) {
  return Array.isArray(value) ? value.map(nonNegative) : []
}

/** @param {unknown} value */
function readSnapshotGarages(value) {
  return Array.isArray(value) ? value.map(readSnapshotGarage).filter(row => row !== null) : []
}

/**
 * Una instantánea sin previsión no es un proyecto: la clave se borra para que
 * `/requisitos` distinga un proyecto vaciado con «Limpiar» de uno con números, y
 * pida completar la previsión en lugar de dar un veredicto sobre ceros.
 *
 * @param {DocumentationSnapshot} snapshot
 */
function isEmptySnapshot(snapshot) {
  return snapshot.totalW <= 0
    && snapshot.homes <= 0
    && snapshot.localPowers.every(power => power <= 0)
    && snapshot.garages.length === 0
    && snapshot.irvePowerW <= 0
}

/**
 * Una instantánea guardada se lee entera o no se lee: el veredicto no se emite
 * sobre datos a medias.
 *
 * @param {unknown} value
 * @returns {DocumentationSnapshot | null}
 */
function readSnapshot(value) {
  if (!isRecord(value) || value.version !== 1) return null
  if (
    !isFiniteNumber(value.totalW)
    || !isFiniteNumber(value.homes)
    || !isFiniteNumber(value.irvePowerW)
    || !isFiniteNumber(value.cgpCount)
    || !Array.isArray(value.localPowers)
    || !Array.isArray(value.localTypes)
    || !Array.isArray(value.garages)
  ) return null

  return {
    totalW: nonNegative(value.totalW),
    homes: nonNegative(value.homes),
    localPowers: readSnapshotPowers(value.localPowers),
    localTypes: readSnapshotTypes(value.localTypes),
    garages: readSnapshotGarages(value.garages),
    irvePowerW: nonNegative(value.irvePowerW),
    cgpCount: Math.max(1, Math.floor(nonNegative(value.cgpCount))),
  }
}

/**
 * Guarda la instantánea derivada que lee `/requisitos`. Sin previsión, la clave
 * se elimina en lugar de guardar ceros.
 *
 * @param {StorageLike} storage
 * @param {Partial<DocumentationSnapshot>} [snapshot]
 */
export function saveDocumentationSnapshot(storage, {
  totalW = 0,
  homes = 0,
  localPowers = [],
  localTypes = [],
  garages = [],
  irvePowerW = 0,
  cgpCount = 1,
} = {}) {
  const next = {
    totalW: nonNegative(totalW),
    homes: nonNegative(homes),
    localPowers: readSnapshotPowers(localPowers),
    localTypes: readSnapshotTypes(localTypes),
    garages: readSnapshotGarages(garages),
    irvePowerW: nonNegative(irvePowerW),
    cgpCount: Math.max(1, Math.floor(nonNegative(cgpCount))),
  }

  try {
    if (isEmptySnapshot(next)) {
      storage.removeItem(DOCUMENTATION_SNAPSHOT_STORAGE_KEY)
      return
    }
    storage.setItem(DOCUMENTATION_SNAPSHOT_STORAGE_KEY, JSON.stringify({ version: 1, ...next }))
  } catch {
    // Storage can be unavailable or full; the calculator remains usable in memory.
  }
}

/**
 * @param {StorageLike} storage
 * @returns {DocumentationSnapshot | null}
 */
export function loadDocumentationSnapshot(storage) {
  try {
    const raw = storage.getItem(DOCUMENTATION_SNAPSHOT_STORAGE_KEY)
    if (!raw) return null
    return readSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

/** @param {StorageLike} storage */
export function clearProjectData(storage) {
  for (const key of [CALCULATOR_INPUTS_STORAGE_KEY, PROJECT_INFO_STORAGE_KEY, DOCUMENTATION_SNAPSHOT_STORAGE_KEY]) {
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
