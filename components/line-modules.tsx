'use client'

import { useMemo } from 'react'
import { Table2, X, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  BURIED_CABLE_SPACING,
  BURIED_TUBE_CURRENT,
  COLUMN_BY_VARIANT,
  COLUMN_VALUES,
  GROUPING_COUNTS,
  GROUPING_LAYOUTS,
  LAYER_FACTORS,
  METHODS,
  SECTIONS,
  SOIL_RESISTIVITY,
  TUBES_CONTACT_AIR,
  TUBES_CONTACT_BURIED,
} from '@/lib/cable-tables.mjs'
import { sizeLine } from '@/lib/line-sizing.mjs'

export type InstallationMethod = (typeof METHODS)[number]
export type Insulation = 'PVC' | 'XLPE'

export type LineState = {
  powerW: number
  voltageV: number
  cosPhi: number
  lengthM: number
  maxDropPercent: number
  gamma: number
  method: InstallationMethod
  insulation: Insulation
  circuits: number
  protectionA: number
  neutralSection: number
  peSection: number
  controlSection: number
  tubeDiameter: number
  installation: 'air' | 'buried'
  layout: GroupingLayout
  layers: number
  tubes: number
}

export type GroupingLayout = keyof typeof GROUPING_LAYOUTS | 'tubes-air'

/** Tables of the ITC-BT-19 guide that a control can reference. */
export type TableKey = 'A' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'

const fmt = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

const METHOD_LABEL: Record<InstallationMethod, string> = {
  A1: 'A1 · tubo empotrado en pared aislante (conductores sueltos)',
  A2: 'A2 · tubo empotrado en pared aislante (cable multiconductor)',
  B1: 'B1 · tubo empotrado en obra o en superficie (conductores sueltos)',
  B2: 'B2 · tubo empotrado en obra o en superficie (cable multiconductor)',
  C: 'C · cable multiconductor sobre pared',
  E: 'E · cable multiconductor al aire',
  F: 'F · conductores sueltos al aire',
}

/** ITC-BT-18 table 2: protective conductor cross-section. */
export function protectiveSection(phaseSection: number) {
  if (phaseSection <= 16) return phaseSection
  if (phaseSection <= 35) return 16
  return Math.ceil(phaseSection / 2)
}

function FieldRow({ htmlFor, text, tables, onOpenTables }: {
  htmlFor: string
  text: string
  tables?: TableKey[]
  onOpenTables?: (tables: TableKey[]) => void
}) {
  return (
    <span className="mb-1 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="label mb-0">{text}</label>
      {tables && onOpenTables && (
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-cyan-500 hover:text-cyan-700"
          aria-label={`Ver ${tables.length > 1 ? 'tablas' : 'tabla'} ${tables.join(', ')}`}
          onClick={() => onOpenTables(tables)}
        >
          <Table2 className="size-3" /> {tables.join('·')}
        </button>
      )}
    </span>
  )
}

