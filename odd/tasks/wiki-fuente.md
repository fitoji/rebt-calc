# wiki-fuente — integrar la wiki externa del REBT como capa de consulta

Estado: **postergada** el 2026-11-15. Nada implementado, ningún archivo de código tocado.
Este documento guarda el research ya hecho para que una sesión futura no lo repita.

Objeto: el vault `/Volumes/SSD Samsung MAC/DEV SSD/NUEVA GENERACION/ELECTROMECANICA-PROJECTOS/llm-wiki/llm-wiki`,
una wiki compilada del REBT (RD 842/2002), sus ITC-BT y sus 27 Guías Técnicas. Vive **fuera**
del root de este proyecto.

## Specs

S1. Pedido original del usuario:

> revisa /Volumes/SSD\ Samsung\ MAC/DEV\ SSD/NUEVA\ GENERACION/ELECTROMECANICA-PROJECTOS/llm-wiki/llm-wiki hay una wiki con el rebt, lo utilizaremos para consultar el reglamento, supongo que va a ser mas facil trabajar, como fuente de verdad,

S2. Decisión del usuario:

> deja guardado todo lo aprendido y lo posponemos en el futuro para una feauture llamada wiki-fuente

S3. Restricción vigente que **no** se reabre (ya resuelta en `odd/tasks/registro-normativo-y-validacion.md`, S1): una sola fuente de verdad para lo que manda el reglamento, cada tabla/umbral declarado una vez con su cita ITC. Texto del usuario citado allí:

> me interesa lo de una sola fuente de verdad, ya que todo va segun el reglamento

Por S3, la wiki **no** puede pasar a ser el registro de valores de la app. Su integración es
como capa de consulta y de auditoría, no como fuente primaria.

## Decisión de diseño (research hecho, no implementado)

Tres capas, sin duplicar valores:

| Capa | Dónde | Rol |
| --- | --- | --- |
| Autoridad textual | BOE consolidado: `data/Contenido adicional_REBT_9ed/01 REBT` + `knowledge/raw/papers/` del vault | Se cita esto, nunca la prosa de la wiki |
| Registro único de valores | `lib/normative-tables.mjs` + `docs/fuentes-normativas.md` | Único lugar donde vive un número que la app usa |
| Índice y mapa de divergencias | El vault: `knowledge/wiki/concepts/`, `divergencias-guias-tecnicas-rebt-vs-itc-bt.md`, `knowledge/tools/wiki_search.py` | Consulta rápida y detección de guía ↔ ITC en conflicto |

Reglas duras que la implementación futura tiene que respetar:

R1. La prosa de la wiki **no se cita** como el reglamento. Es un digesto del agente anterior,
    no texto normativo (evidencia en Hallazgos).
R2. Ningún CSV de `knowledge/raw/tablas/` entra al repo sin procedencia verificada contra el BOE
    (caso `BT-19_t11.csv`).
R3. Todo número que use la app se declara una sola vez en `lib/normative-tables.mjs` con su cita,
    venga de donde venga. La wiki solo lo propone; el registro lo fija.
R4. Leer el vault exige consentimiento de lectura por sesión: es una ruta absoluta fuera del root
    del proyecto.

## Hallazgos verificados (2026-11-15)

Capa de fuentes:

- `knowledge/raw/papers/` es el texto consolidado del BOE (`source: https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099`),
  con apartados numerados. ITC-BT-19: 273 líneas; ITC-BT-25: 207; RD 842/2002: 572.
  **Esta capa sí sirve como autoridad textual.**
- Volumen declarado y comprobado: 100 fuentes, 103 artículos, 221 divergencias, 27 guías.

Capa de wiki (por qué no es citable):

- `grep '^> '` sobre `knowledge/wiki/concepts/` → **cero** blockquotes. No hay una sola cita textual.
- Las cláusulas aparecen solo como paréntesis dentro de paráfrasis, ej.
  `caida-de-tension.md:51`: «La ITC-BT-19 (2.2.2) y la ITC-BT-25 (apartado 3) admiten…».
- Hay paráfrasis que aflojan el texto: la wiki dice «se procurará el reparto de las cargas entre
  fases» donde el BOE dice «se procurará que aquella quede repartida entre sus fases o conductores
  polares».

Trampa concreta encontrada (motivo de R2):

