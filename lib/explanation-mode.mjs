export const EXPLANATION_MODE_STORAGE_KEY = 'electrocalc-explanation-mode'

export const EXPLANATION_MODES = ['calculation', 'didactic']

/** @param {unknown} value */
export function resolveExplanationMode(value) {
  return value === 'didactic' ? 'didactic' : 'calculation'
}

/** @param {'calculation' | 'didactic'} mode */
export function nextExplanationMode(mode) {
  return mode === 'didactic' ? 'calculation' : 'didactic'
}

/** @param {'calculation' | 'didactic'} mode */
export function explanationModeLabel(mode) {
  return mode === 'didactic' ? 'Didáctico' : 'Cálculo'
}
