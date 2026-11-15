/**
 * Façana del model ELEC-3.
 *
 * La implementació viu una sola vegada a `lib/elec3.mjs` de l'app principal.
 * Aquest fitxer només la re-exporta amb tipus perquè el subprojecte i la
 * calculadora no tornin a divergir: abans eren dues còpies i produïen sortides
 * diferents per a la mateixa entrada (idioma de les etiquetes, locale de la
 * data, textos d'error, amplades de columna).
 *
 * No afegir lògica aquí. Un camp nou del model s'afegeix a `lib/elec3.mjs`.
 */
export * from '../../../../lib/elec3.mjs'
