'use client'

import Link from 'next/link'
import { Info } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { powerFieldValue, storePower } from '../lib/power-units.mjs'
import type { Documentation } from '../lib/project-documentation.mjs'

/** Cambio parcial del bloque: el panel no conoce el almacenamiento ni el cálculo. */
export type DocumentationPatch = Partial<Documentation>

/** Criterio cualitativo de ITC-BT-04 §3.1: ni potencia ni carga del edificio. */
type ToggleKey = Exclude<keyof Documentation, 'outdoorLightingW' | 'poolsW'>

/** Las dos potencias que la previsión no puede deducir de las cargas del edificio. */
type PowerKey = Extract<keyof Documentation, 'outdoorLightingW' | 'poolsW'>

/** Las dos potencias de documentación: rótulo, nota y el mismo campo en su sección. */
const POWER_FIELDS: ReadonlyArray<{ key: PowerKey; label: string; hint: string }> = [
  {
    key: 'outdoorLightingW',
    label: 'Potencia de alumbrado exterior',
    hint: 'Alumbrado de viales y jardines · §3.1 k: proyecto por encima de 5 kW. Es una instalación propia (ITC-BT-09 §1): la ITC-BT-10 no le asigna bloque en la previsión del edificio, así que su potencia se declara solo para el veredicto del documento.',
  },
  {
    key: 'poolsW',
    label: 'Potencia de piscinas y fuentes',
    hint: 'Vasos de piscina y fuentes ornamentales · §3.1 n: proyecto por encima de 5 kW. La iluminación de fuentes y piscinas queda fuera de la ITC-BT-09 y la ITC-BT-10 no le asigna bloque: su potencia se declara solo para el veredicto del documento.',
  },
]

/** Los nueve criterios cualitativos de ITC-BT-04 §3.1 que la previsión no revela. */
const TOGGLES: ReadonlyArray<{ key: ToggleKey; label: string; hint: string }> = [
  {
    key: 'publicConcurrence',
    label: 'Local de pública concurrencia',
    hint: '§3.1 i: un local de pública concurrencia exige proyecto, sin umbral de potencia.',
  },
  {
    key: 'fireRisk',
    label: 'Local con riesgo de incendio o explosión',
    hint: '§3.1 l: exige proyecto sin umbral, excepto los aparcamientos, que se juzgan por su ventilación (§3.1 g y h).',
  },
  {
    key: 'operatingRooms',
    label: 'Quirófanos y salas de intervención',
    hint: '§3.1 m: exigen proyecto sin umbral de potencia.',
  },
  {
    key: 'dampLocales',
    label: 'Locales húmedos, polvorientos o con riesgo de corrosión',
    hint: '§3.1 b: exigen proyecto cuando la previsión supera 10 kW.',
  },
  {
    key: 'wetLocales',
    label: 'Locales mojados',
    hint: '§3.1 c: exigen proyecto cuando la previsión supera 10 kW.',
  },
  {
    key: 'temporary',
    label: 'Instalación de carácter temporal',
    hint: '§3.1 d: exige proyecto cuando la previsión supera 50 kW.',
  },
  {
    key: 'liftingMachines',
    label: 'Líneas con apoyos comunes con AT, tensiones especiales, rótulos luminosos o cercas eléctricas',
    hint: '§3.1 j: solo lo que la previsión no revela. Los ascensores y las máquinas de elevación y transporte se deducen de los ascensores y motores de P2.',
  },
  {
    key: 'irveOutdoor',
    label: 'Recarga de vehículo eléctrico en el exterior',
    hint: '§3.1 z: en el exterior exige proyecto por encima de 10 kW.',
  },
  {
    key: 'irveMode4',
    label: 'Estaciones de recarga en modo de carga 4',
    hint: '§3.1 z: el modo 4 exige proyecto sin límite de potencia.',
  },
]

/**
 * Reparto de los nueve criterios y de las dos potencias: cada dato se lee donde
 * se decide el bloque que lo provoca, y solo lo que no depende de ningún bloque
 * se queda en la card. El estado y el parche son los mismos en todos los destinos.
 */
