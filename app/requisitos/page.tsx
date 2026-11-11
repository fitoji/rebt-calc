'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Info, TriangleAlert } from 'lucide-react'
import { loadCalculatorInputs, loadDocumentationSnapshot } from '@/lib/calculator-storage.mjs'
import { classifyDocumentation } from '@/lib/project-documentation.mjs'
import { formatPower, isPowerUnit } from '@/lib/power-units.mjs'
import { BOE_REBT } from '@/components/source-note'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

/** La instantánea derivada que escribe el cálculo; la página no la recalcula. */
type Snapshot = NonNullable<ReturnType<typeof loadDocumentationSnapshot>>
/** Los datos de documentación que viajan con la previsión. */
type Documentation = NonNullable<ReturnType<typeof loadCalculatorInputs>>['documentation']
/** Una fila del veredicto: la que emite el clasificador, sin reinterpretarla. */
type Group = ReturnType<typeof classifyDocumentation>['groups'][number]
type Verdict = ReturnType<typeof classifyDocumentation>['verdict']

/** La única respuesta de la página, con las palabras de la instrucción. */
const VERDICT_LABEL: Record<Verdict, string> = {
  proyecto: 'Requiere proyecto',
  'memoria-tecnica': 'Solo memoria técnica de diseño',
}

/**
 * El único dato de presentación que la tabla añade: el grupo h se mide en plazas
 * de aparcamiento, no en vatios. Todos los umbrales y criterios vienen del
 * clasificador; aquí no se decide nada.
 */
const COUNT_LABEL: Record<string, string> = { h: 'plazas' }

type PageState = {
  snapshot: Snapshot | null
  documentation: Documentation
  /** La unidad con la que la previsión se lee en la calculadora; el guardado sigue en vatios. */
  powerUnit: 'W' | 'kW'
}

/** Parámetros de cálculo: la única fuente de la preferencia de unidades. */
const SETTINGS_STORAGE_KEY = 'electrocalc-settings'

/** La unidad elegida en los parámetros, con el vatío como valor por defecto. */
function readPowerUnit(storage: Storage): 'W' | 'kW' {
  try {
    const parsed = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? 'null')
    return isPowerUnit(parsed?.powerUnit) ? parsed.powerUnit : 'W'
  } catch {
    return 'W'
  }
}

function readState(): PageState {
  if (typeof window === 'undefined') return { snapshot: null, documentation: undefined, powerUnit: 'W' }
  try {
    return {
      snapshot: loadDocumentationSnapshot(window.localStorage),
      documentation: loadCalculatorInputs(window.localStorage)?.documentation,
      powerUnit: readPowerUnit(window.localStorage),
    }
  } catch {
    return { snapshot: null, documentation: undefined, powerUnit: 'W' }
  }
}

/** El valor de un grupo como se lee: una potencia, un recuento o su criterio. */
function valueText(group: Group, powerUnit: 'W' | 'kW') {
  if (!group.applies) return '—'
  if (typeof group.value === 'string') return group.value
  const count = COUNT_LABEL[group.id]
  if (count != null) return `${new Intl.NumberFormat('es-ES').format(group.value)} ${count}`
  return formatPower(group.value, powerUnit)
}

/** El límite tal como lo escribe la instrucción: en kW, o en palabras. */
function limitText(group: Group) {
  if (typeof group.limit === 'string') return group.limit
  return formatPower(group.limit, group.limit >= 1000 ? 'kW' : 'W')
}

/** «6.690 W ≤ 50 kW» para un umbral, o «pública concurrencia · sin límite». */
function comparisonText(group: Group, powerUnit: 'W' | 'kW') {
  if (!group.applies) return 'no aplica'
  const value = valueText(group, powerUnit)
  const limit = limitText(group)
  const isThreshold = typeof group.limit === 'number' && typeof group.value === 'number' && COUNT_LABEL[group.id] == null
  return isThreshold ? `${value} ≤ ${limit}` : `${value} · ${limit}`
}

