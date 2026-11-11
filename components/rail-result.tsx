'use client'

import type { ReactNode } from 'react'

import { INSTALLATION_SCENARIOS, type InstallationType } from '../lib/installation-config.mjs'
import { formatPower, formatPowerValue } from '../lib/power-units.mjs'
import { ConductorList, type ResultElement } from './line-modules'

/**
 * Tarjeta de resultado del rail.
 *
 * El rail es estado del proyecto, no de la pestaña: por eso vive fuera de los
 * paneles. Pero la cifra que encabeza la tarjeta sí es la de la pestaña activa,
 * y esta tarjeta la resume sin recalcular nada: cada pestaña pasa el número que
 * ya produjo su motor (la previsión, el dimensionado de líneas y el cuadro
 * interior). Acá sólo se elige el encabezado, la cifra grande y el desglose,
 * con la misma receta visual de siempre.
 *
 * El desglose de la LGA y de la derivación seleccionada vive acá desde que los
 * paneles dejaron de repetirlo: sus cifras ya no se pintan dos veces.
 */

/** Pestaña cuyo resultado resume la tarjeta. */
export type RailTab = 'cargas' | 'lga' | 'di' | 'interiores' | 'esquema'

/** Una fila del desglose P1–P5: código, rótulo, potencia y si el bloque tiene carga. */
export type RailLoadRow = readonly [string, string, number, boolean]

/**
 * Lo que el rail necesita de una línea ya dimensionada: el resultado completo
 * que produjo el motor para el panel, el límite con el que se dimensionó y los
 * conductores que el panel describe. La tarjeta no recalcula la línea.
 */
export type RailLineSummary = {
  finalSection: number | null
  ratedCurrent: number
  sectionByDrop: number
  momentKwM: number
  gamma: number
  tableCurrent: number | null
  groupingFactor: number
  correctedCurrent: number | null
  dropPercent: number | null
  dropPercentIn: number | null
  protection: number | null
  housingIga: number | null
  maxAdmissiblePowerW: number | null
  /** Límite de caída con el que se dimensionó la línea. */
  maxDropPercent: number
  problems: readonly string[]
  elements: readonly ResultElement[]
}

/** Derivación seleccionada en la tabla de DI: su línea ya dimensionada y su potencia. */
export type RailSelectedDerivation = RailLineSummary & { label: string; powerW: number }

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
  /** Línea general ya dimensionada por el motor. */
  lga: RailLineSummary
  derivationCount: number
  /** Potencia total derivada del proyecto. */
  derivationPowerW: number
  /** Derivación seleccionada en la tabla de DI, si hay alguna. */
  selectedDerivation: RailSelectedDerivation | null
  /** Vivienda seleccionada en Cuadros, si hay alguna. */
  dwelling: RailDwellingSummary | null
}

const fmt = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

/** La cifra que se lee en la tarjeta no finge una precisión que no tiene. */
const fmtTrim = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(value)

const sectionLabel = (section: number | null) => section == null ? '—' : `${fmt(section)} mm²`
const limitLabel = (limit: number) => `${limit.toString().replace('.', ',')} %`
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
      <span className="shrink-0 font-semibold tabular-nums">{value}</span>
    </div>
  )
}

/** Rótulo de bloque dentro de la tarjeta: agrupa renglones, no añade cifras. */
function RailBlock({ title }: { title: string }) {
  return <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-panel-muted">{title}</p>
}

