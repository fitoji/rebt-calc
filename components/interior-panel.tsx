'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Info, Plus, Table2, Trash2, TriangleAlert, X } from 'lucide-react'

import { BoeLink, BOE_REBT, SourceNote } from '@/components/source-note'
import { CalculationSteps, type ExplanationStep } from '@/components/calculation-steps'
import { explainHousingPoints, explainInterior } from '../lib/calculation-explanations.mjs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { evaluateInterior, resolveInterior } from '../lib/interior-installation.mjs'
import { HOUSING_CIRCUIT_MAX_DROP, HOUSING_CIRCUIT_TABLE, HOUSING_CIRCUIT_TABLE_NOTES, housingCircuitSizing, housingCircuitsFor, housingGradeFor } from '../lib/housing-circuits.mjs'
import { MAX_POINTS, POINT_CIRCUITS, POINT_CIRCUIT_LABELS, ROOM_LABELS, ROOM_TYPES, totalPoints } from '../lib/housing-points.mjs'
import { HOUSING_POWER_STEPS } from '../lib/normative-tables.mjs'
import { formatPower } from '../lib/power-units.mjs'

export type InteriorDwelling = {
  id: string
  label: string
  powerW: number
  housingIgaA?: number
  housingAreaM2?: number
  interior?: {
    contractedPowerW: number
    circuits: number
    hasSurge: boolean
    lengths?: Record<string, number>
    rooms?: Array<{ id?: string; type: string; area: number; length: number }>
    hasHeating?: boolean
    hasCooling?: boolean
    hasDryer?: boolean
  }
}

const fmt = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)

export type InteriorRoomRow = { id: string; type: string; area: number; length: number }

export type InteriorInputsState = {
  contractedPowerW: number
  circuits: number
  hasSurge: boolean
  lengths: Record<string, number>
  rooms: InteriorRoomRow[]
  hasHeating: boolean
  hasCooling: boolean
  hasDryer: boolean
}

function resolveInteriorInputs(dwelling: InteriorDwelling): InteriorInputsState {
  const resolved = resolveInterior(dwelling.powerW, dwelling.interior) as unknown as Partial<InteriorInputsState>
  return {
    contractedPowerW: resolved.contractedPowerW ?? 0,
    circuits: resolved.circuits ?? 0,
    hasSurge: resolved.hasSurge ?? false,
    lengths: resolved.lengths ?? {},
    rooms: (resolved.rooms ?? []).map((room, index) => ({ ...room, id: room.id ?? `room-${index}` })),
    hasHeating: resolved.hasHeating ?? false,
    hasCooling: resolved.hasCooling ?? false,
    hasDryer: resolved.hasDryer ?? false,
  }
}

function roomLabel(type: string) {
  return ROOM_LABELS[type as keyof typeof ROOM_LABELS] ?? type
}

function stepLabel(powerW: number) {
  const step = HOUSING_POWER_STEPS.find(([, watts]) => Number(watts) === powerW)
  return step ? `${step[0]} · ${formatPower(Number(step[1]), 'W')}` : `${formatPower(powerW, 'W')} · fuera de tabla`
}

/**
 * Interior installation of one dwelling: DGMP and protections, ITC-BT-25.
 *
 * The IGA comes from the dwelling power step; the contracted power and the
 * number of circuits are the only two project-specific data points, and both
 * feed the checks and the differential count.
 */
