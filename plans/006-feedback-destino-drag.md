# 006 — Feedback de destino válido en el preview del drag

- **Status**: TODO
- **Commit**: 2ba0d27
- **Severity**: MEDIUM
- **Category**: Missed opportunities — feedback
- **Estimated scope**: 1 archivo (`app/globals.css`), ~14 líneas agregadas; sin cambios en TSX

## Problem

Durante el drag de circuitos hacia un diferencial, el código le pone un atributo
`data-over` a la copia que sigue al puntero, pero **ninguna regla CSS lo
estiliza**. La señal existe en el DOM y no produce ningún efecto visual: el
único indicio de que el destino es válido es el tinte de la fila, que además es
sutil.

```tsx
// components/interior-panel.tsx:393 — current
preview?.el.toggleAttribute('data-over', valid)
```

La copia se crea con `bindDragPreview` y expone `preview.el`; según la doc del
paquete (`@ui-sdk/react/docs/core.md:4796`), la copia lleva `data-drag-preview`
y está pensada justamente para estilizarse por ese medio. La búsqueda de
`data-over` en `components/`, `app/`, `lib/` y en los paquetes `@ui-sdk/*`
devuelve solo los cinco `setAttribute`/`removeAttribute`/`toggleAttribute` de
`components/interior-panel.tsx` (líneas 318, 387, 390, 393 y 399): no hay
ninguna regla que consuma el atributo.

**Corrección al diagnóstico inicial:** la fila destino *no* cambia al instante.
Ya transiciona por el componente compartido:

```tsx
// components/interior-panel.tsx:799 — current
<TableRow key={device.id} data-differential-target={device.id} className={`border-b border-line-soft ${dragOverDevice === device.id ? 'bg-brand-soft' : ''}`}>
```

```tsx
// components/ui/table.tsx:54-64 — current
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}
```

`transition-colors` ya cubre `background-color`, así que agregar otra transición
a la fila sería duplicar y potencialmente pelear con la clase compartida. El
trabajo real está en la copia que sigue al cursor.

Frecuencia: ocasional (configurar los diferenciales de cada vivienda, unas
pocas veces por proyecto). Propósito: **feedback** — confirmar antes de soltar.

## Target

Darle al preview un estado «destino válido» visible, con el mismo token de
duración que el resto del feedback rápido del proyecto.

```css
/* app/globals.css — nuevo bloque, insertar justo antes de @keyframes blob-drift-a */
[data-drag-preview] {
  transition: box-shadow var(--dur-fast) var(--ease-out);
}

[data-drag-preview][data-over] {
  box-shadow: 0 0 0 2px var(--brand-mark);
}
```

```css
/* app/globals.css:1097-1100 — ampliar la lista existente de reduced-motion */
  .tab-indicator,
  .tab-dot,
  .tab-trigger,
  [data-drag-preview] {
    transition-duration: 1ms;
  }
```

Valores exactos, tomados del proyecto y del catálogo de reglas:
`--dur-fast: 160ms` y `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (definidos
en `app/globals.css:332-337`). Presupuesto de press/feedback: 100–160ms.
El anillo `0 0 0 2px` no cambia el layout y sigue el `border-radius` que la copia
ya trae (`rounded-control`). No se usa `scale(0)`, `transition: all` ni colores
arbitrarios.

En reduced-motion se conserva el anillo —es información de estado— y solo se
colapsa la transición a `1ms`, igual que los `.tab-*`.

## Repo conventions to follow

- Los tokens de movimiento viven en `app/globals.css:332-337`
  (`--ease-out`, `--ease-in-out`, `--ease-pop`, `--dur-fast`, `--dur-base`,
  `--dur-slow`). Reutilizarlos; no definir curvas ni duraciones nuevas.
- Ejemplar de estado por atributo + tokens: `app/globals.css:1014-1036`
  (`.tab-trigger[data-active]` y `.tab-dot` con
  `scale var(--dur-base) var(--ease-out), opacity var(--dur-base) linear`).
- Ejemplar de reduced-motion: `app/globals.css:1091-1123`, donde cada animación
  se maneja por separado con `transition-duration: 1ms`.
- Los comentarios de `app/globals.css` están en español: mantener el idioma del
  archivo en el comentario nuevo.
- Los estados del drag viven hoy en CSS global con selectores de atributo, no en
  clases de Tailwind dentro del TSX; seguir ese patrón.

## Steps

1. En `app/globals.css`, insertar las dos reglas del bloque **Target** inmediatamente
   antes de `@keyframes blob-drift-a` (línea 1056 en el commit stamp), con un
   comentario breve en español que explique que el anillo consume el `data-over`
   que ya pone `startCircuitDrag`.
2. En `app/globals.css:1097`, agregar `[data-drag-preview]` a la lista de
   selectores del bloque `@media (prefers-reduced-motion: reduce)` para que la
   transición del anillo quede en `1ms`. No tocar las demás reglas del bloque.
3. No editar `components/interior-panel.tsx`: el `toggleAttribute` de la línea
   393 y el `removeAttribute` de la línea 399 ya hacen lo que hace falta.

## Boundaries

- No agregar `transition` al `TableRow` de `components/interior-panel.tsx:799`:
  `components/ui/table.tsx:59` ya tiene `transition-colors` y el tinte de fila ya
  se interpola.
- No tocar la lógica del drag (`bindDrag`, `bindDragPreview`, umbrales,
  `cancelOnEscape`, asignación en `onEnd`), ni los atributos `data-over` /
  `data-differential-target`.
- No modificar tokens, `app/loading.tsx`, `components/app-loading.tsx` ni
  `components/ui/skeleton.tsx`.
- No agregar dependencias ni clases de Tailwind al TSX; este plan es solo CSS.
- No tocar otros planes de `plans/`.
- Si el código encontrado no coincide con los excerpts (deriva posterior a
  `2ba0d27`), DETENERSE y reportar en lugar de improvisar.

## Verification

- **Mechanical**: `pnpm typecheck`, `pnpm test` (esperado: 785 pass, 0 fail) y
  `pnpm build` (Next 16.4.6, debe compilar y prerenderizar las 5 rutas). Ningún
  cambio de TSX debería alterar el resultado de los tests.
- **Feel check**: `pnpm dev`, abrir la app, ir a la pestaña *Interiores* y, en
  «Diferenciales · protección y agrupación», arrastrar un chip de circuito
  sin asignar:
  - La copia muestra un anillo de 2px en `--brand-mark` **solo** cuando está
    sobre un diferencial válido; al salir, el anillo desaparece.
  - El anillo entra y sale en ~160ms con `cubic-bezier(0.23, 1, 0.32, 1)`;
    al cruzar rápidamente entre filas no reinicia desde cero (es transición,
    no keyframe).
  - El anillo sigue al puntero sin desplazar la tabla ni provocar scroll.
  - El tinte `bg-brand-soft` de la fila destino sigue interpolando como antes:
    no se agregó una segunda transición.
  - En DevTools → Animations, playback al 10%: `box-shadow` interpone de 0 a
    2px; no aparece ninguna animación sobre `width`, `height` ni `transform`.
  - En DevTools → Rendering, activar `prefers-reduced-motion: reduce`: el
    anillo sigue apareciendo (estado legible) pero la transición pasa a 1ms.
- **Done when**: las dos reglas CSS están en `app/globals.css`, los tres comandos
  mecánicos pasan y el feel check confirma el anillo solo sobre destino válido,
  sin layout shift y con reduced-motion respetado.
