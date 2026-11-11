# Inspección inicial según la ITC-BT-05 §4.1

Objetivo: que la página `/requisitos` diga si la instalación, una vez ejecutada, será objeto de inspección inicial, evaluando la lista de la ITC-BT-05 §4.1 grupo a grupo contra la previsión ya guardada. Rama: `main`. Entrega: commits por work unit, push directo a `origin/main` (decisión del usuario). Test runner: `node --test tests/*.test.mjs` + `npx tsc --noEmit`.

## Specs

S1. **Lista de inspección inicial de la ITC-BT-05 §4.1**, transcrita del usuario: a) Instalaciones industriales que precisen proyecto — Potencia instalada > 100 kW; b) Locales de pública concurrencia — Sin límite; c) Locales con riesgo de incendio o explosión, de clase I — Excepto aparcamientos o estacionamientos de menos de 25 plazas; d) Locales mojados — Potencia instalada > 25 kW; e) Piscinas — Potencia instalada > 10 kW; f) Quirófanos y salas de intervención — Sin límite; g) Instalaciones de alumbrado exterior — Potencia instalada > 5 kW; h) Estaciones de recarga para vehículo eléctrico que requieran proyecto — Sin límite (el que el proyecto sea necesario ya filtra).

S2. **Veredicto evaluado, no mensaje estático**: el usuario eligió que la página evalúe su instalación, no que muestre solo la tabla. Criterio de aceptación: cada grupo se decide contra la previsión guardada y la página devuelve si la instalación entra en la lista.

S3. **Una sola fuente de verdad**: la lista se declara una vez en el registro normativo (`inspection.initial`, con su cita) y de ahí salen el clasificador, la tabla y los textos; la página no añade cifras propias.

## Supuestos asumidos (a rever si cambia el modelo de datos o la normativa)

A1. **«Potencia instalada» de los grupos a) y d) es la potencia total prevista (P)**, no una potencia por local. Motivo: el modelo de datos solo guarda la potencia total del edificio; no hay potencia por local mojado ni por instalación industrial. Si algún día se modela la potencia por local, estos dos grupos deben pasar a comparar la potencia de los locales concernés.

A2. **La exención de aparcamientos de menos de 25 plazas del grupo c) no necesita datos adicionales**. Motivo: el flag `fireRisk` ya excluye los aparcamientos según la semántica de la ITC-BT-04 §3.1 l («Locales con riesgo de incendio o explosión, excepto aparcamientos»), de modo que la inspección de un aparcamiento con riesgo de incendio no se puede derivar del modelo actual. Consecuencia asumida: si el requisito de la comunidad autónoma exige inspeccionar aparcamientos con riesgo de incendio, hace falta un flag nuevo.

A3. **Los grupos a) y h) dependen del veredicto de proyecto de la ITC-BT-04**, no de reglas propias: se reutiliza `classifyDocumentation(...).verdict === 'proyecto'` en lugar de duplicar los criterios del §3.1. Consecuencia asumida: un proyecto que la página clasifique como memoria técnica nunca dispara inspección por estos dos grupos.

A4. **El grupo c) se evalúa sin distinguir «clase I»**. Motivo: el modelo de datos guarda un único flag binario de riesgo de incendio o explosión, sin clase.

## Tasks

T1 · ✅ Entrada `inspection.initial` en el registro normativo con la cita y los ocho grupos — commit `0fb34bc`
T2 · ✅ `lib/inspection.mjs`: clasificador de la lista de §4.1 sobre la previsión y la documentación — commit `0fb34bc`
T3 · ✅ Sección «Inspección inicial» en `/requisitos` con veredicto, grupos decisivos y tabla completa — commit `0fb34bc`
T4 · ✅ Tests: `tests/inspection.test.mjs` (12 casos, umbrales y grupos) y aserción de página en `tests/requisitos-page.test.mjs` — commit `0fb34bc`
T5 · ✅ Docs: README (descripción y tabla de tests) y página `/ayuda` — commits `0fb34bc`, `91fd472`

## Log

L1 — pedido del usuario, verbatim: «ahora en /requisitos, quiero agregar un mensaje de los proyectos que requieren inspeccion inicial, segun rebt: Las instalaciones sujetas a inspección inicial (ITC-BT-05, 4.1) "Serán objeto de inspección, una vez ejecutadas las instalaciones, sus ampliaciones o modificaciones de importancia y previamente a ser documentadas ante el órgano competente…"» seguido de la tabla a)–h).

L2 — decisión del usuario: «Evaluar la instalación (Recomendado)». Descarta la opción de mensaje estático; la página clasifica la instalación.

L3 — supuestos asumidos A1–A4, dejados explícitos para revisarlos si cambia el modelo de datos o entra una revisión normativa.

L4 — verificación 2026-11-11: `node --test tests/*.test.mjs` 520/520 y `npx tsc --noEmit` limpio. Riesgo: none (módulo y sección nuevos; el único test existente tocado fijaba la línea de fuente de la página, que ahora cita también la ITC-BT-05 §4.1).
