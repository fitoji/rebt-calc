# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: the engineer / proyectista** writing the *memoria técnica* for a low-voltage
building installation in Spain. They already know the REBT cold; the tool's job is to
produce a defensible, citable result they can sign and attach to a project file, not to
teach them the regulation. Their success is a deliverable that survives review: correct
numbers, the clause each number comes from, and a PDF they can hand over.

**Secondary: the self-employed installer (electricista)** who needs a fast, trustworthy
answer on the sections and protection for LGA/DI. They use the same app but are not the
profile the interface optimizes for; density and terminology may assume engineering
literacy.

## Product Purpose

An open-source web calculator for the *previsión de cargas* of a low-voltage building
(ITC-BT-10) and the sizing of its LGA (ITC-BT-14) and DI (ITC-BT-15) lines under the
Spanish REBT. It replaces fragile project spreadsheets with a single source of formulas
that recalculates live, cites the BOE clause behind every criterion, and exports the
result as a technical report.

Success means the engineer stops maintaining a spreadsheet and trusts this output enough
to put it in a signed project file.

## Positioning

Two claims a neighboring calculator could not truthfully copy:

1. **Every criterion carries its normative source.** Each card footer cites the BOE
   section it implements and links the consolidated text; the citation can be toggled
   but never invented.
2. **Nothing leaves the machine.** No backend, no database, no accounts — all state lives
   in `localStorage`, so a project's data never touches a server.

The third, structural claim: one formula, one place. The same `lib/` function feeds the
on-screen row, the subtotal and the PDF, so display, totals and export cannot diverge.

## Operating Context

- Spanish REBT jurisdiction (RD 842/2002, consolidated text BOE-A-2002-18099); all
  normative references, terminology and units are Spanish.
- The tool sits inside a project workflow: gather building data → compute previsión →
  size LGA/DI → emit a *memoria técnica* PDF that joins the rest of the project file.
- Inputs mirror how the data actually arrives: an existing spreadsheet (`data/`), a
  site survey, or a client's building description. A reference example building ships
  loaded so the app is never empty on first open.
- Work happens on desktop, in an office, typically with the BOE text open in another tab.
- Deliverables leave as PDF (A4 technical report with company letterhead and logo),
  JSON (raw data, and the only format the app can load back), Markdown and plain text
  (report for issues, notes, or re-pasting).

## Capabilities and Constraints

**Confirmed capability**

- Five modules in one app: previsión de cargas (P1–P5 + total), LGA, DI, the
  boards —dwelling DGMP (ITC-BT-25) and the interior board of locals and common
  services (ITC-BT-19)— and the single-line diagram (UNE-EN 60617) drawn from the
  results the other modules already computed.
- Meter forms (ITC-BT-16) inside the LGA tab: placement, assembly (CPM, room,
  cabinet, modules, panels), cabinet type, meter count, floor and functional
  units, with the instruction checks, the room requirements and the link
  scenario derived from it.
- Previsión blocks: P1 viviendas with simultaneity coefficient, P2 servicios generales
  (elevators, largest-motor 25 % uplift, other loads, common-area lighting), P3 locales
  and industry, P4 garajes, P5 IRVE (with the 10 % minimum set by Guía-BT-52,
  Anexo 2), plus the total.
- Line sizing returns `Ib`, section by voltage drop, normalized section adopted, `Iz`
  corrected by grouping/laying, proposed protection with `Ib ≤ In ≤ Iz` verified, and
  neutral/PE derived from the phase section.
- Link assumption (contadores centralizados / concentrados / único usuario) is chosen
  once per project and fixes both the LGA and DI drop limits together.
- Editable calculation parameters with documented defaults (5 750 / 9 200 W
  electrificación, 3 450 W local minimum, 20 / 10 W/m² garaje, lighting densities,
  3 680 W per IRVE charging point, 735,5 W/CV).
- Persistence in versioned `localStorage` keys with row-by-row validation on read;
  "Limpiar" clears project data but keeps calculation parameters.
