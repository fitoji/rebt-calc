'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import type { Metadata } from 'next'
import { loadCalculatorInputs } from '@/lib/calculator-storage.mjs'
import { evaluateRequirements, REQUIREMENT_GROUPS } from '@/lib/requirements.mjs'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

type Requirement = {
  id: string
  group: string
  title: string
  detail: string
  source: string
  valid: boolean
  tip: string
}

function readState() {
  if (typeof window === 'undefined') return { inputs: null, projectInfo: null }
  try {
    const inputs = loadCalculatorInputs(window.localStorage)
    const raw = window.localStorage.getItem('electrocalc-project-info')
    const projectInfo = raw ? JSON.parse(raw) : null
    return { inputs, projectInfo }
  } catch {
    return { inputs: null, projectInfo: null }
  }
}

export default function RequisitosPage() {
  const [reqs, setReqs] = useState<Requirement[]>([])

  useEffect(() => {
    const update = () => {
      const { inputs, projectInfo } = readState()
      setReqs(evaluateRequirements({ inputs, projectInfo }) as Requirement[])
    }
    update()
    const onStorage = () => update()
    window.addEventListener('storage', onStorage)
    // Poll lightly for same-tab changes (localStorage events don't fire in same tab)
    const interval = window.setInterval(update, 2000)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(interval)
    }
  }, [])

  const validCount = reqs.filter(r => r.valid).length
  const total = reqs.length

  const byGroup = REQUIREMENT_GROUPS.map(group => ({
    group,
    items: reqs.filter(r => r.group === group),
  }))

  return (
    <>
      <SiteHeader titleAs="p">
        <Link href="/" className="group inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-mark hover:text-brand">
          <ArrowLeft aria-hidden="true" className="size-4 transition-transform motion-safe:group-hover:-translate-x-0.5" />
          Volver a la calculadora
        </Link>
      </SiteHeader>

      <main className="min-h-screen bg-surface-page text-ink">
        <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand">Requisitos</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Requisitos para proyecto o memoria técnica de diseño</h1>
            <p className="mt-4 text-base leading-7 text-ink-subtle">
              Checklist normativo de lo que debe contener una memoria técnica de diseño (REBT). Cada requisito se marca como <strong className="text-ink">válido</strong> automáticamente cuando la app dispone de los datos necesarios, y muestra el tip correspondiente.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-faint">
              Progreso: {validCount} de {total} requisitos válidos.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {byGroup.map(({ group, items }) => (
              <section key={group} className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-ink">{group}</h2>
                <ul className="space-y-3">
                  {items.map(item => (
                    <li key={item.id} className="rounded-card border border-line bg-paper p-4 shadow-card">
                      <div className="flex items-start gap-3">
                        {item.valid
                          ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand" />
                          : <Circle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-ink-faint" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-ink">{item.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.valid ? 'bg-brand-soft text-brand' : 'bg-surface-muted text-ink-soft'}`}>
                              {item.valid ? 'Válido' : 'Pendiente'}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-ink-subtle">{item.detail}</p>
                          <p className="mt-1 text-xs text-ink-faint">Fuente: {item.source}</p>
                          <p className={`mt-2 text-sm leading-6 ${item.valid ? 'font-medium text-brand' : 'text-ink-subtle'}`}>
                            Tip: {item.tip}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}