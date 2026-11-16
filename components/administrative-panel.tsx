'use client'

import { Info } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/**
 * Datos administrativos del proyecto: la empresa instaladora y lo que la hoja 2
 * del ELEC-3 imprime igual para todas las instalaciones del edificio.
 *
 * La empresa instaladora es una sola (S7): no hay un bloque por vivienda ni un
 * segundo formulario para el membrete. Este archivo es el único editor de
 * `ProjectInfo`; el diálogo «Datos de la memoria técnica» del rail monta las
 * mismas piezas, así que un campo nuevo se declara una vez y aparece en los dos
 * sitios con el mismo guardado.
 *
 * Número, piso, puerta, superficie del local, resistencia de tierra y el titular
 * cuando difiere **no** están acá: son de cada instalación y viajan en su
 * derivación (S5); se editan en la card por vivienda de la pestaña Administrativos.
 * Tampoco se calcula nada: el panel es presentacional y
 * devuelve el cambio de un campo, igual que el resto de los paneles.
 */

/** Claves de `ProjectInfo` que este panel edita. El logo tiene su control en el diálogo. */
export type ProjectInfoField =
  | 'companyName'
  | 'companyNif'
  | 'companyAddress'
  | 'phone'
  | 'email'
  | 'installerNumber'
  | 'titularName'
  | 'uso'
  | 'workAddress'
  | 'addressCity'
  | 'addressPostalCode'
  | 'distributorName'
  | 'installType'

/** Los datos del proyecto tal como llegan del estado: texto, y el vacío es «sin declarar». */
export type AdministrativeInfo = Partial<Record<ProjectInfoField, string>>

/** Un cambio de campo: la misma firma que `updateProjectInfo` en la calculadora. */
export type AdministrativeChange = (key: ProjectInfoField, value: string) => void

/** Un campo de texto: clave de `ProjectInfo`, rótulo visible y ejemplo de escritura. */
type TextFieldSpec = {
  key: ProjectInfoField
  label: string
  placeholder: string
  type?: 'text' | 'email'
  /** Ocupa las dos columnas del grid: es un dato largo, no una cifra corta. */
  wide?: boolean
  /** Aclaración debajo del control, cuando el dato es opcional o tiene una regla. */
  hint?: string
}

const INSTALLER_FIELDS: ReadonlyArray<TextFieldSpec> = [
  { key: 'companyName', label: 'Nombre de empresa', placeholder: 'Instalaciones Ejemplo S.L.', wide: true },
  { key: 'companyNif', label: 'NIF de la empresa', placeholder: 'B12345678' },
  { key: 'companyAddress', label: 'Dirección de empresa', placeholder: 'Calle, número, ciudad' },
  { key: 'phone', label: 'Teléfono', placeholder: '+34 900 000 000' },
  { key: 'email', label: 'Correo electrónico', placeholder: 'contacto@empresa.es', type: 'email' },
  { key: 'installerNumber', label: 'Número de instalador autorizado', placeholder: 'Carné o número de autorización' },
]

const PROJECT_TEXT_FIELDS: ReadonlyArray<TextFieldSpec> = [
  // El titular va en un solo campo, como lo modela la hoja 2 (`titularName`):
  // nombre y NIF se escriben juntos tal como los imprime el impreso.
  { key: 'titularName', label: 'Titular del proyecto', placeholder: 'Nombre y NIF del titular', wide: true },
  {
    key: 'uso',
    label: 'Uso',
    placeholder: 'Vivienda habitual',
    wide: true,
    hint: 'Opcional. Si no se declara, el uso de cada instalación se deriva de su tipo de derivación.',
  },
  { key: 'workAddress', label: 'Calle de la obra', placeholder: 'Calle y número del emplazamiento', wide: true },
  { key: 'addressCity', label: 'Localidad', placeholder: 'Girona' },
  { key: 'addressPostalCode', label: 'Código postal', placeholder: '17001' },
  { key: 'distributorName', label: 'Empresa distribuidora', placeholder: 'e-Distribución' },
]

/**
 * Los tres tipos de instalación que imprime la hoja 2, con los valores que
 * `lib/elec3.mjs` traduce a etiqueta. «Sin declarar» deja la celda pendiente en
 * vez de inventar un tipo (S5).
 */
