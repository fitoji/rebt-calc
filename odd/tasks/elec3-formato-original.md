Objetivo: adaptar la vista ELEC-3 de la app al formulario oficial `public/MemoriaTecnicaELEC3.doc` (modelo G146NSIN-157-00): mismos campos y misma tabla.
Rama: feat/conductores-itc-bt-26 · Entrega: commits por unidad de trabajo · Runner: `pnpm test`, `pnpm typecheck`, `pnpm build`.

## Specs

S1. Usuario: «revisa @public/MemoriaTecnicaELEC3.doc , es el formulario elec3 orginial, y el nuestro es un poco diferente, adaptalo a que tenga los mismos campos que el .doc, la tabla que sea igual al doc tambien».

S2. Cabecera de la hoja 1 del impreso, literal: «Model ELEC 3 - MEMÒRIA TÈCNICA», «MEMÒRIA TÈCNICA», «NÚM.».

S3. Columnas de la tabla de la hoja 1, literales del `.doc`: «TRAM», «Càrrega simultàn. (%)», «Potència kW.», «cos ϕ», «Intens. A», «Secció per fase mm2», «Long. m», «Moment elec. kW. · m», «Caiguda de tensió» → «parcial (%)» / «total (%)», «Caract. conduct.» → «TIPUS» / «tensió nominal d’aïllam.», «Tipus de canalitzacions» → «sense tub protector (sistema)» / «sota tub: ∅ en mm.» → «encastat» / «sense encas.» / «conduct. enterrat. prof. m.», «Aïllam. Instal·l. kΩ», «Conduc. Neutre mm2», «Conduc. Protec. mm2».

S4. Filas de la tabla, literales: «Derivació individual (A — B)» y «DERIVACIONS» con «C — D», «E — F», «G — H», «I — J», «K — L», «M — N», «O — P», «Q — R», «S — T», «U — V», «W — X», «Y — Z».

S5. Pie de la hoja 1, literal: «OBSERVACIONS: Grau de protecció d’aparamenta i receptors en locals especials», «IP —».

S6. Campos de la hoja 2, literales: «TITULAR», «ÚS A QUE ES DESTINA LA INSTAL·LACIÓ», «SEGELL INSTAL·LADOR I EMPRESA INSTAL·LADORA AUTORITZATS», «EMPLAÇAMENT», «Núm.», «Pis», «Porta», «CARRER», «LOCALITAT», «N C P», «INSTAL·LACIÓ», «NOVA», «AMPLIACIÓ», «REFORMA», «INTERRUPTOR DIFERENCIAL», «Circuit», «Nombre», «In», «Sensibilitat», «EMPRESA DISTRIBUÏDORA», «RESISTÈNCIA TERRA DE PROTEC.», «CARACTERÍSTIQUES EDIFICI», «SUPERFÍCIE LOCAL m2», «SECCIÓ DE LA DERIVACIÓ INDIV. mm2», «Potència màxima admissible (1) kW», «TENSIÓ V», «Potència a instal·lar kW», «INTENSITAT INTERRUPTOR GENERAL AUTOMÀTIC A», «NOTA (1) És la màxima que pot suportar el conjunt de la instal·lació.», «DATA I SIGNATURA INSTAL·LADOR», «G146NSIN-157-00».

S7. Verificación: `pnpm test`, `pnpm typecheck`, `pnpm build`; los tests existentes del ELEC-3 se actualizan al contrato del impreso sin perder las reglas ya cubiertas (carga simultánea, caída total, cos φ, tensión de aislamiento, neutro/PE, canalización).

S8. Usuario: «quiero el elec3 en castellano, pero guarda la version catalan para cuando mas adelante agreguemos features de descargar elec3 en castellano o catalan». El preview se muestra en castellano por defecto; todos los rótulos viven en un diccionario con las dos versiones y la vista admite elegir locale para futuras descargas.

## Tasks

- [x] T1 (S1-S7, inline): adaptar la hoja 1 del preview al impreso — cabeceras agrupadas, rótulos literales, filas por letras, NÚM y OBSERVACIONS.
- [x] T2 (S1, S6-S7, inline): adaptar la hoja 2 del preview a los campos y el orden literales del impreso.
- [x] T3 (S7, inline): actualizar tests y ayuda; verificación completa.
- [x] T4 (S8, inline): diccionario `es`/`ca` de todos los rótulos del impreso, preview en castellano por defecto con prop de locale, tests de ambos idiomas.

Route: inline; no hay writers paralelos ni cambio de alto riesgo fuera del contrato del documento (cambio pedido explícitamente).

## Log

L1: «revisa @public/MemoriaTecnicaELEC3.doc , es el formulario elec3 orginial, y el nuestro es un poco diferente, adaptalo a que tenga los mismos campos que el .doc, la tabla que sea igual al doc tambien»

- El `.doc` es un OLE Word de 2 páginas; se leyó con `textutil -convert txt`. La hoja 1 tiene cabeceras en dos niveles y 19 celdas de datos; la hoja 2añade SEGELL, CARACTERÍSTIQUES EDIFICI, NOTA (1) y DATA I SIGNATURA, que la app no tenía.
- Se conservaron las 19 columnas y las reglas ya cubiertas; cambiaron los rótulos a los literales del impreso y se agruparon las cabeceras con `rowSpan`/`colSpan`. Los `ELEC3_COLUMNS` siguen siendo la fuente de las celdas; `ELEC3_HEADER_GROUPS` describe la agrupación.
- Las filas se rotulan `A — B` y `C — D` … `Y — Z` en el preview, sin tocar los ids del documento. Se añadieron `num` e `ip` al modelo como campos del impreso, sin dato en la app (pendientes).
- Verificación: `pnpm test` 711/711, `pnpm typecheck` limpio, `pnpm build` correcto.
- 2026-11-17 · L2: «quiero el elec3 en castellano, pero guarda la version catalan para cuando mas adelante agreguemos features de descargar elec3 en castellano o catalan». Reabre T4: los rótulos pasan a un diccionario de dos idiomas; el castellano es la vista por defecto y el catalán se conserva íntegro.
- T4 cerrado: `lib/elec3-i18n.mjs` guarda `ELEC3_TEXT.es` y `ELEC3_TEXT.ca` con todas las cadenas del impreso; `ELEC3_COLUMNS` ya no lleva rótulos y `ELEC3_HEADER_GROUPS` solo lleva claves. El dialog acepta `locale` (por defecto `es`) y `Sheet2` recibe el diccionario. Verificación: 712/712 tests, typecheck limpio, build correcto.
