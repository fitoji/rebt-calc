# Centralización de contadores · ITC-BT-16

Objetivo: añadir el eslabón que falta en la instalación de enlace —CGP → LGA → CC → DI— con
una card de centralización de contadores que elige las opciones de la ITC-BT-16, verifica
las combinaciones y deriva el supuesto de enlace que hoy se elige a mano.
Branch: `main`. Delivery: work-unit commits. Test runner: `node --test tests/*.test.mjs`.

## Specs

- S1. La pestaña LGA incorpora, **al principio**, una card independiente «Formas de
  contadores · ITC-BT-16» con estas selecciones: forma de colocación (individual /
  concentrada en un lugar / concentrada en más de un lugar), conjunto de medida (caja de
  protección y medida, local, armario, módulos o paneles), tipo de armario (empotrado /
  adosado), número de contadores, número de concentraciones, planta, número de plantas del
  edificio, tipo de local, interruptor general de maniobra (160 A / 250 A), mando (sí/no) y
  telecomunicaciones (sí/no). Debajo se listan los requisitos del cuarto que la instrucción
  exige para el conjunto elegido, y la card muestra las caídas LGA/DI del supuesto.
- S2. El número de contadores se propone desde la previsión (unidades de vivienda +
  locales + 1 de servicios generales + 1 de IRVE si hay plazas) y se puede editar a mano,
  igual que la potencia de la LGA.
- S3. La card verifica, con aviso en la propia card:
  - más de 16 contadores → local obligatorio; armario solo hasta 16;
  - colocación individual → un solo usuario (dos usuarios desde un mismo lugar van a Caja
    de Protección y Medida, ITC-BT-13);
  - interruptor general de maniobra obligatorio con más de dos usuarios; 160 A hasta
    90 kW y 250 A hasta 150 kW, por encima queda fuera de la tabla de la ITC-BT-16;
  - edificios de más de 12 plantas: concentraciones por plantas intermedias, cada una
    cubriendo 6 o más plantas (se comprueba con las plantas del edificio repartidas entre
    las concentraciones); concentraciones por planta solo si cada una supera los 16
    contadores;
  - alturas de montaje: 0,25 m del suelo a la parte inferior y 1,80 m como máximo al
    cuadrante de lectura;
  - grado de protección del conjunto: IP40/IK09 en interior y IP43/IK09 en exterior,
    según la ubicación elegida.
- S4. La card es la única fuente del supuesto de enlace: individual → único usuario sin
  LGA; concentrada en un lugar → contadores totalmente centralizados; concentrada en más
  de un lugar → contadores en más de un lugar. El selector «Supuesto de enlace» de LGA y
  DI pasa a mostrarse derivado y de solo lectura. La card sigue accesible cuando el
  supuesto es único usuario: en ese caso se muestra en la pestaña DI, porque la de LGA se
  desactiva.
- S5. El estado persiste en el snapshot versionado (versión 3, clave opcional
  `meterCenter`); los snapshots 1 y 2 siguen cargando y el guardado normal los migra a
  v3 sin perder datos.
- S6. Las selecciones y los valores derivados entran en el PDF (página 6 y desarrollo 6.1),
  en los informes Markdown/texto (sección 6), en el JSON de exportación (bloque
  `lines.meterCenter` con entradas y evaluación) y en el modo didáctico en pantalla.
- S7. La card cita la ITC-BT-16 con su enlace al BOE, y la ayuda tiene una sección propia.
- S8. Toda regla vive en `lib/meter-center.mjs`, sin React, y está fijada por tests
  numéricos y de combinaciones.

## Tasks

- T1 (S3, S8) `lib/meter-center.mjs` + tests. Route: inline. Done: 10 tests.
- T2 (S5) Estado, storage v3, import/export JSON + tests. Route: inline. Done.
- T3 (S1, S2, S4, S7) Card en la pestaña LGA, supuesto derivado, ayuda. Route: inline. Done.
- T4 (S6) Sección del PDF e informes. Route: inline. Done.
- T5 (S1..S8) README, verificación completa (suite, typecheck, build). Route: inline. Done:
  suite 311/311, `tsc --noEmit` limpio, `pnpm build` OK; más una verificación
  independiente con correcciones (ver Log).

## Log

- L1 (user, verbatim): "la instalacion de enlace va desde acometida, empieza en cgp, luego
  sigue la LGA (que ya la tenemos) pasa a CC (elemntos para la ubicaciones de contadores),
  que nos falta, seria un card con multiples select con las diferentes opciones segun itc
  bt 16, de ahi parte la DI hasta ICP y el DGMP"
