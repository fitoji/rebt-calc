# Aviso de electrificación elevada exigida por la ITC-BT-25 §2.3.2

Objetivo: que la app deje cargar cualquier dato (m², previsiones) pero avise con un toast de sonner cuando lo declarado como electrificación básica contradice la ITC-BT-25 §2.3.2. Rama: `feat/aviso-electrificacion-elevada`. Test runner: `node --test tests/*.test.mjs` + `npx tsc --noEmit`.

## Specs

S1. **No bloquea, avisa.** Pedido del usuario, verbatim: «quiero que haya libertad de completar por ejemplo metros2 pero avise con un mensaje , un sooner diciendo que segun tal itcbt tiene que ser electrificacion elevada». Criterio de aceptación: el campo acepta el valor igual; la app solo emite el aviso. Ningún dato se rechaza ni se corrige solo.

S2. **La regla es la del usuario**, verbatim: «segun itc bt 25 electrificacion basica no puede ser tener superficie util mayor a 160m2, tampoco prevision de ac o calefaccion electrica, ni siste de automatizacion ,no secadora». Texto normativo que se cita en el aviso (ITC-BT-25 §2.3.2, literal): «Es el caso de viviendas con una previsión importante de aparatos electrodomésticos que obligue a instalar más de un circuito de cualquiera de los tipos descritos anteriormente, así como con previsión de sistemas de calefacción eléctrica, acondicionamiento de aire, automatización, gestión técnica de la energía y seguridad o con superficies útiles de las viviendas superiores a 160 m².»

S3. **El mensaje nombra la ITC.** Pedido del usuario: «diciendo que segun tal itcbt». Criterio de aceptación: el texto del aviso cita la instrucción y la condición concreta que lo dispara, no un «valor inválido» genérico.

S4. **Mecanismo: `sonner` de shadcn.** Decisión del usuario, verbatim: «usa sooner de shadcn». Criterio de aceptación: `sonner` en `dependencies`, un `components/ui/sonner.tsx` al estilo del proyecto y un `<Toaster />` montado una vez en `app/layout.tsx`.

S5. **Superficie estricta.** El umbral es «superior a 160 m²»: 160,0 m² sigue admitiendo básica. Un `>= 160` es un defecto.

S6. **Una sola fuente de verdad.** La regla vive en `lib/electrification-grade.mjs` y la consumen tanto la tabla de viviendas como el panel interior; ningún componente reimplementa el umbral ni la lista de condiciones.

## Supuestos asumidos (a rever si cambia el modelo de datos o la normativa)

A1. **La secadora eleva el grado, aunque no esté enumerada en el §2.3.2.** El literal del articulado no la menciona: la lista es calefacción, aire acondicionado, automatización y 160 m². La secadora aparece como circuito C10, que la tabla 1 solo define para electrificación elevada, y la Guía BT-25 del Ministerio la enumera explícitamente («si está prevista la instalación de una secadora»). Se implementa como el usuario pidió y se cita la Guía en ese motivo, no el articulado.

A2. **La automatización no tiene campo en el modelo.** No existe flag de domótica/GTE, así que hoy no hay entrada que pueda disparar ese motivo. La condición queda declarada en la regla para cuando el modelo la incorpore, pero ningún componente la dispara.

A3. **Los disparadores por número de puntos no entran en esta entrega.** El §2.3.2 también obliga a elevada cuando hace falta más de un circuito de los tipos C1–C5 (>30 puntos de luz, >20 tomas de uso general, >6 en baño y cocina auxiliares). `applyPointOverrides` ya cuenta esos puntos, pero el usuario no los pidió: se dejan fuera para no inflar la revisión y se reportan como siguiente paso.

A4. **El aviso se dispara al cruzar el umbral, no en cada tecla.** Escribir «180» pasa por 1, 18 y 180; solo el cruce de ≤160 a >160 emite el toast, para no apilar avisos mientras se tipea.

## Tasks

T1 · ✅ `sonner` en dependencias, `components/ui/sonner.tsx` sin `next-themes` y `<Toaster />` en `app/layout.tsx` — S4 — commit `be425c8`
T2 · ✅ `lib/electrification-grade.mjs`: `requiredGradeFor(...)` y `electrificationGradeWarning(...)` con motivos citados y umbral estricto — S2, S5, S6 — commit `99a6e4a`
T3 · ✅ Tabla de viviendas (P1) de `load-calculator.tsx`: toast al cruzar los 160 m² con grado básico, al bajar a básica una vivienda que ya los supera, y nota persistente en la card — S1, S2, S3, S5 — commit `99a6e4a`
T4 · ✅ `interior-panel.tsx`: toast al marcar calefacción, aire acondicionado o secadora en una vivienda de grado básico — S1, S2, S3, A1 — commit `99a6e4a`
T5 · ✅ `tests/electrification-grade.test.mjs` (13 casos) y `tests/electrification-grade-wiring.test.mjs` (6 casos) — S2, S5, S6 — commit `99a6e4a`
T6 · ✅ Nota de fuente en la card de viviendas y texto de `/ayuda` — S3 — commit `99a6e4a`
T7 · ✅ Corrección del bloqueante S6: `housingDeclaredGrade` viaja en la derivación y el panel interior avisa con el grado declarado, no con el que implica el escalón — S6 — commit `99a6e4a`
T8 · ✅ Retiro de los tokens `--warning-*` inertes en `components/ui/sonner.tsx` — S4 — commit `2750d07`

