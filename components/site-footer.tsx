/**
 * Footer shared by every page: licence and credits on the left, source link on
 * the right. It carries no page state, so both pages can render the same block
 * and the reader never lands on a page that looks cut off at the bottom.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 sm:flex-row lg:px-8">
        <p className="text-center text-xs leading-5 text-ink-faint">
          Código abierto bajo licencia <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline-offset-4 hover:underline">MIT</a> · Iconos por <a href="https://icons8.com" target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline-offset-4 hover:underline">Icons8</a>
        </p>
        <a href="https://github.com/fitoji/rebt-calc" target="_blank" rel="noopener noreferrer" aria-label="Ver el código fuente en GitHub" className="inline-flex items-center gap-2 text-xs font-medium text-ink-faint transition-colors hover:text-ink">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
          <span>fitoji/rebt-calc</span>
        </a>
      </div>
    </footer>
  )
}
