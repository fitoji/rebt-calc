/**
 * Lectura de la exportación de la calculadora y construcción de las filas del
 * modelo ELEC-3 (memòria tècnica, Gencat `G146NSIN-157-00`).
 *
 * Este módulo no calcula nada: lee el JSON que escribe «Descargar datos → JSON»
 * y lo dispone en la rejilla legal. Cada celda que la exportación no trae se
 * queda a `null` y se pinta como pendiente, en lugar de inventar un valor o
 * repetir una tabla del REBT que ya vive en la calculadora.
 *
 * Esta es la única implementación del modelo. El subproyecto
 * `data/memoria_tecnica` la consume a través de una fachada tipada
 * (`src/lib/elec3.ts`) que no repite lógica: antes eran dos copias y llegaron
 * a producir salidas distintas para la misma entrada.
 */

/** @typedef {{ finalSection?: number | null, ratedCurrent?: number, dropPercent?: number | null, dropPercentIn?: number | null, protection?: number | null, momentKwM?: number, gamma?: number, cableType?: string, neutralSection?: number | null, protectiveSection?: number | null, minimumTube?: number | null, housingIga?: number | null, maxAdmissiblePowerW?: number | null }} ExportedLineResult */

/** @typedef {{ powerW?: number, cosPhi?: number, lengthM?: number, voltageV?: number, installation?: 'air' | 'buried', tubeDiameter?: number, method?: string, result?: ExportedLineResult }} ExportedLine */

/** @typedef {ExportedLine & { id?: string, kind?: string, label?: string }} ExportedDerivation */

/** @typedef {{ inputs?: ExportedLine, result?: ExportedLineResult }} ExportedLineBlock */

/** @typedef {{ exportedAt?: string, projectInfo?: { companyName?: string, workAddress?: string }, calculations?: { total?: number }, lines?: { lga?: ExportedLineBlock, di?: ExportedLineBlock }, project?: { lga?: ExportedLine & { result?: ExportedLineResult }, derivations?: ExportedDerivation[], summary?: { loadTotal?: number } } }} CalculatorExport */

/**
 * @typedef {object} Elec3Row
 * @property {string} id
 * @property {string} nom
 * @property {string} tipus
 * @property {number | null} simultaneitat
 * @property {number | null} potencia
 * @property {number | null} cosPhi
 * @property {number | null} intensitat
 * @property {number | null} seccio
 * @property {number | null} longitud
 * @property {number | null} moment
 * @property {number | null} caigudaParcial
 * @property {number | null} caigudaTotal
 * @property {string | null} conductor
 * @property {string | null} tensio
 * @property {string | null} senseTub sin tubo protector (sistema)
 * @property {number | null} tubEncastrat tubo Ø mm encastrado
 * @property {number | null} tubSenseEncastrar tubo Ø mm sin encastrar
 * @property {number | null} enterratProfunditat conductor enterrado, profundidad en m
 * @property {number | null} aillament
 * @property {number | null} neutre
 * @property {number | null} proteccio
 */

/**
 * @typedef {object} LgaContext
 * @property {number | null} potencia
 * @property {number | null} seccio
 * @property {number | null} proteccio
 * @property {number | null} neutre
 * @property {number | null} terra
 * @property {number | null} tub
 * @property {number | null} caiguda
 */

/**
 * @typedef {object} Elec3Document
 * @property {string} obra
 * @property {string} data
 * @property {number | null} totalKw
 * @property {LgaContext | null} lga
 * @property {string | null} [num] campo «NÚM.» de la cabecera del impreso
 * @property {string | null} [ip] observación IP de la hoja 1
 * @property {Elec3Row[]} files
 * @property {number} [circuitsBeyondModel] Solo lo trae el documento de una vivienda: los
 *   circuitos que no caben en las doce filas del modelo y no se han podido escribir.
 * @property {AdministrativeBlock} [administrative] Solo lo trae el documento de una vivienda:
 *   la hoja 2 administrativa del modelo.
 */

