/**
 * Centralización de contadores, ITC-BT-16.
 *
 * The meter centre is the link between the LGA and the individual derivations.
 * This module holds the selections the engineer makes in the card and the
 * checks the instruction states over them, so the panel, the report and the
 * JSON cannot disagree.
 *
 * Sources (RD 842/2002, ITC-BT-16):
 *   §1  protección de los conjuntos: IP40 · IK09 interior, IP43 · IK09 exterior
 *   §2.2  concentración en local (siempre) o en armario (hasta 16 contadores)
 *   §2.2  edificios de más de 12 plantas y concentraciones por plantas
 *   §3   interruptor general de maniobra: obligatorio con más de dos usuarios,
 *        160 A hasta 90 kW y 250 A hasta 150 kW
 *   §3   altura de montaje: 0,25 m del suelo y 1,80 m al cuadrante de lectura
 */

/** A meter centre with more than this many meters must sit in a room. */
export const MAX_ARMARIO_METERS = 16

/** Floors above this allow intermediate-floor concentrations. */
export const INTERMEDIATE_FLOOR_THRESHOLD = 12

/** Building floors each intermediate concentration must cover. */
export const FLOORS_PER_CONCENTRATION = 6

/**
 * Rating of the main switch, by installed power. Above the last step the
 * instruction publishes no value.
 */
export const MAIN_SWITCH_STEPS = [
  { maxPowerW: 90_000, amps: 160 },
  { maxPowerW: 150_000, amps: 250 },
]

/** Protection grades of the assembly (§1). */
export const PROTECTION_GRADES = {
  interior: 'IP40 · IK09',
  exterior: 'IP43 · IK09',
}

/**
 * @typedef {'individual' | 'concentrated'} Placement
 * @typedef {'cpm' | 'local' | 'armario' | 'modulos' | 'paneles'} Assembly
 * @typedef {'empotrado' | 'adosado'} Cabinet
 * @typedef {'baja' | 'entresuelo' | 'primer-sotano' | 'intermedias' | 'por-plantas'} FloorLocation
 * @typedef {{ placement: Placement, meters: number | null, concentrations: number, assembly: Assembly, cabinet: Cabinet, floor: FloorLocation, buildingFloors: number, mainSwitchA: number, hasMando: boolean, hasTelecom: boolean, exterior: boolean }} MeterCenter
 */

/** @type {MeterCenter} */
export const DEFAULT_METER_CENTER = {
  placement: 'concentrated',
  meters: null,
  concentrations: 1,
  assembly: 'local',
  cabinet: 'adosado',
  floor: 'baja',
  buildingFloors: 1,
  mainSwitchA: 160,
  hasMando: false,
  hasTelecom: false,
  exterior: false,
}

/** Whether the centre still holds every default, so it is not project data. */
export function isDefaultMeterCenter(center) {
  if (!center) return true
  return Object.entries(DEFAULT_METER_CENTER).every(([key, value]) => center[key] === value)
}

/** @type {Placement[]} */
export const PLACEMENTS = ['individual', 'concentrated']

/** @type {Assembly[]} */
export const ASSEMBLIES = ['cpm', 'local', 'armario', 'modulos', 'paneles']

/** @type {Cabinet[]} */
export const CABINETS = ['empotrado', 'adosado']

/** @type {FloorLocation[]} */
export const FLOOR_LOCATIONS = ['baja', 'entresuelo', 'primer-sotano', 'intermedias', 'por-plantas']

export const PLACEMENT_LABELS = {
  individual: 'Individual · caja de protección y medida',
  concentrated: 'Concentrada',
}

export const ASSEMBLY_LABELS = {
  cpm: 'Caja de protección y medida (ITC-BT-13)',
  local: 'Concentración en local',
  armario: 'Concentración en armario',
  modulos: 'Módulos con tapas precintables',
  paneles: 'Paneles',
}

export const CABINET_LABELS = {
  empotrado: 'Empotrado',
  adosado: 'Adosado',
}

/**
 * Requirements each arrangement carries in the instruction. The card shows them
 * as a checklist; they are not inputs, they are what the project must comply
 * with once the arrangement is chosen.
 */