export function InteriorPanel({ dwellings, selectedId, onSelect, onChange, hasIrve = false, explanationMode = 'calculation', showSourceNotes = true }: {
  dwellings: InteriorDwelling[]
  selectedId: string | null
  onSelect: (id: string) => void
  onChange: (id: string, patch: Partial<InteriorInputsState>) => void
  hasIrve?: boolean
  explanationMode?: 'calculation' | 'didactic'
  showSourceNotes?: boolean
}) {
  const [showCircuitTable, setShowCircuitTable] = useState(false)

  if (dwellings.length === 0) {
    return (
      <section className="rounded-card border border-line bg-paper p-5 shadow-card">
        <h3 className="font-bold">Instalaciones interiores</h3>
        <p className="mt-2 flex items-start gap-2 rounded-control bg-brand-soft p-3 text-sm leading-6 text-brand-ink"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Todavía no hay viviendas. Generá las derivaciones desde la previsión en la pestaña DI y volvé acá.</p>
      </section>
    )
  }

  const dwelling = dwellings.find(entry => entry.id === selectedId) ?? dwellings[0]
  const inputs = resolveInteriorInputs(dwelling)
  const circuitsFromGrade = dwelling.interior?.circuits == null
  const evaluation = evaluateInterior({
    igaA: dwelling.housingIgaA ?? null,
    powerW: dwelling.powerW,
    ...inputs,
  })

  const setInput = (patch: Partial<typeof inputs>) => onChange(dwelling.id, patch)
  const setLength = (id: string, value: number) => onChange(dwelling.id, { lengths: { ...(inputs.lengths ?? {}), [id]: Math.max(0, value) } })
  const grade = housingGradeFor(dwelling.powerW)
  const circuits = housingCircuitsFor(dwelling.powerW, { hasIrve })
  const rooms = inputs.rooms ?? []
  const roomsArea = rooms.reduce((sum, room) => sum + Math.max(0, room.area || 0), 0)
  const dwellingArea = dwelling.housingAreaM2 ?? 0
  const overArea = dwellingArea > 0 && roomsArea > dwellingArea + 0.001
  const remainingArea = dwellingArea > 0 ? dwellingArea - roomsArea : null
  const pointFlags = { hasHeating: inputs.hasHeating, hasCooling: inputs.hasCooling, hasDryer: inputs.hasDryer, hasIrve }
  const points = totalPoints(rooms, pointFlags)
  const interiorExplanation = explainInterior(
    { igaA: dwelling.housingIgaA ?? null, powerW: dwelling.powerW, ...inputs },
    evaluation,
    { grade },
  )
  const pointsExplanation = explainHousingPoints(rooms, points, pointFlags)
  const setRooms = (next: Array<{ id: string; type: string; area: number; length: number }>) => onChange(dwelling.id, { rooms: next })
  const addRoom = () => setRooms([...rooms, { id: `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'dormitorio', area: 0, length: 0 }])
  const patchRoom = (id: string, values: Partial<{ type: string; area: number; length: number }>) => setRooms(rooms.map(room => room.id === id ? { ...room, ...values } : room))
  const currentIndex = dwellings.findIndex(entry => entry.id === dwelling.id)
  const navigate = (delta: number) => {
    const next = dwellings[currentIndex + delta]
    if (next) onSelect(next.id)
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-line bg-paper p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-tab-di" />Instalaciones interiores</h3>
            <p className="mt-1 text-xs text-ink-muted">Cuadro de mando y protección de la vivienda: IGA, ICP y diferenciales según la ITC-BT-25.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="interior-dwelling" className="text-xs font-semibold text-ink-muted">Vivienda</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="Vivienda anterior" disabled={currentIndex <= 0} onClick={() => navigate(-1)}><ChevronLeft aria-hidden="true" /></Button>
              <Select value={dwelling.id} onValueChange={next => { if (next != null) onSelect(String(next)) }}>
                <SelectTrigger id="interior-dwelling" className="h-9 w-full min-w-0 text-sm sm:min-w-[16rem]"><SelectValue>{(selected: string | null) => dwellings.find(entry => entry.id === selected)?.label ?? dwelling.label}</SelectValue></SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className="w-max max-w-[22rem]"><SelectGroup>{dwellings.map(entry => <SelectItem key={entry.id} value={entry.id}>{entry.label}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="Vivienda siguiente" disabled={currentIndex >= dwellings.length - 1} onClick={() => navigate(1)}><ChevronRight aria-hidden="true" /></Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">Escalón de potencia</span><span>{stepLabel(dwelling.powerW)}</span></div>
          <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">IGA (tabla A)</span><span className="tabular-nums">{evaluation.igaA == null ? '—' : `${evaluation.igaA} A`}</span></div>
          <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">Potencia máxima admisible</span><span className="tabular-nums">{evaluation.maxPowerW == null ? '—' : formatPower(evaluation.maxPowerW, 'W')}</span></div>
          <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">Diferenciales exigidos</span><span>{evaluation.differentials} × {evaluation.sensitivityMa} mA</span></div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="interior-contracted" className="text-xs font-semibold text-ink-muted">Potencia contratada</Label>
            <Input id="interior-contracted" type="number" min="0" step="1" value={inputs.contractedPowerW || ''} onChange={event => setInput({ contractedPowerW: Math.max(0, Number(event.target.value)) })} className="w-32" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="interior-circuits" className="text-xs font-semibold text-ink-muted">Circuitos instalados</Label>
            <Input id="interior-circuits" type="number" min="0" step="1" value={inputs.circuits || ''} onChange={event => setInput({ circuits: Math.max(0, Math.round(Number(event.target.value))) })} className="w-24" />
            <span className="text-[11px] text-ink-faint">{circuitsFromGrade ? 'predeterminado del grado de electrificación' : 'valor del proyecto'}</span>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox id="interior-surge" checked={inputs.hasSurge} onCheckedChange={checked => setInput({ hasSurge: checked === true })} />
            <Label htmlFor="interior-surge" className="text-sm font-normal">Protección contra sobretensiones</Label>
          </div>
          <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">ICP · intensidad de la potencia contratada</span><span className="tabular-nums">{evaluation.icpCurrentA == null ? 'Sin potencia contratada' : `${evaluation.icpCurrentA.toFixed(1)} A`}</span></div>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-ink-muted">Circuitos de la vivienda · {grade === 'elevated' ? 'electrificación elevada' : 'electrificación básica'}</h4>
            <Button type="button" variant="outline" size="sm" className="h-auto gap-2 px-3 py-1.5" aria-haspopup="dialog" aria-controls="housing-circuits-dialog" onClick={() => setShowCircuitTable(true)}><Table2 data-icon="inline-start" /> Tabla</Button>
          </div>
          <div className="mt-2 overflow-x-auto">
            <Table aria-label={`Circuitos de la vivienda · ${grade === 'elevated' ? 'electrificación elevada' : 'electrificación básica'}`} className="w-full text-left text-xs">
              <TableHeader>
                <TableRow className="border-b border-line uppercase tracking-wide text-ink-faint">
                  <TableHead scope="col" className="py-2 pr-2">Circuito</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">Nombre</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">Longitud</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">PIA</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">Sección</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">Tubo</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">Máx. puntos</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">P/toma</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">Fs</TableHead>
                  <TableHead scope="col" className="py-2 pr-2">Fu</TableHead>
                  <TableHead scope="col" className="py-2">Caída</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {circuits.map(circuit => {
                  const lengthM = inputs.lengths?.[circuit.id] ?? 0
                  const sizing = housingCircuitSizing(circuit, lengthM)
                  return (
                    <TableRow key={circuit.id} className="border-b border-line-soft">
                      <TableCell className="py-2 pr-2 font-semibold">{circuit.id}</TableCell>
                      <TableCell className="py-2 pr-2">{circuit.name}{circuit.note && <span className="block text-[11px] text-ink-faint">{circuit.note}</span>}</TableCell>
                      <TableCell className="py-2 pr-2"><Input aria-label={`Longitud · ${circuit.id}`} type="number" min="0" step="0.1" value={lengthM || ''} onChange={event => setLength(circuit.id, Number(event.target.value))} className="w-20" /></TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{circuit.breakerA == null ? '—' : `${circuit.breakerA} A`}</TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">
                        {sizing.section == null ? '—' : `${sizing.section} mm²`}
                        {sizing.section != null && sizing.tableSection != null && sizing.section > sizing.tableSection && <span className="block text-[11px] text-ink-faint">mín. tabla {sizing.tableSection}</span>}
                      </TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{circuit.tube == null ? '—' : `${circuit.tube} mm`}</TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{circuit.maxPoints == null ? '—' : circuit.maxPoints}</TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{circuit.powerPerPointW == null ? '—' : `${fmt(circuit.powerPerPointW)} W`}</TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{circuit.fs == null ? '—' : circuit.fs}</TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{circuit.fu == null ? '—' : circuit.fu}</TableCell>
                      <TableCell className="py-2 tabular-nums">
                        {sizing.dropPercent == null
                          ? <span className="text-ink-faint">—</span>
                          : <span className={sizing.over ? 'inline-flex items-center gap-1 font-semibold text-danger' : ''} title={sizing.over ? `Supera la caída máxima permitida de ${HOUSING_CIRCUIT_MAX_DROP} %` : `Caída máxima permitida: ${HOUSING_CIRCUIT_MAX_DROP} %`}>
                            {sizing.over && <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
                            {fmt(sizing.dropPercent)} %
                            {sizing.over && <span className="sr-only">. Supera la caída máxima permitida de {HOUSING_CIRCUIT_MAX_DROP} %</span>}
                          </span>}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          {showSourceNotes && <SourceNote label="ITC-BT-25 §3 · tabla 1">ITC-BT-25 §3, tabla 1: características mínimas de los circuitos del grado de electrificación. El número de circuitos instalados se ajusta arriba; esta tabla describe el grado, no lo cambia. La sección de cada circuito se toma de la tabla y además la caída de tensión no puede superar el 3 %, calculada con la intensidad nominal del interruptor automático del circuito y la distancia al punto de utilización más alejado. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-ink-muted">Estancias y puntos de utilización · ITC-BT-25 §4</h4>
            <Button type="button" variant="outline" size="sm" className="h-auto gap-2 px-3 py-1.5" onClick={addRoom}><Plus data-icon="inline-start" /> Añadir estancia</Button>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-ink-faint">La tabla 2 fija los puntos mínimos por estancia según su superficie o longitud. C8, C9 y C10 se cuentan solo si la vivienda los prevé.</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2"><Checkbox id="interior-heating" checked={inputs.hasHeating ?? false} onCheckedChange={checked => setInput({ hasHeating: checked === true })} /><Label htmlFor="interior-heating" className="text-sm font-normal">Calefacción eléctrica</Label></div>
            <div className="flex items-center gap-2"><Checkbox id="interior-cooling" checked={inputs.hasCooling ?? false} onCheckedChange={checked => setInput({ hasCooling: checked === true })} /><Label htmlFor="interior-cooling" className="text-sm font-normal">Aire acondicionado</Label></div>
            <div className="flex items-center gap-2"><Checkbox id="interior-dryer" checked={inputs.hasDryer ?? false} onCheckedChange={checked => setInput({ hasDryer: checked === true })} /><Label htmlFor="interior-dryer" className="text-sm font-normal">Secadora</Label></div>
          </div>

          {dwellingArea > 0 && (
            <p className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${overArea ? 'font-semibold text-danger' : 'text-ink-muted'}`}>
              {overArea && <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />}
              <span>Superficie de la vivienda: <strong className="tabular-nums">{fmt(dwellingArea)} m²</strong></span>
              <span>Suma de estancias: <strong className="tabular-nums">{fmt(roomsArea)} m²</strong></span>
              <span>{remainingArea != null && remainingArea >= 0 ? `Disponible: ${fmt(remainingArea)} m²` : `Excedida en ${fmt(Math.abs(remainingArea ?? 0))} m²`}</span>
              {overArea && <span className="sr-only">. La suma de estancias supera la superficie de la vivienda</span>}
            </p>
          )}

          {rooms.length === 0
            ? <p className="mt-3 text-xs text-ink-faint">Sin estancias cargadas: agregá salón, cocina, baños y dormitorios para calcular los puntos mínimos.</p>
            : (
              <div className="mt-3 overflow-x-auto">
                <Table aria-label="Estancias de la vivienda" className="w-full text-left text-xs">
                  <TableHeader>
                    <TableRow className="border-b border-line uppercase tracking-wide text-ink-faint">
                      <TableHead scope="col" className="py-2 pr-2">Estancia</TableHead>
                      <TableHead scope="col" className="py-2 pr-2">Superficie (m²)</TableHead>
                      <TableHead scope="col" className="py-2 pr-2">Longitud (m)</TableHead>
                      <TableHead scope="col" className="py-2"><span className="sr-only">Acciones</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map(room => (
                      <TableRow key={room.id} className="border-b border-line-soft">
                        <TableCell className="py-2 pr-2">
                          <Select value={room.type} onValueChange={next => { if (next != null) patchRoom(room.id, { type: String(next) }) }}>
                            <SelectTrigger aria-label={`Tipo de estancia · ${roomLabel(room.type)}`} className="h-8 w-40 text-xs"><SelectValue>{(selected: string | null) => roomLabel(selected ?? room.type)}</SelectValue></SelectTrigger>
                            <SelectContent alignItemWithTrigger={false} className="w-max"><SelectGroup>{ROOM_TYPES.map(type => <SelectItem key={type} value={type}>{ROOM_LABELS[type]}</SelectItem>)}</SelectGroup></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2 pr-2"><Input aria-label={`Superficie · ${roomLabel(room.type)}`} type="number" min="0" step="0.1" value={room.area || ''} onChange={event => patchRoom(room.id, { area: Math.max(0, Number(event.target.value)) })} className="w-24" /></TableCell>
                        <TableCell className="py-2 pr-2"><Input aria-label={`Longitud · ${roomLabel(room.type)}`} type="number" min="0" step="0.1" value={room.length || ''} onChange={event => patchRoom(room.id, { length: Math.max(0, Number(event.target.value)) })} className="w-20" /></TableCell>
                        <TableCell className="py-2"><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${roomLabel(room.type)}`} onClick={() => setRooms(rooms.filter(entry => entry.id !== room.id))}><Trash2 /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

          {points.totalPoints > 0 && (
            <div className="mt-4 overflow-x-auto">
              <Table aria-label="Puntos mínimos por circuito" className="w-full text-left text-xs">
                <TableHeader>
                  <TableRow className="border-b border-line uppercase tracking-wide text-ink-faint">
                    <TableHead scope="col" className="py-2 pr-2">Circuito</TableHead>
                    <TableHead scope="col" className="py-2 pr-2">Puntos mínimos</TableHead>
                    <TableHead scope="col" className="py-2 pr-2">Máx. por circuito (tabla 1)</TableHead>
                    <TableHead scope="col" className="py-2">Circuitos necesarios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {POINT_CIRCUITS.filter(circuit => points.totals[circuit] > 0).map(circuit => (
                    <TableRow key={circuit} className="border-b border-line-soft">
                      <TableCell className="py-2 pr-2 font-semibold">{circuit} · {POINT_CIRCUIT_LABELS[circuit]}</TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{points.totals[circuit]}</TableCell>
                      <TableCell className="py-2 pr-2 tabular-nums">{MAX_POINTS[circuit] ?? '—'}</TableCell>
                      <TableCell className="py-2 tabular-nums">{MAX_POINTS[circuit] == null ? '—' : points.requiredCircuits[circuit]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="mt-2 text-[11px] leading-4 text-ink-faint">C8 y C9 no tienen máximo de puntos en la tabla 1: se limitan por potencia (5.750 W por circuito). C13 se rige por la ITC-BT-52.</p>
            </div>
          )}
        </div>

        <Dialog open={showCircuitTable} onOpenChange={setShowCircuitTable}>
          <DialogContent id="housing-circuits-dialog" showCloseButton={false} className="max-h-[85dvh] w-full gap-0 overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 sm:max-w-4xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <DialogTitle id="housing-circuits-title" className="text-xl font-bold text-ink">Circuitos de vivienda · ITC-BT-25</DialogTitle>
                <DialogDescription id="housing-circuits-description" className="mt-1 text-sm text-ink-faint">Tabla 1: características eléctricas de los circuitos. Los adicionales C6, C7 y C12 toman las del circuito base al que amplían.</DialogDescription>
              </div>
              <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tabla de circuitos" />}><X /></DialogClose>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                    <TableHead scope="col" className="py-2 pr-3">Circuito</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">Nombre</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">P/toma</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">Fs</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">Fu</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">Tipo de toma</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">PIA</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">Máx. puntos</TableHead>
                    <TableHead scope="col" className="py-2 pr-3">Sección</TableHead>
                    <TableHead scope="col" className="py-2">Tubo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {HOUSING_CIRCUIT_TABLE.map(circuit => (
                    <TableRow key={circuit.id} className="border-b border-line-soft">
                      <TableCell className="py-2 pr-3 font-semibold">{circuit.id}</TableCell>
                      <TableCell className="py-2 pr-3">{circuit.name}</TableCell>
                      <TableCell className="py-2 pr-3 tabular-nums">{circuit.powerPerPointW == null ? '—' : `${fmt(circuit.powerPerPointW)} W`}</TableCell>
                      <TableCell className="py-2 pr-3 tabular-nums">{circuit.fs == null ? '—' : circuit.fs}</TableCell>
                      <TableCell className="py-2 pr-3 tabular-nums">{circuit.fu == null ? '—' : circuit.fu}</TableCell>
                      <TableCell className="py-2 pr-3">{circuit.socket}</TableCell>
                      <TableCell className="py-2 pr-3 tabular-nums">{circuit.breakerA == null ? '—' : `${circuit.breakerA} A`}</TableCell>
                      <TableCell className="py-2 pr-3 tabular-nums">{circuit.maxPoints == null ? '—' : circuit.maxPoints}</TableCell>
                      <TableCell className="py-2 pr-3 tabular-nums">{circuit.section == null ? '—' : `${circuit.section} mm²`}</TableCell>
                      <TableCell className="py-2 tabular-nums">{circuit.tube == null ? '—' : `${circuit.tube} mm`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-xs leading-5 text-ink-faint">
              {HOUSING_CIRCUIT_TABLE_NOTES.map(note => <li key={note}>{note}</li>)}
            </ul>
            <SourceNote label="ITC-BT-25 §3, tabla 1">Tabla 1 publicada en la ITC-BT-25 §3, con las notas que cambian una decisión de diseño. El número de circuitos instalados se ajusta en la card; la tabla describe el grado de electrificación. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>
          </DialogContent>
        </Dialog>

        {evaluation.problems.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 rounded-control bg-warning-soft p-3 text-xs leading-5 text-warning-ink">
            {evaluation.problems.map(problem => <li key={problem} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{problem}</li>)}
          </ul>
        )}

        <ul className="mt-4 flex list-disc flex-col gap-1 pl-5 text-xs leading-5 text-ink-faint">
          {evaluation.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}
        </ul>

        {explanationMode === 'didactic' && <CalculationSteps steps={interiorExplanation.steps as ExplanationStep[]} />}
        {explanationMode === 'didactic' && <CalculationSteps steps={pointsExplanation.steps as ExplanationStep[]} />}

        {showSourceNotes && <SourceNote label="ITC-BT-25 §2.1">ITC-BT-25 §2.1: el DGMP lleva un IGA omnipolar independiente del ICP y uno o varios diferenciales de 30 mA con intensidad asignada igual o superior a la del IGA, como mínimo uno por cada cinco circuitos; la protección contra sobretensiones se añade cuando la ITC-BT-23 lo exige. El ICP va en envolvente precintable y su calibre depende de la potencia contratada (ITC-BT-17). <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}
      </section>
    </div>
  )
}
