'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectItemIndicator, SelectTrigger, SelectValue } from '@ui-sdk/react/select'

import { cn } from 'cn'

export type DropOption = { value: number; label: string }

export type LineDropSelectProps = {
  /** Id del trigger, para que la etiqueta visible del panel lo señale. */
  id: string
  /** 'lga' | 'di': nombra la línea en la etiqueta accesible. */
  role: 'lga' | 'di'
  /** Caída adoptada, en tanto por ciento. */
  value: number
  /** Valores de la instrucción, ya etiquetados, más el guardado si no está. */
  options: DropOption[]
  /** Valor que fija el supuesto de enlace; se marca como recomendado. */
  recommended?: number | null
  onChange: (value: number) => void
}

/**
 * Caída máxima admisible de una línea. Usa el mismo Select de UI SDK que la
 * sección de los circuitos: el valor adoptado lleva su check y el que fija el
 * supuesto de enlace conserva la marca «Recomendada» aunque se elija otro.
 */
export function LineDropSelect({ id, role, value, options, recommended = null, onChange }: LineDropSelectProps) {
  const label = role === 'lga' ? 'LGA' : 'DI'
  const items = options.map(option => ({ value: String(option.value), label: option.label }))

  return (
    <Select
      items={items}
      value={String(value)}
      onValueChange={next => onChange(Number(next))}
    >
      <SelectTrigger
        id={id}
        aria-label={`Caída máxima admisible · ${label}`}
        className={cn(
          'flex h-8 w-full min-w-0 items-center justify-between gap-1 rounded-control border border-line bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring'
        )}
      >
        <SelectValue>{(state) => <span className="block truncate">{state.label}</span>}</SelectValue>
        <ChevronDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
      </SelectTrigger>
      <SelectContent className="max-h-72 w-[var(--anchor-width)] overflow-auto rounded-control border border-line bg-paper p-1 shadow-card">
        {options.map(option => (
          <SelectItem
            key={option.value}
            value={String(option.value)}
            className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1 text-xs outline-none data-[highlighted]:bg-brand-soft data-[selected]:font-semibold"
          >
            <span>{option.label}</span>
            {recommended != null && option.value === recommended ? (
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
