# Página de ayuda con documentación de uso

Objective: a help page reachable from the header that documents, with images, how to use the calculator and each of its modes.

Branch: feat/help-page · Delivery: single feature branch · Test runner: pnpm test · Capture tool: headless Chrome over CDP

## Specs

- S1. El header tiene un botón de ayuda que navega a una página de ayuda dedicada. Cita: "quiero un boton de ayuda en el header que vaya a una pagina".
- S2. La página explica, con documentación cuidada, cómo se usa la app. Cita: "donde explicas bien documentado como utilizar la app".
- S3. La página cubre las distintas modalidades de la app. Cita: "y sus distintas modalidades". Modalidades a documentar: previsión de cargas P1–P5, LGA, DI, los tres supuestos de instalación, modo Cálculo/Didáctico, tema claro/oscuro, exportaciones, persistencia y notas de normativa.
- S4. La página usa imágenes reales de la app. Cita: "utiliza imagenes".
- S5. Se autoriza la infraestructura que haga falta para cumplirlo, incluida la captura reproducible de esas imágenes. Cita: "y lo que necesites".

## Tasks

- T1 (S1) — enlace de ayuda en el header y ruta `app/ayuda/page.tsx` con su metadata. Route: inline. Done — `139b938`, `4bbbd67`.
- T2 (S4, S5) — `scripts/capture-help-shots.mjs`: captura por CDP con Chrome headless, recorte por elemento, manifest generado en `lib/help-shots.mjs`. Route: inline. Done — `c89c8d3`.
- T3 (S2, S3) — contenido de la página por modalidad, con capturas, fórmulas y citas normativas. Route: inline. Done — `4bbbd67`.
- T4 (S2) — navegación interna (índice con anclas), metadatos de la ruta y accesibilidad. Route: inline. Done — `4bbbd67`.
- T5 (S1–S4) — `tests/help-page.test.mjs`: cobertura de modalidades, assets existentes y tokens de diseño. Route: inline. Done — `4bbbd67`.
- T6 (S1–S5) — verificación: suite, `tsc`, build, y revisión de la captura ejecutada de punta a punta. Route: inline. Done — `4bbbd67`.

## Log

- L1. User request verbatim: "quiero un boton de ayuda en el header que vaya a una pagina donde explicas bien documentado como utilizar la app y sus distintas modalidades , utiliza imagenes y lo que necesites".
- L2. Decision: route `/ayuda`, in Spanish like the rest of the UI copy; the code, comments, commit messages and the capture script stay in English.
- L3. Decision: the images are real screenshots of the running app, not hand-drawn mockups, so the documentation cannot drift from the product. They are captured by element through Chrome DevTools Protocol from a script that is committed and rerunnable, and the shot list with its pixel dimensions is generated into `lib/help-shots.mjs` so the page cannot reference a missing asset.
- L4. Decision: no new dependency. Chrome is already installed on the machine and Node 24 exposes a global `WebSocket`, so the capture script talks CDP directly. Capturing is a development step, not part of the build or CI.
- L5. Decision: the page documents the known limits honestly, including the ambient-temperature correction gap recorded in the LGA/DI module (Guía-BT-19 defers to UNE 20460-5-523), so the help page cannot be read as a promise the engine does not keep.
- L6. T1 implemented: `app/ayuda/page.tsx` route with its own metadata, a header link (`HelpCircle` icon + `aria-label`) in `components/load-calculator.tsx`, and a shared `components/site-header.tsx` so the help page and the calculator show the same masthead. `SiteHeader` takes `titleAs`, so the brand line is an `h1` only on the calculator, where it is the page's only heading.
- L7. T2 implemented: `scripts/capture-help-shots.mjs` drives headless Chrome over CDP, sets localStorage before load, clicks the tab/dialog it needs, measures the target element and captures a clipped PNG at device scale factor 2. It writes `public/ayuda/*.png` and regenerates `lib/help-shots.mjs` with the real pixel dimensions. Eleven shots: masthead, viviendas, servicios generales, locales, garajes, recarga de vehículos, parámetros, LGA, DI, tabla de referencia y modo didáctico.
- L8. T3 implemented: eighteen sections in five groups (empezar, previsión de cargas, dimensionado de líneas, uso diario, referencia). Every normative claim cites the instruction and the BOE link already used by the app's `SourceNote`s.
- L9. T4 implemented: sticky index with anchor links on `lg` and a native `details` index below it, skip link to the content, one `h1`, `h2` per section and `h3` for subsections, `scroll-mt-8` on anchors, `next/image` sized from the manifest, and a back link to the calculator. The index and the document read the same `HELP_SECTIONS`/`HELP_GROUPS` list, so anchors cannot drift from the content.
- L10. T5 implemented: eleven tests assert that every section of the index renders exactly once and in order, that every manifest shot exists under `public/ayuda` with the size the manifest promises (read from the PNG IHDR), that the capture script and the guide both know the same shot ids, that both pages share one masthead and the calculator links to `/ayuda`, that the route carries its own metadata, that accessibility invariants hold (one `h1`, skip link, labelled navigation, native disclosure) and that the guide uses theme tokens and cites the sources.
- L11. T6: `pnpm test` 164/164, `pnpm typecheck` clean, `pnpm build` clean with `/ayuda` prerendered as static. The capture was executed end to end against a local production server and the eleven PNGs were regenerated with identical dimensions. The page was reviewed at 1440 px, at 390 px and in dark mode.
- L12. Decision after review: the guide keeps the app's typography in both explanation modes instead of overriding it, so the documentation reads like the product it documents.
