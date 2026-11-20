# 003 — Duraciones de overlays y feedback de press

- **Status**: DONE
- **Commit**: ffa90a2
- **Severity**: MEDIUM
- **Category**: Easing & duration (2) + Physicality (3)
- **Estimated scope**: 5 files, ~10 líneas

## Problem

Los overlays entran en 100ms, por debajo del presupuesto (modales 200–500ms,
selects 150–250ms): el ojo no llega a percibir movimiento, se siente una
aparición instantánea. Y el botón comunica el press con un salto de 1px, simétrico.

Código actual, verbatim:

```tsx
// components/ui/dialog.tsx:34 — overlay
"fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",

// components/ui/dialog.tsx:56 — content
"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-panel bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",

// components/ui/select.tsx:85
"... rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none ... data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 ...",

// components/ui/hover-card.tsx:40
"... shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 ...",

// components/ui/button.tsx:6
"... whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 outline-none select-none ... active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none ...",
```

```tsx
// components/ui/radio-group.tsx:22 — sin ninguna transición (el checkbox sí la tiene en checkbox.tsx:12)
"group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none ... data-checked:border-primary data-checked:bg-primary ...",
```

## Target

| Elemento | Antes | Después | Por qué |
| --- | --- | --- | --- |
| Overlay del diálogo | `duration-100` | `duration-200` | Presupuesto de modal |
| Contenido del diálogo | `duration-100` + `zoom-in-95` | `duration-300` + `zoom-in-96` | 200–500ms; el zoom de 5% es imperceptible |
| Select | `duration-100` | `duration-200` | 150–250ms |
| Hover card | `duration-100` | `duration-150` | Tooltip/popover chico: 125–200ms |
| Press del botón | `translate-y-px` 150ms | `scale-[0.97]` con press más rápido que la vuelta | `scale(0.97)`, asimetría real |
| Radio | sin transición | `transition-colors duration-150` | Coherencia con `checkbox.tsx:12` |

```tsx
// target — components/ui/button.tsx:6 (solo los dos fragmentos que cambian)
"transition-[color,background-color,border-color,scale] duration-150 active:duration-100"
"active:not-aria-[haspopup]:scale-[0.97]"
```

`scale` es propiedad individual en Tailwind v4; por eso reemplaza a `transform` en
la lista de transición y la clase usa `scale-[0.97]`, no `translate-y-px`.

## Repo conventions to follow

- Los componentes `components/ui/*` son shadcn/Base UI con clases utilitarias; el
  ajuste se hace sobre la cadena de clases, no con CSS nuevo.
- Ejemplar de duración dentro de presupuesto: `components/ui/switch.tsx:22-26`
  (`duration-200`) y `switch.tsx:26` (`ease-out`).

## Steps

1. `components/ui/dialog.tsx:34`: `duration-100` → `duration-200`.
2. `components/ui/dialog.tsx:56`: `duration-100` → `duration-300` y
   `zoom-in-95` → `zoom-in-96` (solo en `data-open`; el `zoom-out-95` de salida
   queda igual).
3. `components/ui/select.tsx:85`: `duration-100` → `duration-200`.
4. `components/ui/hover-card.tsx:40`: `duration-100` → `duration-150`.
5. `components/ui/button.tsx:6`: reemplazar los dos fragmentos del target.
6. `components/ui/radio-group.tsx:22`: agregar `transition-colors duration-150`
   al inicio de la cadena de clases del `RadioPrimitive.Root`.

## Boundaries

- No tocar `transform-origin`, `zoom-in`/`zoom-out` de salida, `slide-in-from-*`
  ni `animate-in`/`animate-out`.
- No cambiar el tamaño, el layout ni el markup de ningún componente.
- No agregar dependencias ni keyframes nuevos.
- Si el código no coincide con los excerpts (drift desde `ffa90a2`), STOP y reportar.

## Verification

- **Mechanical**: `pnpm typecheck` → sin errores. `grep -n "duration-100"
  components/ui/*.tsx` → sin resultados.
- **Feel check**:
  - Abrir un diálogo con DevTools → Animations al 10%: se ve el fade **y** el
    zoom de 4%; antes solo se veía un parpadeo.
  - Presionar un botón: baja 3% al presionar y vuelve en ~150ms; nunca se
    desplaza verticalmente.
  - Marcar un radio: el relleno cambia con transición, igual que el checkbox.
  - Rendering → `prefers-reduced-motion: reduce`: los overlays siguen apareciendo
    (fade) pero sin zoom.
- **Done when**: no queda `duration-100` en `components/ui/` y el press no usa
  `translate`.
