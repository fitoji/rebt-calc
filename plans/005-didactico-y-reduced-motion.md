# 005 — Personalidad didáctica, blobs y cobertura de reduced-motion

- **Status**: DONE
- **Commit**: ffa90a2
- **Severity**: MEDIUM
- **Category**: Accessibility (6) + Cohesion (7) + Missed opportunities (8)
- **Estimated scope**: 3 files, ~45 líneas

## Problem

Tres cosas sueltas del mismo tema: el modo didáctico no tiene personalidad
propia más allá de las blobs, esas blobs cuestan de más, y el `prefers-reduced-motion`
solo cubre las clases propias (los `animate-in` de `tw-animate-css` siguen
moviendo).

Código actual:

```css
/* app/globals.css:896-900 — will-change permanente, incluso en modo cálculo */
    opacity: 0;
    transition: opacity 620ms ease;
    will-change: transform;
  }

/* app/globals.css:914-917 */
  html[data-explanation-mode='didactic'] .mode-shell .mode-blob {
    opacity: 1;
    animation: var(--blob-drift) var(--blob-speed, 34s) ease-in-out infinite alternate;
  }

/* app/globals.css:1039-1041 */
  .step-reveal {
    animation: step-reveal 340ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

/* app/globals.css:1092-1105 */
@media (prefers-reduced-motion: reduce) {
  .mode-blob,
  .tab-panel[data-dir],
  .step-reveal {
    animation: none;
  }

  .tab-indicator,
  .tab-dot,
  .tab-trigger {
    transition-duration: 1ms;
  }
}
```

```tsx
// components/calculation-steps.tsx:33-37
          <article
            key={step.id}
            className="step-reveal border-b border-line py-4 last:border-b-0"
            style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
          >
```

```tsx
// components/calculation-steps.tsx:72
                        <tr key={row.section} className={row.status === 'chosen' ? 'font-semibold text-ink-strong' : 'text-ink-subtle'}>
```

```tsx
// components/load-calculator.tsx:309-319
  const toggleTheme = () => {
    const next = nextTheme(theme)
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next) } catch { /* keep the choice in memory */ }
  }
  const changeExplanationMode = (next: ExplanationMode) => {
    setExplanationMode(next)
    document.documentElement.dataset.explanationMode = next
    try { window.localStorage.setItem(EXPLANATION_MODE_STORAGE_KEY, next) } catch { /* keep the choice in memory */ }
  }
```

## Target

### a) Blobs: el costo solo cuando se ven

```css
/* target — .mode-blob: borrar la línea `will-change: transform;` */

/* target — regla didáctica, con el will-change adentro */
  html[data-explanation-mode='didactic'] .mode-shell .mode-blob {
    opacity: 1;
    will-change: transform;
    animation: var(--blob-drift) var(--blob-speed, 34s) ease-in-out infinite alternate;
  }
```

### b) Pasos: más cortos y con el rebote del modo didáctico

```css
/* target */
  .step-reveal {
    animation: step-reveal var(--dur-slow) var(--ease-pop) both;
  }
```

`--ease-pop` vale `--ease-out` en cálculo y el back-out en didáctico (plan 001),
así que el mismo CSS sirve para los dos modos sin condicionales.

```tsx
// target — components/calculation-steps.tsx:36
            style={{ animationDelay: `${Math.min(index, 3) * 40}ms` }}
```

### c) Fila adoptada: tinte sin movimiento (solo didáctico)

```tsx
// target — components/calculation-steps.tsx:72
                        <tr key={row.section} className={row.status === 'chosen' ? 'step-chosen font-semibold text-ink-strong' : 'text-ink-subtle'}>
```

```css
/* target — dentro de @layer components, después de .step-reveal */
  /*
   * Didáctico: la sección adoptada queda teñida para que el ojo encuentre el
   * resultado del cálculo sin que nada se mueva.
   */
  html[data-explanation-mode='didactic'] .step-chosen {
    background-color: color-mix(in oklab, var(--brand) 12%, transparent);
  }
```

### d) Reduced motion: cubrir también las animaciones de terceros

```css
/* target — dentro del @media (prefers-reduced-motion: reduce) existente */
  /*
   * tw-animate-css: se conserva el fade, se elimina el desplazamiento y el zoom.
   * Los custom properties son `inherits: false`, por eso se aplican a todo nodo.
   */
  *,
  ::before,
  ::after {
    --tw-enter-translate-x: 0;
    --tw-enter-translate-y: 0;
    --tw-enter-scale: 1;
    --tw-enter-rotate: 0;
    --tw-exit-translate-x: 0;
    --tw-exit-translate-y: 0;
    --tw-exit-scale: 1;
    --tw-exit-rotate: 0;
  }

  [data-slot='accordion-panel'] {
    transition-duration: 1ms;
  }
```

