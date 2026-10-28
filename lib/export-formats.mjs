/**
 * Human-readable exports of the load forecast.
 *
 * The calculator builds a format-neutral report (project data, totals and
 * tables) and these helpers render it as Markdown or plain text. Keeping the
 * rendering separate from the React component makes it testable without a DOM.
 */

/**
 * @typedef {{ label: string, value: string }} ReportField
 * @typedef {{ code: string, label: string, value: number }} ReportTotal
 * @typedef {{ title: string, columns: string[], rows: (string | number)[][] }} ReportTable
 * @typedef {{
 *   title: string,
 *   subtitle: string,
 *   generatedAt: Date | string,
 *   project: ReportField[],
 *   totals: ReportTotal[],
 *   sections: ReportTable[],
 *   lines: ReportTable[],
 * }} Report
 */

const FOOTER = 'Documento generado por Electro-cálculos · Valores editables según proyecto.'

/** @param {number} value */
function formatNumber(value) {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)
}

/** @param {Date | string} value */
function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('es-ES')
}

/** @param {string | number} value */
function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|')
}

/**
 * @param {Report} report
 * @returns {string}
 */
export function buildMarkdownReport(report) {
  const out = [
    `# ${report.title}`,
    '',
    `_${report.subtitle}_`,
    '',
    `Fecha de emisión: ${formatDate(report.generatedAt)}`,
    '',
  ]

  if (report.project.length > 0) {
    out.push('## Datos del proyecto', '')
    for (const field of report.project) out.push(`- **${field.label}:** ${field.value}`)
    out.push('')
  }

  out.push('## Potencias previstas', '', '| Código | Concepto | Potencia (W) |', '| --- | --- | ---: |')
  for (const total of report.totals) out.push(`| ${total.code} | ${cell(total.label)} | ${formatNumber(total.value)} |`)
  out.push('')

  for (const table of [...report.sections, ...report.lines]) {
    out.push(`## ${table.title}`, '')
    out.push(`| ${table.columns.map(cell).join(' | ')} |`)
    out.push(`| ${table.columns.map(() => '---').join(' | ')} |`)
    for (const row of table.rows) out.push(`| ${row.map(cell).join(' | ')} |`)
    out.push('')
  }

  out.push('---', '', FOOTER, '')

  return out.join('\n')
}

/**
 * @param {Report} report
 * @returns {string}
 */
export function buildPlainTextReport(report) {
  const out = [
    report.title.toUpperCase(),
    report.subtitle,
    `Fecha de emisión: ${formatDate(report.generatedAt)}`,
    '',
  ]

  if (report.project.length > 0) {
    out.push('DATOS DEL PROYECTO')
    for (const field of report.project) out.push(`  ${field.label}: ${field.value}`)
    out.push('')
  }

  out.push('POTENCIAS PREVISTAS')
  for (const total of report.totals) out.push(`  ${total.code} · ${total.label}: ${formatNumber(total.value)} W`)
  out.push('')

  for (const table of [...report.sections, ...report.lines]) {
    out.push(table.title.toUpperCase())
    out.push(`  ${table.columns.join(' · ')}`)
    for (const row of table.rows) out.push(`  ${row.join(' · ')}`)
    out.push('')
  }

  out.push(FOOTER)

  return out.join('\n')
}