/**
 * La derivación individual de una vivienda, ya dimensionada por el motor.
 * @typedef {object} DwellingDerivationInput
 * @property {string} [label]
 * @property {number} [powerW]
 * @property {number} [simultaneitat] carga simultánea de la derivación, en %
 * @property {number} [cosPhi]
 * @property {number} [lengthM]
 * @property {'air' | 'buried'} [installation]
 * @property {number} [tubeDiameter]
 * @property {string} [method] sistema de instalación declarado para la DI
 * @property {number} [caigudaTotal] caída de la DI más la de la LGA
 * @property {ExportedLineResult} [result]
 */

/**
 * Un circuito de la ITC-BT-25 de esa vivienda, ya dimensionado por el motor.
 * @typedef {object} DwellingCircuitInput
 * @property {string} id
 * @property {string} label
 * @property {number} [powerW]
 * @property {number} [simultaneitat] carga simultánea del circuito, en %
 * @property {number} [lengthM]
 * @property {number} [breakerA]
 * @property {number | null} [section]
 * @property {number} [momentKwM]
 * @property {number | null} [dropPercent]
 * @property {number} [caigudaTotal] caída del circuito más la de la DI
 * @property {string} [cableType]
 * @property {number | null} [neutralSection]
 * @property {number | null} [protectiveSection]
 * @property {'air' | 'buried'} [installation]
 * @property {number} [tubeDiameter]
 */

/**
 * Hoja 1 de una vivienda: su derivación individual y sus circuitos, tal como los
 * dejó el dimensionado. El adaptador entrega los valores ya calculados.
 * @typedef {object} DwellingDocumentInput
 * @property {string} [obra]
 * @property {string} [data]
 * @property {number | null} [totalKw]
 * @property {LgaContext | null} [lga]
 * @property {DwellingDerivationInput} derivation
 * @property {DwellingCircuitInput[]} circuits
 * @property {number} [aillament] aislamiento de la instalación en kΩ, igual para todas las filas
 * @property {InstallationType} [installationType] tipo de canalización elegido para la vivienda
 * @property {number} [buriedDepthM] profundidad del enterramiento en metros
 * @property {number} [circuitsBeyondModel]
 * @property {AdministrativeInput} [administrative] Hoja 2: los datos administrativos, que la
 *   app declara y no calcula.
 */

/**
 * El emplazamiento de la instalación, tal como lo escribe el titular.
 * @typedef {object} AdministrativeEmplazamientoInput
 * @property {string} [calle]
 * @property {string} [numero]
 * @property {string} [piso]
 * @property {string} [puerta]
 * @property {string} [localidad]
 * @property {string} [codigoPostal]
 */

/**
 * Una fila de interruptor diferencial de la hoja 2, ya elegida por el instalador.
 * @typedef {object} AdministrativeDifferentialInput
 * @property {string} [circuito]
 * @property {string} [nombre]
 * @property {number | null} [inA]
 * @property {number | null} [sensibilidadMa]
 */

/**
 * Hoja 2 del modelo: los datos administrativos y las tres filas de diferencial.
 * El modelo no calcula nada de esto; llega ya declarado o queda pendiente.
 * @typedef {object} AdministrativeInput
 * @property {string} [titular]
 * @property {string} [uso]
 * @property {AdministrativeEmplazamientoInput} [emplazamiento]
 * @property {'nueva' | 'ampliacion' | 'reforma'} [instalacion]
 * @property {string} [distribuidora]
 * @property {number | null} [resistenciaTierraOhm]
 * @property {number | null} [superficieLocalM2]
 * @property {number | null} [seccionDi]
 * @property {number | null} [potenciaMaximaAdmisibleKw]
 * @property {number | null} [tensionV]
 * @property {number | null} [potenciaInstalarKw]
 * @property {number | null} [igaA]
 * @property {AdministrativeDifferentialInput[]} [diferenciales]
 */

/**
 * El emplazamiento ya dispuesto para la hoja: un texto recortado o pendiente.
 * @typedef {object} AdministrativeEmplazamiento
 * @property {string | null} calle
 * @property {string | null} numero
 * @property {string | null} piso
 * @property {string | null} puerta
 * @property {string | null} localidad
 * @property {string | null} codigoPostal
 */

