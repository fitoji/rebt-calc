# ICP en calibre normalizado

Objetivo: que el ICP que muestra la app sea un calibre de la serie normalizada (1,5 · 3 · 3,5 · 5 · 7,5 · 10 · 16 · 20 · 25 · 32 · 40 · 50 · 63 A) y no la corriente cruda que implica la potencia contratada. Rama: `feat/icp-normalizado`. Test runner: `node --test tests/*.test.mjs` + `npx tsc --noEmit`.

## Specs

S1. **Pedido del usuario**, verbatim: «cuando modifico potencia contratada, el valor del icp hace la cuenta y me da el numero, pero el numero tiene que ser un valor de icp normalizado, 16a, 25a , etc». Criterio de aceptación: al cambiar la potencia contratada, el ICP que se lee es un calibre de la serie, no un decimal.

S2. **La serie es la de potencias de contratación normalizadas por ICP**: 1,5 · 3 · 3,5 · 5 · 7,5 · 10 · 16 · 20 · 25 · 32 · 40 · 50 · 63 A, que a 230 V monofásico corresponden a 345 · 690 · 805 · 1.150 · 1.725 · 2.300 · 3.680 · 4.600 · 5.750 · 7.360 · 9.200 · 11.500 · 14.490 W.

S3. **Es la serie moderna, no la del ICP-M antiguo.** Hay dos listas en circulación y difieren justo en los calibres que importan: la antigua trae 15 · 30 · 35 · 45 A y no trae 32; la moderna trae 16 y 32 y no trae 15 · 30 · 35 · 45. La serie moderna es la única compatible con la tabla A que la app ya usa (`HOUSING_POWER_STEPS`, 5.750/25 · 7.360/32 · 9.200/40 · 11.500/50 · 14.490/63), así que la elección no es de gusto: la fija el propio registro del proyecto.

S4. **Se redondea hacia arriba, nunca hacia abajo.** El ICP no puede quedar por debajo de la potencia contratada: el calibre es el menor de la serie que sea mayor o igual que la corriente calculada.

S5. **El redondeo tolera el error de coma flotante.** El calibre es el menor que cumpla `rating + 1e-9 >= current`. La tolerancia **no** es necesaria para los trece escalones de la tabla, que dan exactos en V8 (medido: los trece con delta 0, incluido 14.490/230 = 63); es defensa para el caso general, porque el cociente depende de `voltageV` y `cosPhi` y con `cosPhi ≠ 1` un valor que debería caer justo sobre un calibre puede quedar una pizca por encima y saltar al siguiente. Se conserva por eso, no porque el escalón máximo la necesite.

S6. **Por encima del último calibre no se inventa nada.** Si la potencia contratada supera 14.490 W (63 A), no hay calibre de la serie: se muestra la corriente calculada y se avisa que queda fuera de la serie normalizada. No se acota ni se recorta el valor.

S7. **El calibre se corrige en todos los lugares donde se lee el ICP**, no solo en la card: la card del DGMP, la tabla de instalaciones interiores, la página 10 de la memoria PDF y el paso didáctico del cálculo.

S8. **Se conservan las dos cifras.** `icpCurrentA` sigue siendo la corriente que implica la potencia contratada, y se agrega `icpRatingA` con el calibre. El calibre es el que se lee como ICP; la corriente queda como dato de cálculo en el modo didáctico, para que se vea la cuenta. Ningún consumidor existente de `icpCurrentA` deja de recibirlo.

S9. **Una sola fuente.** La serie vive en el registro normativo (`lib/normative-tables.mjs`) con su cita; ni `interior-installation.mjs` ni los componentes reescriben la lista.

S10. **La documentación deja de decir que el ICP no es un calibre.** `components/help-doc.tsx` afirma hoy: «el ICP se muestra como la intensidad que implica la potencia contratada, no como un calibre inventado», y esa frase queda en contradicción con S1. Se reescribe: el calibre normalizado no es inventado, sale de la serie.

## Supuestos asumidos (a rever si cambia el modelo de datos o la normativa)

A1. **La serie arranca en 1,5 A aunque una vivienda nunca baje de 25 A.** Se carga completa porque el ICP también existe en locales y servicios generales, y recortarla obligaría a decidir un mínimo arbitrario por tipo de suministro.

A2. **El ICP es un dispositivo, no un cálculo.** La función actual documenta lo contrario (`icpCurrentFor`: «It is a current, not a device rating»), y el comentario se corrige junto con la función: la corriente sigue siendo un cálculo, pero lo que el proyecto especifica es un calibre.

