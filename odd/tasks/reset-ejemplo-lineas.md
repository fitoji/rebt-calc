# «Cargar ejemplo» con reset completo de líneas

Objetivo: alinear el botón «Cargar ejemplo» (`reset()` en `components/load-calculator.tsx`)
con el reset completo que ya hace «Limpiar»: las líneas LGA/derivación vuelven a sus
defaults y dejan de persistirse con `lineTouched` en `true`.
Branch: `main`. Test runner: `node --test tests/*.test.mjs` (el archivo es
`tests/clear-reset.test.mjs`). Estado: **pendiente**, anotado como tarea futura.

## Log

- L1 (user, 2026-11-07, verbatim): "cargar ejemplo, anotalo como tarea para futuro".

## Contexto ya pagado (no repetirlo)

- «Limpiar» ya hace el reset completo: fix `4dc1916` restaura
  `defaultLineState('lga' | 'di')`, suelta `lineTouched` y limpia
  `selectedDerivationId`, `selectedDwellingId` y `selectedSupplyId`. Los defaults
  viven en `defaultLineState(role)` en `lib/line-state.mjs`; no re-implementarlos.
- `reset()` hoy hace un reset **parcial** inline de las líneas: solo
  `maxDropPercent: 0.5` / `1` y `sectionOverride: 0` sobre el estado actual, y no
  toca `lineTouched` ni las selecciones ni el modo de potencia (`lgaPowerMode` sí se
  resetea). Si el usuario cambió `lengthM`, `installation`, `insulation` o el cable,
  esos valores sobreviven al «Cargar ejemplo».

## Specs propuestas

- S1. «Cargar ejemplo» restaura las líneas con `setLga(defaultLineState('lga'))` y
  `setDi(defaultLineState('di'))`, igual que «Limpiar»; no quedan copias inline.
- S2. `reset()` suelta `lineTouched` (los datos de ejemplo no cuentan como línea
  editada, igual que el comentario de `applyProject` marca un proyecto cargado).
- S3. `reset()` limpia las tres selecciones apuntadas a datos que cambian:
  derivación, vivienda elegida y suministro elegido.
- S4. Un test en `tests/clear-reset.test.mjs` fija la paridad: el cuerpo de
  `reset()` y el de `clear()` usan los mismos `defaultLineState`, sueltan
  `lineTouched` y reinician las selecciones.

## Diseño sugerido (una tarde, ruta inline)

Extraer un helper local `resetLineState()` en `components/load-calculator.tsx` que
haga S1–S3 y llamarlo desde `clear()` y `reset()`, o simplemente aplicar los mismos
setters en los dos cuerpos (30 líneas, sin abstracción nueva). Ambas variantes valen;
decidir el día del cambio viendo cuál queda más chica en el diff.

## Decisión abierta

- D1. ¿«Cargar ejemplo» debería además restaurar algo que hoy conserva el usuario?
  El ejemplo carga la previsión (viviendas, locales, garajes) pero `lga.maxDropPercent`
  ya se resetea parcialmente. Si el usuario calibró la pestaña LGA a mano y quiere
  volver *solo* al edificio, el reset completo de líneas sería un cambio de sentido
  del botón: hoy "vuelve al edificio de ejemplo", con S1 pasa a "vuelve al proyecto
  de ejemplo completo". Es una decisión de producto mínima, resolverla antes de T1.

## Plan de tareas

- T1 (S1–S3) Helper o setters compartidos en `reset()`. Ruta: inline.
- T2 (S4) Test de paridad en `tests/clear-reset.test.mjs`, RED antes del T1.
- T3 Ayuda: revisar «Cargar ejemplo» en `lib/help-sections.mjs` y `components/help-doc.tsx`;
  si el texto dice "carga el edificio de ejemplo" y ahora también resetea líneas,
  ajustar la frase.

## Criterios de aceptación

- Cambiar `lengthM` de la pestaña LGA y «Cargar ejemplo» vuelve a 25 m (y la DI a 20 m).
- Tras «Cargar ejemplo» y recargar, el snapshot de localStorage ya no contiene los
  valores editados (`lineTouched` en `false`).
- Suite completa, `pnpm typecheck` y `pnpm build` en verde.
