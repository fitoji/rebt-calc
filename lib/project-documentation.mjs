import { NORMATIVE_REGISTRY } from './normative-tables.mjs'

/**
 * ¿Proyecto o memoria técnica de diseño? (ITC-BT-04 §3 y §4)
 *
 * Classifies the load forecast of a low-voltage installation against the
 * groups of ITC-BT-04 §3.1. A group that applies and requires a project turns
 * the whole installation into a project (§3.3: the most demanding criterion
 * wins); when no group applies, the installation only needs a memoria técnica
 * de diseño (§4).
 *
 * The thresholds below transcribe the instruction; they are not adjustable
 * engineering parameters:
 *   §3.1 a  Industrias en general · P > 20 kW
 *   §3.1 b  Locales húmedos, polvorientos o corrosivos · P > 10 kW
 *   §3.1 c  Locales mojados; generadores y convertidores · P > 10 kW
 *   §3.1 d  Instalaciones de carácter temporal · P > 50 kW
 *   §3.1 e  Edificios de viviendas, locales y oficinas · P > 100 kW por CGP
 *   §3.1 f  Viviendas unifamiliares · P > 50 kW
 *   §3.1 g  Aparcamientos con ventilación forzada · cualquiera que sea su ocupación
 *   §3.1 h  Aparcamientos con ventilación natural · > 5 plazas
 *   §3.1 i  Locales de pública concurrencia · sin límite
 *   §3.1 j  Máquinas de elevación y transporte y afines · sin límite de potencia
 *   §3.1 k  Alumbrado exterior · P > 5 kW
 *   §3.1 l  Locales con riesgo de incendio o explosión · sin límite
 *   §3.1 m  Quirófanos y salas de intervención · sin límite
 *   §3.1 n  Piscinas y fuentes · P > 5 kW
 *   §3.1 z  Recarga de vehículo eléctrico · P > 50 kW; en el exterior > 10 kW;
 *           modo 4 sin límite
 *
 * The module is pure: it neither imports storage nor knows about React. The
 * documentation data it reads never feeds P1–P5 or the forecast total.
 */

/**
 * Documentation-only data declared inside the load forecast. These values are
 * not loads of the building: they only select the ITC-BT-04 criteria.
 *
 * @typedef {object} Documentation
 * @property {number} outdoorLightingW alumbrado exterior (ITC-BT-09)
 * @property {number} poolsW piscinas y fuentes (ITC-BT-31)
 * @property {boolean} publicConcurrence local de pública concurrencia
 * @property {boolean} fireRisk local con riesgo de incendio o explosión (excepto aparcamientos)
 * @property {boolean} operatingRooms quirófanos y salas de intervención
 * @property {boolean} dampLocales locales húmedos, polvorientos o con riesgo de corrosión
 * @property {boolean} wetLocales locales mojados
 * @property {boolean} temporary instalación de carácter temporal
 * @property {boolean} liftingMachines líneas BT con apoyos comunes con AT, tensiones especiales, rótulos luminosos y cercas eléctricas; los ascensores y las máquinas de elevación y transporte se deducen de P2 (grupo j) y no se preguntan
 * @property {boolean} irveOutdoor recarga de vehículo eléctrico en el exterior
 * @property {boolean} irveMode4 estaciones de recarga en modo de carga 4
 */

/** @type {Documentation} */
export const DEFAULT_DOCUMENTATION = {
  outdoorLightingW: 0,
  poolsW: 0,
  publicConcurrence: false,
  fireRisk: false,
  operatingRooms: false,
  dampLocales: false,
  wetLocales: false,
  temporary: false,
  liftingMachines: false,
  irveOutdoor: false,
  irveMode4: false,
}

/** Documentation powers: numbers of watts. */
const POWER_KEYS = ['outdoorLightingW', 'poolsW']

/** Documentation flags: booleans. */
const FLAG_KEYS = [
  'publicConcurrence',
  'fireRisk',
  'operatingRooms',
  'dampLocales',
  'wetLocales',
  'temporary',
  'liftingMachines',
  'irveOutdoor',
  'irveMode4',
]

/** Watts or a short Spanish criterion, as the verdict table shows it. */
const CLASSIFICATION_RULES = NORMATIVE_REGISTRY['documentation.classification'].values.groups

/**
 * @typedef {object} DocumentationGroup
 * @property {string} id
 * @property {string} title
 * @property {boolean} applies
 * @property {number | string} value watts or a short Spanish criterion
 * @property {number | string} limit watts or a short Spanish criterion
 * @property {boolean} requiresProject
 * @property {string} source
 */

