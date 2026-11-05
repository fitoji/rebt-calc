/**
 * Interior circuits of a non-dwelling supply, ITC-BT-19.
 *
 * Dwellings have a fixed circuit roster in ITC-BT-25; a local or the common
 * services do not. Their board is designed from the actual loads, so every
 * circuit is a free row sized with the shared engine and the general drop
 * limits of ITC-BT-19 §2.2.2.
 */

import { sizeLine } from './line-sizing.mjs'
import { COPPER_CONDUCTIVITY } from './normative-tables.mjs'

/** Drop limits of an interior circuit, ITC-BT-19 §2.2.2. */
export const INTERIOR_DROP_LIMITS = { alumbrado: 3, otros: 5 }

/** Same limits for an industry fed at high voltage with its own transformer. */
export const INTERIOR_DROP_LIMITS_OWN_TRANSFORMER = { alumbrado: 4.5, otros: 6.5 }

/** @type {Array<'alumbrado' | 'otros'>} */
export const CIRCUIT_USES = ['alumbrado', 'otros']

export const CIRCUIT_USE_LABELS = { alumbrado: 'Alumbrado · 3 %', otros: 'Otros usos · 5 %' }

/** General board switch series. */
export const BOARD_SERIES = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400]

/**
 * @typedef {{ id: string, description: string, use: 'alumbrado' | 'otros', powerW: number, lengthM: number }} InteriorCircuit
 * @typedef {{ id: string, label: string, system: 'single-phase' | 'three-phase', powerW: number, method: string, insulation: 'PVC' | 'XLPE', installation: 'air' | 'buried', layout: string }} CircuitSupply
 */

/** @type {InteriorCircuit} */
export const DEFAULT_CIRCUIT = { id: '', description: '', use: 'otros', powerW: 0, lengthM: 0 }

/**
 * Line input of one interior circuit. The method, insulation and installation
 * come from the supply's derivation, so the board cannot drift from it.
 *
 * @param {InteriorCircuit} circuit
 * @param {CircuitSupply} supply
 */
export function circuitInput(circuit, supply) {
  const threePhase = supply.system === 'three-phase'

  return {
    role: /** @type {'interior'} */ ('interior'),
    system: supply.system,
    powerW: circuit.powerW,
    voltageV: threePhase ? 400 : 230,
    cosPhi: 1,
    lengthM: circuit.lengthM,
    maxDropPercent: INTERIOR_DROP_LIMITS[circuit.use] ?? INTERIOR_DROP_LIMITS.otros,
    gamma: COPPER_CONDUCTIVITY[supply.insulation === 'XLPE' ? 90 : 70],
    variant: {
      method: supply.method,
      loadedConductors: /** @type {2 | 3} */ (threePhase ? 3 : 2),
      insulation: supply.insulation,
    },
    installation: supply.installation,
    grouping: supply.installation === 'buried'
      ? { kind: 'buried-cables', cables: 2, spacing: 0 }
      : { layout: supply.layout, circuits: 1, layers: 1 },
    circuits: 1,
    protectionA: null,
    material: /** @type {'copper'} */ ('copper'),
  }
}

/**
 * @param {InteriorCircuit} circuit
 * @param {CircuitSupply} supply
 */
export function sizeInteriorCircuit(circuit, supply) {
  return sizeLine(circuitInput(circuit, supply))
}

/**
 * General switch of the board: the first rating that covers the design current.
 *
 * @param {number} currentA
 * @returns {number | null}
 */
export function generalSwitchFor(currentA) {
  return BOARD_SERIES.find(rating => rating >= Math.max(0, currentA)) ?? null
}

/**
 * Board summary and checks.
 *
 * @param {InteriorCircuit[]} circuits
 * @param {CircuitSupply & { powerW: number }} supply
 * @returns {{ totalPowerW: number, ib: number, switchA: number | null, supplyIb: number, supplySwitchA: number | null, supplyMaxPowerW: number | null, differentials: number, sensitivityMa: number, problems: string[], requirements: string[] }}
 */
export function evaluateBoard(circuits, supply) {
  const list = circuits ?? []
  const threePhase = supply.system === 'three-phase'
  const voltage = threePhase ? 400 : 230
  const factor = threePhase ? Math.sqrt(3) : 1
  const totalPowerW = list.reduce((sum, circuit) => sum + Math.max(0, circuit.powerW || 0), 0)
  const ib = totalPowerW / (factor * voltage)
  const switchA = generalSwitchFor(ib)
  const supplyIb = Math.max(0, supply.powerW || 0) / (factor * voltage)
  const supplySwitchA = generalSwitchFor(supplyIb)
  const supplyMaxPowerW = supplySwitchA == null ? null : supplySwitchA * factor * voltage
  const problems = []

  if (list.length === 0) problems.push('El cuadro no tiene circuitos definidos.')
  if (supply.powerW > 0 && totalPowerW > supply.powerW) {
    problems.push(`La suma de circuitos (${totalPowerW} W) supera la potencia prevista del suministro (${supply.powerW} W).`)
  }
  if (list.length > 0 && switchA == null) {
    problems.push('La intensidad del cuadro supera la serie de interruptores disponible.')
  }

  return {
    totalPowerW,
    ib,
    switchA,
    supplyIb,
    supplySwitchA,
    supplyMaxPowerW,
    differentials: 1,
    sensitivityMa: 30,
    problems,
    requirements: [
      'Caída máxima: 3 % en alumbrado y 5 % en los demás usos desde el origen de la instalación interior (ITC-BT-19 §2.2.2). Para industria alimentada en alta tensión con transformador propio, 4,5 % y 6,5 %.',
      'Cada circuito verifica Ib ≤ In ≤ Iz con su propia protección (ITC-BT-22).',
      'Protección contra contactos indirectos con diferencial de 30 mA (ITC-BT-24).',
      'El interruptor general del cuadro se elige por la intensidad de cálculo del conjunto, no por un escalón de vivienda.',
    ],
  }
}
