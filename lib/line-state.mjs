/**
 * Shared line input builder.
 *
 * The UI panels and the project-wide calculation must describe a line in the
 * same way. Keeping this mapping in one place prevents the LGA/DI panels from
 * drifting away from the derivations generated from the load forecast.
 */

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
 */
export function lineInputFromState(state, system) {
  return {
    system,
    powerW: state.powerW,
    voltageV: state.voltageV,
    cosPhi: state.cosPhi,
    lengthM: state.lengthM,
    maxDropPercent: state.maxDropPercent,
    gamma: state.gamma,
    variant: {
      method: state.method,
      loadedConductors: /** @type {2 | 3} */ (system === 'three-phase' ? 3 : 2),
      insulation: state.insulation,
    },
    installation: state.installation,
    grouping: groupingFor(state),
    circuits: state.circuits,
    protectionA: state.protectionA > 0 ? state.protectionA : null,
  }
}
