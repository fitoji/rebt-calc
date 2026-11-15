/**
 * Grado de electrificación que la ITC-BT-25 §2.3.2 exige a una vivienda, a partir
 * de lo que el proyecto declara.
 *
 * La instrucción lo plantea como condición, no como recomendación:
 *
 *   «Es el caso de viviendas con una previsión importante de aparatos
 *   electrodomésticos que obligue a instalar más de un circuito de cualquiera de
 *   los tipos descritos anteriormente, así como con previsión de sistemas de
 *   calefacción eléctrica, acondicionamiento de aire, automatización, gestión
 *   técnica de la energía y seguridad o con superficies útiles de las viviendas
 *   superiores a 160 m².» (ITC-BT-25 §2.3.2)
 *
 * El módulo no bloquea nada: devuelve qué grado exige la instrucción y por qué,
 * y los componentes deciden cómo avisarlo. Una vivienda declarada como básica
 * que incumpla alguna condición se sigue calculando con el grado declarado.
 *
 * Dos son los disparadores que el módulo resuelve con datos del proyecto: la
 * superficie y las previsiones (calefacción, aire acondicionado, automatización,
 * secadora), y el que obliga a «instalar más de un circuito de cualquiera de los
 * tipos descritos anteriormente»: los puntos declarados de un circuito C1–C5 por
 * encima del máximo de la tabla 1.
 */

import { BASIC_CIRCUIT_IDS } from './housing-circuits.mjs'
import { MAX_POINTS, POINT_CIRCUIT_LABELS } from './housing-points.mjs'

/** Superficie útil máxima de la electrificación básica, ITC-BT-25 §2.3.2. */
export const BASIC_MAX_SURFACE_M2 = 160

/** Instrucción que fija la regla, tal como se cita en el aviso. */
export const ELECTRIFICATION_GRADE_SOURCE = 'ITC-BT-25 §2.3.2'

/** Superficie con dos decimales como máximo, sin depender del locale del host. */
const SURFACE_FORMAT = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 })

/**
 * Grado de electrificación que declara una fila de la previsión de cargas, o
 * `null` cuando la fila no declara nada.
 *
 * Es el grado declarado, no el que implica el escalón de potencia: los circuitos
 * siguen al escalón, pero la ITC-BT-25 §2.3.2 responde a lo que la vivienda
 * declara ser, y confundir los dos hace que una vivienda declarada elevada con
 * escalón de 5.750 W se avise en falso.
 *
 * @param {unknown} level
 * @returns {'basic' | 'elevated' | null}
 */
export function declaredGradeOf(level) {
  if (level === 'Básica') return 'basic'
  if (level === 'Elevada') return 'elevated'
  return null
}

/**
 * Motivos por los que la ITC-BT-25 §2.3.2 exige electrificación elevada.
 *
 * `condition` está redactado para leerse dentro del aviso, y `source` es la cita
 * que corresponde a ese motivo concreto. La secadora se apoya en la Guía BT-25
 * y en la existencia del circuito C10, porque el literal del §2.3.2 no la
 * enumera: la tabla 1 solo define C10 para electrificación elevada.
 */
export const ELECTRIFICATION_TRIGGERS = [
  {
    id: 'surface',
    source: ELECTRIFICATION_GRADE_SOURCE,
    label: 'Superficie útil superior a 160 m²',
  },
  {
    id: 'cooling',
    source: ELECTRIFICATION_GRADE_SOURCE,
    label: 'Previsión de aire acondicionado',
  },
  {
    id: 'heating',
    source: ELECTRIFICATION_GRADE_SOURCE,
    label: 'Previsión de calefacción eléctrica',
  },
  {
    id: 'automation',
    source: ELECTRIFICATION_GRADE_SOURCE,
    label: 'Previsión de automatización, gestión técnica de la energía y seguridad',
  },
  {
    id: 'dryer',
    source: 'Guía BT-25',
    label: 'Previsión de secadora independiente (circuito C10)',
  },
]

/**
 * Motivo por el que los puntos declarados de un circuito C1–C5 exigen elevada.
 *
 * El texto es el que se lee en el aviso: nombra el circuito, los puntos que el
 * proyecto declara y el máximo de la tabla 1 que se pasó. El máximo sale de
 * `MAX_POINTS`, que ya lo toma de la tabla 1: acá no se reescribe ningún número.
 *
 * @param {string} circuitId
 * @param {number} points
 * @returns {{ id: string, condition: string, source: string }}
 */
function pointOverflowReason(circuitId, points) {
  const max = MAX_POINTS[circuitId]
  const label = POINT_CIRCUIT_LABELS[circuitId] ?? circuitId
  const condition = `${label.charAt(0).toLowerCase()}${label.slice(1)}`
  return {
    id: `points:${circuitId}`,
    condition: `${points} ${condition}, más de los ${max} que admite el circuito ${circuitId} (${ELECTRIFICATION_GRADE_SOURCE} y §3, tabla 1)`,
    source: ELECTRIFICATION_GRADE_SOURCE,
  }
}

