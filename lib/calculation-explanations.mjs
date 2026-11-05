/**
 * Structured explanations for the line-sizing engine.
 *
 * This module never recalculates: every number it prints comes from the
 * `sizeLine` result or from the inputs the user already provided. The UI and
 * the PDF consume the same steps, so the explanation cannot drift from the
 * calculation.
 */

const MIN_STEP_TEXT = {
  lga: 'ITC-BT-14 §3: «La sección mínima será de 10 mm2 en cobre o 16 mm2 en aluminio». El mínimo depende del tipo de línea y del material del conductor, no de si el suministro es monofásico o trifásico.',
  di: 'ITC-BT-15 §3: «La sección mínima será de 6 mm2 para los cables polares, neutro y protección y de 1,5 mm2 para el hilo de mando». El mínimo es el mismo en suministros monofásicos y trifásicos.',
}

const fmt = (value, digits = 2) =>
  new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)

const unit = (value, suffix, digits = 2) =>
  value == null ? '—' : `${fmt(value, digits)} ${suffix}`

import { lgaNeutralSection, protectiveSection } from './conductor-sections.mjs'
import { formatPower } from './power-units.mjs'
import { gammaFor, insulationFor } from './line-state.mjs'
import { ASSEMBLY_LABELS, CABINET_LABELS, FLOOR_LABELS } from './meter-center.mjs'
import { limitsForInstallation } from './installation-config.mjs'
import { MAX_POINTS, POINT_CIRCUITS, POINT_CIRCUIT_LABELS, ROOM_LABELS } from './housing-points.mjs'

const MINIMUM_DOC = {
  lga: 'ITC-BT-14 §3',
  di: 'ITC-BT-15 §3',
}

function inputsStep(state, result, { threePhase, line, powerUnit }) {
  const insulation = insulationFor(state, line)
  const gamma = gammaFor(state, line)
  const maxServiceTemperature = insulation === 'XLPE' ? 90 : 70
  const insulationName = insulation === 'XLPE' ? 'termoestable (XLPE/EPR)' : 'termoplástico (PVC)'

  return {
    id: 'inputs',
    title: 'Datos de partida',
    kind: 'table',
    rows: [
      { label: 'Potencia prevista', value: formatPower(state.powerW, powerUnit) },
      { label: threePhase ? 'Tensión entre fases' : 'Tensión fase-neutro', value: unit(state.voltageV, 'V', 0) },
      { label: 'Factor de potencia (cos φ)', value: fmt(state.cosPhi, 2) },
      { label: 'Longitud de la línea', value: unit(state.lengthM, 'm') },
      { label: 'Caída máxima admisible', value: unit(state.maxDropPercent, '%') },
      { label: 'Conductividad (γ)', value: unit(gamma, 'm/(Ω·mm²)') },
      { label: 'Método de instalación', value: state.method },
      { label: 'Aislamiento', value: line === 'lga' ? 'XLPE · RZ1-K' : state.insulation },
      { label: 'Circuitos agrupados', value: fmt(state.circuits ?? 1, 0) },
      { label: 'Tipo de instalación', value: state.installation === 'buried' ? 'Enterrada bajo tubo' : 'Al aire' },
      { label: 'Factor de agrupamiento', value: fmt(result.groupingFactor, 2) },
    ],
    note: `γ = ${fmt(gamma, 2)} m/(Ω·mm²): cobre a ${maxServiceTemperature} °C, la temperatura máxima de servicio del aislamiento ${insulationName}. El anexo 2 de la Guía del REBT pide tomar ese valor y nunca el de 20 °C (56), porque cuanto menor es γ más sección pide el mismo límite de caída y la línea se dimensiona para el caso más desfavorable. La ITC-BT-07 fija las temperaturas máximas de servicio: 70 °C en PVC (48) y 90 °C en XLPE/EPR (44). Las fórmulas de la línea van en vatios: es la unidad con la que están escritas y con la que trabaja el motor.`,
  }
}

function currentStep(state, result, { threePhase }) {
  const formula = threePhase
    ? 'I_b = P / (√3 · U · cos φ)'
    : 'I_b = P / (U · cos φ)'
  const denominator = threePhase
    ? `√3 · ${fmt(state.voltageV, 0)} V · ${fmt(state.cosPhi, 2)}`
    : `${fmt(state.voltageV, 0)} V · ${fmt(state.cosPhi, 2)}`

  return {
    id: 'current',
    title: 'Intensidad de cálculo',
    kind: 'formula',
    formula,
    substitution: `I_b = ${fmt(state.powerW, 0)} W / (${denominator})`,
    result: unit(result.ratedCurrent, 'A'),
    note: 'La intensidad de cálculo es la corriente que la línea debe transportar en servicio normal.',
  }
}

