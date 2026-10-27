# LGA + DI modules on real ITC-BT-19 tables

Objective: add LGA (ITC-BT-14) and DI (ITC-BT-15) calculation modules to the REBT calculator, sized from the real admissible-current tables, with a table viewer per module.
Branch: `main`. Delivery: work-unit commits. Test runner: `node --test tests/*.test.mjs`.

## Specs

- S1. The app exposes three modules behind tabs: `Previsión de cargas`, `LGA · ITC-BT-14`, `DI · ITC-BT-15`. The load module keeps its current behaviour unchanged.
- S2. Section sizing uses the published admissible-current table (copper, non-buried, 40 °C ambient) by installation method, number of loaded conductors and insulation, instead of literals or a hardcoded ladder.
- S3. Sizing respects, simultaneously: (a) the section required by the maximum voltage drop, (b) the admissible current after applying the grouping correction factor, and (c) the protection check `Ib ≤ In ≤ Iz`.
- S4. The final section offered is the smallest standard section that satisfies all three criteria; when none does, the module says so instead of silently returning the largest one.
- S5. Each module shows a table viewer button that opens a dialog with the reference tables actually used (admissible currents + correction factors), with their normative source.
- S6. LGA and DI inputs persist in the browser like the load calculator inputs, and their results appear in the JSON export and the PDF report.
- S7. Voltage-drop formulas must not double-count cos φ: three-phase `S = P·L / (γ·U·ΔU)`, single-phase `S = 2·P·L / (γ·U·ΔU)`.
- S8. Every calculation lives in a pure module under `lib/` and is pinned by numeric tests.

## Tasks

- T1 (S2, S8) `lib/cable-tables.mjs`: table data + lookup + grouping factors. Route: inline. Done (c361730).
- T2 (S3, S4, S7, S8) `lib/line-sizing.mjs`: sizing engine. Route: inline. Done (c361730).
- T3 (S2, S3, S7, S8) numeric tests for tables and engine. Route: inline. Done (c361730).
- T4 (S1, S5) Tabs + LGA/DI panels + table dialogs. Route: inline. Done.
- T5 (S6) Persistence, JSON export, PDF sections. Route: inline. PENDING.
- T6 (S1..S8) Full verification: suite, tsc, build. Suite 48/48, tsc clean, build 0 after T4; re-run after T5.

## Log

- L1 (user, verbatim): "revisa en @conversion-de-planilla-a-web/ es una app parecida hecha con otra ia donde ademas del calculo de cargas estan los de lga y di con tabs, revisalo e incorporalo a nuestra app"
- L2 (user, verbatim, choosing the integration depth): "quiero la b , con tablas reales y con el boton de tabla como hicimos en cargas, para poder verlas tambien"
- Analysis: the referenced app is a fork of this one frozen before the shadcn migration. Only its LGA/DI modules are new; its load calculator is older (inline simultaneity formula that disagrees with ITC-BT-10, plus the hardcoded 100/3450 row bug fixed in edbe925) and is NOT reused.
- Defects found in the referenced LGA/DI and corrected here: cos φ double-counted in the section formula (oversizes by 1/cos φ); section ladder capped at 150 mm²; admissible currents hardcoded per section with no method/insulation basis; `thermalAdmissible` accepted but never compared against Ib.
- Data source decision: the two secondary web sources contradict each other (one publishes 3-loaded values labelled 2-loaded; the other claims a 30 °C reference where ITC-BT-19 says 40 °C). Values are therefore taken from the official Ministerio de Industria guide (Guía-BT-19, feb 09 rev. 2, Table A) and cross-checked against independent published values (B1 2x PVC 2.5 mm² = 21 A, B1 2x XLPE = 26.5 A, B2 2x PVC = 18.5 A).
- Scope note: the official guide does not carry the ambient-temperature correction table (it defers to UNE 20460-5-523), so v1 states the 40 °C reference explicitly in the viewer and applies only the grouping factor, which the guide does publish (Table E).
