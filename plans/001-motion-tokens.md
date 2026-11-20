# 001 — Centralizar curvas y duraciones de movimiento

- **Status**: DONE
- **Commit**: ffa90a2
- **Severity**: LOW
- **Category**: Cohesion & tokens (7)
- **Estimated scope**: 1 file, ~25 lines

## Problem

`app/globals.css` repite a mano el mismo bezier `cubic-bezier(0.16, 1, 0.3, 1)` en
seis lugares y no tiene ninguna escala de duración, en una app que sí tokeniza
color, radios y sombras. Cada valor nuevo de movimiento se escribe suelto, así
que el próximo cambio se hace seis veces y a mano.

Ubicaciones actuales (verbatim de `app/globals.css`):

```css
/* app/globals.css:984-986 — .tab-indicator */
      translate 320ms cubic-bezier(0.16, 1, 0.3, 1),
      width 320ms cubic-bezier(0.16, 1, 0.3, 1),
      height 320ms cubic-bezier(0.16, 1, 0.3, 1),

/* app/globals.css:1013 — .tab-dot */
      scale 220ms cubic-bezier(0.16, 1, 0.3, 1),

/* app/globals.css:1032 y 1036 — .tab-panel[data-dir] */
    animation: tab-panel-forward 300ms cubic-bezier(0.16, 1, 0.3, 1);

/* app/globals.css:1040 — .step-reveal */
    animation: step-reveal 340ms cubic-bezier(0.16, 1, 0.3, 1) both;
```

## Target

Tokens en `:root`, consumidos por nombre. Los valores de curva son los del
catálogo de la skill, no aproximaciones:

```css
/* target — al final de `:root`, antes de la llave de cierre */
  /*
   * Movimiento. Un solo juego de curvas y duraciones: los componentes consumen
   * estos nombres, nunca un cubic-bezier suelto.
   */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);      /* entradas y salidas */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);  /* movimiento en pantalla */
  --ease-pop: var(--ease-out);                      /* rebote: solo didáctico */
  --dur-fast: 160ms;                                /* press, hover, color */
  --dur-base: 200ms;                                /* tabs, selects, acordeón */
  --dur-slow: 240ms;                                /* modales, pasos */
```

Y el override de personalidad dentro del bloque didáctico que ya existe:

```css
/* target — dentro de html[data-explanation-mode="didactic"], antes de `font-family` */
  /* Didáctico: misma base, con un rebote corto para los momentos de delight. */
  --ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
```

Todas las apariciones de `cubic-bezier(0.16, 1, 0.3, 1)` pasan a `var(--ease-out)`.

## Repo conventions to follow

- Los tokens de diseño viven en `:root` y se consumen por nombre semántico
  (`--radius-card`, `--card-lift`, `--ink-muted`). El motion sigue la misma regla.
- **No** agregar `--ease-*` ni `--dur-*` a `@theme inline` (`app/globals.css:14`):
  el namespace `--ease-*` de Tailwind ya existe y sobrescribirlo cambiaría el
  significado global de la clase `ease-out`. Estos tokens son CSS puro.

## Steps

1. En `app/globals.css`, dentro de `:root`, insertar el bloque de tokens de
   movimiento justo después de la declaración `--control-lift` (termina en
   `inset 0 -1px 0 color-mix(in oklab, var(--paper) 80%, transparent);`) y antes
   de la llave `}` que cierra `:root`.
2. En el bloque `html[data-explanation-mode="didactic"]` (`app/globals.css:457`),
   insertar `--ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);` antes de
   `--font-sans: var(--font-dm-sans);`.
3. Reemplazar **todas** las apariciones de `cubic-bezier(0.16, 1, 0.3, 1)` por
   `var(--ease-out)`: son 7 en total (líneas 984, 985, 986, 1013, 1032, 1036 y
   1040). Contarlas con el grep de verificación.

## Boundaries

- No cambiar ninguna duración en este plan (`320ms`, `220ms`, `300ms`, `340ms`
  quedan como están; los ajustan los planes 002 y 005).
- No tocar `components/ui/*` ni `components/*.tsx`.
- No agregar dependencias.
- Si el código no coincide con los excerpts (drift desde `ffa90a2`), STOP y reportar.

## Verification

- **Mechanical**: `grep -c "cubic-bezier(0.16, 1, 0.3, 1)" app/globals.css` → `0`.
  `pnpm typecheck` → sin errores.
- **Feel check**: la app se ve **idéntica** a antes (mismas duraciones, curva
  equivalente al 2%). Si algo se mueve distinto, el reemplazo tocó una propiedad
  equivocada.
- **Done when**: existen los 6 tokens, `--ease-pop` está definido en `:root` y
  sobrescrito en didáctico, y no queda ningún bezier suelto en el archivo.