const INSTALLATION_TYPE_ITEMS = [
  { value: '', label: 'Sin declarar' },
  { value: 'nueva', label: 'Nueva' },
  { value: 'ampliacion', label: 'Ampliación' },
  { value: 'reforma', label: 'Reforma' },
]

/** Un campo de texto con su rótulo asociado por `htmlFor`/`id`. */
function TextField({ field, info, onChange }: { field: TextFieldSpec; info: AdministrativeInfo; onChange: AdministrativeChange }) {
  const id = `admin-${field.key}`
  return (
    <label htmlFor={id} className={field.wide ? 'sm:col-span-2' : undefined}>
      <span className="label">{field.label}</span>
      <Input
        id={id}
        className="w-full"
        type={field.type ?? 'text'}
        value={info[field.key] ?? ''}
        onChange={event => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
      />
      {field.hint && <span className="mt-1 block text-xs leading-5 text-ink-faint">{field.hint}</span>}
    </label>
  )
}

/** La empresa instaladora del proyecto: nombre, NIF, dirección, contacto y carné. */
export function InstallerFields({ info, onChange }: { info: AdministrativeInfo; onChange: AdministrativeChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {INSTALLER_FIELDS.map(field => <TextField key={field.key} field={field} info={info} onChange={onChange} />)}
    </div>
  )
}

/** Titular, uso, emplazamiento de la obra, distribuidora y tipo de instalación. */
export function ProjectDataFields({ info, onChange }: { info: AdministrativeInfo; onChange: AdministrativeChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {PROJECT_TEXT_FIELDS.map(field => <TextField key={field.key} field={field} info={info} onChange={onChange} />)}
      <div>
        <label htmlFor="admin-install-type" className="label">Tipo de instalación</label>
        <Select value={info.installType ?? ''} onValueChange={value => onChange('installType', String(value ?? ''))}>
          <SelectTrigger id="admin-install-type" className="w-full">
            <SelectValue>{(selected: string | null) => INSTALLATION_TYPE_ITEMS.find(item => item.value === (selected ?? ''))?.label ?? 'Sin declarar'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {INSTALLATION_TYPE_ITEMS.map(item => <SelectItem key={item.value || 'sin-declarar'} value={item.value}>{item.label}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

/**
 * El tab «Datos administrativos»: los dos bloques del proyecto y la nota de
 * firma. Cada texto escrito acá sale por el mismo `onChange` que ya persiste
 * `ProjectInfo` en el navegador y en el JSON exportado; no hay otro almacén.
 */
export function AdministrativePanel({ info, onChange }: { info: AdministrativeInfo; onChange: AdministrativeChange }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="rounded-card border border-line bg-paper p-5 shadow-card" aria-labelledby="empresa-instaladora-title">
        <div className="mb-5">
          <h3 id="empresa-instaladora-title" className="flex items-center gap-2 font-bold">
            <span className="rounded-tab border border-brand-line bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-[0.08em] text-brand-ink">ITC-BT-03</span>{' '}
            Empresa instaladora
          </h3>
          <p className="mt-1 text-sm text-ink-faint">Un solo bloque para todo el proyecto: es la misma empresa en cada una de sus instalaciones. El logo se carga en «Editar datos del proyecto», en el rail.</p>
        </div>
        <InstallerFields info={info} onChange={onChange} />
      </section>

      <section className="rounded-card border border-line bg-paper p-5 shadow-card" aria-labelledby="datos-proyecto-title">
        <div className="mb-5">
          <h3 id="datos-proyecto-title" className="flex items-center gap-2 font-bold">
            <span className="rounded-tab border border-brand-line bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-[0.08em] text-brand-ink">Hoja 2</span>{' '}
            Datos del proyecto
          </h3>
          <p className="mt-1 text-sm text-ink-faint">Lo que la hoja 2 imprime en común: el titular, el emplazamiento de la obra, la distribuidora y el tipo de instalación. El número, el piso, la puerta, la superficie del local y la tierra se declaran en la pestaña Administrativos, en la card que se navega por vivienda.</p>
        </div>
        <ProjectDataFields info={info} onChange={onChange} />
      </section>

      <p className="flex items-start gap-2 rounded-card border border-line bg-brand-soft p-4 text-sm leading-6 text-brand-ink">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        La firma del titular y el sello del instalador se completan a mano sobre el impreso: la aplicación no los genera ni los sustituye.
      </p>
    </div>
  )
}