- `knowledge/raw/tablas/BT-19_t11.csv` reproduce la **edición de la Guía** de la tabla del conductor
  de protección: `S < 16 → S`, `16< S < 35 → 16`, `S > 35 → S/2`.
- El BOE (`raw/papers/2026-11-10-rebt-itc-bt-19-….md:102`) dice `S ≤ 16 · 16< S ≤ 35 · S > 35`:
  off-by-one en ambos bordes, exactamente 16 mm² y exactamente 35 mm² caen en la fila equivocada.
- Los CSV no tienen campo de procedencia y mezclan tablas de ITC, de guía y de UNE bajo el mismo
  namespace `BT-19_*`. Hay comentarios que apuntan a `tablas/ITC-BT-19_t01.csv`, archivo inexistente.
- La tabla de intensidades admisibles de la ITC-BT-19 está en el raw **solo como imagen** del BOE;
  los números viven únicamente en CSV sin ancla.

Hueco que ni el repo ni el vault cubren:

- Factores de corrección por **temperatura y agrupamiento**: ausentes como contenido normativo. La
  ITC-BT-19 remite a UNE 20.460-5-523 y el Anexo 2 a la Guía BT-19 o a UNE-HD 60364-5-52; el vault
  reproduce esa remisión. Es el dato que más necesita el cálculo de secciones y no está en ninguno
  de los dos corpus.

Valor real del vault para este proyecto:

- No es «leer el reglamento más rápido»: los PDFs ya están en `data/`. Es el **mapa de 221
  divergencias** con cierre «Prevalece la ITC-BT-XX», formato
  `[conflicto|omision|ampliacion|desactualizacion]`, agrupado por ITC con tabla resumen de 33 filas.
  Ejemplo (`:46`): «[omision] Instalación industrial alimentada en alta tensión: la tabla 6 omite el
  supuesto de la ITC-BT-19 (2.2.2), con caídas admisibles del 4,5 % en alumbrado y del 6,5 % en los
  demás usos. Prevalece la ITC-BT-19.»
- Ese mapa puede señalar valores de `lib/normative-tables.mjs` tomados del lado no vinculante.

Herramienta de búsqueda:

- `knowledge/tools/wiki_search.py` funciona (FTS5, stdlib). Tokeniza sin acentos y la consulta es
  **AND de todas las palabras**, no frase. No imprime score.
- Correr la primera búsqueda construye `knowledge/tools/wiki_index.sqlite` (en `.gitignore` del
  vault): es el comportamiento documentado, no una mutación accidental.

## Tasks (ninguna ejecutada)

- T1 — Documentación. Registrar el puntero al vault y las reglas R1–R4 en `docs/fuentes-normativas.md`
  (sección «wiki externa»), para que futuras sesiones no repitan el research ni copien CSV.
- T2 — Auditoría (read-only). Cruzar las 221 divergencias contra `lib/normative-tables.mjs` y listar
  qué valores están en riesgo por haber salido del lado no vinculante. No cambia ni un número sin
  confirmación contra el BOE.
- T3 — Decisión. Definir si se versiona un subconjunto curado del vault (p. ej. el mapa de
  divergencias) o solo el puntero documental. Sin copiar `raw/tablas/`.

Descartadas a propósito:

- Importar `knowledge/raw/tablas/*.csv` al repo (R2: sin procedencia y con error demostrado).
- Usar la wiki como registro de valores de la app (S3).

## Log

- L1 (2026-11-15) — Pedido original del usuario, verbatim: ver S1. Se revisó el vault completo:
  README, `AGENTS.md` del vault, capa `raw/`, artículos de ITC/guías, mapa de divergencias,
  herramienta de búsqueda, y el registro normativo del proyecto
  (`lib/normative-tables.mjs`, `docs/fuentes-normativas.md`, `odd/tasks/registro-normativo-y-validacion.md`).
- L2 (2026-11-15) — Dictamen de la revisión: el vault sirve como índice y mapa de divergencias;
  no sirve como fuente de verdad de valores. Causa: prosa sin citas textuales (R1) y CSV con
  procedencia rota y un off-by-one demostrado (R2). Choca con S3 del registro normativo.
- L3 (2026-11-15) — Decisión del usuario: guardar el aprendizaje y postergar la integración como
  feature `wiki-fuente` (S2). No se implementó nada.
