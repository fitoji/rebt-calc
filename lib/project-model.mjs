/**
 * Project-wide calculation: one load forecast, one LGA and a list of
 * individual derivations.
 *
 * The LGA is sized from the forecast total (which already carries the
 * building simultaneity). Each derivation is sized from its own installed
 * power, never from the building total. The sum of derivations may exceed the
 * LGA; that is expected and is reported as information, not as an error.
 */

import { sizeLine } from './line-sizing.mjs'
import { lineInputFromState } from './line-state.mjs'

function createDerivation({ id, kind, label, sourceKey, system, powerW, defaults }) {
  return {
    id,
    kind,
    label,
    sourceKey,
    system,
    powerW,
    voltageV: system === 'three-phase' ? 400 : 230,
    cosPhi: defaults.cosPhi,
    lengthM: defaults.lengthM,
    maxDropPercent: defaults.maxDropPercent,
    gamma: defaults.gamma,
    method: defaults.method,
    insulation: defaults.insulation,
    circuits: 1,
    protectionA: 0,
    neutralSection: defaults.neutralSection,
    peSection: defaults.peSection,
    controlSection: defaults.controlSection,
    tubeDiameter: defaults.tubeDiameter,
    installation: defaults.installation,
    layout: defaults.layout,
    layers: defaults.layers,
    tubes: defaults.tubes,
  }
}

/**
 * Build one derivation per consumer from the load forecast.
 *
 * @param {object} load load forecast inputs (housing, locals, garages, ...)
 * @param {object} loadResult output of the load memo (p2, p5, localPowers, ...)
 * @param {object} defaults line inputs used for every generated derivation (usually the current DI state)
 */
export function buildDerivations(load, loadResult, defaults) {
  const derivations = []
  let dwellingNumber = 0

  for (const [rowIndex, row] of (load.housing ?? []).entries()) {
    const units = Math.max(0, Math.round(row.homes))
    for (let unit = 0; unit < units; unit += 1) {
      dwellingNumber += 1
      derivations.push(createDerivation({
        id: `dwelling-${rowIndex}-${unit}`,
        kind: 'dwelling',
        label: `Vivienda ${dwellingNumber}`,
        sourceKey: `housing:${rowIndex}`,
        system: 'single-phase',
        powerW: row.power,
        defaults,
      }))
    }
  }

  for (const [index, row] of (load.locals ?? []).entries()) {
    derivations.push(createDerivation({
      id: `local-${index}`,
      kind: 'local',
      label: row.name,
      sourceKey: `local:${index}`,
      system: row.type === 'Industria' ? 'three-phase' : 'single-phase',
      powerW: loadResult.localPowers?.[index] ?? 0,
      defaults,
    }))
  }

  derivations.push(createDerivation({
    id: 'common-services',
    kind: 'common-services',
    label: 'Servicios generales',
    sourceKey: 'common-services',
    system: 'three-phase',
    powerW: loadResult.p2 ?? 0,
    defaults,
  }))

  for (const [index, row] of (load.garages ?? []).entries()) {
    derivations.push(createDerivation({
      id: `garage-${index}`,
      kind: 'garage',
      label: row.name,
      sourceKey: `garage:${index}`,
      system: 'single-phase',
      powerW: loadResult.garagePowers?.[index] ?? 0,
      defaults,
    }))
  }

  derivations.push(createDerivation({
    id: 'irve',
    kind: 'irve',
    label: 'Recarga de vehículos eléctricos',
    sourceKey: 'irve',
    system: 'three-phase',
    powerW: loadResult.p5 ?? 0,
    defaults,
  }))

  return derivations
}

/**
 * @param {{ loadTotal: number, lga: object, lgaPowerMode?: 'auto' | 'manual', derivations?: object[] }} project
 */
export function calculateProject({ loadTotal, lga, lgaPowerMode = 'auto', derivations = [] }) {
  const lgaState = {
    ...lga,
    powerW: lgaPowerMode === 'manual' ? lga.powerW : loadTotal,
  }
  const lgaResult = sizeLine(lineInputFromState(lgaState, 'three-phase'))
  const calculatedDerivations = derivations.map(derivation => ({
    ...derivation,
    result: sizeLine(lineInputFromState(derivation, derivation.system)),
  }))

  return {
    lga: { ...lgaState, result: lgaResult },
    derivations: calculatedDerivations,
    summary: buildProjectSummary({ loadTotal, lgaResult, derivations: calculatedDerivations }),
  }
}

function sourceIndex(sourceKey, prefix) {
  if (!sourceKey?.startsWith(`${prefix}:`)) return null
  const index = Number(sourceKey.slice(prefix.length + 1))
  return Number.isInteger(index) ? index : null
}

/**
 * Refresh the generated powers when the load forecast changes.
 * Custom derivations are left untouched.
 */
export function syncDerivationPowers(derivations, load, loadResult) {
  let changed = false
  const next = derivations.map(derivation => {
    let powerW = derivation.powerW
    let system = derivation.system
    let voltageV = derivation.voltageV

    if (derivation.sourceKey?.startsWith('housing:')) {
      const index = sourceIndex(derivation.sourceKey, 'housing')
      const row = load.housing?.[index]
      if (row) powerW = row.power
    } else if (derivation.sourceKey?.startsWith('local:')) {
      const index = sourceIndex(derivation.sourceKey, 'local')
      const row = load.locals?.[index]
      if (row) {
        system = row.type === 'Industria' ? 'three-phase' : 'single-phase'
        voltageV = system === 'three-phase' ? 400 : 230
      }
      if (index != null) powerW = loadResult.localPowers?.[index] ?? powerW
    } else if (derivation.sourceKey === 'common-services') {
      powerW = loadResult.p2 ?? powerW
    } else if (derivation.sourceKey?.startsWith('garage:')) {
      const index = sourceIndex(derivation.sourceKey, 'garage')
      if (index != null) powerW = loadResult.garagePowers?.[index] ?? powerW
    } else if (derivation.sourceKey === 'irve') {
      powerW = loadResult.p5 ?? powerW
    }

    if (powerW === derivation.powerW && system === derivation.system && voltageV === derivation.voltageV) return derivation
    changed = true
    return { ...derivation, powerW, system, voltageV }
  })

  return changed ? next : derivations
}

export function buildProjectSummary({ loadTotal, lgaResult, derivations }) {
  const derivationPower = derivations.reduce((sum, derivation) => sum + Math.max(0, derivation.powerW), 0)
  const largestProtection = derivations.reduce(
    (max, derivation) => Math.max(max, derivation.result?.protection ?? 0),
    0,
  )
  const warnings = []

  if (derivations.length === 0) {
    warnings.push('No hay derivaciones individuales generadas.')
  }
  if (lgaResult?.protection != null && largestProtection > lgaResult.protection) {
    warnings.push(`La protección de la LGA (${lgaResult.protection} A) es menor que la protección de la DI mayor (${largestProtection} A).`)
  }

  return {
    loadTotal,
    lgaSection: lgaResult?.finalSection ?? null,
    derivationCount: derivations.length,
    derivationPower,
    warnings,
  }
}
