import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMarkdownReport, buildPlainTextReport } from '../lib/export-formats.mjs'

const report = {
  title: 'Informe de previsión de cargas',
  subtitle: 'ITC-BT-10 · REBT',
  generatedAt: new Date(2026, 9, 28),
  project: [{ label: 'Empresa', value: 'Instalaciones Ejemplo S.L.' }],
  totals: [
    { code: 'P1', label: 'Viviendas', value: 5750 },
    { code: 'P2', label: 'Servicios generales', value: 8404 },
    { code: 'TOTAL', label: 'Potencia total prevista', value: 14154 },
  ],
  sections: [
    {
      title: '3. Locales y oficinas',
      columns: ['Descripción', 'Tipo', 'Previsión'],
      rows: [
        ['Local 1', 'Industria', '12.500 W'],
        ['Local | 2', 'Comercial/oficina', '5.000 W'],
      ],
    },
  ],
  lines: [{ title: '6. LGA · ITC-BT-14', columns: ['Concepto', 'Valor'], rows: [['Sección adoptada', '35 mm²']] }],
}

test('markdown export renders headings, totals and tables', () => {
  const markdown = buildMarkdownReport(report)

  assert.match(markdown, /^# Informe de previsión de cargas$/m, 'document title')
  assert.match(markdown, /^_ITC-BT-10 · REBT_$/m, 'normative subtitle')
  assert.match(markdown, /Fecha de emisión: 28\/10\/2026/, 'issue date')
  assert.match(markdown, /- \*\*Empresa:\*\* Instalaciones Ejemplo S\.L\./, 'project data as a list')
  assert.match(markdown, /\| TOTAL \| Potencia total prevista \| 14\.154 \|/, 'totals table groups thousands the Spanish way')
  assert.match(markdown, /## 3\. Locales y oficinas/, 'detail sections keep their titles')
  assert.match(markdown, /## 6\. LGA · ITC-BT-14/, 'line sections are included')
  assert.match(markdown, /Documento generado por Electro-cálculos/, 'footer')
})

test('markdown escapes pipes inside cells so the table stays valid', () => {
  const markdown = buildMarkdownReport(report)

  assert.match(markdown, /Local \\\| 2/, 'pipes inside cell content are escaped')
  assert.doesNotMatch(markdown, /Local \| 2/, 'the raw pipe never breaks the table')
})

test('plain text export stays readable without markup', () => {
  const text = buildPlainTextReport(report)

  assert.match(text, /^INFORME DE PREVISIÓN DE CARGAS$/m, 'title in capitals')
  assert.match(text, /^  P1 · Viviendas: 5750 W$/m, 'four-digit values keep no separator, as es-ES does')
  assert.match(text, /TOTAL · Potencia total prevista: 14\.154 W/, 'totals carry their unit and grouping')
  assert.match(text, /^3\. LOCALES Y OFICINAS$/m, 'sections are capitalised')
  assert.match(text, /^  Local 1 · Industria · 12\.500 W$/m, 'rows are one line each')
  assert.match(text, /Documento generado por Electro-cálculos/, 'footer')
  assert.doesNotMatch(text, /^#/m, 'no markdown headings leak into the text file')
  assert.doesNotMatch(text, /^\|/m, 'no markdown tables leak into the text file')
})

test('both formats agree on the data they carry', () => {
  const markdown = buildMarkdownReport(report)
  const text = buildPlainTextReport(report)

  for (const value of ['Viviendas', 'Servicios generales', 'Potencia total prevista', 'Sección adoptada']) {
    assert.ok(markdown.includes(value), `markdown includes ${value}`)
    assert.ok(text.includes(value), `text includes ${value}`)
  }
})
