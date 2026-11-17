import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildDwellingDocument, ELEC3_COLUMNS } from '../lib/elec3.mjs'
import { DEFAULT_ELEC3_LOCALE, ELEC3_TEXT } from '../lib/elec3-i18n.mjs'
import { dwellingDocumentInput } from '../lib/elec3-dwelling.mjs'
import { housingCircuitsFor } from '../lib/housing-circuits.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const derivation = {
  label: 'Vivienda 1',
  powerW: 9200,
  lengthM: 20,
  method: 'C',
  tubeDiameter: 40,
  installation: 'air',
  result: { finalSection: 16, ratedCurrent: 40, dropPercent: 0.906, momentKwM: 184 },
}

function documentFor(interior = {}) {
  return buildDwellingDocument(dwellingDocumentInput({
    derivation,
    interior: { contractedPowerW: 9200, circuits: 10, hasSurge: false, ...interior },
    circuits: housingCircuitsFor(9200).slice(0, 2),
  }))
}

test('la hoja 1 sustituye la canalización única por las cuatro columnas del impreso', () => {
  const keys = ELEC3_COLUMNS.map(column => column.key)
  assert.equal(ELEC3_COLUMNS.length, 19)
  assert.deepEqual(keys.slice(keys.indexOf('senseTub'), keys.indexOf('aillament')), [
    'senseTub', 'tubEncastrat', 'tubSenseEncastrar', 'enterratProfunditat',
  ])
  assert.doesNotMatch(keys.join(' '), /canalitzacio/, 'la columna de texto libre ya no existe')
})

test('el tipo elegido decide qué columna de canalización se imprime', () => {
  const embedded = documentFor({ installationType: 'tuboEncastrado' })
  assert.equal(embedded.files[0].tubEncastrat, 40)
  assert.equal(embedded.files[0].tubSenseEncastrar, null)
  assert.equal(embedded.files[0].senseTub, null)
  assert.equal(embedded.files[0].enterratProfunditat, null)

  const surface = documentFor({ installationType: 'tuboSinEncastrar' })
  assert.equal(surface.files[1].tubSenseEncastrar, 16, 'los circuitos toman el diámetro de la tabla 1')
  assert.equal(surface.files[1].tubEncastrat, null)

  const buried = documentFor({ installationType: 'enterrado', buriedDepthM: 0.7 })
  assert.equal(buried.files[0].enterratProfunditat, 0.7)
  assert.equal(buried.files[0].tubEncastrat, null)

  const noTube = documentFor({ installationType: 'sinTubo' })
  assert.equal(noTube.files[0].senseTub, 'C', 'sin tubo se imprime el sistema declarado')
  assert.equal(noTube.files[0].tubEncastrat, null)
})

test('sin tipo declarado las cuatro celdas quedan pendientes', () => {
  const document = documentFor()
  for (const row of document.files) {
    for (const key of ['senseTub', 'tubEncastrat', 'tubSenseEncastrar', 'enterratProfunditat']) {
      assert.equal(row[key], null, `${row.nom} · ${key} pendiente`)
    }
  }
})

test('la hoja 1 replica cabecera agrupada, rótulos y filas del impreso oficial', () => {
  const preview = read('components/elec3-preview.tsx')

  assert.equal(ELEC3_TEXT.es.modelTitle, 'Modelo ELEC 3 - MEMORIA TÉCNICA')
  assert.equal(ELEC3_TEXT.ca.modelTitle, 'Model ELEC 3 - MEMÒRIA TÈCNICA')
  assert.equal(ELEC3_TEXT.es.columns.potencia, 'Potencia kW.')
  assert.equal(ELEC3_TEXT.ca.columns.potencia, 'Potència kW.')
  assert.equal(ELEC3_TEXT.es.groups.caiguda, 'Caída de tensión')
  assert.equal(ELEC3_TEXT.ca.groups.caiguda, 'Caiguda de tensió')
  assert.equal(ELEC3_TEXT.es.rowLabels[0], 'Derivación individual (A — B)')
  assert.equal(ELEC3_TEXT.ca.rowLabels[0], 'Derivació individual (A — B)')
  assert.equal(ELEC3_TEXT.ca.observacions, 'OBSERVACIONS: Grau de protecció d’aparamenta i receptors en locals especials')

  assert.match(preview, /rowSpan=\{2\}/, 'las columnas sueltas abarcan las dos filas de cabecera')
  assert.match(preview, /colSpan=\{group\.keys\.length\}/, 'los grupos abarcan sus columnas')
  assert.match(preview, /text\.groups\[group\.key/, 'las cabeceras salen del diccionario')
})

test('el ELEC-3 se muestra en castellano y conserva la versión catalana', () => {
  const preview = read('components/elec3-preview.tsx')

  assert.equal(DEFAULT_ELEC3_LOCALE, 'es')
  assert.match(preview, /locale = DEFAULT_ELEC3_LOCALE/, 'el castellano es el idioma por defecto')
  assert.match(preview, /ELEC3_TEXT\[locale\]/, 'la vista elige el diccionario según el locale')
  assert.equal(ELEC3_TEXT.es.sheet2.groups.instalacio, 'INSTALACIÓN')
  assert.equal(ELEC3_TEXT.ca.sheet2.groups.instalacio, 'INSTAL·LACIÓ')
  assert.equal(ELEC3_TEXT.es.sheet2.differential.sensibilidadMa, 'Sensibilidad')
  assert.equal(ELEC3_TEXT.ca.sheet2.differential.sensibilidadMa, 'Sensibilitat')
})

test('el cuadros ofrece el selector y la profundidad del enterrado', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /id="interior-installation-type"/, 'un selector por vivienda')
  assert.match(panel, /id="interior-buried-depth"/, 'profundidad solo para el enterrado')
  assert.match(panel, /tuboSinEncastrar/, 'la opción sin encastrar existe')
  assert.match(panel, /value=\{inputs\.installationType \?\? ''\}/, 'el Select nunca arranca uncontrolled')
})
