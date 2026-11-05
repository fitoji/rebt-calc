# Fuentes normativas del proyecto

Qué hay en `data/Contenido adicional_REBT_9ed/`, qué sirve para la app, qué está
derogado y qué no debe citarse. Este documento es un mapa de trabajo: **no sustituye al
BOE**. Antes de citar un número en la app, se abre el PDF original o la edición
consolidada.

La carpeta es material local (507 MB, 453 archivos) y hoy está **sin versionar** en git.
Lo que vive en el repo es este mapa y, llegado el caso, un subconjunto curado de PDFs.

---

## 1. Cómo se leyó el corpus

- 377 PDF, 51 `.doc`, 10 `.docx/.DOCX`, más `.txt` sueltos.
- La mayoría de los PDF tienen capa de texto y se pueden extraer; **unos 75 se extraen
  prácticamente vacíos** (escaneos: NTP, guías del REEAE, varios anexos de Baleares,
  ITC-BT-41/50, croquis autonómicos). Esos exigen OCR antes de citar nada.
- Dos documentos usan una codificación de fuente no estándar que rompe la extracción
  automática: la **edición consolidada del REBT (3 sept 2025)** y el **CTE DB-HE**. Se
  leen en un visor; no se pueden transcribir con un `pdftotext` ingenuo.
- Las tablas (ITC-BT-14, ITC-BT-18, ITC-BT-25) salen desordenadas al extraer: el valor
  se confirma en el visor antes de pasarlo a `lib/normative-tables.mjs`.

---

## 2. Mapa del corpus

| Carpeta | Contenido | Estado | Utilidad |
|---|---|---|---|
| `01 REBT` | Edición consolidada BOE (3 sept 2025), erratas, RD 560/2010, RD 1053/2014, RD 244/2019, RD 542/2020, RD 145/2023, RD 770/2025, Res. 20/03/2025 (ITC-BT-02), borrador ITC-BT-53 | Mixto: vigente + borrador | **Alta**: cronología y texto vigente del Reglamento |
| `02 ITC-BTs` | ITC-BT-01 a ITC-BT-51 en PDF individual (texto original), más normas citadas | Vigente en su mayoría; **son textos originales, sin las modificaciones posteriores** | **Alta** para citar cláusulas; contrastar con la consolidada |
| `03 Guía Técnica de aplicación del REBT` | 38 archivos: introducción, índice, RD 842/2002, guías 03-52, anexos 1-4 y una nota de separación galvánica | Vigente (varias revisiones entre 2019 y 2024) | **Muy alta**: interpretación oficial de las ITC |
| `04 Documentación Técnica por Comunidades` | Modelos de MTD, certificados, declaraciones responsables, inspecciones | **Obsoleto**: el propio `_IMPORTANTE - actualizacion documentos.txt` dice que la presentación es por la web de cada comunidad | Baja: solo como referencia de formato |
| `05 Código Técnico de la Edificación` | RD 314/2006, RD 450/2022, DB-HE, anexos, CTE locales pública concurrencia | Vigente | **Alta** para HE 6 (IRVE), HE 3 (iluminación) y usos no residenciales |
| `06 Leyes Sector eléctrico` | Ley 24/2013, RD 1955/2000, RD 1183/2020 | Vigente | Media: contexto de suministro y acometidas, sin fórmulas |
| `07 Normativa Seguridad Eléctrica` | RD 614/2001 y guía, LPRL, EPI, RD 542/2020, RD 298/2021, RD 145/2023, RDL 29/2021 | Vigente | Baja para cálculo; RDL 29/2021 sí toca IRVE |
| `08 Eficiencia Energética - REEAE` | RD 1890/2008, guías ITC-EA, documentos IDAE, Ley 7/2021 | Vigente, fuera de alcance | Ninguna para previsión/LGA/DI |
| `09 Notas Técnicas de Prevención` | NTP de distancias a líneas, grúas, plataformas | Vigente | Ninguna para cálculo |
| `10 CPR y Guías FACEL` | R. Delegado 2016/364, guías FACEL de cables, designación, CPR | Vigente | **Alta** para designación y clase de reacción al fuego del cable |
| `11 Normas Particulares de Empresas Suministradoras` | E.ON, EDP, ENDESA, GAS NATURAL, IBERDROLA, VIESGO | Parcialmente desactualizado y **regional** | Media-alta si se quiere un perfil por distribuidora |
| Raíz | `1.7 Borrador Real Decreto.pdf` (ITC-BT-53, corriente continua), `FENIE_Manual_usuario.pdf` | Borrador / vigente | Borrador: no citar. FENIE: **alta** para el anexo al usuario |

