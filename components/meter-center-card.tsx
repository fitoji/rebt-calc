'use client'

import { Info, TriangleAlert } from 'lucide-react'

import { BoeLink, BOE_REBT, SourceNote } from '@/components/source-note'
import { CalculationSteps, type ExplanationStep } from '@/components/calculation-steps'
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ASSEMBLIES,
  ASSEMBLY_LABELS,
  CABINETS,
  CABINET_LABELS,
  FLOOR_LOCATIONS,
  FLOOR_LABELS,
  LOCATION_LABELS,
} from '../lib/meter-center.mjs'
import { limitsForInstallation } from '../lib/installation-config.mjs'

export type MeterCenterState = {
  placement: 'individual' | 'concentrated'
  meters: number | null
  concentrations: number
  assembly: 'cpm' | 'local' | 'armario' | 'modulos' | 'paneles'
  cabinet: 'empotrado' | 'adosado'
  floor: 'baja' | 'entresuelo' | 'primer-sotano' | 'intermedias' | 'por-plantas'
  buildingFloors: number
  mainSwitchA: number
  hasMando: boolean
  hasTelecom: boolean
  exterior: boolean
}

export type MeterCenterEvaluation = {
  installationType: 'single-user' | 'centralized' | 'partial'
  requiredAssembly: 'cpm' | 'local' | null
  mainSwitch: { required: boolean; amps: number | null; outOfRange: boolean }
  problems: string[]
  notes: string[]
  requirements: string[]
}

const LOCATION_ITEMS = ['interior', 'exterior'] as const
const CONCENTRATED_ASSEMBLIES = ASSEMBLIES.filter(assembly => assembly !== 'cpm')

/**
 * The three regulated arrangements, as the engineer thinks of them. The model
 * keeps placement + concentration count; this is only the card's vocabulary.
 */
const PLACEMENT_CHOICES = ['individual', 'single-place', 'multiple-places'] as const
type PlacementChoice = (typeof PLACEMENT_CHOICES)[number]
const PLACEMENT_CHOICE_LABELS: Record<PlacementChoice, string> = {
  individual: 'Individual · caja de protección y medida',
  'single-place': 'Concentrada en un lugar',
  'multiple-places': 'Concentrada en más de un lugar',
}

const SCENARIO_LABELS: Record<string, string> = {
  centralized: 'Contadores totalmente centralizados',
  partial: 'Contadores en más de un lugar',
  'single-user': 'Único usuario sin LGA',
}

function SelectField<T extends string>({ id, label, value, items, labels, onChange, disabled = false }: {
  id: string
  label: string
  value: T
  items: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-ink-muted">{label}</Label>
      <Select value={value} onValueChange={next => { if (next != null) onChange(String(next) as T) }} disabled={disabled}>
        <SelectTrigger id={id} className="h-9 w-full min-w-0 text-sm"><SelectValue>{(selected: string | null) => labels[(selected ?? value) as T] ?? label}</SelectValue></SelectTrigger>
        <SelectContent alignItemWithTrigger={false} className="w-max max-w-[22rem]"><SelectGroup>{items.map(item => <SelectItem key={item} value={item}>{labels[item]}</SelectItem>)}</SelectGroup></SelectContent>
      </Select>
    </div>
  )
}

/**
 * Meter forms card, ITC-BT-16. The selections live in the project state and the
 * evaluation arrives from `evaluateMeterCenter`, so the card, the report and the
 * JSON read the same numbers.
 */
