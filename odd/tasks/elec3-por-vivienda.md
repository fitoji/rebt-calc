# ELEC-3 por vivienda desde la pestaña Cuadros

Objetivo: el ELEC-3 deja de ser una vista del JSON exportado y pasa a ser el documento
legal de **cada vivienda**, generado desde el estado vivo del proyecto y abierto desde la
card «Instalaciones interiores».

Branch: `feat/elec3-por-vivienda`. Delivery: work-unit commits. Test runner: `node --test tests/*.test.mjs`.

## Specs

S1. Texto del usuario, pedido original:

> bien , sigamos con otra cosa , el boton ver elec-3 en realidad es un formulario de la generalitat para cargar por cada di y los circuitos de una vivienda, por lo que tendriamos que poner un boton "ver elec 3 dentro de cuadros, instalaciones interiores, y cargue los datos de cada vivienda y ver un elec-3 por cada vivienda, como lo ves? revisa la pagina canalempresa.gencat.cat para buscar mas info

S2. Un ELEC-3 por vivienda, alimentado por el estado vivo del proyecto. Texto del usuario:

> cargue los datos de cada vivienda y ver un elec-3 por cada vivienda

S3. Idioma de la hoja: castellano ahora; catalán cuando exista descarga en DOC/PDF. Texto del usuario:

> hagamos la en castellano , pero luego cuando hagamos implementacion de poder descargarla en doc o pdf que podamos hacerlo en catalan tambien

S4. Ubicación del botón. Texto del usuario:

> en cuadros, card instalaciones interiores, al lado del select de viviendas

S5. Alcance de esta entrega (elección del usuario): **hoja 1 + hoja 2 administrativa**. La descarga
Excel/CSV/PDF y el idioma catalán quedan fuera de esta entrega (S3).

S6. El provisorio «Ver ELEC-3» bajo «Cargar proyecto» se **reemplaza**: un solo camino, el de Cuadros.

S7. Antes de agregar circuitos se **unifica** el modelo: una sola implementación que la app y el
subproyecto `data/memoria_tecnica` consuman.

S8. Modelo vigente: `G146NSIN-157-00`, edición 2024. Verificado el 2026-11-15 contra el archivo que
sirve hoy la Generalitat: byte a byte idéntico, 339 456 bytes, `sha256 b0c27ef3…`. Estructura:
hoja 1 = una fila `A — B` (derivación individual) + doce filas `C — D` … `Y — Z` (circuitos); hoja 2 =
datos administrativos + tres filas de interruptor diferencial.

S9. Celdas que la app no puede rellenar se marcan pendientes, nunca se estiman (regla ya vigente en
el proyecto, `PENDING_CELLS`).

## Cortes de entrega

- **Corte 1 — capa de modelo** (commits `f82c25f`, `84f3c28`, `dd1f962`): documento de la feature, modelo
  unificado en `lib/elec3.mjs` y `buildDwellingDocument` con su test. Es revisable solo: no toca UI ni
  estado y la suite de ELEC-3 queda verde por sí misma. 644 líneas autoradas acumuladas, por encima de
  la unidad de revisión de ~400, así que el corte se cierra acá.
- **Corte 2 — hoja 2 y estado** (T3): bloque administrativo del modelo + campos nuevos de `ProjectInfo`,
  sin UI. Cierra con su propio commit.
- **Corte 3 — UI** (T4, T5): botón junto al selector de vivienda, borrado del provisorio, render de la
  hoja 2 y actualización de los tests que pinnean el cableado.

## Tasks

- T1 — Unificar el modelo ELEC-3 en `lib/elec3.mjs` (castellano, único) y dejar
  `data/memoria_tecnica` consumiéndolo sin lógica propia.
- T2 — `buildDwellingDocument()`: hoja 1 por vivienda (fila de la DI + filas de circuitos de la
  ITC-BT-25), con tests RED primero.
- T3 — Hoja 2 administrativa: campos nuevos en `ProjectInfo` + los que ya derivan del motor
  (IGA, potencias, tensión, tres diferenciales).
- T4 — UI: botón en la card «Instalaciones interiores», junto al selector de vivienda; borrar el
  provisorio bajo «Cargar proyecto» y su lectura de JSON ajeno.
- T5 — Tests que pinnean el cableado (a11y, rail, elec3) y documentación.

## Log

- L1 (usuario, verbatim) — ver S1. Pidió revisar `canalempresa.gencat.cat`.
- L2 (2026-11-15) — Hallazgos de la revisión:
  - `canalempresa.gencat.cat`: la página de formularios se renderiza por JS y no lista los modelos en
    el HTML. La página «documentación que debe disponer el titular» sí nombra «Modelo ELEC-3. Memoria
    Técnica» dentro de la memoria técnica de diseño de la instalación, y aclara que la **conserva el
    titular** toda la vida útil: no se adjunta a la declaración responsable (lo que se adjunta es el
    anexo de la declaración).
  - El modelo local `data/documentacion/elec3_model_memoria_tecnica_2024.doc` es idéntico al que
    sirve hoy la Generalitat (S8), así que la edición 2024 es la vigente.
  - `odd/tasks/elec3-cobertura.md` ya había concluido lo mismo: «un ELEC-3 es una instalación… el
    puente natural no es un ELEC-3 por proyecto: es un ELEC-3 por derivación».
