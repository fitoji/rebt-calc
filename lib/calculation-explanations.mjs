/**
 * Structured explanations for the line-sizing engine.
 *
 * This module never recalculates: every number it prints comes from the
 * `sizeLine` result or from the inputs the user already provided. The UI and
 * the PDF consume the same steps, so the explanation cannot drift from the
 * calculation.
 */

const fmt = (value, digits = 2) =>
  new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)

const unit = (value, suffix, digits = 2) =>
  value == null ? '—' : `${fmt(value, digits)} ${suffix}`

const MINIMUM_LABEL = {
  10: '10 mm² (ITC-BT-14)',
  6: '6 mm² (ITC-BT-15)',
}

function inputsStep(state, result, { threePhase }) {
  return {
    id: 'inputs',
    title: 'Datos de partida',
    kind: 'table',
    rows: [
      { label: 'Potencia prevista', value: unit(state.powerW, 'W', 0) },
      { label: threePhase ? 'Tensión entre fases' : 'Tensión fase-neutro', value: unit(state.voltageV, 'V', 0) },
      { label: 'Factor de potencia (cos φ)', value: fmt(state.cosPhi, 2) },
      { label: 'Longitud de la línea', value: unit(state.lengthM, 'm') },
      { label: 'Caída máxima admisible', value: unit(state.maxDropPercent, '%') },
      { label: 'Conductividad (γ)', value: unit(state.gamma, 'm/(Ω·mm²)') },
      { label: 'Método de instalación', value: state.method },
      { label: 'Aislamiento', value: state.insulation },
      { label: 'Circuitos agrupados', value: fmt(state.circuits ?? 1, 0) },
      { label: 'Tipo de instalación', value: state.installation === 'buried' ? 'Enterrada bajo tubo' : 'Al aire' },
      { label: 'Factor de agrupamiento', value: fmt(result.groupingFactor, 2) },
    ],
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

function dropStep(state, result, { threePhase }) {
  const formula = threePhase
    ? 'S = (P · L) / (γ · U · ΔU)'
    : 'S = (2 · P · L) / (γ · U · ΔU)'
  const denominator = `${fmt(state.gamma, 2)} · ${fmt(state.voltageV, 0)} V · ${fmt(result.dropVoltLimit, 2)} V`
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
    note: 'La sección por caída es el mínimo que mantiene la tensión al final de la línea dentro del límite.',
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
    note: 'La intensidad de tabla se corrige por el agrupamiento real de los circuitos.',
  }
}

function reasonFor(candidate, result, state) {
  if (!candidate.meetsMinimum) {
    return `Por debajo del mínimo normativo (${MINIMUM_LABEL[result.minimumSection] ?? `${result.minimumSection} mm²`}).`
  }
  if (!candidate.meetsDrop) {
    return `La caída (${fmt(candidate.dropPercent, 2)} %) supera el máximo (${fmt(state.maxDropPercent, 2)} %).`
  }
  if (!candidate.meetsCurrent) {
    return `La intensidad corregida (${fmt(candidate.correctedCurrent, 0)} A) no alcanza Ib (${fmt(result.ratedCurrent, 2)} A).`
  }
  return 'Cumple los tres criterios: mínimo, caída y corriente.'
}

function selectionStep(state, result) {
  const finalSection = result.finalSection
  const candidates = result.candidates ?? []
  const rows = candidates
    .filter(candidate => finalSection == null || candidate.section <= finalSection)
    .map(candidate => ({
      section: candidate.section,
      tableCurrent: candidate.tableCurrent,
      correctedCurrent: candidate.correctedCurrent,
      dropPercent: candidate.dropPercent,
      status: candidate.section === finalSection ? 'chosen' : 'discarded',
      reason: reasonFor(candidate, result, state),
    }))

  return {
    id: 'selection',
    title: 'Selección de sección',
    kind: 'selection',
    rows,
    result: finalSection == null ? 'Sin sección admisible' : unit(finalSection, 'mm²', 0),
    criterion: finalSection == null
      ? 'Ninguna sección comercial cumple a la vez el mínimo, la caída y la corriente.'
      : 'Se adopta la primera sección comercial que cumple a la vez el mínimo normativo, la caída de tensión y la intensidad admisible corregida.',
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

function referenceStep(line) {
  const text = line === 'di'
    ? 'ITC-BT-15 §3: caída máxima del 0,5 % con contadores concentrados en más de un lugar, del 1 % con contadores totalmente concentrados y del 1,5 % en suministros de un único usuario sin línea general; sección mínima de 6 mm² en cobre y 1,5 mm² para el hilo de mando; intensidad admisible según ITC-BT-19 (UNE 20460-5-523).'
    : 'ITC-BT-14 §3: caída máxima del 0,5 % con contadores totalmente centralizados y del 1 % con centralizaciones parciales; sección mínima de 10 mm² en cobre (16 mm² en aluminio); intensidad admisible según ITC-BT-19 (UNE 20460-5-523).'

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
 * @param {{ system?: 'three-phase' | 'single-phase', line?: 'lga' | 'di' }} [options]
 */
export function explainLineCalculation(state, result, { system = 'three-phase', line = 'lga' } = {}) {
  const threePhase = system === 'three-phase'
  const steps = [
    inputsStep(state, result, { threePhase }),
    currentStep(state, result, { threePhase }),
    dropStep(state, result, { threePhase }),
    thermalStep(result),
    selectionStep(state, result),
    protectionStep(result),
    referenceStep(line),
  ]

  if (result.problems?.length > 0) steps.push(warningsStep(result))

  return {
    title: line === 'di' ? 'Derivación Individual' : 'Línea General de Alimentación',
    line,
    system,
    steps,
  }
}

function housingStep(state, result) {
  const rows = (state.housing ?? []).map((row, index) => ({
    label: `Vivienda ${index + 1} · ${row.level}`,
    value: `${fmt(row.power, 0)} W × ${fmt(row.homes, 0)} = ${fmt(row.power * Math.max(0, row.homes), 0)} W`,
  }))
  if (rows.length === 0) rows.push({ label: 'Viviendas', value: 'Sin viviendas añadidas' })
  rows.push({ label: 'Potencia instalada', value: unit(result.housingPower, 'W', 0) })
  rows.push({ label: 'Total viviendas', value: `${fmt(result.homes, 0)} uds.` })
  rows.push({ label: 'Potencia media', value: unit(result.average, 'W', 0) })
  rows.push({ label: 'Coeficiente de simultaneidad', value: fmt(result.cs, 2) })

  return { id: 'housing', title: 'Viviendas consideradas', kind: 'table', rows }
}

function loadP1Step(result) {
  return {
    id: 'p1',
    title: 'P1 · Viviendas',
    kind: 'formula',
    formula: 'P1 = P_media · Cs(n)',
    substitution: `P_media = ${fmt(result.housingPower, 0)} W / ${fmt(result.homes, 0)} = ${fmt(result.average, 2)} W; Cs(${fmt(result.homes, 0)}) = ${fmt(result.cs, 2)}; P1 = ${fmt(result.average, 2)} W · ${fmt(result.cs, 2)}`,
    result: unit(result.p1, 'W', 0),
    note: 'ITC-BT-10 §3.1: la potencia media por vivienda se multiplica por el coeficiente de simultaneidad de la tabla 1.',
  }
}

function loadP2Step(result, settings) {
  const elevatorContribution = result.elevatorPower * settings.elevatorCoefficient

  return {
    id: 'p2',
    title: 'P2 · Servicios generales',
    kind: 'formula',
    formula: 'P2 = Σ(P_asc · k_asc) + Σ(P_motores) + (k_motor − 1) · P_motor_mayor + Σ(P_otras) + Σ(P_alumbrado)',
    substitution: `Ascensores: ${fmt(result.elevatorPower, 0)} W · ${fmt(settings.elevatorCoefficient, 2)} = ${fmt(elevatorContribution, 0)} W; Motores: ${fmt(result.motorPower, 0)} W; Incremento motor mayor: (${fmt(settings.motorCoefficient, 2)} − 1) · ${fmt(result.largestMotorPower, 0)} W = ${fmt(result.motorIncrement, 0)} W; Otras cargas: ${fmt(result.otherPower, 0)} W; Alumbrado: ${fmt(result.lightingPower, 0)} W`,
    result: unit(result.p2, 'W', 0),
    note: 'ITC-BT-10 §3.2 e ITC-BT-47: los ascensores se mayoran y solo el motor mayor añade el incremento del coeficiente.',
  }
}

function loadRowsStep(id, title, rows, powers) {
  return {
    id,
    title,
    kind: 'table',
    rows: rows.map((row, index) => ({
      label: row.name,
      value: unit(powers[index] ?? 0, 'W', 0),
    })),
  }
}

function loadSumStep(id, title, formula, powers, resultValue, note) {
  return {
    id,
    title,
    kind: 'formula',
    formula,
    substitution: powers.length === 0
      ? 'Sin elementos añadidos.'
      : `${formula.split('=')[0].trim()} = ${powers.map(value => fmt(value, 0)).join(' + ')} W`,
    result: unit(resultValue, 'W', 0),
    note,
  }
}

function loadP5Step(state, result, settings) {
  const option = state.irveOption
  const formula = option === 2 ? 'P5 = plazas · P_cargador · 0,3' : 'P5 = plazas · P_cargador'
  const note = option === 3
    ? 'ITC-BT-10 §5.2 e ITC-BT-52: se toma el 10 % de las plazas construidas y se redondea al alza.'
    : 'ITC-BT-10 §5.2 e ITC-BT-52: la simultaneidad es 1 sin SPL y 0,3 con SPL.'

  return {
    id: 'p5',
    title: 'P5 · Recarga de vehículos eléctricos (IRVE)',
    kind: 'formula',
    formula,
    substitution: `Plazas consideradas = ${fmt(result.plazas, 0)}; P_cargador = ${fmt(settings.evChargerPower, 0)} W; Cs = ${fmt(result.irveCs, 2)}; P5 = ${fmt(result.plazas, 0)} · ${fmt(settings.evChargerPower, 0)} W · ${fmt(result.irveCs, 2)}`,
    result: unit(result.p5, 'W', 0),
    note,
  }
}

function loadTotalStep(result) {
  return {
    id: 'total',
    title: 'Potencia total prevista',
    kind: 'formula',
    formula: 'P_total = P1 + P2 + P3 + P4 + P5',
    substitution: `P_total = ${fmt(result.p1, 0)} + ${fmt(result.p2, 0)} + ${fmt(result.p3, 0)} + ${fmt(result.p4, 0)} + ${fmt(result.p5, 0)} W`,
    result: unit(result.total, 'W', 0),
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
  return {
    title: 'Previsión de cargas',
    steps: [
      housingStep(state, result),
      loadP1Step(result),
      loadP2Step(result, settings),
      loadRowsStep('locals-rows', 'Locales considerados', state.locals ?? [], result.localPowers ?? []),
      loadSumStep('p3', 'P3 · Locales y oficinas', 'P3 = Σ P_local', result.localPowers ?? [], result.p3, 'ITC-BT-10 §3.3: se toma el mayor valor entre previsión real, densidad por superficie y mínimo por abonado.'),
      loadRowsStep('garages-rows', 'Garajes considerados', state.garages ?? [], result.garagePowers ?? []),
      loadSumStep('p4', 'P4 · Garajes', 'P4 = Σ P_garaje', result.garagePowers ?? [], result.p4, 'ITC-BT-10 §3.4: se aplica la densidad según ventilación con un mínimo por garaje.'),
      loadP5Step(state, result, settings),
      loadTotalStep(result),
      loadReferenceStep(),
    ],
  }
}