function momentStep(state, result) {
  return {
    id: 'moment',
    title: 'Momento eléctrico',
    kind: 'formula',
    formula: 'M = P(kW) · L',
    substitution: `M = ${fmt(state.powerW / 1000, 2)} kW · ${fmt(state.lengthM, 2)} m`,
    result: unit(result.momentKwM, 'kW·m'),
    note: 'El ELEC-3 pide el momento eléctrico en cada fila de la memoria, porque resume la carga y la longitud en un solo número. En monofásica a 230 V con γ = 48 m/(Ω·mm²) el atajo de la guía es e(%) ≈ 0,0788 · M / S: con el momento y la sección ya se puede comprobar la caída sin rehacer la fórmula.',
  }
}

function dropStep(state, result, { threePhase, line }) {
  const gamma = gammaFor(state, line)
  const formula = threePhase
    ? 'S = (P · L) / (γ · U · ΔU)'
    : 'S = (2 · P · L) / (γ · U · ΔU)'
  const denominator = `${fmt(gamma, 2)} · ${fmt(state.voltageV, 0)} V · ${fmt(result.dropVoltLimit, 2)} V`
  const numerator = threePhase
    ? `${fmt(state.powerW, 0)} W · ${fmt(state.lengthM, 2)} m`
    : `2 · ${fmt(state.powerW, 0)} W · ${fmt(state.lengthM, 2)} m`

  return {
    id: 'drop',
    title: 'Sección por caída de tensión',
    kind: 'formula',
    formula,
    substitution: `ΔU = ${fmt(state.maxDropPercent, 2)} % de ${fmt(state.voltageV, 0)} V = ${fmt(result.dropVoltLimit, 2)} V; S = ${numerator} / (${denominator})`,
    result: unit(result.sectionByDrop, 'mm²'),
    note: 'La sección por caída es el mínimo que mantiene la tensión al final de la línea dentro del límite. La caída que calcula esta tarjeta es la parcial del tramo; el ELEC-3 pide además la total, que suma los tramos aguas arriba (LGA + derivación). La Guía-BT-25 admite compensar tramos: el total puede llegar a la suma de los límites parciales, nunca a más.',
  }
}

function thermalStep(result) {
  return {
    id: 'thermal',
    title: 'Intensidad admisible corregida',
    kind: 'formula',
    formula: 'I_z = I_z,tabla · f_agrupamiento',
    substitution: `I_z = ${result.tableCurrent == null ? '—' : `${fmt(result.tableCurrent, 0)} A`} · ${fmt(result.groupingFactor, 2)}`,
    result: unit(result.correctedCurrent, 'A'),
    note: 'La intensidad de tabla se corrige por el agrupamiento real de los circuitos. La tabla es la de la propia instrucción de la línea (A/B en la LGA, C/D/E en la derivación); si la combinación no está publicada, la ITC-BT-19.',
  }
}

function reasonFor(candidate, result, state, line) {
  if (!candidate.meetsMinimum) {
    return `Por debajo del mínimo normativo (${fmt(result.minimumSection, 0)} mm², ${MINIMUM_DOC[line] ?? 'ITC-BT'}).`
  }
  if (!candidate.meetsDrop) {
    return `La caída (${fmt(candidate.dropPercent, 2)} %) supera el máximo (${fmt(state.maxDropPercent, 2)} %).`
  }
  if (candidate.meetsDropIn === false) {
    return `La caída con In (${fmt(candidate.dropPercentIn, 2)} %) supera el máximo (${fmt(state.maxDropPercent, 2)} %).`
  }
  if (!candidate.meetsCurrent) {
    return `La intensidad corregida (${fmt(candidate.correctedCurrent, 0)} A) no alcanza Ib (${fmt(result.ratedCurrent, 2)} A).`
  }
  if (result.sectionOverride != null && candidate.section !== result.finalSection) {
    return 'Cumple los tres criterios, pero se adoptó la sección fijada para la línea.'
  }
  return 'Cumple los tres criterios: mínimo, caída y corriente.'
}

function selectionStep(state, result, line) {
  const finalSection = result.finalSection
  const candidates = result.candidates ?? []
  const rows = candidates
    .filter(candidate => finalSection == null || candidate.section <= finalSection)
    .map(candidate => ({
      section: candidate.section,
      tableCurrent: candidate.tableCurrent,
      correctedCurrent: candidate.correctedCurrent,
      dropPercent: candidate.dropPercent,
      dropPercentIn: candidate.dropPercentIn ?? null,
      status: candidate.section === finalSection ? 'chosen' : 'discarded',
      reason: reasonFor(candidate, result, state, line),
    }))

  let criterion
  if (finalSection == null) {
    criterion = 'Ninguna sección comercial cumple a la vez el mínimo, la caída y la corriente.'
  } else if (result.sectionOverride != null) {
    criterion = result.autoSection == null
      ? `Se adopta la sección fijada (${fmt(finalSection, 0)} mm²); ninguna sección automática cumplía a la vez el mínimo, la caída y la corriente.`
      : `Se adopta la sección fijada (${fmt(finalSection, 0)} mm²); la menor que cumplía los tres criterios era ${fmt(result.autoSection, 0)} mm².`
  } else {
    criterion = 'Se adopta la primera sección comercial que cumple a la vez el mínimo normativo, la caída de tensión y la intensidad admisible corregida.'
  }

  return {
    id: 'selection',
    title: 'Selección de sección',
    kind: 'selection',
    rows,
    result: finalSection == null ? 'Sin sección admisible' : unit(finalSection, 'mm²', 0),
    criterion,
  }
}