/** P2 · Servicios generales: el alumbrado exterior y lo que la elevación no revela. */
export const P2_TOGGLE_KEYS: ReadonlyArray<ToggleKey> = ['liftingMachines']
/** P3 · Locales, oficinas e industrias. */
export const P3_TOGGLE_KEYS: ReadonlyArray<ToggleKey> = ['publicConcurrence', 'fireRisk', 'operatingRooms', 'dampLocales', 'wetLocales']
/** P5 · Recarga de vehículo eléctrico. */
export const P5_TOGGLE_KEYS: ReadonlyArray<ToggleKey> = ['irveOutdoor', 'irveMode4']
/** Sin bloque de previsión propio: la única que no depende de ninguna sección. */
const CARD_TOGGLE_KEYS: ReadonlyArray<ToggleKey> = ['temporary']

/** El alumbrado exterior se declara en P2, donde viven las cargas comunes. */
export const P2_POWER_KEYS: ReadonlyArray<PowerKey> = ['outdoorLightingW']
/** Piscinas y fuentes se declaran en P3, donde viven los locales. */
export const P3_POWER_KEYS: ReadonlyArray<PowerKey> = ['poolsW']

/** Los bloques de previsión que montan su grupo de documentación dentro de la sección. */
export type DocumentationGroup = 'p2' | 'p3' | 'p5'

const GROUPS: Record<DocumentationGroup, { keys: ReadonlyArray<ToggleKey>; powerKeys: ReadonlyArray<PowerKey>; note: string }> = {
  p2: {
    keys: P2_TOGGLE_KEYS,
    powerKeys: P2_POWER_KEYS,
    note: 'ITC-BT-04 §3.1 j y k: estas líneas y el alumbrado exterior deciden si la instalación exige proyecto. Son datos de documentación: no suman a P2 porque el alumbrado exterior es una instalación propia con su suministro (ITC-BT-09 §1) y la ITC-BT-10 no le da bloque en la previsión del edificio.',
  },
  p3: {
    keys: P3_TOGGLE_KEYS,
    powerKeys: P3_POWER_KEYS,
    note: 'ITC-BT-04 §3.1 b, c, i, l, m y n: estas categorías y las piscinas deciden si la instalación exige proyecto. Son datos de documentación: no suman a P3 porque piscinas y fuentes son una instalación propia (ITC-BT-09 §1 las excluye) y la ITC-BT-10 no les da bloque en la previsión del edificio.',
  },
  p5: {
    keys: P5_TOGGLE_KEYS,
    powerKeys: [],
    note: 'Estas categorías deciden si la recarga exige proyecto (ITC-BT-04 §3.1 z); son datos de documentación y no suman a P5.',
  },
}

/** Una potencia de documentación: mismo campo, misma unidad y mismo guardado. */
function PowerRow({ field, documentation, onChange, powerUnit }: { field: { key: PowerKey; label: string; hint: string }; documentation: Documentation; onChange: (patch: DocumentationPatch) => void; powerUnit: 'W' | 'kW' }) {
  return (
    <label>
      <span className="label">{field.label} ({powerUnit})</span>
      <span className="relative block">
        <Input
          aria-label={`${field.label} (${powerUnit})`}
          className="w-full pr-10"
          type="number"
          min="0"
          step={powerUnit === 'kW' ? '0.01' : '1'}
          value={powerFieldValue(documentation[field.key], powerUnit) || ''}
          onChange={event => onChange({ [field.key]: Math.max(0, storePower(Number(event.target.value), powerUnit)) })}
        />
        <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-ink-faint">{powerUnit}</span>
      </span>
      <span className="mt-1 block text-xs leading-5 text-ink-faint">{field.hint}</span>
    </label>
  )
}

/** Un criterio: rótulo, nota y el mismo interruptor en cualquier destino. */
function ToggleRow({ toggle, documentation, onChange }: { toggle: { key: ToggleKey; label: string; hint: string }; documentation: Documentation; onChange: (patch: DocumentationPatch) => void }) {
  return (
    <li className="flex items-start justify-between gap-4 rounded-control border border-line p-3">
      <div className="min-w-0">
        <Label htmlFor={`doc-${toggle.key}`} className="block text-sm font-semibold text-ink">{toggle.label}</Label>
        <p className="mt-1 text-xs leading-5 text-ink-faint">{toggle.hint}</p>
      </div>
      <Switch
        id={`doc-${toggle.key}`}
        aria-label={toggle.label}
        checked={documentation[toggle.key]}
        onCheckedChange={checked => onChange({ [toggle.key]: checked === true })}
      />
    </li>
  )
}

