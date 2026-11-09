'use client'

import Link from 'next/link'
import { Info } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Documentation } from '../lib/project-documentation.mjs'

/** Cambio parcial del bloque: el panel no conoce el almacenamiento ni el cálculo. */
export type DocumentationPatch = Partial<Documentation>

/** Las dos potencias que la previsión no puede deducir de las cargas del edificio. */
const POWER_FIELDS: ReadonlyArray<{ key: 'outdoorLightingW' | 'poolsW'; label: string; hint: string }> = [
  {
    key: 'outdoorLightingW',
    label: 'Potencia de alumbrado exterior',
    hint: 'Alumbrado de viales y jardines · §3.1 k: proyecto por encima de 5 kW.',
  },
  {
    key: 'poolsW',
    label: 'Potencia de piscinas y fuentes',
    hint: 'Vasos de piscina y fuentes ornamentales · §3.1 n: proyecto por encima de 5 kW.',
  },
]

/** Los nueve criterios cualitativos de ITC-BT-04 §3.1 que la previsión no revela. */
const TOGGLES: ReadonlyArray<{ key: Exclude<keyof Documentation, 'outdoorLightingW' | 'poolsW'>; label: string; hint: string }> = [
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
    label: 'Máquinas de elevación y transporte y afines',
    hint: '§3.1 j: incluye líneas BT con apoyos comunes con AT, tensiones especiales, rótulos luminosos, cercas eléctricas y redes de distribución.',
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
 * Bloque de documentación de la previsión de cargas.
 *
 * Presentacional: recibe el bloque y devuelve el cambio parcial. No guarda, no
 * calcula y no toca P1–P5 ni la potencia total: estos datos solo alimentan el
 * veredicto de ITC-BT-04 §3 que se resuelve en `/requisitos`.
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
          Estos datos de documentación no suman a la previsión y no cambian P1–P5 ni la potencia total prevista. Solo deciden, con los grupos de ITC-BT-04 §3, si el edificio exige proyecto o memoria técnica de diseño.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {POWER_FIELDS.map(field => (
          <label key={field.key}>
            <span className="label">{field.label}</span>
            <span className="relative block">
              <Input
                aria-label={field.label}
                className="w-full pr-10"
                type="number"
                min="0"
                step="1"
                value={documentation[field.key] || ''}
                onChange={event => onChange({ [field.key]: Math.max(0, Number(event.target.value)) })}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-ink-faint">W</span>
            </span>
            <span className="mt-1 block text-xs leading-5 text-ink-faint">{field.hint}</span>
          </label>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {TOGGLES.map(toggle => (
          <li key={toggle.key} className="flex items-start justify-between gap-4 rounded-control border border-line p-3">
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
        ))}
      </ul>

      <p className="mt-4 flex items-start gap-2 rounded-lg bg-brand-soft p-3 text-xs leading-5 text-brand-ink">
        <Info data-icon="inline-start" /> El veredicto —proyecto o memoria técnica de diseño— y la tabla de grupos están en <Link href="/requisitos" className="font-semibold underline-offset-4 hover:underline">Requisitos del proyecto</Link>. Ordena los datos como los pide la instrucción: alumbrado exterior y piscinas en vatios; el resto, en criterios de sí o no.
      </p>
    </section>
  )
}