function protectionStep(result) {
  return {
    id: 'protection',
    title: 'Protección',
    kind: 'table',
    rows: [
      { label: 'Intensidad de cálculo (Ib)', value: unit(result.ratedCurrent, 'A') },
      { label: 'Intensidad admisible corregida (Iz)', value: unit(result.correctedCurrent, 'A') },
      {
        label: 'Protección propuesta',
        value: result.suggestedProtection == null ? '—' : unit(result.suggestedProtection.rating, 'A', 0),
      },
      {
        label: 'Protección adoptada',
        value: result.protection == null ? '—' : unit(result.protection, 'A', 0),
      },
    ],
    criterion: 'La protección debe cumplir Ib ≤ In ≤ Iz.',
  }
}

function minimumStep(result, line) {
  return {
    id: 'minimum',
    title: 'Sección mínima normativa',
    kind: 'text',
    text: `${MIN_STEP_TEXT[line]} Se aplica ${fmt(result.minimumSection, 0)} mm².`,
  }
}

function conductorsStep(state, result, line) {
  const phase = result.finalSection
  const section = value => (value == null ? '—' : `${fmt(value, 0)} mm² Cu`)
  const neutral = result.neutralSection ?? (phase == null ? null : (line === 'lga' ? lgaNeutralSection(phase) : phase))
  const protective = result.protectiveSection ?? (phase == null ? null : protectiveSection(phase))
  const tube = state.tubeDiameter == null || state.tubeDiameter <= 0
    ? '—'
    : `${fmt(state.tubeDiameter, 0)} mm${result.minimumTube == null ? '' : ` · mínimo de tabla ${fmt(result.minimumTube, 0)} mm`}`

  const rows = [
    { label: line === 'di' ? 'Fase' : 'Fase (R, S, T)', value: line === 'di' ? section(phase) : (phase == null ? '—' : `3 x ${fmt(phase, 0)} mm² Cu`) },
    { label: 'Neutro', value: section(neutral) },
    { label: 'Protección (PE)', value: section(protective) },
    ...(line === 'di' ? [{ label: 'Hilo de mando', value: '1,5 mm² Cu' }] : []),
    { label: 'Designación', value: result.cableType ?? '—' },
    { label: 'Tubo protector', value: tube },
  ]

  return {
    id: 'conductors',
    title: 'Conductores y canalización de la línea',
    kind: 'table',
    rows,
    note: line === 'di'
      ? 'ITC-BT-15 §3: el neutro tiene la misma sección que la fase, el hilo de mando 1,5 mm² y el conductor de protección sale de la tabla 2 de la ITC-BT-18. La designación la fija la instalación: ES07Z1-K 450/750 V bajo tubo y RZ1-K 0,6/1 kV enterrada, que es el multiconductor de la tabla E. El diámetro del tubo lo fija la tabla F de la guía.'
      : 'ITC-BT-14 tabla 1: el neutro es aproximadamente el 50 % de la fase y nunca inferior a la tabla (10→10, 16→10, 25→16, 50→25, 120→70, 240→120); el conductor de protección sale de la tabla 2 de la ITC-BT-18; la designación es RZ1-K 0,6/1 kV porque la instrucción no admite otra; y el tubo tiene mínimo de tabla (10→75 mm, 50→125, 70→140, 240→200).',
  }
}

function protectionDropStep(state, result, { threePhase, line }) {
  const gamma = gammaFor(state, line)
  const factor = threePhase ? '√3' : '2'
  const fixed = (state.protectionA ?? 0) > 0

  return {
    id: 'protection-drop',
    title: 'Caída con la protección (In)',
    kind: 'formula',
    formula: `e(%) = (${factor} · I_n · L · cos φ · 100) / (γ · S · U)`,
    substitution: `I_n = ${unit(result.protection, 'A', 0)}; L = ${fmt(state.lengthM, 2)} m; cos φ = ${fmt(state.cosPhi, 2)}; S = ${unit(result.finalSection, 'mm²', 0)}; γ = ${fmt(gamma, 2)}; U = ${fmt(state.voltageV, 0)} V`,
    result: result.dropPercentIn == null ? '—' : `${fmt(result.dropPercentIn, 2)} %`,
    criterion: fixed
      ? 'La protección está fijada: esta caída decide la sección, no la de la carga.'
      : 'La protección la propone el cálculo: esta caída se informa y no cambia la sección.',
    note: 'Guía-BT-25 ap. 3: la caída de un tramo se comprueba con la intensidad nominal del dispositivo de protección (M = 230 · In · L), no con la de la carga. Es el error que más se repite al rellenar el ELEC-3: una sección puede cumplir con Ib y no cumplir con In.',
  }
}

