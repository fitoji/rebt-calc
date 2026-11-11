'use client'

import type { ReactNode } from 'react'

import { INSTALLATION_SCENARIOS, type InstallationType } from '../lib/installation-config.mjs'
import { formatPower, formatPowerValue } from '../lib/power-units.mjs'

/**
 * Tarjeta de resultado del rail.
 *
 * El rail es estado del proyecto, no de la pestaña: por eso vive fuera de los
 * paneles. Pero la cifra que encabeza la tarjeta sí es la de la pestaña activa,
 * y esta tarjeta la resume sin recalcular nada: cada pestaña pasa el número que
 * ya produjo su motor (la previsión, el dimensionado de líneas y el cuadro
 * interior). Acá sólo se elige el encabezado, la cifra grande y dos o tres
 * líneas de contexto, con la misma receta visual de siempre.
 */

/** Pestaña cuyo resultado resume la tarjeta. */
export type RailTab = 'cargas' | 'lga' | 'di' | 'interiores' | 'esquema'

/** Una fila del desglose P1–P5: código, rótulo, potencia y si el bloque tiene carga. */
export type RailLoadRow = readonly [string, string, number, boolean]

/** Lo que el rail necesita de una línea ya dimensionada. */
export type RailLineSummary = {
  section: number | null
  dropPercent: number | null
  protection: number | null
}

/** Resumen del cuadro de la vivienda seleccionada, ya evaluado por la ITC-BT-25. */
export type RailDwellingSummary = {
  label: string
  powerW: number
  /** Grado de electrificación de la tabla A, o `null` si la potencia está fuera de tabla. */
  grade: string | null
  igaA: number | null
  maxPowerW: number | null
  differentials: number
  sensitivityMa: number
}

export type RailResultProps = {
  tab: RailTab
  /** Unidad de potencia del proyecto: la misma que el resto de la interfaz. */
  unit: 'W' | 'kW'
  /** Potencia total prevista del proyecto. */
  loadTotal: number
  /** Bloques P1–P5 con carga; el filtro vive en el rail, junto a la previsión. */
  loadRows: ReadonlyArray<RailLoadRow>
  installationType: InstallationType
  /** Potencia con la que se dimensionó la LGA. */
  lgaPowerW: number
  lga: RailLineSummary
  derivationCount: number
  /** Potencia total derivada del proyecto. */
  derivationPowerW: number
  /** Derivación seleccionada en la tabla de DI, si hay alguna. */
  selectedDerivation: (RailLineSummary & { label: string; powerW: number }) | null
  /** Vivienda seleccionada en Cuadros, si hay alguna. */
  dwelling: RailDwellingSummary | null
}

const fmt = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

const sectionLabel = (section: number | null) => section == null ? '—' : `${fmt(section)} mm²`
const dropLabel = (dropPercent: number | null) => dropPercent == null ? '—' : `${fmt(dropPercent, 2)} %`
const protectionLabel = (protection: number | null) => protection == null ? '—' : `${fmt(protection)} A`
const installationLabel = (type: InstallationType) =>
  INSTALLATION_SCENARIOS.find(scenario => scenario.id === type)?.label ?? 'Supuesto de enlace sin definir'

function RailCard({ heading, figure, unit, caption, note, children }: {
  heading: string
  figure: string
  unit?: string
  caption: string
  note?: string
  children?: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-panel bg-panel text-panel-foreground shadow-panel">
      <div className="border-b border-panel-line p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-on-panel">{heading}</p>
        <p className="mt-5 text-4xl font-bold tabular-nums tracking-tight">
          {figure}
          {unit && <span className="text-lg font-medium text-panel-muted"> {unit}</span>}
        </p>
        <p className="mt-1 text-sm text-panel-muted">{caption}</p>
        {note && <p className="mt-3 rounded-lg bg-panel-edge/60 p-3 text-xs leading-5 text-panel-muted">{note}</p>}
      </div>
      {children && <div className="flex flex-col gap-3 p-6">{children}</div>}
    </div>
  )
}

function RailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-panel-muted">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}

/** Previsión de cargas: la cifra del proyecto y el desglose P1–P5 con su peso. */
function CargasRailCard({ unit, loadTotal, loadRows }: RailResultProps) {
  const power = (watts: number) => formatPower(watts, unit)
  return (
    <RailCard
      heading="Resultado del proyecto"
      figure={formatPowerValue(loadTotal, unit)}
      unit={unit}
      caption="Potencia total prevista"
      note={loadTotal === 0 ? 'Sin cargas todavía. Añade viviendas o pulsa «Cargar ejemplo» para partir del edificio de referencia.' : undefined}
    >
      {loadRows.map(([code, label, amount]) => {
        const share = loadTotal > 0 ? (amount / loadTotal) * 100 : 0
        return <div key={code}>
          <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-panel-muted"><b className="mr-2 text-brand-on-panel">{code}</b>{label}</span><span className="font-semibold tabular-nums">{power(amount)}</span></div>
          <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel-line"><div className="h-full rounded-full bg-brand-on-panel/80" style={{ width: `${share}%` }} /></div>
        </div>
      })}
      <div className="my-2 h-px bg-panel-line" />
      <div className="flex items-center justify-between"><span className="font-semibold">Total</span><span className="text-xl font-bold tabular-nums text-brand-on-panel">{power(loadTotal)}</span></div>
    </RailCard>
  )
}