- L3 (usuario, decisiones) — S3 idioma castellano con catalán diferido; S4 ubicación en la card junto
  al selector de viviendas; S5 alcance hoja 1 + hoja 2; S6 reemplazar el provisorio; S7 unificar antes
  de extender.
- L4 (2026-11-15) — Mapa de superficies verificado antes de tocar código:
  - `lib/elec3.mjs` (229 líneas) es la copia provisional en castellano; expone `buildDocument(data)`,
    `readCalculatorExport(text)`, `ELEC3_COLUMNS` (16), `PENDING_CELLS` (3).
  - `data/memoria_tecnica/src/lib/elec3.ts` es la canónica en catalán: mismas funciones y mismas 16
    columnas de fila, pero difiere en **salida**, no en formato: `KIND_LABELS` (VIVIENDA/VIVENDA),
    textos de canalización, locale de fecha (`es-ES`/`ca-ES`), los cinco mensajes de error, las 16
    cabeceras, la unidad de `width` (px vs Excel) y las etiquetas de `PENDING_CELLS`. Unificar cambia
    la salida del subproyecto.
  - `data/memoria_tecnica` está versionado (23 archivos, commits `570f0ad`, `febca39`) aunque el
    `.gitignore` declare `data/`; el subproyecto es un starter Vite con `exceljs` como dependencia que
    la app principal no tiene.
  - `components/interior-panel.tsx` es la card «Instalaciones interiores» (h3 en L120) y ya tiene el
    `<Select>` de viviendas: es el lugar de S4. Recibe `dwellings`, `selectedId`, `onSelect`,
    `onChange`, y calcula los circuitos con `housingCircuitsFor(dwelling.powerW, { hasIrve })`.
  - Las viviendas **no** son suministros de la pestaña Cuadros: `InteriorCircuitsPanel` se alimenta de
    `derivations.filter(d => d.kind !== 'dwelling')`, y los circuitos de vivienda usan otro motor
    (`housingCircuitsFor` + `housingCircuitSizing`), no `CircuitRow`/`sizeInteriorCircuit`.
  - `ProjectInfo` = `{ companyName, companyAddress, workAddress, phone, email, logo }`, vive en
    `localStorage` (`electrocalc-project-info`), **fuera** del snapshot v5; `readProjectInfo()` pone
    `''` en las claves ausentes, así que sumar campos de texto no exige subir la versión del snapshot.
  - Tests que pinnean el cableado actual: `tests/elec3.test.mjs` (castellano, `ELEC3_COLUMNS.length === 16`,
    botón «Ver ELEC-3» después de «Cargar proyecto»), `tests/dialog-a11y-regression.test.mjs` (cuenta 6
    diálogos y 16 botones de ancho completo en `load-calculator.tsx`), `tests/project-rail.test.mjs`
    (el diálogo debe seguir siendo un elemento propio del rail).
- L5 (2026-11-15) — T1 hecho. `lib/elec3.mjs` es la única implementación; se le quitó la cabecera de
  «copia provisional» y se le anotó el contrato que le faltaba (`ELEC3_COLUMNS.key` y
  `PENDING_CELLS.key` son `keyof Elec3Row`, sin eso el consumidor tipado indexa con `string` y falla).
  `data/memoria_tecnica/src/lib/elec3.ts` pasa a ser una fachada de 16 líneas que re-exporta el `.mjs`
  y no repite lógica; su `tsconfig.app.json` gana `allowJs`. Consecuencia asumida: la hoja del
  subproyecto ahora sale en castellano (S3), antes salía en catalán.
  Verificado: `npm run typecheck` del subproyecto en 0 (partiendo de un basamento también en 0) y
  `node --test tests/elec3.test.mjs` con 7/7 en verde.
- L6 (2026-11-15) — T2 hecho. `buildDwellingDocument(input)` en `lib/elec3.mjs`: fila `A — B` de la
  derivación individual + una fila por circuito, reutilizando el mismo mapeo de `buildRow`,
  `splitCable` y `canalizacion`. El modelo sigue sin calcular: la sección, la caída y el momento
  llegan ya resueltos; el `cosPhi` de un circuito queda en `null` cuando no viene, nunca se asume 1.
  Tope de las doce filas del modelo: si hay más circuitos se emiten los doce primeros y el documento
  declara `circuitsBeyondModel` con lo que no cupo. Tests nuevos en `tests/elec3-dwelling.test.mjs`
  (7), RED observado antes de implementar (`does not provide an export named 'buildDwellingDocument'`)
  y 14/14 junto con los preexistentes de `tests/elec3.test.mjs`.
  Decisión no fijada por la spec y asumida: la etiqueta de la vivienda no se escribe en la fila de la
  DI — esa fila dice literalmente «Derivación individual», como el impreso.
