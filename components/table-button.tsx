'use client'

import { Table2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * El botón de tabla de un valor normativo (convención en
 * `.agents/skills/normative-tables-ui/SKILL.md`).
 *
 * Un valor que sale de una tabla se lee como **valor + este botón**: el nombre de
 * la tabla vive en el panel que se abre y en la `SourceNote`, nunca en la
 * etiqueta del valor. Así `IGA (tabla A)` pasa a ser `IGA` con su botón, y `Iz de
 * tabla` pasa a ser `Iz` con el suyo.
 *
 * El botón no es dueño del diálogo: quien lo monta decide qué panel abre con
 * `onOpen` y de dónde sale ese panel, porque en este repo el estado de los
 * diálogos es local a `components/load-calculator.tsx` y viaja por props.
 *
 * La clase es la del disparador del coeficiente de simultaneidad —el patrón que
 * ya existía— para que todos los valores de la aplicación se lean igual.
 */
const TABLE_BUTTON_CLASS = 'flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-transparent text-ink-faint transition-colors hover:border-brand-mark hover:bg-brand-soft hover:text-brand'

export type TableButtonProps = {
  /** Qué tabla abre, en el nombre accesible: obligatorio y con la tabla nombrada. */
  ariaLabel: string
  /** Abre el panel de tablas; el botón no guarda el estado de apertura. */
  onOpen: () => void
}

export function TableButton({ ariaLabel, onOpen }: TableButtonProps) {
  return (
    <Button type="button" variant="outline" size="icon" aria-label={ariaLabel} aria-haspopup="dialog" className={TABLE_BUTTON_CLASS} onClick={onOpen}>
      <Table2 className="size-4" aria-hidden="true" />
    </Button>
  )
}