export function MeterCenterCard({ center, onChange, suggestedMeters, evaluation, explanation, explanationMode = 'calculation', showSourceNotes = true }: {
  center: MeterCenterState
  onChange: (patch: Partial<MeterCenterState>) => void
  suggestedMeters: number
  evaluation: MeterCenterEvaluation
  explanation: { steps: ExplanationStep[] }
  explanationMode?: 'calculation' | 'didactic'
  showSourceNotes?: boolean
}) {
  const effective = { ...center, meters: center.meters ?? suggestedMeters }
  const individual = center.placement === 'individual'
  const assemblyItems = individual ? ['cpm'] as const : CONCENTRATED_ASSEMBLIES
  const choice: PlacementChoice = individual ? 'individual' : center.concentrations > 1 ? 'multiple-places' : 'single-place'
  const limits = limitsForInstallation(evaluation.installationType)

  const choosePlacement = (next: PlacementChoice) => {
    if (next === 'individual') onChange({ placement: 'individual' })
    else if (next === 'single-place') onChange({ placement: 'concentrated', concentrations: 1 })
    else onChange({ placement: 'concentrated', concentrations: Math.max(2, center.concentrations) })
  }

  return (
    <section className="mt-6 rounded-card border border-line bg-paper p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-tab-lga" />Formas de contadores</h3>
          <p className="mt-1 text-xs text-ink-muted">Colocación, conjunto de medida y requisitos según la ITC-BT-16. De acá sale el supuesto de enlace que fijan las caídas de la LGA y de la DI.</p>
        </div>
        <span className="rounded-control bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-muted">{SCENARIO_LABELS[evaluation.installationType]}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField id="cc-placement" label="Forma de colocación" value={choice} items={PLACEMENT_CHOICES} labels={PLACEMENT_CHOICE_LABELS} onChange={choosePlacement} />

        <SelectField id="cc-assembly" label="Conjunto de medida" value={center.assembly} items={assemblyItems} labels={ASSEMBLY_LABELS} onChange={assembly => onChange({ assembly })} />

        <SelectField id="cc-cabinet" label="Tipo de armario" value={center.cabinet} items={CABINETS} labels={CABINET_LABELS} onChange={cabinet => onChange({ cabinet })} disabled={center.assembly !== 'armario'} />

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="cc-meters" className="text-xs font-semibold text-ink-muted">Número de contadores</Label>
          <div className="flex items-center gap-2">
            <Input id="cc-meters" type="number" min="0" step="1" value={center.meters ?? suggestedMeters} onChange={event => onChange({ meters: Math.max(0, Number(event.target.value)) })} className="w-24" />
            {center.meters == null
              ? <span className="text-xs text-ink-faint">desde la previsión</span>
              : <Button type="button" variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => onChange({ meters: null })}>Volver a la previsión</Button>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="cc-concentrations" className="text-xs font-semibold text-ink-muted">Número de concentraciones</Label>
          <Input id="cc-concentrations" type="number" min="1" step="1" value={center.concentrations} disabled={individual || choice === 'single-place'} onChange={event => onChange({ concentrations: Math.max(1, Number(event.target.value)) })} className="w-24 disabled:opacity-60" />
        </div>

        <SelectField id="cc-floor" label="Planta" value={center.floor} items={FLOOR_LOCATIONS} labels={FLOOR_LABELS} onChange={floor => onChange({ floor })} disabled={individual} />

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="cc-floors" className="text-xs font-semibold text-ink-muted">Plantas del edificio</Label>
          <Input id="cc-floors" type="number" min="1" step="1" value={center.buildingFloors} onChange={event => onChange({ buildingFloors: Math.max(1, Number(event.target.value)) })} className="w-24" />
        </div>

        <SelectField
          id="cc-location"
          label="Tipo de local"
          value={center.exterior ? 'exterior' : 'interior'}
          items={LOCATION_ITEMS}
          labels={LOCATION_LABELS}
          onChange={location => onChange({ exterior: location === 'exterior' })}
        />

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="cc-switch" className="text-xs font-semibold text-ink-muted">Interruptor general de maniobra</Label>
          <Select value={String(center.mainSwitchA)} onValueChange={next => { if (next != null) onChange({ mainSwitchA: Number(next) }) }} disabled={individual}>
            <SelectTrigger id="cc-switch" className="h-9 w-full min-w-0 text-sm"><SelectValue>{(selected: string | null) => `${selected ?? center.mainSwitchA} A`}</SelectValue></SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="w-max"><SelectGroup><SelectItem value="160">160 A · hasta 90 kW</SelectItem><SelectItem value="250">250 A · entre 90 y 150 kW</SelectItem></SelectGroup></SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold text-ink-muted">Unidades funcionales</Label>
          <div className="flex items-center gap-2">
            <Checkbox id="cc-mando" checked={center.hasMando} onCheckedChange={checked => onChange({ hasMando: checked === true })} />
            <Label htmlFor="cc-mando" className="text-sm font-normal">Mando</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cc-telecom" checked={center.hasTelecom} onCheckedChange={checked => onChange({ hasTelecom: checked === true })} />
            <Label htmlFor="cc-telecom" className="text-sm font-normal">Telecomunicaciones</Label>
          </div>
        </div>
      </div>

      {evaluation.problems.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 rounded-control bg-warning-soft p-3 text-xs leading-5 text-warning-ink">
          {evaluation.problems.map(problem => <li key={problem} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{problem}</li>)}
        </ul>
      )}

      <dl className="mt-4 grid gap-3 rounded-control bg-surface-muted p-3 text-xs sm:grid-cols-4">
        <div><dt className="font-semibold text-ink-muted">Contadores por concentración</dt><dd className="tabular-nums">{Math.ceil(effective.meters / Math.max(1, center.concentrations))}</dd></div>
        <div><dt className="font-semibold text-ink-muted">Caída admisible</dt><dd>{limits.lga == null ? `Sin LGA · DI ${limits.di} %` : `LGA ${limits.lga} % · DI ${limits.di} %`}</dd></div>
        <div><dt className="font-semibold text-ink-muted">Interruptor exigido</dt><dd>{evaluation.mainSwitch.required ? (evaluation.mainSwitch.amps == null ? 'Fuera de la tabla' : `${evaluation.mainSwitch.amps} A`) : 'No obligatorio (hasta 2 usuarios)'}</dd></div>
        <div><dt className="font-semibold text-ink-muted">Conjunto exigido</dt><dd>{evaluation.requiredAssembly === 'local' ? 'Local de contadores' : evaluation.requiredAssembly === 'cpm' ? 'Caja de protección y medida' : 'El elegido'}</dd></div>
      </dl>

      <div className="mt-4">
        <Accordion>
          <AccordionItem value="requirements">
            <AccordionHeader>
              <AccordionTrigger>Requisitos del cuarto ({evaluation.requirements.length})</AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>
              <ul className="flex list-disc flex-col gap-1 pb-3 pl-5 text-xs leading-5 text-ink-faint">
                {evaluation.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}
              </ul>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-xs leading-5 text-ink-faint">
        {evaluation.notes.map(note => <li key={note}>{note}</li>)}
      </ul>

      {explanationMode === 'didactic' && <CalculationSteps steps={explanation.steps} />}

      {showSourceNotes && <SourceNote label="ITC-BT-16">ITC-BT-16: los contadores se alojan en módulos, paneles o armarios, o en un local cuando hay más de 16 por concentración (§1 y §2.2). El interruptor general de maniobra es obligatorio con más de dos usuarios: 160 A hasta 90 kW y 250 A hasta 150 kW (§3). Montaje entre 0,25 m del suelo y 1,80 m al cuadrante de lectura; conjunto IP40 · IK09 en interior o IP43 · IK09 en exterior (§1 y §3). <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}
    </section>
  )
}
