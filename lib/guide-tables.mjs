/**
 * Admissible currents that the instalaciones de enlace guides publish for the
 * two lines this app sizes, transcribed from the PDFs tracked in
 * `data/documentacion/`.
 *
 * Why a separate table set exists: ITC-BT-14 §3 and ITC-BT-15 §3 do not send
 * the LGA and DI to the generic ITC-BT-19 columns alone. They reprint their own
 * tables for the cable families those lines are allowed to use (unipolar RZ1-K
 * for the LGA, ES07Z1-K / RZ1-K for the DI), and the two sets disagree: at
 * 10 mm² 3 loaded in air the ITC-BT-19 B1 column gives 54 A while the guide's
 * own table gives 60 A. Where a guide publishes a value it wins, because it is
 * the instruction that governs the line; everywhere else the caller falls back
 * to the ITC-BT-19 tables.
 *
 * Source and reference conditions of every table:
 * - Guía-BT-14, sep 03 rev. 1, tabla A (copper RZ1-K) and tabla B (aluminium
 *   RZ1-Al): unipolar cable, 40 °C ambient, buried rows already include the
 *   0,8 factor of ITC-BT-07 §3.1.3 with a 25 °C ground.
 * - Guía-BT-15, sep 03 rev. 1, tabla C (ES07Z1-K, 450/750 V), tabla D
 *   (RZ1-K unipolar) and tabla E (RZ1-K multiconductor): method B column 8 at
 *   40 °C in air, and ITC-BT-07 §3.1.3 at 25 °C buried.
 */

const SECTIONS_LGA = [10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240]
const SECTIONS_DI = [6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240]

/** Guía-BT-14 tabla A · cobre RZ1-K, 3 conductores cargados. */
const BT14_AIR_COPPER = [60, 80, 106, 131, 159, 202, 245, 284, 338, 386, 455]
const BT14_BURIED_COPPER = [77, 100, 128, 152, 184, 224, 268, 304, 340, 384, 440]

/** Guía-BT-14 tabla B · aluminio RZ1-Al, 3 conductores cargados. */
const BT14_AIR_ALUMINIUM = [65, 82, 102, 124, 158, 192, 223, 258, 294, 372]
const BT14_BURIED_ALUMINIUM = [78, 100, 120, 144, 186, 208, 236, 264, 300, 344]

/** Guía-BT-15 tabla C · ES07Z1-K (termoplástico), método B, 40 °C. */
const BT15_C_SINGLE = [36, 50, 66, 84, 104, null, null, null, null, null, null, null]
const BT15_C_THREE = [32, 44, 59, 77, 96, 117, 149, 180, 208, 236, 268, 315]

/** Guía-BT-15 tabla D · RZ1-K unipolar, método B, 40 °C (aire) y 25 °C (enterrado). */
const BT15_D_AIR_SINGLE = [49, 68, 91, 116, 144, null, null, null, null, null, null, null]
const BT15_D_AIR_THREE = [44, 60, 80, 106, 131, 159, 202, 245, 284, 338, 386, 455]
const BT15_D_BURIED_SINGLE = [71, 94, 122, 157, 186, null, null, null, null, null, null, null]
const BT15_D_BURIED_THREE = [58, 77, 100, 128, 152, 184, 224, 268, 304, 340, 384, 440]

/** Guía-BT-15 tabla E · RZ1-K multiconductor (the cable the guide asks for when buried). */
const BT15_E_AIR_SINGLE = [49, 68, 91, 116, 144, null, null, null, null, null, null, null]
const BT15_E_AIR_THREE = [44, 60, 80, 106, 131, 159, 202, 245, 284, 338, 386, 455]
const BT15_E_BURIED_SINGLE = [65, 86, 113, 147, 176, null, null, null, null, null, null, null]
const BT15_E_BURIED_THREE = [53, 70, 92, 120, 144, 172, 208, 248, 284, 320, 360, 416]

/** ITC-BT-14 tabla 1 · neutral section and tube diameter per phase section. */
export const BT14_NEUTRAL_ROWS = [
  ['10 (Cu)', '10 (Cu)', 75],
  ['16 (Cu)', '10 (Cu)', 75],
  ['16 (Al)', '16 (Al)', 75],
  ['25', '16', 110],
  ['35', '16', 110],
  ['50', '25', 125],
  ['70', '35', 140],
  ['95', '50', 140],
  ['120', '70', 160],
  ['150', '70', 160],
  ['185', '95', 180],
  ['240', '120', 200],
]

function pick(values, sections, section) {
  const index = sections.indexOf(section)
  if (index === -1) return null
  return values[index] ?? null
}

/**
 * Admissible current the guide publishes for this line, or `null` when the
 * guide does not tabulate that combination and the caller must fall back to
 * the ITC-BT-19 tables.
 *
 * @param {{ role: 'lga' | 'di', system: 'three-phase' | 'single-phase', insulation: 'PVC' | 'XLPE',
 *   installation?: 'air' | 'buried', method?: string, material?: 'copper' | 'aluminium', section: number }} input
 * @returns {number | null}
 */
