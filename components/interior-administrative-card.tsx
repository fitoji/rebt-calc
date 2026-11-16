'use client'

import { ChevronLeft, ChevronRight, FileText, Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { TableButton } from '@/components/table-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { InteriorAdministrative, InteriorDwelling } from '@/components/interior-panel'
import { resolveInteriorInputs, stepLabel } from '@/components/interior-panel'
import { defaultCircuitsFor, evaluateInterior } from '../lib/interior-installation.mjs'
import { housingGradeFor } from '../lib/housing-circuits.mjs'
import { formatPower } from '../lib/power-units.mjs'

/**
 * Los datos administrativos de una instalación, en su propia card de la pestaña
 * Administrativos (S3).
 *
 * Se navega por vivienda con el mismo armazón que la card de Cuadros, pero la
 * franja no repite los controles de potencia: muestra la identidad de la
 * instalación —escalón, IGA de la tabla A, potencia máxima admisible y
 * diferenciales exigidos— porque esos son los datos que la hoja 2 del ELEC-3
 * imprime junto al número, el piso y la puerta (S4). La potencia contratada, el
 * ICP y la protección contra sobretensiones son decisiones de diseño y se quedan
 * en Cuadros.
 *
 * El camino del dato no cambia (S5): los campos escriben en
 * `derivation.administrative` y la franja se calcula con los mismos helpers que
 * la card de Cuadros, sin copiar ni una tabla ni una constante.
 */

export type InteriorAdministrativeCardProps = {
  dwellings: InteriorDwelling[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Guarda un dato administrativo en la derivación de la vivienda; la card no sabe dónde vive. */
  onChange: (id: string, patch: Partial<InteriorAdministrative>) => void
  /** Unidad con la que se leen las potencias; el vatío sigue siendo la unidad guardada. */
  powerUnit: 'W' | 'kW'
  /** Titular declarado en el proyecto: sólo se usa para explicar la herencia de un campo vacío (A3). */
  projectTitular?: string
  /** Abre la memoria ELEC-3 de la vivienda elegida; la card no arma el documento (A2). */
  onViewElec3?: (dwellingId: string) => void
  /**
   * Abre «Tablas y referencias», donde ya vive la tabla A que fija el IGA. La card
   * no posee el diálogo: el botón de tabla sólo pide que se abra (S3, S5).
   */
  onOpenTables: () => void
}

/**
 * La card cuando el proyecto todavía no tiene viviendas. Vive fuera del cuerpo
 * para que el retorno temprano no quede delante de nada que se calcule después.
 */
function EmptyAdministrativeCard() {
  return (
    <section className="rounded-card border border-line bg-paper p-5 shadow-card">
      <h3 className="font-bold">Datos administrativos por vivienda</h3>
      <p className="mt-2 flex items-start gap-2 rounded-control bg-brand-soft p-3 text-sm leading-6 text-brand-ink"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Todavía no hay viviendas. Generá las derivaciones desde la previsión en la pestaña DI y volvé acá: cada instalación declara su número, su piso, su puerta, su superficie y su tierra en la hoja 2 del ELEC-3.</p>
    </section>
  )
}

/** Datos administrativos de cada instalación, navegando la lista de viviendas. */
export function InteriorAdministrativeCard({ dwellings, selectedId, onChange, onSelect, powerUnit, projectTitular = '', onViewElec3, onOpenTables }: InteriorAdministrativeCardProps) {
  if (dwellings.length === 0) return <EmptyAdministrativeCard />

  const dwelling = dwellings.find(entry => entry.id === selectedId) ?? dwellings[0]
  // Los mismos insumos y la misma evaluación que la card de Cuadros: la franja
  // lee el resultado del motor y no vuelve a decidir nada.
  const inputs = resolveInteriorInputs(dwelling)
  const evaluation = evaluateInterior({ igaA: dwelling.housingIgaA ?? null, powerW: dwelling.powerW, ...inputs, circuits: defaultCircuitsFor(dwelling.powerW) })
  const grade = housingGradeFor(dwelling.powerW)
  const setAdministrative = (key: keyof InteriorAdministrative, value: string) => onChange(dwelling.id, { [key]: value })
  const currentIndex = dwellings.findIndex(entry => entry.id === dwelling.id)
  const navigate = (delta: number) => {
    const next = dwellings[currentIndex + delta]
    if (next) onSelect(next.id)
  }

  return (
    <section className="rounded-card border border-line bg-paper p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-brand-mark" />Datos administrativos por vivienda</h3>
          <p className="mt-1 text-xs text-ink-muted">Lo que la hoja 2 del ELEC-3 imprime de cada instalación · {grade === 'elevated' ? 'electrificación elevada' : 'electrificación básica'}.</p>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="interior-admin-dwelling" className="text-xs font-semibold text-ink-muted">Vivienda</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="Vivienda anterior" disabled={currentIndex <= 0} onClick={() => navigate(-1)}><ChevronLeft aria-hidden="true" /></Button>
            <Select value={dwelling.id} onValueChange={next => { if (next != null) onSelect(String(next)) }}>
              <SelectTrigger id="interior-admin-dwelling" className="h-9 w-full min-w-0 text-sm sm:min-w-[16rem]"><SelectValue>{(selected: string | null) => dwellings.find(entry => entry.id === selected)?.label ?? dwelling.label}</SelectValue></SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="w-max max-w-[22rem]"><SelectGroup>{dwellings.map(entry => <SelectItem key={entry.id} value={entry.id}>{entry.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="size-9 shrink-0" aria-label="Vivienda siguiente" disabled={currentIndex >= dwellings.length - 1} onClick={() => navigate(1)}><ChevronRight aria-hidden="true" /></Button>
            {onViewElec3 && <Button type="button" variant="outline" className="h-9 shrink-0 gap-2 px-3 text-sm font-semibold" aria-label={`Ver ELEC-3 de ${dwelling.label}`} onClick={() => onViewElec3(dwelling.id)}><FileText data-icon="inline-start" aria-hidden="true" /> Ver ELEC-3</Button>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">Escalón de potencia</span><span>{stepLabel(dwelling.powerW, powerUnit)}</span></div>
        <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="flex items-center justify-between gap-2 font-semibold text-ink-muted">IGA<TableButton ariaLabel="Ver tabla A · escalones de potencia" onOpen={onOpenTables} /></span><span className="tabular-nums">{evaluation.igaA == null ? '—' : `${evaluation.igaA} A`}</span></div>
        <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">Potencia máxima admisible</span><span className="tabular-nums">{evaluation.maxPowerW == null ? '—' : formatPower(evaluation.maxPowerW, powerUnit)}</span></div>
        <div className="flex flex-col gap-1 rounded-control bg-surface-muted p-3 text-xs"><span className="font-semibold text-ink-muted">Diferenciales exigidos</span><span>{evaluation.differentials} × {evaluation.sensitivityMa} mA</span></div>
      </div>

      <InteriorAdministrativeFields dwelling={dwelling} projectTitular={projectTitular} onChange={setAdministrative} />
    </section>
  )
}

/** Un dato administrativo de la instalación: clave del bloque, rótulo y ejemplo de escritura. */
type AdministrativeFieldSpec = {
  key: keyof InteriorAdministrative
  label: string
  placeholder: string
}

/**
 * Los seis datos que la hoja 2 imprime distinto en cada instalación. La superficie
 * y la tierra se escriben como texto porque el usuario español escribe `84,6`: la
 * conversión de la coma decimal vive en `lib/administrative.mjs`, no en la card.
 *
 * Es la única definición del formulario (S8): la card de Cuadros ya no lo monta.
 */
const ADMINISTRATIVE_FIELDS: ReadonlyArray<AdministrativeFieldSpec> = [
  { key: 'numero', label: 'Número', placeholder: '12' },
  { key: 'piso', label: 'Piso', placeholder: '3' },
  { key: 'puerta', label: 'Puerta', placeholder: 'B' },
  { key: 'superficieLocalM2', label: 'Superficie del local (m²)', placeholder: '84,6' },
  { key: 'resistenciaTierraOhm', label: 'Resistencia de tierra (Ω)', placeholder: '12,5' },
  { key: 'titularName', label: 'Titular de esta instalación', placeholder: 'Nombre y NIF, sólo si difiere del proyecto' },
]

/**
 * Datos administrativos de la vivienda elegida (S5): se declaran acá y no en
 * `ProjectInfo`, porque el número, el piso, la puerta, la superficie y la tierra
 * cambian en cada instalación. Un campo vacío nunca se copia: número, piso y
 * puerta quedan pendientes, y el titular hereda el del proyecto, que se nombra en
 * la ayuda para que la herencia se vea y no parezca un dato olvidado.
 */
export function InteriorAdministrativeFields({ dwelling, projectTitular, onChange }: {
  dwelling: InteriorDwelling
  projectTitular: string
  onChange: (key: keyof InteriorAdministrative, value: string) => void
}) {
  const administrative = dwelling.administrative ?? {}
  const inheritedTitular = projectTitular.trim()
  const declaredTitular = (administrative.titularName ?? '').trim()
  const titularHint = declaredTitular !== ''
    ? 'Esta instalación usa su propio titular y sustituye al del proyecto en la hoja 2.'
    : inheritedTitular === ''
      ? 'Vacío hereda: el proyecto tampoco declara titular, así que la hoja 2 lo deja pendiente.'
      : `Vacío hereda el titular del proyecto (${inheritedTitular}).`

  return (
    <div className="mt-5" role="group" aria-labelledby="interior-administrative-title">
      <h4 id="interior-administrative-title" className="text-xs font-semibold text-ink-muted">Datos administrativos de la instalación · hoja 2 del ELEC-3</h4>
      <p className="mt-1 text-[11px] leading-4 text-ink-faint">Son de esta instalación y se guardan con ella. El número, el piso y la puerta no se heredan: si quedan vacíos, la hoja 2 los deja pendientes. La superficie y la tierra se escriben como texto, con coma decimal si hace falta.</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADMINISTRATIVE_FIELDS.map(field => (
          <div key={field.key} className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`interior-admin-${field.key}`} className="text-xs font-semibold text-ink-muted">{field.label}</Label>
            <Input id={`interior-admin-${field.key}`} type="text" className="w-full" value={administrative[field.key] ?? ''} placeholder={field.placeholder} onChange={event => onChange(field.key, event.target.value)} />
            {field.key === 'titularName' && <span className="text-[11px] leading-4 text-ink-faint">{titularHint}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
