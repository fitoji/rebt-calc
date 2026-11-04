'use client'

import { useMemo, type ReactNode } from 'react'
import { Info, Table2, TriangleAlert, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BoeLink, BOE_REBT, SourceNote } from '@/components/source-note'
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
import { lineInputFromState, gammaFor, insulationFor } from '@/lib/line-state.mjs'
import { formatPower, powerFieldValue, storePower } from '../lib/power-units.mjs'
import { lgaNeutralSection, protectiveSection } from '@/lib/conductor-sections.mjs'
import { GUIDE_TABLES } from '@/lib/guide-tables.mjs'
import { explainLineCalculation } from '@/lib/calculation-explanations.mjs'
import { CalculationSteps, type ExplanationStep } from '@/components/calculation-steps'
import { INSTALLATION_SCENARIOS, limitsForInstallation, mismatchesLimit, type InstallationType } from '@/lib/installation-config.mjs'

export type InstallationMethod = (typeof METHODS)[number]
export type Insulation = 'PVC' | 'XLPE'
export type ExplanationMode = 'calculation' | 'didactic'

/**
 * Colores de identificación de conductores de la ITC-BT-19 §2.2. Son colores
 * físicos del cable, no tokens de tema: por eso van en línea y siempre con el
 * nombre escrito debajo. El RZ1-K unipolar de 0,6/1 kV se fabrica sin
 * coloración, así que la identificación se coloca en los extremos (Guía-BT-19).
 *
 * `swatch` es el color real del cable; `panel` es el mismo tono aclarado lo
 * justo para que un filete de 3 px se lea sobre el panel de resultados, que es
 * casi negro: un marrón a su luminosidad física desaparecería ahí. El filete no
 * es una muestra de color —el nombre va debajo—, así que la fidelidad del tono
 * pesa menos que la lectura.
 */
const CONDUCTOR_COLORS = {
  brown: { name: 'Marrón', swatch: '#7b4a2d', panel: '#c07a4a' },
  black: { name: 'Negro', swatch: '#202226', panel: '#7d8590' },
  grey: { name: 'Gris', swatch: '#9ba3ac', panel: '#c3cad2' },
  blue: { name: 'Azul', swatch: '#3b7dd8', panel: '#6aa4ec' },
  greenYellow: {
    name: 'Verde-amarillo',
    swatch: 'repeating-linear-gradient(135deg, #1f9d55 0 4px, #f4c430 4px 8px)',
    panel: 'repeating-linear-gradient(90deg, #2fbd72 0 5px, #f2cf4a 5px 10px)',
  },
  red: { name: 'Rojo', swatch: '#b3261e', panel: '#f0706a' },
} as const

type ConductorColor = (typeof CONDUCTOR_COLORS)[keyof typeof CONDUCTOR_COLORS]

type ResultElement = { element: string; detail: string; colors?: readonly ConductorColor[] }

const PHASES = [CONDUCTOR_COLORS.brown, CONDUCTOR_COLORS.black, CONDUCTOR_COLORS.grey]

/** Subrayado del conductor: sólido si tiene un color, por tramos si son varios. */
function colorRule(colors: readonly ConductorColor[]) {
  if (colors.length === 1) return { background: colors[0].panel }
  const segment = 100 / colors.length
  const stops = colors.map((color, index) => `${color.panel} ${index * segment}% ${(index + 1) * segment}%`)
  return { background: `linear-gradient(90deg, ${stops.join(', ')})` }
}

export type LineState = {
  powerW: number
  voltageV: number
  cosPhi: number
  lengthM: number
  maxDropPercent: number
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
  /** Sección de fase fijada a mano (0 = la que propone el cálculo). */
  sectionOverride?: number
  /** IGA del escalón de potencia de la vivienda; solo en derivaciones de vivienda. */
  housingIgaA?: number
}

export type GroupingLayout = keyof typeof GROUPING_LAYOUTS | 'tubes-air'

/** Reference tables a control can open: ITC-BT-19 plus the LGA and DI guides. */
export type TableKey =
  | 'A' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'
  | 'BT14-A' | 'BT14-B' | 'BT14-1' | 'BT15-C' | 'BT15-D' | 'BT15-E'

const fmt = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

/**
 * Same format, without the padding: a current of 202 A is not "202,0 A". The
 * trailing zero claims a precision the number does not have and clashes with
 * Ib, which is genuinely fractional. Documents keep the fixed decimals because
 * they align in columns; what a person reads on the card does not.
 */
const fmtTrim = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(value)

const METHOD_LABEL: Record<InstallationMethod, string> = {
  A1: 'A1 · tubo empotrado en pared aislante (conductores sueltos)',
  A2: 'A2 · tubo empotrado en pared aislante (cable multiconductor)',
  B1: 'B1 · tubo empotrado en obra o en superficie (conductores sueltos)',
  B2: 'B2 · tubo empotrado en obra o en superficie (cable multiconductor)',
  C: 'C · cable multiconductor sobre pared',
  E: 'E · cable multiconductor al aire',
  F: 'F · conductores sueltos al aire',
}

