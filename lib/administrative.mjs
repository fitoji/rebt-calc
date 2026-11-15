/**
 * La vista administrativa de una instalación para la hoja 2 del ELEC-3.
 *
 * Los datos viven en dos niveles: lo que es del edificio está en `ProjectInfo`
 * (localStorage, viaja en el JSON exportado) y lo que es de cada instalación —
 * número, piso, puerta, superficie del local, resistencia de tierra y el titular
 * cuando difiere — viaja dentro de la derivación, en el snapshot v6.
 *
 * Regla del proyecto (S5): la instalación hereda lo del proyecto y sólo lo
 * overridea cuando difiere. Lo que no está declarado en ninguno de los dos
 * niveles queda pendiente (`null`); nunca se rellena por parecido ni se copia de
 * otra vivienda. Este módulo no decide nada normativo y no importa el motor.
 */

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Un dato administrativo guardado como texto declarado: se recorta y el vacío
 * cuenta como no declarado. Nunca se propaga la cadena vacía.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
function declaredText(value) {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text === '' ? null : text
}

/** Una cifra escrita con coma decimal: un solo separador, con dígitos a los lados. */
const DECIMAL_COMMA = /^([+-]?\d+),(\d+)$/

/**
 * Las dos cifras de la hoja se guardan como texto y se convierten acá, en un
 * único lugar: superficie del local y resistencia de tierra.
 *
 * Acepta un número ya convertido (finito) y un texto con punto o con **una sola
 * coma decimal**, que es como lo escribe un usuario español (`12,5` → `12.5`).
 * El texto ambiguo queda pendiente y nunca se adivina: con los dos separadores a
 * la vez (`1.234,5`, `12,5.5`) o con el separador repetido (`12,5,5`), la celda
 * se pinta pendiente. El vacío, lo que no es un número y lo no finito también.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
function declaredNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = declaredText(value)
  if (text === null) return null
  // Una sola coma entre dígitos es la coma decimal española. Cualquier otra
  // forma con separador repetido o mezclado no se interpreta.
  const decimal = DECIMAL_COMMA.exec(text)
  const parsed = decimal === null ? Number(text) : Number(`${decimal[1]}.${decimal[2]}`)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * El `uso` que declara el tipo de derivación (S6). Es una etiqueta del impreso, no
 * un dato normativo: `custom` y lo que no esté en el mapa quedan pendientes en vez
 * de inventarse.
 *
 * @type {Record<string, string>}
 */
const USE_BY_KIND = {
  dwelling: 'Vivienda',
  local: 'Comercial',
  garage: 'Garaje',
  'common-services': 'Servicios generales',
  irve: 'Recarga de vehículo eléctrico',
}

/**
 * El `uso` de la instalación: el texto que declara el proyecto gana y, si no lo
 * hay, sale del tipo de derivación.
 *
 * @param {Record<string, unknown>} project
 * @param {Record<string, unknown>} derivation
 * @returns {string | null}
 */
function resolvedUse(project, derivation) {
  const declared = declaredText(project.uso)
  if (declared !== null) return declared
  const kind = isRecord(derivation) ? derivation.kind : undefined
  if (typeof kind !== 'string') return null
  return USE_BY_KIND[kind] ?? null
}

/**
 * El bloque `administrative` de una derivación. Sin bloque no hay nada declarado
 * por la instalación y todo se hereda del proyecto.
 *
 * @param {unknown} derivation
 * @returns {Record<string, unknown>}
 */
function installationData(derivation) {
  if (!isRecord(derivation) || !isRecord(derivation.administrative)) return {}
  return derivation.administrative
}

/**
 * @typedef {object} ResolvedAdministrative
 * @property {string | null} titular
 * @property {string | null} uso
 * @property {{ calle: string | null, numero: string | null, piso: string | null, puerta: string | null, localidad: string | null, codigoPostal: string | null }} emplazamiento
 * @property {string | null} instalacion
 * @property {string | null} distribuidora
 * @property {number | null} resistenciaTierraOhm
 * @property {number | null} superficieLocalM2
 * @property {{ nombre: string | null, nif: string | null, direccion: string | null, telefono: string | null, email: string | null, carnet: string | null }} instalador
 */

/**
 * Resuelve la vista administrativa de una instalación mezclando los dos niveles:
 * el punto de emplazamiento toma calle, localidad y código postal del edificio, y
 * número, piso y puerta sólo de la vivienda, que no los hereda de nadie.
 *
 * @param {unknown} projectInfo datos del proyecto tal como los devuelve `readProjectInfo`
 * @param {unknown} derivation la derivación del snapshot, con su bloque `administrative`
 * @returns {ResolvedAdministrative}
 */
export function resolveAdministrative(projectInfo, derivation) {
  const project = isRecord(projectInfo) ? projectInfo : {}
  const installation = installationData(derivation)

  return {
    titular: declaredText(installation.titularName) ?? declaredText(project.titularName),
    uso: resolvedUse(project, derivation),
    emplazamiento: {
      calle: declaredText(project.workAddress),
      numero: declaredText(installation.numero),
      piso: declaredText(installation.piso),
      puerta: declaredText(installation.puerta),
      localidad: declaredText(project.addressCity),
      codigoPostal: declaredText(project.addressPostalCode),
    },
    instalacion: declaredText(project.installType),
    distribuidora: declaredText(project.distributorName),
    resistenciaTierraOhm: declaredNumber(installation.resistenciaTierraOhm),
    superficieLocalM2: declaredNumber(installation.superficieLocalM2),
    // La empresa instaladora es una sola para todo el proyecto (S7). El NIF y el
    // carné todavía no están en `PROJECT_INFO_KEYS`: se leen defensivamente y
    // quedan pendientes hasta que el formulario los declare.
    instalador: {
      nombre: declaredText(project.companyName),
      nif: declaredText(project.companyNif),
      direccion: declaredText(project.companyAddress),
      telefono: declaredText(project.phone),
      email: declaredText(project.email),
      carnet: declaredText(project.installerNumber),
    },
  }
}