function housingSupplyStep(result) {
  return {
    id: 'housing-iga',
    title: 'Potencia máxima admisible de la vivienda',
    kind: 'formula',
    formula: 'P_máx = U · I_GA',
    substitution: `I_GA = ${fmt(result.housingIga, 0)} A; U = 230 V`,
    result: unit(result.maxAdmissiblePowerW, 'W', 0),
    note: 'ITC-BT-25 tabla A: la potencia prevista de la vivienda fija el calibre del IGA (5 750 W→25 A, 7 360→32, 9 200→40, 11 500→50, 14 490→63). El IGA no es el ICP: marca el límite de diseño de la instalación, no la potencia contratada. Si la potencia prevista lo supera, la tarjeta lo avisa.',
  }
}

function referenceStep(line) {
  const text = line === 'di'
    ? 'ITC-BT-15 §3: caída máxima del 0,5 % con contadores concentrados en más de un lugar, del 1 % con contadores totalmente concentrados y del 1,5 % en suministros de un único usuario sin línea general; sección mínima de 6 mm² en cobre y 1,5 mm² para el hilo de mando. La intensidad admisible se lee en las tablas C (ES07Z1-K), D (RZ1-K unipolar) y E (multiconductor, el que la instrucción pide en enterrado) de la propia ITC-BT-15; si la combinación no está publicada, en la ITC-BT-19.'
    : 'ITC-BT-14 §3: caída máxima del 0,5 % con contadores totalmente centralizados y del 1 % con centralizaciones parciales; sección mínima de 10 mm² en cobre (16 mm² en aluminio). La LGA se dimensiona con cable unipolar RZ1-K o DZ1-K (XLPE, 0,6/1 kV) porque la instrucción no admite otro aislamiento, y su intensidad admisible se lee en la tabla A (cobre) o B (aluminio) de la propia ITC-BT-14, cuyas filas enterradas ya incluyen el factor 0,8 de la ITC-BT-07; si la combinación no está publicada, en la ITC-BT-19.'

  return {
    id: 'reference',
    title: 'Referencia normativa',
    kind: 'text',
    text,
  }
}

function warningsStep(result) {
  return {
    id: 'warnings',
    title: 'Advertencias',
    kind: 'list',
    items: result.problems,
  }
}

/**
 * @param {object} state line inputs (LineState)
 * @param {object} result output of sizeLine
 * @param {{ system?: 'three-phase' | 'single-phase', line?: 'lga' | 'di', powerUnit?: 'W' | 'kW' }} [options]
 */
export function explainLineCalculation(state, result, { system = 'three-phase', line = 'lga', powerUnit = 'W' } = {}) {
  const threePhase = system === 'three-phase'
  const steps = [
    inputsStep(state, result, { threePhase, line, powerUnit }),
    currentStep(state, result, { threePhase }),
    momentStep(state, result),
    dropStep(state, result, { threePhase, line }),
    thermalStep(result),
    minimumStep(result, line),
    selectionStep(state, result, line),
    conductorsStep(state, result, line),
    protectionStep(result),
    protectionDropStep(state, result, { threePhase, line }),
  ]

  if (result.housingIga != null) steps.push(housingSupplyStep(result))
  steps.push(referenceStep(line))
  if (result.problems?.length > 0) steps.push(warningsStep(result))

  return {
    title: line === 'di' ? 'Derivación Individual' : 'Línea General de Alimentación',
    line,
    system,
    steps,
  }
}

function housingStep(state, result, unit) {
  const rows = (state.housing ?? []).map((row, index) => ({
    label: `Vivienda ${index + 1} · ${row.level}${row.area ? ` · ${fmt(row.area, 0)} m²/viv.` : ''}`,
    value: `${formatPower(row.power, unit)} × ${fmt(row.homes, 0)} = ${formatPower(row.power * Math.max(0, row.homes), unit)}`,
  }))
  if (rows.length === 0) rows.push({ label: 'Viviendas', value: 'Sin viviendas añadidas' })
  rows.push({ label: 'Potencia instalada', value: formatPower(result.housingPower, unit) })
  rows.push({ label: 'Total viviendas', value: `${fmt(result.homes, 0)} uds.` })
  rows.push({ label: 'Potencia media', value: formatPower(result.average, unit) })
  rows.push({ label: 'Coeficiente de simultaneidad', value: fmt(result.cs, 2) })

  return { id: 'housing', title: 'Viviendas consideradas', kind: 'table', rows }
}

