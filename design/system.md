# Design system — Electro-cálculos (REBT)

Extraído de `app/globals.css`, `app/layout.tsx` y `components/ui/*`. Solo valores presentes en las fuentes.
La app declara la paleta **cuatro veces**: `:root`/`.dark` (oklch) y los bloques `html[data-explanation-mode="calculation"|"didactic"]`, que sobrescriben con valores legacy. `app/layout.tsx:49` fija `data-explanation-mode="calculation"` siempre, así que **el modo por defecto es `calculation`** y los hex de este documento son los que se ven.

## Color — modo `calculation` (por defecto)

### Superficies
| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--surface-page` | `#f5f6f8` | fondo de la app | `app/globals.css:598` |
| `--paper` | `#ffffff` | tarjetas, paneles, barra de tabs | `:597` |
| `--surface-muted` | `#f3f4f6` | pozos, métricas secundarias | `:599` |
| `--line` | `#e5e7eb` | bordes de tarjeta y separadores | `:600` |
| `--line-soft` | `#eeeeee` | separadores internos de tabla | `:601` |

### Tinta
| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--ink` | `#111827` | texto principal y títulos | `:602` |
| `--ink-strong` | `#111827` | títulos fuertes / tab activa | `:603` |
| `--ink-soft` | `#111827` | subtítulos de sección | `:604` |
| `--ink-muted` | `#68707d` | texto de apoyo | `:605` |
| `--ink-subtle` | `#68707d` | párrafos de la intro | `:606` |
| `--ink-faint` | `#5f6673` | eyebrows, hints, labels | `:607` |
| `--ink-ghost` | `#6b7280` | texto deshabilitado | `:608` |

### Marca
| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--brand` | `#527575` | teal de marca: iconos, acentos, links | `:609` |
| `--brand-strong` | `#527575` | hover de marca | `:610` |
| `--brand-ink` | `#111827` | texto sobre `brand-soft` | `:611` |
| `--brand-soft` | `#eeeeee` | chips y fondos suaves de marca | `:612` |
| `--brand-line` | `#d87943` | borde de acento cálido | `:613` |
| `--brand-mark` | `#d87943` | punto de la tab «Previsión de cargas» | `:614` |
| `--brand-on-panel` | `#e78a53` | cifras y barras dentro del panel oscuro | `:615` |

### Acción
| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--primary` | `#d87943` | único botón primario (naranja) | `:583` |
| `--primary-hover` | `#bd6533` | hover del primario | `:585` |
| `--primary-foreground` | `#ffffff` | texto del primario | `:584` |
| `--danger` | `#b91c1c` | acción destructiva (Limpiar) | `:625` |

### Panel de resultado (oscuro)
| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--panel` | `#111827` | fondo del panel de resultado | `:616` |
| `--panel-foreground` | `#c1c1c1` | texto del panel | `:617` |
| `--panel-muted` | `#888888` | labels P1–P5 | `:618` |
| `--panel-line` | `#222222` | separadores y pista de las barras | `:619` |
| `--panel-edge` | `#333333` | pozo del aviso «sin cargas» | `:620` |

### Acentos por pestaña
| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--tab-lga` | `#527575` | punto y acento de LGA | `:628` |
| `--tab-di` | `#d87943` | punto y acento de DI y Cuadros | `:631` |
| `--tab-esquema` | `oklch(72% 0.15 70)` | punto ámbar de Esquema (no se sobrescribe en `calculation`) | `:244` |

### Tablas normativas
| Token | Valor | Fuente |
| --- | --- | --- |
| `--table-cs-head` | `#0b4f82` | `:145` |
| `--table-cs-row-odd` / `-even` | `#d6e8fc` / `#ecf5fe` | `:147,148` |
| `--table-ita-head` | `#2563eb` | `:138` |

### Modo `.dark` (mismos roles, otra escala)
`--surface-page #0c0d0e` `:674`, `--paper #121212` `:673`, `--surface-muted #222222` `:675`, `--line #222222` `:676`, `--ink #c1c1c1` `:678`, `--ink-muted #888888` `:681`, `--brand #5f8787` `:685`, `--primary #e78a53` `:659`, `--panel #121212` `:692`, `--tab-lga #5f8787` `:704`, `--tab-di #e78a53` `:707`.