- L2 (user, verbatim, al preguntar el alcance): "Selección + verificación (Recomendado)".
- Decisión de alcance: la card modela la CC (ITC-BT-16) con sus verificaciones; CGP, ICP
  (ITC-BT-17) y DGMP (ITC-BT-25) quedan fuera de esta entrega. La CGP sigue cerrada por
  decisión de producto (la empresa distribuidora fija su calibre): no proponerla de nuevo.
- Decisión de fuente de verdad: la CC deriva el supuesto de enlace y el selector existente
  deja de ser editable, para que no haya dos valores en conflicto. Se actualizan los tests
  que fijaban el selector.
- Datos de la ITC-BT-16 usados: local obligatorio por encima de 16 contadores (§2.2.2),
  armario hasta 16 (§2.2.2), interruptor general de maniobra obligatorio con más de dos
  usuarios y 160 A hasta 90 kW / 250 A hasta 150 kW (§3), plantas (§2.2), alturas 0,25 m
  y 1,80 m (§3), IP40/IK09 interior y IP43/IK09 exterior (§1).
- El número de contadores se guarda como `null` = «propuesto por la previsión»; así el
  centro sigue siendo dato por defecto y «Limpiar» sigue vaciando el almacenamiento.
- La sección 6 del informe se renderiza por la tabla genérica que ya usan Markdown, texto
  y PDF: no hubo que tocar el generador de PDF.
- Los tests de instalación pasaron de exigir un `<select>` de supuesto a exigir el valor
  derivado y la card como fuente; el resto de la suite quedó intacto.
- Verificación independiente: encontró cinco bloqueantes reales y se corrigieron.
  (1) la card quedaba inaccesible al derivar único usuario, porque vivía solo en la
  pestaña LGA desactivada: ahora se renderiza en DI en ese supuesto;
  (2) el PDF se arma a mano y no pasaba por `buildReport`: se agregó la página 6 y se
  renumeraron LGA (7), DI (8) y resumen (9);
  (3) Markdown/texto tenían dos secciones 6: renumeradas;
  (4) faltaba el grado exterior IP43;
  (5) el informe imprimía la protección elegida aunque estuviera fuera de tabla.
- El umbral de armario se aplica por concentración (lectura de §2.2.2: «contadores a
  centralizar»), no al total del edificio. Queda anotado como interpretación.
- Advertencia preexistente, fuera de alcance: «Limpiar» no resetea `lineTouched`, así que
  los datos de entrada de las líneas sobreviven a una recarga tras limpiar (y un proyecto
  con la LGA tocada vuelve a guardar la LGA en el snapshot). No lo introduce esta entrega.
  *(Resuelto el 2026-11-06 por el fix `4dc1916` de `fix(cargas)`.)*
- Verificación final: suite 305/305, `tsc --noEmit` limpio, `pnpm build` OK.
- L5 (user, verbatim): "quiero que haya el select con los diferentes formas de contadores,
  pon lo en un card independiente dentro del tab lga, y agrega las opciones de forma de
  colocaciones, forma individual, forma concentrada, requisitos de cuarto, tipos de
  armarios". Se separó el concepto: la card pasa a titularse «Formas de contadores» y el
  select de ubicación se reemplaza por «Conjunto de medida» (CPM, local, armario, módulos,
  paneles) más «Tipo de armario» y la lista de requisitos del cuarto de §2.2.1/§2.2.2.
  La colocación manda sobre el conjunto: individual fuerza CPM y concentrada lo rechaza.
  El snapshot migra el viejo campo `enclosure` a `assembly` al leer. Suite 309/309,
  typecheck y build OK.
- L6 (user, verbatim): "bien, ahora actualiza el modo didactico con todas las opciones que
  agregamos y revisa donde queda ubicado el card de contadores, tambien revisa el archivo
  json que exportamos y localstorage". Se agregó `explainMeterCenter` (datos, supuesto
  derivado, comprobaciones y requisitos), que la card muestra en didáctico y el PDF en la
  página 6.1. La card se movió al principio de la pestaña LGA, antes del módulo, para que
  se vea sin scrollear; en único usuario la card queda arriba y el aviso de «sin LGA»
  abajo. El JSON suma `lines.meterCenter = { inputs: effectiveMeterCenter, result:
  meterEvaluation }`; el localStorage v3 ya guardaba el bloque y migra el campo viejo. El
  select de colocación quedó con las tres formas y muestra «LGA x % · DI y %». Suite
  311/311, typecheck y build OK; dev reiniciado tras el build.
- L7 (user, verbatim): "requisitos del cuarto ponlo dentro de un componente acordeon".
  Se agregó el primitivo `components/ui/accordion.tsx` sobre Base UI (`@base-ui/react/accordion`:
  Root/Item/Header/Trigger/Panel) y los requisitos del cuarto pasaron a un acordeón cerrado
  por defecto, con el número de requisitos en el encabezado. Suite 311/311, typecheck y
  build OK; dev reiniciado tras el build.
