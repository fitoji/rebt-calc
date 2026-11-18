# SwitchField para todos los switches de la app

Branch: `feature/differentials` (apila sobre el trabajo previo) · Delivery strategy: `ask-on-risk` · Runner: `pnpm test` + `pnpm typecheck`

## Specs

S1. Usuario (verbatim): «bien ahora para los switch de toda la app me gustaria implementarlo como aqui: Automatic check-in Boarding pass lands 24 h before takeoff. Check in on time. Flip it by tap, label or Space. de https://ui-sdk.dev/sink?uses=Switch». Aceptación: los switches de la app usan los behaviors de UI SDK: tap, clic en rótulo y Space; el rótulo mantiene el mismo texto en ambos estados y el thumb sigue el estado.

S2. Documentación verificada de `@ui-sdk/react/switch`: `Switch` + `SwitchThumb`, con `Field`/`FieldLabel`/`FieldDescription` para conectar rótulo y descripción. Comportamientos probados: click, click en label, Space, thumb follows state; Enter nunca alterna. `onCheckedChange(checked, details)` con `details.reason` y `details.cancel()`.

S3. Usuario eligió (verbatim): «UI SDK React». Se agregó `@ui-sdk/react@0.1.0-beta.10` (peer: React ≥19, @types/react ≥19.2.10, @ui-sdk/core ^0.1.0-beta.10) con excepción exacta en `pnpm-workspace.yaml`. Alcance: los dos switches existentes —`components/documentation-panel.tsx` y el modo didáctico en `components/load-calculator.tsx`— más el wrapper compartido.

S4. Restricciones: conservar la apariencia actual con tokens semánticos (sin colores nuevos), mantener la API de `components/ui/switch.tsx` (`checked`, `onCheckedChange(boolean)`, `id`, `aria-label`) para no reescribir call sites, y conservar los ids `doc-<key>` y `explanation-mode`.

## Tasks

- T1 — S1,S2,S3,S4 — inline — done — Migrar `components/ui/switch.tsx` a UI SDK, crear `components/ui/switch-field.tsx` con Field + label overlay y actualizar los dos call sites; suite 745/745, build OK, detector `[]`.

## Log

L1 (verbatim): «bien ahora para los switch de toda la app me gustaria implementarlo como aqui: Automatic check-in Boarding pass lands 24 h before takeoff. Check in on time. Flip it by tap, label or Space. de https://ui-sdk.dev/sink?uses=Switch»

- 2026-11-18 — Decisión del usuario: «UI SDK React» sobre la composición local. Dependencia beta añadida con versión exacta; no se adoptó el resto del SDK más allá de Switch/Field.
- 2026-11-18 — Verificación: `pnpm test` 745/745, `pnpm typecheck` limpio, `pnpm build` correcto, detector de Impeccable `[]`. El wrapper conserva la API `onCheckedChange(boolean)` para no reescribir call sites; los ids `doc-<key>` y `explanation-mode` siguen presentes.