function loadP1Step(result, unit) {
  return {
    id: 'p1',
    title: 'P1 · Viviendas',
    kind: 'formula',
    formula: 'P1 = P_media · Cs(n)',
    substitution: `P_media = ${formatPower(result.housingPower, unit)} / ${fmt(result.homes, 0)} = ${formatPower(result.average, unit)}; Cs(${fmt(result.homes, 0)}) = ${fmt(result.cs, 2)}; P1 = ${formatPower(result.average, unit)} · ${fmt(result.cs, 2)}`,
    result: formatPower(result.p1, unit),
    note: 'ITC-BT-10 §3.1: la potencia media por vivienda se multiplica por el coeficiente de simultaneidad de la tabla 1.',
  }
}

function loadP2Step(result, settings, unit) {
  const elevatorContribution = result.elevatorPower * settings.elevatorCoefficient

  return {
    id: 'p2',
    title: 'P2 · Servicios generales',
    kind: 'formula',
    formula: 'P2 = Σ(P_asc · k_asc) + Σ(P_motores) + (k_motor − 1) · P_motor_mayor + Σ(P_otras) + Σ(P_alumbrado)',
    substitution: `Ascensores: ${formatPower(result.elevatorPower, unit)} · ${fmt(settings.elevatorCoefficient, 2)} = ${formatPower(elevatorContribution, unit)}; Motores: ${formatPower(result.motorPower, unit)}; Incremento motor mayor: (${fmt(settings.motorCoefficient, 2)} − 1) · ${formatPower(result.largestMotorPower, unit)} = ${formatPower(result.motorIncrement, unit)}; Otras cargas: ${formatPower(result.otherPower, unit)}; Alumbrado: ${formatPower(result.lightingPower, unit)}`,
    result: formatPower(result.p2, unit),
    note: 'ITC-BT-10 §3.2 e ITC-BT-47: los ascensores se mayoran y solo el motor mayor añade el incremento del coeficiente.',
  }
}

function loadRowsStep(id, title, rows, powers, unit) {
  return {
    id,
    title,
    kind: 'table',
    rows: rows.map((row, index) => ({
      label: row.name,
      value: formatPower(powers[index] ?? 0, unit),
    })),
  }
}

function loadSumStep(id, title, formula, powers, resultValue, note, unit) {
  return {
    id,
    title,
    kind: 'formula',
    formula,
    substitution: powers.length === 0
      ? 'Sin elementos añadidos.'
      : `${formula.split('=')[0].trim()} = ${powers.map(value => formatPower(value, unit)).join(' + ')}`,
    result: formatPower(resultValue, unit),
    note,
  }
}

function loadP5Step(state, result, settings, unit) {
  const option = state.irveOption
  const formula = option === 2 ? 'P5 = plazas · P_cargador · 0,3' : 'P5 = plazas · P_cargador'
  const note = option === 3
    ? 'Guía-BT-52, Anexo 2: se toma el 10 % de las plazas construidas, valor mínimo reglamentario, y se redondea al alza.'
    : 'Guía-BT-52, Anexo 2 e ITC-BT-52: la simultaneidad es 1 sin SPL y 0,3 con SPL.'

  return {
    id: 'p5',
    title: 'P5 · Recarga de vehículos eléctricos (IRVE)',
    kind: 'formula',
    formula,
    substitution: `Plazas consideradas = ${fmt(result.plazas, 0)}; P_cargador = ${formatPower(settings.evChargerPower, unit)}; Cs = ${fmt(result.irveCs, 2)}; P5 = ${fmt(result.plazas, 0)} · ${formatPower(settings.evChargerPower, unit)} · ${fmt(result.irveCs, 2)}`,
    result: formatPower(result.p5, unit),
    note,
  }
}

function loadTotalStep(result, unit) {
  return {
    id: 'total',
    title: 'Potencia total prevista',
    kind: 'formula',
    formula: 'P_total = P1 + P2 + P3 + P4 + P5',
    substitution: `P_total = ${[result.p1, result.p2, result.p3, result.p4, result.p5].map(value => formatPower(value, unit)).join(' + ')}`,
    result: formatPower(result.total, unit),
    note: 'La potencia total prevista es la suma de las cinco previsiones parciales.',
  }
}

function loadReferenceStep() {
  return {
    id: 'reference',
    title: 'Referencia normativa',
    kind: 'text',
    text: 'ITC-BT-10 (previsión de cargas), ITC-BT-47 (motores) e ITC-BT-52 (infraestructura para la recarga de vehículos eléctricos).',
  }
}

/**
 * @param {object} state load-forecast inputs
 * @param {object} result output of the load memo
 * @param {object} settings calculation settings
 */
