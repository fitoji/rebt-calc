import { DIFFERENTIAL_SENSITIVITY_MA } from './interior-installation.mjs'

/**
 * Protección diferencial de una vivienda (ITC-BT-25 §2.1, Guía BT-24, Guía BT-52).
 *
 * El tipo describe la forma de onda que el dispositivo detecta, no su
 * sensibilidad. La sensibilidad de los circuitos de la vivienda es 30 mA; 300 mA
 * sólo se admite en un diferencial selectivo de cabecera, con todos los
 * circuitos protegidos aguas abajo a 30 mA.
 *
 * @typedef {{
 *   id: string,
 *   type: 'AC' | 'A' | 'F' | 'B' | null,
 *   sensitivityMa: number,
 *   selective: boolean,
 *   rdcDd: boolean,
 *   circuits: string[]
 * }} DifferentialDevice
 */

/** Formas de onda publicadas para los interruptores diferenciales. */
export const DIFFERENTIAL_TYPES = ['AC', 'A', 'F', 'B']

/**
 * Características de cada tipo de diferencial, con la norma que las define.
 * `S` no es una forma de onda sino el retardo de selectividad de la Guía BT-26.
 *
 * @type {Record<string, { detecta: string, cargas: string, cc: string, norma: string, hastaKhz?: number }>}
 */
export const DIFFERENTIAL_TYPE_INFO = Object.freeze({
  AC: {
    detecta: 'Corriente alterna sinusoidal de 50/60 Hz',
    cargas: 'Iluminación incandescente, calefacción y hornos sin control electrónico',
    cc: 'No detecta componente continua',
    norma: 'UNE-EN 61008-1',
  },
  A: {
    detecta: 'Corriente alterna sinusoidal y corriente continua pulsante',
    cargas: 'Fuentes conmutadas y electrodomésticos con electrónica',
    cc: 'Sigue funcionando con hasta 6 mA de CC suave',
    norma: 'UNE-EN 61008-1',
  },
  F: {
    detecta: 'Corriente alterna y pulsante con armónicos hasta 1 kHz',
    cargas: 'Lavadoras y aire acondicionado con variador de frecuencia',
    cc: 'Sigue funcionando con hasta 10 mA de CC suave',
    norma: 'IEC 62423',
    hastaKhz: 1,
  },
  B: {
    detecta: 'Corriente alterna, pulsante y continua suave',
    cargas: 'Recarga de vehículos eléctricos, convertidores trifásicos y SAI',
    cc: 'Detecta componente continua',
    norma: 'IEC 62423',
  },
  S: {
    detecta: 'Selectivo: retardo intencionado para coordinación en serie',
    cargas: 'Diferencial de cabecera; no protege circuitos por sí solo',
    cc: 'Según el tipo instalado aguas abajo',
    norma: 'Guía BT-26',
  },
})

/**
 * Tiempos máximos de ensayo de la curva corriente/tiempo, en ms, a 1×, 2× y 5× IΔn.
 * La curva real del fabricante puede ser más rápida; estos son límites normativos.
 */
export const DIFFERENTIAL_TRIP_TIMES = Object.freeze({
  general: [
    { multiple: 1, ms: 300 },
    { multiple: 2, ms: 150 },
    { multiple: 5, ms: 40 },
  ],
  selective: {
    min: [
      { multiple: 1, ms: 130 },
      { multiple: 2, ms: 60 },
      { multiple: 5, ms: 50 },
    ],
    max: [
      { multiple: 1, ms: 500 },
      { multiple: 2, ms: 200 },
      { multiple: 5, ms: 150 },
    ],
  },
  source: 'UNE-EN 61008-1 / IEC 62423 · límites de ensayo; la curva del fabricante puede ser más rápida',
})

/** Etiquetas descriptivas de cada forma de onda, compartidas por panel e impresos. */
export const DIFFERENTIAL_TYPE_LABELS = Object.freeze({
  AC: 'AC · corriente alterna sinusoidal',
  A: 'A · alterna y pulsante',
  F: 'F · frecuencia variable',
  B: 'B · continua y alterna',
})