export { protectiveSection }

function FieldRow({ htmlFor, text, tables, onOpenTables }: {
  htmlFor: string
  text: ReactNode
  tables?: TableKey[]
  onOpenTables?: (tables: TableKey[]) => void
}) {
  return (
    <span className="mb-1 flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="label mb-0">{text}</label>
      {tables && onOpenTables && (
        <button
          type="button"
          className="flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-faint transition-colors hover:border-brand-mark hover:text-brand"
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
  label: ReactNode
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
        <span className="pointer-events-none absolute right-3 top-1.5 text-xs text-ink-faint">{suffix}</span>
      </span>
    </div>
  )
}

/**
 * Conductivity is not a user decision: the anexo 2 of the Guía del REBT asks
 * for the value at the maximum service temperature of the insulation, so the
 * panel shows the value the engine is using instead of an editable field.
 */
function ConductivityField({ idPrefix, state, role }: { idPrefix: string; state: LineState; role: 'lga' | 'di' }) {
  const maxServiceTemperature = insulationFor(state, role) === 'XLPE' ? 90 : 70

  return (
    <div>
      <span className="label mb-1 block">Conductividad (<span className="label-symbol">γ</span>)</span>
      <p id={`${idPrefix}-gamma`} className="rounded-control border border-line bg-surface-muted px-3 py-2 text-sm tabular-nums">
        {fmt(gammaFor(state, role))} m/(Ω·mm²)
      </p>
      <p className="mt-1 text-xs text-ink-faint">Cobre a {maxServiceTemperature} °C · Anexo 2 de la Guía del REBT</p>
    </div>
  )
}

function SelectField({ id, label, value, options, onChange, tables, onOpenTables }: {
  id: string
  label: ReactNode
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
        className="h-8 w-full rounded-control border border-line bg-transparent px-2.5 text-sm text-ink-strong"
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
      <span className="text-panel-muted">{label}</span>
      <strong className={strong ? 'tabular-nums text-brand-on-panel' : 'tabular-nums'}>{value}</strong>
    </div>
  )
}

function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="min-w-0 rounded-panel bg-panel p-6 text-panel-foreground shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-on-panel">{title}</p>
      {children}
    </aside>
  )
}

function ConductorList({ elements }: { elements: ResultElement[] }) {
  return (
    <>
      <ul className="divide-y divide-panel-line">
        {elements.map(item => (
          <li key={item.element} className="py-3 first:pt-0 last:pb-0">
            <span className="inline-block max-w-full align-top">
              <span className="block text-xs font-medium text-panel-foreground">{item.element}</span>
              {item.colors && item.colors.length > 0 && (
                <span aria-hidden="true" className="mt-1.5 block h-[3px] w-full rounded-full" style={colorRule(item.colors)} />
              )}
            </span>
            {item.colors && item.colors.length > 0 && (
              <p className="mt-1 text-[11px] leading-4 text-panel-muted">{item.colors.map(color => color.name).join(' · ')}</p>
            )}
            <p className="mt-1.5 text-xs leading-5 tabular-nums text-panel-foreground">{item.detail}</p>
          </li>
        ))}
      </ul>
      {elements.some(item => item.colors) && (
        <p className="mt-3 text-[11px] leading-4 text-panel-muted">Colores de identificación según la ITC-BT-19 §2.2. El RZ1-K unipolar de 0,6/1 kV se fabrica sin coloración: los colores se identifican en los extremos.</p>
      )}
    </>
  )
}

function ResultProblems({ problems }: { problems: string[] }) {
  if (problems.length === 0) return null

  return (
    <div role="status" aria-live="polite" className="mt-5 rounded-control bg-warning-mark/10 p-3 text-xs leading-5 text-warning-on-panel">
      <p className="mb-1 flex items-center gap-1.5 font-semibold"><TriangleAlert className="size-4" aria-hidden="true" /> Revisá estos puntos</p>
      <ul className="list-disc space-y-1 pl-4">
        {problems.map(problem => <li key={problem}>{problem}</li>)}
      </ul>
    </div>
  )
}

