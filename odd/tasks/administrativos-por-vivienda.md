# Datos administrativos por vivienda en su propia card

Objetivo: sacar los datos administrativos de la card de Instalaciones interiores (pestaña Cuadros) y llevarlos a una card propia en la pestaña Administrativos, que se navega por vivienda igual que la de Cuadros y muestra la identidad de la instalación (IGA y compañía) en lugar de los controles de potencia. Rama: `feat/administrativos-por-vivienda`. Test runner: `node --test tests/*.test.mjs` + `npx tsc --noEmit`.

## Specs

S1. **Pedido del usuario**, verbatim: «ahora quiero que la parte de dtos adminisitrativos del card de instalaciones interiores moverla a un card en el tab administrativos que sea como el de cuadros, donde puedo navegar por vivienda y cambiar los datos administrativos en vez de potencia contratada ver iga , etc como en el card de instalaciones interiores».

S2. **Se mueve, no se duplica.** Los campos administrativos dejan de renderizarse dentro de la card de Cuadros. No quedan dos lugares donde editarlos.

S3. **La card nueva vive en la pestaña Administrativos** y se navega por vivienda con el mismo armazón que la de Cuadros: selector de vivienda y botones anterior/siguiente, con el nombre de la vivienda a la vista.

S4. **Muestra la identidad de la instalación, no los controles de potencia.** La franja de datos de la card nueva lleva escalón de potencia, IGA de la tabla A, potencia máxima admisible y diferenciales exigidos. **No** lleva potencia contratada, ICP ni protección contra sobretensiones: esos siguen en Cuadros, porque son decisiones de diseño de la instalación y no datos administrativos.

S5. **El camino del dato no cambia.** Los valores siguen guardándose en `derivation.administrative` y la hoja 2 del ELEC-3 se sigue imprimiendo igual, con la misma herencia del titular del proyecto. Esta entrega mueve la interfaz, no el modelo.

S6. **Sin viviendas, la card explica por qué está vacía** en lugar de romperse, con el mismo criterio que la card de Cuadros.

S7. **La ayuda dice dónde están ahora.** `components/help-doc.tsx` describe hoy los datos administrativos dentro de la card de Cuadros y tiene que pasar a describirlos en la pestaña Administrativos.

S8. **Una sola definición de los campos.** El bloque de campos se extrae a un componente propio y lo consume la card nueva; no se copia el mapa `ADMINISTRATIVE_FIELDS` ni se duplica el formulario.

## Supuestos asumidos (a rever si molesta el comportamiento)

A1. **La navegación por vivienda es independiente de la de Cuadros.** Cada card tiene su propia vivienda seleccionada, como ya pasa con `InteriorCircuitsPanel` y su `selectedSupplyId`. Motivo: cambiar de pestaña no debe mover la vivienda que estabas mirando en la otra card, y así la card nueva no toca el estado que hoy gobierna Cuadros.

A2. **El botón «Ver ELEC-3» viaja con la card.** Los campos que se editan son la hoja 2 de ese documento, así que el atajo tiene sentido al lado de los campos y no en Cuadros, donde ya no están.

A3. **La pista de herencia del titular se conserva tal cual**, incluidos los tres textos (titular propio declarado, proyecto sin titular, titular heredado del proyecto).

A4. **La card se ubica después de los bloques de proyecto de la pestaña Administrativos**, porque es la parte que depende de que existan derivaciones de vivienda y los bloques de empresa y proyecto son la cabecera natural del documento.

## Tasks

- [x] T1 · Extraer el bloque de campos administrativos a un componente exportado, fuera de `interior-panel.tsx` · S8 · commit `685fcd2`
- [x] T2 · Card nueva con selector, navegación, franja de identidad (escalón, IGA, P máx., diferenciales) y estado vacío · S3, S4, S6 · commit `685fcd2`
- [x] T3 · Quitar los campos de la card de Cuadros y limpiar los props que quedan sin uso, sin romper la selección que hoy comparten Cuadros y circuitos · S2 · commit `685fcd2`
- [x] T4 · Montar la card en la pestaña Administrativos con su propio estado de vivienda y el cambio de datos administrativos · A1, A2, A4 · commit `685fcd2`
- [x] T5 · Verificar que la hoja 2 del ELEC-3 no cambia de salida · S5 · commit `685fcd2`
- [x] T6 · Ayuda y tests · S7, S8, A3 · commit `685fcd2`

