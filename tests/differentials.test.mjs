import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DIFFERENTIAL_TRIP_TIMES, DIFFERENTIAL_TYPE_INFO, DIFFERENTIAL_TYPES, assignCircuit, canAssignCircuit, normalizeDifferentials } from '../lib/differentials.mjs'
import { housingCircuitsFor } from '../lib/housing-circuits.mjs'
import { dwellingDocumentInput } from '../lib/elec3-dwelling.mjs'
import { buildDwellingDocument } from '../lib/elec3.mjs'
import { differentialDevicesFor } from '../lib/unifilar.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const basicIds = ['C1', 'C2', 'C3', 'C4', 'C5']
const elevatedIds = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10']

test('el panel declara el mínimo reglamentario y una tabla por dispositivo', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /Diferenciales · protección y agrupación/, 'la sección existe')
  assert.match(panel, /mínimo \{evaluation\.differentials\}/, 'el mínimo es dato derivado')
  assert.match(panel, /normalizeDifferentials\(/, 'la tabla lee la fuente de verdad')
  assert.match(panel, /assignCircuit\(/, 'mover un circuito lo quita del otro diferencial')
  assert.match(panel, /Añadir circuito/, 'la asignación es explícita')
  assert.match(panel, /RDC-DD/, 'la protección VE se declara')
  assert.match(panel, /Cabecera selectiva · sin circuitos/, 'el diferencial de 300 mA no admite circuitos')
  assert.doesNotMatch(panel, /id="interior-differential-type"/, 'ya no hay un tipo global')
})

test('el unifilar identifica cada diferencial declarado', () => {
  const devices = differentialDevicesFor({
    kind: 'dwelling',
    powerW: 5750,
    interior: {
      contractedPowerW: 5750,
      circuits: 5,
      hasSurge: false,
      differentials: [
        { id: 'D1', type: 'A', sensitivityMa: 30, circuits: ['C1', 'C2'] },
        { id: 'D2', type: 'B', sensitivityMa: 30, circuits: ['C13'] },
      ],
    },
  })
  assert.deepEqual(devices.map(device => device.id), ['D1', 'D2'])
  assert.equal(devices[1].type, 'B')

  const diagram = read('components/unifilar-diagram.tsx')
  assert.match(diagram, /differentialDevicesFor\(derivation\)/, 'la lámina lee los dispositivos')
  assert.match(diagram, /devices\.map\(/, 'dibuja uno por dispositivo')
})

test('la hoja 2 del ELEC-3 declara tipo y circuitos sin inventar el calibre', () => {
  const differentials = [
    { id: 'D1', type: 'A', sensitivityMa: 30, selective: false, rdcDd: false, circuits: ['C1', 'C2'] },
    { id: 'D2', type: 'B', sensitivityMa: 30, selective: false, rdcDd: false, circuits: ['C13'] },
  ]
  const document = buildDwellingDocument(dwellingDocumentInput({
    derivation: { powerW: 5750 },
    interior: { contractedPowerW: 5750, circuits: 5, hasSurge: false, differentials },
    circuits: housingCircuitsFor(5750, { hasIrve: true }),
  }))
  const rows = document.administrative.diferenciales

  assert.equal(rows[0].circuito, 'C1, C2', 'los circuitos asignados se imprimen')
  assert.equal(rows[0].nombre, 'Tipo A', 'el tipo se imprime en la columna nombre')
  assert.equal(rows[0].sensibilidadMa, 30)
  assert.equal(rows[0].inA, null, 'el calibre sigue pendiente del instalador')
  assert.equal(rows[1].nombre, 'Tipo B')
  const i18n = read('lib/elec3-i18n.mjs')
  assert.match(i18n, /declara el tipo, los circuitos y la sensibilidad/, 'el caption ya no dice que sólo declara sensibilidad')
})

test('un circuito sólo se puede soltar en un diferencial que pueda protegerlo', () => {
  const branch = { id: 'D1', type: 'A', sensitivityMa: 30, selective: false, circuits: ['C1'] }
  const upstream = { ...branch, id: 'D2', sensitivityMa: 300, selective: true, circuits: [] }
  assert.equal(canAssignCircuit(branch, 'C2'), true)
  assert.equal(canAssignCircuit(branch, 'C1'), false, 'ya lo tiene asignado')
  assert.equal(canAssignCircuit(upstream, 'C2'), false, 'la cabecera de 300 mA no protege circuitos')
  assert.equal(canAssignCircuit(branch, 'C13'), false, 'C13 necesita su propio diferencial')
  assert.equal(canAssignCircuit({ ...branch, circuits: [] }, 'C13'), true)
})

test('el panel arrastra circuitos sin asignar y los suelta en cada diferencial', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /from '@ui-sdk\/core'/, 'usa los behaviors del SDK')
  assert.match(panel, /bindDragPreview\(/, 'muestra una copia del circuito')
  assert.match(panel, /threshold: dragThreshold/, 'un clic no se vuelve drag')
  assert.match(panel, /data-differential-target/, 'cada fila es zona de drop')
  assert.match(panel, /Circuitos sin asignar/, 'existe el pool arrastrable')
  assert.match(panel, /data-over/, 'el destino válido se resalta')
})