function LineResult({ title, result, phaseLabel, elements }: {
  title: string
  result: ReturnType<typeof sizeLine>
  phaseLabel: string
  elements?: ResultElement[]
}) {
  return (
    <ResultCard title={title}>
      <p className="mt-5 text-4xl font-bold tabular-nums">
        {result.finalSection == null ? '—' : fmt(result.finalSection)}
        <span className="ml-1 text-lg font-medium text-panel-muted">mm²</span>
      </p>
      <p className="mt-1 text-sm text-panel-muted">{phaseLabel}</p>
      <div className="my-5 h-px bg-panel-line" />
      <div className="flex flex-col gap-3 text-sm">
        <ResultRow label="Intensidad de cálculo (Ib)" value={`${fmtTrim(result.ratedCurrent, 2)} A`} />
        <ResultRow label="Sección por caída" value={`${fmt(result.sectionByDrop, 2)} mm²`} />
        <ResultRow label="Momento eléctrico (M)" value={`${fmt(result.momentKwM, 2)} kW·m`} />
        <ResultRow label="Conductividad (γ)" value={`${fmt(result.gamma)} m/(Ω·mm²)`} />
        <ResultRow label="Iz de tabla" value={result.tableCurrent == null ? '—' : `${fmt(result.tableCurrent)} A`} />
        <ResultRow label="Factor de agrupamiento" value={fmt(result.groupingFactor, 2)} />
        <ResultRow label="Iz corregida" value={result.correctedCurrent == null ? '—' : `${fmtTrim(result.correctedCurrent, 1)} A`} />
        <ResultRow label="Caída con Ib" value={result.dropPercent == null ? '—' : `${fmt(result.dropPercent, 2)} %`} />
        {result.dropPercentIn != null && (
          <ResultRow label={`Caída con In (${fmt(result.protection ?? 0)} A)`} value={`${fmt(result.dropPercentIn, 2)} %`} />
        )}
        <ResultRow label="Protección (In)" value={result.protection == null ? '—' : `${fmt(result.protection)} A`} strong />
        {result.housingIga != null && (
          <ResultRow label="IGA (tabla A) · potencia máxima" value={`${fmt(result.housingIga)} A · ${fmt(result.maxAdmissiblePowerW ?? 0)} W`} />
        )}
      </div>
      {result.housingIga != null && (
        <p className="mt-3 text-[11px] leading-4 text-panel-muted">El IGA no es el ICP: fija la potencia máxima admisible de la vivienda, no la potencia contratada.</p>
      )}
      {elements && elements.length > 0 && (
        <div className="mt-5 border-t border-panel-line pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-panel-muted">Elementos de la instalación</p>
          <ConductorList elements={elements} />
        </div>
      )}
      <ResultProblems problems={result.problems} />
    </ResultCard>
  )
}

/**
 * LGA result card.
 *
 * The line current leads because it is the question the section answers: Ib and the
 * corrected Iz sit together, and the section itself is a control, so a larger cable
 * can be adopted without leaving the card. The drop criterion moves next to the
 * conductors it sizes, instead of sharing the generic row list with the current one.
 */