/**
 * @typedef {object} AdministrativeDifferential
 * @property {string | null} circuito
 * @property {string | null} nombre
 * @property {number | null} inA
 * @property {number | null} sensibilidadMa
 */

/**
 * La hoja 2 del documento. Siempre está presente: lo que la app no declara queda a
 * `null` (pendiente), nunca a cadena vacía ni a un valor supuesto.
 * @typedef {object} AdministrativeBlock
 * @property {string | null} titular
 * @property {string | null} uso
 * @property {AdministrativeEmplazamiento} emplazamiento
 * @property {string | null} instalacion Etiqueta del impreso, `null` si el tipo declarado no
 *   es uno de los tres aceptados.
 * @property {string | null} distribuidora
 * @property {number | null} resistenciaTierraOhm
 * @property {number | null} superficieLocalM2
 * @property {number | null} seccionDi
 * @property {number | null} potenciaMaximaAdmisibleKw
 * @property {number | null} tensionV
 * @property {number | null} potenciaInstalarKw
 * @property {number | null} igaA
 * @property {AdministrativeDifferential[]} diferenciales Hasta tres filas, las del impreso.
 */

/** @typedef {{ ok: true, document: Elec3Document } | { ok: false, error: string }} ParseResult */

const KIND_LABELS = {
  dwelling: 'VIVIENDA',
  local: 'LOCAL',
  'common-services': 'SERVICIOS GENERALES',
  garage: 'GARAJE',
  irve: 'IRVE',
  custom: 'MANUAL',
}

/** Un número exportado, o `null` si la exportación no lo trae (versión antigua). */
function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** El tipo de cable y su tensión nominal, que el motor exporta en un solo texto. */
function splitCable(cableType) {
  if (typeof cableType !== 'string' || cableType.trim() === '') return { conductor: null, tensio: null }
  const [conductor, ...rest] = cableType.trim().split(' ')
  return { conductor, tensio: rest.length > 0 ? rest.join(' ') : null }
}

/**
 * Cuatro columnas del impreso, una sola opción elegida por vivienda. El tubo
 * toma el diámetro ya resuelto de la línea; la profundidad la declara el usuario.
 *
 * @typedef {'sinTubo' | 'tuboEncastrado' | 'tuboSinEncastrar' | 'enterrado'} InstallationType
 *
 * @param {{ installationType?: InstallationType, tubeDiameter?: number, buriedDepthM?: number, senseTubSystem?: string } | undefined} inputs
 */
function canalizacion(inputs) {
  const empty = { senseTub: null, tubEncastrat: null, tubSenseEncastrar: null, enterratProfunditat: null }
  if (inputs == null) return empty

  switch (inputs.installationType) {
    case 'sinTubo': {
      const system = typeof inputs.senseTubSystem === 'string' ? inputs.senseTubSystem.trim() : ''
      return { ...empty, senseTub: system === '' ? null : system }
    }
    case 'tuboEncastrado':
      return { ...empty, tubEncastrat: num(inputs.tubeDiameter) }
    case 'tuboSinEncastrar':
      return { ...empty, tubSenseEncastrar: num(inputs.tubeDiameter) }
    case 'enterrado':
      return { ...empty, enterratProfunditat: num(inputs.buriedDepthM) }
    default:
      return empty
  }
}

function buildRow(inputs, result, nom, tipus, id) {
  const cable = splitCable(result?.cableType)
  const powerW = num(inputs?.powerW)
  const canal = canalizacion(inputs)

  return {
    id,
    nom,
    tipus,
    simultaneitat: num(inputs?.simultaneitat),
    potencia: powerW == null ? null : powerW / 1000,
    cosPhi: num(inputs?.cosPhi),
    intensitat: num(result?.ratedCurrent),
    seccio: num(result?.effectiveSection ?? result?.finalSection),
    longitud: num(inputs?.lengthM),
    moment: num(result?.momentKwM),
    caigudaParcial: num(result?.dropPercent),
    caigudaTotal: num(inputs?.caigudaTotal),
    conductor: cable.conductor,
    tensio: cable.tensio,
    ...canal,
    aillament: num(inputs?.aillament),
    neutre: num(result?.neutralSection),
    proteccio: num(result?.protectiveSection),
  }
}