export const ROOM_REQUIREMENTS = {
  cpm: [
    'Envolvente única con los fusibles generales, el contador y la discriminación horaria (ITC-BT-13).',
  ],
  local: [
    'Local de uso exclusivo, que no sirva de paso ni de acceso a otros locales.',
    'Altura mínima 2,30 m; anchura mínima 1,50 m en la pared ocupada por contadores.',
    '1,10 m libres hasta el primer obstáculo y 20 cm a las paredes laterales.',
    'Puerta de 0,70 × 2 m, apertura hacia el exterior y cerradura de la distribuidora.',
    'Paredes clase M0 y suelos M1; resistencia al fuego de local de riesgo especial bajo.',
    'Ventilación e iluminación suficiente y sumideros si el suelo está a nivel o por debajo.',
    'Alumbrado de emergencia de 1 h y 5 lux; extintor móvil 21B en el exterior.',
  ],
  armario: [
    'Solo hasta 16 contadores por concentración.',
    'Empotrado o adosado en zona común, lo más próximo a la entrada del edificio.',
    'Pasillo libre de 1,5 m desde la parte más saliente del armario.',
    'Característica parallamas PF 30 y cerradura normalizada por la distribuidora.',
    'Ventilación e iluminación suficiente; extintor móvil 21B y base de enchufe de 16 A con tierra.',
  ],
  modulos: [
    'Módulos con tapas precintables conformes a UNE-EN 60439-1, 2 y 3.',
    'Ventilación interna contra condensaciones sin perder el grado de protección.',
  ],
  paneles: [
    'Paneles conformes a UNE-EN 60439-1, 2 y 3.',
    'Ventilación interna contra condensaciones sin perder el grado de protección.',
  ],
}

export const FLOOR_LABELS = {
  baja: 'Planta baja',
  entresuelo: 'Entresuelo',
  'primer-sotano': 'Primer sótano',
  intermedias: 'Plantas intermedias',
  'por-plantas': 'Una concentración por planta',
}

export const LOCATION_LABELS = {
  interior: 'Interior · IP40 · IK09',
  exterior: 'Exterior · IP43 · IK09',
}

/**
 * Meters a project needs, suggested from the forecast. Each dwelling unit and
 * each local is a supply; the common services have their own meter, and so does
 * the EV infrastructure when there are parking spaces.
 *
 * @param {{ dwellings?: number, locals?: number, hasCommonServices?: boolean, hasIrve?: boolean }} project
 * @returns {number}
 */
export function suggestMeterCount({ dwellings = 0, locals = 0, hasCommonServices = false, hasIrve = false } = {}) {
  const count = Math.max(0, Math.round(dwellings)) + Math.max(0, Math.round(locals))
    + (hasCommonServices ? 1 : 0)
    + (hasIrve ? 1 : 0)
  return Math.max(count, 1)
}

/**
 * Link scenario implied by the placement: the meter centre decides the
 * voltage-drop limits of the LGA and the derivations.
 *
 * @param {MeterCenter} center
 * @returns {'single-user' | 'centralized' | 'partial'}
 */
export function installationTypeFor(center) {
  if (center.placement === 'individual') return 'single-user'
  return Math.max(1, Math.round(center.concentrations)) > 1 ? 'partial' : 'centralized'
}

/**
 * Centre that reproduces a scenario saved before the card existed, so old
 * projects keep their drop limits instead of reopening as fully centralized.
 *
 * @param {'single-user' | 'centralized' | 'partial' | undefined} type
 * @returns {MeterCenter}
 */
export function meterCenterFromInstallationType(type) {
  if (type === 'single-user') return { ...DEFAULT_METER_CENTER, placement: 'individual', assembly: 'cpm' }
  if (type === 'partial') return { ...DEFAULT_METER_CENTER, concentrations: 2 }
  return { ...DEFAULT_METER_CENTER }
}

/**
 * Main switch the instruction requires for a given installed power.
 *
 * @param {number} powerW
 * @returns {{ required: boolean, amps: number | null, outOfRange: boolean }}
 */
export function mainSwitchFor(powerW, meterCount = 0) {
  const required = meterCount > 2
  if (!required) return { required: false, amps: null, outOfRange: false }

  const step = MAIN_SWITCH_STEPS.find(entry => Math.max(0, powerW) <= entry.maxPowerW)
  return step
    ? { required: true, amps: step.amps, outOfRange: false }
    : { required: true, amps: null, outOfRange: true }
}