---

## 3. Cronología del REBT que sí está en el corpus

| Norma | Qué hace | Estado |
|---|---|---|
| RD 842/2002 (BOE-A-2002-18099) | Aprueba el REBT y las ITC-BT | Vigente, con modificaciones |
| Erratas feb. 2021 | Correcciones al texto consolidado | Vigente |
| RD 560/2010 | Modifica el RD 842/2002 (disposiciones adicionales, ITC-BT-03) y otros reglamentos industriales | Vigente |
| RD 1053/2014 (BOE-A-2014-13681) | Añade la ITC-BT-52 (IRVE) y adapta ITC-BT-19/25/44 | Vigente, ITC-BT-52 modificada después |
| RD 244/2019 | Autoconsumo eléctrico | Vigente |
| RD 542/2020 (BOE-A-2020-6472) | Modifica la ITC-BT-52: retira los porcentajes de preinstalación y los remite al CTE | Vigente |
| RDL 29/2021 | Aparcamientos existentes de más de 20 plazas: una estación cada 40 | Vigente |
| RD 450/2022 (BOE-A-2022-9848) | Añade la sección **HE 6** al CTE (dotaciones de recarga) | Vigente |
| RD 145/2023 | Seguridad industrial (homologación, MIN-IP, cementos). **No toca el REBT** | Irrelevante para la app |
| RD 770/2025 | Requisitos de empresas habilitadas; afecta a la ITC-BT-03 | Vigente |
| Res. 20/03/2025 | Actualiza el listado de normas UNE de obligado cumplimiento de la ITC-BT-02 | Vigente |
| Borrador ITC-BT-53 | Instalaciones de corriente continua | **Borrador: no citar** |

---

## 4. Lo que sirve, módulo por módulo

### 4.1 P1–P4 · ITC-BT-10

Valores confirmados contra el PDF de la ITC-BT-10 (texto original, 5 páginas):

| Concepto | Valor | Apartado |
|---|---|---|
| Potencia mínima por vivienda | 5 750 W a 230 V (básica); 9 200 W (elevada) | §2.2 |
| Potencia a prever | Capacidad máxima del IGA (ITC-BT-25) | §2.2 |
| Coeficientes de simultaneidad | Tabla 1: n = 1…21 (1 a 15,3); n > 21 → 15,3 + (n − 21) · 0,5; tarifa nocturna → Cs = 1 | §3.1 |
| Servicios generales | Suma sin reducción (Cs = 1) | §3.2 |
| Locales comerciales y oficinas | 100 W/m² y planta, mínimo 3 450 W por local, Cs = 1 | §3.3 |
| Garajes | 10 W/m² (natural) / 20 W/m² (forzada), mínimo 3 450 W, Cs = 1 | §3.4 |
| Concentración de industrias | 125 W/m² y planta, mínimo 10 350 W | §4.2 |
| Suministro monofásico | Hasta 14 490 W a 230 V | §6 |

Lo que la ITC-BT-10 **no** contiene: ni la P5, ni el IRVE, ni un «§5.2». El apartado 5
se titula «Previsión de cargas» y remite a las acometidas e instalaciones de enlace.

### 4.2 P5 · IRVE

Hay **dos obligaciones distintas** que no hay que mezclar: la **previsión de potencia**
(cuántos W se reservan) y la **preinstalación** (cuántos conductos se dejan).

**Previsión de potencia**

- **Viviendas nuevas con garaje en régimen de condominio**: la **Guía-BT-52, Anexo 2**
  («Previsión de cargas en edificios de viviendas de nueva construcción con garajes en
  régimen de condominio») fija la carga mínima multiplicando **3 680 W por el 10 % del
  total de plazas construidas**, y ese 10 % lo declara expresamente «valor mínimo
  reglamentario». La potencia se multiplica por el factor de simultaneidad que
  corresponda y se suma al resto de la instalación. El anexo se apoya en la ITC-BT-10,
  pero **no es un apartado de la ITC-BT-10**.
