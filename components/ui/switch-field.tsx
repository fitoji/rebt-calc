"use client"

import { Field, FieldDescription, FieldLabel } from '@ui-sdk/react/field'
import { cn } from 'cn'

import { Switch } from '@/components/ui/switch'

type SwitchFieldProps = {
  id?: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

/**
 * Rótulo, descripción e interruptor como una sola opción: un clic en cualquier
 * punto de la card alterna el switch, y el texto del rótulo no cambia con el
 * estado. La ruta de teclado es Space sobre el switch, igual que en el sink.
 */
function SwitchField({ id, label, description, checked, onCheckedChange, className }: SwitchFieldProps) {
  return (
    <Field className={cn('relative flex items-start justify-between gap-4 rounded-control border border-line p-3', className)}>
      <div className="min-w-0">
        <FieldLabel htmlFor={id} className="block cursor-pointer text-sm font-semibold text-ink after:absolute after:inset-0 after:content-['']">{label}</FieldLabel>
        {description && <FieldDescription className="mt-1 text-xs leading-5 text-ink-faint">{description}</FieldDescription>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </Field>
  )
}

export { SwitchField }