function NumberField({ id, label, value, suffix, step = 1, onChange, tables, onOpenTables }: {
  id: string
  label: string
  value: number
  suffix: string
  step?: number | string
  onChange: (value: number) => void
  tables?: TableKey[]
  onOpenTables?: (tables: TableKey[]) => void
}) {
  return (
    <div className="block">
      <FieldRow htmlFor={id} text={label} tables={tables} onOpenTables={onOpenTables} />
      <span className="relative block">
        <Input
          id={id}
          className="pr-20"
          type="number"
          min="0"
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={event => onChange(Number(event.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1.5 text-xs text-slate-400">{suffix}</span>
      </span>
    </div>
  )
}

function SelectField({ id, label, value, options, onChange, tables, onOpenTables }: {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  tables?: TableKey[]
  onOpenTables?: (tables: TableKey[]) => void
}) {
  return (
    <div className="block">
      <FieldRow htmlFor={id} text={label} tables={tables} onOpenTables={onOpenTables} />
      <select
        id={id}
        className="h-8 w-full rounded-lg border border-slate-200 bg-transparent px-2.5 text-sm text-slate-900"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  )
}

function ResultRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <strong className={strong ? 'tabular-nums text-cyan-300' : 'tabular-nums'}>{value}</strong>
    </div>
  )
}

function LineResult({ title, result, phaseLabel }: {
  title: string
  result: ReturnType<typeof sizeLine>
  phaseLabel: string
}) {
  return (
    <aside className="rounded-2xl bg-slate-950 p-6 text-white shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{title}</p>
      <p className="mt-5 text-4xl font-bold tabular-nums">
        {result.finalSection == null ? '—' : fmt(result.finalSection)}
        <span className="ml-1 text-lg font-medium text-slate-400">mm²</span>
      </p>
      <p className="mt-1 text-sm text-slate-400">{phaseLabel}</p>
      <div className="my-5 h-px bg-white/10" />
      <div className="flex flex-col gap-3 text-sm">
        <ResultRow label="Intensidad de línea (Ib)" value={`${fmt(result.ratedCurrent, 2)} A`} />
        <ResultRow label="Sección por caída" value={`${fmt(result.sectionByDrop, 2)} mm²`} />
        <ResultRow label="Iz de tabla" value={result.tableCurrent == null ? '—' : `${fmt(result.tableCurrent)} A`} />
        <ResultRow label="Factor de agrupamiento" value={fmt(result.groupingFactor, 2)} />
        <ResultRow label="Iz corregida" value={result.correctedCurrent == null ? '—' : `${fmt(result.correctedCurrent, 1)} A`} />
        <ResultRow label="Caída resultante" value={result.dropPercent == null ? '—' : `${fmt(result.dropPercent, 2)} %`} />
        <ResultRow label="Protección (In)" value={result.protection == null ? '—' : `${fmt(result.protection)} A`} strong />
      </div>
      {result.problems.length > 0 && (
        <div className="mt-5 rounded-lg bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">
          <p className="mb-1 flex items-center gap-1.5 font-semibold"><TriangleAlert className="size-3.5" /> Revisá estos puntos</p>
          <ul className="list-disc space-y-1 pl-4">
            {result.problems.map(problem => <li key={problem}>{problem}</li>)}
          </ul>
        </div>
      )}
    </aside>
  )
}

function VariantFields({ idPrefix, state, onChange, onOpenTables }: {
  idPrefix: string
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables: TableKey[]) => void
}) {
  return (
    <>
      <SelectField
        id={`${idPrefix}-installation`}
        label="Tipo de instalación"
        value={state.installation}
        options={[
          { value: 'air', label: 'Al aire · Tabla A' },
          { value: 'buried', label: 'Enterrada bajo tubo · Tabla D' },
        ]}
        onChange={value => onChange({ installation: value as 'air' | 'buried' })}
        tables={['A', 'D']}
        onOpenTables={onOpenTables}
      />
      <SelectField
        id={`${idPrefix}-layout`}
        label="Disposición de los circuitos"
        value={state.layout}
        options={[
          ...Object.entries(GROUPING_LAYOUTS).map(([value, entry]) => ({ value, label: `${entry.label} · Tabla E` })),
          { value: 'tubes-air', label: 'Tubos en contacto al aire · Tabla G' },
        ]}
        onChange={value => onChange({ layout: value as GroupingLayout })}
        tables={['E', 'G']}
        onOpenTables={onOpenTables}
      />
      <SelectField
        id={`${idPrefix}-method`}
        label="Método de instalación"
        value={state.method}
        options={METHODS.map(method => ({ value: method, label: METHOD_LABEL[method] }))}
        onChange={value => onChange({ method: value as InstallationMethod })}
        tables={['A']}
        onOpenTables={onOpenTables}
      />
      <SelectField
        id={`${idPrefix}-insulation`}
        label="Aislamiento"
        value={state.insulation}
        options={[
          { value: 'PVC', label: 'PVC · 70 °C' },
          { value: 'XLPE', label: 'XLPE / EPR · 90 °C' },
        ]}
        onChange={value => onChange({ insulation: value as Insulation })}
        tables={['A']}
        onOpenTables={onOpenTables}
      />
      <NumberField
        id={`${idPrefix}-circuits`}
        label="Circuitos agrupados"
        value={state.circuits}
        suffix="uds."
        onChange={value => onChange({ circuits: Math.max(1, Math.round(value)) })}
        tables={['E']}
        onOpenTables={onOpenTables}
      />
      <NumberField
        id={`${idPrefix}-layers`}
        label="Capas"
        value={state.layers}
        suffix="uds."
        onChange={value => onChange({ layers: Math.max(1, Math.round(value)) })}
        tables={['E', 'F', 'G', 'I']}
        onOpenTables={onOpenTables}
      />
      <NumberField
        id={`${idPrefix}-tubes`}
        label="Tubos en horizontal (contacto)"
        value={state.tubes}
        suffix="uds."
        onChange={value => onChange({ tubes: Math.max(1, Math.round(value)) })}
        tables={['G', 'H', 'I']}
        onOpenTables={onOpenTables}
      />
      <NumberField
        id={`${idPrefix}-protection`}
        label="Protección ya elegida (0 = automática)"
        value={state.protectionA}
        suffix="A"
        onChange={value => onChange({ protectionA: Math.max(0, value) })}
      />
    </>
  )
}

