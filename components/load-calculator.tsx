'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import Link from 'next/link'
import { Check, ChevronRight, Download, FolderOpen, Info, Plus, RotateCcw, Trash2, Building2, X, Table2, SlidersHorizontal, FileText, FileJson, FileCode2, FileType, HelpCircle, ClipboardCheck, Moon, Sun } from 'lucide-react'
import { getSimultaneityCoefficient, ITC_BT_10_COEFFICIENTS } from '../lib/simultaneity.mjs'
import { HOUSING_POWER_STEPS } from '../lib/normative-tables.mjs'
import { METHODS } from '../lib/cable-tables.mjs'
import { clearProjectData, loadCalculatorInputs, opensWithExample, readProjectExport, saveCalculatorInputs, setClearedProjectMark } from '../lib/calculator-storage.mjs'
import { previewGaragePower, previewLightingPower, previewLocalPower, sumGaragePowers, sumLightingPowers, sumLocalPowers } from '../lib/load-previews.mjs'
import { ITA_POWER_KW, itaPowerW, largestMotorIncrement, sumServiceGeneralPowers } from '../lib/service-loads.mjs'
import { buildMarkdownReport, buildPlainTextReport } from '../lib/export-formats.mjs'
import { limitsForInstallation } from '../lib/installation-config.mjs'
import { DEFAULT_METER_CENTER, ASSEMBLY_LABELS, CABINET_LABELS, FLOOR_LABELS, PLACEMENT_LABELS, evaluateMeterCenter, installationTypeFor, meterCenterFromInstallationType, suggestMeterCount } from '../lib/meter-center.mjs'
import { MeterCenterCard, type MeterCenterState } from '@/components/meter-center-card'
import { InteriorPanel, type InteriorDwelling } from '@/components/interior-panel'
import { InteriorCircuitsPanel, type CircuitRow, type CircuitSupply } from '@/components/interior-circuits-panel'
import { evaluateInterior, resolveInterior } from '../lib/interior-installation.mjs'
import { CIRCUIT_USE_LABELS, evaluateBoard, sizeInteriorCircuit } from '../lib/interior-circuits.mjs'
import { housingCircuitSizing, housingCircuitsFor } from '../lib/housing-circuits.mjs'
import { POINT_CIRCUITS, ROOM_LABELS, totalPoints } from '../lib/housing-points.mjs'
import { explainLineCalculation, explainLoadForecast, explainMeterCenter } from '../lib/calculation-explanations.mjs'
import { CalculationSteps, type ExplanationStep } from '@/components/calculation-steps'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { nextTheme, resolveInitialTheme, THEME_STORAGE_KEY, toggleLabel, type Theme } from '../lib/theme.mjs'
import { EXPLANATION_MODE_STORAGE_KEY, explanationModeLabel, resolveExplanationMode } from '../lib/explanation-mode.mjs'
import { PDF_COLORS } from '../lib/pdf-theme.mjs'
import { displayPower, formatPower, formatPowerValue, isPowerUnit, powerFieldValue, storePower } from '../lib/power-units.mjs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FieldLegend, FieldLabel, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { computeLine, DiPanel, LgaPanel, LineTablesDialog, type ExplanationMode, type LineState, type TableKey } from '@/components/line-modules'
import { buildDerivations, calculateProject, syncDerivationPowers } from '../lib/project-model.mjs'
import { lgaNeutralSection, protectiveSection } from '../lib/conductor-sections.mjs'
import { LGA_INSULATION, defaultLineState } from '../lib/line-state.mjs'
import { BoeLink, BOE_ITC_BT_52, BOE_REBT, GUIA_BT_52, SourceNote } from '@/components/source-note'
import { Elec3PreviewDialog } from '@/components/elec3-preview'
import { UnifilarPanel } from '@/components/unifilar-panel'

type ProjectInfo = {
  companyName: string
  companyAddress: string
  workAddress: string
  phone: string
  email: string
  logo: string
}

type HousingRow = { level: 'Básica' | 'Elevada'; power: number; homes: number; area: number }
/** A select option: a plain string, or a value with its own printed label. */
type ChoiceItem = string | { value: string; label: string }
type LocalRow = { name: string; type: 'Comercial/oficina' | 'Industria'; area: number; real: number }
type GarageRow = { name: string; ventilation: 'Forzada' | 'Natural'; area: number; plazas: number }
type ElevatorRow = { name: string; ita: 'ITA-1' | 'ITA-2' | 'ITA-3' | 'ITA-4' | 'ITA-5' | 'ITA-6'; power: number; unit: 'W' | 'CV' }

// ITA types from ITC-BT 10 table
const ITA_TYPES = [
  { type: 'ITA-1', carga: 400, personas: 5, velocidad: 0.63, potencia: ITA_POWER_KW['ITA-1'] },
  { type: 'ITA-2', carga: 400, personas: 5, velocidad: 1, potencia: ITA_POWER_KW['ITA-2'] },
  { type: 'ITA-3', carga: 630, personas: 8, velocidad: 1, potencia: ITA_POWER_KW['ITA-3'] },
  { type: 'ITA-4', carga: 630, personas: 8, velocidad: 1.6, potencia: ITA_POWER_KW['ITA-4'] },
  { type: 'ITA-5', carga: 1000, personas: 13, velocidad: 1.6, potencia: ITA_POWER_KW['ITA-5'] },
  { type: 'ITA-6', carga: 1000, personas: 13, velocidad: 2.5, potencia: ITA_POWER_KW['ITA-6'] },
] as const
type MotorRow = { name: string; power: number; unit: 'W' | 'CV' }
type OtherLoadRow = { name: string; power: number }
type LightingId = 'portal' | 'stair' | 'known'
type LightingRow = { id: LightingId; area: number; lamp: 'Incandescencia' | 'Fluorescencia/LED'; power: number }
type DerivationKind = 'dwelling' | 'local' | 'common-services' | 'garage' | 'irve' | 'custom'
type Derivation = LineState & { id: string; kind: DerivationKind; label: string; sourceKey: string | null; system: 'single-phase' | 'three-phase'; housingAreaM2?: number; interior?: { contractedPowerW: number; circuits: number; hasSurge: boolean }; interiorCircuits?: Array<{ id: string; description: string; use: 'alumbrado' | 'otros'; powerW: number; lengthM: number }> }
const DERIVATION_LABELS: Record<DerivationKind, string> = { dwelling: 'Vivienda', local: 'Local', 'common-services': 'Servicios generales', garage: 'Garaje', irve: 'IRVE', custom: 'Manual' }
type PdfExplanationStep = {
  id: string
  title: string
  kind: 'table' | 'formula' | 'selection' | 'text' | 'list'
  rows?: Array<{ label?: string; value?: string; section?: number; reason?: string }>
  formula?: string
  substitution?: string
  result?: string
  note?: string
  criterion?: string
  text?: string
  items?: string[]
}
type CalculationSettings = {
  basicHousingPower: number
  elevatedHousingPower: number
  localPowerPerM2: number
  industrialPowerPerM2: number
  minimumSupplyPower: number
  industrialMinimumSupplyPower: number
  forcedGaragePowerPerM2: number
  naturalGaragePowerPerM2: number
  elevatorCoefficient: number
  motorCoefficient: number
  evChargerPower: number
  cvToWatts: number
  portalLightPowerPerM2: number
  portalLightLedPowerPerM2: number
  stairLightPowerPerM2: number
  stairLightLedPowerPerM2: number
  dischargeLampCoefficient: number
  showSourceNotes: boolean
  /** Unidad con la que se escriben y se ven las potencias; el motor trabaja en vatios. */
  powerUnit: 'W' | 'kW'
}

const defaultSettings: CalculationSettings = {
  basicHousingPower: 5750,
  elevatedHousingPower: 9200,
  localPowerPerM2: 100,
  industrialPowerPerM2: 125,
  minimumSupplyPower: 3450,
  industrialMinimumSupplyPower: 10350,
  forcedGaragePowerPerM2: 20,
  naturalGaragePowerPerM2: 10,
  elevatorCoefficient: 1.3,
  motorCoefficient: 1.25,
  evChargerPower: 3680,
  cvToWatts: 735.5,
  portalLightPowerPerM2: 15,
  portalLightLedPowerPerM2: 8,
  stairLightPowerPerM2: 7,
  stairLightLedPowerPerM2: 4,
  dischargeLampCoefficient: 1.8,
  showSourceNotes: true,
  powerUnit: 'W',
}

const LIGHTING_LABELS: Record<LightingId, string> = {
  portal: 'Portal y espacios comunes',
  stair: 'Caja de escalera',
  known: 'Potencia instalada conocida',
}

const emptyLighting: LightingRow[] = (['portal', 'stair', 'known'] as const).map(id => ({
  id,
  area: 0,
  lamp: 'Fluorescencia/LED' as const,
  power: 0,
}))

const exampleLighting: LightingRow[] = emptyLighting.map(row => (
  row.id === 'known' ? { ...row, power: 1500 } : row
))

const initialHousing: HousingRow[] = [
  ...Array.from({ length: 8 }, (): HousingRow => ({ level: 'Básica', power: 5750, homes: 1, area: 90 })),
  ...Array.from({ length: 3 }, (): HousingRow => ({ level: 'Elevada', power: 9200, homes: 1, area: 130 })),
]
const exampleLocals: LocalRow[] = [
  { name: 'Local 1', type: 'Comercial/oficina', area: 50, real: 0 },
  { name: 'Local 2', type: 'Comercial/oficina', area: 30, real: 0 },
]
const exampleGarages: GarageRow[] = [
  { name: 'Garaje 1', ventilation: 'Forzada', area: 240, plazas: 12 },
  { name: 'Garaje 2', ventilation: 'Natural', area: 0, plazas: 0 },
]
const fmt = (value: number, digits = 0) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
const fmtDec = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)
/**
 * Potencias de vivienda: los escalones fijos de la tabla A de la ITC-BT-25
 * según el grado elegido. Un proyecto guardado con una cifra antigua conserva
 * su valor como una opción más, para no cambiarlo a sus espaldas.
 */
const housingPowerItems = (level: HousingRow['level'], current: number, unit: 'W' | 'kW'): ChoiceItem[] => {
  const steps = HOUSING_POWER_STEPS.filter(([grade]) => grade === level).map(([, watts]) => Number(watts))
  const items: ChoiceItem[] = steps.map(watts => ({ value: String(watts), label: formatPower(watts, unit) }))
  return steps.includes(current) ? items : [...items, { value: String(current), label: formatPower(current, unit) }]
}
const NORM_BY_TAB: Record<'cargas' | 'lga' | 'di' | 'interiores' | 'esquema', string> = { cargas: 'ITC-BT-10', lga: 'ITC-BT-14', di: 'ITC-BT-15', interiores: 'ITC-BT-25 / 19', esquema: 'ITC-BT-14 / 15 / 25' }
const roomLabel = (type: string) => ROOM_LABELS[type as keyof typeof ROOM_LABELS] ?? type
const INSTALLATION_LABELS: Record<string, string> = {
  centralized: 'Contadores totalmente centralizados',
  partial: 'Contadores en más de un lugar',
  'single-user': 'Único usuario sin LGA',
}
// Orden de los módulos: decide hacia dónde entra el panel al cambiar de pestaña.
const TAB_ORDER = ['cargas', 'lga', 'di', 'interiores', 'esquema'] as const
type TabValue = (typeof TAB_ORDER)[number]
const IRVE_OPTION_LABELS = ['Todas las plazas · sin SPL', 'Todas las plazas · con SPL', 'Mínimo 10 % de plazas']

