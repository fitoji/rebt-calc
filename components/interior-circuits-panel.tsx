'use client'

import { ChevronLeft, ChevronRight, Info, Plus, Trash2, TriangleAlert } from 'lucide-react'

import { BoeLink, BOE_REBT, SourceNote } from '@/components/source-note'
import { CalculationSteps, type ExplanationStep } from '@/components/calculation-steps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CIRCUIT_USES, CIRCUIT_USE_LABELS, INTERIOR_DROP_LIMITS, evaluateBoard, sizeInteriorCircuit } from '../lib/interior-circuits.mjs'
import { formatPower, powerFieldValue, storePower } from '../lib/power-units.mjs'
import { explainInteriorCircuits } from '../lib/calculation-explanations.mjs'

export type CircuitRow = { id: string; description: string; use: 'alumbrado' | 'otros'; powerW: number; lengthM: number }

export type CircuitSupply = {
  id: string
  label: string
  system: 'single-phase' | 'three-phase'
  powerW: number
  method: string
  insulation: 'PVC' | 'XLPE'
  installation: 'air' | 'buried'
  layout: string
  circuits: CircuitRow[]
}

const fmt = (value: number, digits = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

function newCircuitId() {
  return `circuit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Voltage drop of a circuit. The shared engine only adopts a compliant section,
 * so a red value means the circuit has no section that meets the limit; the
 * hover states the limit that applies to its use.
 */
function DropCell({ result, limit }: { result: ReturnType<typeof sizeInteriorCircuit>; limit: number }) {
  const missing = result.finalSection == null
  const overDrop = result.dropPercent != null && result.dropPercent > limit
  const over = missing || overDrop
  const value = result.dropPercent == null ? (missing ? 'Sin sección' : '—') : `${fmt(result.dropPercent, 2)} %`
  const hint = missing ? `Sin sección que cumpla la caída máxima de ${limit} %` : `Caída máxima permitida: ${limit} %`

  if (!over) {
    return <span className="tabular-nums text-xs" title={hint}>{value}</span>
  }

  return (
    <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-danger" title={`${value}. ${hint}`}>
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {value}
      <span className="sr-only">. {hint}</span>
    </span>
  )
}

/**
 * Interior board of a non-dwelling supply (local, common services, garage…).
 *
 * The circuits are free rows sized with the shared engine; the board summary
 * proposes the general switch from the design current and reminds the
 * differential of ITC-BT-24.
 */
export function InteriorCircuitsPanel({ supplies, selectedId, onSelect, onChange, powerUnit, explanationMode = 'calculation', showSourceNotes = true }: {
  supplies: CircuitSupply[]
  selectedId: string | null
  onSelect: (id: string) => void
  onChange: (id: string, circuits: CircuitRow[]) => void
  /** Unidad con la que se leen y se escriben las potencias; el vatío sigue siendo la unidad guardada. */
  powerUnit: 'W' | 'kW'
  explanationMode?: 'calculation' | 'didactic'
  showSourceNotes?: boolean
}) {
  if (supplies.length === 0) {
    return (
      <section className="rounded-card border border-line bg-paper p-5 shadow-card">
        <h3 className="font-bold">Cuadros de locales y servicios generales</h3>
        <p className="mt-2 flex items-start gap-2 rounded-control bg-brand-soft p-3 text-sm leading-6 text-brand-ink"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Todavía no hay locales ni servicios generales. Agregalos en la previsión y generá las derivaciones en la pestaña DI.</p>
      </section>
    )
  }

  const supply = supplies.find(entry => entry.id === selectedId) ?? supplies[0]
  const board = evaluateBoard(supply.circuits, supply)
  const explanation = explainInteriorCircuits(supply, board, supply.circuits, circuit => {
    const result = sizeInteriorCircuit(circuit as CircuitRow, supply)
    return { section: result.finalSection, protection: result.protection, dropPercent: result.dropPercent }
  })
  const update = (circuits: CircuitRow[]) => onChange(supply.id, circuits)
  const patch = (id: string, values: Partial<CircuitRow>) => update(supply.circuits.map(circuit => circuit.id === id ? { ...circuit, ...values } : circuit))
  const currentIndex = supplies.findIndex(entry => entry.id === supply.id)
  const navigate = (delta: number) => {
    const next = supplies[currentIndex + delta]
    if (next) onSelect(next.id)
  }

  return (
    <section className="rounded-card border border-line bg-paper p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-tab-lga" />Cuadro interior del suministro</h3>
          <p className="mt-1 text-xs text-ink-muted">Circuitos libres de un local o de los servicios generales, ITC-BT-19.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="board-supply" className="text-xs font-semibold text-ink-muted">Suministro</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="Suministro anterior" disabled={currentIndex <= 0} onClick={() => navigate(-1)}><ChevronLeft aria-hidden="true" /></Button>
            <Select value={supply.id} onValueChange={next => { if (next != null) onSelect(String(next)) }}>
              <SelectTrigger id="board-supply" className="h-9 w-full min-w-0 text-sm sm:min-w-[16rem]"><SelectValue>{(selected: string | null) => supplies.find(entry => entry.id === selected)?.label ?? supply.label}</SelectValue></SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="w-max max-w-[22rem]"><SelectGroup>{supplies.map(entry => <SelectItem key={entry.id} value={entry.id}>{entry.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="Suministro siguiente" disabled={currentIndex >= supplies.length - 1} onClick={() => navigate(1)}><ChevronRight aria-hidden="true" /></Button>
          </div>
        </div>
      </div>

      <dl className="mb-4 grid gap-3 rounded-control bg-surface-muted p-3 text-xs sm:grid-cols-4">
        <div><dt className="font-semibold text-ink-muted">Potencia prevista del suministro</dt><dd className="tabular-nums">{formatPower(supply.powerW, powerUnit)}</dd></div>
        <div><dt className="font-semibold text-ink-muted">IGA del suministro</dt><dd className="tabular-nums">{board.supplySwitchA == null ? '—' : `${board.supplySwitchA} A`}</dd></div>
        <div><dt className="font-semibold text-ink-muted">Potencia máxima con ese IGA</dt><dd className="tabular-nums">{board.supplyMaxPowerW == null ? '—' : formatPower(board.supplyMaxPowerW, powerUnit)}</dd></div>
        <div><dt className="font-semibold text-ink-muted">Intensidad del suministro</dt><dd className="tabular-nums">{fmt(board.supplyIb, 1)} A</dd></div>
      </dl>

      <div className="overflow-x-auto">
        <Table className="w-full text-left text-sm">
          <TableHeader>
            <TableRow className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
              <TableHead scope="col" className="py-2 pr-2">Circuito</TableHead>
              <TableHead scope="col" className="py-2 pr-2">Uso</TableHead>
              <TableHead scope="col" className="py-2 pr-2">Potencia ({powerUnit})</TableHead>
              <TableHead scope="col" className="py-2 pr-2">Longitud (m)</TableHead>
              <TableHead scope="col" className="py-2 pr-2">Sección</TableHead>
              <TableHead scope="col" className="py-2 pr-2">Protección</TableHead>
              <TableHead scope="col" className="py-2 pr-2">Caída</TableHead>
              <TableHead scope="col" className="py-2"><span className="sr-only">Acciones</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supply.circuits.map(circuit => {
              const result = sizeInteriorCircuit(circuit, supply)
              return (
                <TableRow key={circuit.id} className="border-b border-line-soft">
                  <TableCell className="py-2 pr-2"><Input aria-label={`Descripción · ${circuit.description || 'circuito'}`} value={circuit.description} onChange={event => patch(circuit.id, { description: event.target.value })} className="w-40" /></TableCell>
                  <TableCell className="py-2 pr-2">
                    <Select value={circuit.use} onValueChange={next => { if (next != null) patch(circuit.id, { use: String(next) as CircuitRow['use'] }) }}>
                      <SelectTrigger aria-label={`Uso · ${circuit.description || 'circuito'}`} className="h-8 w-40 text-xs"><SelectValue>{(selected: string | null) => CIRCUIT_USE_LABELS[(selected ?? circuit.use) as CircuitRow['use']] ?? 'Uso'}</SelectValue></SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} className="w-max"><SelectGroup>{CIRCUIT_USES.map(use => <SelectItem key={use} value={use}>{CIRCUIT_USE_LABELS[use]}</SelectItem>)}</SelectGroup></SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2 pr-2"><Input aria-label={`Potencia (${powerUnit}) · ${circuit.description || 'circuito'}`} type="number" min="0" step={powerUnit === 'kW' ? '0.01' : '1'} value={powerFieldValue(circuit.powerW, powerUnit) || ''} onChange={event => patch(circuit.id, { powerW: Math.max(0, storePower(Number(event.target.value), powerUnit)) })} className="w-24" /></TableCell>
                  <TableCell className="py-2 pr-2"><Input aria-label={`Longitud · ${circuit.description || 'circuito'}`} type="number" min="0" step="0.1" value={circuit.lengthM || ''} onChange={event => patch(circuit.id, { lengthM: Math.max(0, Number(event.target.value)) })} className="w-20" /></TableCell>
                  <TableCell className="py-2 pr-2 tabular-nums text-xs">{result.finalSection == null ? '—' : `${fmt(result.finalSection, 1)} mm²`}</TableCell>
                  <TableCell className="py-2 pr-2 tabular-nums text-xs">{result.protection == null ? '—' : `${fmt(result.protection)} A`}</TableCell>
                  <TableCell className="py-2 pr-2"><DropCell result={result} limit={INTERIOR_DROP_LIMITS[circuit.use]} /></TableCell>
                  <TableCell className="py-2"><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${circuit.description || 'circuito'}`} onClick={() => update(supply.circuits.filter(entry => entry.id !== circuit.id))}><Trash2 /></Button></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <Button type="button" variant="outline" size="sm" className="h-auto gap-2 px-3 py-2" onClick={() => update([...supply.circuits, { id: newCircuitId(), description: `Circuito ${supply.circuits.length + 1}`, use: 'otros', powerW: 0, lengthM: 0 }])}><Plus data-icon="inline-start" /> Añadir circuito</Button>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-ink-muted">Total circuitos <strong className="tabular-nums text-ink">{formatPower(board.totalPowerW, powerUnit)}</strong></span>
          <span className="text-ink-muted">Intensidad de cálculo <strong className="tabular-nums text-ink">{fmt(board.ib, 1)} A</strong></span>
          <span className="text-ink-muted">Interruptor general <strong className="tabular-nums text-ink">{board.switchA == null ? '—' : `${board.switchA} A`}</strong></span>
          <span className="text-ink-muted">Diferencial <strong className="text-ink">1 × {board.sensitivityMa} mA</strong></span>
        </div>
      </div>

      {board.problems.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 rounded-control bg-warning-soft p-3 text-xs leading-5 text-warning-ink">
          {board.problems.map(problem => <li key={problem} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{problem}</li>)}
        </ul>
      )}

      <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-xs leading-5 text-ink-faint">
        {board.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}
      </ul>

      {explanationMode === 'didactic' && <CalculationSteps steps={explanation.steps as ExplanationStep[]} />}

      {showSourceNotes && <SourceNote label="ITC-BT-19 §2.2.2">ITC-BT-19 §2.2.2: la caída de tensión desde el origen de la instalación interior no supera el 3 % en alumbrado ni el 5 % en los demás usos (4,5 % y 6,5 % en industria alimentada en alta tensión con transformador propio). Cada circuito se protege con Ib ≤ In ≤ Iz (ITC-BT-22) y la protección contra contactos indirectos se resuelve con diferencial de 30 mA (ITC-BT-24). <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}
    </section>
  )
}
