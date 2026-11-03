# Trazabilidad y criterio de caída en LGA/DI

Objective: close the five gaps the IOC 0518 material exposed in the two line modules — electrical moment, conductivity, the drop computed with the protective device, the tube diameter and the housing IGA — without inventing a single value that the transcribed guides do not publish.
Branch: `feat/lga-di-trazabilidad`. Delivery: work-unit commits. Test runner: `node --test "tests/*.test.mjs"`.

## Specs

- S1. Every line result carries `momentKwM` (P in kW × L in m), `gamma` (m/(Ω·mm²)), and the `neutralSection` and `protectiveSection` the instructions derive from the adopted phase section. The LGA card, the DI card, the PDF line sections and the JSON line blocks show the moment and the conductivity, and the JSON carries the four of them, so the memoria can state what it used without repeating a table rule.
- S2. Every line result carries `dropPercentIn`, the drop computed with the protective device (In) instead of the load current. When the protection is fixed by the user (`protectionA > 0`), the drop criterion — the candidate filter and the reported problem — uses the In-based drop; `dropPercent` keeps its Ib meaning everywhere and the two are shown together.
- S3. The LGA result carries `minimumTube`: the outer tube diameter that ITC-BT-14 tabla 1 ties to the phase section (already transcribed in `BT14_NEUTRAL_ROWS`). A tube below it is reported as a problem. The DI tube stays a free field: the guide's diameter table is not transcribed in this repository and no value is invented for it.
- S4. Every line result carries `cableType`, and the card, the PDF and the JSON use it instead of hardcoded strings. LGA `RZ1-K 0,6/1 kV` (ITC-BT-14 §3 admits only RZ1-K or DZ1-K); DI in air `ES07Z1-K 450/750 V` (Guía-BT-15 tabla C); DI buried `RZ1-K 0,6/1 kV` (tabla E, the multiconductor the instruction asks for underground).
- S5. A derivation generated from the housing forecast carries the IGA of its power step. The result exposes `housingIga` and `maxAdmissiblePowerW` (230 V × IGA) and reports a problem when the power exceeds it. The card states that the IGA is not the ICP.
- S6. README, guide and source notes describe the new numbers; the documented out-of-scope list stays true (no differentials, no selectivity, no earthing).
- S7. Every new number is pinned by tests through the public engine, and the existing results stay byte-identical when no protection is fixed and no tube is below the table.

## Tasks

- T1 (S1, S3, S4) `lib/line-sizing.mjs`: `momentKwM`, `gamma`, `minimumTube`, `cableType`, plus the tube problem. Route: inline. Done (1c75250).
- T2 (S2) `lib/line-sizing.mjs`: In-based drop and criterion. Route: inline. Done (1c75250).
- T3 (S5) `lib/housing-supply.mjs` + derivation IGA plumbing. Route: inline. Done (1c75250).
- T4 (S1, S3, S4, S5) Cards, PDF and JSON wiring. Route: inline. Done (941a10a).
- T5 (S6) Docs. Route: inline. Done.
- T6 (S1..S7) Verification: suite 259/259, `tsc --noEmit` clean, `next build` clean, 3 780 automatic combinations compared against the base commit with no behavioural difference.
- Independent verifier: 0 blockers, `S1`–`S7` pass; its own differential over 5 040 automatic combinations reported zero diffs. Advisories: the import path still drops a whole derivation list when one entry is invalid (pre-existing mechanism, new trigger through `housingIgaA`), the tube column is duplicated as a lookup, and the DI PE/control rows keep their own `ES07Z1-K` designation (correct: they are different conductors).

## Log

- L1 (user, verbatim): "vamos con 1-5 dentro de lga/di"
- Context: the five suggestions came from the analysis of `data/Elec 3 present.pptx` and `data/UD2 · Instal·lacions interiors en habitatges.pptx` (L2 of `odd/tasks/import-json-project.md` is unrelated; the analysis is in memory #1766).
- Analysis: the material computes the drop with the PIA/IGA nominal current (`M = 230 · In · L`, BT-25 ap. 3) and lists "calcular la caída con Ib" as a frequent error; it demands the electrical moment column in the ELEC-3; it states the DI cable is ES07Z1-K 450/750 V; the tube follows table F of the guide; and the IGA follows the housing power steps.
- Decision (S2): a fixed protection switches the criterion, an automatic suggestion does not. Changing the criterion for every automatic line would silently move sections of memorias that already exist, and the training uses In because the PIA/IGA is known in the ELEC-3.
- Decision (S3): the DI tube table (Guía-BT-15 table F) is not transcribed here and the guide PDFs in `data/documentacion` are RC4-encrypted, so extracting it needs a tool the repo does not have. Inventing the values is not an option, so the DI keeps a free field. Revisit when the table is transcribed.
- Decision (S5): the IGA lives on the derivation state (`housingIgaA`), derived from the power step, so the engine, the JSON and the PDF all read one value instead of the panel recomputing its own.
- Risk: item 3 — the result object is part of the published JSON export, and S2 changes the section a fixed-protection line gets. Additive fields alone would not need a verifier; the criterion does.
- L2. Differential check: the base `lib/line-sizing.mjs` was rebuilt from `9802938` in a `mktemp -d` scratch copy and compared with the new one over 3 780 automatic combinations (both roles, both systems, seven powers, three lengths, five methods, both insulations, air and buried, three override values). `finalSection`, drops, protection, currents, automatic section and `problems` are identical in every case, so no emitted memoria moves.
- L3. `data/memoria_tecnica` (a separate Vite project dropped into `data/`) broke `pnpm typecheck` and `next build` for the whole app. Excluded in the root tsconfig like the other separate packages (d7d0b45), and pinned in `tests/ci-config.test.mjs`.
- L4. The DI tube minimum is deliberately missing: Guía-BT-15 table F is not transcribed here and the PDFs in `data/documentacion` are RC4-encrypted, so the values could not be read without a tool the repo does not have. Transcribe the table first, then extend `minimumTubeFor`.
- L5. Native assessment of the whole open slice (`--base-ref 9802938 --committed-only`, untracked scope excluded to keep the user's two `data/*.pptx` and `data/memoria_tecnica` out of the candidate): risk `medium` (`executable_change`), `review_due: false`, reason `under_budget`. No review opened.
- L6. The verifier's advisory about the import deserves its own task: `readInputs` returns `ok: true` without the derivation list when one derivation fails validation, which contradicts the all-or-nothing promise the import makes. Not fixed here because it is a different feature; the snapshot path deliberately tolerates the same case (its own test says so).
