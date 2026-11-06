'use client'

import type { ReactNode } from 'react'

/**
 * Símbolos del esquema unifilar según UNE-EN 60617 (idéntica a IEC 60617).
 *
 * Cada símbolo se dibuja centrado en el origen (0,0) con terminales superior
 * (y = -14) e inferior (y = +14); el padre lo coloca con `translate(x,y)`.
 *
 * El color viaja como variable CSS y no como hexadecimal: el esquema se lee
 * igual en tema claro y en tema noche, y no hay una segunda paleta que mantener.
 * El trazo se hereda del grupo, así que cada símbolo declara sus formas y no
 * repite `stroke` en cada línea.
 */

export interface SymProps {
  color?: string
  sw?: number
}

const INK = 'var(--ink)'
const PAPER = 'var(--paper)'
const STROKE = 2

/** Envoltura común: el trazo y el grosor se heredan; el relleno es explícito. */
function Device({ color = INK, sw = STROKE, children }: { color?: string; sw?: number; children: ReactNode }) {
  return <g style={{ stroke: color, strokeWidth: sw, fill: 'none' }}>{children}</g>
}

/** 02-02-04 · Conductor vertical con marca de número de conductores. */
export function Conductor({
  x, y1, y2, color = INK, sw = STROKE, ticks = 0,
}: { x: number; y1: number; y2: number; color?: string; sw?: number; ticks?: number }) {
  const mid = (y1 + y2) / 2
  const marks = Array.from({ length: Math.max(0, ticks) }, (_, index) => mid - ((ticks - 1) * 7) / 2 + index * 7)

  return (
    <Device color={color} sw={sw}>
      <line x1={x} y1={y1} x2={x} y2={y2} />
      {marks.map((y, index) => <line key={index} x1={x - 6} y1={y + 4} x2={x + 6} y2={y - 4} />)}
    </Device>
  )
}

/** 02-02-05 · Embarrado. */
export function Busbar({
  x1, y1, x2, y2, color = INK, sw = 5,
}: { x1: number; y1: number; x2: number; y2: number; color?: string; sw?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: color, strokeWidth: sw, strokeLinecap: 'round' }} />
}

/** 02-02-15 · Fuente de alimentación de red (AC). */
export function NetworkSource(p: SymProps) {
  return (
    <Device {...p}>
      <line x1={0} y1={11} x2={0} y2={14} />
      <circle cx={0} cy={0} r={11} style={{ fill: PAPER }} />
      <path d="M -6 0 Q -3 -7 0 0 T 6 0" />
    </Device>
  )
}

/** 02-04-01 · Seccionador. */
export function Disconnector(p: SymProps) {
  return (
    <Device {...p}>
      <line x1={0} y1={-14} x2={0} y2={-7} />
      <circle cx={0} cy={-7} r={3} />
      <line x1={0} y1={5} x2={11} y2={-13} />
      <circle cx={0} cy={5} r={2.5} style={{ fill: p.color ?? INK }} />
      <line x1={0} y1={5} x2={0} y2={14} />
    </Device>
  )
}

/** 02-04-03 · Interruptor automático: seccionador con la marca de disparo. */
export function CircuitBreaker(p: SymProps) {
  return (
    <Device {...p}>
      <line x1={0} y1={-14} x2={0} y2={-7} />
      <circle cx={0} cy={-7} r={3} />
      <line x1={0} y1={5} x2={11} y2={-13} />
      <circle cx={0} cy={5} r={2.5} style={{ fill: p.color ?? INK }} />
      <line x1={0} y1={5} x2={0} y2={14} />
      <line x1={-3.2} y1={-10.2} x2={3.2} y2={-3.8} />
      <line x1={-3.2} y1={-3.8} x2={3.2} y2={-10.2} />
    </Device>
  )
}

/**
 * 02-04-06 · Interruptor diferencial: automático más el relé de corriente
 * residual, rotulado con la sensibilidad `IΔn`, que es la magnitud que define
 * el aparato (30 mA), no su corriente asignada.
 */
export function RCD(p: SymProps) {
  const color = p.color ?? INK
  return (
    <Device {...p}>
      <line x1={0} y1={-14} x2={0} y2={-7} />
      <circle cx={0} cy={-7} r={3} />
      <line x1={0} y1={5} x2={11} y2={-13} />
      <circle cx={0} cy={5} r={2.5} style={{ fill: color }} />
      <line x1={0} y1={5} x2={0} y2={14} />
      <line x1={-3.2} y1={-10.2} x2={3.2} y2={-3.8} />
      <line x1={-3.2} y1={-3.8} x2={3.2} y2={-10.2} />
      <line x1={0} y1={2} x2={9} y2={2} />
      <rect x={9} y={-3} width={15} height={11} rx={1.5} style={{ fill: PAPER }} />
      <text x={16.5} y={5} fontSize={6.5} textAnchor="middle" style={{ fill: color, stroke: 'none' }}>IΔn</text>
    </Device>
  )
}

