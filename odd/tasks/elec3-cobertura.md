# Cobertura del model ELEC-3 en la app

Objective: medir, campo por campo, qué parte del modelo oficial ELEC-3 (memòria tècnica de disseny, Gencat, `G146NSIN-157-00`) ya rellena la calculadora y qué falta. No es una implementación: es el mapa que decide qué se construye después.

Source: `data/documentacion/elec3_model_memoria_tecnica_2024.doc` (descargado del impreso oficial de la Generalitat, versión 2024, 2 páginas) y su extracción de texto `elec3_model_memoria_tecnica_2024.txt`.

## Cómo está hecho el modelo

Una hoja de líneas y una hoja de datos generales.

- **Hoja 1**: una tabla con una fila para la derivación individual (`A — B`) y doce filas de circuitos (`C — D` … `Y — Z`). Columnas: carga simultánea, potencia, cos φ, intensidad, sección por fase, longitud, momento eléctrico, caída parcial y total, tipo de conductor y tensión nominal de aislamiento, canalización (sin tubo, tubo ∅, enterrado con profundidad), aislamiento de la instalación (kΩ), neutro y protección.
- **Hoja 2**: titular, uso, sello del instalador, emplazamiento, tipo de instalación (nueva/ampliación/reforma), **tres filas de interruptor diferencial** (circuito, nombre, In, sensibilidad), empresa distribuidora, resistencia de tierra, superficie del local, sección de la derivación individual, potencia máxima admisible, tensión, potencia a instalar, IGA y firma.

La consecuencia estructural: **un ELEC-3 es una instalación**, mientras que un proyecto de la app es un edificio con N instalaciones. El puente natural no es un ELEC-3 por proyecto: es **un ELEC-3 por derivación**, con la LGA como contexto del edificio.

## Hoja 1 · campo por campo

| Columna del ELEC-3 | Valor en la app | Estado |
|---|---|---|
| TRAM | `lga`, `di` y cada `derivations[]` | cubierto |
| Càrrega simultàn. (%) | No se guarda por línea; las derivaciones van a potencia plena | ausente |
| Potència (kW) | `powerW / 1000` | cubierto |
| cos φ | `cosPhi` | cubierto |
| Intens. (A) | `ratedCurrent` (Ib) y desde esta entrega `dropPercentIn` con su In | cubierto |
| Secció per fase (mm²) | `finalSection` | cubierto |
| Long. (m) | `lengthM` | cubierto |
| Moment elec. (kW·m) | `momentKwM` | cubierto (nuevo) |
| Caiguda parcial (%) | `dropPercent` (Ib) y `dropPercentIn` (In) | cubierto |
| Caiguda total (%) | Solo parciales: no hay suma LGA + DI (+ circuito) | ausente |
| Caract. conduct.: tipus | `cableType` | cubierto (nuevo) |
| Caract. conduct.: tensió nominal d'aïllam. | Va dentro de `cableType` (`0,6/1 kV`, `450/750 V`) como texto | parcial: no es un campo propio |
| Canalització: sense tub (sistema) | `installation` (`air` = bajo tubo, `buried`) y `method` | parcial: el modelo distingue «sin tubo» de «bajo tubo», la app no |
| Canalització: sota tub ∅ mm | `tubeDiameter`, con el mínimo de la tabla 1 en la LGA | parcial: la DI no tiene mínimo de tabla |
| Canalització: enterrat, profunditat m | No existe el dato | ausente |
| Aïllam. instal·l. (kΩ) | No se calcula; la ITC-BT-19 §2.9 pide ≥ 500 kΩ | ausente |
| Conduc. Neutre (mm²) | `neutralSection`, `lgaNeutralSection` | cubierto |
| Conduc. Protec. (mm²) | `protectiveSection` | cubierto |

## Hoja 2 · campo por campo

| Campo del ELEC-3 | Valor en la app | Estado |
|---|---|---|
| Observacions · IP d'aparamenta i receptors | No | ausente (guia BT-27, volums de bany) |
| Titular | No: `projectInfo` tiene empresa, obra y contacto | ausente |
| Ús a què es destina | No | ausente |
| Segell de l'instal·lador | No | ausente (se firma y sella a mano) |
| Emplaçament (núm., pis, porta, carrer, localitat, NCP) | `projectInfo.workAddress`, un solo texto | parcial |
| Instal·lació: nova / ampliació / reforma | No | ausente |
| Interruptor diferencial (circuito, nombre, In, sensibilidad) ×3 | Fuera de alcance declarado en la guía | fuera de alcance |
| Empresa distribuïdora | No | ausente |
| Resistència de terra (Ω) | No | ausente |
| Superfície del local (m²) | Superficies por fila y por garaje; no hay una superficie del local | parcial |
| Secció de la derivació individual (mm²) | `diResult.finalSection` | cubierto |
| Potència màxima admissible (kW) | `maxAdmissiblePowerW` por vivienda (`230 × IGA`) | parcial: solo viviendas |
| Tensió (V) | `voltageV` | cubierto |
| Potència a instal·lar (kW) | `result.total` | cubierto |
| IGA (A) | Tabla A vía `housingIga`, solo en derivaciones de vivienda | parcial |
| Data i signatura | No | ausente (manual) |

