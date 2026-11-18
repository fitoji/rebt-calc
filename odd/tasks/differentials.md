# Diferenciales múltiples y agrupación de circuitos

Branch: `feature/differentials` (apila sobre `feature/c4-subdivision`, sin merge a `main`) · Delivery strategy: `ask-on-risk` · Runner: `pnpm test` + `pnpm typecheck`

## Specs

S1. Usuario (verbatim): «bien ,ahora pensemos como hacer con el tema de diferencial, para electrificacion basica es un diferencial minimo , pero tambien se puede agregar opcionales, y para electrificacion elevada es uno cada 5, y tambien poder agruparlos. pienso que si uno agrega mas de un diferencial aparezca una tabla donde podamos asignar distintos tipos de diferenciales (por el tema de la sensibilidad) y poder agrupar distintos circuitos  a otros diferenciales, por ejemplo quizas quiero un diferencial para el calentador o el ac, o si hay punto de carga de coche electrico tambien tiene que tener un diferencial, utiliza skill de impeccable para pensar el diseño tambien, y dime como lo podriamos aplicar». Aceptación: tabla progresiva cuando hay más de un diferencial, tipo por dispositivo y asignación explícita de circuitos.

S2. Regla de recuento corregida con fuente (ITC-BT-25 §2.3): «Tanto para la electrificación básica como para la elevada, se colocará, como mínimo, un interruptor diferencial de las características indicadas en el apartado 2.1 por cada cinco circuitos instalados.» Aceptación: el mínimo se calcula igual en ambos grados (básica 5 circuitos → 1; elevada 10 → 2), se muestra como dato derivado y no editable, y los diferenciales declarados nunca pueden quedar por debajo del mínimo. «Como mínimo» autoriza añadir dispositivos opcionales.

S3. Corrección técnica: AC/A/F/B clasifican la **forma de onda** de la corriente residual, no la sensibilidad; la sensibilidad de los diferenciales de la vivienda es 30 mA. Guía BT-52 (sept 2024, rev. 2): «Cada punto de conexión deberá protegerse individualmente mediante un dispositivo de protección diferencial de corriente diferencial-residual asignada máxima de 30 mA, que podrá formar parte de la instalación fija o estar dentro del SAVE.» y «Las medidas apropiadas, para cada punto de conexión pueden ser: – Utilización de diferenciales de tipo B; o – Utilización de diferenciales de tipo A y un equipo que asegure la desconexión de la alimentación en caso de corrientes de defecto con componente en continua superior a los 6 mA (dispositivo de detección de corriente diferencial continua (RDC-DD)) conforme con la norma IEC 62955.» Aceptación: si hay C13, se propone un diferencial dedicado con tipo A + flag RDC-DD o tipo B; no se da por conforme automáticamente. La opción 300 mA queda reservada al cabecera selectivo, nunca a una rama.

S4. Guía BT-25 (jul12R2), sobre disparos intempestivos: separar C3 o C9 «protegiendo cada uno mediante un diferencial (que será de tipo A según el punto 3.5 de la ITC-BT-24)». Aceptación: se pueden declarar diferenciales adicionales a los mínimos y se puede asignar un circuito concreto a cada uno; la app no inventa el tipo si no se declara.

S5. Usuario (verbatim): «Completo por capas (Recommended)» y «implementa». Dirección acordada: mínimo derivado vs instalados declarados; tabla progresiva debajo de la tabla de circuitos; chips de circuitos por diferencial; C13 con tipo A + RDC-DD o tipo B; ELEC-3 hoja 2 y unifilar incluidos en el alcance.

S6. Decisiones de arquitectura: un único array `differentials[]` persistido por vivienda con `{ id, type, sensitivityMa, selective, circuits, rdcDd? }` es la fuente de verdad; el `differentialType` global actual se migra al primer dispositivo. Un circuito pertenece a un solo diferencial. `evaluateInterior` conserva el cálculo del mínimo (incluida la excepción C4). Ningún circuito queda sin asignar sin aviso. Sin modal, sin tokens de color nuevos; la app declara tipo, sensibilidad y circuitos, pero deja calibre y denominación pendientes del instalador.

## Tasks

- T1 — S2,S3,S6 — inline — done (`0368301`) — Motor y persistencia: modelo `differentials[]`, normalización/migración, mínimo vs declarados, regla VE, validación en storage; tests RED→GREEN, suite 734/734, typecheck OK.
- T2 — S1,S4,S6 — inline — done — UI en `components/interior-panel.tsx`: tabla progresiva, selects de tipo/sensibilidad, chips de circuitos y avisos en línea; se retiraron el checkbox global y el select de tipo único; suite 735/735, typecheck OK.
- T3 — S3,S5,S6 — inline — pending — ELEC-3 hoja 2: adapter, modelo e i18n; imprimir tipo y circuitos asignados, calibre pendiente; tests.
- T4 — S5 — inline — pending — Unifilar: dibujar los N diferenciales con identificación coherente con la tabla; tests.
- T5 — S5,S6 — inline — pending — Documentación (help, README, texto del caption) y verificación final.

## Log

L1 (verbatim): «bien ,ahora pensemos como hacer con el tema de diferencial, para electrificacion basica es un diferencial minimo , pero tambien se puede agregar opcionales, y para electrificacion elevada es uno cada 5, y tambien poder agruparlos. pienso que si uno agrega mas de un diferencial aparezca una tabla donde podamos asignar distintos tipos de diferenciales (por el tema de la sensibilidad) y poder agrupar distintos circuitos  a otros diferenciales, por ejemplo quizas quiero un diferencial para el calentador o el ac, o si hay punto de carga de coche electrico tambien tiene que tener un diferencial, utiliza skill de impeccable para pensar el diseño tambien, y dime como lo podriamos aplicar»

- 2026-11-18 — Diseño con skill `impeccable` (Operate, mundo visual existente, `PRODUCT.md` rige). Correcciones verificadas con fuente: la regla de uno por cada cinco circuitos aplica a ambos grados; tipo ≠ sensibilidad; la Guía BT-52 exige protección VE individual y tipo B o A + RDC-DD.
- 2026-11-18 — Usuario (verbatim): «Completo por capas (Recommended)». Alcance cerrado con cinco capas, incluido el unifilar para evitar que el esquema contradiga la tabla.
- 2026-11-18 — Usuario (verbatim): «implementa». Sin RDD: `gentle-ai review mode status` → off (clone_local). Rama creada desde `feature/c4-subdivision` porque esta feature depende de `circuitsForDifferentials`.
