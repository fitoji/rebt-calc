"use client"

import type { CSSProperties } from "react"
import { useEffect, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { Toaster as SonnerToaster } from "sonner"

/**
 * Modo efectivo de la app. El proyecto no usa next-themes: el modo oscuro es la
 * clase `.dark` del `<html>`, que aplican el script de arranque y el selector del
 * encabezado. Se observa esa clase para que los toasts sigan el tema en vivo.
 */
function useAppTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.classList.contains("dark"))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return dark ? "dark" : "light"
}

/**
 * Avisos transitorios. Se monta una sola vez en el layout raíz y se usa con
 * `toast.warning(...)` desde cualquier componente cliente.
 */
function Toaster() {
  const theme = useAppTheme()

  return (
    <SonnerToaster
      theme={theme}
      className="toaster group"
      position="bottom-right"
      closeButton
      // Los colores salen de los tokens del proyecto para que el aviso hable el
      // mismo idioma visual que el resto de las tarjetas. `toast.warning` comparte
      // la paleta `--normal-*` porque `richColors` va apagado: sus `--warning-*`
      // solo se consumen con `data-rich-colors`, y activarlo traería los colores
      // propios de sonner en lugar de los del proyecto.
      style={
        {
          "--normal-bg": "var(--paper)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
        } as CSSProperties
      }
      icons={{ warning: <TriangleAlert className="size-4" aria-hidden="true" /> }}
    />
  )
}

export { Toaster }
