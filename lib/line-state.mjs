/**
 * Shared line input builder.
 *
 * The UI panels and the project-wide calculation must describe a line in the
 * same way. Keeping this mapping in one place prevents the LGA/DI panels from
 * drifting away from the derivations generated from the load forecast.
 */

import { COPPER_CONDUCTIVITY } from './normative-tables.mjs'

/**
 * ITC-BT-14 §3 admits only RZ1-K (AS) and DZ1-K (AS) for the LGA: unipolar
 * 0,6/1 kV cables with XLPE insulation. A stored or imported PVC selection is
 * therefore ignored instead of quietly changing the admissible current.
 */
export const LGA_INSULATION = 'XLPE'

/**
 * The insulation the engine actually uses: the LGA is fixed to XLPE by
 * ITC-BT-14 §3, the DI keeps whatever the user chose.
 *
 * @param {object} state line inputs (LineState)
 * @param {'lga' | 'di'} role
 */
export function insulationFor(state, role) {
  return role === 'lga' ? LGA_INSULATION : state.insulation
}

/**
 * Conductivity at the maximum service temperature of the insulation, which is
 * what the anexo 2 of the Guía del REBT asks for: 48 m/(Ω·mm²) at 70 °C for PVC
 * and 44 at 90 °C for XLPE/EPR. A value stored by an older snapshot is ignored
 * on purpose, so no saved project can size with γ20 behind the user's back.
 *
 * @param {object} state line inputs (LineState)
 * @param {'lga' | 'di'} role
 */
export function gammaFor(state, role) {
  return insulationFor(state, role) === 'XLPE' ? COPPER_CONDUCTIVITY[90] : COPPER_CONDUCTIVITY[70]
}

export function groupingFor(state) {
  if (state.installation === 'buried') {
    return state.tubes > 1
      ? { kind: 'tubes-buried', tubes: state.tubes, layers: state.layers }
      : { kind: 'buried-cables', cables: Math.max(2, state.circuits), spacing: 0 }
  }
  if (state.layout === 'tubes-air') {
    return { kind: 'tubes-air', tubes: state.tubes, layers: state.layers }
  }
  return { layout: state.layout, circuits: state.circuits, layers: state.layers }
}

/**
 * @param {object} state line inputs (LineState)
 * @param {'three-phase' | 'single-phase'} system
 * @param {'lga' | 'di'} role which instruction sets the minimum section
 */
export function lineInputFromState(state, system, role) {
  const insulation = insulationFor(state, role)

  return {
    role,
    system,
    powerW: state.powerW,
    voltageV: state.voltageV,
    cosPhi: state.cosPhi,
    lengthM: state.lengthM,
    maxDropPercent: state.maxDropPercent,
    gamma: gammaFor(state, role),
    variant: {
      method: state.method,
      loadedConductors: /** @type {2 | 3} */ (system === 'three-phase' ? 3 : 2),
      insulation,
    },
    installation: state.installation,
    grouping: groupingFor(state),
    circuits: state.circuits,
    protectionA: state.protectionA > 0 ? state.protectionA : null,
    sectionOverride: (state.sectionOverride ?? 0) > 0 ? state.sectionOverride : null,
  }
}