/** Los avisos del motor acompañan al resultado: no se pierden al moverlo al rail. */
function RailProblems({ problems }: { problems: readonly string[] }) {
  if (problems.length === 0) return null

  return (
    <div role="status" aria-live="polite" className="rounded-control bg-warning-mark/10 p-3 text-xs leading-5 text-warning-on-panel">
      <p className="mb-1 font-semibold">Revisá estos puntos</p>
      <ul className="list-disc space-y-1 pl-4">
        {problems.map(problem => <li key={problem}>{problem}</li>)}
      </ul>
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

/** Línea general: potencia, corrientes, sección, caída, protección y conductores. */
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
        <RailRow label="Intensidad de cálculo (Ib)" value={`${fmtTrim(lga.ratedCurrent, 2)} A`} />
        <RailRow label="Intensidad admisible corregida (Iz)" value={lga.correctedCurrent == null ? '—' : `${fmtTrim(lga.correctedCurrent, 1)} A`} />
        <RailRow label="Sección de fase" value={sectionLabel(lga.finalSection)} />
        <div className="my-2 h-px bg-panel-line" />
        <RailBlock title="Conductores y caída de tensión" />
        <RailRow label="Sección por caída" value={`${fmt(lga.sectionByDrop, 2)} mm²`} />
        <RailRow label="Caída con Ib" value={lga.dropPercent == null ? '—' : `${fmt(lga.dropPercent, 2)} % de ${limitLabel(lga.maxDropPercent)}`} />
        {lga.dropPercentIn != null && (
          <RailRow label={`Caída con In (${fmt(lga.protection ?? 0)} A)`} value={`${fmt(lga.dropPercentIn, 2)} %`} />
        )}
        <RailRow label="Momento eléctrico (M)" value={`${fmt(lga.momentKwM, 2)} kW·m`} />
        <RailRow label="Conductividad (γ)" value={`${fmt(lga.gamma)} m/(Ω·mm²)`} />
        <ConductorList elements={lga.elements} />
        <div className="my-2 h-px bg-panel-line" />
        <RailRow label="Iz de tabla" value={lga.tableCurrent == null ? '—' : `${fmt(lga.tableCurrent)} A`} />
        <RailRow label="Factor de agrupamiento" value={fmt(lga.groupingFactor, 2)} />
        <RailRow label="Protección (In)" value={lga.protection == null ? '—' : `${fmt(lga.protection)} A`} />
        <RailProblems problems={lga.problems} />
      </>}
    </RailCard>
  )
}

/** Derivaciones: cuántas son, cuánta potencia mueven y la línea de la seleccionada. */
function DiRailCard({ unit, derivationCount, derivationPowerW, selectedDerivation }: RailResultProps) {
  const line = selectedDerivation
  return (
    <RailCard
      heading="Resultado de las derivaciones"
      figure={fmt(derivationCount)}
      unit={derivationCount === 1 ? 'derivación' : 'derivaciones'}
      caption="Derivaciones individuales del proyecto"
      note={derivationCount === 0 ? 'Todavía no hay derivaciones. Genéralas desde la previsión de cargas en la pestaña DI.' : undefined}
    >
      <RailRow label="Potencia total derivada" value={formatPower(derivationPowerW, unit)} />
      {line && <>
        <div className="my-2 h-px bg-panel-line" />
        <RailRow label={line.label} value={formatPower(line.powerW, unit)} />
        <RailRow label="Sección de fase normalizada" value={sectionLabel(line.finalSection)} />
        <RailRow label="Intensidad de cálculo (Ib)" value={`${fmtTrim(line.ratedCurrent, 2)} A`} />
        <RailRow label="Sección por caída" value={`${fmt(line.sectionByDrop, 2)} mm²`} />
        <RailRow label="Momento eléctrico (M)" value={`${fmt(line.momentKwM, 2)} kW·m`} />
        <RailRow label="Conductividad (γ)" value={`${fmt(line.gamma)} m/(Ω·mm²)`} />
        <RailRow label="Iz de tabla" value={line.tableCurrent == null ? '—' : `${fmt(line.tableCurrent)} A`} />
        <RailRow label="Factor de agrupamiento" value={fmt(line.groupingFactor, 2)} />
        <RailRow label="Iz corregida" value={line.correctedCurrent == null ? '—' : `${fmtTrim(line.correctedCurrent, 1)} A`} />
        <RailRow label="Caída con Ib" value={line.dropPercent == null ? '—' : `${fmt(line.dropPercent, 2)} %`} />
        {line.dropPercentIn != null && (
          <RailRow label={`Caída con In (${fmt(line.protection ?? 0)} A)`} value={`${fmt(line.dropPercentIn, 2)} %`} />
        )}
        <RailRow label="Protección (In)" value={line.protection == null ? '—' : `${fmt(line.protection)} A`} />
        {line.housingIga != null && <>
          <RailRow label="IGA (tabla A) · potencia máxima" value={`${fmt(line.housingIga)} A · ${formatPower(line.maxAdmissiblePowerW ?? 0, unit)}`} />
          <p className="text-[11px] leading-4 text-panel-muted">El IGA no es el ICP ni la protección In: fija la potencia máxima admisible de la vivienda y va en el cuadro (DGMP). In es el dispositivo que protege la línea, con Ib ≤ In ≤ Iz.</p>
        </>}
        <RailBlock title="Elementos de la instalación" />
        <ConductorList elements={line.elements} />
        <RailProblems problems={line.problems} />
      </>}
      {!line && derivationCount > 0 && <p className="text-xs leading-5 text-panel-muted">Selecciona una derivación en la tabla para ver su sección, su caída y su protección.</p>}
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
      <RailRow label="LGA" value={noLga ? 'Sin LGA · único usuario' : sectionLabel(lga.finalSection)} />
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
