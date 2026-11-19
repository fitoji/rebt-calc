import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { lineSectionWarning, sizeLine } from '../lib/line-sizing.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const lgaInput = overrides => ({
  role: 'lga',
  system: 'three-phase',
  powerW: 75000,
  voltageV: 400,
  cosPhi: 1,
  lengthM: 25,
  maxDropPercent: 0.5,
  gamma: 44,
  variant: { method: 'B1', loadedConductors: 3, insulation: 'PVC' },
  ...overrides,
})

const diInput = overrides => ({
  role: 'di',
  system: 'single-phase',
  powerW: 9200,
  voltageV: 230,
  cosPhi: 1,
  lengthM: 20,
  maxDropPercent: 3,
  gamma: 48.5,
  variant: { method: 'B1', loadedConductors: 2, insulation: 'PVC' },
  ...overrides,
})

test('la sección recomendada es la automática del motor', () => {
  const lga = sizeLine(lgaInput())
  assert.equal(lga.autoSection, 70)
  assert.equal(lga.finalSection, 70)
  assert.equal(lga.effectiveSection, 70)
  assert.equal(lga.overrideInvalidReason, null)
  assert.equal(lineSectionWarning(lga), null)

  const di = sizeLine(diInput())
  assert.equal(di.autoSection, 10)
  assert.equal(di.effectiveSection, 10)
})

test('una sección mayor se adopta y se propaga a la memoria', () => {
  const base = sizeLine(lgaInput())
  const bigger = sizeLine(lgaInput({ sectionOverride: 95 }))
  assert.equal(bigger.autoSection, base.autoSection, 'la recomendada no cambia')
  assert.equal(bigger.sectionOverride, 95)
  assert.equal(bigger.finalSection, 95, 'el panel muestra lo elegido')
  assert.equal(bigger.effectiveSection, 95, 'la memoria imprime la sección mayor')
  assert.deepEqual(bigger.overrideCompliance, { minimum: true, current: true, drop: true })
  assert.equal(bigger.overrideInvalidReason, null)
  assert.ok(bigger.dropPercent < base.dropPercent, 'una sección mayor reduce la caída')
})

test('una sección menor que falla la caída queda en rojo y no se imprime', () => {
  const lga = sizeLine(lgaInput({ sectionOverride: 50 }))
  assert.equal(lga.finalSection, 50, 'el panel conserva lo elegido')
  assert.equal(lga.effectiveSection, 70, 'la memoria usa la recomendada')
  assert.equal(lga.overrideInvalidReason, 'drop')
  assert.deepEqual(lga.overrideCompliance, { minimum: true, current: true, drop: false })
  assert.match(lineSectionWarning(lga), /caída máxima del 0,5 %/)
})

test('una sección menor que falla la corriente admisible nombra la Iz', () => {
  const di = sizeLine(diInput({ sectionOverride: 6 }))
  assert.equal(di.finalSection, 6)
  assert.equal(di.effectiveSection, 10, 'la memoria usa la recomendada')
  assert.equal(di.overrideInvalidReason, 'current')
  assert.match(lineSectionWarning(di), /corriente admisible/)
  assert.match(lineSectionWarning(di), /Iz 36 A/)
  assert.match(lineSectionWarning(di), /Ib 40 A/)
})

test('una sección por debajo del mínimo de la instrucción lo dice', () => {
  const lga = sizeLine(lgaInput({ sectionOverride: 6 }))
  assert.equal(lga.overrideInvalidReason, 'minimum')
  assert.match(lineSectionWarning(lga), /sección mínima de 10 mm²/)
  assert.equal(lga.effectiveSection, 70)
})

test('la sección que se imprime arrastra neutro y PE', () => {
  const lga = sizeLine(lgaInput({ sectionOverride: 50 }))
  const auto = sizeLine(lgaInput())
  assert.equal(lga.neutralSection, auto.neutralSection, 'el neutro sigue a la sección impresa')
  assert.equal(lga.protectiveSection, auto.protectiveSection, 'el PE sigue a la sección impresa')
})

test('el panel ofrece el select en LGA y DI con la recomendada marcada', () => {
  const modules = read('components/line-modules.tsx')
  assert.match(modules, /<LineSectionField role="lga"/, 'LGA tiene el control')
  assert.match(modules, /<LineSectionField role="di"/, 'DI tiene el control')
  assert.match(modules, /import \{ LineSectionSelect \} from '@\/components\/line-section-select'/, 'el select compartido se importa')
  assert.match(modules, /lineSectionWarning/, 'el panel explica el motivo del fallo')
  assert.match(modules, /role="alert"/, 'el aviso se anuncia como alerta')

  const select = read('components/line-section-select.tsx')
  assert.match(select, /from '@ui-sdk\/react\/select'/, 'usa el Select de UI SDK')
  assert.match(select, /Automática ·/, 'la opción recomendada se distingue')
  assert.match(select, /Recomendada/, 'la recomendada queda marcada siempre')
  assert.match(select, /Check/, 'la marca es un check')
  assert.match(select, /SelectItemIndicator/, 'el ítem seleccionado lleva su check')
  assert.match(select, /text-danger/, 'la sección inválida se pinta en rojo')
})

test('la memoria y el ELEC-3 imprimen la sección efectiva, nunca la menor', () => {
  assert.match(read('lib/elec3.mjs'), /effectiveSection \?\? result\?\.finalSection/, 'el ELEC-3 usa la efectiva')
  assert.match(read('lib/elec3-dwelling.mjs'), /effectiveSection \?\? result\.finalSection/, 'la hoja de vivienda usa la efectiva')
  assert.match(read('components/load-calculator.tsx'), /lgaResult\.effectiveSection \?\? lgaResult\.finalSection/, 'el informe de la LGA usa la efectiva')
  assert.match(read('components/load-calculator.tsx'), /diResult\.effectiveSection \?\? diResult\.finalSection/, 'el informe de la DI usa la efectiva')
  assert.match(read('components/rail-result.tsx'), /lga\.effectiveSection \?\? lga\.finalSection/, 'el rail usa la efectiva')
  assert.match(read('components/unifilar-diagram.tsx'), /effectiveSection \?\? res\?\.finalSection/, 'el unifilar usa la efectiva')
})
