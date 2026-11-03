# Cargar proyecto desde JSON

Objective: add a `Cargar proyecto` button under `Limpiar` that restores a project from the JSON file produced by `Descargar datos → JSON`, closing the half-promise the export hint has been making.
Branch: `feat/cargar-proyecto-json`. Delivery: one work-unit commit. Test runner: `node --test "tests/*.test.mjs"`.

## Specs

- S1. A `Cargar proyecto` button sits directly below `Limpiar` in the sticky sidebar. It opens the operating system file picker restricted to JSON files and accepts one file per pick.
- S2. The accepted file is the one `Descargar datos → JSON` produces. Loading restores `projectInfo` and `inputs`: `housing`, `locals`, `garages`, `elevators`, `motors`, `otherLoads`, `lighting`, `installationType`, `parking`, `irveOption`, `lga`, `lgaPowerMode`, `di` and `derivations`. `settings`, `calculations`, `lines` and `project` are ignored: the first are the user's normative parameters, the rest are derived by the engine.
- S3. Validation is all-or-nothing. The current project is replaced only when the whole file validates; otherwise nothing changes at all and the reason is reported: invalid JSON, empty file, or no project data.
- S4. The file goes through the same validators as the persisted snapshot, so the accepted shape cannot diverge between `localStorage` and the file. A file without `derivations`, `lga` or `di` loads the rest instead of being rejected.
- S5. After a successful load the UI announces the file name and that the previous project was replaced. A failed load announces the reason. Both are announced, not only painted.
- S6. A loaded project retires the `electrocalc-new-project` mark, so reloading the page keeps the imported project instead of reopening the example.
- S7. The change is documented where the formats are documented: README export and persistence sections, and the guide section `exportar`.
- S8. The JSON download hint no longer promises a resume path that does not exist; it names the button that resumes it.

## Tasks

- T1 (S3, S4) `readInputs` + `readProjectExport` in `lib/calculator-storage.mjs`, pinned by tests. Route: inline. Done. RED: `readProjectExport` missing (file-level import failure). GREEN: 29/29 in `tests/calculator-storage.test.mjs`, 10 new cases.
- T2 (S1, S2, S5, S6) Button, hidden file input, handler and announced status in `components/load-calculator.tsx`. Route: inline. Done.
- T3 (S7, S8) README, guide and JSON hint. Route: inline. Done.
- T4 (S1..S8) Verification: suite 239/239, `tsc --noEmit` clean, `next build` clean, 19-case differential check of `loadCalculatorInputs` against the base commit with no behavioural diff. Independent verifier: 0 blockers, `S1`–`S8` pass; advisories: a malformed optional block is dropped with success (shared-validator behaviour, already true of the snapshot path), a hand-edited empty-but-valid file reloads the example, and the live region mounts conditionally.

## Log

- L1 (user, verbatim): "debajo del boton limpiar, quiero uno que sea Cargar Proyecto, y que pueda cargar un archivo json con los datos del proyecto"
- Analysis: the JSON export already exists (`downloadJson`, `components/load-calculator.tsx:563`) and its hint says "para retomarlos", but there was no import path at all — only the logo upload used `FileReader`. This task adds the missing half and keeps the export shape untouched.
- Decision (scope): `settings` is not restored. It holds the REBT calculation parameters, not project data, and the component already keeps them app-wide; restoring them from a foreign file would silently change normative coefficients. Documented in S2.
- Decision (safety): no extra confirmation dialog. The file picker is the deliberate act, validation is atomic, and `Limpiar` — already present — is equally destructive with less evidence of intent. The status line states that the previous project was replaced.
- Risk: item 1 — the load overwrites the project currently persisted in the browser, and there is no undo. Mitigated by all-or-nothing validation before any state change.
- L2. The hidden file field uses the shadcn `Input` (`type="file"`, `className="hidden"`) instead of a native `<input>`: `tests/shadcn-migration.test.mjs` forbids native inputs, and Base UI's Input forwards the ref so `projectFileInput.current?.click()` works.
- L3. `tests/dialog-a11y-regression.test.mjs` pins the count of full-width `py-3` action buttons (14 → 15). The invariant it protects (`h-auto` cancels the base `h-8`) still holds for the new button; only the count was stale.
- L4. The differential check rebuilt the base `lib/calculator-storage.mjs` from `HEAD` in a `mktemp -d` scratch copy and compared `loadCalculatorInputs` over 19 inputs (v2, v1 with and without derivations, missing `area`/`plazas`, bad version/id/row/layout/derivation, unknown keys, garbage). No diff: refactoring into `readInputs` left the snapshot path untouched.
- L5. `lineTouched` is set from the file: the imported LGA/DI only reach the snapshot when they count as part of the project, otherwise the autosave would keep the previous project's lines.
- L6. Independent verification (fresh scratch copy, candidate `09ea566` against baseline `9802938`): 228/228 then 239/239 with the new `tests/import-json-project.test.mjs`, typecheck and build clean, 23/23 accept-reject parity between the file and the snapshot, 14 rejection classes all leaving no project, and the byte-level round trip through `saveCalculatorInputs` + `loadCalculatorInputs` intact. Zero blockers. Its 11 durable probes are committed as a regression file instead of being repeated later.
- L7. Not verified in this session: the browser-level picker and the live-region announcement. The page bails out to client-side rendering, so the served HTML is only the loading shell, and no browser automation is installed in the repo.
- L8. Native assessment (`gentle-ai review assess --base-ref 9802938 --committed-only`, untracked scope excluded to leave the user's two untracked `data/*.pptx` out of the candidate): risk `medium` (`executable_change`), `review_due: false`, reason `under_budget`. No review opened for this slice; the boundary stays at `9802938` until a later commit reaches the budget.
