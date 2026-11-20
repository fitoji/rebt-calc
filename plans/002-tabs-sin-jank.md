# 002 — Cambio de pestaña sin jank y sin animación redundante

- **Status**: TODO
- **Commit**: ffa90a2
- **Severity**: HIGH
- **Category**: Purpose & frequency (1) + Performance (5)
- **Estimated scope**: 2 files, ~30 lines

## Problem

El cambio de pestaña es la navegación principal (decenas de veces por día) y hoy
hace dos cosas caras a la vez:

1. Base UI desmonta y monta el panel entero (`keepMounted = false`,
   `node_modules/@base-ui/react/esm/tabs/panel/TabsPanel.js:31`). Cada panel es
   enorme: `components/interior-panel.tsx` tiene 1008 líneas, `line-modules.tsx`
   928.
2. Al mismo tiempo corre una entrada de 300ms con `translate3d(16px, 8px)` en el
   panel recién montado, más el indicador animando `width`/`height` (propiedades
   de layout) y `box-shadow` (repintado).

Los primeros frames de la animación se pierden en el montaje, el panel entra a
los saltos y el cambio se siente lento. Además la entrada del contenido es
redundante: el indicador ya cuenta la historia espacial.

Código actual:

```css
/* app/globals.css:1027-1041 */
  .tab-panel[data-dir='forward'] {
    animation: tab-panel-forward 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .tab-panel[data-dir='back'] {
    animation: tab-panel-back 300ms cubic-bezier(0.16, 1, 0.3, 1);
  }
```

```css
/* app/globals.css:983-989 — .tab-indicator */
    transition:
      translate 320ms cubic-bezier(0.16, 1, 0.3, 1),
      width 320ms cubic-bezier(0.16, 1, 0.3, 1),
      height 320ms cubic-bezier(0.16, 1, 0.3, 1),
      background-color 220ms linear,
      box-shadow 220ms linear;
```

```tsx
// components/load-calculator.tsx:283
  const [tabDirection, setTabDirection] = useState<'forward' | 'back'>('forward')

// components/load-calculator.tsx:320-324
  // El panel entra desde el lado hacia el que viaja el indicador.
  const changeTab = (next: TabValue) => {
    setTabDirection(TAB_ORDER.indexOf(next) >= TAB_ORDER.indexOf(activeTab) ? 'forward' : 'back')
    setActiveTab(next)
  }
```

## Target

- **Se elimina** la entrada del panel (decisión deliberada: navegación de alta
  frecuencia; la animación más fuerte suele ser la que se borra). El contenido
  aparece ya, y el indicador hace el trabajo espacial.
- El indicador baja a 240ms (`--dur-slow`) con `--ease-out`, y deja de animar
  `box-shadow` (cada frame repintaba el contorno).

```css
/* target — .tab-indicator */
    transition:
      translate var(--dur-slow) var(--ease-out),
      width var(--dur-slow) var(--ease-out),
      height var(--dur-slow) var(--ease-out),
      background-color var(--dur-base) linear;
```

Se conserva la propiedad `box-shadow` estática de `.tab-indicator`; solo sale de
la lista de `transition`.

```css
/* target — .tab-dot */
  .tab-dot {
    transition:
      scale var(--dur-base) var(--ease-out),
      opacity var(--dur-base) linear;
    opacity: 0.55;
  }
```

## Repo conventions to follow

- Los comentarios del archivo explican el *porqué* de cada decisión de diseño; el
  bloque que se borra tiene su comentario, así que el reemplazo deja constancia
  de por qué el panel ya no anima.
- Tokens de `plans/001-motion-tokens.md` (`--dur-slow`, `--dur-base`, `--ease-out`).

## Steps

1. En `app/globals.css`, reemplazar el bloque `transition:` de `.tab-indicator`
   por el target de arriba.
2. En `app/globals.css`, reemplazar las dos declaraciones `transition` de
   `.tab-dot` por el target de arriba.
3. En `app/globals.css`, borrar el comentario y las dos reglas
   `.tab-panel[data-dir='forward']` / `[data-dir='back']` (líneas 1027-1041).
4. En `app/globals.css`, borrar `@keyframes tab-panel-forward` y
   `@keyframes tab-panel-back` (líneas 1071-1083).
5. En `app/globals.css`, dentro de `@media (prefers-reduced-motion: reduce)`,
   quitar `.tab-panel[data-dir]` de la lista de selectores que anulan animación.
6. En `components/load-calculator.tsx`, borrar la línea 283 completa
   (`const [tabDirection, setTabDirection] = ...`).
7. En `components/load-calculator.tsx`, borrar el bloque `changeTab` con su
   comentario (líneas 320-324).
8. En `components/load-calculator.tsx`, reemplazar los **tres** call sites de
   `changeTab` por `setActiveTab` (son tres, no uno):
   - `:1360` `onValueChange={value => changeTab(value as TabValue)}` →
     `onValueChange={value => setActiveTab(value as TabValue)}`
   - `:1503` `onEditPower={() => changeTab('cargas')}` →
     `onEditPower={() => setActiveTab('cargas')}`
   - `:1517` `onOpenDerivations={() => changeTab('di')}` →
     `onOpenDerivations={() => setActiveTab('di')}`
   La equivalencia es exacta: al desaparecer la animación del panel,
   `tabDirection` no tiene ningún consumidor, así que `changeTab` solo reenviaba
   `setActiveTab(next)`.
9. En `components/load-calculator.tsx`, borrar ` data-dir={tabDirection}` de las
   6 apariciones en `<TabsContent ...>` (líneas 1384, 1440, 1446, 1505, 1511,
   1520). Dejar el resto de los atributos igual.

## Boundaries

- No tocar el resto de la barra de tabs (`TabsList`, `TabsTrigger`, `TabsIndicator`).
- No cambiar `TAB_ORDER` ni el tipo `TabValue` (siguen en uso).
- No agregar `keepMounted`: montar los seis paneles a la vez empeoraría cada
  tecla (todos se re-renderizan). El panel sigue desmontándose.
- No agregar dependencias.
- Si el código no coincide con los excerpts (drift desde `ffa90a2`), STOP y reportar.

## Verification

- **Mechanical**: `grep -n "tabDirection\|data-dir" components/load-calculator.tsx`
  → sin resultados. `grep -n "tab-panel" app/globals.css` → sin resultados.
  `pnpm typecheck` → sin errores.
- **Feel check**: con la app corriendo, alternar entre las seis pestañas
  rápidamente 20 veces:
  - el contenido aparece al instante, sin barrido lateral;
  - el indicador viaja en una sola pasada y no se traba a mitad de camino;
  - en DevTools → Performance, grabar 3 cambios de pestaña: no debe haber
    frames largos (> 50ms) durante la animación del indicador.
  - Rendering panel → `prefers-reduced-motion: reduce`: el indicador salta sin
    transición y el contenido igual aparece al instante.
- **Done when**: no queda entrada de panel, el indicador se mueve en 240ms y el
  cambio de pestaña se siente inmediato.
