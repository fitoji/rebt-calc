/**
 * Progressive tab disclosure: las pestañas surgen a medida que el proyecto las
 * necesita, en vez de mostrarse todas desde el primer momento.
 *
 * Reglas (pedidas por el usuario, verbatim):
 *  - "al comenzar de 0, quiero que solo se vea prevision de cargas tab"
 *  - "al agregar una vivienda surga la tab de DI"
 *  - "al agregar mas de 2 viviendas surga LGA" — literal: una vivienda
 *    unifamiliar o dos viviendas adosadas no necesitan LGA según el REBT.
 *  - "al completar DI, surga cuadros" — resuelta: al pulsar «Generar desde
 *    previsión», es decir, cuando existen derivaciones.
 *  - "al empezar a editar cuadros surga esquema"
 *
 * Puro y sin estado: el componente pasa los datos del proyecto y recibe la
 * lista de pestañas visibles en orden de barra.
 */

// Orden de la barra. Duplicado a propósito del TAB_ORDER tipado del componente;
// tests/tab-visibility.test.mjs pina ambos literales para que no deriven.
export const TAB_ORDER = ['cargas', 'lga', 'di', 'interiores', 'esquema']

/**
 * @param {{ homes?: number, hasDerivations?: boolean, cuadrosStarted?: boolean }} project
 *   homes: total de viviendas (suma de unidades de cada fila de la previsión).
 *   hasDerivations: true tras «Generar desde previsión» (hay derivaciones).
 *   cuadrosStarted: true tras la primera edición en Cuadros (ver cuadrosHasEdits).
 * @returns {string[]} pestañas visibles, subconjunto de TAB_ORDER en orden.
 */
export function computeVisibleTabs({ homes = 0, hasDerivations = false, cuadrosStarted = false } = {}) {
  const visible = {
    cargas: true,
    lga: homes > 2,
    di: homes >= 1,
    interiores: hasDerivations,
    esquema: cuadrosStarted,
  }
  return TAB_ORDER.filter(tab => visible[tab])
}

/**
 * "Empezar a editar cuadros": alguna derivación de vivienda tiene interior
 * (updateDerivationInterior) o alguna de no-vivienda tiene circuitos cargados
 * (updateDerivationCircuits). Seleccionar una vivienda o suministro no edita.
 */
export function cuadrosHasEdits(derivations) {
  if (!Array.isArray(derivations)) return false
  return derivations.some(derivation => derivation != null && (
    Boolean(derivation.interior)
    || (Array.isArray(derivation.interiorCircuits) && derivation.interiorCircuits.length > 0)
  ))
}

/**
 * Si la pestaña activa quedó oculta (p. ej. al limpiar el proyecto estando en
 * Cuadros), la vista cae a Previsión de cargas; el indicador y el acento de
 * color se calculan por pestaña activa y necesitan un trigger renderizado.
 */
export function resolveActiveTab(activeTab, visibleTabs) {
  return Array.isArray(visibleTabs) && visibleTabs.includes(activeTab) ? activeTab : 'cargas'
}
