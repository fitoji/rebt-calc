import type { Metadata } from 'next'
import { HelpDoc } from '@/components/help-doc'

export const metadata: Metadata = {
  title: 'Cómo usar Electro-cálculos | Guía de la previsión de cargas',
  description: 'Guía de uso de Electro-cálculos: previsión de cargas P1 a P5, LGA, derivaciones individuales, parámetros, exportación y límites del cálculo, con capturas reales de la app.',
  alternates: { canonical: '/ayuda' },
}

export default function Page() {
  return <HelpDoc />
}
