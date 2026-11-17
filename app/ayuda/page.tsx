import type { Metadata } from 'next'
import { HelpDoc } from '@/components/help-doc'

export const metadata: Metadata = {
  title: 'Cómo usar Electro-cálculos | Guía de previsión, líneas y cuadros',
  description: 'Guía de uso de Electro-cálculos: previsión P1 a P5, LGA, derivaciones, cuadros interiores, esquema unifilar y memoria ELEC-3, con capturas reales de la app.',
  alternates: { canonical: '/ayuda' },
}

export default function Page() {
  return <HelpDoc />
}
