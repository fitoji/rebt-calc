export type ExplanationStep = {
  id: string
  title: string
  kind: 'table' | 'formula' | 'selection' | 'text' | 'list'
  rows?: Array<{
    label?: string
    value?: string
    section?: number
    correctedCurrent?: number
    dropPercent?: number
    status?: 'chosen' | 'discarded'
    reason?: string
  }>
  formula?: string
  substitution?: string
  result?: string
  note?: string
  criterion?: string
  text?: string
  items?: string[]
}

const fmt = (value: number, digits = 0) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

export function CalculationSteps({ steps }: { steps: ExplanationStep[] }) {
  return (
    <section className="mt-6 border-t border-line pt-5" aria-label="Desarrollo del cálculo">
      <h3 className="mb-4 text-sm font-bold text-ink-soft">Desarrollo del cálculo</h3>
      <div className="flex flex-col gap-4">
        {steps.map(step => (
          <article key={step.id} className="border-b border-line py-4 last:border-b-0">
            <h4 className="mb-2 text-sm font-semibold text-ink">{step.title}</h4>
            {step.kind === 'table' && (
              <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
                {step.rows?.map(row => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-ink-faint">{row.label}</dt>
                    <dd className="tabular-nums font-medium text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {step.kind === 'formula' && (
              <div className="flex flex-col gap-1.5 text-sm">
                <code className="rounded bg-paper px-2 py-1 font-mono text-xs text-ink-strong">{step.formula}</code>
                {step.substitution && <p className="font-mono text-xs text-ink-subtle">{step.substitution}</p>}
                <p className="font-semibold text-ink-strong">{step.result}</p>
                {step.note && <p className="text-xs text-ink-faint">{step.note}</p>}
              </div>
            )}
            {step.kind === 'selection' && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-ink-faint">
                        <th className="pb-1.5">Sección</th>
                        <th className="pb-1.5">Iz corregida</th>
                        <th className="pb-1.5">Caída</th>
                        <th className="pb-1.5">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {step.rows?.map(row => (
                        <tr key={row.section} className={row.status === 'chosen' ? 'font-semibold text-ink-strong' : 'text-ink-subtle'}>
                          <td className="py-1.5 tabular-nums">{row.section == null ? '—' : `${fmt(row.section, 1)} mm²`}</td>
                          <td className="py-1.5 tabular-nums">{row.correctedCurrent == null ? '—' : `${fmt(row.correctedCurrent, 0)} A`}</td>
                          <td className="py-1.5 tabular-nums">{row.dropPercent == null ? '—' : `${fmt(row.dropPercent, 2)} %`}</td>
                          <td className="py-1.5">{row.status === 'chosen' ? `Adoptada. ${row.reason}` : row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs font-semibold text-ink-strong">{step.result} · {step.criterion}</p>
              </>
            )}
            {step.kind === 'text' && <p className="text-xs leading-5 text-ink-subtle">{step.text}</p>}
            {step.kind === 'list' && (
              <ul className="list-disc space-y-1 pl-4 text-xs text-warning-ink">
                {step.items?.map(item => <li key={item}>{item}</li>)}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
