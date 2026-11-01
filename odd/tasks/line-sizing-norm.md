# LGA/DI sizing corrected against the BT-14 and BT-15 guides

Objective: make the LGA and DI sectioning agree with the guides now tracked in `data/documentacion/`, expose the normative tables the app was missing, and explain every rule in didactic mode. Branch `fix/line-sizing-norm` · Delivery: single feature branch · Test runner: `node --test "tests/*.test.mjs"`.

## Specs

S1. LGA minimum section, ITC-BT-14 §3 (Guía-BT-14, sep 03 rev. 1, p. 7-8), verbatim: "La sección mínima será de 10 mm2 en cobre o 16 mm2 en aluminio." It applies to the LGA regardless of the system (single-phase or three-phase). Today the floor comes from the system (`MIN_SYSTEM_SECTION`), so a single-phase LGA is sized from 6 mm².

S2. DI minimum section, ITC-BT-15 §3 (Guía-BT-15, p. 9), verbatim: "La sección mínima será de 6 mm2 para los cables polares, neutro y protección y de 1,5 mm2 para el hilo de mando, que será de color rojo." It applies to the DI regardless of the system. Today a three-phase DI is floored at 10 mm², one standard section above what the guide allows.

S3. LGA cable family, ITC-BT-14 §3 (p. 7), verbatim: "Los conductores a utilizar, tres de fase y uno de neutro, serán de cobre o aluminio, unipolares y aislados, siendo su tensión asignada 0,6/1 kV." The guide's table only lists `RZ1-K (AS)` and `DZ1-K (AS)`, both XLPE. The LGA panel must not offer PVC, the LGA default insulation must be XLPE, and the report must state the same cable the calculation used.

S4. Buried cable spacing, Guía-BT-19 Table H: the tabulated spacings are 0, 0,25, 0,50 and 1,0 m. A spacing that falls between two tabulated values must take the factor of the smaller spacing, because a smaller separation admits less current. Today `buriedSpacingFactor` rounds up (`findIndex(value => value >= spacing)`), which is the only bracket in the module that errs on the unsafe side: 0,05 m returns 0,90 (the 0,25 m column) instead of 0,85.

S5. LGA neutral section, ITC-BT-14 Table 1 (p. 9): fase 10→neutro 10, 16→10, 25→16, 35→16, 50→25, 70→35, 95→50, 120→70, 150→70, 185→95, 240→120; the text adds "El conductor neutro tendrá una sección de aproximadamente el 50 por 100 de la correspondiente al conductor de fase, no siendo inferior a los valores especificados en la tabla 1." The LGA report derives the neutral instead of echoing a fixed field. Aluminium follows the guide's own rows ("16 (Al) 16 (Al)" a minimum of 16).

S6. Reference tables. The table dialog gains the guides' own tables, each labelled with its source document: BT-14 Tabla A (admissible current, copper RZ1-K, air and buried), BT-14 Tabla B (aluminium RZ1-K), BT-14 Tabla 1 (phase, neutral and tube diameter), BT-15 Tabla C (ES07Z1-K, single-phase and three-phase), BT-15 Tabla D (RZ1-K unipolar, air and buried) and BT-15 Tabla E (RZ1-K multiconductor, air and buried), plus ITC-BT-19 Tabla B (ambient temperature correction), which the dialog never showed. Values are transcribed from the tracked PDFs, never re-derived.

S7. Didactic mode explains, for LGA and DI: why the minimum section depends on the line and not on the system (quoting the guide), why the LGA is XLPE only, how the neutral is derived, and that the voltage-drop limit depends on the metering arrangement (already present). Each explanation names the guide and section it comes from.

S8. Conductivity (`gamma`). The numbers stay as they are until the user decides; the field must say what temperature each default represents and that the guides' worked examples use ≈52 m/(Ω·mm²) (copper at 40 °C) with a 1,12 factor for 70 °C. No silent change of results.

S9. Nothing regresses: the existing suite keeps passing, and each fix is pinned by a test that fails before it.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S2, S4 | inline | done | bbcdc61 |
| T2 | S5 | inline | done | 34b352b |
| T3 | S3 | inline | done | 608acec |
| T4 | S6 | inline | done | 06bcffc |
| T5 | S7, S8 | inline | done | 7f915bc |
| T6 | S9 | inline | done | see git log |

## Log

L1. User request, verbatim: "si, y documenta todo lo aprendido, recuerda agregar en  la seccion didactica las explicaciones, agrega las tablas que faltan y corrige las que estan mal"

L2. Prior audit (obs engram `audit/di-lga-sections`): P1 gamma over-conservative (44 LGA / 48,5 DI; the BT-15 tables are built with ≈52), P2 minimum keyed to the system, P3 LGA defaults to PVC with an XLPE gamma, P4 LGA neutral and PE are static fields, P5 buried spacing rounds the unsafe way, P6 buried currents 17-20 % below BT-15 Tabla D. The user authorised P2, P3 and P5 explicitly and asked for the missing tables plus the didactic explanations. P1 stays open pending a decision on the default gamma.

L3. S6 narrowed on purpose: the reference section listed ITC-BT-19 Tabla B (corrección por temperatura ambiente), but that guide is NOT among the tracked PDFs, so its factors were left out rather than invented. The gap is disclosed in the help page and in the dialog footnote.

L4. T1 changed the contract of the engine: `sizeLine` now requires `role` ('lga' | 'di') and throws without it, so a future caller cannot silently fall back to a system-keyed floor. The test that used to pin the minimum ("the normative minimum section floors LGA and DI") passed for the wrong reason: its LGA case was three-phase and its DI case single-phase, which coincidentally matched the system-keyed floor. It was replaced by the two cross cases.

L5. T4 extended the engine beyond the user's explicit list (P6 in the audit): the LGA and DI now read the tables their own instruction publishes instead of the generic ITC-BT-19 column. Verified anchors: LGA air 10 mm2 60 A (was 54), LGA buried 10 mm2 77 A (was 64), DI buried multiconductor 6 mm2 53 A (was 48), DI air PVC unchanged (36 A, the ES07Z1-K table matches the PVC column exactly).

L6. Verified: `pnpm typecheck` clean, `pnpm test` 179/179, `pnpm build` compiles and prerenders `/` and `/ayuda`. CI on main runs the same three steps.

L7. Still open for the user: the default gamma (44 LGA / 48.5 DI) was left untouched by request. With gamma 52.1 the engine reproduces BT-15 Tabla H exactly at every length; with the current defaults it lands one section above the guide for a 5750 W dwelling.

L8. Closing verification with the engine, after every task:
```
LGA 194,7 kW / 25 m / 0,5 % / γ 44 (default)   S=150  neutro=70  PE=75  manda caída
LGA same, γ 47,2 (70 °C)                       S=150  neutro=70  PE=75  manda caída
LGA same, γ 52,1 (40 °C, guía)                 S=120  neutro=70  PE=60  manda corriente
DI 5750 W / 14 m / 1 % / γ 48,5 (default)      S= 10  Iz tabla=50 A  caída=0,63 %
DI same, γ 52,1 (guía BT-15 tabla H: 6 mm²)    S=  6  Iz tabla=36 A  caída=0,97 %
DI trifásica 10 kW / 10 m                      S=  6  (antes 10 por el mínimo del sistema)
DI enterrada 9200 W / 20 m                     S= 16  Iz tabla=113 A  (antes 64 A)
```
The headline LGA section is still governed by the default γ: with 44 the 194,7 kW line lands on 150 mm² and with the guide's 52,1 on 120 mm². Everything else the audit flagged is fixed; that one number stays open by explicit request.