function groupingFor(state: LineState) {
  if (state.installation === 'buried') {
    return state.tubes > 1
      ? { kind: 'tubes-buried' as const, tubes: state.tubes, layers: state.layers }
      : { kind: 'buried-cables' as const, cables: Math.max(2, state.circuits), spacing: 0 }
  }
  if (state.layout === 'tubes-air') {
    return { kind: 'tubes-air' as const, tubes: state.tubes, layers: state.layers }
  }
  return { layout: state.layout, circuits: state.circuits, layers: state.layers }
}

/**
 * Sizing result for a line module. Shared by the panels, the JSON export and
 * the PDF so all three report the same numbers.
 */
export function computeLine(state: LineState, system: 'three-phase' | 'single-phase') {
  return sizeLine({
    system,
    powerW: state.powerW,
    voltageV: state.voltageV,
    cosPhi: state.cosPhi,
    lengthM: state.lengthM,
    maxDropPercent: state.maxDropPercent,
    gamma: state.gamma,
    variant: {
      method: state.method,
      loadedConductors: system === 'three-phase' ? 3 : 2,
      insulation: state.insulation,
    },
    installation: state.installation,
    grouping: groupingFor(state),
    circuits: state.circuits,
    protectionA: state.protectionA > 0 ? state.protectionA : null,
  })
}

export function LgaPanel({ state, onChange, onOpenTables }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables?: TableKey[]) => void
}) {
  const result = useMemo(() => computeLine(state, 'three-phase'), [state])

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold">Línea General de Alimentación · ITC-BT-14</h3>
            <p className="mt-1 text-sm text-slate-500">Trifásica. Caída máxima 0,5 % en instalaciones con contadores centralizados.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-auto shrink-0 gap-2 px-3 py-1.5" onClick={() => onOpenTables()}>
            <Table2 data-icon="inline-start" /> Tablas
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="lga-power" label="Potencia prevista (P)" value={state.powerW} suffix="W" onChange={value => onChange({ powerW: value })} />
          <NumberField id="lga-voltage" label="Tensión entre fases" value={state.voltageV} suffix="V" onChange={value => onChange({ voltageV: value })} />
          <NumberField id="lga-cosphi" label="Factor de potencia (cos φ)" value={state.cosPhi} suffix="cos φ" step="0.01" onChange={value => onChange({ cosPhi: value })} />
          <NumberField id="lga-length" label="Longitud de la línea" value={state.lengthM} suffix="m" onChange={value => onChange({ lengthM: value })} />
          <NumberField id="lga-drop" label="Caída máxima admisible" value={state.maxDropPercent} suffix="%" step="0.1" onChange={value => onChange({ maxDropPercent: value })} />
          <NumberField id="lga-gamma" label="Conductividad (γ)" value={state.gamma} suffix="m/(Ω·mm²)" onChange={value => onChange({ gamma: value })} />
          <VariantFields idPrefix="lga" state={state} onChange={onChange} onOpenTables={onOpenTables} />
        </div>
      </section>
      <LineResult title="Resultado LGA" result={result} phaseLabel="Sección de fase normalizada" />
    </div>
  )
}