/**
 * @param {CalculatorExport} data
 * @returns {Elec3Document}
 */
export function buildDocument(data) {
  const derivations = data.project?.derivations ?? []
  /** @type {Elec3Row[]} */
  const files = []
  // La exportación general no tiene el selector por vivienda: conserva lo que
  // ya sabía de cada línea (enterrado o tubo empotrado).
  const canalizacionOf = inputs => inputs?.installation === 'buried'
    ? 'enterrado'
    : num(inputs?.tubeDiameter) != null ? 'tuboEncastrado' : 'sinTubo'

  if (data.lines?.di && (data.lines.di.inputs || data.lines.di.result)) {
    const inputs = data.lines.di.inputs
    files.push(buildRow({ ...inputs, installationType: canalizacionOf(inputs), senseTubSystem: inputs?.method }, data.lines.di.result, 'Derivación individual', 'MANUAL', 'di'))
  }
  for (const derivation of derivations) {
    files.push(buildRow(
      { ...derivation, installationType: canalizacionOf(derivation), senseTubSystem: derivation.method },
      derivation.result,
      derivation.label ?? 'Derivación',
      KIND_LABELS[derivation.kind ?? ''] ?? 'DERIVACIÓN',
      derivation.id ?? `derivation-${files.length}`,
    ))
  }

  const lgaFlat = data.project?.lga
  const lgaInputs = lgaFlat ?? data.lines?.lga?.inputs
  const lgaResult = lgaFlat?.result ?? data.lines?.lga?.result
  const lgaPower = num(lgaInputs?.powerW)
  const context = lgaInputs
    ? {
        potencia: lgaPower == null ? null : lgaPower / 1000,
        seccio: num(lgaResult?.effectiveSection ?? lgaResult?.finalSection),
        proteccio: num(lgaResult?.protection),
        neutre: num(lgaResult?.neutralSection),
        terra: num(lgaResult?.protectiveSection),
        tub: num(lgaInputs.tubeDiameter),
        caiguda: num(lgaResult?.dropPercent),
      }
    : null

  const totalW = data.calculations?.total ?? data.project?.summary?.loadTotal

  return {
    obra: data.projectInfo?.workAddress?.trim() || data.projectInfo?.companyName?.trim() || '',
    data: data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('es-ES') : '',
    totalKw: num(totalW) == null ? null : num(totalW) / 1000,
    lga: context,
    num: null,
    ip: null,
    files,
  }
}

/** Filas de circuito que tiene la hoja 1 del modelo `G146NSIN-157-00` (`C — D` … `Y — Z`). */
const MODEL_CIRCUIT_ROWS = 12

/** Filas de interruptor diferencial que tiene la hoja 2 del modelo. */
const MODEL_DIFFERENTIAL_ROWS = 3

/** Etiquetas del impreso para el tipo de instalación; cualquier otro token queda pendiente. */
const INSTALLATION_TYPE_LABELS = new Map([
  ['nueva', 'Nueva'],
  ['ampliacion', 'Ampliación'],
  ['reforma', 'Reforma'],
])

/** Campos del emplazamiento, en el orden del impreso. */
const EMPLAZAMIENTO_FIELDS = ['calle', 'numero', 'piso', 'puerta', 'localidad', 'codigoPostal']