- **Uso no residencial**: la Guía remite a la **disposición adicional primera del
  RD 1053/2014**, con una previsión de **3,68 kW por cada 40 plazas**.
- **3 680 W** es la potencia de la tabla 1 de la ITC-BT-52 para un circuito monofásico de
  16 A con una estación; no es una dotación legal por plaza.

**Preinstalación (conductos y estaciones)**

1. **ITC-BT-52 original (RD 1053/2014, 31 dic 2014)**: en edificios nuevos, conductos
   dimensionados para **al menos el 15 % de las plazas** (§3.2).
2. **RD 542/2020**: elimina ese 15 % del texto de la ITC-BT-52 y remite los porcentajes
   al CTE («los porcentajes requeridos en la preinstalación se tratan en el Código
   Técnico de la Edificación, sección HE6»).
3. **CTE DB-HE 6 (RD 450/2022)**:
   - Uso **residencial privado**: conductos para el **100 % de las plazas**.
   - Uso **distinto del residencial privado**: conductos para al menos el **20 %** de las
     plazas y, además, **una estación de recarga por cada 40 plazas o fracción** (mínimo
     una).
   - Titularidad de la **Administración General del Estado**: una estación por cada
     **20 plazas**.
   - **Plazas accesibles**: una estación por cada **5** plazas accesibles.

Conclusión práctica: el 10 % de la Guía-BT-52 sigue vigente como **previsión de potencia
mínima en vivienda nueva**, pero no describe la preinstalación (que es el 100 % de las
plazas en residencial privado). En la app conviene nombrar la fuente correcta y, si se
quiere cubrir uso no residencial, añadir la vía de 3,68 kW / 40 plazas.

### 4.3 LGA · ITC-BT-14

- Caída máxima: **0,5 %** con contadores totalmente centralizados; **1 %** con
  centralizaciones parciales (§3).
- Sección mínima: **10 mm² Cu / 16 mm² Al**, uniforme y sin empalmes (§3).
- Conductores: unipolares, **0,6/1 kV**, no propagadores del incendio y con emisión de
  humos y opacidad reducida (equivalencias UNE 21.123 partes 4 o 5) (§3).
- Tabla 1: fase / neutro / diámetro de tubo (10→10/75; 50→25/125; 95→50/140;
  240→120/200).
- Intensidad admisible según UNE 20.460-5-523 con los factores de corrección del montaje.

### 4.4 DI · ITC-BT-15

- Caída máxima: **0,5 %** contadores concentrados en más de un lugar; **1 %** totalmente
  concentrados; **1,5 %** único usuario sin LGA (§3).
- Sección mínima: **6 mm²** en cables polares, neutro y protección; **1,5 mm²** en el
  hilo de mando.
- Material y designación: tablas C, D y E de la propia ITC-BT-15 (E es el multiconductor
  de enterrado).

### 4.5 Puestas a tierra · ITC-BT-18 (bloque futuro)

- Criterio de resistencia: la tensión de contacto no puede superar **24 V** en local o
  emplazamiento conductor ni **50 V** en los demás casos (§9).
- Sección del conductor de protección: tabla 2 del §3.4 (S ≤ 16 → S; 16 < S ≤ 35 → 16;
  S > 35 → S/2), y si la mitad no es normalizada se toma la superior más próxima.
- Fórmulas de resistencia del electrodo: tabla 5.
- Es el material que falta para el bloque «puestas a tierra» que PRODUCT.md ya prevé.

### 4.6 Cable y CPR · `10 CPR y Guías FACEL`

- Reglamento Delegado 2016/364: clases de reacción al fuego (`Aca`…`Fca`), humos
  (`s1`-`s3`), gotas (`d0`-`d2`) y acidez (`a1`-`a3`).
- FACEL explica la designación de cables y cómo se traduce a la documentación del
  proyecto (por ejemplo `RZ1-K (AS)`).
