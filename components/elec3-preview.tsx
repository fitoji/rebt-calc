'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ELEC3_COLUMNS, ELEC3_HEADER_GROUPS, PENDING_CELLS } from '@/lib/elec3.mjs'
import { DEFAULT_ELEC3_LOCALE, ELEC3_TEXT } from '@/lib/elec3-i18n.mjs'

type Elec3Locale = keyof typeof ELEC3_TEXT

/**
 * Vista de la memoria ELEC-3 de una vivienda.
 *
 * Recibe el documento ya armado desde el estado vivo del proyecto: la derivación
 * individual y los circuitos de esa vivienda. No lee archivos ni recalcula nada.
 * Las celdas que la calculadora no puede rellenar se marcan como pendientes, no
 * se estiman.
 */

type Elec3Row = Record<string, string | number | null | undefined>

/** Una fila de interruptor diferencial de la hoja 2. */
type AdministrativeDifferential = {
  circuito: string | null
  nombre: string | null
  inA: number | null
  sensibilidadMa: number | null
}

/** La hoja 2 del modelo: los datos administrativos que la app declara, o pendientes. */
type AdministrativeBlock = {
  titular: string | null
  uso: string | null
  emplazamiento: {
    calle: string | null
    numero: string | null
    piso: string | null
    puerta: string | null
    localidad: string | null
    codigoPostal: string | null
  }
  instalacion: string | null
  distribuidora: string | null
  resistenciaTierraOhm: number | null
  superficieLocalM2: number | null
  seccionDi: number | null
  potenciaMaximaAdmisibleKw: number | null
  tensionV: number | null
  potenciaInstalarKw: number | null
  igaA: number | null
  diferenciales: AdministrativeDifferential[]
}

type Elec3Document = {
  obra: string
  data: string
  totalKw: number | null
  lga: Record<string, number | null> | null
  num?: string | null
  ip?: string | null
  files: Elec3Row[]
  circuitsBeyondModel?: number
  administrative?: AdministrativeBlock | null
}

/** Filas de interruptor diferencial del impreso; la app solo declara la sensibilidad. */
const MODEL_DIFFERENTIAL_ROWS = 3

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

/** Una celda sin valor declarado: ni número ni texto. Nunca se escribe como 0 ni se estima. */
function isEmpty(value: string | number | null | undefined) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

/** El pendiente de la hoja 1 y de la hoja 2: un único tratamiento. */
function Pending() {
  return (
    <span className="text-ink-faint" title="Pendiente: la calculadora todavía no lo calcula">
      —<span className="sr-only">Pendiente</span>
    </span>
  )
}

/** El valor de una celda, o su pendiente: el número con el formato del proyecto. */
function Value({ value }: { value: string | number | null | undefined }) {
  if (isEmpty(value)) return <Pending />
  return <>{typeof value === 'number' ? number.format(value) : value}</>
}

function Cell({ row, column }: { row: Elec3Row; column: (typeof ELEC3_COLUMNS)[number] }) {
  return <Value value={row[column.key]} />
}

