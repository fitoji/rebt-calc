import type { ReactNode } from 'react'

/**
 * Masthead shared by every page: the brand block on the left and the page
 * controls on the right.
 *
 * The brand line under "Electro-cálculos" names the product, not the page, so it
 * is only a heading where the product name is the page topic (`titleAs="h1"`,
 * the calculator). Pages with their own document heading pass the default and
 * become a plain text label, keeping a single `h1` per document.
 */
export function SiteHeader({ titleAs = 'p', children }: {
  titleAs?: 'h1' | 'p'
  children?: ReactNode
}) {
  const BrandTitle = titleAs === 'h1' ? 'h1' : 'p'

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-5 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-panel ring-1 ring-panel-edge">
            <img src="/icons/electricity.png" alt="" className="size-7 object-contain" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Electro-cálculos</p>
            <BrandTitle className="text-lg font-bold tracking-tight">Previsión de cargas</BrandTitle>
          </div>
        </div>
        {children}
      </div>
    </header>
  )
}
