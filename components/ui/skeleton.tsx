import { cn } from 'cn'

/**
 * Placeholder de carga. Mantiene la forma del contenido mientras el bloque real
 * se resuelve, usando el token semántico `muted` para adaptarse a cada tema.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
