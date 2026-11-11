import { NORMATIVE_REGISTRY } from './normative-tables.mjs'

/**
 * Initial inspection of executed installations (ITC-BT-05 §4.1).
 *
 *   a  Instalaciones industriales que precisen proyecto · P instalada > 100 kW
 *   b  Locales de pública concurrencia · sin límite
 *   c  Locales con riesgo de incendio o explosión, de clase I ·
 *      excepto aparcamientos de menos de 25 plazas
 *   d  Locales mojados · P instalada > 25 kW
 *   e  Piscinas · P instalada > 10 kW
 *   f  Quirófanos y salas de intervención · sin límite
 *   g  Instalaciones de alumbrado exterior · P instalada > 5 kW
 *   h  Estaciones de recarga de vehículo eléctrico que requieran proyecto ·
 *      sin límite (el proyecto necesario ya filtra)
 *
 * The module is pure: it reuses the forecast snapshot and the documentation
 * block that ITC-BT-04 classification already reads, and adds no figures of
 * its own. `requiresProject` is the ITC-BT-04 verdict: groups a and h hinge
 * on it instead of duplicating the §3.1 rules.
 *
 * Where the instruction says «potencia instalada» for the whole installation
 * (groups a and d) the classifier uses the forecast total P; the wet-locals
 * row has no per-local power in the data model, so the building total is the
 * only power the instruction names. This is an assumption, not a prescription.
 */

/** The registry entry this module is the only consumer of. */
const INSPECTION = NORMATIVE_REGISTRY['inspection.initial']

/** A non-negative finite number in watts. */
function watts(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/** Any iterable value as a plain array. */
function list(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Classifies an installation under ITC-BT-05 §4.1.
 *
 * @param {object} [installation]
 * @param {number} [installation.totalW] installed power P, in W (forecast total)
 * @param {Array<'Comercial/oficina' | 'Industria'>} [installation.localTypes] type of each local
 * @param {number} [installation.irvePowerW] P5 forecast power, in W
 * @param {import('./project-documentation.mjs').Documentation | Record<string, unknown>} [installation.documentation]
 * @param {boolean} [installation.requiresProject] the ITC-BT-04 verdict already computed
 * @returns {{ verdict: 'inspeccion' | 'sin-inspeccion', decidingGroups: string[], groups: Array<{ id: string, title: string, applies: boolean, value: number | string, limit: string, requiresInspection: boolean, source: string }>, source: string }}
 */
export function classifyInspection({
  totalW = 0,
  localTypes = [],
  irvePowerW = 0,
  documentation,
  requiresProject = false,
} = {}) {
  const rules = INSPECTION.values.groups
  const declared = {
    outdoorLightingW: 0,
    poolsW: 0,
    publicConcurrence: false,
    fireRisk: false,
    operatingRooms: false,
    wetLocales: false,
    ...(documentation ?? {}),
  }
  const total = watts(totalW)
  const types = list(localTypes)
  const irvePower = watts(irvePowerW)

  /** One verdict-table row of the §4.1 list. */
  function row(id, { applies, value, requiresInspection }) {
    return {
      id,
      title: rules[id].title,
      applies,
      value,
      limit: rules[id].limit,
      requiresInspection: applies && requiresInspection,
      source: `${INSPECTION.source} ${id}`,
    }
  }

  const groups = [
    row('a', {
      applies: types.includes('Industria') && requiresProject,
      value: total,
      requiresInspection: total > rules.a.limitW,
    }),
    row('b', { applies: declared.publicConcurrence, value: 'pública concurrencia', requiresInspection: true }),
    // The stored fireRisk flag already excludes aparcamientos (ITC-BT-04 §3.1 l
    // semantics), so the §4.1 exemption for parkings under 25 spaces does not
    // need extra data the model does not have.
    row('c', { applies: declared.fireRisk, value: 'riesgo de incendio o explosión', requiresInspection: true }),
    row('d', {
      applies: declared.wetLocales,
      value: total,
      requiresInspection: total > rules.d.limitW,
    }),
    row('e', {
      applies: declared.poolsW > 0,
      value: declared.poolsW,
      requiresInspection: declared.poolsW > rules.e.limitW,
    }),
    row('f', { applies: declared.operatingRooms, value: 'quirófanos y salas de intervención', requiresInspection: true }),
    row('g', {
      applies: declared.outdoorLightingW > 0,
      value: declared.outdoorLightingW,
      requiresInspection: declared.outdoorLightingW > rules.g.limitW,
    }),
    row('h', {
      applies: irvePower > 0 && requiresProject,
      value: irvePower,
      requiresInspection: true,
    }),
  ]

  const decidingGroups = groups.filter(group => group.requiresInspection).map(group => group.id)
  return {
    verdict: decidingGroups.length > 0 ? 'inspeccion' : 'sin-inspeccion',
    decidingGroups,
    groups,
    source: INSPECTION.source,
  }
}
