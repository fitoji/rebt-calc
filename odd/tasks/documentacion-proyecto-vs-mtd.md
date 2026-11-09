# Documentación exigible: proyecto o memoria técnica de diseño (ITC-BT-04)

Estado: en curso. Clasificar la previsión de cargas según ITC-BT-04 §3 y §4, y sustituir el checklist genérico de `/requisitos` por ese veredicto.

## Specs

S1. `/requisitos` responde una sola pregunta: si la previsión de cargas del edificio en curso exige **proyecto** o solo **memoria técnica de diseño (MTD)**, según ITC-BT-04. Texto del usuario: «la idea es si el la prevision de cargas del edificio que estoy haciendo cumple requisitos para ser proyecto o solo memoria tecnica».

S2. Vivienda unifamiliar con potencia prevista ≤ 50 kW exige solo MTD; por encima de 50 kW exige proyecto. ITC-BT-04 §3.1 grupo f: «Las correspondientes a viviendas unifamiliares. P > 50 kW». Texto del usuario: «vivienda unifamiliar de menos de 50kw de potencia requiere memoria tecnica».

S3. Aparcamiento o estacionamiento con ventilación forzada exige proyecto cualquiera sea su ocupación, sin umbral de potencia. ITC-BT-04 §3.1 grupo g: «Las de aparcamientos o estacionamientos que requieren ventilación forzada. Cualquiera que sea su ocupación». Texto del usuario: «si tiene aparcamiento de ventilacion forzada entonces requiere proyecto».

S4. Edificios destinados principalmente a viviendas, locales comerciales y oficinas que no sean de pública concurrencia exigen proyecto con P > 100 kW **por caja general de protección**. ITC-BT-04 §3.1 grupo e. Decisión del usuario: evaluar por CGP, no por edificio.

S5. Si la instalación cae en más de un grupo se aplica el criterio más exigente (§3.3); si no cae en ninguno, requiere MTD (§4: «Requerirán Memoria Técnica de Diseño todas las instalaciones sean nuevas, ampliaciones o modificaciones no incluidas en los grupos indicados en el apartado 3»).

S6. Los datos que la app no puede inferir de la previsión se cargan **en la previsión de cargas**, no como declaraciones aparte: potencia de alumbrado exterior, potencia de piscinas y fuentes, y las categorías cualitativas (pública concurrencia, riesgo de incendio o explosión, quirófanos, locales húmedos/polvorientos/corrosivos, locales mojados, temporales, máquinas de elevación y transporte, recarga en exterior, modo 4 de recarga). Decisión del usuario: «Llevarlos a la previsión».

S7. El checklist genérico de 19 ítems se elimina: la página pasa a ser el veredicto y su tabla de grupos, con la referencia a ITC-BT-04. Decisión del usuario: «Reemplazar el checklist».

S8. Ninguno de esos datos nuevos altera P1–P5 ni la potencia total prevista: son datos de documentación, no cargas del edificio.

## Grupos evaluables (ITC-BT-04 §3.1, P = potencia prevista según ITC-BT-10)

| Grupo | Instalación | Límite |
| --- | --- | --- |
| a | Industrias en general | P > 20 kW |
| b | Locales húmedos, polvorientos o con riesgo de corrosión; bombas de extracción o elevación de agua | P > 10 kW |
| c | Locales mojados; generadores y convertidores; conductores aislados para caldeo | P > 10 kW |
| d | Instalaciones de carácter temporal | P > 50 kW |
| e | Edificios de viviendas, locales comerciales y oficinas (no pública concurrencia) | P > 100 kW por CGP |
| f | Viviendas unifamiliares | P > 50 kW |
| g | Aparcamientos con ventilación forzada | Cualquiera sea su ocupación |
| h | Aparcamientos con ventilación natural | > 5 plazas |
| i | Locales de pública concurrencia | Sin límite |
| j | Líneas BT con apoyos comunes con AT; máquinas de elevación y transporte; tensiones especiales; rótulos luminosos; cercas eléctricas; redes aéreas o subterráneas de distribución | Sin límite de potencia |
| k | Alumbrado exterior | P > 5 kW |
| l | Locales con riesgo de incendio o explosión, excepto aparcamientos | Sin límite |
| m | Quirófanos y salas de intervención | Sin límite |
| n | Piscinas y fuentes | P > 5 kW |
| z | Recarga de vehículo eléctrico | P > 50 kW; en el exterior > 10 kW; modo 4 sin límite |

## Tasks

T1 · Modelo de datos de documentación (potencias y categorías) + persistencia en localStorage + export/import JSON + tests — S6, S8 — hecho en `b04b572`
T2 · Bloque de UI en la pestaña Previsión para editar esos datos — S6, S8 — hecho en `5cdaa80`
T3 · Motor de clasificación ITC-BT-04 §3/§4 (`lib/project-documentation.mjs`) + tests por grupo — S1–S5 — hecho en `b04b572`
T4 · Reescribir `/requisitos` como clasificador y eliminar el checklist — S1, S7 — hecho en `753cd03`
T5 · Ayuda y README alineados con la nueva página — S7 — hecho en `abce4c6`

## Log

L1 — pedido del usuario, verbatim: «creo que entendiste mal, revisa https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099#ib-4 la idea es si el la prevision de cargas del edificio que estoy haciendo cumple requisitos para ser proyecto o solo memoria tecnica, entonces por ejemplo vivienda unifamiliar de menos de 50kw de potencia requiere memoria tecnica, y si tiene aparcamiento de ventilacion forzada entonces requiere proyecto»

L2 — decisiones del usuario sobre el alcance: (a) los criterios no inferibles «Llevarlos a la previsión»; (b) grupo e evaluado «Por caja general de protección»; (c) el checklist actual se reemplaza.

L3 — fuente normativa leída: BOE-A-2002-18099 consolidado (última actualización 03/09/2025), ITC-BT-04 §3.1, §3.2, §3.3 y §4. Se transcriben los umbrales en la tabla de arriba; ningún umbral se inventa.

L4 — cierre. Verificado en navegador con dos casos reales: el proyecto de ejemplo (11 viviendas, 2 locales, 2 garajes, IRVE) da «Requiere proyecto» por §3.1 g, y el proyecto limpio con una vivienda de 5.750 W da «Solo memoria técnica de diseño» por §4. La card de documentación renderiza sus dos campos numéricos y las nueve categorías. 423/423 tests, `tsc --noEmit` y `next build` limpios. Decisión de implementación: la página no recalcula la previsión; la calculadora guarda un snapshot (`electrocalc-documentation-snapshot:v1`) y la página solo clasifica. El número de CGPs es `meterCenter.concentrations`, acotado a 1 mínimo.
