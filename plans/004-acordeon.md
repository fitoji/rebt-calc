# 004 — El acordeón abre y cierra con altura animada

- **Status**: DONE
- **Commit**: ffa90a2
- **Severity**: HIGH
- **Category**: Missed opportunity / state indication (8)
- **Estimated scope**: 1 file, ~8 líneas

## Problem

El único acordeón de la app ("Requisitos del cuarto", `meter-center-card.tsx:197`)
salta abierto y cerrado: el panel no anima altura, así que el contenido aparece
de golpe y empuja el layout. Base UI ya entrega todo lo necesario
(`--accordion-panel-height` inline, más `data-starting-style` y
`data-ending-style`) y no se está usando.

Código actual:

```tsx
// components/ui/accordion.tsx:35-43
function AccordionPanel({ className, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn("overflow-hidden text-xs leading-5 text-ink-faint", className)}
      {...props}
    />
  )
}
```

## Target

```tsx
// target
function AccordionPanel({ className, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className={cn(
        "overflow-hidden text-xs leading-5 text-ink-faint",
        "h-[var(--accordion-panel-height)] transition-[height] duration-200 ease-[var(--ease-out)]",
        "data-[starting-style]:h-0 data-[ending-style]:h-0",
        className,
      )}
      {...props}
    />
  )
}
```

Por qué funciona: Base UI escribe `--accordion-panel-height` con la altura medida
del panel (`AccordionPanel.js`, `AccordionPanelCssVars.accordionPanelHeight`), y
marca `data-starting-style` / `data-ending-style` en los extremos, así que el
`height` transiciona desde 0 y vuelve a 0 al cerrar. `overflow-hidden` ya está.

## Repo conventions to follow

- El estado de Base UI se consume con variantes `data-[...]:` dentro de `cn(...)`,
  igual que `components/ui/accordion.tsx:24` (`data-[panel-open]:text-ink`).
- La curva sale del token `--ease-out` de `plans/001-motion-tokens.md`.

## Steps

1. Reemplazar la función `AccordionPanel` completa por el target.
2. No tocar `Accordion`, `AccordionItem`, `AccordionHeader` ni `AccordionTrigger`.

## Boundaries

- No tocar `components/meter-center-card.tsx` (el consumidor está bien).
- No agregar `keepMounted` ni `hiddenUntilFound`.
- No animar `margin` ni `padding`; solo `height`.
- Si el código no coincide con el excerpt (drift desde `ffa90a2`), STOP y reportar.

## Verification

- **Mechanical**: `pnpm typecheck` → sin errores. En `components/ui/accordion.tsx`
  aparece `--accordion-panel-height` una vez.
- **Feel check**: en la card del cuarto de contadores, abrir y cerrar
  "Requisitos del cuarto" con DevTools → Animations al 10%:
  - el panel crece desde 0 hasta su altura real en 200ms, sin salto;
  - cerrar retrae a 0 sin que el layout pegue un brinco;
  - abrir/cerrar rápido 5 veces seguidas: la altura retargetea desde donde está,
    nunca reinicia desde 0 ya abierto.
  - `prefers-reduced-motion: reduce`: abrir y cerrar debe ser instantáneo y
    legible (sin altura intermedia).
- **Done when**: el acordeón no salta y el contenido de arriba no se desplaza a
  los golpes.