## Lo que hoy se puede rellenar de una memoria real

Con lo que la app sabe hoy, un ELEC-3 por derivación queda completo en la hoja 1 salvo cuatro celdas: carga simultánea, caída total, aislamiento de la instalación y profundidad de enterramiento. Todo el resto de la fila —potencia, cos φ, Ib, sección, longitud, momento, caída parcial, tipo y tensión del conductor, tubo, neutro y protección— sale del motor sin intervención manual.

La hoja 2 es casi toda administrativa y hoy está vacía salvo sección de la DI, tensión, potencia a instalar y (en viviendas) IGA y potencia máxima admisible.

## Estado actual de la implementación

`data/memoria_tecnica` ya renderiza la **hoja 1** del modelo (`src/components/Elec3Sheet.tsx`), alimentada por el JSON de `Descargar datos`:

- 16 columnas con la cabecera agrupada del impreso (caída parcial/total, tipo y tensión del conductor).
- Una fila por línea del proyecto: la derivación individual editada a mano y cada derivación generada, con su nombre real y su tipo (VIVIENDA, LOCAL, GARAJE, SERVEIS GENERALS, IRVE, MANUAL).
- Las celdas que la exportación no trae —carga simultánea, caída total y aislamiento de la instalación— se pintan como pendientes con su leyenda; nunca se estiman.
- Cabecera con emplazamiento, fecha, potencia total y el contexto de la LGA (sección, protección, neutro, PE, tubo).
- Exportación a Excel y CSV sobre las mismas columnas, e impresión A4 apaisada con membrete y el código del modelo.

Lo que la hoja 1 todavía no puede escribir es exactamente lo que falta en el motor: las tres celdas pendientes y las doce filas `C — D`…`Y — Z` de circuitos.

## Orden sugerido

1. **Caída total acumulada.** Barata y es la celda que el instalador calcula a mano: LGA + DI, y DI + circuito cuando exista el módulo de circuitos. Decidir si se muestra como suma o con la compensación de límites del material del curso.
2. **Carga simultánea por línea.** La DI del material del curso va al 100 %; los circuitos con `Fs · Fu`. Requiere decidir si la derivación hereda la simultaneidad de la previsión o se escribe.
3. **Datos administrativos de la hoja 2.** Titular, uso, emplazamiento desglosado, tipo de instalación y distribuidora son campos de texto del proyecto: baratos y desbloquean media hoja 2.
4. **Aislamiento de la instalación (kΩ) y profundidad de enterramiento.** Dos campos numéricos con su mínimo normativo; el primero es informativo, el segundo condiciona la tabla de intensidad admisible en enterrado.
5. **Módulo de circuitos C1–C13.** Es lo que llena las doce filas `C — D`…`Y — Z`; sin él, la hoja 1 de un ELEC-3 de vivienda queda con una sola fila.
6. **Diferenciales.** Fuera de alcance hoy; la hoja 2 tiene tres filas esperándolos.

## Log

- L1 (user, verbatim): "arreglara en commit aparte , luego push pr y /impeccable en @data/memoria_tecnica (elec-3)… tengo la tabla de la memoria tecnica legal que necesitamos para implementar, incorporala y vayamos viendo que datos podemos ir completando hasta donde vamos con la app en el momento. busca cual es el mejor lugar para incorporla"
- Decision (lugar): el modelo vive en `data/documentacion/` junto a las guías del REBT, porque es la fuente legal del documento que la app debe reproducir, no material de la aplicación. Se guardan el `.doc` original y una extracción `.txt` para poder buscar y diferenciar los campos sin un lector de Word; el `.txt` no sustituye al `.doc`.
- El documento se descargó del impreso público de la Generalitat (`downloadFile.html?idDoc=G146NSIN-157-00.doc`, 339 456 bytes, 2 páginas, versión 2024).
- L2. `data/memoria_tecnica` ya renderiza la hoja 1 (commit 570f0ad): 16 columnas legales con cabecera agrupada, una fila por línea, celdas pendientes marcadas, exportación Excel/CSV e impresión A4 apaisada con membrete. El diseño sigue el mundo del starter (slate sobre blanco) y reemplaza la tabla de tramos con búsqueda y orden, que no tenía sentido para un documento que se firma; el CTA de carga quedó dentro del estado vacío en vez de en la cabecera.
- Decisión (una sola fórmula): para no repetir en la memoria las tablas del neutro y del PE, el motor de la calculadora pasó a exportar `neutralSection` y `protectiveSection` en el resultado de cada línea (commit 87afd05). La memoria solo lee.
- Verificado mirando: captura a 1600 px del estado vacío y del cargado, y el PDF de impresión rasterizado (A4 apaisado, una página con las 11 líneas). El detector de Impeccable no reportó hallazgos sobre los archivos nuevos.
