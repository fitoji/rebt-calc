# 007 — Abrir y cerrar el índice de la guía sin salto

- **Status**: TODO
- **Commit**: 2ba0d27
- **Severity**: LOW
- **Category**: Missed opportunities — preventing a jarring change
- **Estimated scope**: 2 archivos (`components/help-doc.tsx` 1 clase, `app/globals.css` ~20 líneas)

## Problem

En la página `/ayuda`, el índice mobile es un `<details>` nativo: al tocar
`summary`, el contenido aparece y desaparece de golpe, sin puente entre los dos
estados. Es el único `<details>` del repositorio (verificado con búsqueda en
`components/`, `app/` y `lib/`), así que no hay que generalizar.

```tsx
// components/help-doc.tsx:160-163 — current
<details className="mt-8 rounded-card border border-line bg-paper p-4 lg:hidden">
  <summary className="cursor-pointer text-sm font-semibold text-ink">Índice de la guía</summary>
  <nav aria-label="Índice de la guía" className="mt-4"><Toc /></nav>
</details>
```

La página se monta en `app/ayuda/page.tsx` con `<HelpDoc />`. El índice es de
una sola lista (`Toc`, `components/help-doc.tsx:117-134`) que empuja el resto de
la guía hacia abajo al abrirse: sin transición, ese desplazamiento es un salto.

Frecuencia: rara vez (guía de uso, solo viewport `< lg`, normalmente la primera
vez que se consulta). Propósito: **evitar un cambio abrupto**, no deleite — por
eso la animación es corta y no rebota. La semántica nativa de
`<details>/<summary>` (teclado, lectores de pantalla) se conserva: no se agrega
JS ni `aria-expanded`.

## Target

Interpolar la altura intrínseca del slot de contenido con CSS puro, usando los
tokens del proyecto y limitando el opt-in a este componente.

```css
/* app/globals.css — nuevo bloque, insertar antes de @keyframes blob-drift-a */
.help-toc {
  interpolate-size: allow-keywords;
}

.help-toc::details-content {
  block-size: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    block-size var(--dur-base) var(--ease-out),
    opacity var(--dur-base) linear,
    content-visibility var(--dur-base) allow-discrete;
}

.help-toc[open]::details-content {
  block-size: auto;
  opacity: 1;
}
```

```css
/* app/globals.css:1097-1100 — ampliar la lista existente de reduced-motion */
  .tab-indicator,
  .tab-dot,
  .tab-trigger,
  .help-toc::details-content {
    transition-duration: 1ms;
  }
```

```tsx
// components/help-doc.tsx:160 — único cambio en TSX
<details className="help-toc mt-8 rounded-card border border-line bg-paper p-4 lg:hidden">
```

