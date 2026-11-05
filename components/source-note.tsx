import type { ReactNode } from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

/** Consolidated REBT text (RD 842/2002) on the BOE. */
export const BOE_REBT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099'
/** RD 1053/2014, which added the EV charging section to the REBT. */
export const BOE_ITC_BT_52 = 'https://www.boe.es/buscar/doc.php?id=BOE-A-2014-13681'
/**
 * Ministry's ITC-BT-52 application guide. Its Anexo 2 is the source of the
 * 10 % EV load forecast; the instruction itself only fixes the technical
 * requirements.
 */
export const GUIA_BT_52 = 'https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Documents/bt/guia_bt_52_nov17R1.pdf'

/**
 * Footer that cites where a card's numbers come from.
 *
 * Only the short reference stays on screen; the full reasoning lives in a hover
 * card so the card keeps its calm. The trigger is a button, so keyboard users
 * get the same detail on focus.
 */
export function SourceNote({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <HoverCard>
        <HoverCardTrigger
          render={<button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-note-sand px-2.5 py-1.5 text-left text-xs font-medium text-note-sand-ink underline decoration-dotted underline-offset-4 transition-colors hover:bg-note-sand/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" />}
        >
          Fuente: {label}<span className="sr-only"> (ver detalle)</span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80 max-w-[90vw] rounded-panel bg-note-sand p-3 text-xs leading-5 text-note-sand-ink ring-line">
          {children}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

/** Link to an official source: the BOE consolidated text or a ministry guide. */
export function BoeLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-4">{label}<span className="sr-only"> (se abre en una pestaña nueva)</span></a>
}
