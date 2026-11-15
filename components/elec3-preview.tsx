'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ELEC3_COLUMNS, PENDING_CELLS } from '@/lib/elec3.mjs'

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

export function Elec3PreviewDialog({ open, onOpenChange, document, dwellingLabel }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: Elec3Document | null
  /** El nombre de la vivienda a la que pertenece el documento. */
  dwellingLabel?: string | null
}) {
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
              <DialogTitle id="elec3-title" className="text-xl font-bold text-ink">Memoria técnica ELEC-3</DialogTitle>
              {label && <span className="rounded-control bg-brand-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink">{label}</span>}
            </div>
            <DialogDescription id="elec3-description" className="mt-1 max-w-[80ch] text-sm text-ink-faint">
              {label
                ? `Documento de ${label}: su derivación individual y sus circuitos, tomados del proyecto abierto. Las celdas que la calculadora no calcula quedan pendientes, nunca se estiman.`
                : 'La derivación individual y los circuitos de la vivienda, tomados del proyecto abierto. Las celdas que la calculadora no calcula quedan pendientes, nunca se estiman.'}
            </DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar vista ELEC-3" />}><X /></DialogClose>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-line bg-surface-muted/50 p-6">
            <p className="text-sm font-semibold text-ink">Esta vivienda todavía no tiene líneas que documentar</p>
            <p className="mt-1 max-w-[70ch] text-sm leading-6 text-ink-subtle">
              El documento se arma con la derivación individual de la vivienda y sus circuitos de la ITC-BT-25. Revisá los datos de la vivienda en «Instalaciones interiores» y volvé a abrirlo.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-4 flex flex-wrap items-end gap-x-10 gap-y-3 border-y border-line py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Emplazamiento</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{document?.obra || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Fecha</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">{document?.data || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Potencia total prevista</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">{document?.totalKw == null ? '—' : `${number.format(document.totalKw)} kW`}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Línea general · contexto del edificio</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">
                  {[
                    document?.lga?.seccio == null ? null : `${number.format(document.lga.seccio)} mm²`,
                    document?.lga?.proteccio == null ? null : `In ${number.format(document.lga.proteccio)} A`,
                    document?.lga?.neutre == null ? null : `N ${number.format(document.lga.neutre)} mm²`,
                    document?.lga?.terra == null ? null : `PE ${number.format(document.lga.terra)} mm²`,
                    document?.lga?.tub == null ? null : `Ø ${number.format(document.lga.tub)} mm`,
                  ].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </section>

            <div className="overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-max border-collapse text-xs leading-tight">
                <caption className="sr-only">Memoria técnica ELEC-3{label ? ` de ${label}` : ''}: {rows.length} líneas con las columnas del modelo oficial</caption>
                <thead>
                  <tr className="bg-surface-muted text-left align-bottom">
                    {ELEC3_COLUMNS.map(column => (
                      <th
                        key={column.key}
                        scope="col"
                        className={`whitespace-nowrap px-3 py-2 font-semibold text-ink-soft ${column.numeric ? 'text-right' : ''}`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(row => (
                    <tr key={String(row.id)} className="transition-colors hover:bg-surface-muted/60">
                      <th scope="row" className="px-3 py-2 text-left font-medium text-ink">
                        <span className="block truncate">{String(row.nom ?? '—')}</span>
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-ink-faint">{String(row.tipus ?? '')}</span>
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
                  ? 'Ninguna celda pendiente.'
                  : `Pendiente en todas las filas: ${pendingInRows.map(pending => pending.label).join(', ')}.`}
              </p>
            </div>
            {beyondModel > 0 && (
              <p className="mt-2 text-xs leading-5 text-warning-ink">
                {beyondModel === 1 ? 'Un circuito no cabe' : `${beyondModel} circuitos no caben`} en las doce filas de circuitos del modelo y queda{beyondModel === 1 ? '' : 'n'} fuera de la hoja.
              </p>
            )}
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-4 text-ink-faint">
              Modelo ELEC-3 (G146NSIN-157-00) · las celdas con guion quedan pendientes y la memoria no las estima. Vista de pantalla: no descarga Excel ni CSV; la descarga vive en <code>data/memoria_tecnica</code>.
            </p>
          </>
        )}

        <Sheet2 administrative={document?.administrative} />
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
  { key: 'circuito', label: 'Circuito', numeric: false },
  { key: 'nombre', label: 'Nombre', numeric: false },
  { key: 'inA', label: 'In (A)', numeric: true },
  { key: 'sensibilidadMa', label: 'Sensibilidad (mA)', numeric: true },
] as const

/**
 * Hoja 2 del modelo: los datos administrativos y las tres filas de interruptor
 * diferencial. La app declara lo que sabe y deja pendiente lo que solo completa el
 * instalador; sin bloque administrativo la hoja se pinta igual, toda pendiente.
 */
function Sheet2({ administrative }: { administrative?: AdministrativeBlock | null }) {
  const emplazamiento = administrative?.emplazamiento
  // El impreso tiene tres filas de diferencial: las que la app no declara se pintan
  // pendientes en vez de desaparecer.
  const diferenciales = Array.from({ length: MODEL_DIFFERENTIAL_ROWS }, (_, index) => administrative?.diferenciales?.[index] ?? null)

  return (
    <section className="mt-4 print:break-before-page">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-bold text-ink">Hoja 2 · Datos administrativos</h2>
        <p className="text-[11px] text-ink-faint">Los datos que declara el proyecto; ninguna celda se estima.</p>
      </div>

      <div className="grid gap-3">
        <Sheet2Group title="Titular y uso">
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Field label="Titular" value={administrative?.titular} />
            <Field label="Uso" value={administrative?.uso} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title="Emplazamiento">
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Calle" value={emplazamiento?.calle} />
            <Field label="Número" value={emplazamiento?.numero} />
            <Field label="Piso" value={emplazamiento?.piso} />
            <Field label="Puerta" value={emplazamiento?.puerta} />
            <Field label="Localidad" value={emplazamiento?.localidad} />
            <Field label="Código postal" value={emplazamiento?.codigoPostal} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title="Instalación">
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Tipo" value={administrative?.instalacion} />
            <Field label="Empresa distribuidora" value={administrative?.distribuidora} />
            <Field label="Resistencia de tierra (Ω)" value={administrative?.resistenciaTierraOhm} />
            <Field label="Superficie del local (m²)" value={administrative?.superficieLocalM2} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title="Características">
          <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Sección de la derivación individual (mm²)" value={administrative?.seccionDi} />
            <Field label="Potencia máxima admisible (kW)" value={administrative?.potenciaMaximaAdmisibleKw} />
            <Field label="Tensión (V)" value={administrative?.tensionV} />
            <Field label="Potencia a instalar (kW)" value={administrative?.potenciaInstalarKw} />
            <Field label="IGA (A)" value={administrative?.igaA} />
          </dl>
        </Sheet2Group>

        <Sheet2Group title="Interruptor diferencial">
          <div className="mt-2 overflow-x-auto rounded-control border border-line">
            <table className="w-full min-w-max border-collapse text-xs leading-tight">
              <caption className="sr-only">
                Interruptores diferenciales de la hoja 2: el circuito, el nombre y el calibre los completa el instalador; la app solo declara la sensibilidad.
              </caption>
              <thead>
                <tr className="bg-surface-muted text-left align-bottom">
                  {DIFFERENTIAL_COLUMNS.map(column => (
                    <th
                      key={column.key}
                      scope="col"
                      className={`whitespace-nowrap px-3 py-2 font-semibold text-ink-soft ${column.numeric ? 'text-right' : ''}`}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {diferenciales.map((differential, index) => (
                  <tr key={`diferencial-${index + 1}`}>
                    {DIFFERENTIAL_COLUMNS.map(column => (
                      <td
                        key={column.key}
                        className={`px-3 py-2 text-ink-subtle ${column.numeric ? 'whitespace-nowrap text-right tabular-nums' : ''}`}
                      >
                        <Value value={differential?.[column.key] ?? null} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sheet2Group>

        <Sheet2Group title="Firma y sello">
          <p className="mt-2 max-w-[70ch] text-sm leading-6 text-ink-subtle">
            La firma del titular y el sello del instalador se completan a mano sobre el impreso: la aplicación no los genera ni los sustituye.
          </p>
        </Sheet2Group>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-ink-faint">
        Solo el instalador puede completar en la hoja 2: el circuito, el nombre y el calibre (In) de cada diferencial, y la firma con el sello.
      </p>
    </section>
  )
}
