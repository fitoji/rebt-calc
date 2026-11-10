# Card de centralización accesible fuera de la pestaña LGA

Estado: futura, no implementada. Diferida por decisión del usuario.

## Specs

S1. La card de centralización de contadores (supuesto de enlace, colocación, número de contadores, conjunto, armario, planta) debe poder editarse también cuando la pestaña LGA no está visible, es decir con una o dos viviendas. Texto del usuario: «deja lo de la card de contadores apuntado para despues».

S2. Hoy vive únicamente dentro del panel de la pestaña LGA (`MeterCenterCard`), y la visibilidad progresiva de pestañas oculta LGA cuando hay 2 o menos viviendas. Con una vivienda el supuesto se deriva automáticamente como «único usuario sin LGA», así que no bloquea nada; con dos viviendas el supuesto queda fijo en «contadores totalmente centralizados» y no hay forma de forzar «contadores en más de un lugar».

S3. El cambio debe preservar el comportamiento actual del supuesto automático para unifamiliar (una vivienda ⇒ single-user, DI 1,5 %) y no volver a introducir avisos de LGA cuando no hay LGA.

## Notas de implementación

- Opciones evaluadas en su momento: (a) mover `MeterCenterCard` a la pestaña Previsión, siempre visible; (b) dejarla en LGA y agregar un acceso equivalente en Previsión cuando la pestaña LGA esté oculta; (c) permitir forzar el supuesto desde Parámetros de cálculo.
- La decisión de producto quedó pendiente: el usuario eligió primero el supuesto automático y pidió diferir esta parte.
- Archivos relevantes: `components/meter-center-card.tsx`, `components/load-calculator.tsx` (pestaña LGA y `updateMeterCenter`), `lib/meter-center.mjs` (`installationTypeFor`), `lib/installation-config.mjs` (`INSTALLATION_SCENARIOS`).

## Log

L1 — pedido del usuario, verbatim: «deja lo de la card de contadores apuntado para despues»
L2 — contexto: surgió al arreglar el supuesto de unifamiliar (commit 3a71f91). Con 1–2 viviendas la card no es alcanzable porque la pestaña LGA está oculta y la card es su único hogar.
