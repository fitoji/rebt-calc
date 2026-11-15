# Aviso de electrificación elevada exigida por la ITC-BT-25 §2.3.2

Objetivo: que la app deje cargar cualquier dato (m², previsiones) pero avise con un toast de sonner cuando lo declarado como electrificación básica contradice la ITC-BT-25 §2.3.2. Rama: `feat/aviso-electrificacion-elevada`. Test runner: `node --test tests/*.test.mjs` + `npx tsc --noEmit`.

## Specs

S1. **No bloquea, avisa.** Pedido del usuario, verbatim: «quiero que haya libertad de completar por ejemplo metros2 pero avise con un mensaje , un sooner diciendo que segun tal itcbt tiene que ser electrificacion elevada». Criterio de aceptación: el campo acepta el valor igual; la app solo emite el aviso. Ningún dato se rechaza ni se corrige solo.

S2. **La regla es la del usuario**, verbatim: «segun itc bt 25 electrificacion basica no puede ser tener superficie util mayor a 160m2, tampoco prevision de ac o calefaccion electrica, ni siste de automatizacion ,no secadora». Texto normativo que se cita en el aviso (ITC-BT-25 §2.3.2, literal): «Es el caso de viviendas con una previsión importante de aparatos electrodomésticos que obligue a instalar más de un circuito de cualquiera de los tipos descritos anteriormente, así como con previsión de sistemas de calefacción eléctrica, acondicionamiento de aire, automatización, gestión técnica de la energía y seguridad o con superficies útiles de las viviendas superiores a 160 m².»

S3. **El mensaje nombra la ITC.** Pedido del usuario: «diciendo que segun tal itcbt». Criterio de aceptación: el texto del aviso cita la instrucción y la condición concreta que lo dispara, no un «valor inválido» genérico.

S4. **Mecanismo: `sonner` de shadcn.** Decisión del usuario, verbatim: «usa sooner de shadcn». Criterio de aceptación: `sonner` en `dependencies`, un `components/ui/sonner.tsx` al estilo del proyecto y un `<Toaster />` montado una vez en `app/layout.tsx`.

S5. **Superficie estricta.** El umbral es «superior a 160 m²»: 160,0 m² sigue admitiendo básica. Un `>= 160` es un defecto.

S6. **Una sola fuente de verdad.** La regla vive en `lib/electrification-grade.mjs` y la consumen tanto la tabla de viviendas como el panel interior; ningún componente reimplementa el umbral ni la lista de condiciones.

S7. **Los disparadores por número de puntos también cuentan.** Texto normativo, ITC-BT-25 §2.3.2: «viviendas con una previsión importante de aparatos electrodomésticos que obligue a instalar más de un circuito de cualquiera de los tipos descritos anteriormente». Criterio de aceptación: cuando los puntos declarados de un circuito C1–C5 superan el máximo de la tabla 1, la instrucción exige electrificación elevada y el aviso lo dice nombrando el circuito, el número declarado y el máximo que se pasó. El caso de cada circuito: C1 con más de 30 puntos de luz, C2 con más de 20 tomas de uso general, y los máximos que la tabla 1 fija para C3, C4 y C5. Los máximos no se reescriben: salen de `MAX_POINTS` (`lib/housing-points.mjs`), que ya los toma de la tabla 1. La cita del aviso es `ITC-BT-25 §2.3.2` para el disparador y `§3, tabla 1` para el máximo.

S8. **El aviso por puntos no bloquea ni repite.** Sigue siendo no bloqueante (S1): el número de puntos se guarda igual. El toast sale cuando el exceso aparece, no en cada tecla ni en cada re-render.

## Supuestos asumidos (a rever si cambia el modelo de datos o la normativa)

A1. **La secadora eleva el grado, aunque no esté enumerada en el §2.3.2.** El literal del articulado no la menciona: la lista es calefacción, aire acondicionado, automatización y 160 m². La secadora aparece como circuito C10, que la tabla 1 solo define para electrificación elevada, y la Guía BT-25 del Ministerio la enumera explícitamente («si está prevista la instalación de una secadora»). Se implementa como el usuario pidió y se cita la Guía en ese motivo, no el articulado.