test('los tipos de diferencial llevan características verificables', () => {
  assert.deepEqual(Object.keys(DIFFERENTIAL_TYPE_INFO), ['AC', 'A', 'F', 'B', 'S'])
  assert.match(DIFFERENTIAL_TYPE_INFO.A.detecta, /pulsante/)
  assert.match(DIFFERENTIAL_TYPE_INFO.B.detecta, /continua/)
  assert.equal(DIFFERENTIAL_TYPE_INFO.F.hastaKhz, 1)
  assert.match(DIFFERENTIAL_TYPE_INFO.S.cargas, /cabecera/)
})

test('la curva usa tiempos normativos de ensayo, no estimaciones', () => {
  assert.deepEqual(DIFFERENTIAL_TRIP_TIMES.general, [
    { multiple: 1, ms: 300 },
    { multiple: 2, ms: 150 },
    { multiple: 5, ms: 40 },
  ])
  assert.equal(DIFFERENTIAL_TRIP_TIMES.selective.min[0].ms, 130)
  assert.equal(DIFFERENTIAL_TRIP_TIMES.selective.max[0].ms, 500)
  assert.match(DIFFERENTIAL_TRIP_TIMES.source, /61008|62423/)
})

test('la tabla de diferenciales ofrece el botón de tipos y su referencia', () => {
  const panel = read('components/interior-panel.tsx')
  assert.match(panel, /Ver tipos de diferenciales/, 'el botón vive junto al encabezado Tipo')
  assert.match(panel, /DifferentialTypesDialog/, 'el panel abre la referencia')
  const dialog = read('components/differential-types-dialog.tsx')
  assert.match(dialog, /DIFFERENTIAL_TYPE_INFO/, 'la tabla sale de la fuente compartida')
  assert.match(dialog, /DIFFERENTIAL_TRIP_TIMES/, 'la curva sale de la fuente compartida')
  assert.match(dialog, /<polyline/, 'se dibuja la envolvente de tiempos')
})

test('un proyecto antiguo migra su tipo único a un diferencial que cubre todos los circuitos', () => {
  const { devices, warnings } = normalizeDifferentials({ differentialType: 'A', circuitIds: basicIds, minimum: 1 })
  assert.equal(devices.length, 1)
  assert.equal(devices[0].id, 'D1')
  assert.equal(devices[0].type, 'A')
  assert.equal(devices[0].sensitivityMa, 30)
  assert.deepEqual(devices[0].circuits, basicIds)
  assert.deepEqual(warnings, [])
})

test('el tipo no declarado queda pendiente, nunca se inventa', () => {
  const { devices } = normalizeDifferentials({ circuitIds: basicIds, minimum: 1 })
  assert.equal(devices[0].type, null)
  assert.ok(DIFFERENTIAL_TYPES.includes('F'))
})

