/**
 * Lectura de l'exportació de la calculadora i construcció de les files del
 * model ELEC-3.
 *
 * Aquesta app no calcula res: llegeix el JSON que escriu «Descargar datos →
 * JSON» i el disposa a la graella legal. Per això cada cel·la que l'exportació
 * no porta es queda a `null` i es pinta com a pendent, en comptes d'inventar-se
 * un valor o repetir una taula del REBT que ja viu a la calculadora.
 */

/** Unió mínima del que aquesta app necessita de cada línia exportada. */
export type ExportedLine = {
  powerW?: number
  cosPhi?: number
  lengthM?: number
  voltageV?: number
  installation?: 'air' | 'buried'
  tubeDiameter?: number
  method?: string
  result?: ExportedLineResult
}

export type ExportedLineResult = {
  finalSection?: number | null
  ratedCurrent?: number
  dropPercent?: number | null
  dropPercentIn?: number | null
  protection?: number | null
  momentKwM?: number
  gamma?: number
  cableType?: string
  neutralSection?: number | null
  protectiveSection?: number | null
  minimumTube?: number | null
  housingIga?: number | null
  maxAdmissiblePowerW?: number | null
}

export type ExportedDerivation = ExportedLine & {
  id?: string
  kind?: string
  label?: string
}

export type ExportedLineBlock = { inputs?: ExportedLine; result?: ExportedLineResult }

export type CalculatorExport = {
  exportedAt?: string
  projectInfo?: { companyName?: string; workAddress?: string }
  calculations?: { total?: number }
  lines?: { lga?: ExportedLineBlock; di?: ExportedLineBlock }
  project?: { lga?: ExportedLine & { result?: ExportedLineResult }; derivations?: ExportedDerivation[]; summary?: { loadTotal?: number } }
}

export type Elec3Row = {
  id: string
  nom: string
  tipus: string
  simultaneitat: number | null
  potencia: number | null
  cosPhi: number | null
  intensitat: number | null
  seccio: number | null
  longitud: number | null
  moment: number | null
  caigudaParcial: number | null
  caigudaTotal: number | null
  conductor: string | null
  tensio: string | null
  canalitzacio: string | null
  aillament: number | null
  neutre: number | null
  proteccio: number | null
}

export type LgaContext = {
  potencia: number | null
  seccio: number | null
  proteccio: number | null
  neutre: number | null
  terra: number | null
  tub: number | null
  caiguda: number | null
}

export type Elec3Document = {
  obra: string
  data: string
  totalKw: number | null
  lga: LgaContext | null
  files: Elec3Row[]
}

export type ParseResult =
  | { ok: true; document: Elec3Document }
  | { ok: false; error: string }

const KIND_LABELS: Record<string, string> = {
  dwelling: 'VIVENDA',
  local: 'LOCAL',
  'common-services': 'SERVEIS GENERALS',
  garage: 'GARATGE',
  irve: 'IRVE',
  custom: 'MANUAL',
}

/** Un número exportat, o `null` si l'exportació no el porta (versió antiga). */
function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** El tipus de cable i la seva tensió nominal, que el motor exporta en un sol text. */
function splitCable(cableType: unknown): { conductor: string | null; tensio: string | null } {
  if (typeof cableType !== 'string' || cableType.trim() === '') return { conductor: null, tensio: null }
  const [conductor, ...rest] = cableType.trim().split(' ')
  return { conductor, tensio: rest.length > 0 ? rest.join(' ') : null }
}

function canalitzacio(inputs: ExportedLine): string | null {
  const installation = inputs.installation
  const tube = num(inputs.tubeDiameter)
  if (installation === 'buried') return 'Enterrat · fondària pendent'
  if (installation === 'air' && tube != null) return `Sota tub · Ø ${tube} mm`
  return null
}

function buildRow(
  inputs: ExportedLine | undefined,
  result: ExportedLineResult | undefined,
  nom: string,
  tipus: string,
  id: string,
): Elec3Row {
  const cable = splitCable(result?.cableType)

  return {
    id,
    nom,
    tipus,
    simultaneitat: null,
    potencia: num(inputs?.powerW) == null ? null : (num(inputs?.powerW) as number) / 1000,
    cosPhi: num(inputs?.cosPhi),
    intensitat: num(result?.ratedCurrent),
    seccio: num(result?.finalSection),
    longitud: num(inputs?.lengthM),
    moment: num(result?.momentKwM),
    caigudaParcial: num(result?.dropPercent),
    caigudaTotal: null,
    conductor: cable.conductor,
    tensio: cable.tensio,
    canalitzacio: inputs ? canalitzacio(inputs) : null,
    aillament: null,
    neutre: num(result?.neutralSection),
    proteccio: num(result?.protectiveSection),
  }
}

