# Esquema unifilar · exportación y memoria técnica

Objetivo: dejar documentado el estado del esquema unifilar ya integrado y **todo lo necesario para
llevar la lámina al PDF de la memoria técnica** —y, si se quiere, a un PNG descargable o a un DXF
editable en AutoCAD— sin duplicar geometría ni fórmulas. Este documento **no implementa**: es el mapa
de la feature futura.
Branch: `main`. Test runner: `node --test tests/*.test.mjs`.

---

## Lo que ya existe

| Archivo | Contrato |
|---|---|
| `components/unifilar-symbols.tsx` | Símbolos UNE-EN 60617 en variables CSS. Cada uno se dibuja centrado en el origen con terminales en `y = ±14`; el padre lo coloca con `translate(x,y)`. Exporta `IEC_SYMBOL_CATALOG`. |
| `components/unifilar-diagram.tsx` | `UnifilarDiagram({ lga, derivations, installationType })` y `KindLegend()`, más los tipos `UnifilarLine`, `UnifilarDerivation`, `InstallationKind`. |
| `components/unifilar-panel.tsx` | Pestaña completa: lámina, leyenda de tipos, librería de símbolos y estado vacío con «Generar desde la previsión». |
| `lib/unifilar.mjs` | `UNIFILAR_KINDS`, `kindColor`/`kindInk`, `shortCable`, `polesFor`, `truncateLabel`, `differentialsFor`, `UNIFILAR_LAYOUT`, `columnX`, `diagramWidth`, `busEndX`. Sin React. |
| `app/globals.css` | `--tab-esquema` y 12 tokens `--kind-*` (solo en `:root` y `.dark`). |
| `tests/unifilar.test.mjs` | 9 tests: rótulos, categorías distintas, geometría, diferenciales y declaración de tokens. |

Puntos de entrada en `components/load-calculator.tsx`: la pestaña `esquema` recibe
`lga={{ ...lga, result: lgaResult }}`, `derivations={calculatedDerivations}` e `installationType`.
**Esos tres valores son todo lo que un exportador necesita**; no hay que recalcular nada.

Geometría vigente (`UNIFILAR_LAYOUT`): `colWidth 150`, `lgaX 95`, `firstColumn 225`, `busY 188`,
`height 470`, `minWidth 760`, `rightPadding 44`. Con 17 derivaciones: **2819 × 470 px CSS**.

### Lo que falta para exportar

- `UnifilarDiagram` **no expone un `ref`** al `<svg>`. En React 19 `ref` es una prop normal de un
  componente función; agregarla es una línea.
- **Los paneles de pestaña inactivos se desmontan.** `Tabs.Panel` de Base UI trae
  `keepMounted = false` por defecto (`@base-ui/react/esm/tabs/panel/TabsPanel.js`), así que el `<svg>`
  solo existe mientras la pestaña Esquema está abierta. Un botón de descarga global (el de
  «Descargar datos») **no puede** buscarlo en el DOM: tiene que montar una copia propia o vivir
  dentro de la pestaña.

---

## Tres salidas, tres contratos

| | PNG/SVG descargable | Página de la memoria | DXF para CAD |
|---|---|---|---|
| Qué representa | lo que se ve, con el tema activo | documento impreso, **siempre claro** | dibujo de trabajo, en mm |
| Naturaleza | raster: pixela al zoom | vector, texto seleccionable | vector nativo, por capas |
| Tipografía | hay que embeber la webfont | Helvetica del PDF (o TTF) | estilo del CAD |
| Composición | una imagen | paginado A4 | tira continua + layouts |
| Glifos | los de Geist/JetBrains (Δ, φ) | WinAnsi: **sin Δ ni φ** | según el font del estilo |
| Editable después | no | no | **sí: capas y bloques** |
| Coste | receta corta, sin dependencias | segundo renderer, ~150 líneas | tercer renderer + escena |

