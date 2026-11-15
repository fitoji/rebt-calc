# Datos administrativos para la hoja 2 del ELEC-3

Objetivo: un lugar donde declarar los datos administrativos del ELEC-3 —instalador, titular,
emplazamiento, distribuidora— de modo que cada vivienda salga con los suyos y ninguna herede el
piso ni la superficie de otra.

Branch: `feat/datos-administrativos`. Delivery: work-unit commits. Test runner: `node --test tests/*.test.mjs`.

## Specs

S1. Pedido y dudas del usuario, verbatim:

> estoy pensando en los datos administrativos de la hoja 2,donde poner el formulario, agregar un tab de datos administrativos, y ahi tambien poner los datos de la empresa instalador? si tenemos varias viviendas tendriamos varios elec-3? con varios titulas y datos diferentes? como lo manejariamos?

S2. Ubicación elegida por el usuario, verbatim:

> Tab para lo compartido + vivienda en Cuadros

Es decir: un tab nuevo con lo que es del proyecto o del edificio, y los campos propios de cada
instalación —número, piso, puerta, superficie del local, resistencia de tierra, titular cuando
difiera— dentro de la card de Cuadros, donde ya están el selector de vivienda y el botón del ELEC-3.

S3. Titular elegido por el usuario, verbatim:

> Titular del proyecto, override por vivienda

S4. **Un ELEC-3 por instalación**, ya vigente desde `odd/tasks/elec3-por-vivienda.md`: cada vivienda es
una instalación con su DI y sus circuitos. El edificio como conjunto (LGA, CGMP, contadores) no lo
cubre el modelo ELEC-3 y esta entrega no lo inventa.

S5. **Herencia explícita**: un dato de la instalación se declara en el proyecto y la vivienda lo hereda;
sólo se overridea cuando difiere. Si no está en ninguno de los dos niveles, la celda queda pendiente.
Nunca se rellena por parecido ni se copia de la primera vivienda.

S6. **El `uso` se deriva del tipo de derivación** (`dwelling` → vivienda, `local` → comercial,
`garage` → garaje, `common-services` → servicios generales, `irve` → recarga de vehículos), con campo
libre sólo para el caso que no encaje.

S7. **La empresa instaladora no se duplica**: se extiende el bloque que ya existe en `ProjectInfo`
(`companyName`, `companyAddress`, `phone`, `email`, `logo`) con NIF y número de instalador autorizado.
Ese bloque ya viaja en el JSON exportado y `readProjectExport` lo restaura.

S8. **Sin compatibilidad hacia atrás** (regla ya vigente del proyecto, `odd/tasks/registro-normativo-y-validacion.md`
S3): los datos de cada instalación van al snapshot, que sube a la versión 6; los snapshots viejos se
descartan.

S9. **Firma y sello no se generan nunca**: se completan a mano, como ya está resuelto en el diálogo.

## Modelo de tres niveles

| Nivel | Datos | Dónde |
| --- | --- | --- |
| Proyecto / edificio | empresa instaladora (nombre, NIF, dirección, teléfono, email, logo, carné), calle, localidad, CP, empresa distribuidora, tipo de instalación por defecto, fecha | `ProjectInfo` (localStorage, viaja en el export) |
| Instalación (vivienda) | número, piso, puerta, superficie del local, resistencia de tierra, titular si difiere, tipo de instalación si difiere, uso si no sale del tipo | snapshot v6, en la derivación |
| Derivado | IGA, potencia a instalar, potencia máxima admisible, tensión, sección de la DI, circuitos, diferenciales | motor |

## Cortes de entrega

- **Corte 1 — estado** (commits `a4d132b`, `0fe1116`): documento de la feature, re-scope de los cinco
  campos a la derivación, snapshot v6 y helper de herencia. Revisable solo: no toca UI ni el adaptador.
  650 líneas autoradas, por encima de la unidad de revisión de ~400, así que el corte cierra acá.
- **Corte 2 — adaptador** (T2): la hoja 2 lee la herencia resuelta, el uso se deriva del tipo y el
  separador decimal deja de caer a pendiente.
- **Corte 3 — UI** (T3, T4, T5): tab «Administrativos», campos por instalación en la card de Cuadros,
  pines de tabs y documentación.

## Tasks

- T1 — Re-scopear el estado: sacar de `ProjectInfo` los cinco campos que son de la instalación
  (`addressNumber`, `addressFloor`, `addressDoor`, `superficieLocalM2`, `groundResistanceOhm`), llevarlos
  a la derivación, subir el snapshot a 6 y validarlos. Helper puro de herencia
  (`resolveAdministrative(projectInfo, derivation)`) con tests.
- T2 — Adapter y modelo: `dwellingDocumentInput` consume el resultado de la herencia y deriva el `uso`
  del tipo de derivación.
- T3 — Tab nuevo «Administrativos»: bloque instalador (extendido con NIF y carné) y bloque proyecto
  (titular, calle, localidad, CP, distribuidora, tipo de instalación), persistidos como hoy.
- T4 — Campos por instalación en la card de Cuadros: número, piso, puerta, superficie, tierra y titular
  cuando difiera, guardados en el snapshot.
- T5 — Tests de cableado y pines de tabs; documentación.

## Log

- L1 (usuario, verbatim) — ver S1. Llegó después de mergear `#9` (ELEC-3 por vivienda), preguntando
  dónde poner el formulario y cómo manejar varios titulares.
- L2 (2026-11-15) — Verificado antes de decidir: `readProjectExport` devuelve `{ inputs, projectInfo }`,
  así que los datos administrativos del proyecto **ya viajan** en el JSON exportado y se restauran al
  importar. Por eso lo compartido sigue en `ProjectInfo` y no se inventa otro almacén.
- L3 (usuario, decisiones) — S2 ubicación y S3 titular.
- L4 (2026-11-15) — Corrección reconocida sobre lo mergeado: en `#9` (T3) las once claves quedaron todas
  a nivel proyecto, pero cinco son de la instalación. Si no se re-scopean, cada vivienda hereda el piso
  y la superficie de la primera: el documento sale con datos válidos y falsos, que es el peor tipo de
  error. T1 es exactamente esa corrección.
- L5 (2026-11-15) — T1 hecho (`0fe1116`). Los cinco campos salieron de `ProjectInfo` y viven en
  `derivation.administrative` (texto declarado, vacío = no declarado, claves desconocidas rechazadas).
  Snapshot a la versión 6, descartando lo viejo. `lib/administrative.mjs` resuelve la herencia y deja
  `null` lo que no declara ninguno de los dos niveles; número, piso y puerta nunca se heredan.
  El worker paró pidiendo permiso para tocar un fixture fuera de su superficie; el padre exportó la
  versión del snapshot y reescribió ese fixture para que lo que afirma coincida con su nombre.
  Verificado: 573/573 tests y `tsc` en 0.