/**
 * Los datos de un bloque de previsión, dentro de la sección que los provoca.
 *
 * Presentacional como la card: recibe el bloque de documentación y devuelve el
 * parche parcial. No suma nada a P2, P3 ni P5: es el mismo dato de
 * documentación, solo que se pregunta donde el usuario decide esa carga.
 *
 * La unidad es opcional porque no todo grupo declara una potencia (P5 no lo
 * hace), pero se resuelve aquí a un valor definido: el vatío es la unidad de
 * registro, así que un grupo que algún día declare una potencia sin recibir la
 * preferencia escribe y muestra vatios, nunca una unidad indefinida.
 */
export function DocumentationToggles({ group, documentation, onChange, powerUnit = 'W' }: { group: DocumentationGroup; documentation: Documentation; onChange: (patch: DocumentationPatch) => void; powerUnit?: 'W' | 'kW' }) {
  const { keys, powerKeys, note } = GROUPS[group]

  return (
    <div className="mt-4 border-t border-line-soft pt-4">
      <p className="text-xs leading-5 text-ink-faint">{note}</p>
      {powerKeys.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {POWER_FIELDS.filter(field => powerKeys.includes(field.key)).map(field => (
            <PowerRow key={field.key} field={field} documentation={documentation} onChange={onChange} powerUnit={powerUnit} />
          ))}
        </div>
      )}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {TOGGLES.filter(toggle => keys.includes(toggle.key)).map(toggle => (
          <ToggleRow key={toggle.key} toggle={toggle} documentation={documentation} onChange={onChange} />
        ))}
      </ul>
    </div>
  )
}

/**
 * Bloque de documentación de la previsión de cargas.
 *
 * Presentacional: recibe el bloque y devuelve el cambio parcial. No guarda, no
 * calcula y no toca P1–P5 ni la potencia total: estos datos solo alimentan el
 * veredicto de ITC-BT-04 §3 que se resuelve en `/requisitos`. Los criterios y las
 * potencias que provoca un bloque de previsión se preguntan dentro de ese bloque
 * (P2, P3 y P5); aquí queda solo lo que no depende de ninguno.
 */
export function DocumentationPanel({ documentation, onChange }: { documentation: Documentation; onChange: (patch: DocumentationPatch) => void }) {
  return (
    <section className="rounded-card border border-line bg-paper p-5 shadow-card" aria-labelledby="documentacion-title">
      <div className="mb-5">
        <h3 id="documentacion-title" className="flex items-center gap-2 font-bold">
          <span className="rounded-tab border border-brand-line bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-[0.08em] text-brand-ink">ITC-BT-04 §3</span>{' '}
          Documentación exigible
        </h3>
        <p className="mt-1 text-sm text-ink-faint">
          Los criterios se preguntan en la sección que los provoca —los de servicios generales en P2, los de locales en P3 y los de recarga en P5—; aquí queda solo la instalación de carácter temporal, que no depende de ningún bloque de previsión. Los nueve y las dos potencias son datos de documentación: no suman a P1–P5 ni a la potencia total prevista. Solo deciden, con los grupos de ITC-BT-04 §3, si el edificio exige proyecto o memoria técnica de diseño.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {TOGGLES.filter(toggle => CARD_TOGGLE_KEYS.includes(toggle.key)).map(toggle => (
          <ToggleRow key={toggle.key} toggle={toggle} documentation={documentation} onChange={onChange} />
        ))}
      </ul>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-brand-soft p-3 text-xs leading-5 text-brand-ink">
        <Info data-icon="inline-start" /> El veredicto —proyecto o memoria técnica de diseño— y la tabla de grupos están en <Link href="/requisitos" className="font-semibold underline-offset-4 hover:underline">Requisitos del proyecto</Link>. Ordena los datos como los pide la instrucción: el alumbrado exterior en P2 y las piscinas en P3, en vatios; el resto, en criterios de sí o no en su sección.
      </p>
    </section>
  )
}