test('los diferenciales declarados nunca bajan del mínimo reglamentario', () => {
  const one = normalizeDifferentials({ circuitIds: elevatedIds, minimum: 2 })
  assert.equal(one.devices.length, 2, 'elevada con diez circuitos exige dos')

  const declared = normalizeDifferentials({
    differentials: [{ id: 'D1', type: 'A', sensitivityMa: 30, circuits: basicIds }],
    circuitIds: elevatedIds,
    minimum: 3,
  })
  assert.equal(declared.devices.length, 3, 'se completan hasta el mínimo')
  assert.deepEqual(declared.devices.map(device => device.id), ['D1', 'D2', 'D3'])
})

test('300 mA sólo vale para el diferencial selectivo de cabecera, sin circuitos propios', () => {
  const { devices, warnings } = normalizeDifferentials({
    differentials: [
      { id: 'D1', type: 'A', sensitivityMa: 300, selective: true, circuits: ['C1'] },
      { id: 'D2', type: 'A', sensitivityMa: 300, selective: false, circuits: ['C2'] },
    ],
    circuitIds: basicIds,
    minimum: 2,
  })
  assert.equal(devices[0].sensitivityMa, 300)
  assert.equal(devices[1].sensitivityMa, 30, 'una rama no puede tener 300 mA')
  assert.deepEqual(devices[0].circuits, [], 'el diferencial de cabecera no protege circuitos directamente')
  assert.deepEqual(devices[1].circuits, ['C2', 'C1'], 'C1 pasa al diferencial de 30 mA')
  assert.ok(warnings.some(warning => /cabecera|aguas arriba/i.test(warning)), 'se avisa de la regla')
  assert.ok(devices.some(device => device.sensitivityMa === 30), 'siempre queda protección de 30 mA')
  assert.ok(devices.find(device => device.circuits.includes('C1')).sensitivityMa === 30, 'C1 queda protegido a 30 mA')
})

test('un circuito pertenece a un solo diferencial', () => {
  const devices = [
    { id: 'D1', type: 'A', sensitivityMa: 30, selective: false, circuits: ['C1', 'C2'] },
    { id: 'D2', type: 'F', sensitivityMa: 30, selective: false, circuits: ['C3'] },
  ]
  const moved = assignCircuit(devices, 'D2', 'C2')
  assert.deepEqual(moved[0].circuits, ['C1'])
  assert.deepEqual(moved[1].circuits, ['C3', 'C2'])
  assert.deepEqual(devices[0].circuits, ['C1', 'C2'], 'no muta el original')
})

test('la recarga de vehículo eléctrico exige un diferencial dedicado y declaración explícita', () => {
  const circuitIds = [...basicIds, 'C13']
  const proposed = normalizeDifferentials({ circuitIds, minimum: 1 })
  const ev = proposed.devices.find(device => device.circuits.includes('C13'))
  assert.ok(ev, 'se propone un diferencial para C13')
  assert.equal(ev.type, 'A')
  assert.equal(ev.rdcDd, false)
  assert.ok(proposed.warnings.some(warning => /RDC-DD|tipo B/.test(warning)), 'aviso hasta declarar la protección')

  const withRdc = normalizeDifferentials({
    differentials: [
      { id: 'D1', type: 'A', sensitivityMa: 30, circuits: basicIds },
      { id: 'D2', type: 'A', sensitivityMa: 30, rdcDd: true, circuits: ['C13'] },
    ],
    circuitIds,
    minimum: 2,
  })
  assert.ok(!withRdc.warnings.some(warning => /RDC-DD|tipo B/.test(warning)))

  const typeB = normalizeDifferentials({
    differentials: [
      { id: 'D1', type: 'A', sensitivityMa: 30, circuits: basicIds },
      { id: 'D2', type: 'B', sensitivityMa: 30, circuits: ['C13'] },
    ],
    circuitIds,
    minimum: 2,
  })
  assert.ok(!typeB.warnings.some(warning => /RDC-DD|tipo B/.test(warning)))
})