/** Un texto declarado por el usuario, recortado; vacío o ausente queda pendiente. */
function text(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** La entrada declarada, o un objeto vacío cuando falta o no es un objeto. */
function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

/**
 * La hoja 2 del documento a partir de los datos declarados. No calcula: los números
 * llegan ya resueltos y lo que falta se queda pendiente.
 *
 * @param {unknown} value
 * @returns {AdministrativeBlock}
 */
function readAdministrative(value) {
  const source = record(value)
  const emplazamiento = record(source.emplazamiento)
  const diferenciales = Array.isArray(source.diferenciales) ? source.diferenciales : []

  return {
    titular: text(source.titular),
    uso: text(source.uso),
    emplazamiento: Object.fromEntries(EMPLAZAMIENTO_FIELDS.map(field => [field, text(emplazamiento[field])])),
    instalacion: INSTALLATION_TYPE_LABELS.get(source.instalacion) ?? null,
    distribuidora: text(source.distribuidora),
    resistenciaTierraOhm: num(source.resistenciaTierraOhm),
    superficieLocalM2: num(source.superficieLocalM2),
    seccionDi: num(source.seccionDi),
    potenciaMaximaAdmisibleKw: num(source.potenciaMaximaAdmisibleKw),
    tensionV: num(source.tensionV),
    potenciaInstalarKw: num(source.potenciaInstalarKw),
    igaA: num(source.igaA),
    diferenciales: diferenciales.slice(0, MODEL_DIFFERENTIAL_ROWS).map(row => {
      const differential = record(row)
      return {
        circuito: text(differential.circuito),
        nombre: text(differential.nombre),
        inA: num(differential.inA),
        sensibilidadMa: num(differential.sensibilidadMa),
      }
    }),
  }
}

/**
 * Las dos hojas de una sola vivienda: la hoja 1 a partir de sus líneas ya
 * dimensionadas y la hoja 2 con los datos administrativos que declara la app.
 *
 * El modelo no calcula secciones: la derivación individual y los circuitos llegan
 * con su sección, su caída y su momento ya resueltos. La caída total es solo la
 * suma de la parcial con la de la línea de aguas arriba (LGA → DI → circuito),
 * y cos φ se imprime 1 en todas las filas. Lo que el proyecto no puede rellenar
 * (`PENDING_CELLS`) se queda a `null`.
 *
 * @param {DwellingDocumentInput} input
 * @returns {Elec3Document}
 */
export function buildDwellingDocument(input) {
  const derivation = input?.derivation ?? {}
  const circuits = input?.circuits ?? []
  const diDrop = num(derivation.result?.dropPercent)
  const lgaDrop = num(input?.lga?.caiguda)
  const aillament = num(input?.aillament)

  /** @type {Elec3Row[]} */
  const files = [
    buildRow(
      {
        powerW: derivation.powerW,
        simultaneitat: derivation.simultaneitat,
        // La hoja de una vivienda imprime cos φ = 1: la previsión de cargas de
        // la ITC-BT-25 no aplica factor de potencia a la derivación ni a los
        // circuitos, así que la celda nunca queda en blanco.
        cosPhi: 1,
        caigudaTotal: diDrop == null || lgaDrop == null ? null : diDrop + lgaDrop,
        aillament,
        lengthM: derivation.lengthM,
        installation: derivation.installation,
        installationType: input?.installationType,
        buriedDepthM: num(input?.buriedDepthM),
        senseTubSystem: derivation.method,
        tubeDiameter: derivation.tubeDiameter,
      },
      derivation.result,
      'Derivación individual',
      'VIVIENDA',
      'di',
    ),
  ]

  for (const circuit of circuits.slice(0, MODEL_CIRCUIT_ROWS)) {
    files.push(buildRow(
      {
        powerW: circuit.powerW,
        simultaneitat: circuit.simultaneitat,
        cosPhi: 1,
        caigudaTotal: circuit.dropPercent == null || diDrop == null ? null : circuit.dropPercent + diDrop,
        aillament,
        lengthM: circuit.lengthM,
        installation: circuit.installation,
        installationType: input?.installationType,
        buriedDepthM: num(input?.buriedDepthM),
        tubeDiameter: circuit.tubeDiameter,
      },
      {
        ratedCurrent: circuit.breakerA,
        finalSection: circuit.section,
        momentKwM: circuit.momentKwM,
        dropPercent: circuit.dropPercent,
        cableType: circuit.cableType,
        neutralSection: circuit.neutralSection,
        protectiveSection: circuit.protectiveSection,
      },
      circuit.label,
      'CIRCUITO',
      circuit.id,
    ))
  }

  const beyondModel = Math.max(0, circuits.length - MODEL_CIRCUIT_ROWS) + (num(input?.circuitsBeyondModel) ?? 0)
  const obra = typeof input?.obra === 'string' ? input.obra.trim() : ''
  const data = typeof input?.data === 'string' && input.data.trim() !== '' ? input.data : new Date().toLocaleDateString('es-ES')

  return {
    obra,
    data,
    totalKw: num(input?.totalKw),
    lga: input?.lga ?? null,
    num: null,
    ip: null,
    files,
    circuitsBeyondModel: beyondModel,
    administrative: readAdministrative(input?.administrative),
  }
}

/**
 * @param {string} text
 * @returns {ParseResult}
 */
export function readCalculatorExport(text) {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: 'El archivo está vacío.' }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Este archivo no es una exportación de la calculadora.' }
  }

  const data = /** @type {CalculatorExport} */ (parsed)
  if (typeof data.lines !== 'object' || data.lines === null || typeof data.lines.di !== 'object' || data.lines.di === null) {
    return { ok: false, error: 'Este archivo no es una exportación de la calculadora: falta el bloque de líneas.' }
  }

  const document = buildDocument(data)
  if (document.files.length === 0) {
    return { ok: false, error: 'La exportación no trae ninguna línea dimensionada.' }
  }

  return { ok: true, document }
}

