/**
 * Checklist of normative requirements for a low-voltage project / technical
 * memory (memoria técnica de diseño) under the Spanish REBT, and the rule that
 * decides whether each one is already satisfied by the current project data.
 *
 * The validity flags are derived from the persisted calculator inputs and the
 * project info block, so the page that consumes them stays in sync with the app
 * without duplicating any calculation logic.
 */

import { isDefaultMeterCenter } from './meter-center.mjs'

const INSTALLATION_TYPES = ['centralized', 'partial', 'single-user']

function installationLabel(type) {
  switch (type) {
    case 'centralized': return 'contadores totalmente centralizados'
    case 'partial': return 'contadores concentrados en más de un lugar'
    case 'single-user': return 'único usuario sin LGA'
    default: return 'sin definir'
  }
}

function hasHousing(inputs) {
  return Array.isArray(inputs?.housing) && inputs.housing.some(row => (row?.homes ?? 0) > 0)
}

function housingCount(inputs) {
  return (inputs?.housing ?? []).reduce((sum, row) => sum + (row?.homes ?? 0), 0)
}

function hasServices(inputs) {
  return (inputs?.elevators?.length ?? 0) > 0
    || (inputs?.motors?.length ?? 0) > 0
    || (inputs?.otherLoads?.length ?? 0) > 0
    || (inputs?.lighting?.length ?? 0) > 0
}

function hasLocals(inputs) {
  return Array.isArray(inputs?.locals) && inputs.locals.length > 0
}

function hasGarages(inputs) {
  return Array.isArray(inputs?.garages) && inputs.garages.length > 0
}

function parkingCount(inputs) {
  const fromGarages = (inputs?.garages ?? []).reduce((sum, row) => sum + (row?.plazas ?? 0), 0)
  return Math.max(inputs?.parking ?? 0, fromGarages)
}

function hasIrve(inputs) {
  return (inputs?.parking ?? 0) > 0
    || (inputs?.garages ?? []).some(row => (row?.plazas ?? 0) > 0)
}

function hasLga(inputs) {
  return isRecord(inputs?.lga) && (inputs.lga.powerW ?? 0) > 0 && (inputs.lga.lengthM ?? 0) > 0
}

function hasDi(inputs) {
  return Array.isArray(inputs?.derivations) && inputs.derivations.length > 0
}

function hasDwellingInterior(inputs) {
  return Array.isArray(inputs?.derivations)
    && inputs.derivations.some(d => d?.kind === 'dwelling' && d?.interior)
}

