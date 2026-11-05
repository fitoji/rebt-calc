# Instalaciones interiores · ITC-BT-25

Objetivo: añadir la pestaña «Interiores» con el cuadro de mando y protección (DGMP) de
cada vivienda: IGA del escalón de potencia, ICP según la potencia contratada,
diferenciales de 30 mA y protección contra sobretensiones.
Branch: `main`. Delivery: work-unit commits. Test runner: `node --test tests/*.test.mjs`.

## Specs

- S1. La app expone una cuarta pestaña, `Interiores`, después de `DI`, con referencia
  normativa ITC-BT-25.
- S2. La pestaña lista las viviendas generadas como derivaciones (`kind === 'dwelling'`) y
  permite elegir una; sin viviendas, muestra un aviso para generarlas en DI.
- S3. Para la vivienda elegida se muestran: escalón de potencia (tabla A), IGA, potencia
  máxima admisible (`230 × IGA`), intensidad que implica la potencia contratada para el
  ICP y el número de diferenciales exigidos (uno cada cinco circuitos, mínimo uno).
- S4. Los únicos datos editables por vivienda son la potencia contratada, el número de
  circuitos instalados y la protección contra sobretensiones; se guardan en la propia
  derivación (`interior`) y sobreviven a la recarga y al JSON.
- S5. La pestaña avisa cuando la potencia prevista o la contratada superan la máxima
  admisible del IGA, y cuando la vivienda no tiene escalón de tabla A.
- S6. Las filas de viviendas entran en el informe Markdown/texto (sección 9) y en una
  página del PDF (10), con IGA, potencia máxima, contratada, ICP y diferenciales.
- S7. La ayuda tiene una sección propia y el README describe la pestaña.
- S8. Las reglas viven en `lib/interior-installation.mjs`, sin React, y están fijadas por
  tests.

## Tasks

- T1 (S3, S5, S8) `lib/interior-installation.mjs` + tests. Route: inline. Done.
- T2 (S4) Validación del bloque `interior` en derivaciones + tests. Route: inline. Done.
- T3 (S1, S2, S3, S5) Pestaña y panel. Route: inline. Done.
- T4 (S6) Informe y PDF. Route: inline. Done.
- T5 (S7) Ayuda y README. Route: inline. Done.
- T6 (S1..S8) Verificación: suite 317/317, typecheck y build. Route: inline. Done.

## Log

- L1 (user, verbatim): "podriamos hacer un nuevo tab , que sea instalaciones interiores e
  incluya el IGA, etc"
- L2 (user, verbatim, al preguntar el alcance): "DGMP y protecciones (Recomendado)".
- Decisión de alcance: esta entrega cubre el DGMP y sus protecciones; los circuitos
  C1–C12 (+C13 IRVE) y su dimensionado quedan fuera.
- Decisión de datos: el ICP no inventa un calibre. Se muestra la intensidad que implica la
  potencia contratada (`P / 230`) y se recuerda que el dispositivo lo fija la
  distribuidora en envolvente precintable (ITC-BT-17).
- Decisión de almacenamiento: los datos interiores viajan con la derivación de vivienda,
  no en un bloque de proyecto, porque el ELEC-3 es por instalación.
- Fuente: ITC-BT-25 §2.1 (IGA, diferenciales de 30 mA, uno por cada cinco circuitos,
  sobretensiones según ITC-BT-23) e ITC-BT-17 (ICP). La Guía-BT-25 del corpus está
  escaneada, así que no se usa como fuente de valores.
- L3 (user, verbatim): "en basica pon como predeterminada 5 circuitos y en elevada 10
  circuitos". `defaultCircuitsFor` deriva el valor del escalón (básica 5, elevada 10) y
  `resolveInterior` lo aplica cuando la derivación no tiene el dato; un 0 explícito se
  respeta. El panel indica si el número viene del grado o del proyecto, y el informe y el
  PDF usan el mismo resolvedor. Suite 318/318.
- L4 (user, verbatim): "ok ,agrega esos card dentro de interiores, y que piensas con ese
  nombre \"interiores\" cual le podriamos poner para que sea mas identificativa?".
  La pestaña pasa a llamarse **Cuadros** y suma el cuadro interior de locales y servicios
  generales: circuitos libres (descripción, uso, potencia, longitud) dimensionados con el
  motor compartido y un rol nuevo `interior` (mínimo 1,5 mm²), caída 3 %/5 % de la
  ITC-BT-19, protección Ib ≤ In ≤ Iz y diferencial de 30 mA. Se agrega la sección 10 del
  informe y la página 11 del PDF. Suite 325/325.
- L5 (user, verbatim): "en el select de instalaciones interiores agrega un boton con icono
  de izquierda y otro a la derecha del select con icono derecha , y que cliqueando pueda
  navegar por las diferentes viviendas". El selector de vivienda del bloque DGMP lleva
  botones con ChevronLeft/ChevronRight que avanzan una vivienda por clic y se deshabilitan
  en los extremos; el selector sigue disponible para saltar directo. Suite 325/325.
