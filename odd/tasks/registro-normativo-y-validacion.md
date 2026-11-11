# Registro normativo único y validación de los datos del proyecto

Estado: T1-T5 implementadas y verificadas; T6 (Zod) postergada. Push a `origin/main` hecho (2026-11-11, `03df018..40b90d8`).

## Specs

S1. **Una sola fuente de verdad para lo que manda el reglamento**: cada tabla, umbral y juego de valores normalizados se declara una vez, con su cita (ITC y apartado), y todo lo demás se deriva de ahí. Texto del usuario: «me interesa lo de una sola fuente de verdad, ya que todo va segun el reglamento».

S2. **Robustez de los datos**: el proyecto guardado y el JSON importado se validan contra esa misma definición, y un dato inválido falla con el campo y el motivo, no con «no es válido». Texto del usuario: «quiero darle robustes a los datos».

S3. **Sin compatibilidad hacia atrás**: el proyecto está en alfa. Se puede subir la versión del snapshot y descartar snapshots viejos, en lugar de arrastrar tolerancias y valores por defecto para formatos anteriores. Texto del usuario: «no me interesan conservar proyectos anteriores, estamos en version alfa».

S4. Zod queda **postergado**; el registro se diseña para que un esquema (Zod u otro) pueda generarse o escribirse a partir de él sin duplicar los valores. Texto del usuario: «Postergar Zod».

## Inventario actual (lo que hoy está disperso)

| Dónde | Qué declara |
| --- | --- |
| `lib/housing-circuits.mjs` | Tabla 1 de circuitos (potencia por toma, Fs, Fu, PIA, sección, tubo, máximo de puntos), notas por circuito |
| `lib/housing-points.mjs` | Puntos mínimos por estancia (tabla 2), `MAX_POINTS`, etiquetas de circuito |
| `lib/normative-tables.mjs` | Escalones de potencia de vivienda (tabla A), tipos ITA |
| `lib/simultaneity.mjs` | Coeficientes de simultaneidad de la ITC-BT-10 |
| `lib/installation-config.mjs` | Caídas máximas por supuesto de enlace (ITC-BT-14 y 15) |
| `lib/line-state.mjs` | Valores por defecto de LGA y DI |
| `lib/interior-installation.mjs` | Diferenciales por circuitos, sensibilidad, tensión de vivienda |
| `lib/project-documentation.mjs` | Umbrales de la ITC-BT-04 §3.1 y su clasificación |
| Copias en prosa | «5.750 W por circuito», «mínimo 3.450 W», umbrales repetidos en textos de ayuda y en hints |

## Forma propuesta

Un registro con una entrada por prescripción:

```js
{ id: 'circuit.C1', source: 'ITC-BT-25 §3 tabla 1', values: { powerPerPointW: 200, fs: 0.75, fu: 0.5, breakerA: 10, maxPoints: 30, section: 1.5, tube: 16 } }
```

Tres consumidores, todos derivados de la misma entrada:
1. **Motor de cálculo**: lee el registro en lugar de sus tablas locales.
2. **Interfaz**: los rótulos, hints y notas se generan con los valores del registro, así la prosa no puede contradecir la tabla.
3. **Validación**: el esquema del proyecto (a mano hoy, Zod después) se define junto a la entrada, con el campo y la cita en el mensaje de error.

## Tasks

T1 · ✅ Registro de las tablas de circuitos y puntos, con sus citas, y migración de los dos módulos actuales — commit `9dca57c`
T2 · ✅ Registro de las tablas de potencia, simultaneidad, caídas y diferenciales — commit `9dca57c`, tests `tests/normative-registry-t2.test.mjs`
T3 · ✅ Registro de los umbrales de la ITC-BT-04 y de su clasificación — commit `9dca57c`
T4 · ✅ Generar desde el registro los textos de interfaz y ayuda (elimina las copias en prosa) — commit `c755881`
T5 · ✅ Validación del proyecto y del JSON de importación contra el registro, con error por campo; subir la versión del snapshot y descartar las anteriores — commit `f6f03da`
T6 · ⏸️ (Postergado) Esquema Zod generado desde el registro

## Log

L1 — pedido del usuario, verbatim: «ahora hay un tema con los inputs, como vez de utilizar zod para validacion»

L2 — respuesta del usuario, verbatim: «no me interesan conservar proyectos anteriores, estamos en version alfa, quiero darle robustes a los datos, me interesa lo de una sola fuente de verdad, ya que todo va segun el reglamento»

L3 — alcance acordado: «Postergar Zod». El registro normativo y la validación por campo tienen prioridad.

L4 — T5 implementada: snapshots v5 únicamente; proyectos persistidos y JSON importado rechazan datos inválidos con el primer campo y motivo. La potencia de vivienda se valida contra `HOUSING_POWER_STEPS` del registro normativo. Tests de persistencia anteriores actualizados a la política alfa sin migraciones. Zod (T6) sigue postergado.

L5 — Verificación 2026-11-11: suite completa 507/507. Cada commit verificado aislado (stash de lo pendiente + suite): A `9dca57c` 500/500, B `c755881` 503/503, C `f6f03da` 507/507. Corrección de slice: el test de versión 5 de `tests/project-documentation.test.mjs` pertenece a T5 y se movió de A a C. `data/` (507 MB de PDFs de referencia REBT) ignorada en `.gitignore` (`d80960a`), material solo en disco.
