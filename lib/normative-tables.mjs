/**
 * Every normative table the calculator consults, in one place.
 *
 * This file holds values only: no derivation, no thresholds, no functions. The
 * modules that size lines and loads import what they need and keep the logic.
 * The point is that a change against the BOE has exactly one place to land, and
 * an audit can read the numbers without reading the arithmetic around them.
 *
 * Where the numbers come from, and the reference conditions that make them
 * valid, are stated per group. The guides themselves are tracked in
 * `data/documentacion/` as the transcribed PDFs.
 *
 *   guia_bt_10_sep03R1.pdf   -> simultaneity coefficients, ITA powers
 *   guia_bt_14_sep03R1.pdf   -> LGA admissible currents, neutral and tube table
 *   guia_bt_15_sep03R1.pdf   -> DI admissible currents
 *
 * The ITC-BT-19 tables have no guide PDF in the repository: they are transcribed
 * from UNE 20460-5-523:2004 as reproduced by Guía-BT-19 (feb 09 rev. 2).
 */

/* ------------------------------------------------------------------------- */
/* Nominal sections and installation vocabulary                              */
/* ------------------------------------------------------------------------- */

/** Nominal cross-sections in mm², as published. */
export const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630]

export const INSULATIONS = ['PVC', 'XLPE']
export const METHODS = ['A1', 'A2', 'B1', 'B2', 'C', 'E', 'F']

/* ------------------------------------------------------------------------- */
/* ITC-BT-19 · Table A — admissible currents, copper, not buried             */
/* ------------------------------------------------------------------------- */

/**
 * Column number as printed in the source table -> admissible current per
 * section. Amperes at 40 °C ambient air.
 *
 * The published table is deliberately simplified: installation methods whose
 * values are practically equal share one column, so a (method, loaded
 * conductors, insulation) triple maps onto one of twelve columns. Columns are
 * numbered 2..13 as printed, so the table viewer can point at the exact column
 * of the official document.
 *
 * Known erratum in the source: at 400 mm² the printed values of columns 9 and
 * 10 (699 A and 645 A) break the monotonic growth seen in every other row and
 * look transposed. They are kept verbatim rather than silently corrected.
 */
export const COLUMN_VALUES = {
  2: [11, 15, 20, 25, 34, 45, 59, null, null, null, null, null, null, null, null, null, null, null, null],
  3: [11.5, 16, 21, 27, 37, 49, 64, 77, 94, null, null, null, null, null, null, null, null, null, null],
  4: [13, 17.5, 23, 30, 40, 54, 70, 86, 103, null, null, null, null, null, null, null, null, null, null],
  5: [13.5, 18.5, 24, 32, 44, 59, 77, 96, 117, 149, 180, 208, 236, 268, 315, 361, 431, 493, 565],
  6: [15, 21, 27, 36, 50, 66, 84, 104, 125, 160, 194, 225, 260, 297, 350, 401, 480, 551, 632],
  7: [16, 22, 30, 37, 52, 70, 88, 110, 133, 171, 207, 240, 278, 317, 374, 430, 515, 592, 681],
  8: [16.5, 23, 31, 40, 54, 73, 95, 119, 145, 185, 224, 260, 299, 341, 401, 461, 552, 633, 728],
  9: [19, 26, 34, 44, 60, 81, 103, 127, 155, 199, 241, 280, 322, 368, 435, 500, 699, 687, 790],
  10: [20, 26.5, 36, 46, 65, 87, 110, 137, 167, 214, 259, 301, 343, 391, 468, 538, 645, 741, 853],
  11: [21, 29, 38, 49, 68, 91, 116, 144, 175, 224, 271, 314, 363, 415, 490, 563, 674, 774, 890],
  12: [24, 33, 45, 57, 76, 105, 123, 154, 188, 244, 296, 348, 404, 464, 552, 638, 770, 889, 1_028],
  13: [null, null, null, null, null, null, 140, 174, 210, 269, 327, 380, 438, 500, 590, 678, 812, 931, 1_071],
}