- L6 (user, verbatim): "haz lo mismo para el card de servicios generales y locales".
  El selector de suministro del cuadro interior recibe los mismos botones
  ChevronLeft/ChevronRight con etiquetas «Suministro anterior/siguiente», habilitados
  según la posición en la lista. Suite 325/325.
- L7 (user, verbatim): "podrias mostrar la potencia de esos locales y el iga que le
  corresponde". El card de locales y servicios generales muestra una franja con la
  potencia prevista del suministro, el IGA que le corresponde (primera intensidad de la
  serie ≥ P / (k·U)), la potencia máxima con ese IGA y la intensidad del suministro. El
  interruptor general del cuadro (por la suma de circuitos) se mantiene separado. El
  informe y el PDF suman las columnas «P suministro» e «IGA». Suite 325/325.
- L8 (user, verbatim): "revisa la caida de tension en los circuitos si pasa el permitido
  ponlo en rojo y un signo de advertencia y al hacer hover indique el maximo permitido".
  La celda de caída de cada circuito compara con el límite de su uso (3 % alumbrado, 5 %
  otros) y, cuando el motor no encuentra sección que cumpla, muestra «Sin sección» en rojo
  con el icono de advertencia; el hover (title) y el texto para lectores de pantalla
  indican la caída máxima permitida. Suite 325/325.
- L9 (user, verbatim): "en circuitos de vivienda quiero que agreguen el desarrollo de los
  distintos circuitos con sus nombres y caracteristicas". Se transcribió la tabla 1 de la
  ITC-BT-25 desde el texto consolidado del BOE (C1–C5 básica; C1–C12 elevada; C13 con
  recarga) a `lib/housing-circuits.mjs` y el card de vivienda muestra circuito, nombre,
  PIA, sección, tubo, máximo de puntos, potencia por toma, Fs y Fu. C6/C7 heredan de
  C1/C2 y C12 remite al circuito base. Suite 331/331.
- L10 (user, verbatim): "tendriamos que poner la longitud del circuito? y calcular caida de
  tension?". Sí: la ITC-BT-25 §3 condiciona la sección a un 3 % de caída a la intensidad
  del PIA y a la distancia al punto más lejano. La tabla de vivienda suma una columna de
  longitud por circuito; `housingCircuitSizing` calcula la sección necesaria (serie
  1,5–240), adopta la mayor entre tabla y caída, y marca en rojo con aviso cuando no hay
  sección en la serie. La longitud se guarda en `interior.lengths`. Suite 335/335.
- L11 (user, verbatim): "en esta parte: Circuitos de la vivienda · electrificación básica ...
  agrega el boton de tabla que lleve a esa tabla y recuerda como haciamos con las fuentes
  como por ejemplo en el tab de prevision de cargas". El encabezado de la tabla suma un
  botón «Tabla» con el icono Table2 (mismo patrón que el coeficiente de simultaneidad) que
  abre un diálogo con la tabla 1 publicada (C1–C5, C8–C11 y C13), sus notas y el enlace al
  BOE; la sección suma además una SourceNote «ITC-BT-25 §3 · tabla 1». Suite 335/335.
- L12 (user, verbatim): "has lo mismo en los otros lugares donde citas fuentes". Se
  convirtieron a SourceNote las citas que quedaban como texto plano: el pie del diálogo de
  la tabla de vivienda («ITC-BT-25 §3, tabla 1») y las notas `doc` de cada tabla del
  diálogo de tablas de LGA/DI, con el enlace al BOE en el hover. Suite 335/335.
- L13 (user, verbatim): "en las viviendas habria que poner superficie de living, cocina,
  baños, numero de dormitorios , etc, no? y considerando esa superficie se calcula numero
  de tomas , llaves de luz , puntos de luz , etc, no?". Se agregó la sección «Estancias y
  puntos de utilización» con la tabla 2 de la ITC-BT-25: estancias con superficie y
  longitud, interruptores de calefacción/aire/secadora, y un resumen de puntos por
  circuito con el máximo de la tabla 1 y los circuitos que exige cada acumulado. Suite
  343/343.
- L14 (user, verbatim): "en prevision de cargas , en viviendas ingresabamos los m2 de cada
  una, utiliza en el tab de cuadros, cuando añadimos estancia, el total de la vivienda y
  que no nos pasemos de m2". Las derivaciones de vivienda guardan `housingAreaM2` (la
  superficie de la fila de previsión, sincronizada al editar la fila); el card de
  estancias muestra superficie de la vivienda, suma de estancias y disponible, y marca en
  rojo cuando la suma la supera. Suite 344/344.
- L15 (user, verbatim): "revisa ahora que llegue todo al informe, luego que el modo
  didactico explique bien todas las opciones , commit y push, guarda en engram". El
  informe Markdown/texto suma las secciones 11 (circuitos de vivienda), 12 (estancias) y
  13 (puntos mínimos), y el PDF las páginas 12, 13 y 14. El modo didáctico explica el
  DGMP (IGA, ICP, diferenciales), las estancias y puntos (tabla 2) y los cuadros de
  locales/servicios (Ib, interruptor, circuitos). Commit cd76906 y push a main.
