/**
 * Puntos de utilización mínimos de una vivienda, ITC-BT-25 §4 (tabla 2).
 *
 * The rooms are the project's own measurements; the minimums are the
 * instruction's, per room type and surface. The result is the number of points
 * of each circuit the dwelling needs, which then feeds the circuit count.
 */

/** @type {Array<'acceso' | 'vestibulo' | 'salon' | 'dormitorio' | 'bano' | 'pasillo' | 'cocina' | 'terraza' | 'garaje'>} */
export const ROOM_TYPES = ['acceso', 'vestibulo', 'salon', 'dormitorio', 'bano', 'pasillo', 'cocina', 'terraza', 'garaje']

export const ROOM_LABELS = {
  acceso: 'Acceso',
  vestibulo: 'Vestíbulo',
  salon: 'Salón',
  dormitorio: 'Dormitorio',
  bano: 'Baño',
  pasillo: 'Pasillo o distribuidor',
  cocina: 'Cocina',
  terraza: 'Terraza o vestidor',
  garaje: 'Garaje unifamiliar',
}

/** @type {Array<'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C8' | 'C9' | 'C10' | 'C13'>} */
export const POINT_CIRCUITS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C8', 'C9', 'C10', 'C13']

export const POINT_CIRCUIT_LABELS = {
  C1: 'Puntos de luz',
  C2: 'Tomas de uso general',
  C3: 'Cocina y horno',
  C4: 'Lavadora, lavavajillas y termo',
  C5: 'Baño y cuarto de cocina',
  C8: 'Calefacción',
  C9: 'Aire acondicionado',
  C10: 'Secadora',
  C13: 'Recarga del vehículo eléctrico',
}

/** Maximum points each circuit admits, from table 1. Null means no fixed cap. */
export const MAX_POINTS = { C1: 30, C2: 20, C3: 2, C4: 3, C5: 6, C8: null, C9: null, C10: 1, C13: null }

/**
 * @typedef {{ type: string, area: number, length: number }} Room
 * @typedef {{ hasHeating: boolean, hasCooling: boolean, hasDryer: boolean, hasIrve: boolean }} PointFlags
 */

const empty = () => ({ C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C8: 0, C9: 0, C10: 0, C13: 0 })

const up = (value) => Math.max(1, Math.ceil(value))

/**
 * Minimum points of one room, ITC-BT-25 table 2.
 *
 * @param {Room} room
 * @param {Partial<PointFlags>} [flags]
 * @returns {Record<string, number>}
 */
export function roomPoints(room, flags = {}) {
  const points = empty()
  const area = Math.max(0, room.area || 0)
  const length = Math.max(0, room.length || 0)
  const heating = flags.hasHeating === true
  const cooling = flags.hasCooling === true

  switch (room.type) {
    case 'acceso':
      points.C1 = 1
      break
    case 'vestibulo':
      points.C1 = 1
      points.C2 = 1
      break
    case 'salon':
      points.C1 = area > 10 ? 2 : 1
      points.C2 = Math.max(3, Math.ceil(area / 6))
      if (heating) points.C8 = area > 10 ? 2 : 1
      if (cooling) points.C9 = area > 10 ? 2 : 1
      break
    case 'dormitorio':
      points.C1 = area > 10 ? 2 : 1
      points.C2 = Math.max(3, Math.ceil(area / 6))
      if (heating) points.C8 = 1
      if (cooling) points.C9 = 1
      break
    case 'bano':
      points.C1 = 1
      points.C5 = 1
      if (heating) points.C8 = 1
      break
    case 'pasillo':
      points.C1 = length > 0 ? up(length / 5) : 1
      points.C2 = length > 5 ? 2 : 1
      break
    case 'cocina':
      points.C1 = area > 10 ? 2 : 1
      points.C2 = 2
      points.C3 = 1
      points.C4 = 3
      points.C5 = 3
      if (heating) points.C8 = 1
      if (flags.hasDryer === true) points.C10 = 1
      break
    case 'terraza':
      points.C1 = area > 10 ? 2 : 1
      break
    case 'garaje':
      points.C1 = area > 10 ? 2 : 1
      points.C2 = area > 10 ? 2 : 1
      if (flags.hasIrve === true) points.C13 = 1
      break
    default:
      break
  }

  return points
}

/**
 * Totals per circuit and the circuits each count requires.
 *
 * @param {Room[]} rooms
 * @param {Partial<PointFlags>} [flags]
 * @returns {{ totals: Record<string, number>, requiredCircuits: Record<string, number>, totalPoints: number }}
 */
export function totalPoints(rooms, flags = {}) {
  const totals = empty()
  for (const room of rooms ?? []) {
    const points = roomPoints(room, flags)
    for (const circuit of POINT_CIRCUITS) totals[circuit] += points[circuit] ?? 0
  }

  return {
    totals,
    ...countsFor(totals),
  }
}

/**
 * Circuits each count needs, from the table 1 cap. The only rule the point
 * counts use: totalPoints and the project overrides share it, so editing a
 * number and recomputing the minimum can never disagree.
 *
 * @param {Record<string, number>} totals
 * @returns {{ requiredCircuits: Record<string, number>, totalPoints: number }}
 */
function countsFor(totals) {
  const requiredCircuits = {}
  for (const circuit of POINT_CIRCUITS) {
    const max = MAX_POINTS[circuit]
    requiredCircuits[circuit] = max == null ? 0 : Math.ceil(totals[circuit] / max)
  }

  return {
    requiredCircuits,
    totalPoints: POINT_CIRCUITS.reduce((sum, circuit) => sum + totals[circuit], 0),
  }
}

/**
 * Points the project really installs, per circuit.
 *
 * The minimum of table 2 is a floor, not a design decision: the project states
 * how many points each circuit carries. An entry replaces the computed minimum
 * of its circuit; a circuit without an entry keeps the minimum of the rooms.
 * Only whole, non-negative numbers are accepted, an invalid entry is ignored
 * instead of flooring the count, and the cap of table 1 (`MAX_POINTS`) is never
 * edited here: it only decides how many circuits the points need.
 *
 * @param {{ totals: Record<string, number>, requiredCircuits: Record<string, number>, totalPoints: number }} points result of `totalPoints`
 * @param {Record<string, number> | null | undefined} [pointsOverride] circuit id → points to install
 * @returns {{ totals: Record<string, number>, minimums: Record<string, number>, requiredCircuits: Record<string, number>, totalPoints: number, overridden: string[] }}
 */
export function applyPointOverrides(points, pointsOverride = {}) {
  const source = pointsOverride != null && typeof pointsOverride === 'object' ? pointsOverride : {}
  const minimums = { ...empty(), ...(points?.totals ?? {}) }
  const totals = { ...minimums }
  const overridden = []

  for (const circuit of POINT_CIRCUITS) {
    if (!Object.prototype.hasOwnProperty.call(source, circuit)) continue
    const value = source[circuit]
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) continue
    totals[circuit] = value
    overridden.push(circuit)
  }

  return {
    totals,
    minimums,
    overridden,
    ...countsFor(totals),
  }
}