- Uso en la app: añadir la **clase CPR** a la designación del cable de LGA/DI. La
  instrucción exige el comportamiento (no propagador, humos y opacidad reducidos); la
  clase concreta la fija el CTE/REBT según el local.

### 4.7 Anexo de información al usuario · FENIE

- La ITC-BT-04 §5.5 exige que el Certificado de Instalación se acompañe de «su
  correspondiente anexo de información al usuario».
- `FENIE_Manual_usuario.pdf` es exactamente ese documento: instrucciones de uso y
  mantenimiento de la instalación.
- Uso en la app: candidato a un anexo más del PDF exportado, separado de la memoria
  técnica.

### 4.8 Modelos autonómicos

- Cada comunidad tiene su MTD/certificado, pero **la carpeta está desactualizada por su
  propio aviso**. Solo sirven como referencia de estructura y campos.
- Si en el futuro se quiere «memoria por comunidad», la fuente es la web oficial de cada
  consejería, no estos `.doc`.

### 4.9 Normas particulares de distribuidoras

- Fijan requisitos **más estrictos** que el REBT (secciones mínimas, CGP, módulos de
  contador, esquemas de enlace). Ejemplo: la norma de enlace de ENDESA recomienda
  **10 mm²** para polares, neutro y protección «con objeto de evitar
  sobrecalentamientos».
- Son **regionales** y cambian sin tocar el Reglamento. No deben entrar como valores por
  defecto globales; si se usan, como perfil opcional por distribuidora, con la fecha de
  la norma a la vista.

### 4.10 Fuera de alcance

REEAE y alumbrado exterior (RD 1890/2008), NTP de seguridad laboral, Ley 24/2013 y
RD 1955/2000 (contexto de suministro), HE 3/HE 5 del CTE (iluminación y fotovoltaica).
Documentados aquí para no volver a abrirlos cuando se busque «qué más hay».

---

## 5. Discrepancias detectadas en la app

| # | Dónde | Lo que decía | Lo que dice la fuente | Estado |
|---|---|---|---|---|
| D1 | `README.md` §P5, `components/load-calculator.tsx` (P4 y P5), `lib/calculation-explanations.mjs`, `components/help-doc.tsx`, `lib/calculator-storage.mjs`, `lib/load-previews.mjs` | «El 10 % de las plazas es el mínimo legal (ITC-BT-10 §5.2)» | El 10 % es correcto, pero la fuente es la **Guía-BT-52, Anexo 2** («valor mínimo reglamentario»), que se apoya en la ITC-BT-10. La ITC-BT-10 no tiene §5.2 ni menciona IRVE | **Resuelto**: se cita la Guía-BT-52, Anexo 2 |
| D2 | `components/help-doc.tsx` | «RD 1053/2014 … añadió … la previsión de P5» | Añadió la ITC-BT-52 y adaptó ITC-BT-19/25/44; el 10 % de previsión está en el Anexo 2 de la Guía | **Resuelto** |
| D3 | `components/load-calculator.tsx` §P5 | «ITC-BT-10 §5.2 (apartado añadido por el RD 1053/2014)» | No existe ese apartado; el RD 1053/2014 no modificó la ITC-BT-10 | **Resuelto**; un test impide que vuelva |
| D4 | `README.md` §P5 | «3 680 W por plaza» como base legal | La Guía multiplica 3 680 W por el **10 % de las plazas**: no es una dotación por plaza, es la potencia de un circuito de 16 A | Reformular como «3 680 W por punto de recarga» |
| D5 | `components/line-modules.tsx`, `lib/calculation-explanations.mjs`, `README.md` | «La ITC-BT-14 sólo admite cable unipolar RZ1-K o DZ1-K (XLPE)» | La ITC exige 0,6/1 kV, unipolar, no propagador del incendio y con humos/opacidad reducidos (UNE 21.123-4/5). RZ1-K/DZ1-K lo cumplen, pero la instrucción no nombra la designación | Suavizar la afirmación: requisito funcional, no lista cerrada |
| D6 | `components/load-calculator.tsx` §P1 | «ITC-BT-25 tabla A: 5 750/7 360/9 200/11 500/14 490 W» | No verificado en este corpus: la tabla de la ITC-BT-25 se extrae desordenada y la Guía-BT-25 del corpus está escaneada | Pendiente de comprobar en el visor antes de volver a citarla |

