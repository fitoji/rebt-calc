'use client'

import { useMemo } from 'react'
import { Table2, X, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  COLUMN_BY_VARIANT,
  COLUMN_VALUES,
  GROUPING_FACTORS,
  METHODS,
  SECTIONS,
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
}

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

function NumberField({ id, label, value, suffix, step = 1, onChange }: {
  id: string
  label: string
  value: number
  suffix: string
  step?: number | string
  onChange: (value: number) => void
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="label">{label}</span>
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
    </label>
  )
}

function SelectField({ id, label, value, options, onChange }: {
  id: string
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="label">{label}</span>
      <select
        id={id}
        className="h-8 w-full rounded-lg border border-slate-200 bg-transparent px-2.5 text-sm text-slate-900"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
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
        <ResultRow label={`Iz de tabla (${result.circuits} circuito/s)`} value={result.tableCurrent == null ? '—' : `${fmt(result.tableCurrent)} A`} />
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

function VariantFields({ idPrefix, state, onChange }: {
  idPrefix: string
  state: LineState
  onChange: (patch: Partial<LineState>) => void
}) {
  return (
    <>
      <SelectField
        id={`${idPrefix}-method`}
        label="Método de instalación"
        value={state.method}
        options={METHODS.map(method => ({ value: method, label: METHOD_LABEL[method] }))}
        onChange={value => onChange({ method: value as InstallationMethod })}
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
      />
      <NumberField
        id={`${idPrefix}-circuits`}
        label="Circuitos en el mismo tubo"
        value={state.circuits}
        suffix="uds."
        onChange={value => onChange({ circuits: Math.max(1, Math.round(value)) })}
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

export function LgaPanel({ state, onChange, onOpenTables }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: () => void
}) {
  const result = useMemo(() => sizeLine({
    system: 'three-phase',
    powerW: state.powerW,
    voltageV: state.voltageV,
    cosPhi: state.cosPhi,
    lengthM: state.lengthM,
    maxDropPercent: state.maxDropPercent,
    gamma: state.gamma,
    variant: { method: state.method, loadedConductors: 3, insulation: state.insulation },
    circuits: state.circuits,
    protectionA: state.protectionA > 0 ? state.protectionA : null,
  }), [state])

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold">Línea General de Alimentación · ITC-BT-14</h3>
            <p className="mt-1 text-sm text-slate-500">Trifásica. Caída máxima 0,5 % en instalaciones con contadores centralizados.</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-auto shrink-0 gap-2 px-3 py-1.5" onClick={onOpenTables}>
            <Table2 data-icon="inline-start" /> Tabla
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="lga-power" label="Potencia prevista (P)" value={state.powerW} suffix="W" onChange={value => onChange({ powerW: value })} />
          <NumberField id="lga-voltage" label="Tensión entre fases" value={state.voltageV} suffix="V" onChange={value => onChange({ voltageV: value })} />
          <NumberField id="lga-cosphi" label="Factor de potencia (cos φ)" value={state.cosPhi} suffix="cos φ" step="0.01" onChange={value => onChange({ cosPhi: value })} />
          <NumberField id="lga-length" label="Longitud de la línea" value={state.lengthM} suffix="m" onChange={value => onChange({ lengthM: value })} />
          <NumberField id="lga-drop" label="Caída máxima admisible" value={state.maxDropPercent} suffix="%" step="0.1" onChange={value => onChange({ maxDropPercent: value })} />
          <NumberField id="lga-gamma" label="Conductividad (γ)" value={state.gamma} suffix="m/(Ω·mm²)" onChange={value => onChange({ gamma: value })} />
          <VariantFields idPrefix="lga" state={state} onChange={onChange} />
        </div>
      </section>
      <LineResult title="Resultado LGA" result={result} phaseLabel="Sección de fase normalizada" />
    </div>
  )
}

export function DiPanel({ state, onChange, onOpenTables }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: () => void
}) {
  const result = useMemo(() => sizeLine({
    system: 'single-phase',
    powerW: state.powerW,
    voltageV: state.voltageV,
    cosPhi: state.cosPhi,
    lengthM: state.lengthM,
    maxDropPercent: state.maxDropPercent,
    gamma: state.gamma,
    variant: { method: state.method, loadedConductors: 2, insulation: state.insulation },
    circuits: state.circuits,
    protectionA: state.protectionA > 0 ? state.protectionA : null,
  }), [state])

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
          <Button type="button" variant="outline" size="sm" className="h-auto shrink-0 gap-2 px-3 py-1.5" onClick={onOpenTables}>
            <Table2 data-icon="inline-start" /> Tabla
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="di-power" label="Potencia prevista (P)" value={state.powerW} suffix="W" onChange={value => onChange({ powerW: value })} />
          <NumberField id="di-voltage" label="Tensión fase-neutro" value={state.voltageV} suffix="V" onChange={value => onChange({ voltageV: value })} />
          <NumberField id="di-cosphi" label="Factor de potencia (cos φ)" value={state.cosPhi} suffix="cos φ" step="0.01" onChange={value => onChange({ cosPhi: value })} />
          <NumberField id="di-length" label="Longitud de la línea" value={state.lengthM} suffix="m" onChange={value => onChange({ lengthM: value })} />
          <NumberField id="di-drop" label="Caída máxima admisible" value={state.maxDropPercent} suffix="%" step="0.1" onChange={value => onChange({ maxDropPercent: value })} />
          <NumberField id="di-gamma" label="Conductividad (γ)" value={state.gamma} suffix="m/(Ω·mm²)" step="0.1" onChange={value => onChange({ gamma: value })} />
          <VariantFields idPrefix="di" state={state} onChange={onChange} />
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

export function LineTablesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const columnValues = COLUMN_VALUES as Record<number, (number | null)[]>
  const columns = Object.keys(COLUMN_VALUES).map(Number)
  const variantsByColumn = new Map<number, string[]>()
  for (const [key, column] of Object.entries(COLUMN_BY_VARIANT)) {
    const [method, conductors, insulation] = key.split('|')
    variantsByColumn.set(column, [...(variantsByColumn.get(column) ?? []), `${method} ${conductors}x ${insulation}`])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl ring-0 gap-0 sm:max-w-5xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-xl font-bold text-slate-950">Tablas de referencia · ITC-BT-19</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              Intensidades admisibles para cobre, instalaciones no enterradas, 40 °C de temperatura ambiente. Reproduce la Tabla A.52-1bis de la UNE 20460-5-523:2004 tal como aparece en la Guía-BT-19 del Ministerio de Industria (feb 09, rev. 2).
            </DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tablas de referencia" />}><X /></DialogClose>
        </div>

        <h4 className="mb-2 text-sm font-semibold text-slate-700">Intensidades admisibles (A)</h4>
        <div className="overflow-x-auto">
          <Table className="min-w-[860px] text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 py-2">Sección mm²</TableHead>
                {columns.map(column => <TableHead key={column} className="px-2 py-2 text-right">Col. {column}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {SECTIONS.map((section, index) => (
                <TableRow key={section}>
                  <TableCell className="px-2 py-1.5 font-medium tabular-nums">{fmt(section, 1)}</TableCell>
                  {columns.map(column => {
                    const value = columnValues[column][index]
                    return <TableCell key={column} className="px-2 py-1.5 text-right tabular-nums">{value == null ? '—' : fmt(value)}</TableCell>
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <h4 className="mt-5 mb-2 text-sm font-semibold text-slate-700">Qué variante usa cada columna</h4>
        <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map(column => (
            <p key={column}><b className="text-slate-900">Col. {column}:</b> {variantsByColumn.get(column)?.join(' · ')}</p>
          ))}
        </div>

        <h4 className="mt-5 mb-2 text-sm font-semibold text-slate-700">Factor de reducción por agrupamiento</h4>
        <p className="mb-2 text-xs text-slate-500">Tabla E de la Guía-BT-19: circuitos empotrados o embutidos. Para un número de circuitos no tabulado se toma la columna siguiente.</p>
        <div className="overflow-x-auto">
          <Table className="min-w-[520px] text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="px-2 py-2">Circuitos</TableHead>
                {GROUPING_FACTORS.map(entry => <TableHead key={entry.circuits} className="px-2 py-2 text-right">{entry.circuits}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="px-2 py-1.5 font-medium">Factor</TableCell>
                {GROUPING_FACTORS.map(entry => <TableCell key={entry.circuits} className="px-2 py-1.5 text-right tabular-nums">{fmt(entry.factor, 2)}</TableCell>)}
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Los valores son para 40 °C de temperatura ambiente. La corrección por temperatura distinta de 40 °C no está incluida en esta tabla: la Guía-BT-19 remite a la UNE 20460-5-523. En la fila de 400 mm² los valores publicados de las columnas 9 y 10 rompen la progresión y se muestran tal cual aparecen en el documento oficial.
        </p>
      </DialogContent>
    </Dialog>
  )
}