export function LoadCalculator() {
  const [housing, setHousing] = useState<HousingRow[]>([])
  const [locals, setLocals] = useState<LocalRow[]>([])
  const [garages, setGarages] = useState<GarageRow[]>([])
  const [elevators, setElevators] = useState<ElevatorRow[]>([])
  const [motors, setMotors] = useState<MotorRow[]>([])
  const [otherLoads, setOtherLoads] = useState<OtherLoadRow[]>([])
  const [lighting, setLighting] = useState<LightingRow[]>(emptyLighting)
  const [parking, setParking] = useState(0)
  const [irveOption, setIrveOption] = useState(1)
  const [activeTab, setActiveTab] = useState<TabValue>('cargas')
  const [tabDirection, setTabDirection] = useState<'forward' | 'back'>('forward')
  const [meterCenter, setMeterCenter] = useState<MeterCenterState>({ ...DEFAULT_METER_CENTER })
  const [theme, setTheme] = useState<Theme>('light')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('calculation')
  const [showLineTables, setShowLineTables] = useState(false)
  const [lineTableFocus, setLineTableFocus] = useState<TableKey[] | null>(null)
  const [lineTouched, setLineTouched] = useState(false)
  const [lga, setLga] = useState<LineState>(defaultLineState('lga'))
  const [di, setDi] = useState<LineState>(defaultLineState('di'))
  const [derivations, setDerivations] = useState<Derivation[]>([])
  const [selectedDerivationId, setSelectedDerivationId] = useState<string | null>(null)
  const [selectedDwellingId, setSelectedDwellingId] = useState<string | null>(null)
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null)
  const [lgaPowerMode, setLgaPowerMode] = useState<'auto' | 'manual'>('auto')
  const openLineTables = (tables?: TableKey[]) => { setLineTableFocus(tables ?? null); setShowLineTables(true) }
  const updateLga = (patch: Partial<LineState>) => { setLineTouched(true); if ('powerW' in patch) setLgaPowerMode('manual'); setLga(current => ({ ...current, ...patch })) }
  const changeLgaPowerMode = (mode: 'auto' | 'manual') => { setLgaPowerMode(mode); setLineTouched(true) }
  const updateDi = (patch: Partial<LineState>) => { setLineTouched(true); setDi(current => ({ ...current, ...patch })) }
  const toggleTheme = () => {
    const next = nextTheme(theme)
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try { window.localStorage.setItem(THEME_STORAGE_KEY, next) } catch { /* keep the choice in memory */ }
  }
  const changeExplanationMode = (next: ExplanationMode) => {
    setExplanationMode(next)
    document.documentElement.dataset.explanationMode = next
    try { window.localStorage.setItem(EXPLANATION_MODE_STORAGE_KEY, next) } catch { /* keep the choice in memory */ }
  }
  // El panel entra desde el lado hacia el que viaja el indicador.
  const changeTab = (next: TabValue) => {
    setTabDirection(TAB_ORDER.indexOf(next) >= TAB_ORDER.indexOf(activeTab) ? 'forward' : 'back')
    setActiveTab(next)
  }
  const [showReferences, setShowReferences] = useState(false)
  const [showDownload, setShowDownload] = useState(false)
  const [showElec3, setShowElec3] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const [showItaTable, setShowItaTable] = useState(false)
  const [showSimultaneityTable, setShowSimultaneityTable] = useState(false)
  const [settings, setSettings] = useState<CalculationSettings>(defaultSettings)
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({ companyName: '', companyAddress: '', workAddress: '', phone: '', email: '', logo: '' })
  const [storageLoaded, setStorageLoaded] = useState(false)
  const powerUnit = settings.powerUnit
  const power = (watts: number) => formatPower(watts, powerUnit)
  const powerValue = (watts: number) => formatPowerValue(watts, powerUnit)
  const projectFileInput = useRef<HTMLInputElement>(null)
  const [projectLoad, setProjectLoad] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null)

  // El edificio de ejemplo es el punto de partida de un proyecto nuevo: la primera
  // visita nunca se encuentra la calculadora en ceros. «Limpiar» deja una marca para
  // que ese vaciado deliberado sobreviva a la recarga.
  const reset = () => { setClearedProjectMark(window.localStorage, false); setHousing(initialHousing); setLocals(exampleLocals); setGarages(exampleGarages); setElevators([{ name: 'Ascensor 1', ita: 'ITA-1', power: itaPowerW('ITA-1'), unit: 'W' }]); setMotors([{ name: 'Motor 1', power: 1, unit: 'CV' }]); setOtherLoads([]); setLighting(exampleLighting); setMeterCenter({ ...DEFAULT_METER_CENTER }); setLga(current => ({ ...current, maxDropPercent: 0.5, sectionOverride: 0 })); setDi(current => ({ ...current, maxDropPercent: 1, sectionOverride: 0 })); setParking(30); setIrveOption(3); setDerivations([]); setLgaPowerMode('auto') }

  useEffect(() => {
    let stored: string | null = null
    try { stored = window.localStorage.getItem(THEME_STORAGE_KEY) } catch { /* storage can be unavailable */ }
    const applied = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    const initial = resolveInitialTheme(stored ?? applied)
    setTheme(initial)
    document.documentElement.classList.toggle('dark', initial === 'dark')
  }, [])

  useEffect(() => {
    let stored: string | null = null
    try { stored = window.localStorage.getItem(EXPLANATION_MODE_STORAGE_KEY) } catch { /* storage can be unavailable */ }
    const initial = resolveExplanationMode(stored) as ExplanationMode
    setExplanationMode(initial)
    document.documentElement.dataset.explanationMode = initial
  }, [])

  useEffect(() => {
    let restored = false
    try {
      const savedInputs = loadCalculatorInputs(window.localStorage)
      if (savedInputs) {
        restored = true
        setHousing(savedInputs.housing)
        setLocals(savedInputs.locals)
        setGarages(savedInputs.garages)
        setElevators(savedInputs.elevators)
        setMotors(savedInputs.motors)
        setOtherLoads(savedInputs.otherLoads)
        if (savedInputs.lighting) setLighting(savedInputs.lighting)
        if (savedInputs.meterCenter) setMeterCenter(savedInputs.meterCenter as MeterCenterState)
        else setMeterCenter(meterCenterFromInstallationType(savedInputs.installationType) as MeterCenterState)
        setParking(savedInputs.parking)
        setIrveOption(savedInputs.irveOption)
        if (savedInputs.lga) { setLga(savedInputs.lga as LineState); setLineTouched(true) }
        if (savedInputs.lgaPowerMode) setLgaPowerMode(savedInputs.lgaPowerMode)
        if (savedInputs.di) { setDi(savedInputs.di as LineState); setLineTouched(true) }
        if (savedInputs.derivations) { setDerivations(savedInputs.derivations as Derivation[]); setSelectedDerivationId((savedInputs.derivations as Derivation[])[0]?.id ?? null) }
      }
    } catch { /* Local storage may be unavailable in private browsing. */ }

    try {
      const saved = window.localStorage.getItem('electrocalc-settings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setSettings({ ...defaultSettings, ...parsed, powerUnit: isPowerUnit(parsed.powerUnit) ? parsed.powerUnit : 'W' })
        } catch { window.localStorage.removeItem('electrocalc-settings') }
      }
    } catch { /* Keep default calculation parameters when storage is unavailable. */ }

    try {
      const savedProject = window.localStorage.getItem('electrocalc-project-info')
      if (savedProject) {
        try { setProjectInfo({ companyName: '', companyAddress: '', workAddress: '', phone: '', email: '', logo: '', ...JSON.parse(savedProject) }) } catch { window.localStorage.removeItem('electrocalc-project-info') }
      }
    } catch { /* Keep project information empty when storage is unavailable. */ }

    // Sin proyecto guardado y sin un vaciado deliberado: se abre con el edificio de
    // ejemplo, que es el documento de trabajo de referencia. Así la primera pantalla
    // enseña números y citas reales en vez de una tabla de ceros.
    if (opensWithExample(window.localStorage, restored)) reset()

    setStorageLoaded(true)
  }, [])

  useEffect(() => {
    if (!storageLoaded) return
    try { window.localStorage.setItem('electrocalc-settings', JSON.stringify(settings)) } catch { /* Storage failure does not block calculator use. */ }
  }, [settings, storageLoaded])

  useEffect(() => {
    if (!storageLoaded) return
    try {
      if (Object.values(projectInfo).every(value => !value)) {
        window.localStorage.removeItem('electrocalc-project-info')
        return
      }
      window.localStorage.setItem('electrocalc-project-info', JSON.stringify(projectInfo))
    } catch { /* Storage failure does not block calculator use. */ }
  }, [projectInfo, storageLoaded])

  const updateProjectInfo = (key: keyof ProjectInfo, value: string) => setProjectInfo(current => ({ ...current, [key]: value }))
  const handleLogo = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.addEventListener('load', () => updateProjectInfo('logo', String(reader.result)))
    reader.readAsDataURL(file)
  }

  const updateSetting = (key: keyof CalculationSettings, value: number) => setSettings(current => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }))

  const result = useMemo(() => {
    const homes = housing.reduce((sum, row) => sum + Math.max(0, row.homes), 0)
    const housingPower = housing.reduce((sum, row) => sum + row.power * Math.max(0, row.homes), 0)
    const average = homes ? housingPower / homes : 0
    const cs = getSimultaneityCoefficient(homes)
    const p1 = average * cs
    const toWatts = (power: number, unit: 'W' | 'CV') => unit === 'CV' ? power * settings.cvToWatts : power
    const elevatorPower = elevators.reduce((sum, row) => sum + toWatts(row.power, row.unit), 0)
    const motorPowers = motors.map(row => toWatts(row.power, row.unit))
    const motorPower = motorPowers.reduce((sum, power) => sum + Math.max(0, power || 0), 0)
    const largestMotorPower = motorPowers.reduce((max, power) => Math.max(max, power || 0), 0)
    const otherPower = otherLoads.reduce((sum, row) => sum + Math.max(0, row.power), 0)
    const lightingPower = sumLightingPowers(lighting, settings)
    const p2 = sumServiceGeneralPowers({ elevatorPower, motorPowers, otherPower, lightingPower }, settings)
    const motorIncrement = largestMotorIncrement(motorPowers, settings.motorCoefficient)
    const localPowers = locals.map(row => previewLocalPower(row, settings))
    const garagePowers = garages.map(row => previewGaragePower(row, settings))
    const p3 = sumLocalPowers(locals, settings)
    const p4 = sumGaragePowers(garages, settings)
    const irveCs = irveOption === 2 ? 0.3 : 1
    const plazas = irveOption === 3 ? Math.max(1, Math.ceil(parking * 0.1)) : parking
    const p5 = plazas * settings.evChargerPower * irveCs
    return {
      homes, housingPower, average, cs, p1, p2, p3, p4, p5, total: p1 + p2 + p3 + p4 + p5,
      plazas, lightingPower, motorIncrement, elevatorPower, motorPower, largestMotorPower, otherPower, localPowers, garagePowers, irveCs,
    }
  }, [housing, locals, garages, elevators, motors, otherLoads, lighting, parking, irveOption, settings])

  // La centralización de contadores manda sobre el supuesto de enlace.
  const suggestedMeters = useMemo(() => suggestMeterCount({
    dwellings: result.homes,
    locals: locals.length,
    hasCommonServices: result.p2 > 0,
    hasIrve: parking > 0,
  }), [result.homes, result.p2, locals.length, parking])
  const effectiveMeterCenter = useMemo(
    () => ({ ...meterCenter, meters: meterCenter.meters ?? suggestedMeters }),
    [meterCenter, suggestedMeters],
  )
  const installationType = useMemo(() => installationTypeFor(effectiveMeterCenter), [effectiveMeterCenter])
  const meterEvaluation = useMemo(
    () => evaluateMeterCenter(effectiveMeterCenter, { powerW: result.total }),
    [effectiveMeterCenter, result.total],
  )
  const meterExplanation = useMemo(
    () => explainMeterCenter(effectiveMeterCenter, meterEvaluation),
    [effectiveMeterCenter, meterEvaluation],
  )

  const dwellingDerivations = useMemo(() => derivations.filter(derivation => derivation.kind === 'dwelling'), [derivations])
  const effectiveDwellingId = selectedDwellingId != null && dwellingDerivations.some(derivation => derivation.id === selectedDwellingId)
    ? selectedDwellingId
    : dwellingDerivations[0]?.id ?? null
  const interiorDwellings: InteriorDwelling[] = useMemo(
    () => dwellingDerivations.map(derivation => ({
      id: derivation.id,
      label: derivation.label,
      powerW: derivation.powerW,
      housingIgaA: derivation.housingIgaA,
      housingAreaM2: derivation.housingAreaM2,
      interior: derivation.interior,
    })),
    [dwellingDerivations],
  )
  const updateDerivationInterior = (id: string, patch: Partial<{ contractedPowerW: number; circuits: number; hasSurge: boolean; lengths: Record<string, number>; rooms: Array<{ id: string; type: string; area: number; length: number }>; hasHeating: boolean; hasCooling: boolean; hasDryer: boolean }>) => {
    setLineTouched(true)
    setDerivations(current => current.map(derivation => derivation.id === id
      ? { ...derivation, interior: { ...resolveInterior(derivation.powerW, derivation.interior), ...patch } }
      : derivation))
  }

  const circuitSupplies: CircuitSupply[] = useMemo(
    () => derivations.filter(derivation => derivation.kind !== 'dwelling').map(derivation => ({
      id: derivation.id,
      label: derivation.label,
      system: derivation.system,
      powerW: derivation.powerW,
      method: derivation.method,
      insulation: derivation.insulation,
      installation: derivation.installation,
      layout: derivation.layout,
      circuits: derivation.interiorCircuits ?? [],
    })),
    [derivations],
  )
  const effectiveSupplyId = selectedSupplyId != null && circuitSupplies.some(supply => supply.id === selectedSupplyId)
    ? selectedSupplyId
    : circuitSupplies[0]?.id ?? null
  const updateDerivationCircuits = (id: string, circuits: CircuitRow[]) => {
    setLineTouched(true)
    setDerivations(current => current.map(derivation => derivation.id === id ? { ...derivation, interiorCircuits: circuits } : derivation))
  }

  const updateMeterCenter = (patch: Partial<MeterCenterState>) => {
    const next = { ...meterCenter, ...patch }
    // La colocación manda sobre el conjunto: individual solo admite CPM y una
    // concentración no puede resolverse con una CPM.
    if (patch.placement === 'individual') next.assembly = 'cpm'
    else if (patch.placement === 'concentrated' && next.assembly === 'cpm') next.assembly = 'local'
    setMeterCenter(next)
    const type = installationTypeFor({ ...next, meters: next.meters ?? suggestedMeters })
    if (type === installationType) return
    const limits = limitsForInstallation(type)
    setLineTouched(true)
    if (limits.lga != null) setLga(current => ({ ...current, maxDropPercent: limits.lga as number }))
    setDi(current => ({ ...current, maxDropPercent: limits.di }))
    setDerivations(current => current.map(derivation => ({ ...derivation, maxDropPercent: limits.di })))
  }

  useEffect(() => {
    if (!storageLoaded) return
    try {
      saveCalculatorInputs(window.localStorage, {
        housing, locals, garages, elevators, motors, otherLoads, lighting, installationType, meterCenter, parking, irveOption,
        lga: lineTouched ? lga : null,
        lgaPowerMode,
        di: lineTouched ? di : null,
        derivations: derivations.length > 0 ? derivations : undefined,
      })
    } catch { /* Storage failure does not block calculator use. */ }
  }, [storageLoaded, housing, locals, garages, elevators, motors, otherLoads, lighting, installationType, meterCenter, parking, irveOption, lga, lgaPowerMode, di, derivations, lineTouched])

  // Recuento informativo: las plazas de los garajes no intervienen en P4.
  const garageParkingSpaces = garages.reduce((sum, row) => sum + Math.max(0, row.plazas || 0), 0)
  // Superficie construida informativa: la superficie por vivienda no interviene en P1.
  const dwellingArea = housing.reduce((sum, row) => sum + Math.max(0, row.area || 0) * Math.max(0, row.homes), 0)

  const loadExplanation = useMemo(
    () => explainLoadForecast({ housing, locals, garages, elevators, motors, otherLoads, lighting, parking, irveOption }, result, settings),
    [housing, locals, garages, elevators, motors, otherLoads, lighting, parking, irveOption, result, settings],
  )

  const project = useMemo(
    () => calculateProject({ loadTotal: result.total, lga, lgaPowerMode, derivations }),
    [result.total, lga, lgaPowerMode, derivations],
  )
  const calculatedDerivations = project.derivations as Array<Derivation & { result: ReturnType<typeof computeLine> }>

  useEffect(() => {
    if (lgaPowerMode !== 'auto') return
    // La previsión arrastra decimales de coeficientes; la LGA se dimensiona con la
    // potencia entera que se ve en pantalla, no con 194.675,73863636365 W.
    const watts = Math.round(result.total)
    setLga(current => current.powerW === watts ? current : { ...current, powerW: watts })
  }, [result.total, lgaPowerMode])

  const generateDerivations = () => {
    const next = buildDerivations({ housing, locals, garages, parking, irveOption }, result, di) as Derivation[]
    setDerivations(next)
    setSelectedDerivationId(next[0]?.id ?? null)
  }

  const updateDerivation = (id: string, patch: Partial<Derivation>) => {
    setDerivations(current => current.map(derivation => derivation.id === id ? { ...derivation, ...patch } : derivation))
  }

  const selectedDerivation = derivations.find(derivation => derivation.id === selectedDerivationId) ?? null
  const selectedState = selectedDerivation ?? di
  const selectedSystem = selectedDerivation?.system ?? 'single-phase'
  const updateSelectedDerivation = (patch: Partial<LineState>) => {
    if (selectedDerivation) updateDerivation(selectedDerivation.id, patch)
    else updateDi(patch)
  }

  useEffect(() => {
    setDerivations(current => syncDerivationPowers(current, { housing, locals, garages, parking, irveOption }, result))
  }, [housing, locals, garages, parking, irveOption, result])

  const clear = () => {
    try { clearProjectData(window.localStorage) } catch { /* In-memory reset still applies when storage is unavailable. */ }
    setClearedProjectMark(window.localStorage, true)
    setHousing([])
    setLocals([])
    setGarages([])
    setElevators([])
    setMotors([])
    setOtherLoads([])
    setLighting(emptyLighting)
    setMeterCenter({ ...DEFAULT_METER_CENTER })
    setParking(0)
    setIrveOption(1)
    setDerivations([])
    setSelectedDerivationId(null)
    setSelectedDwellingId(null)
    setSelectedSupplyId(null)
    // The trimmed lines return to their defaults and leave the snapshot, so a
    // cleared project cannot reopen with the previous lengths and overrides.
    setLga(defaultLineState('lga'))
    setDi(defaultLineState('di'))
    setLineTouched(false)
    setLgaPowerMode('auto')
    setProjectInfo({ companyName: '', companyAddress: '', workAddress: '', phone: '', email: '', logo: '' })
  }

  /**
   * Replaces the whole project with the one the file describes. `readProjectExport`
   * validated the file as a whole, so nothing here can be applied halfway.
   */
  const applyProject = (inputs: NonNullable<ReturnType<typeof loadCalculatorInputs>>, info: ProjectInfo) => {
    // A loaded project is not an emptied one: the mark that keeps «Limpiar» across
    // a reload has to retire, or a reload would reopen the example instead.
    setClearedProjectMark(window.localStorage, false)
    setHousing(inputs.housing)
    setLocals(inputs.locals)
    setGarages(inputs.garages)
    setElevators(inputs.elevators)
    setMotors(inputs.motors)
    setOtherLoads(inputs.otherLoads)
    setLighting(inputs.lighting ?? emptyLighting)
    setMeterCenter((inputs.meterCenter ?? meterCenterFromInstallationType(inputs.installationType)) as MeterCenterState)
    setParking(inputs.parking)
    setIrveOption(inputs.irveOption)
    if (inputs.lga) setLga(inputs.lga as LineState)
    if (inputs.lgaPowerMode) setLgaPowerMode(inputs.lgaPowerMode)
    if (inputs.di) setDi(inputs.di as LineState)
    // The lines only reach the snapshot once they count as part of the project.
    setLineTouched(inputs.lga != null || inputs.di != null)
    setDerivations((inputs.derivations ?? []) as Derivation[])
    setSelectedDerivationId(inputs.derivations?.[0]?.id ?? null)
    setProjectInfo(info)
  }

  const loadProjectFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.addEventListener('error', () => setProjectLoad({ kind: 'error', message: 'No se pudo leer el archivo.' }))
    reader.addEventListener('load', () => {
      const parsed = readProjectExport(String(reader.result ?? ''))
      if (!parsed.ok) {
        setProjectLoad({ kind: 'error', message: parsed.error })
        return
      }
      applyProject(parsed.project.inputs, parsed.project.projectInfo)
      setProjectLoad({ kind: 'ok', message: `Proyecto cargado desde ${file.name}. Se reemplazó el proyecto anterior.` })
    })
    reader.readAsText(file)
  }

  const lgaResult = useMemo(() => computeLine(lga, 'three-phase', 'lga'), [lga])
  const diResult = useMemo(() => computeLine(di, 'single-phase', 'di'), [di])
  // ITC-BT-14 tabla 1 and ITC-BT-18 tabla 2 derive these from the phase
  // section, so the report can never print a neutral thinner than the norm.
  const lgaNeutral = lgaNeutralSection(lgaResult.finalSection) ?? lga.neutralSection
  const lgaProtective = lgaResult.finalSection == null ? lga.peSection : protectiveSection(lgaResult.finalSection)
  const lgaExplanation = useMemo(() => explainLineCalculation(lga, lgaResult, { system: 'three-phase', line: 'lga', powerUnit }), [lga, lgaResult, powerUnit])
  const diExplanation = useMemo(() => explainLineCalculation(di, diResult, { system: 'single-phase', line: 'di', powerUnit }), [di, diResult, powerUnit])

  const downloadFile = (extension: string, mime: string, content: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prevision-cargas-${new Date().toISOString().slice(0, 10)}.${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const housingCircuitReportRows = () => interiorDwellings.flatMap(dwelling => housingCircuitsFor(dwelling.powerW, { hasIrve: parking > 0 }).map(circuit => {
    const lengthM = dwelling.interior?.lengths?.[circuit.id] ?? 0
    const sizing = housingCircuitSizing(circuit, lengthM)
    return [
      dwelling.label,
      `${circuit.id} · ${circuit.name}`,
      circuit.breakerA == null ? '—' : `${circuit.breakerA} A`,
      sizing.section == null ? '—' : `${sizing.section} mm²`,
      `${fmt(lengthM, 1)} m`,
      sizing.dropPercent == null ? '—' : `${fmt(sizing.dropPercent, 2)} %`,
    ]
  }))

  const housingRoomReportRows = () => interiorDwellings.flatMap(dwelling => {
    const interior = resolveInterior(dwelling.powerW, dwelling.interior)
    return (interior.rooms ?? []).map(room => [
      dwelling.label,
      roomLabel(room.type),
      `${fmt(room.area, 1)} m²`,
      `${fmt(room.length, 1)} m`,
    ])
  })

  const housingPointReportRows = () => interiorDwellings.map(dwelling => {
    const interior = resolveInterior(dwelling.powerW, dwelling.interior)
    const points = totalPoints(interior.rooms ?? [], {
      hasHeating: interior.hasHeating,
      hasCooling: interior.hasCooling,
      hasDryer: interior.hasDryer,
      hasIrve: parking > 0,
    })
    return [dwelling.label, ...POINT_CIRCUITS.map(circuit => String(points.totals[circuit])), String(points.totalPoints)]
  })

  const buildReport = () => ({
    title: 'Informe de previsión de cargas',
    subtitle: 'ITC-BT-10 · REBT',
    generatedAt: new Date(),
    project: [
      { label: 'Empresa', value: projectInfo.companyName || '—' },
      { label: 'Dirección de empresa', value: projectInfo.companyAddress || '—' },
      { label: 'Teléfono', value: projectInfo.phone || '—' },
      { label: 'Correo electrónico', value: projectInfo.email || '—' },
      { label: 'Dirección de obra', value: projectInfo.workAddress || '—' },
    ],
    totals: [
      { code: 'P1', label: 'Viviendas', value: result.p1 },
      { code: 'P2', label: 'Servicios generales', value: result.p2 },
      { code: 'P3', label: 'Locales, oficinas e industrias', value: result.p3 },
      { code: 'P4', label: 'Garajes', value: result.p4 },
      { code: 'P5', label: 'IRVE', value: result.p5 },
      { code: 'TOTAL', label: 'Potencia total prevista', value: result.total },
    ],
    sections: [
      {
        title: '1. Viviendas',
        columns: ['Vivienda', 'Electrificación', `Potencia (${powerUnit})`, 'Superficie (m²/viv.)', 'Unidades', `Subtotal (${powerUnit})`],
        rows: housing.map((row, index) => [`Vivienda ${index + 1}`, row.level, fmt(row.power), fmt(row.area || 0), row.homes, fmt(row.power * row.homes)]),
      },
      {
        title: '2. Servicios generales',
        columns: ['Descripción', 'Tipo', 'Potencia'],
        rows: [
          ...elevators.map(row => [row.name, row.ita, `${power(row.unit === 'CV' ? row.power * settings.cvToWatts : row.power)}`]),
          ...motors.map(row => [row.name, 'Motor', `${power(row.unit === 'CV' ? row.power * settings.cvToWatts : row.power)}`]),
          ['Incremento del motor mayor', `×${fmtDec(settings.motorCoefficient)}`, `${power(result.motorIncrement)}`],
          ...otherLoads.map(row => [row.name, 'Otra carga', `${power(row.power)}`]),
          ...lighting.filter(row => previewLightingPower(row, settings) > 0).map(row => [LIGHTING_LABELS[row.id], row.lamp, `${power(previewLightingPower(row, settings))}`]),
          ['Subtotal alumbrado', '—', `${power(result.lightingPower)}`],
        ],
      },
      {
        title: '3. Locales y oficinas',
        columns: ['Descripción', 'Tipo', 'Superficie', 'Previsión'],
        rows: locals.map(row => [row.name, row.type, `${row.area} m²`, `${powerValue(previewLocalPower(row, settings))} W`]),
      },
      {
        title: '4. Garajes',
        columns: ['Descripción', 'Ventilación', 'Superficie', 'Previsión'],
        rows: garages.map(row => [row.name, row.ventilation, `${row.area} m²`, `${powerValue(previewGaragePower(row, settings))} W`]),
      },
      {
        title: '5. IRVE',
        columns: ['Concepto', 'Valor'],
        rows: [
          ['Plazas de aparcamiento', fmt(parking)],
          ['Opción de cálculo', IRVE_OPTION_LABELS[irveOption - 1]],
          ['Plazas consideradas', fmt(result.plazas)],
          ['Factor de simultaneidad', fmtDec(irveOption === 2 ? 0.3 : 1)],
          ['P5', `${power(result.p5)}`],
        ],
      },
      {
        title: '6. Centralización de contadores (ITC-BT-16)',
        columns: ['Concepto', 'Valor'],
        rows: [
          ['Forma de colocación', PLACEMENT_LABELS[meterCenter.placement]],
          ['Contadores', fmt(effectiveMeterCenter.meters)],
          ['Concentraciones', fmt(meterCenter.concentrations)],
          ['Conjunto de medida', ASSEMBLY_LABELS[meterCenter.assembly]],
          ...(meterCenter.assembly === 'armario' ? [['Tipo de armario', CABINET_LABELS[meterCenter.cabinet]]] : []),
          ['Tipo de local', meterCenter.exterior ? 'Exterior · IP43 · IK09' : 'Interior · IP40 · IK09'],
          ['Planta', FLOOR_LABELS[meterCenter.floor]],
          ['Plantas del edificio', fmt(meterCenter.buildingFloors)],
          ['Interruptor general de maniobra', meterEvaluation.mainSwitch.required ? (meterEvaluation.mainSwitch.outOfRange ? 'Fuera de la tabla (más de 150 kW)' : `${fmt(meterCenter.mainSwitchA)} A`) : 'No obligatorio (hasta 2 usuarios)'],
          ['Unidades funcionales', [meterCenter.hasMando ? 'Mando' : null, meterCenter.hasTelecom ? 'Telecomunicaciones' : null].filter(Boolean).join(' · ') || 'Ninguna adicional'],
          ['Supuesto de enlace', INSTALLATION_LABELS[installationType]],
        ],
      },
    ],
    powerUnit,
    lines: [
      {
        title: '7. LGA · ITC-BT-14',
        columns: ['Concepto', 'Valor'],
        rows: [
          ['Potencia prevista', `${power(lga.powerW)}`],
          ['Intensidad de cálculo (Ib)', `${fmt(lgaResult.ratedCurrent, 2)} A`],
          ['Intensidad máxima admisible (Iz)', lgaResult.correctedCurrent == null ? '—' : `${fmt(lgaResult.correctedCurrent, 1)} A`],
          ['Sección por caída de tensión', `${fmt(lgaResult.sectionByDrop, 2)} mm²`],
          ['Momento eléctrico (M)', `${fmt(lgaResult.momentKwM, 2)} kW·m`],
          ['Conductividad (γ)', `${fmt(lgaResult.gamma)} m/(Ω·mm²)`],
          ...(lgaResult.sectionOverride == null ? [] : [['Sección automática de cálculo', lgaResult.autoSection == null ? 'Sin sección admisible' : `${fmt(lgaResult.autoSection)} mm²`]]),
          ['Sección adoptada', lgaResult.finalSection == null ? 'Sin sección admisible' : `${fmt(lgaResult.finalSection)} mm²`],
          ['Conductores de Fase (R, S, T)', lgaResult.finalSection == null ? '—' : `3 x ${fmt(lgaResult.finalSection)} mm² Cu (${lgaResult.cableType})`],
          ['Conductor Neutro (N)', `1 x ${fmt(lgaNeutral)} mm² Cu (${lgaResult.cableType})`],
          ['Conductor de Protección (PE)', `1 x ${fmt(lgaProtective)} mm² Cu (${lgaResult.cableType})`],
          ['Tubo protector empotrado', `${fmt(lga.tubeDiameter)} mm de diámetro exterior${lgaResult.minimumTube == null ? ' mínimo' : ` · mínimo ${fmt(lgaResult.minimumTube)} mm`}`],
          ['Protección (In)', lgaResult.protection == null ? '—' : `${fmt(lgaResult.protection)} A`],
          ['Caída resultante con Ib', lgaResult.dropPercent == null ? '—' : `${fmt(lgaResult.dropPercent, 2)} %`],
          ...(lgaResult.dropPercentIn == null ? [] : [['Caída resultante con In', `${fmt(lgaResult.dropPercentIn, 2)} %`]]),
          ['Método · aislamiento', `${lga.method} · ${LGA_INSULATION}`],
        ],
      },
      {
        title: '8. DI · ITC-BT-15',
        columns: ['Concepto', 'Valor'],
        rows: [
          ['Potencia prevista', `${power(di.powerW)}`],
          ['Intensidad de cálculo (Ib)', `${fmt(diResult.ratedCurrent, 2)} A`],
          ['Sección por caída de tensión', `${fmt(diResult.sectionByDrop, 2)} mm²`],
          ['Momento eléctrico (M)', `${fmt(diResult.momentKwM, 2)} kW·m`],
          ['Conductividad (γ)', `${fmt(diResult.gamma)} m/(Ω·mm²)`],
          ['Sección adoptada', diResult.finalSection == null ? 'Sin sección admisible' : `${fmt(diResult.finalSection)} mm²`],
          ['Conductores de alimentación (fase + neutro)', diResult.finalSection == null ? '—' : `${fmt(diResult.finalSection)} mm² Cu (${diResult.cableType})`],
          ['Conductor de protección (tierra / PE)', `1 x ${fmt(di.peSection)} mm² Cu (tipo ES07Z1-K, verde-amarillo)`],
          ['Hilo de mando (tarificación)', `1 x ${fmt(di.controlSection)} mm² Cu (tipo ES07Z1-K, color rojo)`],
          ['Canalización y tubo protector', `Tubo protector empotrado de diámetro exterior Ø ${fmt(di.tubeDiameter)} mm`],
          ['Protección (PE)', `${fmt(di.peSection)} mm²`],
          ['Caída resultante con Ib', diResult.dropPercent == null ? '—' : `${fmt(diResult.dropPercent, 2)} %`],
          ...(diResult.dropPercentIn == null ? [] : [['Caída resultante con In', `${fmt(diResult.dropPercentIn, 2)} %`]]),
          ['Método · aislamiento', `${di.method} · ${di.insulation}`],
        ],
      },
      {
        title: '9. Instalaciones interiores · ITC-BT-25',
        columns: ['Vivienda', 'IGA', 'P máx.', 'P contratada', 'ICP', 'Diferenciales', 'Sobretensiones'],
        rows: interiorDwellings.length === 0
          ? [['—', 'Sin viviendas generadas', '', '', '', '', '']]
          : interiorDwellings.map(dwelling => {
            const interior = resolveInterior(dwelling.powerW, dwelling.interior)
            const evaluation = evaluateInterior({ igaA: dwelling.housingIgaA ?? null, powerW: dwelling.powerW, ...interior })
            return [
              dwelling.label,
              evaluation.igaA == null ? '—' : `${evaluation.igaA} A`,
              evaluation.maxPowerW == null ? '—' : `${fmt(evaluation.maxPowerW)} W`,
              interior.contractedPowerW > 0 ? `${fmt(interior.contractedPowerW)} W` : '—',
              evaluation.icpCurrentA == null ? '—' : `${fmtDec(evaluation.icpCurrentA)} A`,
              `${evaluation.differentials} × ${evaluation.sensitivityMa} mA`,
              interior.hasSurge ? 'Sí' : 'No',
            ]
          }),
      },
      {
        title: '10. Cuadros interiores de locales y servicios generales · ITC-BT-19',
        columns: ['Suministro', 'P suministro', 'IGA', 'Circuito', 'Uso', 'Potencia', 'Longitud', 'Sección', 'Protección', 'Caída'],
        rows: circuitSupplies.flatMap(supply => {
          const board = evaluateBoard(supply.circuits, supply)
          return supply.circuits.map(circuit => {
            const result = sizeInteriorCircuit(circuit, supply)
            return [
              supply.label,
              `${fmt(supply.powerW)} W`,
              board.supplySwitchA == null ? '—' : `${fmt(board.supplySwitchA)} A`,
              circuit.description,
              CIRCUIT_USE_LABELS[circuit.use],
              `${fmt(circuit.powerW)} W`,
              `${fmt(circuit.lengthM, 1)} m`,
              result.finalSection == null ? '—' : `${fmt(result.finalSection, 1)} mm²`,
              result.protection == null ? '—' : `${fmt(result.protection)} A`,
              result.dropPercent == null ? '—' : `${fmt(result.dropPercent, 2)} %`,
            ]
          })
        }).concat(circuitSupplies.every(supply => supply.circuits.length === 0) ? [['—', '', '', 'Sin circuitos definidos', '', '', '', '', '', '']] : []),
      },
      {
        title: '11. Circuitos de vivienda · ITC-BT-25',
        columns: ['Vivienda', 'Circuito', 'PIA', 'Sección', 'Longitud', 'Caída'],
        rows: interiorDwellings.length === 0 ? [['—', 'Sin viviendas generadas', '', '', '', '']] : housingCircuitReportRows(),
      },
      {
        title: '12. Estancias de vivienda · ITC-BT-25 §4',
        columns: ['Vivienda', 'Estancia', 'Superficie', 'Longitud'],
        rows: housingRoomReportRows().length === 0 ? [['—', 'Sin estancias cargadas', '', '']] : housingRoomReportRows(),
      },
      {
        title: '13. Puntos mínimos por vivienda · ITC-BT-25 §4',
        columns: ['Vivienda', ...POINT_CIRCUITS, 'Total'],
        rows: housingPointReportRows().length === 0 ? [['—', ...POINT_CIRCUITS.map(() => ''), '']] : housingPointReportRows(),
      },
    ],
  })

  const downloadJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      projectInfo,
      inputs: { housing, locals, garages, elevators, motors, otherLoads, lighting, installationType, meterCenter, parking, irveOption, lga, lgaPowerMode, di, derivations },
      settings,
      calculations: result,
      lines: {
        lga: { inputs: lga, result: lgaResult },
        di: { inputs: di, result: diResult },
        meterCenter: { inputs: effectiveMeterCenter, result: meterEvaluation },
      },
      project: {
        lga: project.lga,
        derivations: project.derivations,
        summary: project.summary,
      },
    }
    downloadFile('json', 'application/json;charset=utf-8', JSON.stringify(exportData, null, 2))
  }

  const downloadMarkdown = () => downloadFile('md', 'text/markdown;charset=utf-8', buildMarkdownReport(buildReport()))
  const downloadText = () => downloadFile('txt', 'text/plain;charset=utf-8', buildPlainTextReport(buildReport()))

  const downloadReport = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const addHeader = () => {
      doc.setFillColor(...PDF_COLORS.headerBand)
      doc.rect(0, 0, pageWidth, 24, 'F')
      doc.setTextColor(...PDF_COLORS.onBand)
      if (projectInfo.logo) {
        try { doc.addImage(projectInfo.logo, 'PNG', pageWidth - 38, 4, 20, 16) } catch { /* logo incompatible: continue without it */ }
      }
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(projectInfo.companyName || 'ELECTRO-CÁLCULOS', 15, 11)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('MEMORIA TÉCNICA · PREVISIÓN DE CARGAS', 15, 17)
      doc.text('ITC-BT-10 · REBT', projectInfo.logo ? pageWidth - 43 : pageWidth - 15, 14, { align: 'right' })
    }
    const addFooter = (page: number) => {
      doc.setDrawColor(...PDF_COLORS.line)
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)
      doc.setTextColor(...PDF_COLORS.inkFaint)
      doc.setFontSize(8)
      doc.text('Documento generado por Electro-cálculos · Valores editables según proyecto', 15, pageHeight - 9)
      doc.text(`Página ${page}`, pageWidth - 15, pageHeight - 9, { align: 'right' })
    }
    const section = (title: string, y: number) => {
      doc.setTextColor(...PDF_COLORS.title)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(title, 15, y)
      return y + 5
    }

    addHeader()
    doc.setTextColor(...PDF_COLORS.ink)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('Informe de previsión de cargas', 15, 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PDF_COLORS.inkMuted)
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 15, 50)
    doc.text(projectInfo.companyAddress ? `Empresa: ${projectInfo.companyAddress}` : 'Cálculo basado en los datos introducidos y parámetros configurables.', 15, 57)
    if (projectInfo.workAddress) doc.text(`Dirección de obra: ${projectInfo.workAddress}`, 15, 63)
    if (projectInfo.phone || projectInfo.email) doc.text([projectInfo.phone, projectInfo.email].filter(Boolean).join(' · '), pageWidth - 15, 57, { align: 'right' })
    doc.setFillColor(...PDF_COLORS.brandSoft)
    doc.roundedRect(15, 66, pageWidth - 30, 25, 3, 3, 'F')
    doc.setTextColor(...PDF_COLORS.title)
    doc.setFontSize(10)
    doc.text('POTENCIA TOTAL PREVISTA', 22, 76)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(`${power(result.total)}`, 22, 85)

    let y = section('1. Resumen de resultados', 106)
    autoTable(doc, { startY: y, head: [['Código', 'Concepto', 'Potencia prevista']], body: [['P1', 'Viviendas', `${power(result.p1)}`], ['P2', 'Servicios generales', `${power(result.p2)}`], ['P3', 'Locales y oficinas', `${power(result.p3)}`], ['P4', 'Garajes', `${power(result.p4)}`], ['P5', 'IRVE', `${power(result.p5)}`], ['', 'TOTAL', `${power(result.total)}`]], theme: 'grid', headStyles: { fillColor: [8, 47, 73] }, styles: { fontSize: 9 }, margin: { left: 15, right: 15 } })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 145
    y += 15
    y = section('2. Datos de cálculo', y)
    autoTable(doc, { startY: y, head: [['Parámetro', 'Valor']], body: [['Total viviendas', `${result.homes} uds.`], ['Potencia media vivienda', `${power(result.average)}`], ['Coeficiente simultaneidad', `${result.cs}`], ['Plazas consideradas IRVE', `${result.plazas}`]], theme: 'striped', headStyles: { fillColor: [8, 47, 73] }, styles: { fontSize: 9 }, margin: { left: 15, right: 15 } })

    const addDetailPage = (title: string, head: string[], body: string[][]) => {
      doc.addPage()
      addHeader()
      let top = section(title, 38)
      autoTable(doc, { startY: top, head: [head], body, theme: 'grid', headStyles: { fillColor: [8, 47, 73] }, styles: { fontSize: 8 }, margin: { left: 15, right: 15 } })
    }
    const addExplanationPage = (title: string, explanation: { steps: PdfExplanationStep[] }) => {
      doc.addPage()
      addHeader()
      const top = section(title, 38)
      const body: string[][] = []
      for (const step of explanation.steps) {
        if (step.id === 'inputs') continue
        if (step.kind === 'table') {
          body.push([step.title, ''])
          for (const row of step.rows ?? []) body.push([row.label ?? '', row.value ?? ''])
        } else if (step.kind === 'formula') {
          body.push([`${step.title} · Fórmula`, step.formula ?? ''])
          if (step.substitution) body.push([`${step.title} · Sustitución`, step.substitution])
          if (step.result) body.push([`${step.title} · Resultado`, step.result])
          if (step.note) body.push([`${step.title} · Nota`, step.note])
        } else if (step.kind === 'selection') {
          body.push([`${step.title} · Resultado`, step.result ?? ''])
          if (step.criterion) body.push([`${step.title} · Criterio`, step.criterion])
          for (const row of step.rows ?? []) {
            body.push([`${step.title} · ${row.section == null ? '—' : `${fmt(row.section, 1)} mm²`}`, row.reason ?? ''])
          }
        } else if (step.kind === 'text') {
          body.push([step.title, step.text ?? ''])
        } else if (step.kind === 'list') {
          body.push([step.title, (step.items ?? []).join(' ')])
        }
      }
      autoTable(doc, { startY: top, head: [['Concepto', 'Desarrollo']], body, theme: 'grid', headStyles: { fillColor: [8, 47, 73] }, styles: { fontSize: 8 }, margin: { left: 15, right: 15 } })
    }
    addExplanationPage('2.1 Desarrollo del cálculo · Previsión de cargas', loadExplanation as { steps: PdfExplanationStep[] })
    addDetailPage('3. Servicios generales', ['Descripción', 'Tipo', 'Potencia'], [...elevators.map(row => [row.name, row.ita, `${power(row.unit === 'CV' ? row.power * settings.cvToWatts : row.power)}`]), ...motors.map(row => [row.name, 'Motor', `${power(row.unit === 'CV' ? row.power * settings.cvToWatts : row.power)}`]), ['Incremento del motor mayor', `×${fmtDec(settings.motorCoefficient)}`, `${power(result.motorIncrement)}`], ...otherLoads.map(row => [row.name, 'Otra carga', `${power(row.power)}`]), ...lighting.filter(row => previewLightingPower(row, settings) > 0).map(row => [LIGHTING_LABELS[row.id], row.lamp, `${power(previewLightingPower(row, settings))}`]), ['Subtotal alumbrado', `×${fmtDec(settings.dischargeLampCoefficient)} lámparas de descarga`, `${power(result.lightingPower)}`]])
    addDetailPage('4. Locales y oficinas', ['Descripción', 'Tipo', 'Superficie', 'Previsión'], locals.map(row => [row.name, row.type, `${row.area} m²`, `${powerValue(previewLocalPower(row, settings))} W`]))
    addDetailPage('5. Garajes', ['Descripción', 'Ventilación', 'Plazas', 'Superficie', 'Previsión'], garages.map(row => [row.name, row.ventilation, fmt(row.plazas || 0), `${row.area} m²`, `${fmt(Math.max(row.area * (row.ventilation === 'Forzada' ? settings.forcedGaragePowerPerM2 : settings.naturalGaragePowerPerM2), row.area ? settings.minimumSupplyPower : 0))} W`]))
    addDetailPage('6. Centralización de contadores · ITC-BT-16', ['Concepto', 'Valor'], [
      ['Forma de colocación', PLACEMENT_LABELS[meterCenter.placement]],
      ['Contadores', fmt(effectiveMeterCenter.meters)],
      ['Concentraciones', fmt(meterCenter.concentrations)],
      ['Conjunto de medida', ASSEMBLY_LABELS[meterCenter.assembly]],
      ...(meterCenter.assembly === 'armario' ? [['Tipo de armario', CABINET_LABELS[meterCenter.cabinet]]] : []),
      ['Tipo de local', meterCenter.exterior ? 'Exterior · IP43 · IK09' : 'Interior · IP40 · IK09'],
      ['Planta', FLOOR_LABELS[meterCenter.floor]],
      ['Plantas del edificio', fmt(meterCenter.buildingFloors)],
      ['Interruptor general de maniobra', meterEvaluation.mainSwitch.required ? (meterEvaluation.mainSwitch.outOfRange ? 'Fuera de la tabla (más de 150 kW)' : `${fmt(meterCenter.mainSwitchA)} A`) : 'No obligatorio (hasta 2 usuarios)'],
      ['Unidades funcionales', [meterCenter.hasMando ? 'Mando' : null, meterCenter.hasTelecom ? 'Telecomunicaciones' : null].filter(Boolean).join(' · ') || 'Ninguna adicional'],
      ['Supuesto de enlace', INSTALLATION_LABELS[installationType]],
    ])
    addExplanationPage('6.1 Desarrollo del cálculo · Contadores', meterExplanation as { steps: PdfExplanationStep[] })
    addDetailPage('7. Línea General de Alimentación · ITC-BT-14', ['Concepto', 'Valor'], [
      ['Potencia prevista', `${power(lga.powerW)}`],
      ['Intensidad de cálculo (Ib)', `${fmt(lgaResult.ratedCurrent, 2)} A`],
      ['Intensidad máxima admisible (Iz)', lgaResult.correctedCurrent == null ? '—' : `${fmt(lgaResult.correctedCurrent, 1)} A`],
      ['Sección por caída de tensión', `${fmt(lgaResult.sectionByDrop, 2)} mm²`],
      ['Momento eléctrico (M)', `${fmt(lgaResult.momentKwM, 2)} kW·m`],
      ['Conductividad (γ)', `${fmt(lgaResult.gamma)} m/(Ω·mm²)`],
      ...(lgaResult.sectionOverride == null ? [] : [['Sección automática de cálculo', lgaResult.autoSection == null ? 'Sin sección admisible' : `${fmt(lgaResult.autoSection)} mm²`]]),
      ['Sección adoptada', lgaResult.finalSection == null ? 'Sin sección admisible' : `${fmt(lgaResult.finalSection)} mm²`],
      ['Conductores de Fase (R, S, T)', lgaResult.finalSection == null ? '—' : `3 x ${fmt(lgaResult.finalSection)} mm² Cu (${lgaResult.cableType})`],
      ['Conductor Neutro (N)', `1 x ${fmt(lgaNeutral)} mm² Cu (${lgaResult.cableType})`],
      ['Conductor de Protección (PE)', `1 x ${fmt(lgaProtective)} mm² Cu (${lgaResult.cableType})`],
      ['Tubo protector empotrado', `${fmt(lga.tubeDiameter)} mm de diámetro exterior${lgaResult.minimumTube == null ? ' mínimo' : ` · mínimo ${fmt(lgaResult.minimumTube)} mm`}`],
      ['Iz de tabla', lgaResult.tableCurrent == null ? '—' : `${fmt(lgaResult.tableCurrent)} A`],
      ['Factor de agrupamiento', fmt(lgaResult.groupingFactor, 2)],
      ['Iz corregida', lgaResult.correctedCurrent == null ? '—' : `${fmt(lgaResult.correctedCurrent, 1)} A`],
      ['Caída resultante con Ib', lgaResult.dropPercent == null ? '—' : `${fmt(lgaResult.dropPercent, 2)} %`],
      ...(lgaResult.dropPercentIn == null ? [] : [['Caída resultante con In', `${fmt(lgaResult.dropPercentIn, 2)} %`]]),
      ['Protección (In)', lgaResult.protection == null ? '—' : `${fmt(lgaResult.protection)} A`],
      ['Método · aislamiento', `${lga.method} · ${LGA_INSULATION}`],
      ['Observaciones', lgaResult.problems.length > 0 ? lgaResult.problems.join(' ') : 'Cumple los criterios aplicados'],
    ])
    addExplanationPage('7.1 Desarrollo del cálculo · LGA', lgaExplanation as { steps: PdfExplanationStep[] })
    addDetailPage('8. Derivación Individual · ITC-BT-15', ['Concepto', 'Valor'], [
      ['Potencia prevista', `${power(di.powerW)}`],
      ['Intensidad de cálculo (Ib)', `${fmt(diResult.ratedCurrent, 2)} A`],
      ['Sección por caída de tensión', `${fmt(diResult.sectionByDrop, 2)} mm²`],
      ['Momento eléctrico (M)', `${fmt(diResult.momentKwM, 2)} kW·m`],
      ['Conductividad (γ)', `${fmt(diResult.gamma)} m/(Ω·mm²)`],
      ['Sección adoptada', diResult.finalSection == null ? 'Sin sección admisible' : `${fmt(diResult.finalSection)} mm²`],
      ['Conductores de alimentación (fase + neutro)', diResult.finalSection == null ? '—' : `${fmt(diResult.finalSection)} mm² Cu (${diResult.cableType})`],
      ['Conductor de protección (tierra / PE)', `1 x ${fmt(di.peSection)} mm² Cu (tipo ES07Z1-K, verde-amarillo)`],
      ['Hilo de mando (tarificación)', `1 x ${fmt(di.controlSection)} mm² Cu (tipo ES07Z1-K, color rojo)`],
      ['Canalización y tubo protector', `Tubo protector empotrado de diámetro exterior Ø ${fmt(di.tubeDiameter)} mm`],
      ['Iz de tabla', diResult.tableCurrent == null ? '—' : `${fmt(diResult.tableCurrent)} A`],
      ['Factor de agrupamiento', fmt(diResult.groupingFactor, 2)],
      ['Iz corregida', diResult.correctedCurrent == null ? '—' : `${fmt(diResult.correctedCurrent, 1)} A`],
      ['Caída resultante con Ib', diResult.dropPercent == null ? '—' : `${fmt(diResult.dropPercent, 2)} %`],
      ...(diResult.dropPercentIn == null ? [] : [['Caída resultante con In', `${fmt(diResult.dropPercentIn, 2)} %`]]),
      ...(diResult.housingIga == null ? [] : [['IGA (tabla A) · potencia máxima', `${fmt(diResult.housingIga)} A · ${power(diResult.maxAdmissiblePowerW ?? 0)}`]]),
      ['Protección (In)', diResult.protection == null ? '—' : `${fmt(diResult.protection)} A`],
      ['Método · aislamiento', `${di.method} · ${di.insulation}`],
      ['Observaciones', diResult.problems.length > 0 ? diResult.problems.join(' ') : 'Cumple los criterios aplicados'],
    ])
    addExplanationPage('8.1 Desarrollo del cálculo · DI', diExplanation as { steps: PdfExplanationStep[] })
    addDetailPage('9. Derivaciones individuales · resumen', ['Tipo', 'Elemento', 'Sistema', 'Potencia', 'Longitud', 'Método', 'Sección', 'Protección', 'Caída'], calculatedDerivations.length === 0 ? [['—', 'Sin derivaciones generadas', '', '', '', '', '', '', '']] : calculatedDerivations.map(derivation => [DERIVATION_LABELS[derivation.kind], derivation.label, derivation.system === 'three-phase' ? 'Trifásica' : 'Monofásica', `${power(derivation.powerW)}`, `${fmt(derivation.lengthM, 2)} m`, derivation.method, derivation.result.finalSection == null ? '—' : `${fmt(derivation.result.finalSection)} mm²`, derivation.result.protection == null ? '—' : `${fmt(derivation.result.protection)} A`, derivation.result.dropPercent == null ? '—' : `${fmt(derivation.result.dropPercent, 2)} %`]))
    addDetailPage('10. Instalaciones interiores · ITC-BT-25', ['Vivienda', 'IGA', 'P máx.', 'P contratada', 'ICP', 'Diferenciales', 'Sobretensiones'], interiorDwellings.map(dwelling => {
      const interior = resolveInterior(dwelling.powerW, dwelling.interior)
      const evaluation = evaluateInterior({ igaA: dwelling.housingIgaA ?? null, powerW: dwelling.powerW, ...interior })
      return [dwelling.label, evaluation.igaA == null ? '—' : `${evaluation.igaA} A`, evaluation.maxPowerW == null ? '—' : `${fmt(evaluation.maxPowerW)} W`, interior.contractedPowerW > 0 ? `${fmt(interior.contractedPowerW)} W` : '—', evaluation.icpCurrentA == null ? '—' : `${fmtDec(evaluation.icpCurrentA)} A`, `${evaluation.differentials} × ${evaluation.sensitivityMa} mA`, interior.hasSurge ? 'Sí' : 'No']
    }))
    addDetailPage('11. Cuadros interiores de locales y servicios generales · ITC-BT-19', ['Suministro', 'P suministro', 'IGA', 'Circuito', 'Uso', 'Potencia', 'Longitud', 'Sección', 'Protección', 'Caída'], circuitSupplies.flatMap(supply => {
      const board = evaluateBoard(supply.circuits, supply)
      return supply.circuits.map(circuit => {
        const result = sizeInteriorCircuit(circuit, supply)
        return [supply.label, `${fmt(supply.powerW)} W`, board.supplySwitchA == null ? '—' : `${fmt(board.supplySwitchA)} A`, circuit.description, CIRCUIT_USE_LABELS[circuit.use], `${fmt(circuit.powerW)} W`, `${fmt(circuit.lengthM, 1)} m`, result.finalSection == null ? '—' : `${fmt(result.finalSection, 1)} mm²`, result.protection == null ? '—' : `${fmt(result.protection)} A`, result.dropPercent == null ? '—' : `${fmt(result.dropPercent, 2)} %`]
      })
    }).concat(circuitSupplies.every(supply => supply.circuits.length === 0) ? [['—', '', '', 'Sin circuitos definidos', '', '', '', '', '', '']] : []))
    addDetailPage('12. Circuitos de vivienda · ITC-BT-25', ['Vivienda', 'Circuito', 'PIA', 'Sección', 'Longitud', 'Caída'], interiorDwellings.length === 0 ? [['—', 'Sin viviendas generadas', '', '', '', '']] : housingCircuitReportRows())
    addDetailPage('13. Estancias de vivienda · ITC-BT-25 §4', ['Vivienda', 'Estancia', 'Superficie', 'Longitud'], housingRoomReportRows().length === 0 ? [['—', 'Sin estancias cargadas', '', '']] : housingRoomReportRows())
    addDetailPage('14. Puntos mínimos por vivienda · ITC-BT-25 §4', ['Vivienda', ...POINT_CIRCUITS, 'Total'], housingPointReportRows().length === 0 ? [['—', ...POINT_CIRCUITS.map(() => ''), '']] : housingPointReportRows())
    for (let page = 1; page <= doc.getNumberOfPages(); page += 1) { doc.setPage(page); addFooter(page) }
    doc.save(`memoria-tecnica-prevision-cargas-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  if (!storageLoaded) {
    return <main className="mode-shell relative isolate min-h-screen bg-surface-page text-ink" aria-busy="true"><ModeBackdrop /><div className="mx-auto max-w-7xl px-5 py-10 text-sm text-ink-faint" role="status">Cargando datos guardados…</div></main>
  }

  return (
    <main className="mode-shell relative isolate min-h-screen bg-surface-page text-ink" data-explanation-mode={explanationMode}>
      <ModeBackdrop />
      <SiteHeader titleAs="h1">
        <div className="flex items-center gap-2"><div className="hidden items-center gap-3 text-right sm:flex"><div><p className="text-xs text-ink-faint">Referencia normativa</p><p className="text-sm font-semibold">{NORM_BY_TAB[activeTab]} · REBT</p></div></div><div className="flex items-center gap-2"><label htmlFor="explanation-mode" className="min-w-[4.5rem] text-right text-xs font-semibold text-ink-faint">{explanationModeLabel(explanationMode)}</label><Switch id="explanation-mode" checked={explanationMode === 'didactic'} onCheckedChange={checked => changeExplanationMode(checked ? 'didactic' : 'calculation')} aria-label="Activar modo didáctico" /></div><Button type="button" variant="ghost" size="icon" aria-label={toggleLabel(theme)} title={toggleLabel(theme)} onClick={toggleTheme}>{theme === 'dark' ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</Button><Link href="/requisitos" aria-label="Requisitos para proyecto o memoria técnica" title="Requisitos para proyecto o memoria técnica" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"><ClipboardCheck aria-hidden="true" className="size-4" /></Link><Link href="/ayuda" aria-label="Cómo usar la app" title="Cómo usar la app" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"><HelpCircle aria-hidden="true" className="size-4" /></Link></div>
      </SiteHeader>
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">De la previsión de cargas a cada derivación</h2><p className="mt-3 text-base leading-7 text-ink-subtle">Calcula la previsión del edificio, dimensiona la LGA y genera una DI por vivienda, local, garaje o servicios generales.</p></div>
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-3xl">
            <div className="mb-6 flex items-start justify-between gap-4"><div><DialogTitle id="settings-title" className="text-xl font-bold text-ink">Parámetros de cálculo</DialogTitle><DialogDescription id="settings-description" className="mt-1 text-sm text-ink-faint">Ajusta los valores utilizados en las previsiones. Los cambios se guardan en este navegador.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar parámetros de cálculo" />}><X /></DialogClose></div>
            <div className="grid items-start gap-4 md:grid-cols-2">
              <section className="rounded-control border border-line p-4 md:col-span-2">
                <h3 className="mb-2 text-sm font-bold text-ink-soft">Unidades de potencia</h3>
                <p className="mb-3 text-xs leading-5 text-ink-faint">Elegí cómo querés escribir y ver las potencias. El cálculo y el JSON guardado no cambian: el motor trabaja siempre en vatios.</p>
                <div className="max-w-xs">
                  <ChoiceSelect
                    label="Unidades de potencia"
                    value={powerUnit}
                    items={[{ value: 'W', label: 'Vatios (W)' }, { value: 'kW', label: 'Kilovatios (kW)' }]}
                    onChange={value => { if (isPowerUnit(value)) setSettings(current => ({ ...current, powerUnit: value })) }}
                  />
                </div>
              </section>
              <section className="rounded-control border border-line p-4"><h3 className="mb-4 text-sm font-bold text-ink-soft">Viviendas y suministros</h3><div className="grid gap-4 sm:grid-cols-2">
                <SettingInput label="Vivienda básica" value={powerFieldValue(settings.basicHousingPower, powerUnit)} suffix={powerUnit} step={powerUnit === 'kW' ? '0.01' : '1'} onChange={value => updateSetting('basicHousingPower', storePower(value, powerUnit))} />
                <SettingInput label="Vivienda elevada" value={powerFieldValue(settings.elevatedHousingPower, powerUnit)} suffix={powerUnit} step={powerUnit === 'kW' ? '0.01' : '1'} onChange={value => updateSetting('elevatedHousingPower', storePower(value, powerUnit))} />
              </div></section>
              <section className="rounded-control border border-line p-4"><h3 className="mb-4 text-sm font-bold text-ink-soft">Locales, oficinas e industrias</h3><div className="grid gap-4 sm:grid-cols-2">
                <SettingInput label="Comercial/oficina por superficie" value={settings.localPowerPerM2} suffix="W/m²" onChange={value => updateSetting('localPowerPerM2', value)} />
                <SettingInput label="Comercial/oficina mínimo" value={powerFieldValue(settings.minimumSupplyPower, powerUnit)} suffix={powerUnit} step={powerUnit === 'kW' ? '0.01' : '1'} onChange={value => updateSetting('minimumSupplyPower', storePower(value, powerUnit))} />
                <SettingInput label="Industria por superficie" value={settings.industrialPowerPerM2} suffix="W/m²" onChange={value => updateSetting('industrialPowerPerM2', value)} />
                <SettingInput label="Industria mínimo" value={powerFieldValue(settings.industrialMinimumSupplyPower, powerUnit)} suffix={powerUnit} step={powerUnit === 'kW' ? '0.01' : '1'} onChange={value => updateSetting('industrialMinimumSupplyPower', storePower(value, powerUnit))} />
              </div></section>
              <section className="rounded-control border border-line p-4"><h3 className="mb-4 text-sm font-bold text-ink-soft">Garajes</h3><div className="grid gap-4 sm:grid-cols-2">
                <SettingInput label="Ventilación forzada" value={settings.forcedGaragePowerPerM2} suffix="W/m²" onChange={value => updateSetting('forcedGaragePowerPerM2', value)} />
                <SettingInput label="Ventilación natural" value={settings.naturalGaragePowerPerM2} suffix="W/m²" onChange={value => updateSetting('naturalGaragePowerPerM2', value)} />
              </div></section>
              <section className="rounded-control border border-line p-4"><h3 className="mb-3 text-sm font-bold text-ink-soft">Leyendas de normativa</h3>
                <label htmlFor="source-notes-toggle" className="flex cursor-pointer items-start gap-3">
                  <Checkbox checked={settings.showSourceNotes} id="source-notes-toggle" onCheckedChange={checked => setSettings(current => ({ ...current, showSourceNotes: checked }))} className="mt-0.5" aria-describedby="source-notes-help" />
                  <span>
                    <span className="block text-sm font-semibold text-ink-soft">Leyendas en el pie de cada card</span>
                    <span id="source-notes-help" className="mt-1 block text-xs leading-5 text-ink-faint">Muestra el apartado del BOE del que sale cada cálculo. Desactivalo si preferís una vista más limpia.</span>
                  </span>
                </label>
              </section>
              <section className="rounded-control border border-line p-4 md:col-span-2"><h3 className="mb-4 text-sm font-bold text-ink-soft">Alumbrado de zonas comunes</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SettingInput label="Portal · incandescencia" value={settings.portalLightPowerPerM2} suffix="W/m²" onChange={value => updateSetting('portalLightPowerPerM2', value)} />
                <SettingInput label="Portal · fluorescencia/LED" value={settings.portalLightLedPowerPerM2} suffix="W/m²" onChange={value => updateSetting('portalLightLedPowerPerM2', value)} />
                <SettingInput label="Escalera · incandescencia" value={settings.stairLightPowerPerM2} suffix="W/m²" onChange={value => updateSetting('stairLightPowerPerM2', value)} />
                <SettingInput label="Escalera · fluorescencia/LED" value={settings.stairLightLedPowerPerM2} suffix="W/m²" onChange={value => updateSetting('stairLightLedPowerPerM2', value)} />
                <SettingInput label="Coeficiente lámparas de descarga" value={settings.dischargeLampCoefficient} suffix="Cs" step="0.01" onChange={value => updateSetting('dischargeLampCoefficient', value)} />
              </div></section>
              <section className="rounded-control border border-line p-4 md:col-span-2"><h3 className="mb-4 text-sm font-bold text-ink-soft">Coeficientes y equipos</h3><div className="grid gap-4 sm:grid-cols-2">
                <SettingInput label="Coeficiente de ascensores" value={settings.elevatorCoefficient} suffix="Cs" step="0.01" onChange={value => updateSetting('elevatorCoefficient', value)} />
                <SettingInput label="Coeficiente del motor mayor" value={settings.motorCoefficient} suffix="Cs" step="0.01" onChange={value => updateSetting('motorCoefficient', value)} />
                <SettingInput label="Potencia del cargador IRVE" value={powerFieldValue(settings.evChargerPower, powerUnit)} suffix={powerUnit} step={powerUnit === 'kW' ? '0.01' : '1'} onChange={value => updateSetting('evChargerPower', storePower(value, powerUnit))} />
                <SettingInput label="Conversión de CV" value={settings.cvToWatts} suffix="W/CV" step="0.1" onChange={value => updateSetting('cvToWatts', value)} />
              </div></section>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="link" className="gap-2 px-0 text-sm font-semibold text-brand underline-offset-4 hover:underline" onClick={() => setSettings(defaultSettings)}><RotateCcw data-icon="inline-start" /> Restaurar valores predeterminados</Button><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold sm:min-w-28" onClick={() => setShowSettings(false)}>Listo</Button></div>
          </DialogContent>
        </Dialog>
        <Dialog open={showProjectInfo} onOpenChange={setShowProjectInfo}>
          <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-2xl">
            <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="project-info-title" className="text-xl font-bold text-ink">Datos de la memoria técnica</DialogTitle><DialogDescription className="mt-1 text-sm text-ink-faint">Estos datos aparecerán en la cabecera del PDF y se guardan en este navegador.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar diálogo" />}><X /></DialogClose></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="label">Nombre de empresa</span><Input className="w-full" value={projectInfo.companyName} onChange={event => updateProjectInfo('companyName', event.target.value)} placeholder="Instalaciones Ejemplo S.L." /></label>
              <label><span className="label">Dirección de empresa</span><Input className="w-full" value={projectInfo.companyAddress} onChange={event => updateProjectInfo('companyAddress', event.target.value)} placeholder="Calle, número, ciudad" /></label>
              <label><span className="label">Teléfono</span><Input className="w-full" value={projectInfo.phone} onChange={event => updateProjectInfo('phone', event.target.value)} placeholder="+34 900 000 000" /></label>
              <label><span className="label">Correo electrónico</span><Input className="w-full" type="email" value={projectInfo.email} onChange={event => updateProjectInfo('email', event.target.value)} placeholder="contacto@empresa.es" /></label>
              <label><span className="label">Dirección de obra</span><Input className="w-full" value={projectInfo.workAddress} onChange={event => updateProjectInfo('workAddress', event.target.value)} placeholder="Emplazamiento del proyecto" /></label>
              <label className="sm:col-span-2"><span className="label">Logo de empresa</span><Input className="w-full" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => handleLogo(event.target.files?.[0])} />{projectInfo.logo && <div className="mt-3 flex items-center gap-3"><img src={projectInfo.logo} alt="Vista previa del logo" className="size-14 rounded-lg border border-line object-contain p-1" /><Button type="button" variant="link" className="gap-2 px-0 text-sm font-semibold text-danger" onClick={() => updateProjectInfo('logo', '')}><Trash2 data-icon="inline-start" /> Quitar logo</Button></div>}</label>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold sm:w-auto" onClick={() => setShowProjectInfo(false)}>Cerrar</Button><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold sm:w-auto" onClick={() => setShowProjectInfo(false)}><Check data-icon="inline-start" /> Guardar datos</Button></div>
          </DialogContent>
        </Dialog>
        <Dialog open={showSimultaneityTable} onOpenChange={setShowSimultaneityTable}>
          <DialogContent id="simultaneity-dialog" showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-xl">
            <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="simultaneity-title" className="text-xl font-bold text-ink">Coeficiente de simultaneidad</DialogTitle><DialogDescription id="simultaneity-description" className="mt-1 text-sm text-ink-faint">Tabla 1 de la ITC-BT-10 según el número de viviendas.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tabla de simultaneidad" />}><X /></DialogClose></div>
            <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-line">
              <Table className="w-full text-left text-sm">
                <TableHeader className="sticky top-0 z-10 bg-table-cs-head text-xs uppercase tracking-wide text-table-cs-head-text"><TableRow className="border-table-cs-head"><TableHead scope="col" className="px-4 py-3 text-center text-table-cs-head-text">N.º viviendas (n)</TableHead><TableHead scope="col" className="px-4 py-3 text-center text-table-cs-head-text">Coeficiente</TableHead></TableRow></TableHeader>
                <TableBody>{ITC_BT_10_COEFFICIENTS.slice(1).map((coefficient, index) => <TableRow key={index + 1} className={`border-b border-line-soft text-table-cs-row-text ${index % 2 === 0 ? 'bg-table-cs-row-odd' : 'bg-table-cs-row-even'}`}><TableCell className="px-4 py-2 text-center tabular-nums">{index + 1}</TableCell><TableCell className="px-4 py-2 text-center font-medium tabular-nums">{fmtDec(coefficient)}</TableCell></TableRow>)}<TableRow className="border-t border-line bg-table-cs-row-even text-table-cs-row-text"><TableCell className="px-4 py-3 text-center font-semibold">n &gt; 21</TableCell><TableCell className="px-4 py-3 text-center font-semibold">15,3 + (n − 21) × 0,5</TableCell></TableRow></TableBody>
              </Table>
            </div>
            <p className="mt-4 rounded-lg bg-warning-soft p-4 text-sm leading-5 text-warning-ink"><b>Tarifa nocturna:</b> el coeficiente de simultaneidad es igual al número de viviendas (n).</p>
            <div className="mt-6 flex justify-end"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={() => setShowSimultaneityTable(false)}>Cerrar</Button></div>
          </DialogContent>
        </Dialog>
        <Dialog open={showItaTable} onOpenChange={setShowItaTable}>
          <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-3xl">
              <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="ita-table-title" className="text-xl font-bold text-ink">Tipos de ascensores · Tabla ITA</DialogTitle><DialogDescription className="mt-1 text-sm text-ink-faint">Clasificación según ITC-BT 10 (REBT). Selecciona el tipo de aparato elevador en función de las características del ascensor.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar diálogo" />}><X /></DialogClose></div>
              <div className="grid gap-3 md:hidden">
                {ITA_TYPES.map(ita => <article key={`mobile-${ita.type}`} className="rounded-control border border-line bg-paper p-4">
                  <div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-brand">{ita.type}</h4><span className="text-sm font-semibold tabular-nums">{fmtDec(ita.potencia)} kW</span></div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="label">Carga</dt><dd className="mt-1 tabular-nums">{ita.carga} kg</dd></div>
                    <div><dt className="label">Personas</dt><dd className="mt-1 tabular-nums">{ita.personas}</dd></div>
                    <div className="col-span-2"><dt className="label">Velocidad</dt><dd className="mt-1 tabular-nums">{fmtDec(ita.velocidad)} m/s</dd></div>
                  </dl>
                </article>)}
              </div>
              <div className="hidden min-w-0 overflow-x-auto md:block">
                <Table className="w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-table-head bg-table-head text-xs uppercase tracking-wide text-table-head-text">
                      <TableHead scope="col" className="px-4 py-3 text-table-head-text">Tipo</TableHead>
                      <TableHead scope="col" className="px-4 py-3 text-right text-table-head-text">Carga (kg)</TableHead>
                      <TableHead scope="col" className="px-4 py-3 text-right text-table-head-text">Personas</TableHead>
                      <TableHead scope="col" className="px-4 py-3 text-right text-table-head-text">Velocidad (m/s)</TableHead>
                      <TableHead scope="col" className="px-4 py-3 text-right text-table-head-text">Potencia (kW)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ITA_TYPES.map((ita, idx) => (
                      <TableRow key={ita.type} className={`border-b border-line-soft text-table-row-text ${idx % 2 === 0 ? 'bg-table-row-odd' : 'bg-table-row-even'}`}>
                        <TableCell className="px-4 py-3 font-semibold text-table-row-text">{ita.type}</TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums">{ita.carga}</TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums">{ita.personas}</TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums">{fmtDec(ita.velocidad)}</TableCell>
                        <TableCell className="px-4 py-3 text-right font-medium tabular-nums">{ita.potencia}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-5 rounded-lg bg-warning-soft p-4 text-xs leading-5 text-warning-ink">
                <p className="flex items-start gap-2"><Info data-icon="inline-start" className="mt-0.5 shrink-0" /><span>Esta tabla es informativa. Al elegir un ITA se precarga su potencia orientativa en Potencia real; si el fabricante declara otra potencia, editá Potencia real. Los valores de la tabla ITC-BT 10 son orientativos.</span></p>
              </div>
              <div className="mt-6 flex justify-end"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={() => setShowItaTable(false)}>Cerrar</Button></div>
          </DialogContent>
        </Dialog>
        <Tabs value={activeTab} onValueChange={value => changeTab(value as TabValue)} className="gap-6">
          <TabsList data-active-tab={activeTab} className="tab-bar relative h-auto w-fit max-w-full items-center gap-1 overflow-x-auto rounded-tab-track border border-line bg-paper p-1">
            <TabsIndicator />
            <TabsTrigger value="cargas" className="tab-trigger relative z-10 h-auto flex-none gap-2 whitespace-nowrap rounded-tab px-3 py-1.5 text-center text-xs font-semibold sm:px-4 sm:text-sm"><span aria-hidden="true" className="tab-dot size-1.5 shrink-0 rounded-full bg-brand-mark" />Previsión de cargas</TabsTrigger>
            <TabsTrigger value="lga" className="tab-trigger relative z-10 h-auto flex-none gap-2 whitespace-nowrap rounded-tab px-3 py-1.5 text-center text-xs font-semibold sm:px-4 sm:text-sm"><span aria-hidden="true" className="tab-dot size-1.5 shrink-0 rounded-full bg-tab-lga" />LGA</TabsTrigger>
            <TabsTrigger value="di" className="tab-trigger relative z-10 h-auto flex-none gap-2 whitespace-nowrap rounded-tab px-3 py-1.5 text-center text-xs font-semibold sm:px-4 sm:text-sm"><span aria-hidden="true" className="tab-dot size-1.5 shrink-0 rounded-full bg-tab-di" />DI</TabsTrigger>
            <TabsTrigger value="interiores" className="tab-trigger relative z-10 h-auto flex-none gap-2 whitespace-nowrap rounded-tab px-3 py-1.5 text-center text-xs font-semibold sm:px-4 sm:text-sm"><span aria-hidden="true" className="tab-dot size-1.5 shrink-0 rounded-full bg-tab-di" />Cuadros</TabsTrigger>
            <TabsTrigger value="esquema" className="tab-trigger relative z-10 h-auto flex-none gap-2 whitespace-nowrap rounded-tab px-3 py-1.5 text-center text-xs font-semibold sm:px-4 sm:text-sm"><span aria-hidden="true" className="tab-dot size-1.5 shrink-0 rounded-full bg-tab-esquema" />Esquema</TabsTrigger>
          </TabsList>
          <TabsContent value="cargas" data-dir={tabDirection} className="tab-panel">
        {/* En móvil el desglose queda al final de la página: esta barra mantiene el
            total a la vista mientras se editan los bloques de la previsión. Es sticky
            y no fixed para no tapar el pie ni exigir relleno extra al final. */}
        <div className="sticky top-0 z-30 -mx-5 mb-4 flex items-center justify-between gap-3 border-b border-panel-line bg-panel px-5 py-2.5 text-panel-foreground shadow-lg shadow-panel/20 lg:-mx-8 lg:px-8 xl:hidden">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-on-panel">Potencia total prevista</span>
          <span className="text-lg font-bold tabular-nums">{power(result.total)}</span>
        </div>
        <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_360px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className="rounded-card border border-line bg-paper p-5 shadow-card">
              <SectionTitle code="P1" title="Viviendas" subtitle="Añade cada vivienda y selecciona su grado de electrificación" />
              <div className="grid gap-3 md:hidden">
                {housing.map((row, i) => <article key={`mobile-${i}`} className="rounded-control border border-line bg-paper p-4">
                  <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold">Vivienda {i + 1}</h4><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar vivienda ${i + 1}`} onClick={() => setHousing(current => current.filter((_, index) => index !== i))}><Trash2 /></Button></div>
                  <div className="grid gap-3">
                    <label><span className="label">Electrificación</span><ChoiceSelect className="w-full" value={row.level} onChange={event => { const level = event as HousingRow['level']; setHousing(current => current.map((house, index) => index === i ? { ...house, level, power: level === 'Básica' ? settings.basicHousingPower : settings.elevatedHousingPower } : house)) }} items={['Básica', 'Elevada']} /></label>
                    <label><span className="label">Potencia ({powerUnit})</span><ChoiceSelect className="w-full" label={`Potencia (${powerUnit}) · Vivienda ${i + 1}`} value={String(row.power)} onChange={watts => setHousing(current => current.map((house, index) => index === i ? { ...house, power: Number(watts) } : house))} items={housingPowerItems(row.level, row.power, powerUnit)} /></label>
                    <label><span className="label">Superficie (m²/viv.)</span><Input aria-label="Superficie (m²/viv.)" className="w-full" type="number" min="0" value={row.area || ''} onChange={event => setHousing(current => current.map((house, index) => index === i ? { ...house, area: Number(event.target.value) } : house))} /></label>
                    <label><span className="label">Viviendas (uds.)</span><Input className="w-full" type="number" min="0" value={row.homes} onChange={event => setHousing(current => current.map((house, index) => index === i ? { ...house, homes: Number(event.target.value) } : house))} /></label>
                    <div className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm"><span className="text-ink-faint">Subtotal</span><strong className="tabular-nums">{power(row.power * row.homes)}</strong></div>
                  </div>
                </article>)}
              </div>
              <div className="hidden min-w-0 overflow-x-auto md:block">
                <Table className="w-full min-w-[700px] text-left text-sm">
                  <TableHeader><TableRow className="border-b border-line text-xs uppercase tracking-wide text-ink-faint"><TableHead scope="col" className="pb-3">Vivienda</TableHead><TableHead scope="col" className="pb-3">Electrificación</TableHead><TableHead scope="col" className="pb-3">Potencia ({powerUnit})</TableHead><TableHead scope="col" className="pb-3">M² / Vivienda</TableHead><TableHead scope="col" className="pb-3">Viviendas (uds.)</TableHead><TableHead scope="col" className="pb-3 text-right">Subtotal ({powerUnit})</TableHead><TableHead scope="col" className="pb-3" /></TableRow></TableHeader>
                  <TableBody>{housing.map((row, i) => <TableRow key={i} className="border-b border-line-soft">
                    <TableCell className="py-3 font-medium">Vivienda {i + 1}</TableCell>
                    <TableCell className="py-3"><ChoiceSelect label={`Electrificación · Vivienda ${i + 1}`} value={row.level} onChange={event => { const level = event as HousingRow['level']; setHousing(current => current.map((house, index) => index === i ? { ...house, level, power: level === 'Básica' ? settings.basicHousingPower : settings.elevatedHousingPower } : house)) }} items={['Básica', 'Elevada']} /></TableCell>
                    <TableCell className="py-3"><ChoiceSelect label={`Potencia (${powerUnit}) · Vivienda ${i + 1}`} className="w-32" value={String(row.power)} onChange={watts => setHousing(current => current.map((house, index) => index === i ? { ...house, power: Number(watts) } : house))} items={housingPowerItems(row.level, row.power, powerUnit)} /></TableCell>
                    <TableCell className="py-3"><Input aria-label={`Superficie (m²/viv.) · Vivienda ${i + 1}`} className="w-20" type="number" min="0" value={row.area || ''} onChange={event => setHousing(current => current.map((house, index) => index === i ? { ...house, area: Number(event.target.value) } : house))} /></TableCell>
                    <TableCell className="py-3"><Input aria-label={`Viviendas (uds.) · Vivienda ${i + 1}`} className="w-20" type="number" min="0" value={row.homes} onChange={event => setHousing(current => current.map((house, index) => index === i ? { ...house, homes: Number(event.target.value) } : house))} /></TableCell>
                    <TableCell className="py-3 text-right font-semibold tabular-nums">{powerValue(row.power * row.homes)}</TableCell>
                    <TableCell className="py-3 text-right"><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar vivienda ${i + 1}`} onClick={() => setHousing(current => current.filter((_, index) => index !== i))}><Trash2 /></Button></TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              </div>
              {housing.length === 0 && <p className="py-4 text-center text-sm text-ink-faint">No hay viviendas añadidas.</p>}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold sm:w-auto sm:flex-1" onClick={() => setHousing(current => [...current, { level: 'Básica', power: settings.basicHousingPower, homes: 1, area: 0 }])}><Plus data-icon="inline-start" /> Añadir vivienda</Button><Metric label="P1 · Viviendas" value={`${power(result.p1)}`} accent /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total viviendas" value={`${result.homes} uds.`} /><Metric label="Potencia media" value={`${power(result.average)}`} /><Metric label="Superficie construida · informativo" value={`${fmt(dwellingArea)} m²`} /><div className="rounded-control bg-surface-muted p-3">
              <p className="text-xs text-ink-faint">Coeficiente de simultaneidad</p>
              <div className="mt-1 flex items-center justify-between gap-2"><p className="font-bold tabular-nums">{fmtDec(result.cs)}</p><Button type="button" variant="outline" size="icon" aria-label="Ver tabla del coeficiente de simultaneidad" aria-haspopup="dialog" aria-controls="simultaneity-dialog" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-transparent text-ink-faint transition-colors hover:border-brand-mark hover:bg-brand-soft hover:text-brand" onClick={() => setShowSimultaneityTable(true)}><Table2 className="size-4" aria-hidden="true" /></Button></div>
            </div></div>
            {settings.showSourceNotes && <SourceNote label="ITC-BT-25 tabla A e ITC-BT-10 §3.1">ITC-BT-25 tabla A (escalones de 5.750 y 7.360 W en electrificación básica; 9.200, 11.500 y 14.490 W en elevada) e ITC-BT-10 §3.1, que aplica la tabla 1 de coeficientes de simultaneidad sobre la potencia media por vivienda. La superficie por vivienda es un dato informativo: no interviene en P1. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}
            </section>
            <section className="rounded-card border border-line bg-paper p-5 shadow-card"><SectionTitle code="P2" title="Servicios generales" subtitle="Ascensores, motores, otras cargas y alumbrado de zonas comunes" /><div className="flex flex-col gap-4"><ServiceTable title="Ascensores" addLabel="Añadir ascensor" onAdd={() => setElevators(es => [...es, { name: `Ascensor ${es.length + 1}`, ita: 'ITA-1', power: itaPowerW('ITA-1'), unit: 'W' }])} headers={['Descripción', 'ITA', 'Potencia ITA', 'Potencia real', 'Unidad', '']} rows={elevators.map((row, i) => [<Input key="name" aria-label={`Descripción · Ascensor ${i + 1}`} className="w-32" value={row.name} onChange={e => setElevators(es => es.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />, <div key="ita-group" className="flex items-center gap-1"><ChoiceSelect key="ita" label={`Tipo ITA · ${row.name}`} value={row.ita} onChange={value => setElevators(es => es.map((x, j) => j === i ? { ...x, ita: value as ElevatorRow['ita'], power: itaPowerW(value as ElevatorRow['ita']), unit: 'W' } : x))} items={['ITA-1', 'ITA-2', 'ITA-3', 'ITA-4', 'ITA-5', 'ITA-6']} /><Button key="ita-info" type="button" variant="outline" size="icon" className="flex size-8 items-center justify-center rounded-lg border border-line bg-transparent text-ink-faint transition-colors hover:border-brand-mark hover:bg-brand-soft hover:text-brand-strong" aria-label="Ver tabla de tipos ITA" onClick={() => setShowItaTable(true)}><Table2 className="size-4" /></Button></div>, <span key="ita-power" className="tabular-nums text-sm">{fmtDec(itaPowerW(row.ita) / 1000)} kW</span>, <Input key="power" aria-label={`Potencia real · ${row.name}`} className="w-24" type="number" min="0" value={row.power || ''} onChange={e => setElevators(es => es.map((x, j) => j === i ? { ...x, power: Number(e.target.value) } : x))} />, <ChoiceSelect key="unit" label={`Unidad · ${row.name}`} value={row.unit} onChange={e => setElevators(es => es.map((x, j) => j === i ? { ...x, unit: e as ElevatorRow['unit'] } : x))} items={['W', 'CV']} />, <Button key="remove" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setElevators(es => es.filter((_, j) => j !== i))}><Trash2 /></Button>])} /><ServiceTable title="Motores" addLabel="Añadir motor" onAdd={() => setMotors(ms => [...ms, { name: `Motor ${ms.length + 1}`, power: 0, unit: 'W' }])} headers={['Descripción', 'Potencia', 'Unidad', '']} rows={motors.map((row, i) => [<Input key="name" aria-label={`Descripción · Motor ${i + 1}`} className="w-36" value={row.name} onChange={e => setMotors(ms => ms.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />, <Input key="power" aria-label={`Potencia · ${row.name}`} className="w-24" type="number" min="0" value={row.power || ''} onChange={e => setMotors(ms => ms.map((x, j) => j === i ? { ...x, power: Number(e.target.value) } : x))} />, <ChoiceSelect key="unit" label={`Unidad · ${row.name}`} value={row.unit} onChange={e => setMotors(ms => ms.map((x, j) => j === i ? { ...x, unit: e as MotorRow['unit'] } : x))} items={['W', 'CV']} />, <Button key="remove" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setMotors(ms => ms.filter((_, j) => j !== i))}><Trash2 /></Button>])} /><ServiceTable title="Otras cargas" addLabel="Añadir carga" onAdd={() => setOtherLoads(ls => [...ls, { name: `Carga ${ls.length + 1}`, power: 0 }])} headers={['Descripción', `Potencia (${powerUnit})`, '']} rows={otherLoads.map((row, i) => [<Input key="name" aria-label={`Descripción · Carga ${i + 1}`} className="w-44" value={row.name} onChange={e => setOtherLoads(ls => ls.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />, <Input key="power" aria-label={`Potencia · ${row.name}`} className="w-28" type="number" min="0" value={row.power || ''} onChange={e => setOtherLoads(ls => ls.map((x, j) => j === i ? { ...x, power: Number(e.target.value) } : x))} />, <Button key="remove" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setOtherLoads(ls => ls.filter((_, j) => j !== i))}><Trash2 /></Button>])} /><LightingTable rows={lighting} settings={settings} onChange={setLighting} /></div><Metric label="P2 · Servicios generales" value={`${power(result.p2)}`} accent /><p className="mt-4 flex items-start gap-2 rounded-lg bg-brand-soft p-3 text-xs leading-5 text-brand-ink"><Info data-icon="inline-start" /> ITA permite distinguir la potencia del ascensor. Coeficientes actuales: ascensores ×{fmtDec(settings.elevatorCoefficient)}, motor de mayor potencia ×{fmtDec(settings.motorCoefficient)} y lámparas de descarga ×{fmtDec(settings.dischargeLampCoefficient)}. Motores y otras cargas se suman a valor nominal; el incremento del motor mayor es {fmt(result.motorIncrement)} W. Conversión para potencias expresadas en CV: {fmtDec(settings.cvToWatts)} W/CV. Los cambios en Parámetros de cálculo se aplican automáticamente a P2.</p>{settings.showSourceNotes && <SourceNote label="ITC-BT-10 §3.2">ITC-BT-10 §3.2: los servicios generales se suman sin factor de reducción por simultaneidad (CS = 1). La instrucción no fija coeficientes de mayoración: el 1,3 de ascensores, el 25 % del motor mayor y el 1,8 de lámparas de descarga son criterios de proyecto, editables en Parámetros de cálculo. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}</section>
            <section className="rounded-card border border-line bg-paper p-5 shadow-card"><SectionTitle code="P3" title="Locales, oficinas e industrias" subtitle="Comercial/oficina o industria: se toma el mayor valor entre previsión real, superficie y mínimo por abonado" /><EditableTable headers={['Descripción', 'Tipo', 'Superficie (m²)', `Previsión real (${powerUnit})`, `P prevista (${powerUnit})`, '']} rows={locals.map((row, i) => [row.name, <ChoiceSelect key="type" label={`Tipo · ${row.name}`} value={row.type} onChange={value => setLocals(ls => ls.map((x, j) => j === i ? { ...x, type: value as LocalRow['type'] } : x))} items={['Comercial/oficina', 'Industria']} />, <Input key="a" aria-label={`Superficie (m²) · ${row.name}`} className="w-24" type="number" min="0" value={row.area || ''} onChange={e => setLocals(ls => ls.map((x, j) => j === i ? { ...x, area: Number(e.target.value) } : x))} />, <Input key="b" aria-label={`Previsión real (${powerUnit}) · ${row.name}`} className="w-28" type="number" min="0" step={powerUnit === 'kW' ? '0.01' : '1'} value={powerFieldValue(row.real, powerUnit) || ''} onChange={e => setLocals(ls => ls.map((x, j) => j === i ? { ...x, real: storePower(Number(e.target.value), powerUnit) } : x))} />, <strong key="c" className="tabular-nums">{powerValue(previewLocalPower(row, settings))}</strong>, <Button key="d" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setLocals(ls => ls.filter((_, j) => j !== i))}><Trash2 data-icon="inline-start" /></Button>])} />{locals.length === 0 && <p className="py-4 text-center text-sm text-ink-faint">No hay locales añadidos.</p>}<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold sm:w-auto sm:flex-1" onClick={() => setLocals(ls => [...ls, { name: `Local ${ls.length + 1}`, type: 'Comercial/oficina', area: 0, real: 0 }])}><Plus data-icon="inline-start" /> Añadir local</Button><Metric label="P3 · Locales y oficinas" value={`${power(result.p3)}`} accent /></div>{settings.showSourceNotes && <SourceNote label="ITC-BT-10 §3.3 y §4.2">ITC-BT-10 §3.3 para locales comerciales y oficinas (100 W/m² y planta, mínimo 3.450 W por local) y §4.2 «Edificios destinados a concentración de industrias» (125 W/m² y planta, mínimo 10.350 W), ambos con CS = 1. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}</section>
            <section className="rounded-card border border-line bg-paper p-5 shadow-card"><SectionTitle code="P4" title="Garajes" subtitle="Previsión según ventilación y superficie · plazas informativas" /><EditableTable headers={['Descripción', 'Ventilación', 'Plazas', 'Superficie (m²)', `P prevista (${powerUnit})`, '']} rows={garages.map((row, i) => [row.name, <ChoiceSelect key="a" label={`Ventilación · ${row.name}`} value={row.ventilation} onChange={e => setGarages(gs => gs.map((x, j) => j === i ? { ...x, ventilation: e as GarageRow['ventilation'] } : x))} items={['Forzada', 'Natural']} />, <Input key="p" aria-label={`Plazas · ${row.name}`} className="w-20" type="number" min="0" step="1" value={row.plazas || ''} onChange={e => setGarages(gs => gs.map((x, j) => j === i ? { ...x, plazas: Number(e.target.value) } : x))} />, <Input key="b" aria-label={`Superficie (m²) · ${row.name}`} className="w-24" type="number" min="0" value={row.area || ''} onChange={e => setGarages(gs => gs.map((x, j) => j === i ? { ...x, area: Number(e.target.value) } : x))} />, <strong key="c" className="tabular-nums">{powerValue(previewGaragePower(row, settings))}</strong>, <Button key="d" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setGarages(gs => gs.filter((_, j) => j !== i))}><Trash2 data-icon="inline-start" /></Button>])} />{garages.length === 0 && <p className="py-4 text-center text-sm text-ink-faint">No hay garajes añadidos.</p>}<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold sm:w-auto sm:flex-1" onClick={() => setGarages(gs => [...gs, { name: `Garaje ${gs.length + 1}`, ventilation: 'Forzada', area: 0, plazas: 0 }])}><Plus data-icon="inline-start" /> Añadir garaje</Button><div className="flex flex-wrap items-end gap-3"><Metric label="Plazas en estacionamientos · informativo" value={fmt(garageParkingSpaces)} /><Metric label="P4 · Garajes" value={`${power(result.p4)}`} accent /></div></div>{settings.showSourceNotes && <SourceNote label="ITC-BT-10 §3.4">ITC-BT-10 §3.4: 10 W/m² y planta con ventilación natural y 20 W/m² con ventilación forzada, con un mínimo de 3.450 W por garaje y CS = 1. El número de plazas de cada garaje es informativo: no interviene en P4, que se calcula por superficie; su total es el que la Guía-BT-52 (Anexo 2) usa en el mínimo del 10 % de IRVE. <BoeLink href={BOE_REBT} label="RD 842/2002 · BOE-A-2002-18099" /></SourceNote>}</section>
            <section className="rounded-card border border-line bg-paper p-5 shadow-card"><SectionTitle code="P5" title="Recarga de vehículos eléctricos" subtitle="Selecciona el escenario de previsión" /><div className="grid gap-3 sm:grid-cols-[180px_1fr]"><LabeledInput label="Plazas de aparcamiento" value={parking === 0 ? '' : String(parking)} suffix="uds." onChange={e => setParking(Number(e.target.value))} /><FieldSet><FieldLegend className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Opción de cálculo</FieldLegend><RadioGroup value={irveOption} onValueChange={value => setIrveOption(Number(value))}>{IRVE_OPTION_LABELS.map((name, i) => <FieldLabel key={name} htmlFor={`irve-${i + 1}`} onClick={() => setIrveOption(i + 1)} className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${irveOption === i + 1 ? 'border-brand-mark bg-brand-soft' : 'border-line'}`}><RadioGroupItem id={`irve-${i + 1}`} value={i + 1} />{name}<span className="ml-auto text-xs text-ink-faint">Cs {i === 1 ? '0,3' : '1'}</span></FieldLabel>)}</RadioGroup></FieldSet></div><div className="mt-4 flex justify-end"><Metric label={`P5 · IRVE · ${result.plazas} plazas consideradas`} value={`${power(result.p5)}`} accent /></div>{settings.showSourceNotes && <SourceNote label="Guía-BT-52 · Anexo 2">Guía-BT-52, Anexo 2 («Previsión de cargas en edificios de viviendas de nueva construcción con garajes en régimen de condominio»): 3.680 W por el 10 % de las plazas construidas, que la Guía declara valor mínimo reglamentario, multiplicado por el factor de simultaneidad de la ITC-BT-52 (1 sin SPL, 0,3 con SPL). Es previsión de potencia, no la preinstalación de conductos, que fija el CTE (DB-HE 6: 100 % de las plazas en residencial privado). Las opciones «todas las plazas» son una previsión ampliada. <BoeLink href={GUIA_BT_52} label="Guía-BT-52 · Anexo 2" /> · <BoeLink href={BOE_ITC_BT_52} label="RD 1053/2014 · BOE-A-2014-13681" /></SourceNote>}</section>
          </div>
          <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-6 xl:self-start"><div className="overflow-hidden rounded-panel bg-panel text-panel-foreground shadow-panel"><div className="border-b border-panel-line p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-on-panel">Resultado del proyecto</p><p className="mt-5 text-4xl font-bold tabular-nums tracking-tight">{formatPowerValue(result.total, powerUnit)} <span className="text-lg font-medium text-panel-muted">{powerUnit}</span></p><p className="mt-1 text-sm text-panel-muted">Potencia total prevista</p>{result.total === 0 && <p className="mt-3 rounded-lg bg-panel-edge/60 p-3 text-xs leading-5 text-panel-muted">Sin cargas todavía. Añade viviendas o pulsa «Cargar ejemplo» para partir del edificio de referencia.</p>}</div><div className="flex flex-col gap-3 p-6">{[['P1', 'Viviendas', result.p1], ['P2', 'Servicios generales', result.p2], ['P3', 'Locales y oficinas', result.p3], ['P4', 'Garajes', result.p4], ['P5', 'IRVE', result.p5]].map(([code, label, value]) => {
  const amount = value as number
  const share = result.total > 0 ? (amount / result.total) * 100 : 0
  return <div key={code as string}>
    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="text-panel-muted"><b className="mr-2 text-brand-on-panel">{code}</b>{label}</span><span className="font-semibold tabular-nums">{power(amount)}</span></div>
    <div aria-hidden="true" className="mt-1.5 h-1 overflow-hidden rounded-full bg-panel-line"><div className="h-full rounded-full bg-brand-on-panel/80" style={{ width: `${share}%` }} /></div>
  </div>
})}<div className="my-2 h-px bg-panel-line" /><div className="flex items-center justify-between"><span className="font-semibold">Total</span><span className="text-xl font-bold tabular-nums text-brand-on-panel">{power(result.total)}</span></div></div></div>
            <button type="button" className="grid w-full grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-card border border-line bg-paper p-5 text-left shadow-card transition-colors hover:border-brand-line hover:bg-brand-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setShowSettings(true)}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><SlidersHorizontal className="size-4" /></span>
              <span className="min-w-0 text-sm font-bold">Parámetros de cálculo</span>
              <span className="col-span-2 text-xs leading-5 text-ink-faint">Ajusta viviendas, garajes, coeficientes y equipos en un solo lugar.</span>
              <span className="col-span-2 flex items-center justify-end gap-1 text-xs font-semibold text-brand">Configurar<ChevronRight className="size-3.5" aria-hidden="true" /></span>
            </button>
            <section className="rounded-card border border-line bg-paper p-5 shadow-card">
              <div className="mb-3"><h3 className="text-sm font-bold">Datos de la memoria técnica</h3><p className="mt-1 text-xs leading-5 text-ink-faint">Completa los datos que aparecerán en la cabecera del PDF.</p></div>
              {(projectInfo.logo || projectInfo.companyName) && <div className="mb-3 flex items-center gap-3 rounded-control border border-line bg-surface-muted/60 p-3">{projectInfo.logo && <span className="flex h-10 max-w-[140px] shrink-0 items-center justify-center rounded-lg border border-line bg-paper p-1.5"><img src={projectInfo.logo} alt={`Logo de ${projectInfo.companyName || 'la empresa'}`} className="max-h-full w-auto max-w-[132px] object-contain" /></span>}<span className="min-w-0"><span className="block truncate text-sm font-semibold">{projectInfo.companyName || 'Sin nombre de empresa'}</span><span className="mt-0.5 block text-xs text-ink-faint">Membrete del PDF</span></span></div>}
              <Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold w-full" onClick={() => setShowProjectInfo(true)}><Building2 data-icon="inline-start" /> Editar datos del proyecto</Button>
            </section>
            <button type="button" aria-haspopup="dialog" aria-controls="references-dialog" className="flex w-full items-center justify-between rounded-control border border-line bg-paper px-4 py-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" onClick={() => setShowReferences(true)}>
              <span>Tablas y referencias</span><span className="flex items-center gap-2 text-brand"><span className="text-xs">Ver tablas</span><Table2 className="size-4" /></span>
            </button>
            <Dialog open={showReferences} onOpenChange={setShowReferences}>
              <DialogContent id="references-dialog" showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-2xl">
                <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="references-title" className="text-xl font-bold text-ink">Tablas y referencias</DialogTitle><DialogDescription id="references-description" className="mt-1 text-sm text-ink-faint">Criterios de previsión de cargas según ITC-BT-10 e ITC-BT-25.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tablas y referencias" />}><X /></DialogClose></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="rounded-lg bg-surface-muted p-3 text-sm"><b>Locales:</b> mínimo 3.450 W por abonado; industria 10.350 W y 125 W/m².</p>
                  <p className="rounded-lg bg-surface-muted p-3 text-sm"><b>Garajes:</b> 20 W/m² con ventilación forzada y 10 W/m² con ventilación natural.</p>
                  <p className="rounded-lg bg-surface-muted p-3 text-sm sm:col-span-2"><b>Alumbrado de zonas comunes:</b> portal 15 W/m² (incandescencia) u 8 W/m² (fluorescencia/LED); escalera 7 u 4 W/m². Las lámparas de descarga se mayoran ×1,8.</p>
                  <p className="rounded-lg bg-surface-muted p-3 text-sm"><b>IRVE:</b> 3.680 W por plaza.</p>
                </div>
                <h3 className="mt-6 font-bold text-ink-soft">Tabla A · Escalones de potencia prevista · ITC-BT-25</h3>
                <p className="mt-1 text-xs text-ink-faint">Suministros monofásicos a 230 V. El escalón fija el calibre del interruptor general automático (IGA).</p>
                <div className="mt-2 overflow-hidden rounded-lg border border-line">
                  <Table className="w-full text-left text-sm">
                    <TableHeader><TableRow className="border-b border-line text-xs uppercase tracking-wide text-ink-faint"><TableHead scope="col" className="px-4 py-3 text-center">Electrificación</TableHead><TableHead scope="col" className="px-4 py-3 text-center">Potencia ({powerUnit})</TableHead><TableHead scope="col" className="px-4 py-3 text-center">IGA (A)</TableHead></TableRow></TableHeader>
                    <TableBody>{HOUSING_POWER_STEPS.map(([grade, watts, iga]) => <TableRow key={`${grade}-${watts}`} className="border-b border-line-soft"><TableCell className="px-4 py-2 text-center">{grade}</TableCell><TableCell className="px-4 py-2 text-center font-medium tabular-nums">{fmt(Number(watts))}</TableCell><TableCell className="px-4 py-2 text-center tabular-nums">{iga}</TableCell></TableRow>)}</TableBody>
                  </Table>
                </div>
                <h3 className="mt-6 font-bold text-ink-soft">Coeficiente de simultaneidad · ITC-BT-10</h3>
                <div className="mt-2 max-h-[45vh] overflow-y-auto rounded-lg border border-line">
                  <Table className="w-full text-left text-sm">
                    <TableHeader className="sticky top-0 z-10 bg-table-cs-head text-xs uppercase tracking-wide text-table-cs-head-text">
                      <TableRow className="border-table-cs-head"><TableHead scope="col" className="px-4 py-3 text-center text-table-cs-head-text">N.º viviendas (n)</TableHead><TableHead scope="col" className="px-4 py-3 text-center text-table-cs-head-text">Coeficiente de simultaneidad</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>{ITC_BT_10_COEFFICIENTS.slice(1).map((coefficient, index) => <TableRow key={index + 1} className={`border-b border-line-soft text-table-cs-row-text ${index % 2 === 0 ? 'bg-table-cs-row-odd' : 'bg-table-cs-row-even'}`}><TableCell className="px-4 py-2 text-center tabular-nums">{index + 1}</TableCell><TableCell className="px-4 py-2 text-center font-medium tabular-nums">{fmtDec(coefficient)}</TableCell></TableRow>)}<TableRow className="border-t border-line bg-table-cs-row-even text-table-cs-row-text"><TableCell className="px-4 py-3 text-center font-semibold">n &gt; 21</TableCell><TableCell className="px-4 py-3 text-center font-semibold">15,3 + (n − 21) × 0,5</TableCell></TableRow></TableBody>
                  </Table>
                </div>
                <p className="mt-4 rounded-lg bg-warning-soft p-4 text-sm leading-5 text-warning-ink"><b>Tarifa nocturna:</b> el coeficiente de simultaneidad es igual al número de viviendas (n).</p>
                <div className="mt-6 flex justify-end"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={() => setShowReferences(false)}>Cerrar</Button></div>
              </DialogContent>
            </Dialog>
            <Elec3PreviewDialog open={showElec3} onOpenChange={setShowElec3} />
            <Dialog open={showDownload} onOpenChange={setShowDownload}>
              <DialogContent id="download-dialog" showCloseButton={false} className="max-h-[85dvh] w-full overflow-y-auto rounded-panel bg-paper p-6 shadow-panel ring-0 gap-0 sm:max-w-xl">
                <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="download-title" className="text-xl font-bold text-ink">Descargar datos</DialogTitle><DialogDescription id="download-description" className="mt-1 text-sm text-ink-faint">Los cuatro formatos incluyen los mismos datos del proyecto, el desglose P1–P5 y el dimensionado de LGA y DI.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar descarga de datos" />}><X /></DialogClose></div>
                <div className="grid gap-2">
                  <DownloadOption label="PDF" hint="Memoria técnica paginada, lista para firmar" icon={FileText} onClick={downloadReport} />
                  <DownloadOption label="JSON" hint="Datos crudos del proyecto y los cálculos, para volver a cargarlos con «Cargar proyecto»" icon={FileJson} onClick={downloadJson} />
                  <DownloadOption label="Markdown" hint="Texto estructurado con tablas, para pegar en un issue o un README" icon={FileCode2} onClick={downloadMarkdown} />
                  <DownloadOption label="Texto simple" hint="Notas de obra sin formato, se abre en cualquier editor" icon={FileType} onClick={downloadText} />
                </div>
              </DialogContent>
            </Dialog><div className="flex flex-col gap-2 border-t border-line pt-4"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={() => setShowDownload(true)}><Download data-icon="inline-start" /> Descargar datos</Button><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={reset}><RotateCcw data-icon="inline-start" /> Cargar ejemplo</Button><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" aria-label="Limpiar datos del proyecto y memoria técnica" onClick={clear}><Trash2 data-icon="inline-start" /> Limpiar</Button><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={() => projectFileInput.current?.click()}><FolderOpen data-icon="inline-start" /> Cargar proyecto</Button><Input ref={projectFileInput} type="file" accept="application/json,.json" className="hidden" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; loadProjectFile(file) }} /><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={() => setShowElec3(true)}><FileJson data-icon="inline-start" /> Ver ELEC-3</Button>{projectLoad && <p role={projectLoad.kind === 'error' ? 'alert' : 'status'} className={`text-xs leading-5 ${projectLoad.kind === 'error' ? 'text-danger' : 'text-ink-faint'}`}>{projectLoad.message}</p>}</div></aside>
        </div>
        {explanationMode === 'didactic' && <CalculationSteps steps={loadExplanation.steps as ExplanationStep[]} />}
          </TabsContent>
          <TabsContent value="lga" data-dir={tabDirection} className="tab-panel">
            <MeterCenterCard center={meterCenter} onChange={updateMeterCenter} suggestedMeters={suggestedMeters} evaluation={meterEvaluation} explanation={meterExplanation} explanationMode={explanationMode} showSourceNotes={settings.showSourceNotes} />
            {installationType === 'single-user'
              ? <p className="mt-6 rounded-card border border-line bg-brand-soft p-4 text-sm leading-6 text-brand-ink"><b>Único usuario sin línea general.</b> La medida es individual: no hay LGA. El supuesto y la centralización se gestionan en la card de arriba.</p>
              : <LgaPanel state={lga} onChange={updateLga} onOpenTables={openLineTables} showSourceNotes={settings.showSourceNotes} installationType={installationType} explanationMode={explanationMode} powerMode={lgaPowerMode} onPowerModeChange={changeLgaPowerMode} loadTotal={result.total} powerUnit={powerUnit} />}
          </TabsContent>
          <TabsContent value="di" data-dir={tabDirection} className="tab-panel">
            <section className="mb-6 rounded-card border border-line bg-paper p-5 shadow-card">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-bold"><span aria-hidden="true" className="size-2 rounded-full bg-tab-di" />Derivaciones del proyecto</h3>
                  <p className="mt-1 text-sm text-ink-faint">Una DI por consumidor. Se generan desde la previsión y se dimensionan con su propia potencia.</p>
                </div>
                <Button type="button" variant="outline" className="h-auto gap-2 rounded-control px-4 py-3 font-semibold" onClick={generateDerivations}><Plus data-icon="inline-start" /> Generar desde previsión</Button>
              </div>
              {calculatedDerivations.length === 0 ? (
                <p className="py-4 text-sm text-ink-faint">Todavía no hay derivaciones. Generarlas desde la previsión para ver la lista.</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="border-b border-line text-left text-ink-faint">
                          <TableHead className="pb-2">Tipo</TableHead>
                          <TableHead className="pb-2">Elemento</TableHead>
                          <TableHead className="pb-2">Sistema</TableHead>
                          <TableHead className="pb-2 text-right">Potencia</TableHead>
                          <TableHead className="pb-2">Longitud</TableHead>
                          <TableHead className="pb-2">Método</TableHead>
                          <TableHead className="pb-2">Protección</TableHead>
                          <TableHead className="pb-2 text-right">Sección</TableHead>
                          <TableHead className="pb-2 text-right">Caída</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculatedDerivations.map(derivation => (
                          <TableRow key={derivation.id} className={`cursor-pointer border-b border-line-soft ${selectedDerivationId === derivation.id ? 'bg-brand-soft' : ''}`} onClick={() => setSelectedDerivationId(derivation.id)}>
                            <TableCell className="py-2">{DERIVATION_LABELS[derivation.kind]}</TableCell>
                            <TableCell className="py-2 font-medium"><Button type="button" variant="link" aria-pressed={selectedDerivationId === derivation.id} className="h-auto whitespace-normal p-0 text-left font-medium text-ink underline-offset-4 hover:underline" onClick={() => setSelectedDerivationId(derivation.id)}>{derivation.label}</Button></TableCell>
                            <TableCell className="py-2">{derivation.system === 'three-phase' ? 'Trifásica' : 'Monofásica'}</TableCell>
                            <TableCell className="py-2 text-right tabular-nums">{power(derivation.powerW)}</TableCell>
                            <TableCell className="py-2"><Input aria-label={`Longitud · ${derivation.label}`} className="w-20" type="number" min="0" value={derivation.lengthM} onChange={event => updateDerivation(derivation.id, { lengthM: Math.max(0, Number(event.target.value)) })} /></TableCell>
                            <TableCell className="py-2"><ChoiceSelect label={`Método · ${derivation.label}`} value={derivation.method} onChange={value => updateDerivation(derivation.id, { method: value as LineState['method'] })} items={[...METHODS]} /></TableCell>
                            <TableCell className="py-2"><Input aria-label={`Protección · ${derivation.label}`} className="w-20" type="number" min="0" value={derivation.protectionA || ''} onChange={event => updateDerivation(derivation.id, { protectionA: Math.max(0, Number(event.target.value)) })} /></TableCell>
                            <TableCell className="py-2 text-right tabular-nums">{derivation.result.finalSection == null ? '—' : `${fmt(derivation.result.finalSection)} mm²`}</TableCell>
                            <TableCell className="py-2 text-right tabular-nums">{derivation.result.dropPercent == null ? '—' : `${fmt(derivation.result.dropPercent, 2)} %`}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="mt-3 text-xs text-ink-faint">{project.summary.derivationCount} derivaciones · {power(project.summary.derivationPower)} instalados. La LGA se calcula aparte con la simultaneidad del edificio.</p>
                  {project.summary.warnings.length > 0 && (
                    <div role="status" aria-live="polite" className="mt-3 rounded-lg bg-warning-soft p-3 text-xs leading-5 text-warning-ink">
                      <p className="mb-1 font-semibold">Revisá estos puntos</p>
                      <ul className="list-disc space-y-1 pl-4">
                        {project.summary.warnings.map(warning => <li key={warning}>{warning}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </section>
            <DiPanel state={selectedState} onChange={updateSelectedDerivation} onOpenTables={openLineTables} showSourceNotes={settings.showSourceNotes} installationType={installationType} explanationMode={explanationMode} system={selectedSystem} editingLabel={selectedDerivation?.label} powerUnit={powerUnit} />
          </TabsContent>
          <TabsContent value="interiores" data-dir={tabDirection} className="tab-panel">
            <div className="flex flex-col gap-6">
              <InteriorPanel dwellings={interiorDwellings} selectedId={effectiveDwellingId} onSelect={setSelectedDwellingId} onChange={updateDerivationInterior} hasIrve={parking > 0} explanationMode={explanationMode} showSourceNotes={settings.showSourceNotes} />
              <InteriorCircuitsPanel supplies={circuitSupplies} selectedId={effectiveSupplyId} onSelect={setSelectedSupplyId} onChange={updateDerivationCircuits} explanationMode={explanationMode} showSourceNotes={settings.showSourceNotes} />
            </div>
          </TabsContent>
          <TabsContent value="esquema" data-dir={tabDirection} className="tab-panel">
            <UnifilarPanel
              lga={{ ...lga, result: lgaResult }}
              derivations={calculatedDerivations}
              installationType={installationType}
              onGenerateDerivations={generateDerivations}
              onOpenDerivations={() => changeTab('di')}
            />
          </TabsContent>
        </Tabs>
        <LineTablesDialog open={showLineTables} onOpenChange={setShowLineTables} tables={lineTableFocus ?? undefined} />
      </div>
      <SiteFooter />
    </main>
  )
}

function ModeBackdrop() {
  return (
    <div aria-hidden="true" className="mode-backdrop">
      <div className="mode-backdrop-grid" />
      <div className="mode-backdrop-dots" />
      <span className="mode-blob mode-blob-a" />
      <span className="mode-blob mode-blob-b" />
      <span className="mode-blob mode-blob-c" />
    </div>
  )
}

function SectionTitle({ code, title, subtitle }: { code: string; title: string; subtitle: string }) { return <div className="mb-5"><h3 className="flex items-center gap-2 font-bold"><span className="rounded-tab border border-brand-line bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] leading-none tracking-[0.08em] text-brand-ink">{code}</span>{' '}{title}</h3><p className="mt-1 text-sm text-ink-faint">{subtitle}</p></div> }
function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-control p-3 ${accent ? 'bg-brand-soft' : 'bg-surface-muted'}`}><p className="text-xs text-ink-faint">{label}</p><p className={`mt-1 font-bold tabular-nums ${accent ? 'text-brand' : ''}`}>{value}</p></div> }
function DownloadOption({ label, hint, icon: Icon, onClick }: { label: string; hint: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }) { return <Button type="button" variant="outline" className="h-auto w-full justify-start gap-3 whitespace-normal rounded-control px-4 py-3 text-left font-semibold" onClick={onClick}><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Icon className="size-4" /></span><span className="flex min-w-0 flex-col items-start"><span>{label}</span><span className="whitespace-normal text-xs font-normal text-ink-faint">{hint}</span></span></Button> }
function ChoiceSelect({ id, className, value, onChange, items, label }: { id?: string; className?: string; value: string; onChange: (value: string) => void; items: ChoiceItem[]; label?: string }) {
  const options = items.map(item => typeof item === 'string' ? { value: item, label: item } : item)
  return <Select value={value} onValueChange={next => onChange(next == null ? value : String(next))}><SelectTrigger id={id} aria-label={label} className={className}><SelectValue>{(selected: string | null) => options.find(option => option.value === selected)?.label ?? ''}</SelectValue></SelectTrigger><SelectContent><SelectGroup>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select>
}
function LabeledInput({ label, value, suffix, onChange }: { label: string; value: string; suffix: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) { return <label><span className="label">{label}</span><span className="relative block"><Input className="w-full pr-12" value={value} onChange={onChange} type={onChange ? 'number' : 'text'} readOnly={!onChange} /><span className="pointer-events-none absolute right-3 top-2.5 text-xs text-ink-faint">{suffix}</span></span></label> }
function SettingInput({ label, value, suffix, step = '1', onChange }: { label: string; value: number; suffix: string; step?: string; onChange: (value: number) => void }) { return <label><span className="label flex min-h-8 items-end leading-4">{label}</span><span className="relative block"><Input className="w-full pr-16" type="number" min="0" step={step} value={value} onChange={event => onChange(Number(event.target.value))} /><span className="pointer-events-none absolute right-3 top-2.5 text-xs text-ink-faint">{suffix}</span></span></label> }
function LightingTable({ rows, settings, onChange }: { rows: LightingRow[]; settings: CalculationSettings; onChange: (updater: (current: LightingRow[]) => LightingRow[]) => void }) {
  const update = (id: LightingId, patch: Partial<LightingRow>) => onChange(current => current.map(row => row.id === id ? { ...row, ...patch } : row))
  const tableRows = rows.map(row => [
    <span key="label" className="text-sm font-medium">{LIGHTING_LABELS[row.id]}</span>,
    <ChoiceSelect key="lamp" label={`Tipo de lámpara · ${LIGHTING_LABELS[row.id]}`} value={row.lamp} onChange={value => update(row.id, { lamp: value as LightingRow['lamp'] })} items={['Incandescencia', 'Fluorescencia/LED']} />,
    row.id === 'known' ? <span key="area" className="text-sm text-ink-ghost">—</span> : <Input key="area" aria-label={`Superficie (m²) · ${LIGHTING_LABELS[row.id]}`} className="w-24" type="number" min="0" value={row.area || ''} onChange={event => update(row.id, { area: Number(event.target.value) })} />,
    <Input key="power" aria-label={`Potencia directa (${settings.powerUnit}) · ${LIGHTING_LABELS[row.id]}`} className="w-28" type="number" min="0" step={settings.powerUnit === 'kW' ? '0.01' : '1'} value={powerFieldValue(row.power, settings.powerUnit) || ''} onChange={event => update(row.id, { power: storePower(Number(event.target.value), settings.powerUnit) })} />,
    <strong key="total" className="tabular-nums">{formatPowerValue(previewLightingPower(row, settings), settings.powerUnit)}</strong>,
  ])
  return <div>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-ink-muted">Alumbrado</h4><span className="text-xs text-ink-faint">×{fmtDec(settings.dischargeLampCoefficient)} solo en lámparas de descarga</span></div>
    <EditableTable headers={['Concepto', 'Tipo de lámpara', 'Superficie (m²)', `Potencia directa (${settings.powerUnit})`, `P prevista (${settings.powerUnit})`]} rows={tableRows} />
    <div className="mt-3 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm"><span className="text-ink-faint">Subtotal alumbrado</span><strong className="tabular-nums">{formatPower(sumLightingPowers(rows, settings), settings.powerUnit)}</strong></div>
  </div>
}
function ServiceTable({ title, addLabel, onAdd, headers, rows }: { title: string; addLabel: string; onAdd: () => void; headers: string[]; rows: React.ReactNode[][] }) { return <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold text-ink-muted">{title}</h4><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-control px-3 py-2 text-xs font-semibold sm:w-auto" onClick={onAdd}><Plus data-icon="inline-start" /> {addLabel}</Button></div><EditableTable headers={headers} rows={rows} />{rows.length === 0 && <p className="py-3 text-center text-sm text-ink-faint">No hay elementos añadidos.</p>}</div> }
function EditableTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <>
    <div className="grid gap-3 md:hidden">
      {rows.map((row, rowIndex) => <article key={`mobile-row-${rowIndex}`} className="rounded-control border border-line bg-paper p-3">
        <div className="grid gap-3">
          {row.map((cell, columnIndex) => {
            const header = headers[columnIndex]
            return header
              ? <div key={`${header}-${columnIndex}`} className="grid gap-1"><span className="text-xs font-semibold text-ink-faint">{header}</span><div className="min-w-0">{cell}</div></div>
              : <div key={`action-${columnIndex}`} className="flex justify-end">{cell}</div>
          })}
        </div>
      </article>)}
    </div>
    <div className="hidden min-w-0 overflow-x-auto md:block">
      <Table className="w-full min-w-[580px] text-left text-sm">
        <TableHeader><TableRow className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">{headers.map((header, index) => <TableHead scope="col" key={`${header}-${index}`} className="pb-3">{header}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row, rowIndex) => <TableRow key={rowIndex} className="border-b border-line-soft">{row.map((cell, columnIndex) => <TableCell key={columnIndex} className="py-3">{cell}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </div>
  </>
}

export default LoadCalculator