function LgaResult({ state, result, elements, onChange }: {
  state: LineState
  result: ReturnType<typeof sizeLine>
  elements: ResultElement[]
  onChange: (section: number) => void
}) {
  const selectable = result.candidates
    .filter(candidate => result.autoSection == null
      ? candidate.section >= result.minimumSection
      : candidate.section > result.autoSection)
    .map(candidate => candidate.section)
  const selected = result.sectionOverride
  // A section fixed before the load changed can sit below the new automatic one.
  // Keep it in the list so the control never hides the value it is showing.
  const options = selected != null && !selectable.includes(selected)
    ? [selected, ...selectable].sort((a, b) => a - b)
    : selectable
  const automaticLabel = result.autoSection == null
    ? 'Automática · sin sección'
    : `Automática · ${fmt(result.autoSection)} mm²`
  const izBelow = result.correctedCurrent != null && result.correctedCurrent < result.ratedCurrent
  const dropOver = result.dropPercent != null && result.dropPercent > state.maxDropPercent
  const dropInOver = result.dropPercentIn != null && result.dropPercentIn > state.maxDropPercent

  return (
    <ResultCard title="Resultado LGA">
      <dl className="mt-5 divide-y divide-panel-line">
        <div className="flex items-center justify-between gap-4 pb-2.5">
          <dt className="text-xs leading-tight text-panel-muted">Intensidad de cálculo <span className="whitespace-nowrap">(Ib)</span></dt>
          <dd className="text-3xl font-bold tabular-nums">
            {fmtTrim(result.ratedCurrent, 2)}
            <span className="ml-1 text-base font-medium text-panel-muted">A</span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2.5">
          <dt className="text-xs leading-tight text-panel-muted">Intensidad admisible corregida <span className="whitespace-nowrap">(Iz)</span></dt>
          <dd className={izBelow ? 'text-3xl font-bold tabular-nums text-warning-on-panel' : 'text-3xl font-bold tabular-nums'}>
            {result.correctedCurrent == null
              ? '—'
              : <>{fmtTrim(result.correctedCurrent, 1)}<span className="ml-1 text-base font-medium text-panel-muted">A</span></>}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <label htmlFor="lga-section" className="text-xs font-semibold uppercase tracking-[0.15em] text-panel-muted">Sección de fase</label>
        <div className="mt-2 [&_button:hover]:bg-panel-edge/70! [&_button]:bg-panel-edge/50! [&_button]:shadow-none [&_button_svg]:text-panel-muted!">
          <Select
            value={selected == null ? 'auto' : String(selected)}
            onValueChange={next => { if (next != null) onChange(next === 'auto' ? 0 : Number(next)) }}
          >
            <SelectTrigger
              id="lga-section"
              aria-describedby="lga-section-hint"
              disabled={options.length === 0}
              className="h-9 w-full px-3 text-sm font-semibold text-panel-foreground"
            >
              <SelectValue>
                {(value: string | null) => value == null || value === 'auto' ? automaticLabel : `${fmt(Number(value))} mm²`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="max-h-64">
              <SelectGroup>
                <SelectItem value="auto">{automaticLabel}</SelectItem>
                {options.map(section => <SelectItem key={section} value={String(section)}>{fmt(section)} mm²</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <p id="lga-section-hint" className="mt-1.5 text-[11px] leading-4 text-panel-muted">
          {selected == null
            ? `Mínimo ${fmt(result.minimumSection)} mm² · ITC-BT-14 §3`
            : `Automática: ${result.autoSection == null ? 'sin sección' : `${fmt(result.autoSection)} mm²`} · mínimo ${fmt(result.minimumSection)} mm²`}
        </p>
      </div>

      <div className="mt-5 border-t border-panel-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-panel-muted">Conductores y caída de tensión</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-control border border-panel-line px-3 py-2.5">
          <div>
            <dt className="text-[11px] leading-4 text-panel-muted">Sección por caída</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {fmt(result.sectionByDrop, 2)}
              <span className="ml-1 font-normal text-panel-muted">mm²</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] leading-4 text-panel-muted">Caída con Ib</dt>
            <dd className={dropOver ? 'mt-0.5 text-sm font-semibold tabular-nums text-warning-on-panel' : 'mt-0.5 text-sm font-semibold tabular-nums'}>
              {result.dropPercent == null
                ? '—'
                : <>{fmt(result.dropPercent, 2)}<span className="ml-1 font-normal text-panel-muted">% de {formatLimit(state.maxDropPercent)}</span></>}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] leading-4 text-panel-muted">Momento eléctrico (M)</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {fmt(result.momentKwM, 2)}
              <span className="ml-1 font-normal text-panel-muted">kW·m</span>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] leading-4 text-panel-muted">Conductividad (γ)</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums">
              {fmt(result.gamma)}
              <span className="ml-1 font-normal text-panel-muted">m/(Ω·mm²)</span>
            </dd>
          </div>
        </dl>
        {result.dropPercentIn != null && (
          <p className={dropInOver ? 'mt-2 text-[11px] leading-4 text-warning-on-panel' : 'mt-2 text-[11px] leading-4 text-panel-muted'}>
            Caída con In ({fmt(result.protection ?? 0)} A): <strong className="tabular-nums">{fmt(result.dropPercentIn, 2)} %</strong>
            {result.protection != null && state.protectionA > 0 ? ' · criterio de la sección' : ' · informativa, la sección se elige con Ib'}
          </p>
        )}
        <div className="mt-3">
          <ConductorList elements={elements} />
        </div>
      </div>

      <div className="my-5 h-px bg-panel-line" />
      <div className="flex flex-col gap-3 text-sm">
        <ResultRow label="Iz de tabla" value={result.tableCurrent == null ? '—' : `${fmt(result.tableCurrent)} A`} />
        <ResultRow label="Factor de agrupamiento" value={fmt(result.groupingFactor, 2)} />
        <ResultRow label="Protección (In)" value={result.protection == null ? '—' : `${fmt(result.protection)} A`} strong />
      </div>
      <ResultProblems problems={result.problems} />
    </ResultCard>
  )
}

