'use client'

import { X } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import { BoeLink, BOE_REBT, SourceNote } from '@/components/source-note'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DIFFERENTIAL_TRIP_TIMES, DIFFERENTIAL_TYPE_INFO, differentialTripChartData } from '../lib/differentials.mjs'

const chartConfig = {
  general: { label: 'General · máximo permitido', color: 'var(--brand-mark)' },
  sBand: { label: 'Tipo S · banda permitida', color: 'var(--brand)' },
} satisfies ChartConfig

const chartData = differentialTripChartData()

const WAVE_LABELS = {
  sine: 'Alterna sinusoidal',
  pulsating: 'Alterna sinusoidal y continua pulsante',
  mixed: 'Alterna y pulsante con armónicos',
  dc: 'Alterna, pulsante y continua suave',
  delay: 'Retardo selectivo',
} as const

/** Dibujo esquemático de la corriente residual que detecta cada tipo. */
function Waveform({ kind }: { kind: keyof typeof WAVE_LABELS | null }) {
  if (kind == null) return <span className="text-ink-faint">—</span>
  const paths = {
    sine: 'M1 10 C5 2, 9 2, 13 10 S21 18, 25 10 S33 2, 37 10 S45 18, 47 10',
    pulsating: 'M1 15 H5 A5 5 0 0 1 15 15 H19 A5 5 0 0 1 29 15 H33 A5 5 0 0 1 43 15 H47',
    mixed: 'M1 10 q2 -6 4 0 t4 0 t4 0 t4 0 t4 0 t4 0 t4 0 t4 0 t4 0 t4 0 t4 0',
    dc: 'M1 15 q4 -1 8 0 t8 0 t8 0 t8 0 t8 0',
    delay: 'M2 15 H14 Q22 15 22 5 H46',
  } as const
  return (
    <svg viewBox="0 0 48 20" className="h-5 w-12 text-brand-mark" role="img" aria-label={`Forma de onda: ${WAVE_LABELS[kind]}`}>
      <line x1="1" y1="15" x2="47" y2="15" stroke="var(--line)" />
      {kind === 'delay' && <line x1="22" y1="4" x2="22" y2="16" stroke="currentColor" strokeDasharray="2 2" opacity={0.45} />}
      <path d={paths[kind]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/** Referencia normativa de tipos de diferencial y de su curva de disparo. */
export function DifferentialTypesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { general, selective, source } = DIFFERENTIAL_TRIP_TIMES

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="differential-types-dialog" showCloseButton={false} className="max-h-[85dvh] w-full gap-0 overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 sm:max-w-4xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <DialogTitle id="differential-types-title" className="text-xl font-bold text-ink">Tipos de interruptor diferencial</DialogTitle>
            <DialogDescription id="differential-types-description" className="mt-1 max-w-[80ch] text-sm text-ink-faint">La forma de onda que detecta cada tipo depende de las cargas de la instalación. El tipo S no es una forma de onda: es el retardo de selectividad del diferencial de cabecera.</DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tipos de diferencial" />}><X /></DialogClose>
        </div>

        <div className="overflow-x-auto">
          <Table aria-label="Tipos de interruptor diferencial" className="w-full text-left text-sm">
            <TableHeader>
              <TableRow className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                <TableHead scope="col" className="py-2 pr-3">Tipo</TableHead>
                <TableHead scope="col" className="py-2 pr-3">Onda</TableHead>
                <TableHead scope="col" className="py-2 pr-3">Qué detecta</TableHead>
                <TableHead scope="col" className="py-2 pr-3">Cargas típicas</TableHead>
                <TableHead scope="col" className="py-2 pr-3">Componente continua</TableHead>
                <TableHead scope="col" className="py-2">Norma</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(DIFFERENTIAL_TYPE_INFO).map(([type, info]) => (
                <TableRow key={type} className="border-b border-line-soft align-top">
                  <TableCell className="py-2 pr-3 font-bold">{type}</TableCell>
                  <TableCell className="py-2 pr-3"><Waveform kind={info.waveform} /></TableCell>
                  <TableCell className="py-2 pr-3">{info.detecta}</TableCell>
                  <TableCell className="py-2 pr-3 text-ink-subtle">{info.cargas}</TableCell>
                  <TableCell className="py-2 pr-3 text-ink-subtle">{info.cc}</TableCell>
                  <TableCell className="py-2 text-xs text-ink-faint">{info.norma}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 max-w-[75ch] text-xs leading-5 text-ink-muted">La forma de onda es lo que distingue AC, A, F y B: los cuatro comparten la misma curva general de disparo. El tipo S no es una onda, es el retardo de selectividad, y por eso aparece sólo en la gráfica tiempo-corriente.</p>
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-bold text-ink">Curva corriente · tiempo de disparo</h3>
          <p className="mt-1 max-w-[75ch] text-xs leading-5 text-ink-muted">El eje horizontal son las veces la intensidad diferencial nominal (IΔn). El vertical, el tiempo máximo que la norma permite tardar en disparar. La banda sombreada es el margen del tipo S: espera más para dejar actuar primero al diferencial de aguas abajo.</p>
          <ChartContainer
            config={chartConfig}
            role="img"
            aria-label="Tiempos de disparo de un diferencial general y de un tipo S a una, dos y cinco veces la intensidad diferencial nominal"
            className="mt-3 h-[240px] w-full"
          >
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3" />
              <XAxis
                dataKey="multiple"
                tickLine={false}
                axisLine={false}
                tickFormatter={value => `${value}×`}
                label={{ value: 'IΔ / IΔn', position: 'insideBottom', offset: -4, fill: 'var(--ink-faint)' }}
              />
              <YAxis
                domain={[0, 500]}
                ticks={[0, 100, 200, 300, 400, 500]}
                tickLine={false}
                axisLine={false}
                width={52}
                label={{ value: 'Tiempo máximo (ms)', angle: -90, position: 'insideLeft', fill: 'var(--ink-faint)' }}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0].payload as (typeof chartData)[number]
                  return (
                    <div className="rounded-control border border-line bg-paper p-2 text-xs shadow-card">
                      <p className="font-semibold text-ink">{row.multiple} × IΔn</p>
                      <p className="mt-1 text-ink-subtle">General: {row.general} ms máximo</p>
                      <p className="text-ink-subtle">Tipo S: {row.sMin}–{row.sMax} ms</p>
                    </div>
                  )
                }}
              />
              <Area dataKey="sMin" stackId="s" stroke="none" fill="transparent" legendType="none" isAnimationActive={false} />
              <Area dataKey="sBand" stackId="s" stroke="none" fill="var(--color-sBand)" fillOpacity={0.18} isAnimationActive={false} />
              <Line dataKey="sMin" stroke="var(--ink-faint)" strokeWidth={1.4} strokeDasharray="2 3" dot={false} legendType="none" isAnimationActive={false} />
              <Line dataKey="sMax" stroke="var(--ink-subtle)" strokeWidth={1.6} strokeDasharray="4 3" dot={false} legendType="none" isAnimationActive={false} />
              <Line dataKey="general" stroke="var(--color-general)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-general)' }} isAnimationActive={false} />
              <ChartLegend content={<ChartLegendContent />} />
            </ComposedChart>
          </ChartContainer>
          <Table aria-label="Tiempos de disparo por múltiplo de IΔn" className="mt-3 w-full max-w-[34rem] text-left text-xs">
            <TableHeader>
              <TableRow className="border-b border-line text-ink-faint">
                <TableHead scope="col" className="py-2 pr-2">IΔ</TableHead>
                <TableHead scope="col" className="py-2 pr-2">General · máx.</TableHead>
                <TableHead scope="col" className="py-2">Tipo S</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {general.map((value, index) => (
                <TableRow key={value.multiple} className="border-b border-line-soft tabular-nums">
                  <TableCell className="py-2 pr-2">{value.multiple} × IΔn</TableCell>
                  <TableCell className="py-2 pr-2">{value.ms} ms</TableCell>
                  <TableCell className="py-2">{selective.min[index].ms}–{selective.max[index].ms} ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-[11px] text-ink-faint">{source}</p>
        </section>

        <div className="mt-4">
          <SourceNote label="ITC-BT-24 · ITC-BT-25 · Guía BT-26">La ITC-BT-25 §2.1 fija 30 mA como sensibilidad máxima para proteger los circuitos de la vivienda; la Guía BT-26 exige tipo S y al menos tres veces la sensibilidad del aguas abajo para un diferencial instalado en serie. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>
        </div>
      </DialogContent>
    </Dialog>
  )
}