- Light/dark theme applied before first paint, stored preference, OS does not override it.

**Constraints**

- **Spanish-only UI, permanently.** Not an i18n candidate. Copy, labels and terminology
  stay Spanish; a translation layer is not a product goal.
- Browser-only. No server, no auth, no sync, no cloud storage.
- TypeScript + Next.js + React + Tailwind + shadcn/Base UI. Color is consumed only
  through semantic tokens declared in `app/globals.css`; raw Tailwind palette classes in
  `components/**` or `app/**` are treated as bugs and guarded by a test. The PDF is the
  one documented exception (RGB palette in `lib/pdf-theme.mjs`).
- `pnpm build` does not type-check (`ignoreBuildErrors: true`); `tsc --noEmit` is the
  gate.
- The tool is a calculation aid, never a substitute for the competent technician; the
  disclaimer is a durable product statement, not boilerplate to be trimmed.

**Durable direction (confirmed, not yet built)**

Scope grows toward a broader low-voltage design tool. The realistic near-term blocks are
**puestas a tierra** and **short-circuit / breaking-capacity sizing** (with selectivity as
the adjacent concern). New capability should arrive as normative blocks that keep the
existing three-module mental model intact rather than as a re-architecture.

**Open decisions**

- Distribution model is undecided: the project is free MIT open source with no backend
  today, and a hosted/paid tier remains a possibility. Design decisions must not break
  the local-first promise while this is unresolved.
- No decision recorded on additional REBT blocks beyond grounding and short-circuit.

## Brand Commitments

- Name: **Electro-cálculos** (repository `rebt-calc`, `github.com/fitoji/rebt-calc`).
- License: MIT, open source, contributions welcome.
- Voice in the product and docs: precise, technical, direct Spanish addressed to a
  professional peer; no marketing register, no hedging about what the norm requires.
- Rebranding is a token change by design: swapping the values in `:root` must be enough
  to change the app's color identity.

## Evidence on Hand

- `data/Prevision_de_cargas_ITC-BT10-47d8bc.xlsx` — the original spreadsheet this tool
  replaces; the reference for defaults and worked examples.
- BOE consolidated REBT (RD 842/2002, BOE-A-2002-18099) — the normative authority every
  citation points at.
- `tests/` — 13 `node:test` suites covering formulas, storage, exports, tokens, contrast
  and UI regressions. These are real evidence that claims hold, and the precedent for
  how new claims should be backed.
- `README.md` — a detailed, maintained product document; treat it as the incumbent
  narrative source.

**Absences future work must not fabricate:** there are no real customers, testimonials,
case studies, benchmarks, press mentions, company clients or usage metrics. Any social
proof or performance claim would have to be created, not referenced.

## Product Principles

1. **Normative traceability outranks input speed.** A number without its ITC-BT clause is
   unfinished work; citations are visible, linkable and never invented.
2. **One formula, one place.** If a rule appears in a row, a subtotal and the PDF, it
   lives in `lib/` with a test and a source note. Duplication is a defect.
3. **Optimize for the deliverable, not the form.** The interface exists to produce a
   *memoria técnica* the engineer will sign — hierarchy and density serve that document.
4. **Local-first is a promise, not a constraint to trade away.** Data stays on the
   engineer's machine; nothing in the design may quietly require a server.
5. **Extend by normative block.** Growth adds REBT blocks beside the existing three,
   keeping the mental model and the citation habit intact.

## Accessibility & Inclusion

- WCAG AA is verified, not assumed: a test recomputes contrast ratios from
  `app/globals.css` and fails the build when a text pair drops below 4.5:1 or field
  borders and focus rings below 3:1 (1.4.11).
- Focus is visible by design; shadcn's half-opacity ring was deliberately removed because
  no color reaches 3:1 at that opacity on the light surface.
- Dialogs trap focus and close on `Escape`; every control, including those inside tables,
  has an associated label; table controls have accessible names covered by regression
  tests.
- `ink-ghost` is reserved for decorative marks (empty-cell dash) and must never carry
  informative text.
