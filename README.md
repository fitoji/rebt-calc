# Electro-cálculos · Previsión de cargas (ITC-BT-10)

Calculadora web **open source** para calcular la **previsión de cargas eléctricas** de un edificio en **baja tensión** y dimensionar sus líneas, conforme al **REBT** (Reglamento Electrotécnico de Baja Tensión, España).

Tres módulos en la misma app:

- **Previsión de cargas** — ITC-BT-10, desglose P1–P5 y total del suministro.
- **LGA** — Línea General de Alimentación, ITC-BT-14.
- **DI** — Derivación Individual, ITC-BT-15.

Pensada para instaladores, ingenieros y proyectistas: cargás los datos del proyecto y obtenés potencias y secciones al instante, sin hojas de cálculo frágiles. Todo corre en el navegador: **ningún dato sale del equipo**.

## Índice

- [Quick path](#quick-path)
- [Interfaz](#interfaz)
- [Qué calcula](#qué-calcula)
- [Cálculos](#cálculos)
- [Formatos de exportación](#formatos-de-exportación)
- [Persistencia](#persistencia)
- [Sistema de color](#sistema-de-color)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Desarrollo](#desarrollo)
- [Contribuciones](#contribuciones)
- [Aviso legal](#aviso-legal-y-responsabilidad)
- [Licencia](#licencia)
- [Enlaces](#enlaces)

---

## Quick path

1. Clona e instala las dependencias:

   ```bash
   git clone https://github.com/fitoji/rebt-calc.git
   cd rebt-calc
   pnpm install
   ```

2. Levanta el servidor de desarrollo:

   ```bash
   pnpm dev
   ```

3. Abre [http://localhost:3000](http://localhost:3000). Verás la calculadora cargada con un ejemplo de edificio; edita cualquier campo y el resultado se recalcula en tiempo real.

4. Antes de tocar el motor de cálculo:

   ```bash
   pnpm test     # suite completa (node:test)
   ```

---

## Interfaz

- **Tres pestañas** con identidad de color propia: Previsión de cargas (marca), LGA (verde) y DI (violeta). El color se repite en el borde de las cards y en el punto de la pestaña activa.
- **Cabecera con referencia normativa dinámica**: muestra `ITC-BT-10`, `ITC-BT-14` o `ITC-BT-15` según la pestaña abierta.
- **Panel de resultado** por módulo: en previsión, el total y el desglose P1–P5; en LGA y DI, la sección normalizada, la intensidad y los avisos de incumplimiento.
- **Nota de fuente en cada card**: el apartado del BOE del que sale el criterio, con enlace al texto consolidado. Se puede ocultar desde *Parámetros de cálculo* («Leyendas en el pie de cada card»).
- **Membrete del proyecto**: la card de datos de la memoria muestra en miniatura el logo y el nombre de empresa tal como saldrán en el PDF.
- **Acciones**: cargar el ejemplo, limpiar los datos del proyecto y descargar en cuatro formatos.
- **Modo día/noche**: botón en la cabecera; la preferencia se guarda y se aplica antes del primer pintado, sin parpadeo. El sistema operativo no cambia el tema por su cuenta.
- **Accesibilidad**: diálogos de [Base UI](https://base-ui.com/) con foco atrapado, cierre con `Escape`, etiquetas asociadas a cada control (incluidos los de las tablas) y contraste AA verificado por test.

---

## Qué calcula

La previsión se desglosa en cinco bloques (códigos **P1**–**P5**) y suma el total del suministro:

| Código | Concepto        | Criterio de cálculo                                                                 |
|:------:|-----------------|-------------------------------------------------------------------------------------|
| **P1** | Viviendas       | Potencia media por vivienda × **coeficiente de simultaneidad** (según nº de viviendas). |
| **P2** | Servicios generales | Ascensores ×1,3, motores a valor nominal con un incremento del 25 % sobre el mayor, otras cargas a nominal y **alumbrado de zonas comunes** (15/8 W/m² portal y 7/4 W/m² escalera, ×1,8 en lámparas de descarga). |
| **P3** | Locales y oficinas | Por fila: comercial/oficina (100 W/m², mínimo 3.450 W) o industria (125 W/m², mínimo 10.350 W). Se toma el **mayor** entre previsión real, W/m² y mínimo por abonado. |
| **P4** | Garajes         | Potencia por superficie según ventilación (**forzada** 20 W/m² o **natural** 10 W/m²), con mínimo de 3.450 W por garaje. |
| **P5** | IRVE            | Recarga de vehículos eléctricos: todas las plazas (con o sin SPL) o mínimo 10 %. |
| —      | **TOTAL**       | `P1 + P2 + P3 + P4 + P5`                                                            |

Y para las líneas, cada módulo devuelve:

| Salida | LGA (ITC-BT-14) | DI (ITC-BT-15) |
|--------|-----------------|----------------|
| Intensidad de cálculo `Ib` | trifásica | monofásica |
| Sección por caída de tensión | % máximo configurable | % máximo configurable |
| Sección normalizada adoptada | primera que cumple caída + `Iz` | ídem |
| Intensidad admisible `Iz` | de tabla y corregida por agrupamiento | ídem |
| Protección `In` | serie normalizada, con verificación `Ib ≤ In ≤ Iz` | ídem |
| Neutro y PE | — | prefijados desde la sección de fase y editables |

Valores por defecto de referencia (todos editables desde *Parámetros de cálculo*):

- Electrificación **básica**: 5.750 W · Electrificación **elevada**: 9.200 W
- Locales: mínimo **3.450 W** por abonado · industria **10.350 W** y **125 W/m²**
- Garaje ventilación **forzada**: 20 W/m² · **natural**: 10 W/m²
- Alumbrado: portal **15 W/m²** (incandescencia) / **8 W/m²** (fluorescencia o LED) · escalera **7** / **4 W/m²** · lámparas de descarga **×1,8**
- IRVE: **3.680 W** por plaza
- Conversión CV → W: **735,5 W/CV**

---

## Cálculos

Cada fórmula se implementa una sola vez en `lib/` y la consumen la fila en pantalla, el subtotal, el PDF y los exports. Los valores entre paréntesis son los predeterminados y se editan desde *Parámetros de cálculo*. Cada bloque del formulario cita en su pie el apartado del BOE del que sale el criterio, con enlace al texto consolidado.

### P1 · Viviendas

- `Pmedia = Σ(potencia_i × n_i) / Σ n_i`
- `Cs` sale de la tabla de simultaneidad de la ITC-BT-10 para `n ≤ 21`, o de `15,3 + (n − 21) × 0,5` para `n > 21`.
- `P1 = Pmedia × Cs`

### P2 · Servicios generales

```text
P2 = (Σ ascensores) × 1,3
   + Σ motores
   + (1,25 − 1) × motor de mayor potencia
   + Σ otras cargas
   + alumbrado de zonas comunes
```

- Los motores y las otras cargas entran a valor nominal: la ITC-BT-10 no aplica reducción por simultaneidad a los servicios generales.
- El incremento del 25 % de la ITC-BT-47 se aplica **una sola vez** y solo al motor de mayor potencia.
- Conversión de unidades: `1 CV = 735,5 W`.

#### Alumbrado de zonas comunes

`P base` es la potencia declarada si existe; si no, la superficie por la densidad de la guía ITC-BT-10:

| Fila | Incandescencia | Fluorescencia/LED |
|------|----------------|-------------------|
| Portal y espacios comunes | 15 W/m² | 8 W/m² |
| Caja de escalera | 7 W/m² | 4 W/m² |
| Potencia instalada conocida | solo la potencia declarada | solo la potencia declarada |

`P prevista = P base × 1,8` cuando la lámpara es de descarga (fluorescencia/LED); en incandescencia el factor es 1.

Ejemplo cargado: ascensor 3.680 W → 4.784 W; motor de 1 CV (735,5 W) más 183,9 W de incremento; alumbrado conocido de 1.500 W → 2.700 W. `P2 = 8.403 W`.

### P3 · Locales, oficinas e industrias

`P prevista = max(previsión real, superficie × densidad, mínimo por abonado)`

| Tipo | Densidad | Mínimo por abonado |
|------|----------|--------------------|
| Comercial/oficina | 100 W/m² | 3.450 W |
| Industria | 125 W/m² | 10.350 W |

El tipo se elige por fila, así que un mismo edificio puede sumar locales comerciales y una concentración industrial (varias naves) en el mismo bloque. Una fila sin superficie ni previsión real aporta 0.

### P4 · Garajes

`P prevista = max(superficie × densidad, 3.450 W)`

- Ventilación forzada: 20 W/m² · natural: 10 W/m².
- Una fila sin superficie aporta 0.

### P5 · IRVE

`P5 = plazas consideradas × 3.680 W × Cs`

- `Cs = 1` sin SPL · `Cs = 0,3` con SPL.
- Con la opción de mínimo 10 % se consideran `⌈plazas × 0,1⌉` plazas (al menos una).
- El 10 % de las plazas es el mínimo legal (ITC-BT-10 §5.2); las opciones «todas las plazas» son una previsión ampliada.

### Total del suministro

`Total = P1 + P2 + P3 + P4 + P5`

### LGA y DI

```text
Ib      = P / (k × U × cos φ)              k = √3 (trifásica) · 1 (monofásica)
ΔUadm   = U × caída_máx / 100
S_caída = (m × P × L) / (γ × U × ΔUadm)    m = 1 (trifásica) · 2 (monofásica)
```

La caída se plantea directamente como sección: al sustituir `I = P / (k × U × cos φ)` en la fórmula de caída, el `cos φ` se cancela. Por eso el trifásico no lleva `√3` en la sección y el monofásico lleva el factor 2 del retorno.

1. Se recorre la serie comercial y se elige la **primera sección** que cumpla a la vez `S ≥ S_caída`, `Iz_corregida ≥ Ib` y la sección mínima normativa (10 mm² en cobre para LGA, 6 mm² para DI).
2. `Iz_corregida = Iz_tabla × factor de reducción`, con el factor de agrupamiento, capas, tubos o resistividad del terreno según el caso (`lib/cable-tables.mjs`).
3. Si no se fija una protección, se propone la de la serie normalizada y se verifica `Ib ≤ In ≤ Iz_corregida`.
4. Cuando ninguna sección cumple, el módulo lo dice y explica cuál de los dos criterios falla; no devuelve en silencio la mayor.
5. El conductor de protección se deriva de la sección de fase y el neutro parte de ella; ambos quedan editables en el formulario.

Caída de tensión máxima admisible, según el supuesto de enlace:

| Supuesto de enlace | LGA (ITC-BT-14 §3) | DI (ITC-BT-15 §3) |
|--------------------|--------------------|-------------------|
| Contadores totalmente centralizados | 0,5 % | 1 % |
| Contadores concentrados en más de un lugar | 1 % | 0,5 % |
| Único usuario sin LGA | no existe | 1,5 % |

El supuesto se elige una vez por proyecto («Supuesto de enlace» en los módulos LGA y DI) y fija **los dos límites a la vez** (`lib/installation-config.mjs`); el valor se guarda con el proyecto. Si después editás el porcentaje a mano, el módulo avisa de que no coincide con el límite del supuesto, y en el caso de único usuario indica que no hay línea general. El módulo no inventa un supuesto: sin elección, arranca en contadores totalmente centralizados.

---

## Formatos de exportación

Un solo botón, **Descargar datos**, abre un diálogo con cuatro salidas. Las cuatro salen del mismo snapshot, así que no pueden divergir.

| Formato | Extensión | Contenido |
|---------|-----------|-----------|
| **PDF** | `.pdf` | Memoria técnica A4: cabecera de empresa con logo, potencias, detalle por bloque y dimensionado de líneas, con paginación |
| **JSON** | `.json` | Datos crudos: `projectInfo`, `inputs`, `settings`, `calculations` y `lines` (LGA y DI con sus resultados) |
| **Markdown** | `.md` | Informe con tablas, para pegar en un issue o en un README |
| **Texto simple** | `.txt` | El mismo informe sin marcado, para notas de obra |

Markdown y texto se generan en `lib/export-formats.mjs` a partir de una estructura normalizada (proyecto, totales, secciones y líneas), no desde el JSX.

---

## Persistencia

Todo vive en `localStorage`, con claves propias y validación al leer:

| Clave | Contenido |
|-------|-----------|
| `electrocalc-inputs:v1` | Filas de entrada, supuesto de enlace y estado de LGA/DI, en un snapshot versionado |
| `electrocalc-settings` | Parámetros de cálculo y preferencias de la interfaz |
| `electrocalc-project-info` | Empresa, contacto, dirección de obra y logo |
| `electrocalc-theme` | `light` o `dark`, aplicado por el script de arranque antes de hidratar |

- El snapshot de entradas se valida fila por fila; un snapshot antiguo sin filas de alumbrado carga con los valores por defecto en vez de descartarse.
- **Limpiar** borra las entradas y los datos del proyecto, pero **conserva** los parámetros de cálculo.
- Nada se envía a un servidor: no hay backend ni base de datos.

---

## Sistema de color

Los componentes **no usan la paleta cruda de Tailwind**. Cada color es un token semántico declarado en `app/globals.css` (valores en `:root`, expuestos como utilidades con `@theme inline`). Rebrandear es cambiar los valores de `:root`: ningún componente se toca.

| Grupo | Tokens | Uso |
|-------|--------|-----|
| Superficies | `surface-page` · `surface-muted` · `paper` · `panel` | Fondo de página, filas y chips, tarjetas, panel oscuro de resultados |
| Líneas | `line` · `line-soft` · `panel-line` · `panel-edge` | Bordes de tarjeta, separadores internos, bordes sobre el panel oscuro |
| Tinta | `ink` · `ink-strong` · `ink-soft` · `ink-muted` · `ink-subtle` · `ink-faint` · `ink-ghost` | De texto principal a texto auxiliar, en siete pasos |
| Marca | `brand` · `brand-strong` · `brand-ink` · `brand-soft` · `brand-line` · `brand-mark` · `brand-on-panel` | Acento de la app, estados activos, cifras destacadas |
| Panel oscuro | `panel-foreground` · `panel-muted` | Texto sobre el panel de resultados |
| Estados | `warning-soft` · `warning-ink` · `warning-mark` · `warning-on-panel` · `danger` | Avisos normativos y acciones destructivas |
| Pestañas | `tab-lga` · `tab-lga-soft` · `tab-lga-ink` · `tab-di` · `tab-di-soft` · `tab-di-ink` | Identidad de LGA y DI (cargas usa los tokens de marca) |

El bloque `.dark` redefine **los mismos tokens** con otras luces, así que ningún componente sabe que existe el modo noche.

### Accesibilidad del color

- **Texto**: todos los pares texto/fondo que se renderizan superan **4,5:1** en ambos temas (`ink`…`ink-faint`). `ink-ghost` queda reservado a marcas decorativas —el guion de celda vacía— y no se usa para texto informativo.
- **Contornos de campo y foco**: `--input` y `--ring` están ajustados a **3:1** contra la tarjeta (1.4.11). El anillo de foco usa la marca a plena opacidad: se quitó el `/50` de las primitivas de shadcn porque a media opacidad ningún color alcanza 3:1 sobre fondo claro. Es la única desviación deliberada del registry, junto con la paleta del PDF.
- **Por qué los campos se ven más marcados**: en un tema claro, llegar a 3:1 obliga a un borde relativamente oscuro; no hay atajo con rellenos claros, porque el relleno también tendría que contrastar 3:1. Es una decisión consciente: se acepta el cambio de carácter visual a cambio de cumplir 1.4.11. Si algún día se revierte, hay que hacerlo con el criterio documentado, no bajando el valor "un poco" (quedaría igual de oscuro y seguiría fallando).
- Un test (`tests/contrast.test.mjs`) recalcula estos ratios desde `globals.css`: si alguien retoca la paleta y un par baja de AA, falla antes de llegar al build.

Reglas:

- En `components/**` y `app/**` un `bg-slate-500`, un `text-cyan-700` o un `bg-[#f5f7f8]` es un bug: usá el token equivalente.
- `components/ui/**` son primitivas de shadcn y ya consumen sus propios tokens (`bg-background`, `border-input`, `text-muted-foreground`).
- **El PDF es la excepción**: jsPDF dibuja en su propio lienzo y no puede leer variables CSS. Sus colores viven en `lib/pdf-theme.mjs` como equivalentes RGB de los mismos tokens y se mueven junto con `:root`.
- `conversion-de-planilla-a-web/` y `.agents/` están excluidos del escaneo de Tailwind (`@source not`), para que no inyecten clases en el bundle.

---

## Estructura del proyecto

```text
.
├── app/
│   ├── layout.tsx            # Metadatos, iconos y Analytics
│   ├── page.tsx              # Punto de entrada
│   └── globals.css           # Tokens semánticos, tema y utilidades base
├── components/
│   ├── load-calculator.tsx   # Estado, pestañas, previsión de cargas y exports
│   ├── line-modules.tsx      # Módulos LGA/DI y visor de tablas
│   └── ui/                   # Primitivas shadcn/ui (Base UI)
├── lib/                      # Fórmulas y tablas, sin React
├── tests/                    # Suite node:test
├── data/                     # Hoja de cálculo original de referencia
├── public/                   # Iconos e imágenes
├── odd/tasks/                # Notas de diseño y especificaciones de features
└── mcp-excel-server/         # Utilidad aparte para leer la hoja original (opcional)
```

### Módulos de `lib/`

| Archivo | Responsabilidad |
|---------|-----------------|
| `simultaneity.mjs` | Tabla 1 de la ITC-BT-10 y coeficiente para `n > 21` |
| `load-previews.mjs` | Potencia por fila de locales, garajes y alumbrado |
| `service-loads.mjs` | P2: ascensores, motor mayor, otras cargas y alumbrado |
| `line-sizing.mjs` | Dimensionado de LGA/DI: `Ib`, sección por caída, protección |
| `cable-tables.mjs` | Intensidades admisibles y factores de corrección |
| `export-formats.mjs` | Informe en Markdown y texto simple |
| `pdf-theme.mjs` | Paleta del PDF (equivalente a los tokens de color) |
| `calculator-storage.mjs` | Persistencia versionada con validación por fila |

La regla es una sola: **ninguna fórmula se duplica**. Si una regla aparece en la fila, en el subtotal y en el PDF, vive en `lib/` y los tres la llaman.

---

## Pruebas

```bash
pnpm test                              # suite completa
node --test tests/line-sizing.test.mjs # un archivo
```

Sin framework: `node:test` + `node:assert/strict`, sin dependencias.

| Archivo | Cubre |
|---------|-------|
| `simultaneity.test.mjs` | Tabla de coeficientes y fórmula para `n > 21` |
| `load-previews.test.mjs` | Potencia por fila de locales, garajes y alumbrado |
| `service-loads.test.mjs` | P2 completo, incremento del motor mayor y ejemplo de referencia |
| `line-sizing.test.mjs` | Sección por caída, `Iz` corregida y verificación de protección |
| `line-modules.test.mjs` | Sección de protección y tablas de línea |
| `calculator-storage.test.mjs` | Persistencia, snapshots incompletos y limpieza |
| `export-formats.test.mjs` | Informe Markdown y texto |
| `source-notes.test.mjs` | Cada card cita su apartado del BOE y el toggle las oculta |
| `design-tokens.test.mjs` | Ningún color de paleta cruda ni token sin declarar |
| `contrast.test.mjs` | Contraste AA de los pares texto/fondo y 3:1 de bordes y foco, más el nombre accesible de cada control de tabla |
| `dialog-a11y-regression.test.mjs` | Diálogos accesibles y botones de acción |
| `shadcn-migration.test.mjs` | Primitivas shadcn en lugar de controles nativos |
| `hallmark-ui-audit.test.mjs` | Regresiones de interfaz (tablas, membrete, jerarquía) |

---

## Desarrollo

```bash
pnpm dev      # Servidor de desarrollo (hot reload)
pnpm build    # Build de producción
pnpm start    # Sirve el build de producción
pnpm test     # Suite de pruebas
```

> **Ojo con los tipos**: `next.config.mjs` incluye `typescript.ignoreBuildErrors: true`, así que `pnpm build` **no** valida TypeScript. Antes de abrir un PR, ejecuta `pnpm exec tsc --noEmit` (los errores de `mcp-excel-server/` son preexistentes: esa utilidad tiene sus propias dependencias sin instalar).

---

## Contribuciones

Este proyecto es **código abierto** y las contribuciones son bienvenidas. Cualquier mejora de cálculo, corrección normativa, accesibilidad, i18n o de interfaz ayuda a la comunidad de instalación eléctrica.

### Cómo contribuir

1. Haz un **fork** del repositorio.
2. Crea una rama para tu cambio:

   ```bash
   git checkout -b feat/mi-mejora
   ```

3. Implementa el cambio. Si alteras el motor de cálculo, **explica la referencia normativa** en la descripción de la PR.
4. Ejecuta `pnpm test` y `pnpm exec tsc --noEmit`.
5. Abre un **Pull Request** describiendo:
   - qué problema resuelve,
   - la referencia normativa (si aplica),
   - cómo lo has verificado.

### Directrices

- **Precisión normativa ante todo**: cualquier cambio en coeficientes o fórmulas debe citar la ITC-BT-10 (u otra norma aplicable) y justificarse. Ante la duda, abre un *issue* antes de invertir trabajo.
- **Una fórmula, un lugar**: toda regla nueva va en `lib/`, con su prueba y su nota de fuente en la card correspondiente.
- **Mantén el alcance acotado**: un PR por cambio. Prefiere varias PRs pequeñas a una gigante.
- **Conserva el cálculo como función pura**: sin efectos secundarios dentro del cálculo.
- **Colores por token**: la paleta cruda de Tailwind no entra en los componentes (hay un test que lo impide).
- **Idioma de los artifacts**: código, nombres de archivo, comentarios y mensajes de commit en **inglés**; la interfaz de usuario permanece en **español**.
- **Commits convencionales**: `feat:`, `fix:`, `docs:`, `refactor:`, etc.

### Reportar errores

¿Has encontrado una discrepancia con la hoja de cálculo o un fallo en la interfaz? Abre un **issue** indicando:

- datos de entrada que has usado,
- resultado esperado (y la referencia normativa),
- resultado que devuelve la app,
- navegador y versión si es relevante.

---

## Aviso legal y responsabilidad

Esta herramienta es un **auxilio de cálculo** basado en los criterios generales de la ITC-BT-10, la ITC-BT-14 y la ITC-BT-15. Los valores por defecto son orientativos y **deben ajustarse a cada proyecto**. La responsabilidad de la correcta aplicación de la normativa y de la instalación recae siempre en el técnico competente. El proyecto se ofrece "tal cual", sin garantías.

---

## Licencia

Código abierto bajo licencia **MIT**. Puedes usar, modificar y distribuir el proyecto libremente conservando el aviso de copyright.

---

## Enlaces

- **Repositorio**: [github.com/fitoji/rebt-calc](https://github.com/fitoji/rebt-calc)
- **Hoja de referencia**: [`data/Prevision_de_cargas_ITC-BT10-47d8bc.xlsx`](data/)
- **REBT consolidado** (RD 842/2002): [BOE-A-2002-18099](https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099)
- **ITC-BT-52 / IRVE** (RD 1053/2014): [BOE-A-2014-13681](https://www.boe.es/buscar/doc.php?id=BOE-A-2014-13681)
