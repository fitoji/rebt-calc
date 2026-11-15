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
 * @property {string | null} canalitzacio
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
 * @property {number} [cosPhi]
 * @property {number} [lengthM]
 * @property {'air' | 'buried'} [installation]
 * @property {number} [tubeDiameter]
 * @property {ExportedLineResult} [result]
 */

/**
 * Un circuito de la ITC-BT-25 de esa vivienda, ya dimensionado por el motor.
 * @typedef {object} DwellingCircuitInput
 * @property {string} id
 * @property {string} label
 * @property {number} [powerW]
 * @property {number} [lengthM]
 * @property {number} [breakerA]
 * @property {number | null} [section]
 * @property {number} [momentKwM]
 * @property {number | null} [dropPercent]
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

function canalizacion(inputs) {
  const tube = num(inputs.tubeDiameter)
  if (inputs.installation === 'buried') return 'Enterrado · profundidad pendiente'
  if (inputs.installation === 'air' && tube != null) return `Bajo tubo · Ø ${tube} mm`
  return null
}

function buildRow(inputs, result, nom, tipus, id) {
  const cable = splitCable(result?.cableType)
  const powerW = num(inputs?.powerW)

  return {
    id,
    nom,
    tipus,
    simultaneitat: null,
    potencia: powerW == null ? null : powerW / 1000,
    cosPhi: num(inputs?.cosPhi),
    intensitat: num(result?.ratedCurrent),
    seccio: num(result?.finalSection),
    longitud: num(inputs?.lengthM),
    moment: num(result?.momentKwM),
    caigudaParcial: num(result?.dropPercent),
    caigudaTotal: null,
    conductor: cable.conductor,
    tensio: cable.tensio,
    canalitzacio: inputs ? canalizacion(inputs) : null,
    aillament: null,
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

  if (data.lines?.di && (data.lines.di.inputs || data.lines.di.result)) {
    files.push(buildRow(data.lines.di.inputs, data.lines.di.result, 'Derivación individual', 'MANUAL', 'di'))
  }
  for (const derivation of derivations) {
    files.push(buildRow(
      derivation,
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
        seccio: num(lgaResult?.finalSection),
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
 * El modelo no calcula: la derivación individual y los circuitos llegan con su
 * sección, su caída y su momento eléctrico ya resueltos. Las tres celdas que el
 * proyecto no puede rellenar (`PENDING_CELLS`) se quedan a `null`.
 *
 * @param {DwellingDocumentInput} input
 * @returns {Elec3Document}
 */
export function buildDwellingDocument(input) {
  const derivation = input?.derivation ?? {}
  const circuits = input?.circuits ?? []

  /** @type {Elec3Row[]} */
  const files = [
    buildRow(
      {
        powerW: derivation.powerW,
        cosPhi: derivation.cosPhi,
        lengthM: derivation.lengthM,
        installation: derivation.installation,
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
        lengthM: circuit.lengthM,
        installation: circuit.installation,
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
  { key: 'nom', header: 'Tramo', width: 200, numeric: false },
  { key: 'simultaneitat', header: 'Carga simultán. (%)', width: 130, numeric: true },
  { key: 'potencia', header: 'Potencia (kW)', width: 110, numeric: true },
  { key: 'cosPhi', header: 'cos φ', width: 70, numeric: true },
  { key: 'intensitat', header: 'Intens. (A)', width: 100, numeric: true },
  { key: 'seccio', header: 'Sección por fase (mm²)', width: 130, numeric: true },
  { key: 'longitud', header: 'Long. (m)', width: 90, numeric: true },
  { key: 'moment', header: 'Momento eléc. (kW·m)', width: 140, numeric: true },
  { key: 'caigudaParcial', header: 'Caída parcial (%)', width: 120, numeric: true },
  { key: 'caigudaTotal', header: 'Caída total (%)', width: 110, numeric: true },
  { key: 'conductor', header: 'Tipo de conductor', width: 170, numeric: false },
  { key: 'tensio', header: 'Tensión nominal de aisl.', width: 150, numeric: false },
  { key: 'canalitzacio', header: 'Canalización', width: 200, numeric: false },
  { key: 'aillament', header: 'Aisl. instal. (kΩ)', width: 120, numeric: true },
  { key: 'neutre', header: 'Neutro (mm²)', width: 110, numeric: true },
  { key: 'proteccio', header: 'Protección (mm²)', width: 120, numeric: true },
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