export function buildDocument(data: CalculatorExport): Elec3Document {
  const derivations = data.project?.derivations ?? []
  const files: Elec3Row[] = []

  if (data.lines?.di) {
    files.push(buildRow(data.lines.di.inputs, data.lines.di.result, 'Derivació individual', 'MANUAL', 'di'))
  }
  for (const derivation of derivations) {
    files.push(buildRow(
      derivation,
      derivation.result,
      derivation.label ?? 'Derivació',
      KIND_LABELS[derivation.kind ?? ''] ?? 'DERIVACIÓ',
      derivation.id ?? `derivation-${files.length}`,
    ))
  }

  const lgaFlat = data.project?.lga
  const lgaInputs = lgaFlat ?? data.lines?.lga?.inputs
  const lgaResult = lgaFlat?.result ?? data.lines?.lga?.result
  const context: LgaContext | null = lgaInputs
    ? {
        potencia: num(lgaInputs.powerW) == null ? null : (num(lgaInputs.powerW) as number) / 1000,
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
    data: data.exportedAt ? new Date(data.exportedAt).toLocaleDateString('ca-ES') : '',
    totalKw: num(totalW) == null ? null : (num(totalW) as number) / 1000,
    lga: context,
    files,
  }
}

export function readCalculatorExport(text: string): ParseResult {
  if (typeof text !== 'string' || text.trim() === '') return { ok: false, error: 'El fitxer és buit.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'El fitxer no és un JSON vàlid.' }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Aquest fitxer no és una exportació de la calculadora.' }
  }

  const data = parsed as CalculatorExport
  if (typeof data.lines !== 'object' || data.lines === null || typeof data.lines.di !== 'object' || data.lines.di === null) {
    return { ok: false, error: 'Aquest fitxer no és una exportació de la calculadora: falta el bloc de línies.' }
  }

  const document = buildDocument(data)
  if (document.files.length === 0) {
    return { ok: false, error: 'L’exportació no porta cap línia dimensionada.' }
  }

  return { ok: true, document }
}

/** Columnes de la memòria, en l'ordre del model legal. */
export const ELEC3_COLUMNS: { key: keyof Elec3Row; header: string; width: number; numeric: boolean }[] = [
  { key: 'nom', header: 'Tram', width: 28, numeric: false },
  { key: 'simultaneitat', header: 'Càrrega simultàn. (%)', width: 18, numeric: true },
  { key: 'potencia', header: 'Potència (kW)', width: 14, numeric: true },
  { key: 'cosPhi', header: 'cos φ', width: 9, numeric: true },
  { key: 'intensitat', header: 'Intens. (A)', width: 12, numeric: true },
  { key: 'seccio', header: 'Secció per fase (mm²)', width: 16, numeric: true },
  { key: 'longitud', header: 'Long. (m)', width: 11, numeric: true },
  { key: 'moment', header: 'Moment elèc. (kW·m)', width: 18, numeric: true },
  { key: 'caigudaParcial', header: 'Caiguda parcial (%)', width: 16, numeric: true },
  { key: 'caigudaTotal', header: 'Caiguda total (%)', width: 15, numeric: true },
  { key: 'conductor', header: 'Tipus de conductor', width: 20, numeric: false },
  { key: 'tensio', header: 'Tensió nominal d’aïllam.', width: 18, numeric: false },
  { key: 'canalitzacio', header: 'Canalització', width: 24, numeric: false },
  { key: 'aillament', header: 'Aïllam. instal·l. (kΩ)', width: 18, numeric: true },
  { key: 'neutre', header: 'Neutre (mm²)', width: 13, numeric: true },
  { key: 'proteccio', header: 'Protecció (mm²)', width: 14, numeric: true },
]

/** Cel·les que l'exportació pot deixar buides, amb el motiu, per al peu. */
export const PENDING_CELLS: { key: keyof Elec3Row; label: string }[] = [
  { key: 'simultaneitat', label: 'càrrega simultània' },
  { key: 'caigudaTotal', label: 'caiguda total' },
  { key: 'aillament', label: 'aïllament de la instal·lació' },
]
