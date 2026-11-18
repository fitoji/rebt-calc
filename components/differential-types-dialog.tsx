'use client'

import { X } from 'lucide-react'

import { BoeLink, BOE_REBT, SourceNote } from '@/components/source-note'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DIFFERENTIAL_TRIP_TIMES, DIFFERENTIAL_TYPE_INFO } from '../lib/differentials.mjs'

const WIDTH = 360
const HEIGHT = 176
const LEFT = 40
const RIGHT = 14
const TOP = 12
const BOTTOM = 30
const MAX_MS = 500

const xFor = (index: number, count: number) => LEFT + (index / (count - 1)) * (WIDTH - LEFT - RIGHT)
const yFor = (ms: number) => TOP + (1 - ms / MAX_MS) * (HEIGHT - TOP - BOTTOM)
const points = (values: Array<{ multiple: number; ms: number }>) => values
  .map((value, index) => `${xFor(index, values.length)},${yFor(value.ms)}`)
  .join(' ')

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
                  <TableCell className="py-2 pr-3">{info.detecta}</TableCell>
                  <TableCell className="py-2 pr-3 text-ink-subtle">{info.cargas}</TableCell>
                  <TableCell className="py-2 pr-3 text-ink-subtle">{info.cc}</TableCell>
                  <TableCell className="py-2 text-xs text-ink-faint">{info.norma}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-bold text-ink">Curva corriente · tiempo de disparo</h3>
          <p className="mt-1 max-w-[75ch] text-xs leading-5 text-ink-muted">Envolvente de los tiempos máximos de ensayo. La curva real del fabricante puede ser más rápida; no se usa para dimensionar.</p>
          <div className="mt-3 flex flex-wrap items-start gap-6">
            <svg role="img" aria-label="Tiempos máximos de disparo a una, dos y cinco veces la intensidad diferencial nominal" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-[26rem]">
              <title>Tiempos máximos de disparo según IΔn</title>
              <line x1={LEFT} y1={TOP} x2={LEFT} y2={HEIGHT - BOTTOM} stroke="var(--line)" />
              <line x1={LEFT} y1={HEIGHT - BOTTOM} x2={WIDTH - RIGHT} y2={HEIGHT - BOTTOM} stroke="var(--line)" />
              {[0, 300, 500].map(ms => (
                <g key={ms}>
                  <line x1={LEFT} y1={yFor(ms)} x2={WIDTH - RIGHT} y2={yFor(ms)} stroke="var(--line-soft)" />
                  <text x={LEFT - 6} y={yFor(ms) + 3} fontSize={8} textAnchor="end" style={{ fill: 'var(--ink-faint)' }}>{ms}</text>
                </g>
              ))}
              {general.map((value, index) => (
                <text key={value.multiple} x={xFor(index, general.length)} y={HEIGHT - BOTTOM + 14} fontSize={8} textAnchor="middle" style={{ fill: 'var(--ink-faint)' }}>{value.multiple}×</text>
              ))}
              <polyline points={points(general)} fill="none" stroke="var(--brand-mark)" strokeWidth={2} />
              <polyline points={points(selective.max)} fill="none" stroke="var(--ink-subtle)" strokeWidth={1.6} strokeDasharray="4 3" />
              <polyline points={points(selective.min)} fill="none" stroke="var(--ink-faint)" strokeWidth={1.4} strokeDasharray="2 3" />
              <text x={WIDTH - RIGHT} y={TOP + 10} fontSize={8} textAnchor="end" style={{ fill: 'var(--brand-ink)' }}>general</text>
              <text x={WIDTH - RIGHT} y={TOP + 22} fontSize={8} textAnchor="end" style={{ fill: 'var(--ink-subtle)' }}>S · máx.</text>
              <text x={WIDTH - RIGHT} y={TOP + 34} fontSize={8} textAnchor="end" style={{ fill: 'var(--ink-faint)' }}>S · mín.</text>
            </svg>
            <Table aria-label="Tiempos de disparo por múltiplo de IΔn" className="w-full max-w-[20rem] text-left text-xs">
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
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">{source}</p>
        </section>

        <div className="mt-4">
          <SourceNote label="ITC-BT-24 · ITC-BT-25 · Guía BT-26">La ITC-BT-25 §2.1 fija 30 mA como sensibilidad máxima para proteger los circuitos de la vivienda; la Guía BT-26 exige tipo S y al menos tres veces la sensibilidad del aguas abajo para un diferencial instalado en serie. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>
        </div>
      </DialogContent>
    </Dialog>
  )
}