/** Printed column that each installation variant uses. */
export const COLUMN_BY_VARIANT = {
  'A1|3|PVC': 3,
  'A1|2|PVC': 4,
  'A1|3|XLPE': 6,
  'A1|2|XLPE': 7,
  'A2|3|PVC': 2,
  'A2|2|PVC': 3,
  'A2|3|XLPE': 5,
  'A2|2|XLPE': 6,
  'B1|3|PVC': 5,
  'B1|2|PVC': 6,
  'B1|3|XLPE': 8,
  'B1|2|XLPE': 10,
  'B2|3|PVC': 4,
  'B2|2|PVC': 5,
  'B2|3|XLPE': 7,
  'B2|2|XLPE': 8,
  'C|3|PVC': 6,
  'C|2|PVC': 8,
  'C|3|XLPE': 9,
  'C|2|XLPE': 11,
  'E|3|PVC': 7,
  'E|2|PVC': 9,
  'E|3|XLPE': 10,
  'E|2|XLPE': 12,
  'F|3|PVC': 8,
  'F|2|PVC': 10,
  'F|3|XLPE': 11,
  'F|2|XLPE': 13,
}

/* ------------------------------------------------------------------------- */
/* ITC-BT-19 · Tables C to I — correction factors                            */
/* ------------------------------------------------------------------------- */

/**
 * Thermal resistivity of the ground by terrain type, Table C.
 * Used to state the reference condition of the buried table, which assumes
 * 1.5 K·m/W.
 */
export const SOIL_RESISTIVITY = [
  { terrain: 'Inundado', value: 0.4 },
  { terrain: 'Muy humedo', value: 0.5 },
  { terrain: 'Humedo', value: 0.7 },
  { terrain: 'Poco humedo', value: 0.85 },
  { terrain: 'Seco', value: 1.0 },
  { terrain: 'Arcilloso muy seco', value: 1.2 },
  { terrain: 'Arenoso muy seco', value: 1.5 },
  { terrain: 'De piedra arenisca', value: 2.0 },
  { terrain: 'De piedra caliza', value: 2.5 },
]

/**
 * Buried under tube, Table D. Reference conditions: soil thermal resistivity
 * 1.5 K·m/W, ground temperature 25 °C, burial depth 70 cm.
 * Only XLPE insulation is tabulated.
 */
export const BURIED_TUBE_CURRENT = {
  copper: {
    3: [23, 30, 39, 48, 64, 82, 105, 130, 155, 190, 225, 260, 300, 335, 400, 455, 530, 610, 710],
    2: [27, 36, 46, 58, 77, 100, 130, 155, 183, 225, 265, 305, 340, 385, 440, 500, 570, 660, 735],
  },
  aluminium: {
    3: [null, 23, 30, 37, 49, 62, 82, 98, 115, 145, 175, 200, 230, 260, 305, 350, 405, 465, 530],
    2: [null, 27, 36, 44, 58, 77, 98, 120, 139, 170, 205, 230, 265, 295, 340, 385, 445, 510, 575],
  },
}

/** Circuit counts tabulated by the grouping tables. */
export const GROUPING_COUNTS = [1, 2, 3, 4, 6, 9, 12, 16, 20]

/**
 * Grouping of several circuits, Table E (UNE 20460-5-523 Table A.52-3).
 * Rows 2 to 5 are only tabulated up to 9 circuits: beyond that the published
 * table states that no additional reduction applies, so the 9-circuit value
 * holds.
 */
export const GROUPING_LAYOUTS = {
  embedded: {
    label: 'Empotrados o embutidos',
    factors: [1, 0.8, 0.7, 0.7, 0.55, 0.5, 0.45, 0.4, 0.4],
    cappedAtNine: false,
  },
  'single-layer-wall': {
    label: 'Capa unica sobre pared, suelo o superficie sin perforar',
    factors: [1, 0.85, 0.8, 0.75, 0.7, 0.7],
    cappedAtNine: true,
  },
  'single-layer-ceiling': {
    label: 'Capa unica fijada bajo techo',
    factors: [0.95, 0.8, 0.7, 0.7, 0.65, 0.6],
    cappedAtNine: true,
  },
  'perforated-tray': {
    label: 'Capa unica en bandeja perforada vertical u horizontal',
    factors: [1, 0.9, 0.8, 0.75, 0.75, 0.7],
    cappedAtNine: true,
  },
  'ladder-tray': {
    label: 'Capa unica con apoyo de bandeja escalera o abrazaderas',
    factors: [1, 0.85, 0.8, 0.8, 0.8, 0.8],
    cappedAtNine: true,
  },
}