A2. **La automatización no tiene campo en el modelo.** No existe flag de domótica/GTE, así que hoy no hay entrada que pueda disparar ese motivo. La condición queda declarada en la regla para cuando el modelo la incorpore, pero ningún componente la dispara. Diferido por decisión del usuario (L16): se deja anotado como pendiente y no se implementa hasta saber dónde aplicarlo.

A3. **Los disparadores por número de puntos no entran en esta entrega.** El §2.3.2 también obliga a elevada cuando hace falta más de un circuito de los tipos C1–C5 (>30 puntos de luz, >20 tomas de uso general, >6 en baño y cocina auxiliares). `applyPointOverrides` ya cuenta esos puntos, pero el usuario no los pidió: se dejan fuera para no inflar la revisión y se reportan como siguiente paso.

A4. **El aviso se dispara al cruzar el umbral, no en cada tecla.** Escribir «180» pasa por 1, 18 y 180; solo el cruce de ≤160 a >160 emite el toast, para no apilar avisos mientras se tipea.

A5. **Los puntos que cuentan son los que el proyecto instala, no el mínimo de la tabla 2.** Se lee `applyPointOverrides(...).totals`, porque el proyecto declara cuántos puntos instala de verdad en cada circuito y ese número es el que decide los circuitos adicionales. Consecuencia asumida: una vivienda con las estancias justas pero con los puntos editados a mano hacia arriba avisa, y una con estancias grandes y puntos editados hacia abajo (por debajo del mínimo de la tabla 2) no avisa por esta vía.

## Tasks

T1 · ✅ `sonner` en dependencias, `components/ui/sonner.tsx` sin `next-themes` y `<Toaster />` en `app/layout.tsx` — S4 — commit `be425c8`
T2 · ✅ `lib/electrification-grade.mjs`: `requiredGradeFor(...)` y `electrificationGradeWarning(...)` con motivos citados y umbral estricto — S2, S5, S6 — commit `99a6e4a`
T3 · ✅ Tabla de viviendas (P1) de `load-calculator.tsx`: toast al cruzar los 160 m² con grado básico, al bajar a básica una vivienda que ya los supera, y nota persistente en la card — S1, S2, S3, S5 — commit `99a6e4a`
T4 · ✅ `interior-panel.tsx`: toast al marcar calefacción, aire acondicionado o secadora en una vivienda de grado básico — S1, S2, S3, A1 — commit `99a6e4a`
T5 · ✅ `tests/electrification-grade.test.mjs` (13 casos) y `tests/electrification-grade-wiring.test.mjs` (6 casos) — S2, S5, S6 — commit `99a6e4a`
T6 · ✅ Nota de fuente en la card de viviendas y texto de `/ayuda` — S3 — commit `99a6e4a`
T7 · ✅ Corrección del bloqueante S6: `housingDeclaredGrade` viaja en la derivación y el panel interior avisa con el grado declarado, no con el que implica el escalón — S6 — commit `99a6e4a`
T8 · ✅ Retiro de los tokens `--warning-*` inertes en `components/ui/sonner.tsx` — S4 — commit `2750d07`
T9 · ✅ Disparadores por número de puntos: `pointsByCircuit` en `requiredGradeFor` y su cableado en el panel interior — S7, S8, A5 — commit `0b60fc3`

## Slice

Dos slices, cada uno revisable por separado.

**Slice 1** — commits `be425c8`, `99a6e4a`, `2750d07`: 479 líneas autoradas. Abre y cierra el aviso por superficie y previsiones (T1–T8).

**Slice 2** — commit `0b60fc3`: ~300 líneas autoradas. Los disparadores por número de puntos (T9), autorizados por el usuario después de leer el reporte de cierre del slice 1.

Total: 780 líneas autoradas en 5 commits sobre `feat/aviso-electrificacion-elevada` (los lockfiles no cuentan). No se agrega código en esta rama sin una decisión de entrega aparte. Push y PR quedan a decisión del usuario.

## Pendientes

Quedan anotados acá, sin implementar, para retomarlos cuando haya decisión.

