# Convención: las tablas normativas no se nombran en las etiquetas

Objetivo: que un valor que sale de una tabla normativa se lea **como valor + un botón de tabla que abre el panel compartido enfocado en esa tabla**, en lugar de llevar el nombre de la tabla escrito en la etiqueta. Y que la convención quede escrita como skill del proyecto para que se aplique siempre. Rama: `feat/convencion-tablas-normativas`. Test runner: `node --test tests/*.test.mjs` + `npx tsc --noEmit`.

## Specs

S1. **Pedido del usuario**, verbatim: «quiero que normalicemos o hagas una skill, para que lo tengas en cuenta siempre que por ejemplo dentro del tab de cuadros, tenemos IGA(tabla a) y no quiero eso un texto que mensione una tabla, quiero como en el tap de prevision de cargas, en p2 que tenemos en ascencor, un select con los ita, y al lado un boton con simbolo de tabla, que al cliquear alli se abre un dialog con esa tabla».

S2. **El patrón tiene dos variantes, según el valor se elija o se calcule.**
   - Si el valor **se elige** de la tabla: `Select` con las opciones de la tabla + botón de tabla. Referencia: el ITA de P2 (`components/load-calculator.tsx:1473`).
   - Si el valor **se calcula** o se deriva: el valor + el botón de tabla, sin select. Referencia: el coeficiente de simultaneidad (`components/load-calculator.tsx:1469`).
   El IGA es el segundo caso: sale del escalón de potencia elegido en P1, no se elige en Cuadros. Darle un select lo desacoplaría del escalón, que es un cambio de modelo y no de interfaz.

S3. **Una sola superficie de tablas.** Decisión del usuario: reutilizar el panel en lugar de un dialog por tabla. Hoy hay tres superficies —`showReferences` («Tablas y referencias», `components/load-calculator.tsx:1611`), `LineTablesDialog` (`components/line-modules.tsx:585`, con `TableKey` y foco) y la tabla 1 inline en `components/interior-panel.tsx:461`— más dos dialogs ad hoc (ITA `:1360` y simultaneidad `:1347`). Queda **un** panel, con claves, que se puede abrir enfocado en una tabla o sin foco para verlas todas.

S4. **El foco filtra, no navega.** El mecanismo existente (`TableKey` + `openLineTables`, `components/load-calculator.tsx:304`) muestra solo las tablas pedidas. Se conserva ese comportamiento: quien pide `T25-A` ve la tabla A, no el panel entero scrolleado.

S5. **El nombre de la tabla vive en el panel, no en la etiqueta.** La etiqueta dice qué es el valor (`IGA`, `Iz`, `M² / Vivienda`); el título de la tabla y su cita aparecen dentro del panel y en la `SourceNote`. Se eliminan las menciones `(tabla A)`, `(tabla 1)`, `(tabla 2)` de las etiquetas de valor.

S6. **El ITA migra.** Su dialog propio desaparece y su tabla pasa al panel compartido con su clave. Lo mismo la del coeficiente de simultaneidad, que además hoy está duplicada: se renderiza en su dialog (`components/load-calculator.tsx:1353`) y otra vez dentro de `showReferences` (`:1634`).

S7. **La convención se escribe como skill del proyecto** en `.agents/skills/<slug>/SKILL.md`, con el patrón, las dos variantes, la regla de no nombrar tablas en etiquetas y las referencias de código. Tiene que ser útil para una sesión futura sin leer este documento.

S8. **Fuera de alcance, explícitamente.** Las `SourceNote` siguen citando la instrucción y la tabla: ahí el nombre es la cita que el revisor técnico verifica, no una etiqueta. Tampoco cambian los textos de `/ayuda` ni las cadenas del PDF.

## Supuestos asumidos (a rever si molesta el resultado)

A1. **Las tablas que hoy viven fuera de cualquier clave entran al registro con clave propia**: `T25-A` (escalones de potencia, ITC-BT-25 tabla A), `T10-CS` (coeficiente de simultaneidad, ITC-BT-10 §3.1) e `ITA` (tipos de ascensor). El resto de `TableKey` no se toca.

A2. **La tabla 1 de la ITC-BT-25 no entra en esta entrega.** En Cuadros no es un valor consultable sino la tabla de trabajo de la card: sus filas son los circuitos que se editan. Hacerla botón obligaría a decidir si desaparece de la card, y eso no se pidió. Se queda inline y se anota como pendiente.

A3. **«Fuera de tabla» no se toca.** Textos como `fuera de tabla` (`components/interior-panel.tsx:122`, `components/rail-result.tsx:272`, `components/meter-center-card.tsx:192`) son un estado del valor, no el nombre de una tabla.

A4. **Las etiquetas de opción de `line-modules.tsx` que nombran la tabla** (`Al aire · Tabla A`, `Enterrada bajo tubo · Tabla D`, `Tabla E`, `Tabla G`) sí se limpian: esos campos ya tienen su botón `Tablas` al lado, así que el nombre en la opción es redundante. Se conserva la parte que describe la condición (`Al aire`, `Enterrada bajo tubo`).

