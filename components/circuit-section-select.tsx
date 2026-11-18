'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from '@ui-sdk/react/select'

import { cn } from 'cn'
import { HOUSING_CIRCUIT_SECTIONS } from '../lib/housing-circuits.mjs'

const fmt = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)

export type CircuitSectionSelectProps = {
  circuitId: string
  recommended: number | null
  selected: number | null
  invalid: boolean
  /** Tinte de la fila del circuito, el mismo que usa la tabla. */
  tint?: string
  onChange: (section: number | null) => void
}

/**
 * Sección del circuito. La opción «Calculada» es la recomendada por tabla 1 y
 * caída, y conserva su check aunque el proyecto elija otra sección. El check
 * del ítem seleccionado es el indicador del desplegable, como en el Select del
 * sink de UI SDK.
 */
export function CircuitSectionSelect({ circuitId, recommended, selected, invalid, tint = '', onChange }: CircuitSectionSelectProps) {
  if (recommended == null) return <span className="text-ink-faint">—</span>

  const items = [
    { value: 'auto', label: `Calculada · ${fmt(recommended)} mm²` },
    ...HOUSING_CIRCUIT_SECTIONS.map(section => ({ value: String(section), label: `${fmt(section)} mm²` })),
  ]

  return (
    <Select
      items={items}
      value={selected == null ? 'auto' : String(selected)}
      onValueChange={next => onChange(next == null || next === 'auto' ? null : Number(next))}
    >
      <SelectTrigger
        aria-label={`Sección · ${circuitId}`}
        className={cn(
          'flex h-8 w-36 items-center justify-between gap-1 rounded-control border border-line px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring',
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
