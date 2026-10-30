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