/**
 * Meters per concentration, rounded up.
 *
 * @param {MeterCenter} center
 * @returns {number}
 */
export function metersPerConcentration(center) {
  const concentrations = Math.max(1, Math.round(center.concentrations))
  return Math.ceil(Math.max(0, Math.round(center.meters)) / concentrations)
}

/**
 * Checks the card shows. `problems` block the combination; `notes` are fixed
 * requirements the project must satisfy but that the card cannot verify;
 * `requirements` is the instruction checklist for the chosen arrangement.
 *
 * @param {MeterCenter} center
 * @param {{ powerW?: number }} [context]
 * @returns {{ installationType: 'single-user' | 'centralized' | 'partial', requiredAssembly: 'cpm' | 'local' | null, mainSwitch: { required: boolean, amps: number | null, outOfRange: boolean }, problems: string[], notes: string[], requirements: string[] }}
 */
export function evaluateMeterCenter(center, { powerW = 0 } = {}) {
  const meters = Math.max(0, Math.round(center.meters ?? 0))
  const perConcentration = metersPerConcentration(center)
  const problems = []
  const notes = []

  if (center.placement === 'individual') {
    if (meters > 2) {
      problems.push('La colocación individual atiende a un único usuario; dos usuarios desde un mismo lugar van a una caja de protección y medida (ITC-BT-13).')
    }
    if (center.assembly !== 'cpm') {
      problems.push('La colocación individual se resuelve con una caja de protección y medida, no con una concentración.')
    }
  } else {
    if (center.assembly === 'cpm') {
      problems.push('Una concentración de contadores no se resuelve con una caja de protección y medida.')
    }
    if (perConcentration > MAX_ARMARIO_METERS && center.assembly !== 'local') {
      problems.push(`Con más de ${MAX_ARMARIO_METERS} contadores por concentración la ubicación debe ser un local.`)
    }
    if (center.floor === 'por-plantas' && perConcentration <= MAX_ARMARIO_METERS) {
      problems.push(`Una concentración por planta exige más de ${MAX_ARMARIO_METERS} contadores en cada una.`)
    }
    if (center.floor === 'intermedias' && center.buildingFloors <= INTERMEDIATE_FLOOR_THRESHOLD) {
      problems.push(`Las concentraciones en plantas intermedias solo se admiten en edificios de más de ${INTERMEDIATE_FLOOR_THRESHOLD} plantas.`)
    }
    if (center.floor === 'intermedias') {
      const floorsCovered = Math.ceil(center.buildingFloors / Math.max(1, Math.round(center.concentrations)))
      if (floorsCovered < FLOORS_PER_CONCENTRATION) {
        problems.push(`Cada concentración en plantas intermedias debe cubrir ${FLOORS_PER_CONCENTRATION} o más plantas; con ${center.concentrations} concentraciones quedan ${floorsCovered}.`)
      } else {
        notes.push(`Cada concentración cubre ${floorsCovered} plantas.`)
      }
    }
  }

  const mainSwitch = mainSwitchFor(powerW, meters)
  if (mainSwitch.outOfRange) {
    problems.push('La ITC-BT-16 solo tabula el interruptor general de maniobra hasta 150 kW.')
  } else if (mainSwitch.required && center.mainSwitchA < mainSwitch.amps) {
    problems.push(`El interruptor general de maniobra debe ser de ${mainSwitch.amps} A para esta potencia.`)
  }
  if (!mainSwitch.required && meters > 0 && center.placement === 'concentrated') {
    notes.push('El interruptor general de maniobra es obligatorio a partir de tres usuarios.')
  }

  notes.push(`Montaje: 0,25 m del suelo a la parte inferior y 1,80 m como máximo al cuadrante de lectura. Conjunto ${center.exterior ? `exterior ${PROTECTION_GRADES.exterior}` : `interior ${PROTECTION_GRADES.interior}`}.`)

  return {
    installationType: installationTypeFor(center),
    requiredAssembly: perConcentration > MAX_ARMARIO_METERS ? 'local' : (center.placement === 'individual' ? 'cpm' : null),
    mainSwitch,
    problems,
    notes,
    requirements: ROOM_REQUIREMENTS[center.assembly] ?? [],
  }
}