**Consecuencia:** el PNG no es una solución para la memoria (sirve para el mail de obra), y ninguno de
los dos reemplaza al DXF cuando el estudio quiere seguir editando el plano.

---

## Ruta A · Rasterizar (PNG descargable)

### Por qué no alcanza con serializar

Un SVG cargado como `<img>` vive en **modo estático seguro**: no carga hojas externas, imágenes ni
fuentes, y no hereda nada de la página. Por eso el SVG serializado tal cual sale con:

1. **sin colores**: `style="fill: var(--kind-dwelling)"` no resuelve, y `color-mix()` tampoco;
2. **sin la tipografía**: Geist Mono (modo cálculo) o DM Sans (didáctico) no existen en ese documento.

### Receta

```ts
async function rasterizeSvg(svg: SVGSVGElement, scale = 3): Promise<HTMLCanvasElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineComputedStyles(svg, clone)  // 1. resuelve var() y color-mix()
  await inlineFontFaces(clone)      // 2. @font-face con los woff2 en base64

  const width = svg.viewBox.baseVal.width || svg.clientWidth
  const height = svg.viewBox.baseVal.height || svg.clientHeight
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.src = url
  await img.decode()                // no usar onload: evita la carrera con 0×0

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Sin contexto 2D')
  ctx.scale(scale, scale)
  ctx.drawImage(img, 0, 0, width, height)
  URL.revokeObjectURL(url)
  return canvas
}
```

#### Paso 1 · resolver estilos

Recorrer árbol original y clon en paralelo (mismo orden en un `cloneNode(true)`) y copiar el valor
computado como **estilo inline**. `getComputedStyle` ya devuelve resueltos `var()` y `color-mix()`.

Propiedades que la lámina usa: `fill`, `fill-opacity`, `stroke`, `stroke-width`, `stroke-linecap`,
`stroke-linejoin`, `opacity`, `font-family`, `font-size`, `font-weight`, `text-anchor`,
`letter-spacing`. Copiar solo esas: volcar todo `cssText` engorda el SVG y arrastra propiedades que
en la imagen no significan nada.

#### Paso 2 · fuentes

- `next/font/google` **autoaloja**: la hoja genera `@font-face` con
  `src: url("../media/<hash>.woff2")`, relativo al `href` de la hoja. Se leen con CSSOM:
  `document.styleSheets` → `CSSFontFaceRule` → `new URL(src, sheet.href)` → `fetch` → base64.
- **Cada familia tiene varios `@font-face`, uno por subset `unicode-range`.** Δ es `U+0394` y φ es
  `U+03C6`: caen en el subset griego (`U+370-377, U+37A-37F, U+384-38A, U+38C, U+38E-3A1, …`). Si
  solo se embebe el latino, esos dos caracteres no tienen fuente en la imagen: salen como cuadros o
  con la tipografía de reserva, distinta del resto del rótulo. Hay que embeber todas las reglas de la
  familia **conservando su `unicode-range`**, o al menos latino + griego.
- `data:` sí se permite en modo estático; una URL externa no. Por eso se embebe, no se enlaza.

#### Paso 3 · tamaño y escala

- El clon **necesita `width` y `height` explícitos**; sin ellos el navegador usa `100% × 150px`.
- Un blob URL del mismo origen **no contamina** el canvas: la lámina no tiene `<image>` externas.
- Acotar por **área**, no por factor fijo: `scale = min(deseado, sqrt(MAX_AREA / (w*h)))`. Safari
  (iOS) corta el canvas en ~16,7 Mpx; el límite exacto varía por versión y memoria, así que se acota
  y se comprueba en el navegador de destino.
  Con 17 derivaciones: 2819 × 470 → a ×3 son 8457 × 1410 = **11,9 Mpx** (entra); a ×4 son 21,2 Mpx
  (fuera en iOS).

#### Paso 4 · al PDF (si igual se elige rasterizar)