### e) Cambio de tema y de modo con View Transition

```tsx
// target — components/load-calculator.tsx, a nivel de módulo (después de los imports)
import { flushSync } from 'react-dom'

/*
 * El cambio de tema y de modo repinta toda la paleta. La View Transition cruza
 * el antes y el después en 300ms en vez de teleportar los colores. Si el
 * navegador no la soporta o el sistema pide menos movimiento, se aplica directo.
 */
type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

function withViewTransition(update: () => void) {
  const doc = document as ViewTransitionDocument
  if (typeof doc.startViewTransition !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }
  doc.startViewTransition(() => { flushSync(update) })
}
```

```tsx
// target — reemplazar los dos handlers
  const toggleTheme = () => {
    const next = nextTheme(theme)
    withViewTransition(() => {
      setTheme(next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      try { window.localStorage.setItem(THEME_STORAGE_KEY, next) } catch { /* keep the choice in memory */ }
    })
  }
  const changeExplanationMode = (next: ExplanationMode) => {
    withViewTransition(() => {
      setExplanationMode(next)
      document.documentElement.dataset.explanationMode = next
      try { window.localStorage.setItem(EXPLANATION_MODE_STORAGE_KEY, next) } catch { /* keep the choice in memory */ }
    })
  }
```

```css
/* target — al final de app/globals.css */
/*
 * Cambio de tema y de modo: el snapshot del documento se cruza en 300ms.
 * Lo dispara el JS solo si la API existe y el sistema no pide menos movimiento.
 */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
  animation-timing-function: cubic-bezier(0.77, 0, 0.175, 1);
}
```

## Repo conventions to follow

- El modo se declara con `html[data-explanation-mode='didactic']` (`app/globals.css:457`):
  el motion didáctico se gatea con el mismo selector, sin estado nuevo de React.
- Los colores derivados se escriben con `color-mix(in oklab, …)`, como el resto
  del archivo (`--control-hover`, `--card-lift`).

## Steps

1. `app/globals.css`: borrar `will-change: transform;` de `.mode-blob` y agregarlo
   a la regla didáctica de blobs.
2. `app/globals.css`: reemplazar `.step-reveal` por el target.
3. `app/globals.css`: agregar la regla `.step-chosen` después de `.step-reveal`.
4. `app/globals.css`: dentro del `@media (prefers-reduced-motion: reduce)`,
   borrar `.tab-panel[data-dir]` si todavía está, y agregar el bloque de variables
   `--tw-*` más el `[data-slot='accordion-panel']`.
5. `app/globals.css`: agregar las reglas `::view-transition-*` al final del archivo.
6. `components/calculation-steps.tsx:36`: cambiar el stagger a `Math.min(index, 3) * 40`.
7. `components/calculation-steps.tsx:72`: agregar `step-chosen` a la fila adoptada.
8. `components/load-calculator.tsx`: agregar `import { flushSync } from 'react-dom'`,
   el helper `withViewTransition` a nivel de módulo, y envolver los dos handlers.

## Boundaries

- No tocar `--blob-drift`, `--blob-speed`, posiciones ni colores de las blobs:
  el movimiento de fondo es una decisión de diseño documentada en el archivo.
- No cambiar keyframes (`blob-drift-*`, `step-reveal`).
- No animar el resultado numérico ni agregar count-up, confetti ni texto letra
  por letra.
- No agregar dependencias.
- Si el código no coincide con los excerpts (drift desde `ffa90a2`), STOP y reportar.

## Verification

- **Mechanical**: `pnpm typecheck` → sin errores.
  `grep -n "will-change" app/globals.css` → una sola aparición, dentro de la regla
  didáctica. `grep -n "view-transition" app/globals.css` → dos selectores.
- **Feel check**:
  - Modo cálculo: el paso del desarrollo del cálculo entra en 240ms sin rebote.
  - Modo didáctico: los pasos entran con un rebote corto y la fila adoptada de la
    tabla de secciones queda teñida, sin movimiento.
  - Cambiar tema: la paleta se cruza en 300ms; abrir DevTools → Animations y
    confirmar que la transición se llama `::view-transition` y dura 300ms.
  - Rendering → `prefers-reduced-motion: reduce`: cambiar tema es instantáneo,
    los diálogos hacen fade sin zoom y el acordeón abre sin animar altura.
  - En la vista de cálculo (sin blobs visibles) DevTools → Layers: no deben
    quedar capas promovidas por `.mode-blob`.
- **Done when**: el modo didáctico tiene rebote en 2 superficies (pasos y fila
  adoptada), no hay `will-change` fuera de didáctico y reduced-motion cubre los
  overlays de terceros.
