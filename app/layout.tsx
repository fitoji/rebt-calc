import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Geist_Mono, JetBrains_Mono, Space_Mono } from 'next/font/google'
import './globals.css'

const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'Electro-cálculos | Previsión de cargas ITC-BT-10',
  description: 'Calculadora web de previsión de cargas para suministros en baja tensión conforme a la ITC-BT-10.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/favicon.png?v=2',
        type: 'image/png',
      },
      {
        url: '/icon.svg?v=2',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistMono.variable} ${jetbrainsMono.variable} ${dmSans.variable} ${spaceMono.variable}`}>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('electrocalc-theme')==='dark')document.documentElement.classList.add('dark');var m=localStorage.getItem('electrocalc-explanation-mode');document.documentElement.dataset.explanationMode=m==='didactic'?'didactic':'calculation'}catch(e){}",
          }}
        />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