export default function RequisitosPage() {
  const [state, setState] = useState<PageState>({ snapshot: null, documentation: undefined, powerUnit: 'W' })

  useEffect(() => {
    let current = ''
    const update = () => {
      const next = readState()
      const serialized = JSON.stringify(next)
      // El sondeo no vuelve a pintar cuando el proyecto no ha cambiado.
      if (serialized === current) return
      current = serialized
      setState(next)
    }
    update()
    const onStorage = () => update()
    window.addEventListener('storage', onStorage)
    // Poll lightly for same-tab changes (localStorage events don't fire in same tab)
    const interval = window.setInterval(update, 2000)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(interval)
    }
  }, [])

  // Único cálculo de la página: clasificar la previsión ya hecha.
  const classification = useMemo(
    () => state.snapshot ? classifyDocumentation({ ...state.snapshot, documentation: state.documentation }) : null,
    [state],
  )

  const deciding = classification
    ? classification.groups.filter(group => classification.decidingGroups.includes(group.id))
    : []
  const requiresProject = classification?.verdict === 'proyecto'

  return (
    <>
      <SiteHeader titleAs="p">
        <Link href="/" className="group inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-mark hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:-translate-x-0.5" />
          Volver a la calculadora
        </Link>
      </SiteHeader>

      <main className="min-h-screen bg-surface-page text-ink">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand">ITC-BT-04 · Documentación exigible</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">¿Proyecto o memoria técnica de diseño?</h1>
            <p className="mt-4 text-base leading-7 text-ink-subtle">
              Esta página responde una sola pregunta sobre el edificio que estás calculando: si su previsión de cargas cae en alguno de los grupos de la ITC-BT-04 §3.1 y exige <strong className="text-ink">proyecto</strong>, o si no llega a ninguno y basta una <strong className="text-ink">memoria técnica de diseño</strong> (§4). No repite la previsión: clasifica la que ya guarda la calculadora.
            </p>
          </div>

          {classification === null ? (
            <section aria-labelledby="falta-title" className="mt-10 max-w-3xl rounded-card border border-line bg-paper p-6 shadow-card">
              <h2 id="falta-title" className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Info aria-hidden="true" className="size-5 text-brand" />
                Qué falta
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-subtle">
                Todavía no hay previsión de cargas guardada, así que no hay nada que clasificar. El veredicto se calcula con la previsión del edificio —potencia total prevista, viviendas, locales, garajes y recarga de vehículo eléctrico— y con los datos de documentación que se editan dentro de la previsión. Hay que completarla primero en la calculadora; al volver, esta página se actualiza sola.
              </p>
              <Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-on-panel transition-colors hover:bg-brand-mark">
                <ArrowLeft aria-hidden="true" className="size-4" />
                Completar la previsión de cargas
              </Link>
            </section>
          ) : (
            <>
              <section
                aria-labelledby="veredicto-title"
                className={`mt-10 max-w-3xl rounded-card border p-6 shadow-card sm:p-8 ${requiresProject ? 'border-brand-line bg-brand-soft' : 'border-line bg-paper'}`}
              >
                <h2 id="veredicto-title" className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Veredicto</h2>
                <p className={`mt-3 text-3xl font-bold tracking-tight sm:text-4xl ${requiresProject ? 'text-brand-ink' : 'text-ink'}`}>
                  {VERDICT_LABEL[classification.verdict]}
                </p>
                <p className="mt-3 text-sm leading-6 text-ink-subtle">
                  {requiresProject
                    ? `La previsión entra en ${deciding.length === 1 ? 'un grupo' : 'varios grupos'} de la ITC-BT-04 §3.1 que exigen proyecto. Cuando la instalación cae en más de un grupo se aplica el criterio más exigente (§3.3).`
                    : 'Ningún grupo de la ITC-BT-04 §3.1 exige proyecto para esta previsión, así que la instalación queda en el §4 y basta la memoria técnica de diseño.'}
                </p>
              </section>

              <section aria-labelledby="porque-title" className="mt-12 max-w-3xl">
                <h2 id="porque-title" className="text-xl font-bold tracking-tight">Por qué</h2>
                {requiresProject ? (
                  <ul className="mt-4 space-y-3">
                    {deciding.map(group => (
                      <li key={group.id} className="rounded-card border border-line bg-paper p-4 shadow-card">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-tab border border-brand-line bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-[0.08em] text-brand-ink">§3.1 {group.id}</span>
                          <p className="font-semibold text-ink">{group.title}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink-subtle">
                          <strong className="tabular-nums text-ink">{comparisonText(group, state.powerUnit)}</strong>
                        </p>
                        <p className="mt-1 text-xs text-ink-faint">Fuente: {group.source}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 rounded-card border border-line bg-paper p-4 shadow-card">
                    <p className="flex items-start gap-2 text-sm leading-6 text-ink-subtle">
                      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand" />
                      <span>
                        Ningún grupo de la ITC-BT-04 §3.1 exige proyecto con esta previsión: los que aplican quedan por debajo de su límite o no tienen umbral de potencia que alcanzar. La instalación cae entonces en el §4 —«Requerirán Memoria Técnica de Diseño todas las instalaciones sean nuevas, ampliaciones o modificaciones no incluidas en los grupos indicados en el apartado 3»—, así que basta la memoria técnica de diseño.
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-ink-faint">Fuente: {classification.source} · §4</p>
                  </div>
                )}
              </section>

              <section aria-labelledby="tabla-title" className="mt-12">
                <h2 id="tabla-title" className="text-xl font-bold tracking-tight">Tabla completa de grupos</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-subtle">
                  Los quince grupos de la ITC-BT-04 §3.1 con el valor de esta previsión frente a su límite, para poder auditar el veredicto grupo a grupo. «No aplica» significa que la instalación no entra en ese grupo.
                </p>
                <div className="mt-4 overflow-x-auto rounded-card border border-line bg-paper shadow-card">
                  <table className="w-full min-w-[52rem] text-left text-sm">
                    <caption className="sr-only">Grupos de la ITC-BT-04 §3.1 evaluados sobre la previsión de cargas guardada</caption>
                    <thead className="border-b border-line bg-surface-muted text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      <tr>
                        <th scope="col" className="px-4 py-3">Grupo</th>
                        <th scope="col" className="px-4 py-3">Instalación</th>
                        <th scope="col" className="px-4 py-3">¿Aplica?</th>
                        <th scope="col" className="px-4 py-3">Valor</th>
                        <th scope="col" className="px-4 py-3">Límite</th>
                        <th scope="col" className="px-4 py-3">Exige proyecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classification.groups.map(group => (
                        <tr key={group.id} className="border-b border-line last:border-0">
                          <th scope="row" className="px-4 py-3 font-mono text-xs font-semibold text-ink">§3.1 {group.id}</th>
                          <td className="px-4 py-3 text-ink-subtle">{group.title}</td>
                          <td className="px-4 py-3 text-ink-subtle">{group.applies ? 'Sí' : 'No'}</td>
                          <td className="px-4 py-3 tabular-nums text-ink">{valueText(group, state.powerUnit)}</td>
                          <td className="px-4 py-3 text-ink-subtle">{limitText(group)}</td>
                          <td className={`px-4 py-3 font-semibold ${group.requiresProject ? 'text-brand' : 'text-ink-faint'}`}>{group.requiresProject ? 'Sí' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <section aria-labelledby="fuente-title" className="mt-12 max-w-3xl rounded-card border border-line bg-note-sand p-5 text-sm leading-6 text-note-sand-ink">
            <h2 id="fuente-title" className="text-xs font-bold uppercase tracking-[0.22em]">Fuente</h2>
            <p className="mt-2 font-semibold">ITC-BT-04 §3 y §4 · RD 842/2002 (BOE-A-2002-18099)</p>
            <p className="mt-2">
              El veredicto se calcula con la previsión de cargas del proyecto —potencia total prevista, viviendas, locales, garajes y P5 de recarga— y con los datos de documentación que se editan en esa misma previsión. La página no añade cifras propias ni repite el cálculo de P1 a P5.
            </p>
            <p className="mt-2">
              Es el mínimo estatal del REBT: cada comunidad autónoma puede añadir requisitos propios de documentación, así que conviene comprobar su normativa antes de presentar el expediente.
            </p>
            <p className="mt-3">
              <a href={BOE_REBT} target="_blank" rel="noreferrer" className="font-semibold underline decoration-dotted underline-offset-4 hover:underline">Ver el REBT consolidado en el BOE</a>
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