**P1 · Automatización, gestión técnica de la energía y seguridad (A2).** La condición ya está implementada en la regla: `requiredGradeFor({ hasAutomation: true })` devuelve el motivo «Previsión de automatización, gestión técnica de la energía y seguridad (ITC-BT-25 §2.3.2)». Lo que falta es de dónde leerla: el modelo no tiene el campo, así que ningún control la dispara. El usuario la difirió por no saber todavía dónde aplicarla (L16).

Para cerrarla hacen falta cuatro piezas, en este orden: (1) el control —un checkbox junto a «Calefacción eléctrica / Aire acondicionado / Secadora» en el panel interior, o una columna en P1 si se decide que la domótica se declara a nivel de tipo de vivienda—; (2) el dato, en `InteriorInputs` o en `HousingRow` según dónde caiga el control; (3) el transporte a la derivación, igual que se hizo con `housingDeclaredGrade` en `lib/project-model.mjs`, incluida la comparación de `syncDerivationPowers`; (4) la validación al importar un proyecto en `lib/calculator-storage.mjs`, para que un JSON viejo sin el campo no rompa.

La decisión de fondo que falta no es técnica sino de producto: **la automatización no es una carga, es una instalación**. La ITC-BT-25 §2.2 la trata como previsión de alimentación a los dispositivos de control y mando centralizado, y su desarrollo está en la ITC-BT-51, así que declararla puede terminar pidiendo el circuito C11 y no solo el cambio de grado. Conviene decidir eso antes de agregar el checkbox.

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

L11 — pedido del usuario, verbatim: «vamos con el 1.», respondiendo al punto 1 del reporte de cierre: «Falta el disparador más frecuente. El §2.3.2 también obliga a elevada cuando hace falta más de un circuito de los tipos C1–C5: >30 puntos de luz, >20 tomas de uso general, >6 tomas en baño y cocina auxiliares, o un segundo C3/C4.» Se abre T9 y las specs S7 y S8, sin tocar S1–S6 ni las tasks ya cerradas.

L12 — evidencia recogida antes de escribir T9: `lib/housing-points.mjs:44-49` ya expone `MAX_POINTS` derivado de `maxPoints` de la tabla 1 (C1 y C6 comparten 30, C2 y C7 comparten 20, C12 sin máximo); `applyPointOverrides(...)` ya devuelve `requiredCircuits` con `Math.ceil(totals/max)` por circuito, así que el exceso es `requiredCircuits[Cn] > 1` y no hay que recalcular nada nuevo.

L13 — T9 implementado y verificado: `requiredGradeFor` acepta `pointsByCircuit` y agrega un motivo por circuito C1–C5 en exceso, con los máximos leídos de `MAX_POINTS`. Comprobado que no hay ciclo de imports: `housing-points.mjs` y `housing-circuits.mjs` solo dependen de `normative-tables.mjs`, que no importa nada. Máximos usados, de la tabla 1: C1 30, C2 20, C3 2, C4 3, C5 6. Los motivos por puntos se agregan **después** de los cinco declarados y no en el orden literal del artículo, para no mover el orden ya publicado de `reasons`.

L14 — decisión de implementación que conviene revisar: el `useEffect` que emite el toast por puntos necesita estar antes del retorno temprano de «todavía no hay viviendas», así que `InteriorPanel` se partió en un guard (`InteriorPanel`) y un cuerpo (`InteriorPanelBody`), con el tipo de props exportado como `InteriorPanelProps`. La salida renderizada y la API de props no cambian. El efecto depende de `[pointOverflow.length]` a propósito: el `useRef` solo deja pasar la transición de «sin exceso» a «con exceso», pero un lint con `react-hooks/exhaustive-deps` lo marcaría; el repo no corre lint, así que queda anotado.

L15 — evidencia de cierre de T9: `node --test "tests/*.test.mjs"` 638/638 (626 + 12 nuevos), `npx tsc --noEmit` sin diagnósticos. `text-danger` usado en el aviso persistente es un token real (`app/globals.css:122` lo mapea desde `--danger`) y ya se usa en cinco lugares del proyecto.

L16 — decisión del usuario sobre la automatización, verbatim: «dejalo anotado para tenerlo en cuenta en el futuro, no se todavia donde aplicarlo». No se implementa. La condición queda viva en la regla y el pendiente se documenta en «Pendientes · P1» con las cuatro piezas que faltan y la decisión de producto que las precede.