`doc.addImage(canvas, 'PNG', 15, y, 180, hMm)` — jsPDF acepta el canvas directamente. Pero a 180 mm
de ancho un texto de 10 px mide **1,8 pt**: ilegible. Rasterizar para la memoria obliga a paginar
igual que la ruta vectorial, con el agregado de que el texto ya no es texto.

### Trampas verificadas de esta ruta

1. **Fondo transparente**: el PNG sale sin fondo y en el PDF se ve el papel detrás. Rellenar con
   `--paper` antes de dibujar, o usar `backgroundColor` en el canvas.
2. **Tema oscuro**: si el usuario está en modo noche, el PNG sale oscuro. Para la memoria eso no
   sirve. Ver «La copia de impresión» más abajo.
3. **`xmlns`**: `outerHTML` funciona en navegadores pero no garantiza namespaces; `XMLSerializer` sí.
4. **`<title>`**: los tooltips no molestan en la imagen; no hay que quitarlos.
5. **`img.decode()`**: con `onload` la imagen puede llegar con dimensiones 0 y el canvas queda vacío.

---

## Ruta B · Segundo renderer vectorial con jsPDF (recomendada para la memoria)

### Diseño

`lib/unifilar-pdf.mjs` dibuja con `doc.line/rect/circle/text` consumiendo **la misma** geometría y los
mismos rótulos de `lib/unifilar.mjs`. No se duplica ninguna fórmula: se duplica el *driver* de salida,
igual que `pdf-theme.mjs` duplica los colores porque jsPDF no lee CSS.

| Se comparte | No se comparte |
|---|---|
| `UNIFILAR_LAYOUT`, `columnX`, `busEndX`, `diagramWidth` | Los símbolos SVG (se redibujan con primitivas) |
| `differentialsFor`, `shortCable`, `polesFor`, `kindLabel` | La leyenda de tipos y el catálogo (son de pantalla) |
| Los valores: `finalSection`, `protection`, `dropPercent`, `ok` | `truncateLabel`: está calibrado en px de pantalla (94 px a 10 px); en PDF hay que medir con `doc.getTextWidth` |

### Glifos: el detalle que rompe el PDF

El PDF usa **Helvetica/WinAnsi** (`doc.setFont('helvetica', …)`). WinAnsi tiene `²`, `·`, `ñ`, `á`…
pero **no tiene Δ (U+0394) ni φ (U+03C6)**. Hoy el generador nunca los escribe: dice «Caída de
tensión», no «ΔU». Al dibujar el esquema hay que mantener esa convención:

- `ΔU 0,91 %` → `Caída 0,91 %` (o `dU`, pero no es lo que dice el resto del documento);
- `IΔn` → `Sensibilidad 30 mA`, o dejarlo solo como el rótulo interno del símbolo, que también es
  texto y tiene el mismo problema;
- `φ` no aparece en la lámina (cos φ sí está en la columna de origen: **hay que sustituirlo**).

La alternativa es embeber un TTF (`doc.addFileToVFS` + `doc.addFont`), que hoy el proyecto no hace y
suma peso al PDF. Decisión abierta D4.

### Paginación: el problema real

No es la resolución, es la composición. Cuentas con la geometría vigente:

- A4 horizontal: 267 mm útiles de ancho.
- Para que un texto de 10 px mida 7 pt (2,47 mm): escala **0,247 mm/px**. La columna de 150 px son
  37 mm → **7 columnas por hoja**.
- Las etiquetas más chicas (8 px) quedan en 5,6 pt: al límite. Si se exige 6,5 pt para todas, la
  escala sube a 0,286 mm/px y entran **6 columnas**.
- La columna de origen mide 225 px (55 mm). Si **se repite en cada hoja**, cada página aguanta
  5 columnas → 17 derivaciones son **4 hojas**. Si aparece **solo en la primera**, la capacidad es
  5 + 7 + 7 → **3 hojas** (la última lleva 5).

Recomendación: repetir origen y embarrado en cada hoja, numerar «Esquema (1/4)» y cerrar cada hoja
con «continúa». Cada hoja se explica sola, que es lo que se necesita cuando alguien fotocopia una
página del expediente. Decisión abierta D2.

