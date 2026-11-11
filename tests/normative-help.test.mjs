import assert from 'node:assert/strict'
import test from 'node:test'
import { commercialLoadHelp, dwellingSimultaneityHelp, garageLoadHelp, housingPowerHelp, industryConcentrationLoadHelp, interiorVoltageDropHelp, motorLoadCriteriaHelp } from '../lib/normative-help.mjs'

test('housing power help is generated from registered voltage steps and source', () => {
  assert.equal(housingPowerHelp(), '230 V; Básica: 5.750 W (25 A), 7.360 W (32 A); Elevada: 9.200 W (40 A), 11.500 W (50 A), 14.490 W (63 A) (ITC-BT-10 §2.2; ITC-BT-25 §§2.1, 3).')
})

test('dwelling simultaneity help uses registered table values and continuation step', () => {
  assert.equal(dwellingSimultaneityHelp(), '1 vivienda: 1; 5 viviendas: 4,6; 11 viviendas: 9,2; 21 viviendas: 15,3; después aumenta 0,5 por vivienda adicional (ITC-BT-10 §3.1, tabla 1).')
})

test('load help text is generated from registered norms and distinguishes the industrial scope', () => {
  assert.equal(commercialLoadHelp(), 'Locales comerciales/oficinas: 100 W/m² y mínimo 3.450 W por abonado (ITC-BT-10 §§3.3, 4.1).')
  assert.equal(garageLoadHelp(), 'Garajes: 10 W/m² con ventilación natural o 20 W/m² con ventilación forzada, mínimo 3.450 W (ITC-BT-10 §3.4).')
  assert.equal(industryConcentrationLoadHelp(), 'Concentración de industrias: 125 W/m² y mínimo 10.350 W por local (ITC-BT-10 §4.2).')
  assert.match(motorLoadCriteriaHelp(), /coeficiente de proyecto/)
  assert.match(motorLoadCriteriaHelp(), /dimensionar conductores/)
  assert.equal(interiorVoltageDropHelp(), '3 % en alumbrado, 5 % en los demás usos; para industria alimentada en alta tensión con transformador propio, 4,5 % y 6,5 % (ITC-BT-19 §2.2.2).')
})