Valores exactos y por qué:
- `--dur-base: 200ms` y `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (definidos
  en `app/globals.css:332-337`). 200ms está dentro del presupuesto de
  dropdowns/selects (150–250ms) y es lo que el proyecto ya usa para el
  acordeón. `block-size` entra con `ease-out`; `opacity` con `linear`, igual
  que `.tab-dot` (`app/globals.css:1024-1025`).
- `content-visibility ... allow-discrete` mantiene el contenido visible durante
  el cierre; sin eso, el texto desaparece antes de que la altura termine de
  contraerse.
- `interpolate-size: allow-keywords` se pone en `.help-toc`, no en `:root`: la
  propiedad es heredable y así el cambio de comportamiento queda confinado a
  este desplegable. Es obligatorio para que `block-size: 0` → `auto` pueda
  interpolarse (por defecto es `numeric-only`).
- `block-size` es la excepción documentada de "preferir transform/opacity":
  aquí no hay una transformación equivalente para un disclosure de altura
  desconocida. No se usa `max-height` falsa ni media queries de tamaño.
- En reduced-motion se conserva el estado abierto/cerrado y se colapsa la
  transición a `1ms`, igual que `[data-slot='accordion-panel']`
  (`app/globals.css:1120-1122`). No se usa `transition: none`.

Mezcla idiomática: `interpolate-size`, `block-size` y `::details-content` son
características de disponibilidad limitada. En navegadores que no las soportan
la regla se ignora y el `<details>` sigue abriendo al instante, que es el
comportamiento actual. Es degradación aceptable, no un bloqueante.

## Repo conventions to follow

- Tokens de movimiento en `app/globals.css:332-337`
  (`--ease-out`, `--ease-in-out`, `--ease-pop`, `--dur-fast`, `--dur-base`,
  `--dur-slow`). No definir duraciones ni curvas nuevas.
- Ejemplar de acordeón con altura animada: `components/ui/accordion.tsx:41-42`
  usa `h-[var(--accordion-panel-height)] transition-[height] duration-200
  ease-[var(--ease-out)]` con estados `data-[starting-style]:h-0` y
  `data-[ending-style]:h-0`. Este plan logra lo mismo sin JS, porque el
  `<details>` ya gestiona su propio estado.
- Ejemplar de estado por atributo en CSS global: `app/globals.css:1014-1036`
  (`.tab-trigger[data-active]`). Aquí el estado es `[open]`.
- Ejemplar de reduced-motion: `app/globals.css:1091-1123`, un selector por
  animación con `transition-duration: 1ms`.
- Los comentarios de `app/globals.css` están en español: mantener el idioma del
  archivo en el comentario nuevo.
- No hay librería de animación en el proyecto: CSS nativo, sin dependencias.

## Steps

1. `components/help-doc.tsx:160`: agregar `help-toc` como primera clase del
   `<details>`, sin quitar ni reordenar las existentes. No tocar `summary`,
   `nav` ni `Toc`.
2. `app/globals.css`: insertar el bloque `.help-toc` / `.help-toc::details-content`
   del **Target** inmediatamente antes de `@keyframes blob-drift-a` (línea 1056
   en el commit stamp). Si el plan 006 ya aplicó sus reglas
   `[data-drag-preview]` en esa misma zona, insertar después de ellas.
3. `app/globals.css:1097`: agregar `.help-toc::details-content` a la lista de
   selectores del bloque `@media (prefers-reduced-motion: reduce)`. No tocar
   las demás reglas del bloque.
4. No modificar `app/ayuda/page.tsx`, `components/ui/accordion.tsx` ni otro
   componente: el `<details>` nativo ya expone `[open]`.

## Boundaries

- No reemplazar el `<details>/<summary>` por un componente React, no agregar
  `useState`, `useEffect`, `aria-expanded` ni `onClick`: la semántica nativa ya
  funciona y este plan es solo presentación.
- No poner `interpolate-size: allow-keywords` en `:root`: el alcance es
  `.help-toc` y sus descendientes.
- No animar el `<details>` completo ni el `<summary>`: solo el slot
  `::details-content`. El padding `p-4` y el borde del contenedor quedan fijos.
- No tocar la lógica del drag (`components/interior-panel.tsx`) ni las reglas
  `[data-drag-preview]` del plan 006, salvo por el orden de inserción.
- No modificar tokens ni agregar dependencias.
- No tocar otros planes de `plans/`.
- Si el código encontrado no coincide con los excerpts (deriva posterior a
  `2ba0d27`), DETENERSE y reportar en lugar de improvisar.

## Verification

- **Mechanical**: `pnpm typecheck`, `pnpm test` (esperado: 785 pass, 0 fail) y
  `pnpm build` (Next 16.4.6, debe compilar y prerenderizar las 5 rutas,
  incluida `/ayuda`).
- **Feel check**: `pnpm dev`, abrir `/ayuda` con viewport `< 1024px` (el índice
  lleva `lg:hidden`):
  - Al tocar «Índice de la guía», la lista se revela con altura creciente en
    ~200ms con `cubic-bezier(0.23, 1, 0.32, 1)` y un fade suave; el texto debajo
    se desplaza con ella, sin salto.
  - Al volver a tocar, el contenido permanece visible mientras la altura se
    contrae: no desaparece de golpe antes del final (ahí entra
    `content-visibility ... allow-discrete`).
  - Teclado: Tab hasta el `summary`, Enter y Space abren/cierran igual que
    antes; el foco no se pierde.
  - En DevTools → Animations, playback al 10%: `block-size` interpone de `0` a
    `auto`; no aparece animación sobre `padding`, `border` ni `transform`.
  - En DevTools → Rendering, activar `prefers-reduced-motion: reduce`: el
    índice sigue abriéndose y cerrándose, pero la transición pasa a 1ms.
  - En un navegador sin `::details-content` / `interpolate-size`, el índice
    sigue abriéndose al instante: verificar que no queda oculto ni roto.
- **Done when**: la clase `help-toc` está en el `<details>`, las tres reglas CSS
  están en `app/globals.css`, los tres comandos mecánicos pasan y el feel check
  confirma apertura/cierre interpolados, cierre sin desaparición prematura,
  teclado intacto y reduced-motion respetado.
