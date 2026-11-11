import { NORMATIVE_REGISTRY } from './normative-tables.mjs'

const number = value => new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(value)

/** Build the housing-power hint from the same values used by the calculator. */
export function housingPowerHelp() {
  const entry = NORMATIVE_REGISTRY['housing.power']
  const grades = new Map()
  for (const [grade, watts, amps] of entry.values.steps) {
    const steps = grades.get(grade) ?? []
    steps.push(`${number(watts)} W (${number(amps)} A)`)
    grades.set(grade, steps)
  }
  const gradeText = [...grades].map(([grade, steps]) => `${grade}: ${steps.join(', ')}`).join('; ')
  return `${number(entry.values.voltageV)} V; ${gradeText} (${entry.source}).`
}

/** Build the dwelling coincidence hint directly from its normative table. */
export function dwellingSimultaneityHelp() {
  const entry = NORMATIVE_REGISTRY['simultaneity.dwellings']
  const { coefficients, continuationStep } = entry.values
  const samples = [1, 5, 11, 21]
    .map(dwellings => `${dwellings} ${dwellings === 1 ? 'vivienda' : 'viviendas'}: ${number(coefficients[dwellings])}`)
  return `${samples.join('; ')}; después aumenta ${number(continuationStep)} por vivienda adicional (${entry.source}).`
}

/** Describe the load densities and per-supply minima from ITC-BT-10. */
export function commercialLoadHelp() {
  const commercial = NORMATIVE_REGISTRY['loads.commercial']
  return `Locales comerciales/oficinas: ${number(commercial.values.powerPerM2W)} W/m² y mínimo ${number(commercial.values.minimumSupplyPowerW)} W por abonado (${commercial.source}).`
}

export function garageLoadHelp() {
  const garage = NORMATIVE_REGISTRY['loads.garage']
  return `Garajes: ${number(garage.values.naturalPowerPerM2W)} W/m² con ventilación natural o ${number(garage.values.forcedPowerPerM2W)} W/m² con ventilación forzada, mínimo ${number(garage.values.minimumSupplyPowerW)} W (${garage.source}).`
}

export function industryConcentrationLoadHelp() {
  const industry = NORMATIVE_REGISTRY['loads.industry-concentration']
  return `Concentración de industrias: ${number(industry.values.powerPerM2W)} W/m² y mínimo ${number(industry.values.minimumSupplyPowerW)} W por local (${industry.source}).`
}

/** Explain the project motor uplift without attributing it to the REBT load forecast. */
export function motorLoadCriteriaHelp() {
  const entry = NORMATIVE_REGISTRY['service-load.project-defaults']
  return `El incremento del motor mayor usa un coeficiente de proyecto ${number(entry.values.motorCoefficient)}; no es un factor normativo de previsión de cargas. La ITC-BT-47 §3.2 aplica el 125 % a la intensidad para dimensionar conductores que alimentan varios motores.`
}

export function interiorVoltageDropHelp() {
  const { lighting, other, industryOwnTransformerLighting, industryOwnTransformerOther } = NORMATIVE_REGISTRY['voltage-drop.interior'].values
  return `${number(lighting)} % en alumbrado, ${number(other)} % en los demás usos; para industria alimentada en alta tensión con transformador propio, ${number(industryOwnTransformerLighting)} % y ${number(industryOwnTransformerOther)} % (ITC-BT-19 §2.2.2).`
}
