import type { ReactNode } from 'react'

/** Consolidated REBT text (RD 842/2002) on the BOE. */
export const BOE_REBT = 'https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099'
/** RD 1053/2014, which added the EV charging section to the REBT. */
export const BOE_ITC_BT_52 = 'https://www.boe.es/buscar/doc.php?id=BOE-A-2014-13681'

/** Footer that cites where a card's numbers come from. */
export function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-5 border-t border-line-soft pt-3 text-xs leading-5 text-ink-faint"><span className="font-semibold text-ink-subtle">Fuente: </span>{children}</p>
}

/** Link to the consolidated text in the BOE. */
export function BoeLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline-offset-4 hover:underline">{label}</a>
}