Verificado y sin cambios necesarios: límites de caída LGA/DI, secciones mínimas 10 y 6
mm², tabla de coeficientes de simultaneidad, densidades de P3/P4 y el criterio de 24/50 V
de la ITC-BT-18.

---

## 6. Lo que no hay que usar

- **`1.7 Borrador Real Decreto.pdf` / `01 REBT/1.7 Borrador Real Decreto.pdf`**: borrador
  de la ITC-BT-53 (corriente continua). No está en vigor; no se cita.
- **`04 Documentación Técnica por Comunidades/`**: obsoleto por su propio aviso.
- **Normas derogadas**: `Normas Inst Enlace 2004` y `Normas Inst Enlace 2008` de Canarias
  (derogadas por la Orden de 16/04/2010) y las fichas marcadas `ANULADA` de Iberdrola.
- **Escaneos sin OCR**: unos 75 PDF; si se necesitan, OCR primero.
- **`.doc`/`.xls` antiguos**: convertirlos antes de leerlos en cualquier herramienta.

---

## 7. Próximos pasos, por orden de valor

1. ~~**Cerrar D1/D2/D3**~~: hecho. La cifra era correcta, la cita no. Ahora README,
   tarjetas, ayuda y explicaciones apuntan a «Guía-BT-52, Anexo 2», y un test impide
   volver al «ITC-BT-10 §5.2».
2. **Bloque de puestas a tierra (ITC-BT-18)** con las guías 18 y el anexo 2: ya está
   previsto en PRODUCT.md y el corpus trae todo lo necesario.
3. **Clase CPR en la designación del cable** (FACEL + R. Delegado 2016/364).
4. **Anexo de información al usuario** (FENIE + ITC-BT-04 §5.5) como documento aparte del
   PDF.
5. **Actualizar `data/documentacion/`**: añadir ITC-BT-19, 25, 47 y 52 y las guías que
   faltan (09, 17, 19, 23, 24, 28, 29, 33, 52). Mantener el subconjunto curado, no los
   507 MB.
6. **Perfil por distribuidora** (opcional): solo si aparece un usuario real que lo pida;
   los requisitos son regionales y volátiles.

---

## 8. Anexo · Citas verificadas

- ITC-BT-10 §2.2, §3.1-§3.4, §4.2, §6 — `02 ITC-BTs/ITC_BT_10.pdf`.
- ITC-BT-14 §3 (caída, sección mínima, cables, tabla 1) — `02 ITC-BTs/ITC_BT_14.pdf`.
- ITC-BT-15 §3 (caída, sección mínima 6 mm² y hilo de mando 1,5 mm²) —
  `02 ITC-BTs/ITC_BT_15.pdf`.
- ITC-BT-18 §9 (24 V / 50 V) y §3.4 con tabla 2 (sección del conductor de protección) —
  `02 ITC-BTs/ITC_BT_18.pdf`.
- ITC-BT-52 §3.2 (preinstalación, 15 % original) — `02 ITC-BTs/ITC_BT_52.pdf`.
- RD 542/2020, artículo que sustituye el §3.2 de la ITC-BT-52 —
  `01 REBT/1.13 RD 542-220.pdf` (el nombre del archivo tiene una errata: es el 542/2020).
- CTE DB-HE 6, §3 «Cuantificación de la exigencia» — `05 .../CTE-DBHE.pdf` y texto
  consolidado del RD 450/2022 (BOE-A-2022-9848).
- ITC-BT-04 §5.5 (anexo de información al usuario) — `02 ITC-BTs/ITC_BT_04.pdf`.
- Guía-BT-52, Anexo 2 (método de previsión de cargas de IRVE) —
  `03 .../guia_bt_52_nov17R1.pdf`. Cita literal: «se calculará multiplicando 3680 W, por
  el 10 % del total de las plazas de aparcamiento construidas […] Este porcentaje […]
  debe considerarse como valor mínimo reglamentario». Contrastado contra la copia vigente
  publicada por industria.gob.es (mismo Anexo 2, texto idéntico).