## Slice

479 líneas autoradas en 3 commits sobre `feat/aviso-electrificacion-elevada` (los lockfiles no cuentan). El slice se cierra acá: no se agrega código en esta rama sin una decisión de entrega aparte. Push y PR quedan a decisión del usuario.

## Log

L1 — pedido del usuario, verbatim: «segun itc bt 25 electrificacion basica no puede ser tener superficie util mayor a 160m2, tampoco prevision de ac o calefaccion electrica, ni siste de automatizacion ,no secadora».

L2 — pedido del usuario, verbatim: «quiero que haya libertad de completar por ejemplo metros2 pero avise con un mensaje , un sooner diciendo que segun tal itcbt tiene que ser electrificacion elevada». Fija la forma: dato libre + aviso no bloqueante.

L3 — decisión del usuario, verbatim: «usa sooner de shadcn». Descarta el toast propio sin dependencias; se instala `sonner` 2.0.8 y el cambio pasa a ser `Risk: item 5` (dependencias), con verificador independiente.

L4 — evidencia recogida antes de escribir: el grado nunca se validaba (`lib/housing-circuits.mjs:113` lo deriva solo de la potencia, `>= 9200 W`); los flags `hasHeating`/`hasCooling`/`hasDryer` de `components/interior-panel.tsx:357-359` solo suman puntos vía `totalPoints()`, no elevan el grado; `housingAreaM2` ya viaja de P1 a la derivación (`lib/project-model.mjs:43,69`), así que el aviso se puede disparar en ambos lados con el dato que el usuario ya carga.

L5 — verificación 1 (verificador independiente): S1–S5 cumplidos, **S6 fallado**. Defecto: `components/interior-panel.tsx:182` pasaba `declaredGrade: grade`, con `grade = housingGradeFor(dwelling.powerW)`, un grado deducido de la potencia. Una vivienda declarada `Elevada` con escalón de 5.750 W avisaba en falso y afirmaba «El grado declarado es básico»; una declarada `Básica` con 9.200 W nunca avisaba. Causa: la derivación solo llevaba `powerW` y `housingAreaM2`, nunca el grado declarado.

L6 — corrección (T7): se agregó `declaredGradeOf(level)` y `housingDeclaredGrade` en `createDerivation`, `buildDerivations` y `syncDerivationPowers`, incluida la comparación que decide si la derivación cambió. Los circuitos siguen al escalón de potencia, como antes: lo único que cambió es de dónde lee el aviso. Tests nuevos en rojo antes de la corrección y en verde después, y la reversión del arreglo hace fallar 3 de las 6 aserciones.

L7 — verificación 2 (verificador independiente): S1–S6 cumplidos, corrección de S6 verificada en ambas direcciones. Única observación: los tokens `--warning-*` de sonner son inertes sin `richColors`, así que se retiraron en `2750d07` en vez de activar `richColors`, que habría traído los colores propios de sonner en lugar de los del proyecto.

L8 — evidencia de cierre: `node --test "tests/*.test.mjs"` 626/626 (607 previos + 13 de la regla + 6 del cableado), `npx tsc --noEmit` sin diagnósticos, `pnpm build` correcto con las cuatro rutas prerenderizadas. La mutación del umbral (`>` por `>=`) hace fallar el caso de 160 m² exactos, así que el test no es vacuo.

L9 — fuera de alcance por decisión (A3): los disparadores por número de puntos del §2.3.2 (>30 puntos de luz, >20 tomas de uso general, >6 en baño y cocina auxiliares) siguen sin aviso. La automatización (A2) queda declarada en la regla pero ningún control la dispara porque el modelo no tiene el campo.

L10 — ruido conocido, no incluido en los commits: `next-env.d.ts` lo reescribe `next build` (`.next/dev/types` → `.next/types`) y se restauró para no ensuciar el diff; y `pnpm add sonner` re-resolvió una snapshot de `ajv-formats@3.0.1` sin relación con esta feature, que se dejó como la generó pnpm antes que editar el lockfile a mano.
