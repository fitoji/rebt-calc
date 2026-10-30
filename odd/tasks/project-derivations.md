# Project-wide load, LGA and DI calculation

Objective: one project calculation where the load forecast feeds the LGA and a list of individual derivations, with shared data and no duplicated inputs.

Branch: main · Delivery: single feature branch · Test runner: `pnpm test`

## Specs

- S1. The project has one load forecast. The LGA power defaults to the forecast total, with an explicit manual override.
- S2. The project holds a list of derivations. Each derivation carries `kind`, `label`, `sourceKey`, `system` and its own `LineState`.
- S3. Auto-generation creates one derivation per dwelling unit, one per local, one per garage row, one for common services and one for IRVE.
- S4. Each derivation is sized with its own installed power, not the building total.
- S5. The LGA is sized with the load forecast total, including the simultaneity already applied by the forecast.
- S6. A v1 snapshot with a single `di` migrates to a v2 snapshot with a `derivations` list.
- S7. The project summary reports total load, LGA, derivation count, sum of derivation powers and coordination warnings.
- S8. JSON and PDF export the derivation schedule and reuse the same explanation steps as the screen.

## Tasks

- T1 (S1, S2, S4, S5) — `lib/project-model.mjs` with derivation seeds, project calculation and summary. Route: inline. Done.
- T2 (S3) — auto-generation from the load forecast rows. Route: inline. Done.
- T3 (S6) — storage v2 migration from the current single `di`. Route: inline. Done.
- T4 (S7) — project summary and warnings. Route: inline. Done.
- T5 (S2, S4, S7) — derivation table, generation action and per-row editing. Route: inline. Done.
- T6 (S8) — PDF/JSON derivation schedule. Route: inline. Done.

## Log

- L1. User request verbatim: “dale, vayamos pensando como organizar la feature, para que sea un calculo de todo el proyecto y que los datos se compartan de la planificacion de carga a lga y di”.
- L2. Decision: the LGA uses the forecast total with simultaneity; each DI uses its own installed/declared power. The sum of DI may exceed the LGA and is shown as information, not as an error.
- L3. Slice 1 scope: model, auto-generation and calculation first, without redesigning the UI.
- L4. A derivation needs its own `system` because locals, common services and IRVE may be three-phase while dwellings are single-phase.
- L5. Slice 1 implemented: `lib/line-state.mjs` centralizes the line input mapping, and `lib/project-model.mjs` generates one seed per consumer, sizes the LGA from the total and each DI from its own power, and returns a summary with selectivity warnings. Tests: `tests/project-model.test.mjs`. `pnpm test` 145/145, `pnpm typecheck` clean, `pnpm build` clean.
- L6. Slice 2 implemented: storage v2 with derivation migration, LGA power auto/manual, generation action and a read-only derivation table. Tests: 149/149, typecheck clean, build clean.
- L7. Slice 3 implemented: editable derivation rows (length, method, protection), UI warnings, automatic power sync when the forecast changes, JSON project block and PDF derivation schedule. Tests: 150/150, typecheck clean, build clean.
- L8. Selection sync implemented: clicking a derivation row loads it into the DI card, and editing the card updates the selected derivation in the table. The DI card now honours the derivation system (single-phase or three-phase). Tests: 150/150, typecheck clean, build clean.
