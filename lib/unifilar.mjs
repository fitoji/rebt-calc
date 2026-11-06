/**
 * Datos y geometría del esquema unifilar.
 *
 * El dibujo no inventa nada: cada columna lee el resultado que ya calculó el
 * motor de líneas (sección, protección In, cable, caída) y el cuadro que ya
 * resolvió la instalación interior (diferenciales). Este módulo concentra las
 * reglas que no dependen del DOM para poder probarlas sin navegador.
 *
 * Vocabulario:
 *   - `In` es la protección de la línea (Ib ≤ In ≤ Iz), no el IGA del escalón
 *     de potencia de la vivienda: el IGA fija la potencia máxima admisible y se
 *     dibuja aparte, solo cuando no coincide con In (ITC-BT-25 §2.1).
 *   - `IΔn` es la sensibilidad del diferencial, no su corriente asignada: 30 mA
 *     por la ITC-BT-24, y uno por cada cinco circuitos en vivienda.
 */

import { DIFFERENTIAL_SENSITIVITY_MA, evaluateInterior, resolveInterior } from './interior-installation.mjs'

/**
 * Cómo se rotula y colorea cada tipo de derivación.
 *
 * `line` pinta el trazo del conductor y del símbolo; `ink` escribe el texto.
 * Van separados porque no piden lo mismo: un trazo de 2 px se lee con el color
 * categórico, pero un rótulo de 9 px necesita la variante oscura del mismo tono
 * para llegar a AA sobre el papel.
 */
export const UNIFILAR_KINDS = {
  dwelling: { label: 'Vivienda', line: 'var(--kind-dwelling)', ink: 'var(--kind-dwelling-ink)' },
  local: { label: 'Local', line: 'var(--kind-local)', ink: 'var(--kind-local-ink)' },
  'common-services': { label: 'Servicios generales', line: 'var(--kind-common)', ink: 'var(--kind-common-ink)' },
  garage: { label: 'Garaje', line: 'var(--kind-garage)', ink: 'var(--kind-garage-ink)' },
  irve: { label: 'Recarga VE', line: 'var(--kind-irve)', ink: 'var(--kind-irve-ink)' },
  custom: { label: 'Manual', line: 'var(--kind-custom)', ink: 'var(--kind-custom-ink)' },
}

export function kindFor(kind) {
  return UNIFILAR_KINDS[kind] ?? UNIFILAR_KINDS.custom
}

export function kindLabel(kind) {
  return kindFor(kind).label
}

/** Color del trazo: conductor, aparato y punto de la leyenda. */
export function kindColor(kind) {
  return kindFor(kind).line
}

/** Color del rótulo, elegido para contrastar sobre el papel. */
export function kindInk(kind) {
  return kindFor(kind).ink
}

/** `RZ1-K` o `ES07Z1-K`: la designación que se rotula junto al conductor. */
export function shortCable(cable) {
  const text = String(cable ?? '')
  if (text.includes('RZ1')) return 'RZ1-K'
  if (text.includes('ES07')) return 'ES07Z1-K'
  return text.trim() || '—'
}

/** Polos del aparato: fase + neutro, o tres fases + neutro. */
export function polesFor(system) {
  return system === 'three-phase' ? '4P' : '2P'
}

/**
 * La etiqueta de la carga entra en una caja de 94 px a 10 px de cuerpo: más de
 * 16 caracteres se sale del hueco y pisa la columna siguiente. El nombre
 * completo queda en el `<title>` del símbolo.
 */
export function truncateLabel(label, max = 16) {
  const text = String(label ?? '').trim()
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

/**
 * Diferenciales que pide el cuadro del abonado. La vivienda los cuenta por sus
 * circuitos; cualquier otro suministro lleva la protección de 30 mA que exige la
 * ITC-BT-24 para contactos indirectos.
 *
 * @param {{ kind?: string, powerW?: number, housingIgaA?: number, interior?: object | null }} derivation
 * @returns {{ differentials: number, sensitivityMa: number }}
 */
export function differentialsFor(derivation) {
  if (derivation?.kind === 'dwelling') {
    const interior = resolveInterior(derivation.powerW ?? 0, derivation.interior)
    const evaluation = evaluateInterior({
      igaA: derivation.housingIgaA ?? null,
      powerW: derivation.powerW ?? 0,
      ...interior,
    })
    return { differentials: evaluation.differentials, sensitivityMa: evaluation.sensitivityMa }
  }

  return { differentials: 1, sensitivityMa: DIFFERENTIAL_SENSITIVITY_MA }
}

/**
 * Geometría de la lámina. Una columna por derivación sobre un embarrado único;
 * la lámina crece a lo ancho y se desplaza, nunca se comprime hasta ser ilegible.
 */
export const UNIFILAR_LAYOUT = Object.freeze({
  colWidth: 150,
  lgaX: 95,
  firstColumn: 225,
  busY: 188,
  height: 470,
  minWidth: 760,
  rightPadding: 44,
})

/** x de la columna `index` (0 = primera derivación). */
export function columnX(index) {
  return UNIFILAR_LAYOUT.firstColumn + Math.max(0, Math.trunc(index)) * UNIFILAR_LAYOUT.colWidth
}

/** Ancho total de la lámina para `count` derivaciones. */
export function diagramWidth(count) {
  const columns = Math.max(0, Math.trunc(count))
  return Math.max(
    UNIFILAR_LAYOUT.firstColumn + columns * UNIFILAR_LAYOUT.colWidth + UNIFILAR_LAYOUT.rightPadding,
    UNIFILAR_LAYOUT.minWidth,
  )
}

/** x donde termina el embarrado: la última toma, o un muñón si no hay ninguna. */
export function busEndX(count) {
  const columns = Math.max(0, Math.trunc(count))
  if (columns === 0) return UNIFILAR_LAYOUT.lgaX + 18
  return columnX(columns - 1) + 12
}