export function guideAdmissibleCurrent(input) {
  const { role, system, insulation, section } = input
  const installation = input.installation ?? 'air'
  const method = input.method ?? 'B1'
  const material = input.material ?? 'copper'

  if (role === 'lga') {
    // Tabla A/B are method B (tube, surface or channel) and three loaded
    // conductors; a single-phase LGA is not tabulated by the guide.
    if (method !== 'B1' || system !== 'three-phase') return null
    if (material === 'aluminium') {
      return installation === 'buried'
        ? pick(BT14_BURIED_ALUMINIUM, SECTIONS_LGA.slice(1), section)
        : pick(BT14_AIR_ALUMINIUM, SECTIONS_LGA.slice(1), section)
    }
    return installation === 'buried'
      ? pick(BT14_BURIED_COPPER, SECTIONS_LGA, section)
      : pick(BT14_AIR_COPPER, SECTIONS_LGA, section)
  }

  const three = system === 'three-phase'
  if (installation === 'buried') {
    // The guide routes buried DI through multiconductor RZ1-K (tabla E).
    return three
      ? pick(BT15_E_BURIED_THREE, SECTIONS_DI, section)
      : pick(BT15_E_BURIED_SINGLE, SECTIONS_DI, section)
  }
  if (method !== 'B1') return null
  if (insulation === 'PVC') {
    return three
      ? pick(BT15_C_THREE, SECTIONS_DI, section)
      : pick(BT15_C_SINGLE, SECTIONS_DI, section)
  }
  return three
    ? pick(BT15_D_AIR_THREE, SECTIONS_DI, section)
    : pick(BT15_D_AIR_SINGLE, SECTIONS_DI, section)
}

/** Reference tables shown in the dialog, each with the document it comes from. */
export const GUIDE_TABLES = [
  {
    key: 'BT14-A',
    title: 'Guía-BT-14 · tabla A — Cobre, cable unipolar RZ1-K (A)',
    doc: 'ITC-BT-14 §3. Ampliación no aplicable: los valores son de tres conductores cargados.',
    head: ['Instalación', ...SECTIONS_LGA.map(String)],
    rows: [
      ['Tubos empotrados, superficial, canal o conducto cerrado', ...BT14_AIR_COPPER],
      ['Tubos enterrados (ITC-BT-07, factor 0,8)', ...BT14_BURIED_COPPER],
    ],
  },
  {
    key: 'BT14-B',
    title: 'Guía-BT-14 · tabla B — Aluminio, cable unipolar RZ1-Al (A)',
    doc: 'ITC-BT-14 §3. Referencia: 16 a 240 mm², tres conductores cargados.',
    head: ['Instalación', ...SECTIONS_LGA.slice(1).map(String)],
    rows: [
      ['Tubos empotrados, superficial, canal o conducto cerrado', ...BT14_AIR_ALUMINIUM],
      ['Tubos enterrados (ITC-BT-07, factor 0,8)', ...BT14_BURIED_ALUMINIUM],
    ],
  },
  {
    key: 'BT14-1',
    title: 'Guía-BT-14 · tabla 1 — Sección del neutro y diámetro del tubo',
    doc: 'ITC-BT-14 §3. El neutro es aproximadamente el 50 % de la fase, nunca inferior a la tabla.',
    head: ['Fase (mm²)', 'Neutro (mm²)', 'Ø exterior del tubo (mm)'],
    rows: BT14_NEUTRAL_ROWS,
  },
  {
    key: 'BT15-C',
    title: 'Guía-BT-15 · tabla C — ES07Z1-K (450/750 V), método B (A)',
    doc: 'ITC-BT-15 §3. sm: suministro monofásico; st: trifásico. 40 °C de ambiente.',
    head: ['Instalación', ...SECTIONS_DI.map(String)],
    rows: [
      ['Tubos empotrados o en montaje superficial · sm', ...BT15_C_SINGLE],
      ['Tubos empotrados o en montaje superficial · st', ...BT15_C_THREE],
    ],
  },
  {
    key: 'BT15-D',
    title: 'Guía-BT-15 · tabla D — RZ1-K unipolar (0,6/1 kV) (A)',
    doc: 'ITC-BT-15 §3. Las filas enterradas parten de ITC-BT-07 §3.1.3, terreno a 25 °C.',
    head: ['Instalación', ...SECTIONS_DI.map(String)],
    rows: [
      ['Tubos enterrados · sm', ...BT15_D_BURIED_SINGLE],
      ['Tubos enterrados · st', ...BT15_D_BURIED_THREE],
      ['Empotrado, superficial, canal o conducto · sm', ...BT15_D_AIR_SINGLE],
      ['Empotrado, superficial, canal o conducto · st', ...BT15_D_AIR_THREE],
    ],
  },
  {
    key: 'BT15-E',
    title: 'Guía-BT-15 · tabla E — RZ1-K multiconductor (0,6/1 kV) (A)',
    doc: 'ITC-BT-15 §3. Es el cable que la instrucción pide para la derivación enterrada.',
    head: ['Instalación', ...SECTIONS_DI.map(String)],
    rows: [
      ['Tubos enterrados · sm', ...BT15_E_BURIED_SINGLE],
      ['Tubos enterrados · st', ...BT15_E_BURIED_THREE],
      ['Empotrado, superficial, canal o conducto · sm', ...BT15_E_AIR_SINGLE],
      ['Empotrado, superficial, canal o conducto · st', ...BT15_E_AIR_THREE],
    ],
  },
]
