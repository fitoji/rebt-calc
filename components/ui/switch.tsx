"use client"

import type { ComponentProps } from 'react'

import { Check, X } from 'lucide-react'
import { Switch as SwitchPrimitive, SwitchThumb } from '@ui-sdk/react/switch'
import { cn } from 'cn'

type SwitchProps = Omit<ComponentProps<typeof SwitchPrimitive>, 'className' | 'onCheckedChange'> & {
  className?: string
  /** La API de la app recibe el estado ya resuelto, sin los detalles del SDK. */
  onCheckedChange?: (checked: boolean) => void
}

function Switch({ className, onCheckedChange, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive
      data-slot="switch"
      {...props}
      onCheckedChange={checked => onCheckedChange?.(checked)}
      className={cn(
        'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-sm border border-transparent p-0.5 transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none data-[checked]:bg-primary data-[unchecked]:bg-input dark:data-[unchecked]:bg-input/80',
        className
      )}
    >
      <SwitchThumb className="pointer-events-none flex size-6 items-center justify-center rounded-sm bg-background shadow-sm ring-0 transition-transform duration-200 ease-out motion-reduce:transition-none data-[checked]:translate-x-5 data-[unchecked]:translate-x-0">
        {state => state.checked
          ? <Check className="size-3.5 text-primary" aria-hidden="true" />
          : <X className="size-3.5 text-ink-faint" aria-hidden="true" />}
      </SwitchThumb>
    </SwitchPrimitive>
  )
}

export { Switch }