## Tasks

Se entrega por etapas. Slice 1 resuelve lo pedido sin refactorizar las superficies; Slice 2 unifica.

**Slice 1 · lo pedido**
- [x] T1 · Botón de tabla reutilizable (`<TableButton />`) con el estilo y el `aria-label` que ya usa el patrón, y un helper de etiqueta para no repetir la clase · S2 · commit `147c360`
- [x] T2 · `IGA (tabla A)` → `IGA` + botón de tabla, en la card del DGMP, en la card administrativa y en el rail · S5 · commit `147c360`
- [x] T3 · `Iz de tabla` → `Iz` + botón de tabla, en el rail (LGA y DI) · S5 · commit `147c360`
- [x] T4 · Skill del proyecto con la convención · S7 · commit `147c360`
- [x] T5 · Tests del slice: botón presente y con `aria-label` por valor, etiquetas sin el nombre de la tabla, y que el panel abierto sigue mostrando la tabla A · S2, S4, S5 · commit `147c360`

**Slice 2 · unificación**
- [x] T6 · Registro único: `T25-A`, `T10-CS` e `ITA` se suman al registro `{key, title, doc, head, rows}` · S3, S6, A1 · commit `09706ed`
- [x] T7 · Panel único con foco; se retiran `showReferences`, el dialog del ITA y el de simultaneidad · S3, S4, S6 · commit `09706ed`
- [x] T8 · Etiquetas de opción de `line-modules.tsx` limpias del nombre de la tabla · S5, A4 · commit `09706ed`

## Pendientes

**P1 · `mín. tabla N` en las celdas de la tabla 1 de Cuadros.** Es una nota de celda que nombra la tabla; el patrón pediría dejarla en `mín. N`. No se tocó porque no es una etiqueta de opción y el alcance del slice 2 no la cubría.

**P2 · Tabla 1 de la ITC-BT-25 como tabla consultable (A2).** Hoy vive inline en la card de Cuadros porque sus filas son los circuitos editables. Si se quiere el patrón también ahí, hay que decidir antes si la card conserva la tabla de trabajo y el botón abre una copia de consulta, o si la tabla de trabajo se separa de la de consulta.

La automatización de la ITC-BT-25 §2.3.2 sigue anotada en `odd/tasks/aviso-electrificacion-elevada.md`, sección «Pendientes».

## Log

L1 — pedido del usuario, verbatim: «quiero que normalicemos o hagas una skill, para que lo tengas en cuenta siempre que por ejemplo dentro del tab de cuadros, tenemos IGA(tabla a) y no quiero eso un texto que mensione una tabla, quiero como en el tap de prevision de cargas, en p2 que tenemos en ascencor, un select con los ita, y al lado un boton con simbolo de tabla, que al cliquear alli se abre un dialog con esa tabla».

L2 — decisiones del usuario en el cuestionario: «Reutilizar «Tablas y referencias»» para la superficie, y «Etiquetas de valor de las cards» para el alcance. Descarta el dialog por tabla y deja las `SourceNote` fuera, porque ahí el nombre de la tabla es la cita.

L3 — evidencia recogida por exploración antes de escribir: hay tres superficies de tablas (`showReferences` en `components/load-calculator.tsx:1611`, `LineTablesDialog` en `components/line-modules.tsx:585` y la tabla 1 inline en `components/interior-panel.tsx:461`) más dos dialogs ad hoc (ITA `:1360`, simultaneidad `:1347`). El mecanismo con foco ya existe: `TableKey` (`line-modules.tsx:105-107`), `openLineTables(tables?)` (`load-calculator.tsx:304`) y `shows(key)` en `:590`, que **filtra** en vez de scrollear. El estado es local a `load-calculator` y se pasa por props; no hay context en `components/`. La tabla del coeficiente de simultaneidad está duplicada (dialog `:1353` y dentro de `showReferences` `:1634`). El ITA no está en ninguna de las tres superficies. Etiquetas de valor que nombran una tabla: `interior-panel.tsx:282`, `interior-administrative-card.tsx:99`, `rail-result.tsx:246` (`IGA (tabla A)`), `rail-result.tsx:208` y `:237` (`Iz de tabla`), `line-modules.tsx:342-355` (opciones), `interior-panel.tsx:340` (`mín. tabla N`).

L4 — la nota de `AGENTS.md` del repo y `lib/normative-tables.mjs` son la fuente de los valores; el registro `{key, title, doc, head, rows}` de `GUIDE_TABLES` (`lib/normative-tables.mjs:557`) sólo describe las seis claves de BT-14/BT-15, y las otras ocho son JSX a mano. Por eso Slice 2 suma las claves nuevas al registro en lugar de inventar un segundo mecanismo.