function hasNonDwellingCircuits(inputs) {
  return Array.isArray(inputs?.derivations)
    && inputs.derivations.some(d => Array.isArray(d?.interiorCircuits) && d.interiorCircuits.length > 0)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * @param {{ inputs: any, projectInfo: any }} args
 * @returns {Array<{ id: string, group: string, title: string, detail: string, source: string, valid: boolean, tip: string }>}
 */
export function evaluateRequirements({ inputs, projectInfo }) {
  const info = projectInfo ?? {}
  const groups = []

  // Datos del proyecto
  groups.push({
    id: 'datos-empresa',
    group: 'Datos del proyecto',
    title: 'Identificación del proyecto (empresa e instalación)',
    detail: 'Razón social / instalador y dirección de la obra. Aparecen en la cabecera del PDF.',
    source: 'Modelo MTD · ITC-BT-03',
    valid: !!(info.companyName && info.workAddress),
    tip: info.companyName
      ? `Empresa: ${info.companyName}${info.workAddress ? ' · Obra: ' + info.workAddress : ''}`
      : 'Pendiente: rellena la card de datos de la memoria.',
  })
  groups.push({
    id: 'datos-supuesto',
    group: 'Datos del proyecto',
    title: 'Supuesto de enlace (contadores)',
    detail: 'Define las caídas máximas admisibles de la LGA y de la DI a la vez.',
    source: 'ITC-BT-14 §3 · ITC-BT-15 §3',
    valid: INSTALLATION_TYPES.includes(inputs?.installationType),
    tip: INSTALLATION_TYPES.includes(inputs?.installationType)
      ? `Supuesto activo: ${installationLabel(inputs.installationType)}.`
      : 'Pendiente: elige el supuesto de enlace.',
  })
  groups.push({
    id: 'datos-contadores',
    group: 'Datos del proyecto',
    title: 'Forma de contadores (ITC-BT-16)',
    detail: 'Colocación, conjunto de medida, tipo de armario, contadores y planta.',
    source: 'ITC-BT-16',
    valid: !!inputs?.meterCenter && !isDefaultMeterCenter(inputs.meterCenter),
    tip: inputs?.meterCenter && !isDefaultMeterCenter(inputs.meterCenter)
      ? `Contadores: ${inputs.meterCenter.meters ?? 0} en ${inputs.meterCenter.concentrations} concentración(es).`
      : 'Pendiente: configura la card de formas de contadores.',
  })

  // Previsión de cargas
  groups.push({
    id: 'p1',
    group: 'Previsión de cargas',
    title: 'P1 · Viviendas',
    detail: 'Al menos una fila con viviendas y su grado de electrificación.',
    source: 'ITC-BT-10 §2.2 · §3.1',
    valid: hasHousing(inputs),
    tip: hasHousing(inputs)
      ? `P1 completo: ${housingCount(inputs)} viviendas registradas.`
      : 'Pendiente: añade viviendas en la previsión.',
  })
  groups.push({
    id: 'p2',
    group: 'Previsión de cargas',
    title: 'P2 · Servicios generales',
    detail: 'Ascensores, motores, otras cargas o alumbrado de zonas comunes.',
    source: 'ITC-BT-10 §3.2 · ITC-BT-47',
    valid: hasServices(inputs),
    tip: hasServices(inputs)
      ? 'P2 completo: servicios generales registrados.'
      : 'Pendiente: añade ascensores, motores u otras cargas.',
  })
  groups.push({
    id: 'p3',
    group: 'Previsión de cargas',
    title: 'P3 · Locales, oficinas e industrias',
    detail: 'Al menos un local u oficina con superficie y tipo.',
    source: 'ITC-BT-10 §3.3',
    valid: hasLocals(inputs),
    tip: hasLocals(inputs)
      ? `P3 completo: ${inputs.locals.length} local(es).`
      : 'Pendiente: añade locales u oficinas.',
  })
  groups.push({
    id: 'p4',
    group: 'Previsión de cargas',
    title: 'P4 · Garajes',
    detail: 'Al menos un garaje con superficie y ventilación.',
    source: 'ITC-BT-10 §3.4',
    valid: hasGarages(inputs),
    tip: hasGarages(inputs)
      ? `P4 completo: ${inputs.garages.length} garaje(s).`
      : 'Pendiente: añade garajes.',
  })
  groups.push({
    id: 'p5',
    group: 'Previsión de cargas',
    title: 'P5 · IRVE (recarga de vehículos)',
    detail: 'Plazas de aparcamiento o mínimo del 10 % para vivienda nueva con garaje.',
    source: 'Guía-BT-52 Anexo 2 · ITC-BT-52',
    valid: hasIrve(inputs),
    tip: hasIrve(inputs)
      ? `P5 completo: ${parkingCount(inputs)} plazas consideradas.`
      : 'Pendiente: define plazas de recarga o el mínimo del 10 %.',
  })

  // LGA
  groups.push({
    id: 'lga-dimensionada',
    group: 'Línea General de Alimentación',
    title: 'LGA dimensionada',
    detail: 'Potencia y longitud de la LGA introducidas y sección calculada.',
    source: 'ITC-BT-14',
    valid: hasLga(inputs),
    tip: hasLga(inputs)
      ? `LGA: ${inputs.lga.powerW} W · ${inputs.lga.lengthM} m.`
      : 'Pendiente: completa la tarjeta de la LGA.',
  })
  groups.push({
    id: 'lga-proteccion',
    group: 'Línea General de Alimentación',
    title: 'Protección de la LGA (Ib ≤ In ≤ Iz)',
    detail: 'Interruptor automático normalizado verificado.',
    source: 'ITC-BT-14',
    valid: hasLga(inputs) && (inputs.lga.protectionA ?? 0) > 0,
    tip: hasLga(inputs) && (inputs.lga.protectionA ?? 0) > 0
      ? `Protección LGA: ${inputs.lga.protectionA} A.`
      : 'Pendiente: propón la protección de la LGA.',
  })

  // DI
  groups.push({
    id: 'di-definidas',
    group: 'Derivaciones individuales',
    title: 'Derivaciones individuales definidas',
    detail: 'Al menos una derivación por vivienda, local, garaje o servicios.',
    source: 'ITC-BT-15',
    valid: hasDi(inputs),
    tip: hasDi(inputs)
      ? `DI: ${inputs.derivations.length} derivación(es).`
      : 'Pendiente: genera las derivaciones individuales.',
  })
  groups.push({
    id: 'di-dimensionadas',
    group: 'Derivaciones individuales',
    title: 'Derivaciones dimensionadas',
    detail: 'Cada derivación con potencia y longitud y sección calculada.',
    source: 'ITC-BT-15',
    valid: hasDi(inputs) && inputs.derivations.every(d => (d?.powerW ?? 0) > 0 && (d?.lengthM ?? 0) > 0),
    tip: hasDi(inputs) && inputs.derivations.every(d => (d?.powerW ?? 0) > 0 && (d?.lengthM ?? 0) > 0)
      ? 'Todas las derivaciones están dimensionadas.'
      : 'Pendiente: completa potencia y longitud de cada derivación.',
  })

  // Cuadros
  groups.push({
    id: 'cuadro-vivienda',
    group: 'Cuadros e instalación interior',
    title: 'Cuadro de mando y protección de vivienda',
    detail: 'IGA, ICP y diferenciales de 30 mA por vivienda.',
    source: 'ITC-BT-25',
    valid: hasDwellingInterior(inputs),
    tip: hasDwellingInterior(inputs)
      ? 'Cuadro de vivienda configurado.'
      : 'Pendiente: carga las estancias del cuadro de vivienda.',
  })
  groups.push({
    id: 'cuadro-no-vivienda',
    group: 'Cuadros e instalación interior',
    title: 'Cuadro interior de local o servicios generales',
    detail: 'Circuitos reales dimensionados con ITC-BT-19.',
    source: 'ITC-BT-19',
    valid: hasNonDwellingCircuits(inputs),
    tip: hasNonDwellingCircuits(inputs)
      ? 'Cuadro de local/servicios configurado.'
      : 'Pendiente: carga los circuitos del cuadro interior.',
  })

  // Esquema
  groups.push({
    id: 'esquema',
    group: 'Esquema unifilar',
    title: 'Esquema unifilar del conjunto',
    detail: 'Acometida, embarrado y una columna por derivación (UNE-EN 60617).',
    source: 'UNE-EN 60617',
    valid: hasDi(inputs),
    tip: hasDi(inputs)
      ? 'Esquema disponible a partir de las derivaciones.'
      : 'Pendiente: define las derivaciones para generar el esquema.',
  })

  // Exportación
  groups.push({
    id: 'exportacion',
    group: 'Exportación y memoria',
    title: 'Memoria técnica exportable (PDF/JSON/MD/TXT)',
    detail: 'Descarga la memoria con los mismos números que ves en pantalla.',
    source: 'Modelo MTD',
    valid: !!inputs,
    tip: !!inputs
      ? 'Memoria lista para exportar desde el botón Descargar datos.'
      : 'Pendiente: completa la previsión para exportar.',
  })

  return groups
}

export const REQUIREMENT_GROUPS = [
  'Datos del proyecto',
  'Previsión de cargas',
  'Línea General de Alimentación',
  'Derivaciones individuales',
  'Cuadros e instalación interior',
  'Esquema unifilar',
  'Exportación y memoria',
]