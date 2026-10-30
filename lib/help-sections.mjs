/**
 * Table of contents for the help page.
 *
 * The page renders exactly one section per entry, in this order, and builds the
 * sticky index from the same list, so the index and the document cannot drift
 * apart. `group` is what the index prints above a run of links.
 */
export const HELP_SECTIONS = [
  { id: 'que-es', title: 'Qué calcula la app', group: 'Empezar' },
  { id: 'empezar', title: 'Empezar en cinco pasos', group: 'Empezar' },
  { id: 'prevision', title: 'La previsión del edificio', group: 'Previsión de cargas' },
  { id: 'p1', title: 'P1 · Viviendas', group: 'Previsión de cargas' },
  { id: 'p2', title: 'P2 · Servicios generales', group: 'Previsión de cargas' },
  { id: 'p3', title: 'P3 · Locales, oficinas e industrias', group: 'Previsión de cargas' },
  { id: 'p4', title: 'P4 · Garajes', group: 'Previsión de cargas' },
  { id: 'p5', title: 'P5 · Recarga de vehículos', group: 'Previsión de cargas' },
  { id: 'parametros', title: 'Parámetros de cálculo', group: 'Previsión de cargas' },
  { id: 'supuestos', title: 'Supuesto de instalación', group: 'Dimensionado de líneas' },
  { id: 'lga', title: 'Línea General de Alimentación', group: 'Dimensionado de líneas' },
  { id: 'di', title: 'Derivaciones individuales', group: 'Dimensionado de líneas' },
  { id: 'explicacion', title: 'Modo cálculo y modo didáctico', group: 'Uso diario' },
  { id: 'apariencia', title: 'Tema claro y oscuro', group: 'Uso diario' },
  { id: 'exportar', title: 'Exportar la memoria', group: 'Uso diario' },
  { id: 'datos', title: 'Dónde se guardan los datos', group: 'Uso diario' },
  { id: 'limites', title: 'Límites y criterios de uso', group: 'Referencia' },
  { id: 'fuentes', title: 'Normativa y fuentes', group: 'Referencia' },
]

/** Section ids, grouped, in document order. */
export const HELP_GROUPS = HELP_SECTIONS.reduce((groups, section) => {
  const last = groups.at(-1)
  if (last && last.title === section.group) last.sections.push(section)
  else groups.push({ title: section.group, sections: [section] })
  return groups
}, /** @type {{ title: string, sections: typeof HELP_SECTIONS }[]} */ ([]))
