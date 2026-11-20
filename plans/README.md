# Planes de animación

Auditoría hecha con `improve-animations` + `find-animation-opportunities` sobre el
commit `ffa90a2`. Referencia de criterio: `AUDIT.md` de la skill (filosofía de
Emil Kowalski).

## Planes

| # | Título | Severidad | Archivos | Estado |
| --- | --- | --- | --- | --- |
| 001 | Centralizar curvas y duraciones de movimiento | LOW | `app/globals.css` | DONE |
| 002 | Cambio de pestaña sin jank y sin animación redundante | HIGH | `app/globals.css`, `components/load-calculator.tsx` | TODO |
| 003 | Duraciones de overlays y feedback de press | MEDIUM | `components/ui/*` (5) | DONE |
| 004 | El acordeón abre y cierra con altura animada | HIGH | `components/ui/accordion.tsx` | DONE |
| 005 | Personalidad didáctica, blobs y cobertura de reduced-motion | MEDIUM | `app/globals.css`, `components/calculation-steps.tsx`, `components/load-calculator.tsx` | DONE |
| 006 | Feedback de destino válido en el preview del drag | MEDIUM | `app/globals.css` | TODO |
| 007 | Abrir y cerrar el índice de la guía sin salto | LOW | `app/globals.css`, `components/help-doc.tsx` | TODO |

Las filas 006 y 007 salen del handoff de `find-animation-opportunities` sobre el commit
`2ba0d27` (ver `006-feedback-destino-drag.md` y `007-indice-guia-detalles.md`). El diagnóstico inicial se
corrigió al verificar: la fila destino ya transiciona por
`components/ui/table.tsx:59`; el hueco real es el `data-over` del preview del
drag, que se setea en `components/interior-panel.tsx:393` pero ningún CSS
consume.

## Orden recomendado y dependencias

1. **001** primero: define `--ease-out`, `--dur-*` y `--ease-pop`. Todos los demás
   planes consumen esos tokens.
2. **002** y **003/004** no comparten archivos entre sí (`globals.css` +
   `load-calculator.tsx` contra `components/ui/*`): pueden ejecutarse en paralelo.
3. **005** al final: depende de 001 (tokens) y toca `globals.css` y
   `load-calculator.tsx`, los mismos archivos que 002.
4. **006** depende de 001 (usa `--dur-fast` y `--ease-out`) y comparte
   `globals.css` con 002 y 005: ejecutar después de esos para evitar conflictos
   de edición. Es un bloque CSS autocontenido y no toca TSX.
5. **007** depende de 001 (usa `--dur-base` y `--ease-out`). No depende de 006,
   pero ambos insertan en la misma zona de `globals.css`, así que conviene
   ejecutar 007 después de 006 y en ese orden. Es el único de los dos que toca
   TSX (`components/help-doc.tsx`, una sola clase).

## Criterio de la auditoría

- Presupuesto de frecuencia por interacción, no por audiencia: tabs, selects y
  formularios se mantienen cortos en los dos modos.
- La personalidad didáctica vive en `--ease-pop` y en dos micro-momentos
  (pasos y fila adoptada), nunca en el chrome compartido.
- Nada de motion sobre datos que se leen mientras se tipea.
