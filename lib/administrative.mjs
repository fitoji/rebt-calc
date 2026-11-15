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

/**
 * Las dos cifras de la hoja se guardan como texto y se convierten acá. Acepta un
 * número ya convertido, pero lo que no sea un número finito queda pendiente.
 * Sólo números simples: la coma decimal es otra tarea.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
function declaredNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = declaredText(value)
  if (text === null) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
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
    uso: declaredText(project.uso),
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
