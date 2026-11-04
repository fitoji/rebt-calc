'use client'

import { useRef, useState } from 'react'
import { FileJson, FileUp, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ELEC3_COLUMNS, PENDING_CELLS, readCalculatorExport } from '@/lib/elec3.mjs'

/**
 * Vista provisional de la memoria ELEC-3.
 *
 * Lee el JSON de «Descargar datos → JSON» y lo coloca en las columnas del
 * modelo legal. No toca el proyecto abierto: se puede abrir con un JSON de otra
 * sesión. Las celdas que la exportación no trae se marcan como pendientes, no
 * se estiman. Cuando la memoria se integre de verdad, este diálogo desaparece.
 */

type Elec3Row = Record<string, string | number | null | undefined>

type Elec3Document = {
  obra: string
  data: string
  totalKw: number | null
  lga: Record<string, number | null> | null
  files: Elec3Row[]
}

const number = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

function Cell({ row, column }: { row: Elec3Row; column: (typeof ELEC3_COLUMNS)[number] }) {
  const value = row[column.key]

  if (value === null || value === undefined || value === '') {
    return (
      <span className="text-ink-faint" title="Pendiente: la calculadora todavía no lo calcula">
        —<span className="sr-only">Pendiente</span>
      </span>
    )
  }

  return <>{typeof value === 'number' ? number.format(value) : value}</>
}

export function Elec3PreviewDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [document, setDocument] = useState<Elec3Document | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('error', () => setError('No se pudo leer el archivo.'))
    reader.addEventListener('load', () => {
      const parsed = readCalculatorExport(String(reader.result ?? ''))
      if (!parsed.ok) {
        setError(parsed.error)
        return
      }
      setError(null)
      setDocument(parsed.document as Elec3Document)
      setFileName(file.name)
    })
    reader.readAsText(file)
  }

  const pendingInRows = document
    ? PENDING_CELLS.filter(pending => document.files.every(row => row[pending.key] == null))
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
              <span className="rounded-control bg-warning-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warning-ink">Provisional</span>
            </div>
            <DialogDescription id="elec3-description" className="mt-1 max-w-[80ch] text-sm text-ink-faint">
              Lee el JSON de «Descargar datos → JSON» y lo dispone en las columnas del modelo legal. No modifica el proyecto abierto y el archivo no sale del equipo: las celdas que la exportación no trae quedan pendientes, nunca se estiman.
            </DialogDescription>
          </div>
          <DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar vista ELEC-3" />}><X /></DialogClose>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInput}
            id="elec3-file"
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0]
              event.target.value = ''
              handleFile(file)
            }}
          />
          <Button type="button" variant="default" className="h-auto gap-2 rounded-control px-4 py-2.5 font-semibold" onClick={() => fileInput.current?.click()}>
            <FileUp data-icon="inline-start" /> {document ? 'Cargar otro JSON' : 'Cargar JSON'}
          </Button>
          {fileName && <span className="truncate text-xs text-ink-faint">{fileName}</span>}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {!document ? (
          <div className="rounded-card border border-dashed border-line bg-surface-muted/50 p-6">
            <p className="text-sm font-semibold text-ink">Todavía no hay ninguna memoria cargada</p>
            <p className="mt-1 max-w-[70ch] text-sm leading-6 text-ink-subtle">
              En la calculadora, <b>Descargar datos → JSON</b> escribe el archivo que esta vista lee: potencia, cos φ, intensidad, sección, longitud, momento, caída parcial, conductor, canalización, neutro y protección de cada línea.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-4 flex flex-wrap items-end gap-x-10 gap-y-3 border-y border-line py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Emplazamiento</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{document.obra || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Fecha</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">{document.data || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Potencia total prevista</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">{document.totalKw == null ? '—' : `${number.format(document.totalKw)} kW`}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Línea general · contexto del edificio</p>
                <p className="mt-0.5 text-sm tabular-nums text-ink">
                  {[
                    document.lga?.seccio == null ? null : `${number.format(document.lga.seccio)} mm²`,
                    document.lga?.proteccio == null ? null : `In ${number.format(document.lga.proteccio)} A`,
                    document.lga?.neutre == null ? null : `N ${number.format(document.lga.neutre)} mm²`,
                    document.lga?.terra == null ? null : `PE ${number.format(document.lga.terra)} mm²`,
                    document.lga?.tub == null ? null : `Ø ${number.format(document.lga.tub)} mm`,
                  ].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </section>

            <div className="overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-max border-collapse text-xs leading-tight">
                <caption className="sr-only">Memoria técnica ELEC-3: {document.files.length} líneas con las columnas del modelo oficial</caption>
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
                  {document.files.map(row => (
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
              <p>{document.files.length} {document.files.length === 1 ? 'línea' : 'líneas'}{fileName ? ` · ${fileName}` : ''}</p>
              <p>
                {pendingInRows.length === 0
                  ? 'Ninguna celda pendiente.'
                  : `Pendiente en todas las filas: ${pendingInRows.map(pending => pending.label).join(', ')}.`}
              </p>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-4 text-ink-faint">
              Modelo ELEC-3 (G146NSIN-157-00) · las celdas con guion quedan pendientes y la memoria no las estima. Vista provisional: no exporta Excel ni CSV ni imprime; eso vive en <code>data/memoria_tecnica</code>.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