**Alternativa a evaluar:** un «esquema resumido» que agrupe derivaciones idénticas (`10 × Vivienda
básica 5,75 kW`) y entre en una hoja. Cambia lo que el documento afirma, así que no es solo un
cambio de render: es una decisión de contenido.

### La copia de impresión

El PDF debe salir siempre en claro, aunque el usuario esté en modo noche, y el panel puede estar
desmontado. Las dos cosas se resuelven juntas: **montar una copia fuera de pantalla** del
`UnifilarDiagram` dentro de un contenedor `print-sheet` que redeclare los tokens claros.

```css
/* Los tokens categóricos viven en :root y .dark; esta clase los vuelve a fijar
   en claro para la copia que se rasteriza o se imprime. */
.print-sheet {
  --paper: #ffffff;
  --ink: #111827;
  --ink-faint: #5f6673;
  --ink-subtle: #68707d;
  --kind-dwelling: #2563eb;  /* … los 12 tokens, valores de :root */
}
```

Custom properties heredan: alcanza con declararlas en el contenedor. Para la ruta vectorial la copia
no hace falta, porque los colores salen de `PDF_COLORS`.

---

## Ruta C · DXF para AutoCAD

Objetivo distinto de las otras dos: **no es un documento, es un dibujo de trabajo**. Quien lo abre
quiere mover, recortar, agregar notas y meterlo en su plantilla. Eso impone tres cosas que ni el PNG
ni el PDF necesitan: **capas, bloques y unidades reales**.

### Qué se gana y qué se pierde

Gana: geometría vectorial nativa, una capa por concepto (se apaga «viviendas» y se trabaja el resto),
símbolos como bloques reutilizables, texto editable y `AUDIT` limpio. Pierde: no reemplaza la memoria
—no lleva membrete ni firma— y obliga a mantener un tercer backend.

### Arquitectura: una escena, tres traductores

Con tres salidas, duplicar el layout tres veces es garantía de que se separen. La recomendación es
extraer una **escena** en `lib/unifilar-scene.mjs`:

```js
buildUnifilarScene({ lga, derivations, installationType }) → {
  width, height,                       // unidades de lámina (los px de pantalla)
  blocks: { SOURCE, METER, BREAKER, RCD, LOAD, EARTH },
  primitives: [
    { kind: 'line',   x1, y1, x2, y2, layer, lineweight },
    { kind: 'circle', cx, cy, r, layer },
    { kind: 'arc',    cx, cy, r, startDeg, endDeg, layer },
    { kind: 'text',   x, y, text, size, anchor, layer, weight },
    { kind: 'rect',   x, y, w, h, layer },
    { kind: 'insert', block, x, y, layer, scale },
  ],
}
```

`unifilar-diagram.tsx` pasa a mapear primitivas a JSX (`<line>`, `<circle>`, `<use>`), `unifilar-dxf.mjs`
a grupos de código y `unifilar-pdf.mjs` a llamadas de jsPDF. Una sola descripción, tres traductores.
Los bloques aparecen solos porque el DXF los pide: en SVG son `<symbol>`/`<use>` y en jsPDF se
redibujan.

Coste: ~200 líneas movidas (6 símbolos y 3 constructores de columna) y el riesgo de que la lámina de
pantalla cambie un píxel. Si no se quiere pagar, el DXF puede duplicar el layout, pero entonces
conviene congelar la lámina de pantalla primero y dejar anotada la deuda.

### Capas y colores

