/**
 * Lectura de la exportación de la calculadora y construcción de las filas del
 * modelo ELEC-3 (memòria tècnica, Gencat `G146NSIN-157-00`).
 *
 * Este módulo no calcula nada: lee el JSON que escribe «Descargar datos → JSON»
 * y lo dispone en la rejilla legal. Cada celda que la exportación no trae se
 * queda a `null` y se pinta como pendiente, en lugar de inventar un valor o
 * repetir una tabla del REBT que ya vive en la calculadora.
 *
 * Copia provisional de `data/memoria_tecnica/src/lib/elec3.ts`, que sigue
 * siendo la implementación canónica mientras la memoria sea un subproyecto
 * aparte. Cuando se integre, una de las dos desaparece; no agregar campos acá
 * sin agregarlos allá.
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

/** Columnas de la memoria, en el orden del modelo legal. */
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

/** Celdas que la exportación puede dejar vacías, con el motivo, para el pie. */
export const PENDING_CELLS = [
  { key: 'simultaneitat', label: 'carga simultánea' },
  { key: 'caigudaTotal', label: 'caída total' },
  { key: 'aillament', label: 'aislamiento de la instalación' },
]