A3. **No se modela la potencia contratada en escalones.** El campo sigue admitiendo cualquier valor en vatios: el usuario conserva la libertad de escribir, y el calibre se deriva. Encofrar el campo a una lista sería otro cambio, no pedido.

## Tasks

- [x] T1 · Entrada de la serie en el registro normativo con su cita · S2, S3, S9 · commit `8b68346`
- [x] T2 · `icpRatingFor(currentA)` y `icpRatingA` en `evaluateInterior`, con tolerancia · S4, S5, S8 · commit `8b68346`
- [x] T3 · Card del DGMP: calibre como ICP, corriente como contexto · S1, S6, S7, S8 · commit `8b68346`
- [x] T4 · Tabla de instalaciones interiores y página 10 de la memoria PDF · S7 · commit `8b68346`
- [x] T5 · Paso didáctico del cálculo: mostrar el redondeo al calibre · S7, S8 · commit `8b68346`
- [x] T6 · Textos de `/ayuda` y nota de fuente de la card · S6, S10 · commit `8b68346`
- [x] T7 · Tests: serie completa, redondeo hacia arriba, los cinco escalones de la tabla A, 14.490 W → 63 A, fuera de serie, entrada vacía o negativa · S2–S6, S8 · commit `8b68346`

## Pendientes

Ninguno propio. La automatización de la ITC-BT-25 §2.3.2 sigue anotada en `odd/tasks/aviso-electrificacion-elevada.md`, sección «Pendientes».

## Log

L1 — pedido del usuario, verbatim: «cuando modifico potencia contratada, el valor del icp hace la cuenta y me da el numero, pero el numero tiene que ser un valor de icp normalizado, 16a, 25a , etc».

L2 — evidencia recogida antes de escribir: `lib/interior-installation.mjs:89` (`icpCurrentFor`) devuelve `contractedPowerW / (voltageV * cosPhi)` sin normalizar y su propio comentario aclara que es «a current, not a device rating»; `evaluateInterior` lo expone como `icpCurrentA` (`:143`) y lo leen cuatro lugares: `components/interior-panel.tsx:297` (`toFixed(1)`), `components/load-calculator.tsx:969` (tabla), `components/load-calculator.tsx:1204` (memoria PDF) y `lib/calculation-explanations.mjs:575-576` (paso didáctico). Test existente: `tests/interior-installation.test.mjs`.

L3 — la serie se verificó contra las potencias de contratación normalizadas por ICP publicadas por PLCMadrid (ficha «Potencias normalizadas de contratación») y contra la norma `UNE 20-317` para ICP-M. La lista antigua del ICP-M (1,5 · 3 · 3,5 · 5 · 7,5 · 10 · 15 · 20 · 25 · 30 · 35 · 40 · 45 · 50 · 63) no incluye 32 A, y `lib/normative-tables.mjs:418-424` ya fija el escalón de 7.360 W en 32 A: la serie moderna queda forzada por el registro existente, no por preferencia.

L4 — corrección de una afirmación equivocada de esta spec: medí los trece cocientes en V8 y todos dan exactos (delta 0, incluido 14.490/230 = 63). La tolerancia de S5 se conservó igual, pero por el motivo correcto —protege el caso general con `cosPhi ≠ 1`, no el escalón máximo— y no porque 63 A la necesite.

L5 — desvíos de la implementación respecto de la spec, todos aceptados: (1) T6 pedía escribir la serie en `/ayuda` y en la nota de fuente, y S9 prohíbe que los componentes la reescriban; se resolvió derivando el texto de `ICP_RATINGS` importado, con el único literal en `lib/normative-tables.mjs`. (2) La etiqueta de la celda decía «ICP · intensidad de la potencia contratada», que deja de ser cierto cuando el valor ya no es una intensidad: pasa a «ICP · calibre de la potencia contratada». (3) El paso didáctico imprime `25,00 A → ICP 25 A` porque usa el formateador de dos decimales del archivo; el calibre sí se imprime entero. (4) Como la serie arranca en 1,5 A, cualquier corriente por debajo de 1,5 A resuelve a 1,5 A: es consecuencia asumida de A1, no un error.

L6 — evidencia de cierre: `node --test "tests/*.test.mjs"` 647/647 (638 previos + 9 nuevos), `npx tsc --noEmit` sin diagnósticos. La suite previa de 638 casos sigue en verde, así que ningún consumidor de `icpCurrentA` cambió de resultado.
