'use client'

import {
  Busbar,
  CircuitBreaker,
  Conductor,
  Earth,
  EnergyMeter,
  Load,
  NetworkSource,
  RCD,
} from '@/components/unifilar-symbols'
import { formatPower } from '../lib/power-units.mjs'
import {
  UNIFILAR_LAYOUT as L,
  busEndX,
  columnX,
  diagramWidth,
  differentialsFor,
  kindColor,
  kindInk,
  kindLabel,
  polesFor,
  shortCable,
  truncateLabel,
} from '../lib/unifilar.mjs'

/** Lo que la lámina necesita del resultado de una línea ya dimensionada. */
export type UnifilarResult = {
  finalSection?: number | null
  protection?: number | null
  cableType?: string
  dropPercent?: number | null
  ok?: boolean
}

export type UnifilarLine = {
  powerW: number
  voltageV: number
  lengthM: number
  cosPhi: number
  protectionA: number
  result?: UnifilarResult | null
}

export type UnifilarDerivation = UnifilarLine & {
  id: string
  kind: string
  label: string
  system: 'single-phase' | 'three-phase'
  housingIgaA?: number
  interior?: { circuits: number; contractedPowerW: number; hasSurge: boolean } | null
}

export type InstallationKind = 'centralized' | 'partial' | 'single-user'

const drop = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function section(value: number | null | undefined) {
  return value == null ? '—' : `${value} mm²`
}

function amps(value: number | null | undefined) {
  return value == null || value <= 0 ? '—' : `${value} A`
}

/** Etiqueta de dos líneas junto a un conductor vertical. */
function LineLabel({
  x, y, title, sub, anchor = 'start', color,
}: { x: number; y: number; title: string; sub?: string; anchor?: 'start' | 'end'; color?: string }) {
  return (
    <g style={{ fill: color ?? 'var(--ink)' }} textAnchor={anchor}>
      <text x={x} y={y} fontSize={10} fontWeight={600}>{title}</text>
      {sub && <text x={x} y={y + 11} fontSize={8.5} style={{ fill: 'var(--ink-faint)' }}>{sub}</text>}
    </g>
  )
}

/**
 * Columna de origen: acometida, LGA y su protección hasta el embarrado.
 *
 * En el suministro de único usuario la LGA no existe (ITC-BT-14 solo la exige
 * cuando hay centralización de contadores): la lámina muestra la caja general,
 * la medida individual y el embarrado, sin inventar una línea que el proyecto
 * no tiene.
 */
function OriginColumn({ x, lga, singleUser }: { x: number; lga: UnifilarLine; singleUser: boolean }) {
  const res = lga.result
  const protection = res?.protection ?? lga.protectionA

  return (
    <g>
      <text x={x} y={22} fontSize={11} fontWeight={700} textAnchor="middle" style={{ fill: 'var(--ink)' }}>Acometida</text>

      <g transform={`translate(${x},40)`}><NetworkSource /></g>
      <Conductor x={x} y1={54} y2={96} />

      {singleUser ? (
        <>
          <LineLabel x={x + 9} y={70} title="CGP" sub="Sin LGA · medida individual" />
          <g transform={`translate(${x},110)`}><EnergyMeter /></g>
          <text x={x + 18} y={112} fontSize={9.5} fontWeight={600} style={{ fill: 'var(--ink)' }}>Contador</text>
          <Conductor x={x} y1={124} y2={L.busY} ticks={lga.voltageV === 400 ? 3 : 1} />
        </>
      ) : (
        <>
          <LineLabel x={x + 9} y={70} title="LGA" sub={`${section(res?.finalSection)} · ${polesFor('three-phase')}`} />
          <g transform={`translate(${x},110)`}><CircuitBreaker /></g>
          <text x={x + 18} y={105} fontSize={10} fontWeight={600} style={{ fill: 'var(--ink)' }}>In {amps(protection)}</text>
          <text x={x + 18} y={117} fontSize={8.5} style={{ fill: 'var(--ink-faint)' }}>{shortCable(res?.cableType)}</text>
          <Conductor x={x} y1={124} y2={L.busY} ticks={3} />
        </>
      )}

      <LineLabel x={x - 9} y={140} title={formatPower(lga.powerW, 'kW')} sub={`${lga.voltageV} V`} anchor="end" />
      <text x={x - 9} y={164} fontSize={8.5} textAnchor="end" style={{ fill: 'var(--ink-faint)' }}>cos φ {lga.cosPhi} · {lga.lengthM} m</text>
      <text x={x - 9} y={176} fontSize={8.5} textAnchor="end" style={{ fill: 'var(--ink-faint)' }}>
        ΔU {res?.dropPercent == null ? '—' : `${drop.format(res.dropPercent)} %`}
      </text>
    </g>
  )
}

/**
 * Columna de una derivación individual: toma del embarrado, contador (si la
 * medida es centralizada), protección de la línea, diferencial del cuadro del
 * abonado y receptor.
 */