/** Línea general: potencia, sección final, caída y protección de la LGA. */
function LgaRailCard({ unit, installationType, lgaPowerW, lga }: RailResultProps) {
  // Un único usuario no tiene línea general: enseñar sección, caída y
  // protección en cero describiría una línea que la instalación no tiene.
  const noLga = installationType === 'single-user'
  return (
    <RailCard
      heading="Resultado de la LGA"
      figure={noLga ? '—' : formatPowerValue(lgaPowerW, unit)}
      unit={noLga ? undefined : unit}
      caption={noLga ? 'Sin línea general de alimentación' : 'Potencia de la LGA'}
      note={noLga ? 'Único usuario: la derivación individual llega directa al cuadro de mando.' : undefined}
    >
      <RailRow label="Supuesto de enlace" value={installationLabel(installationType)} />
      {!noLga && <>
        <RailRow label="Sección de fase" value={sectionLabel(lga.section)} />
        <RailRow label="Caída de tensión" value={dropLabel(lga.dropPercent)} />
        <RailRow label="Protección (In)" value={protectionLabel(lga.protection)} />
      </>}
    </RailCard>
  )
}

/** Derivaciones: cuántas son, cuánta potencia mueven y la que está seleccionada. */
function DiRailCard({ unit, derivationCount, derivationPowerW, selectedDerivation }: RailResultProps) {
  return (
    <RailCard
      heading="Resultado de las derivaciones"
      figure={fmt(derivationCount)}
      unit={derivationCount === 1 ? 'derivación' : 'derivaciones'}
      caption="Derivaciones individuales del proyecto"
      note={derivationCount === 0 ? 'Todavía no hay derivaciones. Genéralas desde la previsión de cargas en la pestaña DI.' : undefined}
    >
      <RailRow label="Potencia total derivada" value={formatPower(derivationPowerW, unit)} />
      {selectedDerivation && <>
        <div className="my-2 h-px bg-panel-line" />
        <RailRow label={selectedDerivation.label} value={formatPower(selectedDerivation.powerW, unit)} />
        <RailRow label="Sección de fase" value={sectionLabel(selectedDerivation.section)} />
        <RailRow label="Caída de tensión" value={dropLabel(selectedDerivation.dropPercent)} />
        <RailRow label="Protección (In)" value={protectionLabel(selectedDerivation.protection)} />
      </>}
      {!selectedDerivation && derivationCount > 0 && <p className="text-xs leading-5 text-panel-muted">Selecciona una derivación en la tabla para ver su sección, su caída y su protección.</p>}
    </RailCard>
  )
}

/** Cuadro de la vivienda seleccionada: escalón, IGA, diferenciales y potencia máxima. */
function CuadrosRailCard({ unit, dwelling }: RailResultProps) {
  if (!dwelling) {
    return (
      <RailCard
        heading="Resultado del cuadro"
        figure="—"
        caption="Sin viviendas en el proyecto"
        note="Generá las derivaciones desde la previsión en la pestaña DI para ver el cuadro de la vivienda."
      />
    )
  }

  const step = dwelling.grade == null
    ? `${formatPower(dwelling.powerW, unit)} · fuera de tabla`
    : `${dwelling.grade} · ${formatPower(dwelling.powerW, unit)}`
  return (
    <RailCard
      heading="Resultado del cuadro"
      figure={dwelling.igaA == null ? '—' : fmt(dwelling.igaA)}
      unit={dwelling.igaA == null ? undefined : 'A'}
      caption={`IGA · ${dwelling.label}`}
    >
      <RailRow label="Escalón de potencia" value={step} />
      <RailRow label="Potencia máxima admisible" value={dwelling.maxPowerW == null ? '—' : formatPower(dwelling.maxPowerW, unit)} />
      <RailRow label="Diferenciales exigidos" value={`${dwelling.differentials} × ${dwelling.sensitivityMa} mA`} />
    </RailCard>
  )
}

/** Esquema: la LGA y las derivaciones que dibuja, con el total del proyecto delante. */
function EsquemaRailCard({ unit, loadTotal, installationType, lga, derivationCount }: RailResultProps) {
  const noLga = installationType === 'single-user'
  return (
    <RailCard
      heading="Resultado del esquema"
      figure={formatPowerValue(loadTotal, unit)}
      unit={unit}
      caption="Potencia total del proyecto"
      note={derivationCount === 0 ? 'El esquema se dibuja con las derivaciones del proyecto: todavía no hay ninguna.' : undefined}
    >
      <RailRow label="LGA" value={noLga ? 'Sin LGA · único usuario' : sectionLabel(lga.section)} />
      <RailRow label="Derivaciones individuales" value={fmt(derivationCount)} />
    </RailCard>
  )
}

/** Una tarjeta de resultado por pestaña activa. */
export function RailResult(props: RailResultProps) {
  switch (props.tab) {
    case 'lga': return <LgaRailCard {...props} />
    case 'di': return <DiRailCard {...props} />
    case 'interiores': return <CuadrosRailCard {...props} />
    case 'esquema': return <EsquemaRailCard {...props} />
    default: return <CargasRailCard {...props} />
  }
}