| Capa | Contenido | ACI |
|---|---|---|
| `ACOMETIDA` | fuente de red y CGP | 7 |
| `LGA` | conductor y protección de la LGA | 7 |
| `EMBARRADO` | barra general (lineweight 0,50 mm) | 7 |
| `DI-VIVIENDA` | conductores y símbolos de vivienda | 5 |
| `DI-LOCAL` | ídem, local | 30 |
| `DI-SERVICIOS` | ídem, servicios generales | 3 |
| `DI-GARAJE` | ídem, garaje | 8 |
| `DI-IRVE` | ídem, recarga VE | 6 |
| `DI-MANUAL` | ídem, derivación manual | 4 |
| `TIERRA` | puesta a tierra | 3 |
| `TEXTOS` | rótulos de aparatos (`In`, `IΔn`) | 7 |
| `TEXTOS-FINOS` | potencias, longitudes y caídas | 9 |
| `LEYENDA` | leyenda y membrete | 9 |

El ACI 7 se invierte con el fondo (negro sobre blanco, blanco sobre negro): es lo que se quiere en un
plano. El color de cada tipo va **a la capa, no a la entidad**, para que el usuario lo cambie de una.

### Bloques

Un `BLOCK` por símbolo, insertado con `INSERT`. Es lo que hace el DXF editable de verdad: si se
redefine `UF_BREAKER`, cambian las 17 derivaciones. Nombres estables y sin espacios: `UF_SOURCE`,
`UF_METER`, `UF_BREAKER`, `UF_RCD`, `UF_LOAD`, `UF_EARTH`.

### Unidades y escala

Model space en **milímetros**, `$INSUNITS = 4`, con el mismo factor que la memoria:
`UNIFILAR_MM_PER_PX = 0,247` (10 px → 2,47 mm ≈ 7 pt). Con 17 derivaciones la tira mide
**696 × 116 mm**. Si la oficina trabaja a 1:50, se escala la inserción completa; no se toca la
geometría.

Esa tira **no entra en A4 a 1:1** (267 mm útiles): en CAD se plotea 1:1 **por ventana**, en tantas
ventanas como hojas tiene el PDF, o completa en A1. El DXF no pagina porque el CAD sí puede cortar por
ventana; el papel no.

### Texto y glifos

- Estilo `UNIFILAR` con `arial.ttf` (TrueType), para que Δ y φ existan. Con `txt.shx` no existen: en
  ese caso se aplica la misma convención que el PDF (`Caída`, `Sensibilidad`).
- `$DWGCODEPAGE = ANSI_1252` y **archivo en ASCII puro**, escapando lo que no lo sea como `\U+00E1`
  (á), `\U+00F1` (ñ) o `\U+0394` (Δ). Así no depende de la code page ni del editor.
- Alturas: 2,47 mm los rótulos, 2,10 mm los datos de línea, 1,98 mm los pies.

### Estructura mínima que AutoCAD abre

`HEADER` (`$ACADVER`, `$INSUNITS`, `$DWGCODEPAGE`, `$EXTMIN`/`$EXTMAX`) → `TABLES` (`LTYPE`
CONTINUOUS, `LAYER`, `STYLE`) → `BLOCKS` → `ENTITIES` → `EOF`.

Dos detalles que rompen la carga:

- **Versión.** AC1015 (R2000) es el punto dulce: tiene `LWPOLYLINE` y `lineweight` (grupo 370). R12 no
  los tiene; desde AC1021 el texto pasa a UTF-8.
- **Handles.** R2000+ espera `5` (handle) y `330` (propietario) en cada entidad. Escribirlos a mano es
  donde aparecen los «invalid or incomplete DXF input». De ahí la recomendación de librería.

### Librería o escribir a mano

| Opción | A favor | En contra |
|---|---|---|
| `@tarikjabiri/dxf` (2.10.0) | TypeScript, bloques, capas, API moderna | peso y curva de aprendizaje |
| `dxf-writer` (1.18.4) | «dead simple», 2D, sin dependencias | menos estructura; verificar bloques y versión |
| Escribirlo en `lib/unifilar-dxf.mjs` | cero dependencias, testeable como texto | handles, tablas y subclass markers a mano |

Recomendación: **`@tarikjabiri/dxf`, después de un spike** que confirme que emite AC1015 con handles,
bloques y capas. Si no lo hace, escribir un subconjunto propio limitado a `LINE`, `CIRCLE`, `ARC`,
`TEXT` e `INSERT`.