export function explainLoadForecast(state, result, settings) {
  const unit = settings.powerUnit ?? 'W'

  return {
    title: 'Previsión de cargas',
    steps: [
      housingStep(state, result, unit),
      loadP1Step(result, unit),
      loadP2Step(result, settings, unit),
      loadRowsStep('locals-rows', 'Locales considerados', state.locals ?? [], result.localPowers ?? [], unit),
      loadSumStep('p3', 'P3 · Locales y oficinas', 'P3 = Σ P_local', result.localPowers ?? [], result.p3, 'ITC-BT-10 §3.3: se toma el mayor valor entre previsión real, densidad por superficie y mínimo por abonado.', unit),
      loadRowsStep('garages-rows', 'Garajes considerados', state.garages ?? [], result.garagePowers ?? [], unit),
      loadSumStep('p4', 'P4 · Garajes', 'P4 = Σ P_garaje', result.garagePowers ?? [], result.p4, 'ITC-BT-10 §3.4: se aplica la densidad según ventilación con un mínimo por garaje.', unit),
      loadP5Step(state, result, settings, unit),
      loadTotalStep(result, unit),
      loadReferenceStep(),
    ],
  }
}


const SCENARIO_NAMES = {
  centralized: 'Contadores totalmente centralizados',
  partial: 'Contadores en más de un lugar',
  'single-user': 'Único usuario sin LGA',
}

/**
 * Didactic walkthrough of the meter centre, ITC-BT-16.
 *
 * Like the line explanations, it never recalculates: the numbers come from the
 * centre the user chose and from `evaluateMeterCenter`.
 *
 * @param {import('./meter-center.mjs').MeterCenter} center
 * @param {ReturnType<typeof import('./meter-center.mjs').evaluateMeterCenter>} evaluation
 * @returns {{ title: string, steps: Array<{ id: string, title: string, kind: 'table' | 'text' | 'list', rows?: Array<{ label: string, value: string }>, note?: string, text?: string, items?: string[] }> }}
 */
export function explainMeterCenter(center, evaluation) {
  const limits = limitsForInstallation(evaluation.installationType)
  const assemblyName = ASSEMBLY_LABELS[center.assembly] ?? center.assembly
  const cabinetName = center.assembly === 'armario' ? CABINET_LABELS[center.cabinet] : null
  const units = [
    center.hasMando ? 'Mando' : null,
    center.hasTelecom ? 'Telecomunicaciones' : null,
  ].filter(Boolean).join(' · ') || 'Ninguna adicional'

  const scenarioText = limits.lga == null
    ? `La colocación individual fija el supuesto «${SCENARIO_NAMES[evaluation.installationType]}»: no hay LGA y la DI admite un ${limits.di} % de caída (ITC-BT-15 §3).`
    : `La colocación y el número de concentraciones fijan el supuesto «${SCENARIO_NAMES[evaluation.installationType]}»: la LGA admite un ${limits.lga} % de caída (ITC-BT-14 §3) y la DI un ${limits.di} % (ITC-BT-15 §3).`

  const checkItems = [
    ...evaluation.problems,
    ...(evaluation.problems.length === 0 ? ['La combinación elegida no tiene incompatibilidades en la ITC-BT-16.'] : []),
    `Interruptor general de maniobra: ${evaluation.mainSwitch.required ? (evaluation.mainSwitch.amps == null ? 'obligatorio y fuera de la tabla tabulada (más de 150 kW)' : `obligatorio, ${evaluation.mainSwitch.amps} A para esta potencia`) : 'no obligatorio con dos usuarios o menos'}.`,
    ...evaluation.notes,
  ]

  return {
    title: 'Formas de contadores',
    steps: [
      {
        id: 'meter-inputs',
        title: 'Datos de la centralización',
        kind: 'table',
        rows: [
          { label: 'Forma de colocación', value: center.placement === 'individual' ? 'Individual' : `Concentrada en ${center.concentrations} ${center.concentrations === 1 ? 'lugar' : 'lugares'}` },
          { label: 'Conjunto de medida', value: assemblyName },
          ...(cabinetName == null ? [] : [{ label: 'Tipo de armario', value: cabinetName }]),
          { label: 'Contadores', value: `${Math.max(0, Math.round(center.meters ?? 0))} uds.` },
          { label: 'Contadores por concentración', value: `${Math.ceil(Math.max(0, Math.round(center.meters ?? 0)) / Math.max(1, center.concentrations))} uds.` },
          { label: 'Planta', value: FLOOR_LABELS[center.floor] ?? center.floor },
          { label: 'Plantas del edificio', value: `${center.buildingFloors}` },
          { label: 'Tipo de local', value: center.exterior ? 'Exterior · IP43 · IK09' : 'Interior · IP40 · IK09' },
          { label: 'Unidades funcionales', value: units },
        ],
        note: 'La centralización no cambia la potencia prevista: cambia dónde se mide y qué caída se exige a la LGA y a la derivación individual.',
      },
      {
        id: 'meter-scenario',
        title: 'Supuesto de enlace que se deriva',
        kind: 'text',
        text: scenarioText,
      },
      {
        id: 'meter-checks',
        title: 'Comprobaciones de la ITC-BT-16',
        kind: 'list',
        items: checkItems,
      },
      {
        id: 'meter-requirements',
        title: 'Requisitos del cuarto',
        kind: 'list',
        items: evaluation.requirements,
      },
    ],
  }
}