/** Nombre breve del dispositivo para el impreso; no inventa denominación comercial. */
export function differentialLabel(device) {
  const base = device.type == null ? 'Tipo sin declarar' : `Tipo ${device.type}`
  const extras = [device.rdcDd ? 'RDC-DD' : null, device.selective ? 'selectivo' : null].filter(Boolean)
  return extras.length > 0 ? `${base} · ${extras.join(' · ')}` : base
}

/** Sensibilidad reservada al diferencial selectivo de cabecera. */
export const UPSTREAM_SENSITIVITY_MA = 300

const isRecord = value => value != null && typeof value === 'object' && !Array.isArray(value)
const waveType = value => DIFFERENTIAL_TYPES.includes(value) ? value : null

/**
 * @param {unknown} value
 * @param {string | null} [fallbackType]
 * @returns {DifferentialDevice}
 */
function deviceFrom(value, fallbackType = null) {
  const source = isRecord(value) ? value : {}
  const selective = source.selective === true
  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id : '',
    type: waveType(source.type) ?? fallbackType,
    sensitivityMa: selective && source.sensitivityMa === UPSTREAM_SENSITIVITY_MA ? UPSTREAM_SENSITIVITY_MA : DIFFERENTIAL_SENSITIVITY_MA,
    selective,
    rdcDd: source.rdcDd === true,
    circuits: Array.isArray(source.circuits) ? source.circuits.filter(circuit => typeof circuit === 'string') : [],
  }
}

/**
 * Normaliza los diferenciales declarados por el proyecto.
 *
 * Un proyecto sin el array conserva su tipo único como D1 y asigna todos los
 * circuitos a ese dispositivo, que es lo que la app hacía antes. Con array, los
 * datos se saneamos sin inventar tipos: un tipo ausente queda pendiente.
 * El mínimo reglamentario se respeta siempre, y C13 recibe un diferencial
 * dedicado con una advertencia hasta que se declare tipo B o A + RDC-DD.
 *
 * @param {{
 *   differentials?: unknown,
 *   differentialType?: string | null,
 *   circuitIds?: string[],
 *   minimum?: number
 * }} [input]
 * @returns {{ devices: DifferentialDevice[], minimum: number, warnings: string[] }}
 */