### Cómo se valida (no hay AutoCAD en CI)

1. **Test puro en el repo**: parsear el texto en pares (código, valor) y afirmar el orden de secciones,
   que cada entidad declare capa (`8`) y que esa capa exista en `LAYER`, y que cada `INSERT` apunte a
   un `BLOCK` definido. Sin dependencias, en la línea de los tests de tokens.
2. **Auditoría externa**: `pip install ezdxf` y `ezdxf.readfile(path).audit()`. No está instalado en
   el repo (verificado), así que es un paso manual del PR, no de la suite.
3. **Prueba de humo en CAD**: ver «Prueba de humo › Ruta C · DXF».

---

## Comparación y recomendación

| Criterio | Ruta A · raster | Ruta B · vector PDF | Ruta C · DXF |
|---|---|---|---|
| Para qué sirve | mail, WhatsApp | memoria firmable | editar el plano en CAD |
| Esfuerzo | bajo | medio | medio-alto (tercer backend) |
| Fuentes | frágil: subsets, `unicode-range`, data URI | ninguna: Helvetica | estilo del CAD |
| Calidad | bitmap, pixela al zoom | vectorial | vectorial nativa |
| Editable | no | no | **sí** |
| Glifos | todos (webfont) | WinAnsi o TTF | según el font del estilo |
| Modo oscuro | hay que forzar la copia clara | no aplica | no aplica |
| Reutilizable | PNG para chat | solo PDF | AutoCAD/LibreCAD/QCAD |

**Recomendación:** ruta B para la memoria. Ruta C después, porque es la que más valor deja después
del PDF: el estudio puede seguir trabajando el plano sin volver a dibujarlo. Ruta A solo si además se
quiere un PNG rápido, que es el entregable menos importante de los tres.

---

## Specs propuestas

- S1. La memoria técnica incorpora una sección «Esquema unifilar» paginada en A4 horizontal, con una
  lámina por grupo de derivaciones y el origen repetido en cada hoja.
- S2. La lámina del PDF se genera con un renderer jsPDF que consume `lib/unifilar.mjs`; no duplica
  geometría, rótulos ni diferenciales. Un test fija que el módulo importa `columnX`, `busEndX` y
  `differentialsFor`.
- S3. Todo texto del PDF cae dentro de WinAnsi: `ΔU` → `Caída`, `φ` → `cos`, `IΔn` → `Sensibilidad`.
  Un test recorre el módulo y rechaza caracteres fuera del rango.
- S4. El esquema hereda los datos ya calculados: `lga.result`, `derivation.result` y
  `installationType`. No hay un segundo dimensionado.
- S5. Las derivaciones sin resultado (`finalSection == null`) se dibujan con `—` y sin veredicto, como
  en pantalla; el PDF nunca estima una sección.
- S6. La paginación es una función pura (`pageSlices(count, columnsPerPage)`) con test propio, y el
  reparto se decide antes de dibujar.
- S7. El suministro de único usuario no dibuja LGA, igual que en pantalla.
- S8. La ayuda y el README documentan la sección nueva y su criterio de paginación.
- S9. La pestaña Esquema ofrece «Descargar esquema (DXF)», con nombre de archivo
  `esquema-unifilar-<fecha>.dxf`, y funciona aunque el usuario esté en modo noche.
- S10. El DXF sale en AC1015, en milímetros (`$INSUNITS = 4`), con una capa por concepto, el color en
  la capa y un `BLOCK` por símbolo insertado con `INSERT`. Sin imágenes ni geometría aplanada.
- S11. La geometría del DXF sale de la escena compartida (`lib/unifilar-scene.mjs`); el módulo DXF no
  recalcula posiciones. Un test fija que importa la escena y no `UNIFILAR_LAYOUT` por su cuenta.
