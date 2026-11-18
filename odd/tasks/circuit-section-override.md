# Sección editable por circuito en la tabla de vivienda

Branch: `main` (cambio pedido sobre lo ya entregado) · Runner: `pnpm test` + `pnpm typecheck`

## Specs

S1. Usuario (verbatim): «quisiera que en la tabla de circuitos de vivienda, pueda modificar la seccion , con un select en cada circuito, con la seccion calculada seleccionada con un check, pero pueda cambiar para ver como cambian los valores, utiliza select de https://ui-sdk.dev/». Aceptación: `Select` de `@ui-sdk/react/select` por fila, con la sección calculada como opción recomendada y siempre marcada en la lista.

S2. Usuario (verbatim): «si elijo un seccion menor de la recomendada , tiene que salir una alerta diciendo que no cumple con corriente admisible o por la caida de tension y quedar en rojo, y obviamente no puede propagarse a elect3». Aceptación: override menor que la recomendada → fila/celda en rojo, alerta que distingue mínimo de tabla 1 vs caída > 3 %, y el ELEC-3 usa la recomendada, no el override.

S3. Usuario (verbatim): «ahora si elijo una seccion superior deberia propagarse . pero en el select siempre tiene que quedar marcada la recomendada». Aceptación: override ≥ recomendada se persiste y se propaga a caída, PE/neutro, ELEC-3, unifilar e informe; la opción recomendada mantiene su marca aunque el trigger muestre otra sección.

S4. La recomendada es `max(sección de tabla 1, sección exigida por caída ≤ 3 %)`. «Calculada» borra el override. El override se guarda por circuito en `interior.sectionOverride`.

## Tasks

- T1 — S2,S3,S4 — inline — done — Modelo y storage: `sectionOverride`, `recommendedSection`/`effectiveSection`, `invalidReason` y `sectionOverrideWarning`; validación y tests.
- T2 — S1,S2 — inline — done — `CircuitSectionSelect` con UI SDK, opción recomendada marcada con check y alerta roja específica.
- T3 — S3 — inline — done — ELEC-3 e informe usan `effectiveSection`: propagan la sección mayor y nunca imprimen una menor.
- T4 — S1..S4 — inline — done — Documentación y verificación: 758/758, typecheck, build y detector `[]`.

## Log

L1 (verbatim): «quisiera que en la tabla de circuitos de vivienda, pueda modificar la seccion , con un select en cada circuito, con la seccion calculada seleccionada con un check, pero pueda cambiar para ver como cambian los valores, utiliza select de https://ui-sdk.dev/»

L2 (verbatim): «si elijo un seccion menor de la recomendada , tiene que salir una alerta diciendo que no cumple con corriente admisible o por la caida de tension y quedar en rojo, y obviamente no puede propagarse a elect3, ahora si elijo una seccion superior deberia propagarse . pero en el select siempre tiene que quedar marcada la recomendada»

- 2026-11-18 — Usuario (verbatim): «quiero que cada select tenga el color de su circuito correspondiente y que a la derecha del numero de seccion seleccionada aparezca un check, como en aqui https://ui-sdk.dev/sink?mode=all&uses=Select en el componente Hotel amenities». El trigger hereda `CIRCUIT_ROW_TINT[circuit.id]`; el ítem seleccionado usa `SelectItemIndicator` con check y la opción calculada conserva su marca «Recomendada».
- 2026-11-18 — Decisión: la recomendada se calcula con tabla 1 y caída; un override menor se muestra pero no se imprime en ELEC-3. Se reutiliza `recharts`/UI SDK ya instalados; no hay dependencias nuevas.