/**
 * Grado de electrificación que exige la instrucción.
 *
 * La superficie es estricta: 160 m² exactos siguen admitiendo electrificación
 * básica, porque el texto dice «superiores a 160 m²».
 *
 * @param {{ areaM2?: number, hasCooling?: boolean, hasHeating?: boolean, hasAutomation?: boolean, hasDryer?: boolean, pointsByCircuit?: Record<string, number | null> | null }} [conditions]
 * @returns {{ grade: 'basic' | 'elevated', reasons: Array<{ id: string, condition: string, source: string }> }}
 */
export function requiredGradeFor(conditions = {}) {
  const { areaM2, hasCooling, hasHeating, hasAutomation, hasDryer, pointsByCircuit } = conditions
  const reasons = []

  const area = Number(areaM2)
  if (Number.isFinite(area) && area > BASIC_MAX_SURFACE_M2) {
    reasons.push({
      id: 'surface',
      condition: `Superficie útil de ${SURFACE_FORMAT.format(area)} m², superior a los ${BASIC_MAX_SURFACE_M2} m² de la electrificación básica (${ELECTRIFICATION_GRADE_SOURCE})`,
      source: ELECTRIFICATION_GRADE_SOURCE,
    })
  }
  if (hasCooling === true) {
    reasons.push({
      id: 'cooling',
      condition: `Previsión de aire acondicionado (${ELECTRIFICATION_GRADE_SOURCE})`,
      source: ELECTRIFICATION_GRADE_SOURCE,
    })
  }
  if (hasHeating === true) {
    reasons.push({
      id: 'heating',
      condition: `Previsión de calefacción eléctrica (${ELECTRIFICATION_GRADE_SOURCE})`,
      source: ELECTRIFICATION_GRADE_SOURCE,
    })
  }
  if (hasAutomation === true) {
    reasons.push({
      id: 'automation',
      condition: `Previsión de automatización, gestión técnica de la energía y seguridad (${ELECTRIFICATION_GRADE_SOURCE})`,
      source: ELECTRIFICATION_GRADE_SOURCE,
    })
  }
  // La secadora no figura en el literal del §2.3.2, pero la tabla 1 solo define el
  // circuito C10 para electrificación elevada y la Guía BT-25 la enumera entre las
  // condiciones del grado elevado.
  if (hasDryer === true) {
    reasons.push({
      id: 'dryer',
      condition: 'Previsión de secadora independiente: el circuito C10 solo existe en la electrificación elevada (Guía BT-25)',
      source: 'Guía BT-25',
    })
  }

  // «viviendas con una previsión importante de aparatos electrodomésticos que
  // obligue a instalar más de un circuito de cualquiera de los tipos descritos
  // anteriormente» (ITC-BT-25 §2.3.2): más puntos que el máximo de la tabla 1.
  //
  // El literal del artículo nombra este caso antes que la superficie y las
  // previsiones, pero los motivos se agregan al final a propósito: el orden de
  // `reasons` ya está publicado y quién avisa solo necesita que los cinco
  // motivos declarados vayan primero y los de puntos no se intercalen con ellos.
  const declared = pointsByCircuit != null && typeof pointsByCircuit === 'object' ? pointsByCircuit : {}
  for (const circuitId of BASIC_CIRCUIT_IDS) {
    const max = MAX_POINTS[circuitId]
    if (typeof max !== 'number' || !Number.isFinite(max) || max <= 0) continue
    const points = Number(declared[circuitId])
    if (!Number.isFinite(points) || points < 0 || points <= max) continue
    reasons.push(pointOverflowReason(circuitId, points))
  }

  return { grade: reasons.length > 0 ? 'elevated' : 'basic', reasons }
}

/**
 * Aviso para un grado declarado que contradice la instrucción, o `null` cuando
 * lo declarado es conforme o ya es elevado.
 *
 * @param {{ declaredGrade?: 'basic' | 'elevated', areaM2?: number, hasCooling?: boolean, hasHeating?: boolean, hasAutomation?: boolean, hasDryer?: boolean, pointsByCircuit?: Record<string, number | null> | null }} [input]
 * @returns {{ title: string, description: string, reasons: Array<{ id: string, condition: string, source: string }> } | null}
 */
export function electrificationGradeWarning(input = {}) {
  const { declaredGrade, areaM2, hasCooling, hasHeating, hasAutomation, hasDryer, pointsByCircuit } = input
  if (declaredGrade === 'elevated') return null

  const required = requiredGradeFor({ areaM2, hasCooling, hasHeating, hasAutomation, hasDryer, pointsByCircuit })
  if (required.grade === 'basic') return null

  return {
    title: `La ${ELECTRIFICATION_GRADE_SOURCE} exige electrificación elevada`,
    description: `${required.reasons.map(reason => `${reason.condition}.`).join(' ')} El grado declarado es básico.`,
    reasons: required.reasons,
  }
}