## Tipografía
| Rol | Valor | Fuente |
| --- | --- | --- |
| `--font-sans` en `calculation` | `var(--font-geist-mono)` → **todo el texto es monoespaciado** | `:646` |
| `--font-mono` en `calculation` | `var(--font-jetbrains-mono)` | `:647` |
| `--font-sans` en `didactic` | `var(--font-dm-sans)`, `--font-mono: var(--font-space-mono)` | `:482-483` |
| Cifras | `tabular-nums` en toda cifra alineada | `components/load-calculator.tsx:1246` |
| Eyebrow | `text-xs font-semibold uppercase tracking-[0.2em]` | `load-calculator.tsx:1246` |
| Título de sección | `h3` `font-bold`, chip `P#` en `font-mono text-[11px] tracking-[0.08em]` | `load-calculator.tsx:1413` |

Sin `@font-face`: las fuentes llegan por `next/font` (`app/layout.tsx:6-9`). Los mockups estáticos usan la pila de sistema `ui-monospace, SFMono-Regular, Menlo, monospace` como sustituto honesto de Geist Mono.

## Espaciado
Sin tokens propios: escala de Tailwind por defecto (4 px base). Patrones observados: `p-5` (20 px) en tarjetas, `p-6` (24 px) en el panel de resultado, `gap-6` (24 px) entre columnas, `gap-3` (12 px) entre filas de un grupo.

## Radio
| Token | `calculation` | `didactic` | Fuente |
| --- | --- | --- | --- |
| `--radius-tab` | `4px` | `6px` | `:635` / `:464` |
| `--radius-tab-track` | `8px` (= tab + 4) | `10px` | `:273` |
| `--radius-control` | `5px` | `8px` | `:636` / `:465` |
| `--radius-card` | `8px` | `12px` | `:637` / `:466` |
| `--radius-panel` | `10px` | `14px` | `:638` / `:467` |

## Sombras
| Token | `calculation` | Fuente |
| --- | --- | --- |
| `--card-lift` | `0 1px 0 ink@13%, 0 3px 7px -5px ink@32%` | `:285-288` |
| `--panel-lift` | `0 1px 0 ink@14%, 0 26px 40px -24px ink@60%` | `:289-292` |
| `--control-lift` | inset `0 1px 2px ink@12%` + inset `0 -1px 0 paper@80%` | `:293-294` |

## Componentes
- **`.tab-bar`** `app/globals.css:900-904`: `--tab-accent: var(--brand-mark)`, `--tab-accent-ink: var(--ink-strong)`, `box-shadow: var(--card-lift)`. Acento por pestaña: `[data-active-tab='lga'|'di'|'esquema']` reescribe `--tab-accent` (`:906,910,914`).
- **`.tab-indicator`** `:918-937`: `border-radius: var(--radius-tab)`, fondo `color-mix(in oklab, accent 18%, paper)`, `inset 0 0 0 1px color-mix(accent 46%, transparent)`, transición 320 ms `cubic-bezier(0.16,1,0.3,1)`. Geometría por JS (`--active-tab-width/height/left/top`): un mockup estático debe fijarla.
- **`.tab-trigger`** `:939-957`: `color: var(--ink-muted)`, hover `ink` + `--control-hover`, activo `--tab-accent-ink`.
- **`.tab-dot`** `:959-974`: `opacity .55`; activo `scale 1`, inactivo `scale .72`.
- **Botón** `components/ui/button.tsx:6`: `rounded-control text-sm font-medium`, foco `ring-3`, activo `translate-y-px`; `default` = `bg-primary`, `outline` = `border-border bg-background`, `ghost` = hover suave; alturas `h-8` / `lg h-9` / `icon size-8`.
- **Tarjeta** `load-calculator.tsx:1205,1241`: `rounded-card border border-line bg-paper p-5 shadow-card`. Clickable: `hover:border-brand-line hover:bg-brand-soft/40`.
- **Panel de resultado** `:1246-1253`: `rounded-panel bg-panel p-6 shadow-panel`; cifra `text-4xl font-bold tabular-nums`; barras `h-1 rounded-full bg-panel-line` con relleno `bg-brand-on-panel/80`.
- **Metric** `:1414`: `rounded-control p-3`, `bg-surface-muted` o `bg-brand-soft` si es acento; label `text-xs text-ink-faint`; valor `font-bold tabular-nums`.
- **Card-heading dot** `line-modules.tsx:614`: `size-2 rounded-full` en el acento de la tab.
- **Fondo blueprint** `:801-828`: rejilla de 120 px mayores (`brand 22%`) y 24 px menores (`ink 7%`), con máscara vertical; solo en `calculation`. `main` necesita `isolation: isolate`.

## Movimiento
`.tab-panel[data-dir]` entra con `translate3d(±16px, 8px, 0)` en 300 ms `cubic-bezier(0.16,1,0.3,1)` (`:1019-1026`). Con `prefers-reduced-motion: reduce` se anulan las animaciones y las transiciones de tabs bajan a 1 ms (`:1041-1051`).