export function DiPanel({ state, onChange, onOpenTables }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables?: TableKey[]) => void
}) {
  const result = useMemo(() => computeLine(state, 'single-phase'), [state])

  const phase = result.finalSection
  const pe = phase == null ? state.peSection : protectiveSection(phase)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold">Derivación Individual · ITC-BT-15</h3>
            <p className="mt-1 text-sm text-slate-500">Monofásica. Caída máxima 1,5 % con contadores centralizados, 4,5 % con contador individual.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-auto shrink-0 gap-2 px-3 py-1.5" onClick={() => onOpenTables()}>
            <Table2 data-icon="inline-start" /> Tablas
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="di-power" label="Potencia prevista (P)" value={state.powerW} suffix="W" onChange={value => onChange({ powerW: value })} />
          <NumberField id="di-voltage" label="Tensión fase-neutro" value={state.voltageV} suffix="V" onChange={value => onChange({ voltageV: value })} />
          <NumberField id="di-cosphi" label="Factor de potencia (cos φ)" value={state.cosPhi} suffix="cos φ" step="0.01" onChange={value => onChange({ cosPhi: value })} />
          <NumberField id="di-length" label="Longitud de la línea" value={state.lengthM} suffix="m" onChange={value => onChange({ lengthM: value })} />
          <NumberField id="di-drop" label="Caída máxima admisible" value={state.maxDropPercent} suffix="%" step="0.1" onChange={value => onChange({ maxDropPercent: value })} />
          <NumberField id="di-gamma" label="Conductividad (γ)" value={state.gamma} suffix="m/(Ω·mm²)" step="0.1" onChange={value => onChange({ gamma: value })} />
          <VariantFields idPrefix="di" state={state} onChange={onChange} onOpenTables={onOpenTables} />
          <NumberField id="di-neutral" label="Neutro" value={phase ?? state.neutralSection} suffix="mm²" onChange={value => onChange({ neutralSection: value })} />
          <NumberField id="di-pe" label="Conductor de protección (PE)" value={pe} suffix="mm²" onChange={value => onChange({ peSection: value })} />
          <NumberField id="di-control" label="Fil de comandament" value={state.controlSection} suffix="mm²" step="0.1" onChange={value => onChange({ controlSection: value })} />
          <NumberField id="di-tube" label="Diámetro del tubo protector" value={state.tubeDiameter} suffix="mm" onChange={value => onChange({ tubeDiameter: value })} />
        </div>
      </section>
      <LineResult title="Resultado DI" result={result} phaseLabel="Sección de fase normalizada" />
    </div>
  )
}