- S12. El archivo es ASCII puro (lo no ASCII va como `\U+XXXX`) y un test lo verifica byte a byte,
  además de rechazar `INSERT` sin `BLOCK` y entidades con capa inexistente.

## Plan de tareas propuesto

- T1 (S2, S6) `lib/unifilar-pdf.mjs`: geometría de páginas, paginación pura y esqueleto del dibujo.
  Tests de `pageSlices` y del reparto. Ruta: inline.
- T2 (S2, S4, S5, S7) Símbolos y columnas en jsPDF (acometida, LGA, derivación, carga, tierra).
  Comparar contra la lámina de pantalla con un proyecto de 1, 7 y 17 derivaciones.
- T3 (S3) Sustitución de glifos y verificación de WinAnsi; medir etiquetas con `doc.getTextWidth`
  en lugar de `truncateLabel`.
- T4 (S1) Página dentro de `downloadReport`, numeración correlativa y encabezado «continúa».
- T5 (S8) Documentación y verificación completa (suite, `tsc --noEmit`, `pnpm build`).

Si además se hace el PNG (ruta A): T6 con `rasterizeSvg`, `inlineComputedStyles`, `inlineFontFaces`,
`print-sheet` y su prueba de humo.

Si además se hace el DXF (ruta C):

- T7 (S11) Extraer `lib/unifilar-scene.mjs` y portar la lámina de pantalla a primitivas. La salida
  visual no puede cambiar: se compara con una captura antes/después. Ruta: inline, es cirugía fina.
- T8 (S10, S12) `lib/unifilar-dxf.mjs` sobre la librería elegida, capas, bloques y escapes ASCII, con
  el test de gramática. Ruta: inline.
- T9 (S9) Botón, nombre de archivo, ayuda y prueba de humo en CAD. Ruta: inline.

## Criterios de aceptación

- Con el proyecto de ejemplo (17 derivaciones) el PDF sale en 3 o 4 hojas, todas legibles a 100 %.
- Ninguna etiqueta se solapa con la columna siguiente ni se sale de la hoja.
- Una derivación sin resultado imprime `—`, nunca un número inventado.
- El PDF es idéntico en tema claro y oscuro (los colores salen de `PDF_COLORS`).
- El DXF abre en AutoCAD sin diálogo de reparación, con las 13 capas, los símbolos como `INSERT` y
  `AUDIT` limpio; el archivo pasa el test de gramática y no tiene un solo byte fuera de ASCII.
- `pnpm test`, `pnpm typecheck` y `pnpm build` en verde.

## Prueba de humo

### Ruta A · raster

1. Rasterizar la lámina con una vivienda sola y compararla contra una captura de pantalla: los
   colores y la tipografía tienen que coincidir.
2. Mirar la `Δ` de `ΔU` y la `φ` de `cos φ`: si salen como cuadros o con otra tipografía, falta el
   subset griego.
3. Repetir en modo noche: la misma copia tiene que salir **clara** (contenedor `print-sheet`).
4. Abrir la pestaña Cargas y disparar el export: tiene que funcionar igual (copia montada, no
   `querySelector` sobre un panel desmontado).

### Ruta C · DXF

1. Abrir en AutoCAD (o LibreCAD/QCAD) sin diálogo de reparación ni «invalid DXF».
2. `LAYER`: figuran las 13 capas con sus colores y la barra con su lineweight.
3. Seleccionar un contador: es un `INSERT`, y redefiniendo el bloque cambian todos.
4. Los acentos y la ñ se leen bien («Recarga de vehículos»).
5. `AUDIT` sin errores corregibles.

---

## Decisiones abiertas

- **D1.** ¿Solo la página del PDF, solo el PNG descargable, o las dos?
- **D2.** Paginación: origen repetido en cada hoja (4 hojas, autocontenidas) o solo en la primera
  (3 hojas).
- **D3.** ¿La memoria puede crecer 3–4 páginas? Si no, evaluar el esquema resumido por grupos.
- **D4.** ¿Embeber un TTF para conservar `Δ` y `φ`, o mantener la convención WinAnsi del resto del
  documento?