function VariantFields({ idPrefix, state, onChange, onOpenTables, role }: {
  idPrefix: string
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables: TableKey[]) => void
  role: 'lga' | 'di'
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
        tables={role === 'lga' ? ['BT14-A', 'BT14-B'] : ['BT15-C', 'BT15-D', 'BT15-E']}
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
      {role === 'lga' ? (
        <div>
          <span className="label mb-1 block">Aislamiento</span>
          <p className="rounded-control border border-line bg-surface-muted px-3 py-2 text-sm">XLPE / EPR · 90 °C · RZ1-K (AS)</p>
          <p className="mt-1 text-xs text-ink-faint">ITC-BT-14 §3 sólo admite RZ1-K o DZ1-K de 0,6/1 kV.</p>
        </div>
      ) : (
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
      )}
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

/**
 * Sizing result for a line module. Shared by the panels, the JSON export and
 * the PDF so all three report the same numbers.
 */
export function computeLine(state: LineState, system: 'three-phase' | 'single-phase', role: 'lga' | 'di') {
  return sizeLine(lineInputFromState(state, system, role))
}

function formatLimit(value: number) { return `${value.toString().replace('.', ',')} %` }

function InstallationField({ value, onChange, limit, configured }: { value: InstallationType; onChange: (type: InstallationType) => void; limit: number | null; configured: number }) {
  const mismatch = mismatchesLimit(limit, configured)

  return <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control bg-surface-muted px-3 py-2">
    <label htmlFor="installation-type" className="text-xs font-semibold text-ink-muted">Supuesto de enlace</label>
    <Select value={value} onValueChange={next => { if (next != null) onChange(String(next) as InstallationType) }}>
      <SelectTrigger id="installation-type" className="h-8 w-full min-w-0 text-xs sm:w-auto sm:min-w-[16rem]"><SelectValue>{(selected: string | null) => INSTALLATION_SCENARIOS.find(scenario => scenario.id === selected)?.label ?? 'Supuesto de enlace'}</SelectValue></SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="w-max max-w-[20rem]"><SelectGroup>{INSTALLATION_SCENARIOS.map(scenario => <SelectItem key={scenario.id} value={scenario.id}>{scenario.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
    {limit == null
      ? <span className="text-xs text-ink-faint">Este supuesto no tiene línea general.</span>
      : mismatch && <span className="flex items-center gap-1 text-xs font-semibold text-warning-ink"><TriangleAlert className="size-3.5" aria-hidden="true" />El supuesto fija {formatLimit(limit)}</span>}
  </div>
}

export function LgaPanel({ state, onChange, onOpenTables, showSourceNotes = true, installationType, onInstallationTypeChange, explanationMode = 'calculation', powerMode = 'auto', onPowerModeChange, loadTotal = 0, powerUnit = 'W' }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables?: TableKey[]) => void
  showSourceNotes?: boolean
  installationType: InstallationType
  onInstallationTypeChange: (type: InstallationType) => void
  explanationMode?: ExplanationMode
  powerMode?: 'auto' | 'manual'
  onPowerModeChange?: (mode: 'auto' | 'manual') => void
  loadTotal?: number
  powerUnit?: 'W' | 'kW'
}) {
  const result = useMemo(() => computeLine(state, 'three-phase', 'lga'), [state])
  const explanation = useMemo(() => explainLineCalculation(state, result, { system: 'three-phase', line: 'lga', powerUnit }), [state, result])
  const limits = limitsForInstallation(installationType)

  return (
    <>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_360px]">
      <section className="min-w-0 rounded-card border border-line bg-paper p-5 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-tab-lga" />Línea General de Alimentación</h3>
          <Button type="button" variant="outline" size="sm" className="h-auto shrink-0 gap-2 px-3 py-1.5" onClick={() => onOpenTables()}>
            <Table2 data-icon="inline-start" /> Tablas
          </Button>
        </div>
        <p className="mb-4 flex items-start gap-2 rounded-control bg-brand-soft p-3 text-xs leading-5 text-brand-ink"><Info data-icon="inline-start" className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>Trifásica. Caída máxima 0,5 % con contadores totalmente centralizados y 1 % con centralizaciones parciales.</span></p>
        <InstallationField value={installationType} onChange={onInstallationTypeChange} limit={limits.lga} configured={state.maxDropPercent} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-3 py-2"><span className="text-xs font-semibold text-ink-muted">{powerMode === 'auto' ? `Potencia automática desde la previsión: ${formatPower(loadTotal, powerUnit)}` : 'Potencia manual'}</span>{onPowerModeChange && <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => onPowerModeChange(powerMode === 'auto' ? 'manual' : 'auto')}>{powerMode === 'auto' ? 'Editar manual' : 'Volver a previsión'}</Button>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="lga-power" label="Potencia prevista (P)" value={powerFieldValue(state.powerW, powerUnit)} suffix={powerUnit} step={powerUnit === 'kW' ? '0.01' : '1'} onChange={value => onChange({ powerW: storePower(value, powerUnit) })} />
          <NumberField id="lga-voltage" label="Tensión entre fases" value={state.voltageV} suffix="V" onChange={value => onChange({ voltageV: value })} />
          <NumberField id="lga-cosphi" label={<>Factor de potencia (cos <span className="label-symbol">φ</span>)</>} value={state.cosPhi} suffix="cos φ" step="0.01" onChange={value => onChange({ cosPhi: value })} />
          <NumberField id="lga-length" label="Longitud de la línea" value={state.lengthM} suffix="m" onChange={value => onChange({ lengthM: value })} />
          <NumberField id="lga-drop" label="Caída máxima admisible" value={state.maxDropPercent} suffix="%" step="0.1" onChange={value => onChange({ maxDropPercent: value })} />
          <ConductivityField idPrefix="lga" state={state} role="lga" />
          <NumberField id="lga-tube" label="Diámetro del tubo protector" value={state.tubeDiameter} suffix="mm" onChange={value => onChange({ tubeDiameter: value })} />
          <VariantFields idPrefix="lga" state={state} onChange={onChange} onOpenTables={onOpenTables} role="lga" />
        </div>
        {showSourceNotes && <SourceNote label="ITC-BT-14 §3">ITC-BT-14 §3: caída máxima del 0,5 % con contadores totalmente centralizados y del 1 % con centralizaciones parciales; sección mínima de 10 mm² en cobre (16 mm² en aluminio) con independencia del número de fases; intensidad admisible según la tabla A (cobre) o B (aluminio) de la propia ITC-BT-14, que en las filas enterradas ya incluye el factor 0,8 de la ITC-BT-07, y la ITC-BT-19 cuando la combinación no está publicada. La instrucción sólo admite cable unipolar RZ1-K o DZ1-K (XLPE, 0,6/1 kV). <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}
      </section>
      <LgaResult state={state} result={result} onChange={section => onChange({ sectionOverride: section })} elements={[
        { element: 'Conductores de Fase (R, S, T)', detail: `3 x ${result.finalSection == null ? '—' : fmt(result.finalSection)} mm² Cu (${result.cableType})`, colors: PHASES },
        { element: 'Conductor Neutro (N)', detail: `1 x ${fmt(lgaNeutralSection(result.finalSection) ?? state.neutralSection)} mm² Cu (${result.cableType})`, colors: [CONDUCTOR_COLORS.blue] },
        { element: 'Conductor de Protección (PE)', detail: `1 x ${fmt(result.finalSection == null ? state.peSection : protectiveSection(result.finalSection))} mm² Cu (${result.cableType})`, colors: [CONDUCTOR_COLORS.greenYellow] },
        { element: 'Tubo protector empotrado', detail: `${fmt(state.tubeDiameter)} mm de diámetro exterior${result.minimumTube == null ? ' mínimo' : ` · tabla 1 pide ${fmt(result.minimumTube)} mm`}` },
      ]} />
    </div>
    {explanationMode === 'didactic' && <CalculationSteps steps={explanation.steps as ExplanationStep[]} />}
    </>
  )
}

export function DiPanel({ state, onChange, onOpenTables, showSourceNotes = true, installationType, onInstallationTypeChange, explanationMode = 'calculation', system = 'single-phase', editingLabel, powerUnit = 'W' }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables?: TableKey[]) => void
  showSourceNotes?: boolean
  installationType: InstallationType
  onInstallationTypeChange: (type: InstallationType) => void
  explanationMode?: ExplanationMode
  system?: 'single-phase' | 'three-phase'
  editingLabel?: string
  powerUnit?: 'W' | 'kW'
}) {
  const result = useMemo(() => computeLine(state, system, 'di'), [state, system])
  const explanation = useMemo(() => explainLineCalculation(state, result, { system, line: 'di', powerUnit }), [state, result, system])
  const limits = limitsForInstallation(installationType)

  const phase = result.finalSection
  const pe = phase == null ? state.peSection : protectiveSection(phase)

  return (
    <>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_360px]">
      <section className="min-w-0 rounded-card border border-line bg-paper p-5 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-tab-di" />Derivación Individual</h3>
              {editingLabel && <span className="max-w-full truncate rounded-control bg-tab-di-soft px-2 py-0.5 text-xs font-semibold text-tab-di-ink" title={editingLabel}>Editando: {editingLabel}</span>}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-auto shrink-0 gap-2 px-3 py-1.5" onClick={() => onOpenTables()}>
            <Table2 data-icon="inline-start" /> Tablas
          </Button>
        </div>
        <p className="mb-4 flex items-start gap-2 rounded-control bg-brand-soft p-3 text-xs leading-5 text-brand-ink"><Info data-icon="inline-start" className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{system === 'three-phase' ? 'Trifásica. Caída máxima 0,5 % con contadores concentrados en varios lugares, 1 % con contadores totalmente concentrados y 1,5 % en suministros de un único usuario sin LGA.' : 'Monofásica. Caída máxima 0,5 % con contadores concentrados en varios lugares, 1 % con contadores totalmente concentrados y 1,5 % en suministros de un único usuario sin LGA.'}</span></p>
        <InstallationField value={installationType} onChange={onInstallationTypeChange} limit={limits.di} configured={state.maxDropPercent} />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="di-power" label="Potencia prevista (P)" value={powerFieldValue(state.powerW, powerUnit)} suffix={powerUnit} step={powerUnit === 'kW' ? '0.01' : '1'} onChange={value => onChange({ powerW: storePower(value, powerUnit) })} />
          <NumberField id="di-voltage" label={system === 'three-phase' ? 'Tensión entre fases' : 'Tensión fase-neutro'} value={state.voltageV} suffix="V" onChange={value => onChange({ voltageV: value })} />
          <NumberField id="di-cosphi" label={<>Factor de potencia (cos <span className="label-symbol">φ</span>)</>} value={state.cosPhi} suffix="cos φ" step="0.01" onChange={value => onChange({ cosPhi: value })} />
          <NumberField id="di-length" label="Longitud de la línea" value={state.lengthM} suffix="m" onChange={value => onChange({ lengthM: value })} />
          <NumberField id="di-drop" label="Caída máxima admisible" value={state.maxDropPercent} suffix="%" step="0.1" onChange={value => onChange({ maxDropPercent: value })} />
          <ConductivityField idPrefix="di" state={state} role="di" />
          <VariantFields idPrefix="di" state={state} onChange={onChange} onOpenTables={onOpenTables} role="di" />
          <NumberField id="di-neutral" label="Neutro" value={phase ?? state.neutralSection} suffix="mm²" onChange={value => onChange({ neutralSection: value })} />
          <NumberField id="di-pe" label="Conductor de protección (PE)" value={pe} suffix="mm²" onChange={value => onChange({ peSection: value })} />
          <NumberField id="di-control" label="Hilo de mando" value={state.controlSection} suffix="mm²" step="0.1" onChange={value => onChange({ controlSection: value })} />
          <NumberField id="di-tube" label="Diámetro del tubo protector" value={state.tubeDiameter} suffix="mm" onChange={value => onChange({ tubeDiameter: value })} />
        </div>
        {showSourceNotes && <SourceNote label="ITC-BT-15 §3">ITC-BT-15 §3: caída máxima del 0,5 % con contadores concentrados en más de un lugar, del 1 % con contadores totalmente concentrados y del 1,5 % en suministros de un único usuario sin línea general; sección mínima de 6 mm² en cobre y 1,5 mm² para el hilo de mando, igual en monofásico y en trifásico; intensidad admisible según las tablas C, D y E de la propia ITC-BT-15 (E es el cable multiconductor que la instrucción pide en enterrado) y la ITC-BT-19 cuando la combinación no está publicada. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}
      </section>
      <LineResult title="Resultado DI" result={result} phaseLabel="Sección de fase normalizada" elements={[
        { element: 'Conductores de alimentación (fase + neutro)', detail: `${result.finalSection == null ? '—' : fmt(result.finalSection)} mm² Cu (${result.cableType})`, colors: system === 'three-phase' ? [...PHASES, CONDUCTOR_COLORS.blue] : [CONDUCTOR_COLORS.brown, CONDUCTOR_COLORS.blue] },
        { element: 'Conductor de protección (tierra / PE)', detail: `1 x ${fmt(pe)} mm² Cu (tipo ES07Z1-K, verde-amarillo)`, colors: [CONDUCTOR_COLORS.greenYellow] },
        { element: 'Hilo de mando (tarificación)', detail: `1 x ${fmt(state.controlSection)} mm² Cu (tipo ES07Z1-K, color rojo)`, colors: [CONDUCTOR_COLORS.red] },
        { element: 'Canalización y tubo protector', detail: `Tubo protector empotrado de diámetro exterior Ø ${fmt(state.tubeDiameter)} mm` },
      ]} />
    </div>
    {explanationMode === 'didactic' && <CalculationSteps steps={explanation.steps as ExplanationStep[]} />}
    </>
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
            {head.map((cell, index) => <TableHead scope="col" key={index} className="whitespace-nowrap px-2 py-2">{cell}</TableHead>)}
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
      <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-5xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogTitle className="text-xl font-bold text-ink">Tablas de referencia · ITC-BT-14, BT-15 y BT-19</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-ink-faint">
              Guías del Ministerio de Industria, Turismo y Comercio. Las tablas de la LGA y de la derivación individual se transcriben de las guías BT-14 (sep 03, rev. 1) y BT-15 (sep 03, rev. 1), que están en <code className="text-ink-muted">data/documentacion</code>; la conductividad, del anexo 2 de la misma guía (sep 03, rev. 1), y la sección del conductor de protección, de la guía BT-18 (oct 05, rev. 1), también en esa carpeta; las de agrupamiento y métodos, de la guía BT-19 (feb 09, rev. 2), que reproduce la UNE 20460-5-523:2004.
            </DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tablas de referencia" />}><X /></DialogClose>
        </div>

        {GUIDE_TABLES.filter(table => shows(table.key as TableKey)).map(table => (
          <section key={table.key} className="mt-6 first:mt-0">
            <h4 className="mb-2 text-sm font-semibold text-ink-muted">{table.title}</h4>
            <SimpleTable head={table.head} rows={table.rows} minWidth={860} />
            <p className="mt-1 text-xs text-ink-faint">{table.doc}</p>
          </section>
        ))}

        {shows('A') && (
          <>
            <h4 className="mb-2 text-sm font-semibold text-ink-muted">Tabla A · Intensidades admisibles (A) — cobre, no enterrado, 40 °C de ambiente</h4>
            <SimpleTable
              head={['Sección mm²', ...columns.map(column => `Col. ${column}`)]}
              rows={sectionRows}
              minWidth={860}
            />
            <div className="mt-2 grid gap-1 text-xs text-ink-subtle sm:grid-cols-2 lg:grid-cols-3">
              {columns.map(column => (
                <p key={column}><b className="text-ink-strong">Col. {column}:</b> {variantsByColumn.get(column)?.join(' · ')}</p>
              ))}
            </div>
          </>
        )}

        {shows('D') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-ink-muted">Tabla D · Enterrado bajo tubo (A) — XLPE</h4>
            <SimpleTable
              head={['Sección mm²', 'Cu 3x', 'Al 3x', 'Cu 2x', 'Al 2x']}
              rows={SECTIONS.map((section, index) => [
                fmt(section, 1),
                ...(['copper', 'aluminium'] as const).flatMap(material => ([3, 2] as const).map(loaded =>
                  BURIED_TUBE_CURRENT[material][loaded][index] == null ? null : fmt(BURIED_TUBE_CURRENT[material][loaded][index] as number))),
              ])}
            />
            <p className="mt-1 text-xs text-ink-faint">Condiciones de cálculo: resistividad térmica del terreno 1,5 K·m/W, temperatura del terreno 25 °C, profundidad 70 cm.</p>
          </>
        )}

        {shows('E') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-ink-muted">Tabla E · Factor de reducción por agrupamiento de circuitos</h4>
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
            <p className="mt-1 text-xs text-ink-faint">En las disposiciones 2 a 5 no hay reducción adicional por encima de 9 circuitos: se mantiene el valor de 9.</p>
          </>
        )}

        {shows('F') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-ink-muted">Tabla F · Factor adicional por varias capas</h4>
            <SimpleTable
              head={['Capas', ...LAYER_FACTORS.map(entry => String(entry.layers))]}
              rows={[['Factor', ...LAYER_FACTORS.map(entry => fmt(entry.factor, 2))]]}
            />
          </>
        )}

        {shows('G') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-ink-muted">Tabla G · Tubos en contacto, al aire</h4>
            <SimpleTable
              head={['Capas \\ Tubos', 1, 2, 3, 4, 5, 6]}
              rows={TUBES_CONTACT_AIR.map((row, index) => [index + 1, ...row.map(value => fmt(value, 2))])}
            />
          </>
        )}

        {shows('I') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-ink-muted">Tabla I · Tubos en contacto, enterrados o embebidos en hormigón</h4>
            <SimpleTable
              head={['Capas \\ Tubos', 1, 2, 3, 4, 5, 6]}
              rows={Object.entries(TUBES_CONTACT_BURIED).map(([tubes, row]) => [tubes, ...row.map(value => fmt(value, 2))])}
            />
            <p className="mt-1 text-xs text-ink-faint">Las filas son el número de tubos en horizontal (de 2 a 6); las columnas, el número de capas verticales.</p>
          </>
        )}

        {shows('H') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-ink-muted">Tabla H · Cables multiconductores en tubos enterrados, uno por tubo</h4>
            <SimpleTable
              head={['Cables', ...BURIED_CABLE_SPACING.spacings.map(spacing => spacing === 0 ? 'Contacto' : `${fmt(spacing, 2)} m`)]}
              rows={Object.entries(BURIED_CABLE_SPACING.factors).map(([cables, row]) => [cables, ...row.map(value => fmt(value, 2))])}
            />
          </>
        )}

        {shows('C') && (
          <>
            <h4 className="mt-6 mb-2 text-sm font-semibold text-ink-muted">Tabla C · Resistividad térmica del terreno</h4>
            <SimpleTable
              head={['Terreno', 'K·m/W']}
              rows={SOIL_RESISTIVITY.map(entry => [entry.terrain, fmt(entry.value, 2)])}
            />
          </>
        )}

        <p className="mt-5 text-xs leading-5 text-ink-faint">
          La LGA y la derivación individual se dimensionan con las tablas de su propia instrucción cuando la combinación está publicada; el resto de los casos, y cualquier método distinto del B, usan la Tabla A de la ITC-BT-19. Los valores de la Tabla A son para 40 °C de temperatura ambiente. La corrección por temperatura distinta de 40 °C no está incluida en la guía: remite a la UNE 20460-5-523. En la fila de 400 mm² los valores publicados de las columnas 9 y 10 rompen la progresión y se muestran tal cual aparecen en el documento oficial.
        </p>
      </DialogContent>
    </Dialog>
  )
}
