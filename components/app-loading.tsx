import { LoaderCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Pantalla de carga de la app: reproduce la estructura de la calculadora
 * (cabecera, bloque de título y tarjetas) con skeletons y coloca el spinner en
 * el centro del área principal. Se usa como fallback de `app/loading.tsx` y
 * puede reutilizarse en cualquier frontera de Suspense.
 */
export function AppLoading() {
  return (
    <main
      className="relative isolate min-h-screen bg-surface-page text-ink"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Cargando la aplicación…</span>

      <div className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 shrink-0 rounded-control" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-5 w-52" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-8 w-24 sm:block" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl space-y-3">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="flex min-h-[42vh] flex-col items-center justify-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-paper ring-1 ring-line">
            <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-brand" />
          </div>
          <p className="text-sm font-medium text-ink-faint">Cargando…</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div key={card} className="space-y-4 rounded-control border border-line bg-paper p-5">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-20 flex-1" />
                <Skeleton className="h-20 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