/** 02-18-01 · Fusible. */
export function Fuse(p: SymProps) {
  return (
    <Device {...p}>
      <line x1={0} y1={-14} x2={0} y2={-9} />
      <rect x={-5} y={-9} width={10} height={18} rx={1.5} style={{ fill: PAPER }} />
      <line x1={0} y1={-9} x2={0} y2={9} />
      <line x1={0} y1={9} x2={0} y2={14} />
    </Device>
  )
}

/** 02-17-05 · Contador de energía. */
export function EnergyMeter(p: SymProps) {
  const color = p.color ?? INK
  return (
    <Device {...p}>
      <line x1={0} y1={-14} x2={0} y2={-10} />
      <circle cx={0} cy={0} r={10} style={{ fill: PAPER }} />
      <text x={0} y={3.5} fontSize={8} fontWeight={700} textAnchor="middle" style={{ fill: color, stroke: 'none' }}>Wh</text>
      <line x1={0} y1={10} x2={0} y2={14} />
    </Device>
  )
}

/** 02-12-01 · Puesta a tierra. */
export function Earth(p: SymProps) {
  return (
    <Device {...p}>
      <line x1={0} y1={-14} x2={0} y2={0} />
      <line x1={-10} y1={0} x2={10} y2={0} />
      <line x1={-6.5} y1={5} x2={6.5} y2={5} />
      <line x1={-3} y1={10} x2={3} y2={10} />
    </Device>
  )
}

/**
 * 02-15-01 · Receptor genérico, con la etiqueta de la carga al costado.
 *
 * La caja de texto mide 94 px: el nombre llega ya recortado y el completo vive
 * en el `<title>`, que el navegador muestra al pasar el puntero. `ink` es el
 * color del rótulo sobre la caja teñida; no tiene por qué ser el del trazo.
 */
export function Load({
  label, sub, color = INK, ink = INK, sw = STROKE,
}: { label: string; sub?: string; color?: string; ink?: string; sw?: number }) {
  return (
    <Device color={color} sw={sw}>
      <line x1={0} y1={-14} x2={0} y2={-8} />
      <path d="M -11 -8 A 11 11 0 0 1 11 -8 L -11 -8 Z" style={{ fill: PAPER }} />
      <line x1={0} y1={3} x2={0} y2={14} />
      {label && (
        <>
          <rect
            x={16} y={-12} width={94} height={26} rx={4}
            style={{ fill: `color-mix(in oklab, ${color} 9%, ${PAPER})`, strokeWidth: 1.4 }}
          />
          <text x={63} y={-1} fontSize={10} fontWeight={700} textAnchor="middle" style={{ fill: ink, stroke: 'none' }}>{label}</text>
          {sub && <text x={63} y={10} fontSize={8.5} textAnchor="middle" style={{ fill: 'var(--ink-faint)', stroke: 'none' }}>{sub}</text>}
        </>
      )}
    </Device>
  )
}

/** Marca de número de polos (`2P`, `4P`) como anotación del aparato. */
export function PoleMark({ x, y, text, color = 'var(--ink-faint)' }: { x: number; y: number; text: string; color?: string }) {
  return <text x={x} y={y} fontSize={8.5} textAnchor="middle" style={{ fill: color }}>{text}</text>
}

/** Símbolos que la lámina puede mostrar, para la leyenda de la pestaña. */
export const IEC_SYMBOL_CATALOG: { code: string; name: string; render: ReactNode }[] = [
  { code: '02-02-15', name: 'Fuente de red (AC)', render: <NetworkSource /> },
  { code: '02-04-03', name: 'Interruptor automático', render: <CircuitBreaker /> },
  { code: '02-04-06', name: 'Interruptor diferencial', render: <RCD /> },
  { code: '02-04-01', name: 'Seccionador', render: <Disconnector /> },
  { code: '02-17-05', name: 'Contador de energía', render: <EnergyMeter /> },
  { code: '02-18-01', name: 'Fusible', render: <Fuse /> },
  { code: '02-12-01', name: 'Puesta a tierra', render: <Earth /> },
  { code: '02-15-01', name: 'Receptor / carga', render: <Load label="" /> },
]