/**
 * Didactic walkthrough of the dwelling interior installation (DGMP).
 *
 * @param {{ igaA: number | null, powerW: number, contractedPowerW: number, circuits: number, hasSurge: boolean }} state
 * @param {{ maxPowerW: number | null, icpCurrentA: number | null, differentials: number, sensitivityMa: number, problems: string[], requirements: string[] }} evaluation
 * @param {{ grade?: string }} [meta]
 */
export function explainInterior(state, evaluation, meta = {}) {
  const iga = evaluation.igaA == null ? '—' : `${evaluation.igaA} A`
  return {
    title: 'Instalaciones interiores',
    steps: [
      {
        id: 'interior-inputs',
        title: 'Datos del cuadro de la vivienda',
        kind: 'table',
        rows: [
          { label: 'Electrificación', value: meta.grade === 'elevated' ? 'Elevada' : 'Básica' },
          { label: 'Potencia prevista', value: `${fmt(state.powerW, 0)} W` },
          { label: 'IGA', value: iga },
          { label: 'Potencia contratada', value: state.contractedPowerW > 0 ? `${fmt(state.contractedPowerW, 0)} W` : 'Sin definir' },
          { label: 'Circuitos instalados', value: `${fmt(state.circuits, 0)}` },
          { label: 'Sobretensiones', value: state.hasSurge ? 'Sí' : 'No' },
        ],
      },
      {
        id: 'interior-power',
        title: 'Potencia máxima admisible del IGA',
        kind: 'formula',
        formula: 'P_máx = 230 · IGA',
        substitution: `P_máx = 230 · ${evaluation.igaA ?? 0} A`,
        result: evaluation.maxPowerW == null ? '—' : `${fmt(evaluation.maxPowerW, 0)} W`,
        note: 'El IGA del escalón fija el límite de diseño de la vivienda; no es la potencia contratada.',
      },
      {
        id: 'interior-icp',
        title: 'Intensidad que implica la potencia contratada',
        kind: 'formula',
        formula: 'I_ICP = P_contratada / 230',
        substitution: evaluation.icpCurrentA == null ? 'Sin potencia contratada' : `I_ICP = ${fmt(state.contractedPowerW, 0)} W / 230 V`,
        result: evaluation.icpCurrentA == null ? '—' : `${fmt(evaluation.icpCurrentA, 2)} A`,
        note: 'El calibre del ICP lo fija la distribuidora en envolvente precintable (ITC-BT-17); este número es la intensidad que implica la potencia contratada.',
      },
      {
        id: 'interior-differential',
        title: 'Diferenciales exigidos',
        kind: 'text',
        text: `${evaluation.differentials} interruptor${evaluation.differentials === 1 ? '' : 'es'} diferencial${evaluation.differentials === 1 ? '' : 'es'} de ${evaluation.sensitivityMa} mA, con intensidad asignada igual o superior a la del IGA: uno por cada cinco circuitos instalados (ITC-BT-25 §2.1).`,
      },
      {
        id: 'interior-checks',
        title: 'Comprobaciones',
        kind: 'list',
        items: evaluation.problems.length > 0 ? evaluation.problems : ['La potencia prevista y la contratada no superan la máxima admisible del IGA.'],
      },
      {
        id: 'interior-requirements',
        title: 'Requisitos del DGMP',
        kind: 'list',
        items: evaluation.requirements,
      },
    ],
  }
}

/**
 * Didactic walkthrough of the dwelling rooms and their minimum points.
 *
 * @param {Array<{ type: string, area: number, length: number }>} rooms
 * @param {{ totals: Record<string, number>, requiredCircuits: Record<string, number>, totalPoints: number }} points
 * @param {{ hasHeating?: boolean, hasCooling?: boolean, hasDryer?: boolean, hasIrve?: boolean }} flags
 */