export function Elec3PreviewDialog({ open, onOpenChange, document, dwellingLabel, locale = DEFAULT_ELEC3_LOCALE }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Elec3Document | null
  /** El nombre de la vivienda a la que pertenece el documento. */
  dwellingLabel?: string | null
  /** Idioma del impreso: castellano por defecto, catalán disponible para futuras descargas. */
  locale?: Elec3Locale
}) {
  const text = ELEC3_TEXT[locale]
  const label = dwellingLabel?.trim() || null
  const rows = document?.files ?? []
  const beyondModel = document?.circuitsBeyondModel ?? 0

  const pendingInRows = document
    ? PENDING_CELLS.filter(pending => rows.every(row => row[pending.key] == null))
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="elec3-dialog"
        showCloseButton={false}
        className="max-h-[88dvh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-[min(1400px,95vw)]"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle id="elec3-title" className="text-xl font-bold text-ink">{text.title}</DialogTitle>
              {label && <span className="rounded-control bg-brand-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink">{label}</span>}
            </div>
            <DialogDescription id="elec3-description" className="mt-1 max-w-[80ch] text-sm text-ink-faint">
              {label
                ? text.dialogDescription.replace('{dwelling}', label)
                : text.dialogDescriptionNoDwelling}
            </DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar vista ELEC-3" />}><X /></DialogClose>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface-muted/50 p-6">
            <p className="text-sm font-semibold text-ink">{text.emptyTitle}</p>
            <p className="mt-1 max-w-[70ch] text-sm leading-6 text-ink-subtle">{text.emptyText}</p>
          </div>
        ) : (
          <>
            <section className="mb-4 border-y border-line py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{text.modelTitle}</p>
                  <h3 className="text-base font-bold text-ink">{text.heading}{label ? ` · ${label}` : ''}</h3>
                </div>
                <p className="text-sm text-ink">{text.num} <span className="tabular-nums"><Value value={document?.num ?? null} /></span></p>
              </div>
            </section>

            <div className="overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-max border-collapse text-xs leading-tight">
                <caption className="sr-only">{text.caption.replace('{dwelling}', label ? ` de ${label}` : '').replace('{count}', String(rows.length))}</caption>
                <thead>
                  <tr className="bg-surface-muted text-left align-middle">
                    {ELEC3_HEADER_GROUPS.map(group => group.keys.length === 1
                      ? <th key={group.key} scope="col" rowSpan={2} className="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold text-ink-soft">{text.groups[group.key as keyof typeof text.groups]}</th>
                      : <th key={group.key} scope="colgroup" colSpan={group.keys.length} className="whitespace-nowrap border-b border-line px-3 py-1.5 text-center font-semibold text-ink-soft">{text.groups[group.key as keyof typeof text.groups]}</th>)}
                  </tr>
                  <tr className="bg-surface-muted text-left align-bottom">
                    {ELEC3_HEADER_GROUPS.filter(group => group.keys.length > 1).flatMap(group => group.keys.map(key => {
                      const column = ELEC3_COLUMNS.find(entry => entry.key === key)
                      return <th key={key} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold text-ink-soft ${column?.numeric ? 'text-right' : ''}`}>{text.columns[key as keyof typeof text.columns] ?? key}</th>
                    }))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, index) => (
                    <tr key={String(row.id)} className="transition-colors hover:bg-surface-muted/60">
                      <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                        {index === 1 && <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{text.derivacions}</span>}
                        <span className="block truncate">{text.rowLabels[index] ?? String(row.nom ?? '—')}</span>
                      </th>
                      {ELEC3_COLUMNS.slice(1).map(column => (
                        <td key={column.key} className={`whitespace-nowrap px-3 py-2 ${column.numeric ? 'text-right tabular-nums' : ''} text-ink-subtle`}>
                          <Cell row={row} column={column} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-faint">
              <p>{rows.length} {rows.length === 1 ? 'línea' : 'líneas'}</p>
              <p>
                {pendingInRows.length === 0
                  ? text.noPending
                  : text.pending.replace('{labels}', pendingInRows.map(pending => pending.label).join(', '))}
              </p>
            </div>
            {beyondModel > 0 && (
              <p className="mt-2 text-xs leading-5 text-warning-ink">
                {beyondModel === 1 ? text.beyondOne : text.beyondMany.replace('{count}', String(beyondModel))}
              </p>
            )}
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-[11px] font-semibold text-ink">{text.observacions}</p>
              <p className="mt-1 text-xs text-ink-subtle">{text.ip} <span className="tabular-nums"><Value value={document?.ip ?? null} /></span></p>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-4 text-ink-faint">{text.footer}</p>
          </>
        )}

        <Sheet2 administrative={document?.administrative} text={text} />
      </DialogContent>
    </Dialog>
  )
}

/* Hoja 2 del modelo: datos administrativos e interruptor diferencial. */

/**
 * Un dato de la hoja 2: su etiqueta —con la unidad del impreso— y su valor, o su
 * pendiente cuando nadie lo declaró. La unidad viaja con la etiqueta para que se lea
 * también cuando la celda está vacía.
 */
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words text-sm tabular-nums text-ink">
        <Value value={value} />
      </dd>
    </div>
  )
}

/** Un grupo de la hoja 2, en el orden del impreso. */
function Sheet2Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-surface-muted/40 p-3 print:break-inside-avoid">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{title}</h3>
      {children}
    </section>
  )
}

/** Columnas de la fila de diferencial, en el orden del impreso. */
const DIFFERENTIAL_COLUMNS = [
  { key: 'circuito', numeric: false },
  { key: 'nombre', numeric: false },
  { key: 'inA', numeric: true },
  { key: 'sensibilidadMa', numeric: true },
] as const

/**
 * Hoja 2 del modelo: los datos administrativos y las tres filas de interruptor
 * diferencial. La app declara lo que sabe y deja pendiente lo que solo completa el
 * instalador; sin bloque administrativo la hoja se pinta igual, toda pendiente.
 */
function Sheet2({ administrative, text }: { administrative?: AdministrativeBlock | null; text: (typeof ELEC3_TEXT)['es'] }) {
  const sheet = text.sheet2
  const emplazamiento = administrative?.emplazamiento
  const instalacionLabel = administrative?.instalacion == null
    ? null
    : sheet.modalitat[administrative.instalacion as keyof typeof sheet.modalitat] ?? null
  // El impreso tiene tres filas de diferencial: las que la app no declara se pintan
  // pendientes en vez de desaparecer.
  const diferenciales = Array.from({ length: MODEL_DIFFERENTIAL_ROWS }, (_, index) => administrative?.diferenciales?.[index] ?? null)

  return (
    <section className="mt-4 print:break-before-page">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-bold text-ink">{sheet.heading}</h2>
        <p className="text-[11px] text-ink-faint">{sheet.formCode}</p>
      </div>

      <div className="grid gap-3">
        <Sheet2Group title={sheet.groups.titular}>
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Field label={sheet.fields.titular} value={administrative?.titular} />
            <Field label={sheet.fields.us} value={administrative?.uso} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title={sheet.groups.segell}>
          <p className="mt-2 text-xs text-ink-subtle">{sheet.segellText}</p>
        </Sheet2Group>

        <Sheet2Group title={sheet.groups.emplacament}>
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={sheet.fields.carrer} value={emplazamiento?.calle} />
            <Field label={sheet.fields.numero} value={emplazamiento?.numero} />
            <Field label={sheet.fields.pis} value={emplazamiento?.piso} />
            <Field label={sheet.fields.porta} value={emplazamiento?.puerta} />
            <Field label={sheet.fields.localitat} value={emplazamiento?.localidad} />
            <Field label={sheet.fields.codiPostal} value={emplazamiento?.codigoPostal} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title={sheet.groups.instalacio}>
          <p className="mt-2 text-xs font-semibold text-ink-soft">{sheet.modalitats}</p>
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={sheet.fields.modalitat} value={instalacionLabel} />
            <Field label={sheet.fields.distribuidora} value={administrative?.distribuidora} />
            <Field label={sheet.fields.terra} value={administrative?.resistenciaTierraOhm} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title={sheet.groups.caracteristiques}>
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Field label={sheet.fields.superficie} value={administrative?.superficieLocalM2} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title={sheet.groups.dades}>
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={sheet.fields.seccioDi} value={administrative?.seccionDi} />
            <Field label={sheet.fields.potenciaMax} value={administrative?.potenciaMaximaAdmisibleKw} />
            <Field label={sheet.fields.tensio} value={administrative?.tensionV} />
            <Field label={sheet.fields.potenciaInstalar} value={administrative?.potenciaInstalarKw} />
            <Field label={sheet.fields.iga} value={administrative?.igaA} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title={sheet.groups.diferencial}>
          <div className="mt-2 overflow-x-auto rounded-control border border-line">
            <table className="w-full min-w-max border-collapse text-xs leading-tight">
              <caption className="sr-only">{sheet.differentialCaption}</caption>
              <thead>
                <tr className="bg-surface-muted text-left align-bottom">
                  {DIFFERENTIAL_COLUMNS.map(column => (
                    <th key={column.key} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold text-ink-soft ${column.numeric ? 'text-right' : ''}`}>
                      {sheet.differential[column.key as keyof typeof sheet.differential]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {diferenciales.map((differential, index) => (
                  <tr key={`diferencial-${index + 1}`}>
                    {DIFFERENTIAL_COLUMNS.map(column => (
                      <td key={column.key} className={`px-3 py-2 text-ink-subtle ${column.numeric ? 'whitespace-nowrap text-right tabular-nums' : ''}`}>
                        <Value value={differential?.[column.key] ?? null} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sheet2Group>

        <Sheet2Group title={sheet.groups.signatura}>
          <p className="mt-2 max-w-[70ch] text-sm leading-6 text-ink-subtle">{sheet.signaturaText}</p>
        </Sheet2Group>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-ink-faint">{sheet.nota}</p>
    </section>
  )
}