- **D5.** ¿La sección se dispara desde «Descargar datos → PDF» o con un botón propio «Descargar
  esquema» dentro de la pestaña?
- **D6.** ¿Se extrae la escena compartida (T7) o el DXF duplica el layout y se acepta la deuda?
- **D7.** ¿AC1015 (R2000, recomendado) o R12 por compatibilidad con CAD viejo?
- **D8.** ¿El DXF incluye también la leyenda de tipos y el catálogo de símbolos, o solo la lámina?

## Trampas ya pagadas (no repetirlas)

- **La paleta es por modo.** `html[data-explanation-mode="calculation"|"didactic"]` redefine todos
  los tokens con hex legacy; reusar `--brand`/`--tab-di` como paleta categórica colapsa colores. Por
  eso existen `--kind-*` y por eso viven solo en `:root` y `.dark`.
- **`IΔn` no es el IGA.** `housingIgaA` es el escalón de potencia; `IΔn` es la sensibilidad (30 mA).
  El prototipo los confundía.
- **`In` no es el IGA.** In protege la línea (Ib ≤ In ≤ Iz); el IGA fija la potencia máxima de la
  vivienda.
- **El prototipo queda como referencia**, excluido de `tsc` y del escaneo de Tailwind
  (`tsconfig.json`, `@source not "../data/esquema-unifiliar"`).

## Log

- L1 (user, verbatim): "en @data/esquema-unifiliar/ agregue un prototipo de esquema unifilar para la
  app, revisalo y aplicalo en nuestra app". Se integró como pestaña `Esquema`: `unifilar-symbols.tsx`,
  `unifilar-diagram.tsx`, `unifilar-panel.tsx`, `lib/unifilar.mjs`, tokens `--kind-*` y `--tab-esquema`,
  `tests/unifilar.test.mjs`. Se corrigieron dos errores del prototipo (`IΔn` con el IGA, IGA/In
  mezclados) y se reemplazó la paleta slate por tokens que sobreviven a los bloques de modo.
  Verificado con capturas reales en claro y oscuro, suite 353/353, `tsc --noEmit` limpio y
  `pnpm build` OK.
- L2 (user, verbatim): "como rasterizamos el svg?". Se relevó la receta (clon + estilos computados +
  fuentes en base64 + canvas) y las tres trampas: variables CSS, subsets de la webfont y escala. Se
  concluyó que rasterizar no sirve para la memoria técnica y que ahí conviene un segundo renderer
  con jsPDF.
- L3 (user, verbatim): "deja todo documentado para una feature futura". Este documento.
- L4 (user, verbatim): "tambien apunta como feature poder descargar el esquema en formato dxf para
  poder abrirlo desde autocad y editarlo". Se agregó la ruta C: capas por concepto con color ACI,
  un bloque por símbolo, AC1015 en milímetros con el mismo factor que la memoria (0,247 mm/px) y
  validación en tres pasos (test de gramática, `ezdxf` y prueba en CAD). Se documentó que una escena
  compartida es la forma de no triplicar el layout, y que `@tarikjabiri/dxf` 2.10.0 es la primera
  opción a probar en un spike.
- Decisión: la lámina nunca recalcula. Lee `lgaResult` y `calculatedDerivations`, que ya vienen
  dimensionados por `calculateProject`.
- Hallazgo (desmontaje de paneles): `Tabs.Panel` de Base UI usa `keepMounted = false`, así que el
  `<svg>` no existe fuera de la pestaña. Un exportador global necesita su propia copia.
- Hallazgo (glifos): el PDF del proyecto es Helvetica/WinAnsi y nunca escribe `Δ` ni `φ`; el esquema
  debe seguir esa convención o embeber un TTF.
- Hallazgo (fuentes): `next/font` autoaloja y publica un `@font-face` por subset; `Δ`/`φ` están en el
  griego, no en el latino.
