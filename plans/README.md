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
| 005 | Personalidad didáctica, blobs y cobertura de reduced-motion | MEDIUM | `app/globals.css`, `components/calculation-steps.tsx`, `components/load-calculator.tsx` | TODO |

## Orden recomendado y dependencias

1. **001** primero: define `--ease-out`, `--dur-*` y `--ease-pop`. Todos los demás
   planes consumen esos tokens.
2. **002** y **003/004** no comparten archivos entre sí (`globals.css` +
   `load-calculator.tsx` contra `components/ui/*`): pueden ejecutarse en paralelo.
3. **005** al final: depende de 001 (tokens) y toca `globals.css` y
   `load-calculator.tsx`, los mismos archivos que 002.

## Criterio de la auditoría

- Presupuesto de frecuencia por interacción, no por audiencia: tabs, selects y
  formularios se mantienen cortos en los dos modos.
- La personalidad didáctica vive en `--ease-pop` y en dos micro-momentos
  (pasos y fila adoptada), nunca en el chrome compartido.
- Nada de motion sobre datos que se leen mientras se tipea.