/** Additional factor for cables installed in several layers, Table F. */
export const LAYER_FACTORS = [
  { layers: 2, factor: 0.8 },
  { layers: 3, factor: 0.73 },
  { layers: 5, factor: 0.7 },
  { layers: 8, factor: 0.68 },
  { layers: 9, factor: 0.66 },
]

/**
 * Tubes in contact, horizontal, installed in air, Table G.
 * Rows are the number of vertical layers, columns the number of tubes in
 * horizontal, from 1 to 6.
 */
export const TUBES_CONTACT_AIR = [
  [1.0, 0.94, 0.91, 0.88, 0.87, 0.86],
  [0.92, 0.87, 0.84, 0.81, 0.8, 0.79],
  [0.85, 0.81, 0.78, 0.76, 0.75, 0.74],
  [0.82, 0.78, 0.74, 0.73, 0.72, 0.72],
  [0.8, 0.76, 0.72, 0.71, 0.7, 0.7],
  [0.79, 0.75, 0.71, 0.7, 0.69, 0.68],
]

/**
 * Multiconductor cables in buried tubes, one cable per tube, Table H.
 * Columns are the distance between tubes: in contact, 0.25 m, 0.50 m and 1.0 m.
 */
export const BURIED_CABLE_SPACING = {
  spacings: [0, 0.25, 0.5, 1.0],
  factors: {
    2: [0.85, 0.9, 0.95, 0.95],
    3: [0.75, 0.85, 0.9, 0.95],
    4: [0.7, 0.8, 0.85, 0.9],
    5: [0.65, 0.8, 0.85, 0.9],
    6: [0.6, 0.8, 0.8, 0.9],
  },
}

/**
 * Tubes in contact, buried or embedded in concrete, several layers, Table I.
 * Rows are the number of tubes in horizontal (2 to 6), columns the number of
 * vertical layers (1 to 6).
 */
export const TUBES_CONTACT_BURIED = {
  2: [0.87, 0.71, 0.62, 0.57, 0.53, 0.5],
  3: [0.77, 0.62, 0.53, 0.48, 0.45, 0.42],
  4: [0.72, 0.57, 0.48, 0.44, 0.4, 0.38],
  5: [0.68, 0.53, 0.45, 0.4, 0.37, 0.35],
  6: [0.65, 0.5, 0.42, 0.38, 0.35, 0.32],
}

/* ------------------------------------------------------------------------- */
/* ITC-BT-14 and ITC-BT-15 · instalaciones de enlace admissible currents     */
/* ------------------------------------------------------------------------- */

/**
 * These instructions do not send the LGA and DI to the ITC-BT-19 columns alone.
 * They reprint their own tables for the cable families those lines may use, and
 * the two sets disagree: at 10 mm² 3 loaded in air the ITC-BT-19 B1 column gives
 * 54 A while the guide's own table gives 60 A. Where a guide publishes a value
 * it wins, because it is the instruction that governs the line; everywhere else
 * the caller falls back to the ITC-BT-19 tables.
 */

export const SECTIONS_LGA = [10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240]
export const SECTIONS_DI = [6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240]

/**
 * Guía-BT-14 tabla A (copper RZ1-K) and tabla B (aluminium RZ1-Al): unipolar
 * cable, 40 °C ambient, three loaded conductors; buried rows already include the
 * 0.8 factor of ITC-BT-07 §3.1.3 with a 25 °C ground.
 */
export const BT14_AIR_COPPER = [60, 80, 106, 131, 159, 202, 245, 284, 338, 386, 455]
export const BT14_BURIED_COPPER = [77, 100, 128, 152, 184, 224, 268, 304, 340, 384, 440]
export const BT14_AIR_ALUMINIUM = [65, 82, 102, 124, 158, 192, 223, 258, 294, 372]
export const BT14_BURIED_ALUMINIUM = [78, 100, 120, 144, 186, 208, 236, 264, 300, 344]