L5 — la entrega se parte en dos slices por tamaño de revisión, no por falta de decisión: unificar las tres superficies mueve el panel del rail, dos dialogs ad hoc y varios tests que hoy fijan ese estado, y eso es una revisión distinta de la de limpiar una etiqueta. Slice 1 usa el panel que ya existe —que ya contiene la tabla A— así que el botón no necesita foco nuevo. El foco (`TableKey` + `openLineTables`) ya existe para las tablas de `LineTablesDialog`, que es donde vive el `Iz` del rail.

L6 — la skill vive en `.agents/skills/normative-tables-ui/SKILL.md` y **no entra al repo**: `.gitignore:24` ignora `.agents/` y las otras 17 skills del proyecto tampoco están trackeadas (`git ls-files .agents` devuelve 0). Es estado local por diseño, igual que `skills-lock.json`. Por eso la convención durable para el equipo queda en este documento, que sí se trackea, y la skill queda para el agente.

L7 — `tests/lga-di-wiring.test.mjs:12` fijaba `'IGA (tabla A)'` sobre el fuente del rail, así que el rótulo nuevo rompía un pin fuera de las superficies del worker; lo actualicé el padre. El mismo archivo vigila cadenas de PDF que siguen diciendo `IGA (tabla A)` e `Iz de tabla` (`components/load-calculator.tsx:1181,1202,1207`): esas quedan por S8, y por eso el pin se actualizó sobre la etiqueta de la card y no sobre las del informe.

L8 — evidencia de cierre del slice 1: `node --test "tests/*.test.mjs"` 666/666 (658 previos + 8 nuevos), `npx tsc --noEmit` sin diagnósticos. Queda el slice 2 pendiente: unificar las tres superficies de tablas y migrar el ITA y la simultaneidad al panel compartido (T6-T8).

L9 — slice 2 entregado: `GUIDE_TABLES` pasa a 9 entradas (`T25-A`, `T10-CS`, `ITA` se suman a las seis de BT-14/BT-15), `TableKey` crece con esas tres claves, `LineTablesDialog` pasa a ser el panel único con `id="line-tables-dialog"` y título «Tablas y referencias», y se retiran `showReferences`, el dialog del ITA y el de la simultaneidad (`grep` da 0 ocurrencias de los tres estados). Los disparadores pasan por `openReferenceTable(key)`, que es `openLineTables([key])`. Las filas salen de las constantes existentes: `T25-A` usa `HOUSING_POWER_STEPS` por identidad y `T10-CS` deriva su fila de continuación de `ITC_BT_10_COEFFICIENTS` más `continuationStep`. `ITA_TYPES` se movió al lado de `ITA_POWER_KW` y el selector de ascensores ahora lee sus opciones de ahí, en lugar de repetir los seis nombres.

L10 — hubo que actualizar **nueve pines estructurales** en cuatro archivos de test que no estaban en las superficies del worker: conteos de diálogos 6 → 3 en `tests/dialog-a11y-regression.test.mjs` y `tests/shadcn-migration.test.mjs`, botones de acción 15 → 12, sitios de `.label` ≥ 11 → ≥ 8, `<Button` ≥ 30 → ≥ 28, `<Table` ≥ 5 → ≥ 3, `aria-label="Cerrar` ≥ 5 → ≥ 3, las celdas ITA re-apuntadas de `calc` a `modules`, y los pines de `openReferences` re-apuntados a `openReferenceTable`/`openLineTables`. Ninguna aserción se borró: todas eran conteos, y cada uno conserva su intención con el número o el blanco que corresponde a la estructura nueva.

L11 — consecuencias visibles que nadie pidió y se aceptan: `T25-A` imprime su columna de potencia siempre en W, sin seguir el ajuste W/kW, porque las filas del registro son agnósticas de unidad. Es coherente con la regla que el repo ya documenta —los vatios que la instrucción publica se quedan como están— pero es un cambio respecto del dialog anterior, que sí seguía el ajuste. Y las tarjetas móviles por tipo del ITA desaparecieron: la tabla del registro se lee con scroll horizontal.

L12 — la skill se corrigió después del commit del slice 2: sus anclas apuntaban a `showReferences` y `openReferences`, que el slice 2 elimina, y una skill desactualizada es peor que ninguna. Ahora nombra el panel único, el helper de foco y las claves válidas, y prohíbe explícitamente crear un `useState` de apertura para una tabla nueva. Sigue fuera de git: `.agents/` está ignorado.

L13 — evidencia de cierre del slice 2: `node --test "tests/*.test.mjs"` 675/675 (666 + 9 nuevos), `npx tsc --noEmit` sin diagnósticos, y `grep` confirma 0 ocurrencias de los tres estados de diálogo retirados en `components/load-calculator.tsx`.

L14 — sigue pendiente `mín. tabla N` en las celdas de la tabla 1 de Cuadros (`components/interior-panel.tsx`), que T8 no cubría porque no es una etiqueta de opción. Queda anotado en «Pendientes».