/**
 * @typedef {object} DocumentationClassification
 * @property {'proyecto' | 'memoria-tecnica'} verdict
 * @property {DocumentationGroup[]} groups
 * @property {string[]} decidingGroups
 * @property {string} source
 */

/**
 * Merges a stored block with the defaults: watts are finite and never negative,
 * flags are booleans, and a missing or malformed value never discards the rest.
 *
 * @param {unknown} value
 * @returns {Documentation}
 */
export function normalizeDocumentation(value) {
  const source = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? /** @type {Record<string, unknown>} */ (value)
    : {}

  /** @type {Record<string, number | boolean>} */
  const documentation = { ...DEFAULT_DOCUMENTATION }
  for (const key of POWER_KEYS) {
    const power = source[key]
    documentation[key] = typeof power === 'number' && Number.isFinite(power)
      ? Math.max(0, power)
      : 0
  }
  for (const key of FLAG_KEYS) documentation[key] = Boolean(source[key])

  return /** @type {Documentation} */ (documentation)
}

/**
 * A finite, non-negative power in watts; anything else is no power at all.
 *
 * @param {unknown} value
 * @returns {number}
 */
function watts(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * @param {unknown} value
 * @returns {unknown[]}
 */
function list(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Builds one verdict-table row.
 *
 * @param {keyof typeof GROUPS} id
 * @param {{ applies: boolean, value: number | string, requiresProject: boolean }} row
 * @returns {DocumentationGroup}
 */
function group(id, { applies, value, requiresProject }) {
  return {
    id,
    title: CLASSIFICATION_RULES[id].title,
    applies,
    value,
    limit: CLASSIFICATION_RULES[id].limitW ?? CLASSIFICATION_RULES[id].limit ?? CLASSIFICATION_RULES[id].limitSpaces,
    requiresProject: applies && requiresProject,
    source: `${NORMATIVE_REGISTRY['documentation.classification'].source} ${id}`,
  }
}

/**
 * Classifies the load forecast under ITC-BT-04.
 *
 * `P` is the forecast power the calculator already shows (`totalW`); the
 * documentation block only adds the criteria the forecast cannot infer. Group
 * e is measured per CGP (`cgpCount`), as the instruction requires: the same
 * total can be a project with one CGP and a MTD with two. `parking` travels
 * with the IRVE block for the report but does not move any threshold.
 *
 * Group j bundles two sources: the lifting machines the forecast already
 * reveals (`hasLiftingMachines`, derived from P2's elevators and motors) and the
 * criteria it cannot (the stored `liftingMachines` flag). A project saved with
 * the flag ticked keeps its verdict, so the manual switch never has to guess
 * whether an elevator exists.
 *
 * @param {object} [project]
 * @param {number} [project.totalW] forecast power P, in W
 * @param {number} [project.homes] dwellings in the forecast
 * @param {number[]} [project.localPowers] forecast power of each local, in W
 * @param {Array<'Comercial/oficina' | 'Industria'>} [project.localTypes] type of each local
 * @param {Array<{ name?: string, ventilation?: 'Forzada' | 'Natural', plazas?: number, area?: number }>} [project.garages]
 * @param {number} [project.parking] IRVE parking spaces
 * @param {number} [project.irvePowerW] P5 forecast power, in W
 * @param {number} [project.cgpCount] number of cajas generales de protección
 * @param {boolean} [project.hasLiftingMachines] the forecast declares an elevator or a motor in P2 (group j)
 * @param {Documentation | Record<string, unknown>} [project.documentation]
 * @returns {DocumentationClassification}
 */
export function classifyDocumentation({
  totalW = 0,
  homes = 0,
  localPowers = [],
  localTypes = [],
  garages = [],
  parking = 0,
  irvePowerW = 0,
  cgpCount = 1,
  hasLiftingMachines = false,
  documentation,
} = {}) {
  const declared = normalizeDocumentation(documentation)
  const total = watts(totalW)
  const powers = list(localPowers).map(watts)
  const types = list(localTypes)
  const garageRows = list(garages)
  const dwellingCount = typeof homes === 'number' && Number.isFinite(homes) ? homes : 0
  const irvePower = watts(irvePowerW)

  const industryPowers = powers.filter((_, index) => types[index] === 'Industria')
  const industryPower = industryPowers.reduce((sum, power) => sum + power, 0)
  const hasLocals = powers.length > 0 || types.length > 0

  const forcedGarages = garageRows.filter(row => row?.ventilation === 'Forzada')
  const naturalGarages = garageRows.filter(row => row?.ventilation === 'Natural')
  const naturalSpaces = naturalGarages.reduce((sum, row) => sum + watts(row?.plazas), 0)

  const perCgp = total / Math.max(1, cgpCount)
  const hasIrve = irvePower > 0 || declared.irveMode4 || declared.irveOutdoor
  const irveRule = CLASSIFICATION_RULES.z
  const irveRequiresProject = (irveRule.irveMode4Unconditional && declared.irveMode4)
    || (declared.irveOutdoor && irvePower > irveRule.irveOutdoorLimitW)
    || irvePower > irveRule.irveIndoorLimitW

  const groups = [
    group('a', {
      applies: types.includes('Industria'),
      value: industryPower,
      requiresProject: industryPower > CLASSIFICATION_RULES.a.limitW,
    }),
    group('b', {
      applies: declared.dampLocales,
      value: total,
      requiresProject: total > CLASSIFICATION_RULES.b.limitW,
    }),
    group('c', {
      applies: declared.wetLocales,
      value: total,
      requiresProject: total > CLASSIFICATION_RULES.c.limitW,
    }),
    group('d', {
      applies: declared.temporary,
      value: total,
      requiresProject: total > CLASSIFICATION_RULES.d.limitW,
    }),
    group('e', {
      applies: dwellingCount >= 2 || hasLocals,
      value: perCgp,
      requiresProject: perCgp > CLASSIFICATION_RULES.e.limitW,
    }),
    group('f', {
      applies: dwellingCount === 1,
      value: total,
      requiresProject: total > CLASSIFICATION_RULES.f.limitW,
    }),
    group('g', {
      applies: forcedGarages.length > 0,
      value: 'ventilación forzada',
      requiresProject: CLASSIFICATION_RULES.g.unconditional,
    }),
    group('h', {
      applies: naturalGarages.length > 0,
      value: naturalSpaces,
      requiresProject: naturalSpaces > CLASSIFICATION_RULES.h.limitSpaces,
    }),
    group('i', {
      applies: declared.publicConcurrence,
      value: 'pública concurrencia',
      requiresProject: CLASSIFICATION_RULES.i.unconditional,
    }),
    group('j', {
      applies: hasLiftingMachines === true || declared.liftingMachines,
      value: 'máquinas de elevación y transporte y afines',
      requiresProject: CLASSIFICATION_RULES.j.unconditional,
    }),
    group('k', {
      applies: declared.outdoorLightingW > 0,
      value: declared.outdoorLightingW,
      requiresProject: declared.outdoorLightingW > CLASSIFICATION_RULES.k.limitW,
    }),
    group('l', {
      applies: declared.fireRisk,
      value: 'riesgo de incendio o explosión',
      requiresProject: CLASSIFICATION_RULES.l.unconditional,
    }),
    group('m', {
      applies: declared.operatingRooms,
      value: 'quirófanos y salas de intervención',
      requiresProject: CLASSIFICATION_RULES.m.unconditional,
    }),
    group('n', {
      applies: declared.poolsW > 0,
      value: declared.poolsW,
      requiresProject: declared.poolsW > CLASSIFICATION_RULES.n.limitW,
    }),
    group('z', {
      applies: hasIrve,
      value: irvePower,
      requiresProject: irveRequiresProject,
    }),
  ]

  const decidingGroups = groups
    .filter(entry => entry.requiresProject)
    .map(entry => entry.id)

  return {
    verdict: decidingGroups.length > 0 ? 'proyecto' : 'memoria-tecnica',
    groups,
    decidingGroups,
    source: 'ITC-BT-04 §3 y §4',
  }
}

/**
 * Titular del documento técnico. El REBT distingue dos documentos —proyecto y
 * memoria técnica de diseño—, así que el título se toma del veredicto y nunca
 * se escribe a mano: un PDF que dice «memoria técnica» cuando la instalación
 * exige proyecto es un documento mal titulado.
 *
 * @param {'proyecto' | 'memoria-tecnica'} verdict
 * @returns {'PROYECTO' | 'MEMORIA TÉCNICA'}
 */
export function documentKindLabel(verdict) {
  return verdict === 'proyecto' ? 'PROYECTO' : 'MEMORIA TÉCNICA'
}

