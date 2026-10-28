/**
 * Day/night mode.
 *
 * The theme is an explicit opt-in: the `<html>` element carries the `dark`
 * class, the CSS does the rest, and the choice is remembered per browser. The
 * app never flips on its own when the operating system changes scheme.
 */

export const THEME_STORAGE_KEY = 'electrocalc-theme'

/** @typedef {'light' | 'dark'} Theme */

/** @param {unknown} value @returns {value is Theme} */
export function isTheme(value) {
  return value === 'light' || value === 'dark'
}

/** @param {Theme} theme @returns {Theme} */
export function nextTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark'
}

/**
 * Theme to apply on boot. Anything unreadable falls back to light, which is the
 * app's original look.
 *
 * @param {string | null | undefined} stored
 * @returns {Theme}
 */
export function resolveInitialTheme(stored) {
  return isTheme(stored) ? stored : 'light'
}

/**
 * Label for the toggle, describing the action, not the current state.
 *
 * @param {Theme} theme
 * @returns {string}
 */
export function toggleLabel(theme) {
  return theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'
}