function DerivationColumn({
  derivation, x, withMeter,
}: { derivation: UnifilarDerivation; x: number; withMeter: boolean }) {
  const color = kindColor(derivation.kind)
  const ink = kindInk(derivation.kind)
  const res = derivation.result
  const protection = res?.protection ?? derivation.protectionA
  const iga = derivation.housingIgaA
  const showIga = iga != null && iga > 0 && iga !== protection
  const { differentials, sensitivityMa } = differentialsFor(derivation)
  const label = truncateLabel(derivation.label)
  const poles = polesFor(derivation.system)

  const meterY = L.busY + 40
  const inY = meterY + 44
  const rcdY = inY + 40
  const loadY = rcdY + 48

  return (
    <g>
      <Conductor
        x={x}
        y1={L.busY + 8}
        y2={(withMeter ? meterY : inY) - 14}
        color={color}
        ticks={derivation.system === 'three-phase' ? 3 : 1}
      />
      <text x={x - 8} y={L.busY + 18} fontSize={9} fontWeight={700} textAnchor="end" style={{ fill: ink }}>DI</text>
      <text x={x - 8} y={L.busY + 29} fontSize={8} textAnchor="end" style={{ fill: 'var(--ink-faint)' }}>{section(res?.finalSection)}</text>

      {withMeter && (
        <>
          <g transform={`translate(${x},${meterY})`}><EnergyMeter color={color} /></g>
          <Conductor x={x} y1={meterY + 14} y2={inY - 14} color={color} />
        </>
      )}

      <g transform={`translate(${x},${inY})`}><CircuitBreaker color={color} /></g>
      <text x={x + 18} y={inY - 2} fontSize={9.5} fontWeight={600} style={{ fill: ink }}>{amps(protection)}</text>
      <text x={x - 24} y={inY + 3} fontSize={8.5} textAnchor="middle" style={{ fill: 'var(--ink-faint)' }}>{poles}</text>
      {showIga && (
        <text x={x + 18} y={inY + 10} fontSize={8.5} style={{ fill: 'var(--ink-faint)' }}>IGA {iga} A</text>
      )}

      <Conductor x={x} y1={inY + 14} y2={rcdY - 14} color={color} />
      <g transform={`translate(${x},${rcdY})`}><RCD color={color} /></g>
      <text x={x + 28} y={rcdY + 4} fontSize={8.5} style={{ fill: ink }}>
        {sensitivityMa} mA{differentials > 1 ? ` ×${differentials}` : ''}
      </text>

      <Conductor x={x} y1={rcdY + 14} y2={loadY - 14} color={color} />
      <g transform={`translate(${x},${loadY})`}>
        <title>{`${derivation.label} · ${kindLabel(derivation.kind)}`}</title>
        <Load label={label} sub={`${formatPower(derivation.powerW, 'kW')} · ${poles}`} color={color} ink={ink} />
      </g>
      <g transform={`translate(${x - 28},${loadY})`}><Earth color={color} sw={1.6} /></g>

      <text x={x} y={loadY + 38} fontSize={8.5} textAnchor="middle" style={{ fill: 'var(--ink-faint)' }}>
        {shortCable(res?.cableType)} · {derivation.lengthM} m
      </text>
      <text x={x} y={loadY + 50} fontSize={8.5} textAnchor="middle" style={{ fill: 'var(--ink-faint)' }}>
        ΔU {res?.dropPercent == null ? '—' : `${drop.format(res.dropPercent)} %`}
      </text>
      {res && (
        <text
          x={x} y={loadY + 63} fontSize={9} fontWeight={700} textAnchor="middle"
          style={{ fill: res.ok ? 'var(--ink-subtle)' : 'var(--danger)' }}
        >
          {res.ok ? 'Conforme' : 'Revisar'}
        </text>
      )}
    </g>
  )
}

/**
 * Lámina del esquema unifilar.
 *
 * El ancho crece con el número de derivaciones y la lámina se desplaza en
 * horizontal: comprimir columnas hasta que no se lean sería peor que scrollear.
 * El contenedor es enfocable para que el desplazamiento no dependa del ratón
 * (WCAG 2.1.1).
 */
export function UnifilarDiagram({
  lga, derivations, installationType = 'centralized',
}: { lga: UnifilarLine; derivations: UnifilarDerivation[]; installationType?: InstallationKind }) {
  const singleUser = installationType === 'single-user'
  const width = diagramWidth(derivations.length)
  const busEnd = busEndX(derivations.length)

  return (
    <div
      role="region"
      aria-label="Esquema unifilar del edificio, desplazable en horizontal"
      tabIndex={0}
      className="w-full overflow-x-auto rounded-card border border-line bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <svg
        width={width}
        height={L.height}
        viewBox={`0 0 ${width} ${L.height}`}
        className="block"
        style={{ minWidth: width }}
        role="img"
        aria-label={`Esquema unifilar: acometida, ${singleUser ? 'medida individual' : 'LGA'} y ${derivations.length} derivaciones individuales`}
      >
        <text x={L.lgaX + 9} y={L.busY - 12} fontSize={9.5} fontWeight={700} style={{ fill: 'var(--ink)' }}>
          Embarrado general
        </text>

        <OriginColumn x={L.lgaX} lga={lga} singleUser={singleUser} />

        <Busbar x1={L.lgaX} y1={L.busY} x2={busEnd} y2={L.busY} sw={5} />

        {derivations.map((derivation, index) => (
          <DerivationColumn
            key={derivation.id}
            derivation={derivation}
            x={columnX(index)}
            withMeter={!singleUser}
          />
        ))}
      </svg>
    </div>
  )
}

/** Leyenda de tipos de carga: el color del punto es el de la columna. */
export function KindLegend() {
  const kinds = ['dwelling', 'local', 'common-services', 'garage', 'irve', 'custom']

  return (
    <ul className="flex flex-wrap gap-2">
      {kinds.map(kind => (
        <li
          key={kind}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-muted"
        >
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: kindColor(kind) }} />
          {kindLabel(kind)}
        </li>
      ))}
    </ul>
  )
}