function SimpleTable({ head, rows, minWidth = 0 }: {
  head: (string | number)[]
  rows: (string | number | null)[][]
  minWidth?: number
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-xs" style={minWidth ? { minWidth } : undefined}>
        <TableHeader>
          <TableRow>
            {head.map((cell, index) => <TableHead key={index} className="whitespace-nowrap px-2 py-2">{cell}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                  {cell == null ? '—' : cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function LineTablesDialog({ open, onOpenChange, tables }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tables?: TableKey[]
}) {
  const shows = (key: TableKey) => !tables || tables.includes(key)
  const columnValues = COLUMN_VALUES as Record<number, (number | null)[]>
  const columns = Object.keys(COLUMN_VALUES).map(Number)

  const variantsByColumn = new Map<number, string[]>()
  for (const [key, column] of Object.entries(COLUMN_BY_VARIANT)) {
    const [method, conductors, insulation] = key.split('|')
    variantsByColumn.set(column, [...(variantsByColumn.get(column) ?? []), `${method} ${conductors}x ${insulation}`])
  }

  const sectionRows = SECTIONS.map((section, index) => [
    fmt(section, 1),
    ...columns.map(column => {
      const value = columnValues[column][index]
      return value == null ? null : fmt(value)
    }),
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl ring-0 gap-0 sm:max-w-5xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-950">Tablas de referencia · ITC-BT-19</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              Guía-BT-19 del Ministerio de Industria, Turismo y Comercio (feb 09, rev. 2). Reproduce las tablas de la UNE 20460-5-523:2004 que la instrucción aplica.
            </DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tablas de referencia" />}><X /></DialogClose>
        </div>

        {shows('A') && (
          <>
            <h4 className="mb-2 text-sm font-semibold text-slate-700">Tabla A · Intensidades admisibles (A) — cobre, no enterrado, 40 °C de ambiente</h4>
            <SimpleTable
              head={['Sección mm²', ...columns.map(column => `Col. ${column}`)]}
              rows={sectionRows}
              minWidth={860}
            />
            <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
              {columns.map(column => (
                <p key={column}><b className="text-slate-900">Col. {column}:</b> {variantsByColumn.get(column)?.join(' · ')}</p>
              ))}
            </div>
          </>
        )}

        {shows('D') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Tabla D · Enterrado bajo tubo (A) — XLPE</h4>
            <SimpleTable
              head={['Sección mm²', 'Cu 3x', 'Al 3x', 'Cu 2x', 'Al 2x']}
              rows={SECTIONS.map((section, index) => [
                fmt(section, 1),
                ...(['copper', 'aluminium'] as const).flatMap(material => ([3, 2] as const).map(loaded =>
                  BURIED_TUBE_CURRENT[material][loaded][index] == null ? null : fmt(BURIED_TUBE_CURRENT[material][loaded][index] as number))),
              ])}
            />
            <p className="mt-1 text-xs text-slate-500">Condiciones de cálculo: resistividad térmica del terreno 1,5 K·m/W, temperatura del terreno 25 °C, profundidad 70 cm.</p>
          </>
        )}

        {shows('E') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Tabla E · Factor de reducción por agrupamiento de circuitos</h4>
            <SimpleTable
              head={['Disposición', ...GROUPING_COUNTS.map(String)]}
              rows={Object.values(GROUPING_LAYOUTS).map(layout => [
                layout.label,
                ...GROUPING_COUNTS.map((count, index) => {
                  const limit = layout.cappedAtNine ? 9 : Infinity
                  if (count > limit) return null
                  return fmt(layout.factors[index], 2)
                }),
              ])}
              minWidth={720}
            />
            <p className="mt-1 text-xs text-slate-500">En las disposiciones 2 a 5 no hay reducción adicional por encima de 9 circuitos: se mantiene el valor de 9.</p>
          </>
        )}

        {shows('F') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Tabla F · Factor adicional por varias capas</h4>
            <SimpleTable
              head={['Capas', ...LAYER_FACTORS.map(entry => String(entry.layers))]}
              rows={[['Factor', ...LAYER_FACTORS.map(entry => fmt(entry.factor, 2))]]}
            />
          </>
        )}

        {shows('G') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Tabla G · Tubos en contacto, al aire</h4>
            <SimpleTable
              head={['Capas \\ Tubos', 1, 2, 3, 4, 5, 6]}
              rows={TUBES_CONTACT_AIR.map((row, index) => [index + 1, ...row.map(value => fmt(value, 2))])}
            />
          </>
        )}

        {shows('I') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Tabla I · Tubos en contacto, enterrados o embebidos en hormigón</h4>
            <SimpleTable
              head={['Capas \\ Tubos', 1, 2, 3, 4, 5, 6]}
              rows={Object.entries(TUBES_CONTACT_BURIED).map(([tubes, row]) => [tubes, ...row.map(value => fmt(value, 2))])}
            />
            <p className="mt-1 text-xs text-slate-500">Las filas son el número de tubos en horizontal (de 2 a 6); las columnas, el número de capas verticales.</p>
          </>
        )}

        {shows('H') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Tabla H · Cables multiconductores en tubos enterrados, uno por tubo</h4>
            <SimpleTable
              head={['Cables', ...BURIED_CABLE_SPACING.spacings.map(spacing => spacing === 0 ? 'Contacto' : `${fmt(spacing, 2)} m`)]}
              rows={Object.entries(BURIED_CABLE_SPACING.factors).map(([cables, row]) => [cables, ...row.map(value => fmt(value, 2))])}
            />
          </>
        )}

        {shows('C') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-slate-700">Tabla C · Resistividad térmica del terreno</h4>
            <SimpleTable
              head={['Terreno', 'K·m/W']}
              rows={SOIL_RESISTIVITY.map(entry => [entry.terrain, fmt(entry.value, 2)])}
            />
          </>
        )}

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Los valores de la Tabla A son para 40 °C de temperatura ambiente. La corrección por temperatura distinta de 40 °C no está incluida en la guía: remite a la UNE 20460-5-523. En la fila de 400 mm² los valores publicados de las columnas 9 y 10 rompen la progresión y se muestran tal cual aparecen en el documento oficial.
        </p>
      </DialogContent>
    </Dialog>
  )
}
