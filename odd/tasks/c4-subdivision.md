# C4 subdivisión opcional en circuitos de la vivienda

Branch: `feature/c4-subdivision` · Delivery strategy: `ask-on-risk` · Runner: `pnpm test` + `pnpm typecheck` (build no type-check: `ignoreBuildErrors: true`)

## Specs

S1. Solicitud original del usuario (verbatim): «bien, ahora pensemos como podemos resolver en cuadros, la tabla de circuitos de la vivienda, c4 opcionalmente de puede reconfigurando dividiendola en 3, c4.1 c4.2 y c4.3 , pienso que poner un check box que diga subdividir, o algo asi utiliza skill impeccable para decidir». Alcance: la tabla de circuitos de la vivienda en Cuadros/Interiores. Aceptación: C4 puede pasar a 3 circuitos independientes denominados C4.1/C4.2/C4.3; el control NO es un checkbox.

S2. Corrección normativa del usuario (verbatim): «revisa la itc bt 25 en la tabla 1 , caracteristicas electricas de los circuitos, ahi esta especificada la subdivision opcional». Texto verificado de la nota (8) de la tabla 1 de la ITC-BT-25: «Los fusibles o interruptores automáticos no son necesarios si se dispone de circuitos independientes para cada aparato, con interruptor automático de 16 A en cada circuito.» Aceptación: cada rama independiente se dimensiona con PIA de 16 A; se cita la nota (8), no sólo la nota (6) que hoy está en `C4.note`.

S3. Usuario (verbatim): «espera cuentame de dos circuitos independientes» y respuesta «Incluir 2 y 3 (Recommended)». Guía Técnica BT-25 (sep 03, rev. 1): «Según la nota 8 de la tabla 1 de la presente ITC-BT, en el circuito C4 (lavadora, lavavajillas y termo eléctrico) se recomienda el uso de dos o tres circuitos independientes, sin que esto suponga el paso a electrificación elevada ni la necesidad de disponer de un diferencial adicional.» Aceptación: modos 1 (default), 2 y 3; en modo 2 el proyectista elige cuál pareja agrupa (la norma no la prescribe); la toma del termo sigue presente aunque no haya termo; sin cambio de grado ni de IGA.

S4. Excepción de diferencial (verificada). Misma guía, para C1/C2/C5: «se debe instalar un interruptor diferencial adicional si el número total de circuitos es superior a 5.» Aceptación: el modo 2/3 de C4 NO incrementa el número de diferenciales; el desdoblamiento de C1/C2/C5 SÍ mantiene la regla anterior. Circuitos físicos (6/7) y base para diferenciales (5) son conceptos separados.

S5. Usuario (verbatim): «Confirmar dirección (Recommended)». Dirección confirmada: `RadioGroup` «C4 · configuración» con tres estados como pares, sin checkbox; en 2 y 3 la fila C4 pasa a cabecera de grupo con subfilas indentadas con longitud, PIA, sección, Ib y caída propias; texto auxiliar «No cambia el grado de electrificación»; `SourceNote` con nota (8) y enlace BOE. Al alternar modos se conservan longitudes y puntos tipados. Aceptación: un único par persistido (`c4Mode` + `c4Pair`) es la fuente de verdad, leída por UI, motor, ELEC-3, unifilar e informe PDF.

S6. Usuario (verbatim): «implementa». Aceptación: implementación completa con tests `node:test`, `pnpm typecheck` en verde, y sin cambios fuera de Cuadros/Interiores, ELEC-3, unifilar e informe. No se inventa sección: la nota (8) no la fija; se calcula por ITC-BT-19 y caída ≤ 3 %.

## Tasks

- T1 — S2,S3,S4 — inline — done (`bbb0660`) — Motor `lib/`: modelo de modo y pareja, ramas C4.x con PIA 16 A, excepción de diferencial; tests RED→GREEN (4/4), suite 717/717, typecheck OK.
- T2 — S5 — inline — pending — Persistencia `lib/calculator-storage.mjs`: validar/normalizar `c4Mode`/`c4Pair` y conservar projects antiguos; tests.
- T3 — S1,S5 — inline — pending — UI `components/interior-panel.tsx`: RadioGroup, subfilas, SourceNote y conservación de datos al alternar; tests de regresión.
- T4 — S2,S3 — inline — pending — Emisión en `lib/elec3-dwelling.mjs`, `lib/elec3.mjs`, `lib/unifilar.mjs` e informe PDF; tests.
- T5 — S5,S6 — inline — pending — Documentación (`components/help-doc.tsx`, `README.md` si aplica) y verificación final.

## Log

L1 (verbatim): «bien, ahora pensemos como podemos resolver en cuadros, la tabla de circuitos de la vivienda, c4 opcionalmente de puede reconfigurando dividiendola en 3, c4.1 c4.2 y c4.3 , pienso que poner un check box que diga subdividir, o algo asi utiliza skill impeccable para decidir»

- 2026-11-18 — Decisión de diseño con skill `impeccable` (modo Operate, mundo visual existente): no checkbox; control dentro de la fila C4. Superficie sin `DESIGN.md`; `PRODUCT.md` rige (español permanente, local-first, trazabilidad normativa, «one formula, one place»).
- 2026-11-18 — Corrección del usuario (verbatim): «revisa la itc bt 25 en la tabla 1 , caracteristicas electricas de los circuitos, ahi esta especificada la subdivision opcional». Verificado en el texto íntegro de la ITC-BT-25: nota (6) = derivaciones de 2,5 mm² desde caja del circuito de 4 mm²; nota (8) = circuitos independientes con 16 A. Mi recomendación inicial de «derivaciones» era incorrecta; corregida con la cita.
- 2026-11-18 — Error propio corregido: el brief inicial decía que con 7 circuitos había 2 diferenciales por `ceil(7/5)`. La Guía BT-25 exceptúa explícitamente a C4: dos o tres circuitos independientes «sin [...] la necesidad de disponer de un diferencial adicional». Regla distinta para C1/C2/C5. Corregido en la memoria `design/c4-subdivision`.
- 2026-11-18 — Usuario confirmó (verbatim): «Incluir 2 y 3 (Recommended)». Alcance cerrado con los tres modos y selector de pareja en el modo 2.
- 2026-11-18 — Usuario (verbatim): «implementa». Sin RDD: `gentle-ai review mode status` → off (clone_local). Rama creada desde `main` (`998d7dc`).