export function normalizeDifferentials({ differentials, differentialType, circuitIds = [], minimum = 1 } = {}) {
  const ids = Array.isArray(circuitIds) ? circuitIds.filter(id => typeof id === 'string') : []
  const required = Math.max(1, Math.round(minimum))
  const declared = Array.isArray(differentials) ? differentials : null
  const warnings = []

  let devices = declared
    ? declared.map((entry, index) => deviceFrom(entry, index === 0 ? waveType(differentialType) : null))
    : [deviceFrom({ id: 'D1', circuits: ids }, waveType(differentialType))]

  const used = new Set()
  devices = devices.map((device, index) => {
    let id = device.id || `D${index + 1}`
    while (used.has(id)) id = `${id}-${index + 1}`
    used.add(id)
    return { ...device, id }
  })

  while (devices.length < required) {
    let number = devices.length + 1
    while (used.has(`D${number}`)) number += 1
    used.add(`D${number}`)
    devices.push(deviceFrom({ id: `D${number}` }, devices[0]?.type ?? null))
  }

  // ITC-BT-25 §2.1 + Guía BT-26: un diferencial de intensidad superior a 30 mA
  // sólo puede instalarse en serie, aguas arriba, de tipo S, y con todos los
  // circuitos protegidos a 30 mA aguas abajo. Por tanto no puede tener
  // circuitos propios: se trasladan al primer dispositivo de 30 mA.
  const recovered = devices
    .filter(device => device.sensitivityMa > DIFFERENTIAL_SENSITIVITY_MA)
    .flatMap(device => device.circuits)
  if (recovered.length > 0) {
    devices = devices.map(device => device.sensitivityMa > DIFFERENTIAL_SENSITIVITY_MA ? { ...device, circuits: [] } : device)
  }
  if (!devices.some(device => device.sensitivityMa === DIFFERENTIAL_SENSITIVITY_MA)) {
    let number = devices.length + 1
    while (used.has(`D${number}`)) number += 1
    used.add(`D${number}`)
    devices.push(deviceFrom({ id: `D${number}` }))
    warnings.push('Se añadió un diferencial de 30 mA: los circuitos de la vivienda deben quedar protegidos a 30 mA.')
  }
  if (recovered.length > 0) {
    const downstream = devices.find(device => device.sensitivityMa === DIFFERENTIAL_SENSITIVITY_MA)
    devices = devices.map(device => device.id === downstream.id
      ? { ...device, circuits: [...device.circuits, ...recovered.filter(id => !device.circuits.includes(id))] }
      : device)
    warnings.push('El diferencial de cabecera (300 mA, tipo S) no admite circuitos propios: se trasladan a un diferencial de 30 mA.')
  }

  const seen = new Set()
  devices = devices.map(device => ({
    ...device,
    circuits: device.circuits.filter(id => {
      if (!ids.includes(id) || seen.has(id)) return false
      seen.add(id)
      return true
    }),
  }))

  if (ids.includes('C13')) {
    const compliant = devices.find(device => device.circuits.length === 1
      && device.circuits.includes('C13')
      && (device.type === 'B' || (device.type === 'A' && device.rdcDd)))
    if (!compliant) {
      devices = devices.map(device => ({ ...device, circuits: device.circuits.filter(id => id !== 'C13') }))
      let number = devices.length + 1
      while (used.has(`D${number}`)) number += 1
      used.add(`D${number}`)
      devices.push({ ...deviceFrom({ id: `D${number}`, type: 'A', circuits: ['C13'] }) })
      warnings.push('C13 necesita un diferencial propio de tipo B, o tipo A con detección RDC-DD superior a 6 mA (IEC 62955).')
    }
  }

  const unassigned = ids.filter(id => !devices.some(device => device.circuits.includes(id)))
  if (unassigned.length > 0) warnings.push(`Circuitos sin asignar a un diferencial: ${unassigned.join(', ')}.`)

  return { devices, minimum: required, warnings }
}

/** Asigna un circuito a un diferencial, quitándolo de cualquier otro. */
export function assignCircuit(devices, deviceId, circuitId) {
  return devices.map(device => ({
    ...device,
    circuits: device.id === deviceId
      ? (device.circuits.includes(circuitId) ? device.circuits : [...device.circuits, circuitId])
      : device.circuits.filter(id => id !== circuitId),
  }))
}

/**
 * Whether a circuit can be dropped on a device. The 300 mA upstream device
 * never protects circuits directly, C13 needs a device of its own, and a
 * circuit already assigned moves with `assignCircuit` instead of duplicating.
 */
export function canAssignCircuit(device, circuitId) {
  if (device == null || typeof circuitId !== 'string') return false
  if (device.sensitivityMa > DIFFERENTIAL_SENSITIVITY_MA) return false
  if (device.circuits.includes(circuitId)) return false
  if (circuitId === 'C13' && device.circuits.length > 0) return false
  return true
}

/** Quita un circuito de todos los diferenciales, devolviéndolo al pool de sin asignar. */
export function removeCircuit(devices, circuitId) {
  return devices.map(device => ({ ...device, circuits: device.circuits.filter(id => id !== circuitId) }))
}

/** Añade un diferencial con el siguiente identificador libre. */
export function addDifferential(devices, type = null) {
  const used = new Set(devices.map(device => device.id))
  let number = devices.length + 1
  while (used.has(`D${number}`)) number += 1
  return [...devices, deviceFrom({ id: `D${number}`, type })]
}

/** Elimina un diferencial; sus circuitos vuelven a quedar sin asignar. */
export function removeDifferential(devices, deviceId) {
  return devices.filter(device => device.id !== deviceId)
}