/**
 * Columnas de la memoria, en el orden del modelo legal.
 * @type {Array<{ key: keyof Elec3Row, header: string, width: number, numeric: boolean }>}
 */
export const ELEC3_COLUMNS = [
  { key: 'nom', width: 200, numeric: false },
  { key: 'simultaneitat', width: 130, numeric: true },
  { key: 'potencia', width: 110, numeric: true },
  { key: 'cosPhi', width: 70, numeric: true },
  { key: 'intensitat', width: 100, numeric: true },
  { key: 'seccio', width: 130, numeric: true },
  { key: 'longitud', width: 90, numeric: true },
  { key: 'moment', width: 140, numeric: true },
  { key: 'caigudaParcial', width: 120, numeric: true },
  { key: 'caigudaTotal', width: 110, numeric: true },
  { key: 'conductor', width: 170, numeric: false },
  { key: 'tensio', width: 150, numeric: false },
  { key: 'senseTub', width: 150, numeric: false },
  { key: 'tubEncastrat', width: 130, numeric: true },
  { key: 'tubSenseEncastrar', width: 140, numeric: true },
  { key: 'enterratProfunditat', width: 130, numeric: true },
  { key: 'aillament', width: 120, numeric: true },
  { key: 'neutre', width: 110, numeric: true },
  { key: 'proteccio', width: 120, numeric: true },
]

/**
 * Cabeceras agrupadas del impreso: una celda con `colSpan` para los grupos y
 * las columnas sueltas con `rowSpan` en la segunda fila. La clave del grupo
 * reside en el diccionario de idiomas (`lib/elec3-i18n.mjs`).
 */
export const ELEC3_HEADER_GROUPS = [
  { key: 'nom', keys: ['nom'] },
  { key: 'simultaneitat', keys: ['simultaneitat'] },
  { key: 'potencia', keys: ['potencia'] },
  { key: 'cosPhi', keys: ['cosPhi'] },
  { key: 'intensitat', keys: ['intensitat'] },
  { key: 'seccio', keys: ['seccio'] },
  { key: 'longitud', keys: ['longitud'] },
  { key: 'moment', keys: ['moment'] },
  { key: 'caiguda', keys: ['caigudaParcial', 'caigudaTotal'] },
  { key: 'conductores', keys: ['conductor', 'tensio'] },
  { key: 'canalitzacio', keys: ['senseTub', 'tubEncastrat', 'tubSenseEncastrar', 'enterratProfunditat'] },
  { key: 'aillament', keys: ['aillament'] },
  { key: 'neutre', keys: ['neutre'] },
  { key: 'proteccio', keys: ['proteccio'] },
]

/**
 * Celdas que la exportación puede dejar vacías, con el motivo, para el pie.
 * @type {Array<{ key: keyof Elec3Row, label: string }>}
 */
export const PENDING_CELLS = [
  { key: 'simultaneitat', label: 'carga simultánea' },
  { key: 'caigudaTotal', label: 'caída total' },
  { key: 'aillament', label: 'aislamiento de la instalación' },
]
