"use client"

import type { ComponentProps } from 'react'

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
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-primary data-[unchecked]:bg-input dark:data-[unchecked]:bg-input/80',
        className
      )}
    >
      <SwitchThumb className="pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform data-[checked]:translate-x-4 data-[unchecked]:translate-x-0" />
    </SwitchPrimitive>
  )
}

export { Switch }