/**
 * Guía-BT-15 tabla C (ES07Z1-K, 450/750 V), tabla D (RZ1-K unipolar) and tabla E
 * (RZ1-K multiconductor): method B column 8 at 40 °C in air, and ITC-BT-07
 * §3.1.3 at 25 °C buried.
 */
export const BT15_C_SINGLE = [36, 50, 66, 84, 104, null, null, null, null, null, null, null]
export const BT15_C_THREE = [32, 44, 59, 77, 96, 117, 149, 180, 208, 236, 268, 315]
export const BT15_D_AIR_SINGLE = [49, 68, 91, 116, 144, null, null, null, null, null, null, null]
export const BT15_D_AIR_THREE = [44, 60, 80, 106, 131, 159, 202, 245, 284, 338, 386, 455]
export const BT15_D_BURIED_SINGLE = [71, 94, 122, 157, 186, null, null, null, null, null, null, null]
export const BT15_D_BURIED_THREE = [58, 77, 100, 128, 152, 184, 224, 268, 304, 340, 384, 440]
export const BT15_E_AIR_SINGLE = [49, 68, 91, 116, 144, null, null, null, null, null, null, null]
export const BT15_E_AIR_THREE = [44, 60, 80, 106, 131, 159, 202, 245, 284, 338, 386, 455]
export const BT15_E_BURIED_SINGLE = [65, 86, 113, 147, 176, null, null, null, null, null, null, null]
export const BT15_E_BURIED_THREE = [53, 70, 92, 120, 144, 172, 208, 248, 284, 320, 360, 416]

/**
 * ITC-BT-14 tabla 1 · neutral section and tube diameter per phase section, as
 * printed. Two rows are split by material because aluminium has no 10 mm²
 * column: 10 (Cu) and 16 (Al).
 *
 * `LGA_NEUTRAL_SECTION` below is the same table reduced to the copper lookup the
 * calculator uses. Both shapes are kept because the printed one is shown to the
 * user verbatim and the numeric one is consulted; deriving one from the other
 * would rewrite the printed strings.
 */
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

/** ITC-BT-14 tabla 1, copper phase → neutral, for lookup. */
export const LGA_NEUTRAL_SECTION = new Map([
  [10, 10],
  [16, 10],
  [25, 16],
  [35, 16],
  [50, 25],
  [70, 35],
  [95, 50],
  [120, 70],
  [150, 70],
  [185, 95],
  [240, 120],
])

/* ------------------------------------------------------------------------- */
/* ITC-BT-10 · simultaneity and elevator reference powers                    */
/* ------------------------------------------------------------------------- */

/**
 * Simultaneity coefficient for a number of dwellings: index is the dwelling
 * count. Beyond 21 the instruction continues with a linear 0.5 step, which the
 * caller applies.
 */
export const ITC_BT_10_COEFFICIENTS = [
  0, 1, 2, 3, 3.8, 4.6, 5.4, 6.2, 7, 7.8, 8.5,
  9.2, 9.9, 10.6, 11.3, 11.9, 12.5, 13.1, 13.7, 14.3, 14.8, 15.3,
]

/** ITA elevator types from ITC-BT-10, reference motor power in kW. */
export const ITA_POWER_KW = {
  'ITA-1': 4.5,
  'ITA-2': 7.5,
  'ITA-3': 11.5,
  'ITA-4': 18.5,
  'ITA-5': 29.5,
  'ITA-6': 46,
}

/* ------------------------------------------------------------------------- */
/* ITC-BT-25 · dwelling power steps                                          */
/* ------------------------------------------------------------------------- */

/**
 * ITC-BT-25, tabla A — power steps foreseen for a dwelling on a single-phase
 * 230 V supply. The step fixes the rating of the general automatic switch
 * (IGA), so the two columns are read together.
 *
 * Rows: [grado de electrificación, potencia prevista (W), IGA (A)].
 */
export const HOUSING_POWER_STEPS = [
  ['Básica', 5750, 25],
  ['Básica', 7360, 32],
  ['Elevada', 9200, 40],
  ['Elevada', 11500, 50],
  ['Elevada', 14490, 63],
]

/* ------------------------------------------------------------------------- */
/* Reference tables shown in the dialog                                      */
/* ------------------------------------------------------------------------- */

/** Each with the document it comes from, so the viewer can cite it. */
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
