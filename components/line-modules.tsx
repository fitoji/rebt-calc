'use client'

import { useMemo, type ReactNode } from 'react'
import { Info, Table2, TriangleAlert, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
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

/** Un conductor o canalización de la línea, con el color físico que lo identifica. */
export type ResultElement = { element: string; detail: string; colors?: readonly ConductorColor[] }

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

/**
 * Conductores de la línea con el color físico que los identifica. La pinta la
 * tarjeta del rail: los colores se declaran una sola vez, junto a la línea.
 */
export function ConductorList({ elements }: { elements: readonly ResultElement[] }) {
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

/**
 * Elementos de la instalación de la LGA, ya descritos para el panel y la tarjeta
 * del rail. El color físico de cada conductor se declara acá una sola vez.
 */
export function lgaResultElements(state: LineState, result: ReturnType<typeof sizeLine>): ResultElement[] {
  return [
    { element: 'Conductores de Fase (R, S, T)', detail: `3 x ${result.finalSection == null ? '—' : fmt(result.finalSection)} mm² Cu (${result.cableType})`, colors: PHASES },
    { element: 'Conductor Neutro (N)', detail: `1 x ${fmt(lgaNeutralSection(result.finalSection) ?? state.neutralSection)} mm² Cu (${result.cableType})`, colors: [CONDUCTOR_COLORS.blue] },
    { element: 'Conductor de Protección (PE)', detail: `1 x ${fmt(result.finalSection == null ? state.peSection : protectiveSection(result.finalSection))} mm² Cu (${result.cableType})`, colors: [CONDUCTOR_COLORS.greenYellow] },
    { element: 'Tubo protector empotrado', detail: `${fmt(state.tubeDiameter)} mm de diámetro exterior${result.minimumTube == null ? ' mínimo' : ` · tabla 1 pide ${fmt(result.minimumTube)} mm`}` },
  ]
}

/** Elementos de la derivación individual: la fase y el neutro siguen al sistema cargado. */
export function diResultElements(state: LineState, result: ReturnType<typeof sizeLine>, system: 'three-phase' | 'single-phase'): ResultElement[] {
  const phase = result.finalSection
  const pe = phase == null ? state.peSection : protectiveSection(phase)
  return [
    { element: 'Conductores de alimentación (fase + neutro)', detail: `${result.finalSection == null ? '—' : fmt(result.finalSection)} mm² Cu (${result.cableType})`, colors: system === 'three-phase' ? [...PHASES, CONDUCTOR_COLORS.blue] : [CONDUCTOR_COLORS.brown, CONDUCTOR_COLORS.blue] },
    { element: 'Conductor de protección (tierra / PE)', detail: `1 x ${fmt(pe)} mm² Cu (tipo ES07Z1-K, verde-amarillo)`, colors: [CONDUCTOR_COLORS.greenYellow] },
    { element: 'Hilo de mando (tarificación)', detail: `1 x ${fmt(state.controlSection)} mm² Cu (tipo ES07Z1-K, color rojo)`, colors: [CONDUCTOR_COLORS.red] },
    { element: 'Canalización y tubo protector', detail: `Tubo protector empotrado de diámetro exterior Ø ${fmt(state.tubeDiameter)} mm` },
  ]
}

/**
 * Sección de fase de la LGA.
 *
 * Es el control que sobrevive a la consolidación: las cifras de la línea se leen
 * en la tarjeta del rail, pero la sección se puede fijar a mano sin salir del
 * panel. Una sección fijada antes de que cambiara la carga puede quedar por
 * debajo de la automática: se mantiene en la lista para que el control nunca
 * oculte el valor que está mostrando.
 */
function LgaSectionField({ result, onChange }: {
  result: ReturnType<typeof sizeLine>
  onChange: (patch: Partial<LineState>) => void
}) {
  const selectable = result.candidates
    .filter(candidate => result.autoSection == null
      ? candidate.section >= result.minimumSection
      : candidate.section > result.autoSection)
    .map(candidate => candidate.section)
  const selected = result.sectionOverride
  const options = selected != null && !selectable.includes(selected)
    ? [selected, ...selectable].sort((a, b) => a - b)
    : selectable
  const automaticLabel = result.autoSection == null
    ? 'Automática · sin sección'
    : `Automática · ${fmt(result.autoSection)} mm²`

  return (
    <aside className="min-w-0 self-start rounded-card border border-line bg-paper p-5 shadow-card">
      <h4 className="text-sm font-semibold">Sección de fase</h4>
      <p className="mt-1 text-xs leading-5 text-ink-faint">La sección se puede fijar a mano: el cálculo la respeta y avisa si no cumple.</p>
      <div className="mt-3">
        <label htmlFor="lga-section" className="label mb-1 block">Sección adoptada (0 = automática)</label>
        <select
          id="lga-section"
          className="h-8 w-full rounded-control border border-line bg-transparent px-2.5 text-sm text-ink-strong"
          value={selected == null ? 'auto' : String(selected)}
          onChange={event => {
            const section = event.target.value === 'auto' ? 0 : Number(event.target.value)
            onChange({ sectionOverride: section })
          }}
        >
          <option value="auto">{automaticLabel}</option>
          {options.map(section => <option key={section} value={String(section)}>{fmt(section)} mm²</option>)}
        </select>
        <p id="lga-section-hint" className="mt-1.5 text-xs leading-5 text-ink-faint">
          {selected == null
            ? `Mínimo ${fmt(result.minimumSection)} mm² · ITC-BT-14 §3`
            : `Automática: ${result.autoSection == null ? 'sin sección' : `${fmt(result.autoSection)} mm²`} · mínimo ${fmt(result.minimumSection)} mm²`}
        </p>
      </div>
    </aside>
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
        label="Protección de la línea (In) · 0 = automática"
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

function InstallationField({ value, limit, configured }: { value: InstallationType; limit: number | null; configured: number }) {
  const mismatch = mismatchesLimit(limit, configured)
  const label = INSTALLATION_SCENARIOS.find(scenario => scenario.id === value)?.label ?? 'Supuesto de enlace'

  return <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control bg-surface-muted px-3 py-2">
    <span className="text-xs font-semibold text-ink-muted">Supuesto de enlace</span>
    <span className="text-xs font-medium">{label}</span>
    <span className="text-xs text-ink-faint">Se deriva de la centralización de contadores.</span>
    {limit == null
      ? <span className="text-xs text-ink-faint">Este supuesto no tiene línea general.</span>
      : mismatch && <span className="flex items-center gap-1 text-xs font-semibold text-warning-ink"><TriangleAlert className="size-3.5" aria-hidden="true" />El supuesto fija {formatLimit(limit)}</span>}
  </div>
}

export function LgaPanel({ state, onChange, onOpenTables, showSourceNotes = true, installationType, explanationMode = 'calculation', powerMode = 'auto', onPowerModeChange, loadTotal = 0, powerUnit = 'W' }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables?: TableKey[]) => void
  showSourceNotes?: boolean
  installationType: InstallationType
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
        <InstallationField value={installationType} limit={limits.lga} configured={state.maxDropPercent} />
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
      <LgaSectionField result={result} onChange={onChange} />
    </div>
    {explanationMode === 'didactic' && <CalculationSteps steps={explanation.steps as ExplanationStep[]} />}
    </>
  )
}

export function DiPanel({ state, onChange, onOpenTables, showSourceNotes = true, installationType, explanationMode = 'calculation', system = 'single-phase', editingLabel, powerUnit = 'W' }: {
  state: LineState
  onChange: (patch: Partial<LineState>) => void
  onOpenTables: (tables?: TableKey[]) => void
  showSourceNotes?: boolean
  installationType: InstallationType
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
    <div className="grid min-w-0 gap-6">
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
        <InstallationField value={installationType} limit={limits.di} configured={state.maxDropPercent} />
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
            <SourceNote label={table.doc.split('.')[0]}>{table.doc} <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>
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