export function explainHousingPoints(rooms, points, flags = {}) {
  const roomRows = rooms.map(room => ({
    label: ROOM_LABELS[room.type] ?? room.type,
    value: `${fmt(room.area, 1)} m² · ${fmt(room.length, 1)} m`,
  }))
  const totals = POINT_CIRCUITS.filter(circuit => points.totals[circuit] > 0).map(circuit => ({
    label: `${circuit} · ${POINT_CIRCUIT_LABELS[circuit]}`,
    value: `${points.totals[circuit]} puntos${MAX_POINTS[circuit] == null ? ' (sin tope de puntos)' : ` · ${points.requiredCircuits[circuit]} circuito(s)`}`,
  }))
  const systems = [flags.hasHeating ? 'calefacción eléctrica' : null, flags.hasCooling ? 'aire acondicionado' : null, flags.hasDryer ? 'secadora' : null].filter(Boolean)

  return {
    title: 'Puntos de utilización',
    steps: [
      { id: 'rooms', title: 'Estancias consideradas', kind: 'table', rows: roomRows.length > 0 ? roomRows : [{ label: 'Sin estancias', value: 'Cargá salón, cocina, baños y dormitorios' }] },
      {
        id: 'points-formula',
        title: 'Puntos mínimos',
        kind: 'formula',
        formula: 'Puntos = Σ mínimos de la tabla 2 por estancia',
        substitution: `${rooms.length} estancia(s)${systems.length > 0 ? ` · ${systems.join(' · ')}` : ''}`,
        result: `${points.totalPoints} puntos`,
        note: 'La tabla 2 de la ITC-BT-25 fija los mínimos por estancia según superficie o longitud; C8, C9 y C10 solo se cuentan si la vivienda los prevé.',
      },
      { id: 'points-totals', title: 'Totales por circuito', kind: 'table', rows: totals.length > 0 ? totals : [{ label: 'Sin puntos', value: '—' }] },
      {
        id: 'points-rules',
        title: 'Criterios aplicados',
        kind: 'list',
        items: [
          'Salón y dormitorios: un punto de luz, dos si la superficie supera 10 m²; tomas de uso general, tres como mínimo más una por cada 6 m².',
          'Cocina: dos tomas de uso general, una de cocina y horno, tres de lavadora/lavavajillas/termo y tres de baño/cuarto de cocina.',
          'Baño: un punto de luz y una toma de baño. Pasillo: un punto de luz cada 5 m y dos tomas si supera 5 m.',
          'C8 y C9 no tienen máximo de puntos en la tabla 1: se limitan por potencia (5.750 W por circuito).',
        ],
      },
    ],
  }
}

/**
 * Didactic walkthrough of a non-dwelling interior board.
 *
 * @param {{ label: string, system: string, powerW: number }} supply
 * @param {{ totalPowerW: number, ib: number, switchA: number | null, supplyIb: number, supplySwitchA: number | null, supplyMaxPowerW: number | null, sensitivityMa: number }} board
 * @param {Array<{ description: string, use: string, powerW: number, lengthM: number }>} circuits
 * @param {(circuit: object) => { section: number | null, protection: number | null, dropPercent: number | null }} size
 */
export function explainInteriorCircuits(supply, board, circuits, size) {
  const factor = supply.system === 'three-phase' ? '√3' : '1'
  return {
    title: 'Cuadro interior del suministro',
    steps: [
      {
        id: 'board-inputs',
        title: 'Datos del suministro',
        kind: 'table',
        rows: [
          { label: 'Suministro', value: supply.label },
          { label: 'Sistema', value: supply.system === 'three-phase' ? 'Trifásico' : 'Monofásico' },
          { label: 'Potencia prevista', value: `${fmt(supply.powerW, 0)} W` },
          { label: 'IGA del suministro', value: board.supplySwitchA == null ? '—' : `${board.supplySwitchA} A` },
          { label: 'Potencia máxima con ese IGA', value: board.supplyMaxPowerW == null ? '—' : `${fmt(board.supplyMaxPowerW, 0)} W` },
        ],
      },
      {
        id: 'board-current',
        title: 'Intensidad de cálculo del cuadro',
        kind: 'formula',
        formula: 'Ib = ΣP / (k · U)',
        substitution: `Ib = ${fmt(board.totalPowerW, 0)} W / (${factor} · ${supply.system === 'three-phase' ? 400 : 230} V)`,
        result: `${fmt(board.ib, 2)} A`,
        note: 'El interruptor general del cuadro se elige por la intensidad del conjunto de circuitos, no por el escalón de una vivienda.',
      },
      {
        id: 'board-switch',
        title: 'Interruptor general y diferencial',
        kind: 'text',
        text: `Interruptor general propuesto: ${board.switchA == null ? 'fuera de la serie' : `${board.switchA} A`}. Protección contra contactos indirectos: ${board.sensitivityMa} mA (ITC-BT-24).`,
      },
      {
        id: 'board-circuits',
        title: 'Circuitos del cuadro',
        kind: 'table',
        rows: circuits.length === 0
          ? [{ label: 'Sin circuitos', value: 'Agregá las cargas del local o de los servicios generales' }]
          : circuits.map(circuit => {
            const result = size(circuit)
            return {
              label: `${circuit.description || 'Circuito'} · ${circuit.use}`,
              value: `${fmt(circuit.powerW, 0)} W · ${fmt(circuit.lengthM, 1)} m · ${result.section == null ? '—' : `${result.section} mm²`} · ${result.protection == null ? '—' : `${result.protection} A`} · ${result.dropPercent == null ? '—' : `${fmt(result.dropPercent, 2)} %`}`,
            }
          }),
      },
      {
        id: 'board-rules',
        title: 'Criterios aplicados',
        kind: 'list',
        items: [
          'Caída máxima del 3 % en alumbrado y 5 % en los demás usos desde el origen de la instalación interior (ITC-BT-19 §2.2.2).',
          'Cada circuito verifica Ib ≤ In ≤ Iz (ITC-BT-22).',
          'La protección contra contactos indirectos se resuelve con diferencial de 30 mA (ITC-BT-24).',
        ],
      },
    ],
  }
}
