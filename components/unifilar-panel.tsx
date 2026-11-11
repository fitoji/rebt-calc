'use client'

import { Button } from '@/components/ui/button'
import { IEC_SYMBOL_CATALOG } from '@/components/unifilar-symbols'
import {
  KindLegend,
  UnifilarDiagram,
  type InstallationKind,
  type UnifilarDerivation,
  type UnifilarLine,
} from '@/components/unifilar-diagram'
import { formatPower } from '../lib/power-units.mjs'

/**
 * Pestaña del esquema unifilar.
 *
 * El dibujo sale del mismo resultado que ya dimensionó la LGA y las DI: no hay
 * un segundo cálculo que pueda quedar desincronizado. La leyenda de tipos y la
 * librería de símbolos acompañan a la lámina porque el esquema se lee fuera de
 * la app, impreso o en el teléfono de la obra.
 */
export function UnifilarPanel({
  lga, derivations, installationType, onGenerateDerivations, onOpenDerivations,
}: {
  lga: UnifilarLine
  derivations: UnifilarDerivation[]
  installationType: InstallationKind
  onGenerateDerivations: () => void
  onOpenDerivations: () => void
}) {
  const count = derivations.length

  if (count === 0) {
    return (
      <section className="rounded-card border border-line bg-paper p-5 shadow-card">
        <h3 className="font-bold">Esquema unifilar del edificio</h3>
        <p className="mt-1 text-sm leading-6 text-ink-faint">
          El esquema se dibuja con las derivaciones de la instalación. Todavía no hay ninguna: se generan desde la
          previsión de cargas, una por vivienda, local, garaje o servicio general.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="default"
            className="h-auto gap-2 rounded-control px-4 py-3 font-semibold"
            onClick={onGenerateDerivations}
          >
            Generar desde la previsión
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-auto gap-2 rounded-control px-4 py-3 font-semibold"
            onClick={onOpenDerivations}
          >
            Ir a Derivaciones
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="min-w-0 rounded-card border border-line bg-paper p-5 shadow-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold">Esquema unifilar del edificio</h3>
            <p className="mt-1 text-sm text-ink-faint">
              {count} {count === 1 ? 'derivación individual' : 'derivaciones individuales'} ·{' '}
              {formatPower(derivations.reduce((sum, derivation) => sum + Math.max(0, derivation.powerW), 0), 'kW')} instalados
            </p>
          </div>
          <p className="text-xs text-ink-faint">
            {installationType === 'single-user' ? 'Único usuario · sin LGA' : 'Medida centralizada'}
          </p>
        </div>

        <UnifilarDiagram lga={lga} derivations={derivations} installationType={installationType} />

        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-muted">Tipos de carga</span>
          <KindLegend />
        </div>

        <p className="mt-4 text-xs leading-5 text-ink-faint">
          Esquema orientativo según el REBT (RD 842/2002). La sección, la protección In y la caída salen del
          dimensionado de cada línea; el diferencial es el que exige la ITC-BT-24 y, en vivienda, uno por cada
          cinco circuitos (ITC-BT-25 §2.1). Desplaza la lámina en horizontal para ver todas las derivaciones.
        </p>
      </section>

      <section className="min-w-0 rounded-card border border-line bg-paper p-5 shadow-card">
        <h3 className="font-bold">Símbolos UNE-EN 60617</h3>
        <p className="mt-1 text-sm text-ink-faint">
          Símbolos gráficos del esquema, según la norma UNE-EN 60617 (idéntica a la IEC 60617).
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {IEC_SYMBOL_CATALOG.map(symbol => (
            <li key={symbol.code} className="flex flex-col items-center rounded-control border border-line bg-surface-muted px-2 py-3">
              <svg width={52} height={44} viewBox="-22 -22 50 44" aria-hidden="true" focusable="false">
                <g transform="translate(0,-2)">{symbol.render}</g>
              </svg>
              <span className="mt-1.5 text-center">
                <span className="block text-xs font-semibold text-ink-muted">{symbol.name}</span>
                <span className="block text-[10px] text-ink-faint">{symbol.code}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
