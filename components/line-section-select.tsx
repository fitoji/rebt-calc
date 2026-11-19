'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from '@ui-sdk/react/select'

import { cn } from 'cn'

const fmt = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)

export type LineSectionSelectProps = {
  /** Id del trigger, para que la etiqueta visible del panel lo señale. */
  id: string
  /** 'lga' | 'di': nombra la línea en la etiqueta accesible. */
  role: 'lga' | 'di'
  /** Secciones con intensidad admisible publicada para esta instalación. */
  sections: number[]
  /** Sección que propone el cálculo: la recomendada por mínimo, caída y corriente. */
  recommended: number | null
  /** Sección fijada a mano, o null cuando se usa la recomendada. */
  selected: number | null
  /** La sección fijada no cumple y el trigger se pinta en rojo. */
  invalid: boolean
  /** Tinte de la tarjeta de la línea, el mismo que usa su pestaña. */
  tint?: string
  onChange: (section: number | null) => void
}

/**
 * Sección de fase de una línea LGA o DI. La opción «Automática» es la
 * recomendada por el cálculo y conserva su check aunque el proyecto elija otra
 * sección; el check del ítem seleccionado es el indicador del desplegable.
 */
export function LineSectionSelect({ id, role, sections, recommended, selected, invalid, tint = '', onChange }: LineSectionSelectProps) {
  const label = role === 'lga' ? 'LGA' : 'DI'
  const automaticLabel = recommended == null
    ? 'Automática · sin sección'
    : `Automática · ${fmt(recommended)} mm²`

  const items = [
    { value: 'auto', label: automaticLabel },
    ...sections.map(section => ({ value: String(section), label: `${fmt(section)} mm²` })),
  ]

  return (
    <Select
      items={items}
      value={selected == null ? 'auto' : String(selected)}
      onValueChange={next => onChange(next == null || next === 'auto' ? null : Number(next))}
    >
      <SelectTrigger
        id={id}
        aria-label={`Sección de fase · ${label}`}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-1 rounded-control border border-line px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring',
          tint || 'bg-paper',
          invalid && 'border-danger text-danger'
        )}
      >
        <SelectValue>{(state) => state.label}</SelectValue>
        <ChevronDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
      </SelectTrigger>
      <SelectContent className="max-h-72 w-[var(--anchor-width)] overflow-auto rounded-control border border-line bg-paper p-1 shadow-card">
        {items.map(item => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1 text-xs outline-none data-[highlighted]:bg-brand-soft data-[selected]:font-semibold"
          >
            <span>{item.label}</span>
            {item.value === 'auto' ? (
              <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wide text-ink-faint">
                <Check className="size-3" aria-hidden="true" />
                Recomendada
              </span>
            ) : (
              <SelectItemIndicator className="ml-auto">
                <Check className="size-3.5" aria-hidden="true" />
              </SelectItemIndicator>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