## Slice

La rama está apilada sobre `feat/icp-normalizado`, así que el conteo desde `origin/main` suma las dos features: 642 líneas en 3 commits. Esta feature sola es el commit `685fcd2`, con ~320 líneas autoradas. Los dos slices tienen que mergearse en orden.

## Pendientes

Ninguno propio. La automatización de la ITC-BT-25 §2.3.2 sigue anotada en `odd/tasks/aviso-electrificacion-elevada.md`, sección «Pendientes».

## Log

L1 — pedido del usuario, verbatim: «ahora quiero que la parte de dtos adminisitrativos del card de instalaciones interiores moverla a un card en el tab administrativos que sea como el de cuadros, donde puedo navegar por vivienda y cambiar los datos administrativos en vez de potencia contratada ver iga , etc como en el card de instalaciones interiores».

L2 — evidencia recogida antes de escribir: `InteriorAdministrativeFields` es una función privada de `components/interior-panel.tsx:567` que se renderiza en la card de Cuadros en `:309`, y usa `ADMINISTRATIVE_FIELDS`, `InteriorAdministrative` y la herencia de `projectTitular`. La pestaña Administrativos monta hoy solo `AdministrativePanel` (`components/administrative-panel.tsx:151`, empresa instaladora y datos del proyecto, ambos a nivel de proyecto) desde `components/load-calculator.tsx:1553`. La selección de vivienda vive en `load-calculator` y llega a Cuadros como `effectiveDwellingId`/`setSelectedDwellingId` (`:1540`), mientras `InteriorCircuitsPanel` ya usa una selección propia (`selectedSupplyId`), que es el precedente de A1. El handler de datos administrativos es `updateDerivationAdministrative`.

L3 — la rama se crea sobre `feat/icp-normalizado` y no sobre `main`, porque esa rama todavía tiene dos commits sin mergear (la normalización del ICP). Queda apilada y hay que mergear en orden.

L4 — desvíos de la implementación respecto de la spec, todos aceptados: (1) S7 partía de una premisa falsa: `components/help-doc.tsx` no decía que los datos administrativos se editaran en Cuadros, ni siquiera mencionaba esos campos; la afirmación «en Cuadros» vivía en la prosa de `components/administrative-panel.tsx`, y el párrafo de ayuda de Cuadros decía en falso que el número de circuitos se editaba a mano. Se corrigieron los dos y se agregó un párrafo en la sección `interiores` en vez de una sección nueva, porque `lib/help-sections.mjs` no estaba en las superficies y `tests/help-page.test.mjs` exige una sección renderizada por entrada del índice. (2) Hubo que exportar también `resolveInteriorInputs` desde `interior-panel.tsx`, no solo `stepLabel`. (3) El botón «Ver ELEC-3» se quedó en Cuadros además de aparecer en la card nueva: T3 solo autorizaba quitar `projectTitular` y `onAdministrativeChange`, y `tests/elec3.test.mjs` lo fija dentro de Cuadros. Tenerlo en los dos lados es defendible —los campos son la hoja 2 de ese documento— pero no es lo que decía A2. (4) `tests/power-units.test.mjs` necesitaba dos cambios: la card nueva lee una potencia, así que entra en `UI_POWER_FILES` y el conteo de paneles con `powerUnit` pasa de 6 a 7. Lo autorizó y lo hizo el padre, porque el archivo no estaba en las superficies del worker; el guard queda más estricto, no más laxo.

L5 — evidencia de cierre: `node --test "tests/*.test.mjs"` 658/658 (647 previos + 11 nuevos), `npx tsc --noEmit` sin diagnósticos. `tests/elec3-administrative.test.mjs` y `tests/administrative.test.mjs` siguen en verde **sin editarlos**, que es la prueba de S5.
