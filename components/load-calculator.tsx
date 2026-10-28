'use client'

import { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download, Info, Plus, RotateCcw, Trash2, Building2, X, Table2, SlidersHorizontal } from 'lucide-react'
import { getSimultaneityCoefficient, ITC_BT_10_COEFFICIENTS } from '../lib/simultaneity.mjs'
import { clearProjectData, loadCalculatorInputs, saveCalculatorInputs } from '../lib/calculator-storage.mjs'
import { previewGaragePower, previewLocalPower, sumGaragePowers, sumLocalPowers } from '../lib/load-previews.mjs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { FieldLegend, FieldLabel, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DiPanel, LgaPanel, LineTablesDialog, type LineState } from '@/components/line-modules'

type ProjectInfo = {
  companyName: string
  companyAddress: string
  workAddress: string
  phone: string
  email: string
  logo: string
}

type HousingRow = { level: 'Básica' | 'Elevada'; power: number; homes: number }
type LocalRow = { name: string; type: string; area: number; real: number }
type GarageRow = { name: string; ventilation: 'Forzada' | 'Natural'; area: number }
type ElevatorRow = { name: string; ita: 'ITA-1' | 'ITA-2' | 'ITA-3' | 'ITA-4' | 'ITA-5' | 'ITA-6'; power: number; unit: 'W' | 'CV' }

// ITA types from ITC-BT 10 table
const ITA_TYPES = [
  { type: 'ITA-1', carga: 400, personas: 5, velocidad: 0.63, potencia: 4.5 },
  { type: 'ITA-2', carga: 400, personas: 5, velocidad: 1, potencia: 7.5 },
  { type: 'ITA-3', carga: 630, personas: 8, velocidad: 1, potencia: 11.5 },
  { type: 'ITA-4', carga: 630, personas: 8, velocidad: 1.6, potencia: 18.5 },
  { type: 'ITA-5', carga: 1000, personas: 13, velocidad: 1.6, potencia: 29.5 },
  { type: 'ITA-6', carga: 1000, personas: 13, velocidad: 2.5, potencia: 46 },
] as const
type MotorRow = { name: string; power: number; unit: 'W' | 'CV' }
type OtherLoadRow = { name: string; power: number }
type CalculationSettings = {
  basicHousingPower: number
  elevatedHousingPower: number
  localPowerPerM2: number
  minimumSupplyPower: number
  forcedGaragePowerPerM2: number
  naturalGaragePowerPerM2: number
  elevatorCoefficient: number
  motorCoefficient: number
  otherLoadCoefficient: number
  evChargerPower: number
  cvToWatts: number
}

const defaultSettings: CalculationSettings = {
  basicHousingPower: 5750,
  elevatedHousingPower: 9200,
  localPowerPerM2: 100,
  minimumSupplyPower: 3450,
  forcedGaragePowerPerM2: 20,
  naturalGaragePowerPerM2: 10,
  elevatorCoefficient: 1.3,
  motorCoefficient: 1.25,
  otherLoadCoefficient: 1.8,
  evChargerPower: 3680,
  cvToWatts: 735.5,
}

const initialHousing: HousingRow[] = [
  ...Array.from({ length: 8 }, (): HousingRow => ({ level: 'Básica', power: 5750, homes: 1 })),
  ...Array.from({ length: 3 }, (): HousingRow => ({ level: 'Elevada', power: 9200, homes: 1 })),
]
const exampleLocals: LocalRow[] = [
  { name: 'Local 1', type: 'Comercial/oficina', area: 50, real: 0 },
  { name: 'Local 2', type: 'Comercial/oficina', area: 30, real: 0 },
]
const exampleGarages: GarageRow[] = [
  { name: 'Garaje 1', ventilation: 'Forzada', area: 240 },
  { name: 'Garaje 2', ventilation: 'Natural', area: 0 },
]
const fmt = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(Math.round(value))
const fmtDec = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value)

export function LoadCalculator() {
  const [housing, setHousing] = useState<HousingRow[]>([])
  const [locals, setLocals] = useState<LocalRow[]>([])
  const [garages, setGarages] = useState<GarageRow[]>([])
  const [elevators, setElevators] = useState<ElevatorRow[]>([])
  const [motors, setMotors] = useState<MotorRow[]>([])
  const [otherLoads, setOtherLoads] = useState<OtherLoadRow[]>([])
  const [parking, setParking] = useState(0)
  const [irveOption, setIrveOption] = useState(1)
  const [activeTab, setActiveTab] = useState<'cargas' | 'lga' | 'di'>('cargas')
  const [showLineTables, setShowLineTables] = useState(false)
  const [lga, setLga] = useState<LineState>({
    powerW: 75000, voltageV: 400, cosPhi: 1, lengthM: 25, maxDropPercent: 0.5, gamma: 44,
    method: 'B1', insulation: 'PVC', circuits: 1, protectionA: 0,
    neutralSection: 35, peSection: 35, controlSection: 1.5, tubeDiameter: 140,
    installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
  })
  const [di, setDi] = useState<LineState>({
    powerW: 9200, voltageV: 230, cosPhi: 1, lengthM: 20, maxDropPercent: 1.5, gamma: 48.5,
    method: 'B1', insulation: 'PVC', circuits: 1, protectionA: 0,
    neutralSection: 16, peSection: 16, controlSection: 1.5, tubeDiameter: 40,
    installation: 'air', layout: 'embedded', layers: 1, tubes: 1,
  })
  const updateLga = (patch: Partial<LineState>) => setLga(current => ({ ...current, ...patch }))
  const updateDi = (patch: Partial<LineState>) => setDi(current => ({ ...current, ...patch }))
  const [showReferences, setShowReferences] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProjectInfo, setShowProjectInfo] = useState(false)
  const [showItaTable, setShowItaTable] = useState(false)
  const [showSimultaneityTable, setShowSimultaneityTable] = useState(false)
  const [settings, setSettings] = useState<CalculationSettings>(defaultSettings)
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({ companyName: '', companyAddress: '', workAddress: '', phone: '', email: '', logo: '' })
  const [storageLoaded, setStorageLoaded] = useState(false)

  useEffect(() => {
    try {
      const savedInputs = loadCalculatorInputs(window.localStorage)
      if (savedInputs) {
        setHousing(savedInputs.housing)
        setLocals(savedInputs.locals)
        setGarages(savedInputs.garages)
        setElevators(savedInputs.elevators)
        setMotors(savedInputs.motors)
        setOtherLoads(savedInputs.otherLoads)
        setParking(savedInputs.parking)
        setIrveOption(savedInputs.irveOption)
      }
    } catch { /* Local storage may be unavailable in private browsing. */ }

    try {
      const saved = window.localStorage.getItem('electrocalc-settings')
      if (saved) {
        try { setSettings({ ...defaultSettings, ...JSON.parse(saved) }) } catch { window.localStorage.removeItem('electrocalc-settings') }
      }
    } catch { /* Keep default calculation parameters when storage is unavailable. */ }

    try {
      const savedProject = window.localStorage.getItem('electrocalc-project-info')
      if (savedProject) {
        try { setProjectInfo({ companyName: '', companyAddress: '', workAddress: '', phone: '', email: '', logo: '', ...JSON.parse(savedProject) }) } catch { window.localStorage.removeItem('electrocalc-project-info') }
      }
    } catch { /* Keep project information empty when storage is unavailable. */ }

    setStorageLoaded(true)
  }, [])

  useEffect(() => {
    if (!storageLoaded) return
    try {
      saveCalculatorInputs(window.localStorage, { housing, locals, garages, elevators, motors, otherLoads, parking, irveOption })
    } catch { /* Storage failure does not block calculator use. */ }
  }, [storageLoaded, housing, locals, garages, elevators, motors, otherLoads, parking, irveOption])

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
    const average = homes ? housing.reduce((sum, row) => sum + row.power * Math.max(0, row.homes), 0) / homes : 0
    const cs = getSimultaneityCoefficient(homes)
    const p1 = average * cs
    const toWatts = (power: number, unit: 'W' | 'CV') => unit === 'CV' ? power * settings.cvToWatts : power
    const elevatorPower = elevators.reduce((sum, row) => sum + toWatts(row.power, row.unit), 0)
    const motorPower = motors.reduce((sum, row) => sum + toWatts(row.power, row.unit), 0)
    const otherPower = otherLoads.reduce((sum, row) => sum + Math.max(0, row.power), 0)
    const p2 = elevatorPower * settings.elevatorCoefficient + motorPower * settings.motorCoefficient + otherPower * settings.otherLoadCoefficient
    const p3 = sumLocalPowers(locals, settings)
    const p4 = sumGaragePowers(garages, settings)
    const irveCs = irveOption === 2 ? 0.3 : 1
    const plazas = irveOption === 3 ? Math.max(1, Math.ceil(parking * 0.1)) : parking
    const p5 = plazas * settings.evChargerPower * irveCs
    return { homes, average, cs, p1, p2, p3, p4, p5, total: p1 + p2 + p3 + p4 + p5, plazas }
  }, [housing, locals, garages, elevators, motors, otherLoads, parking, irveOption, settings])

  const reset = () => { setHousing(initialHousing); setLocals(exampleLocals); setGarages(exampleGarages); setElevators([{ name: 'Ascensor 1', ita: 'ITA-1', power: 4784, unit: 'W' }]); setMotors([{ name: 'Motor 1', power: 920, unit: 'W' }]); setOtherLoads([{ name: 'Alumbrado común', power: 2700 }]); setParking(30); setIrveOption(1) }
  const clear = () => {
    try { clearProjectData(window.localStorage) } catch { /* In-memory reset still applies when storage is unavailable. */ }
    setHousing([])
    setLocals([])
    setGarages([])
    setElevators([])
    setMotors([])
    setOtherLoads([])
    setParking(0)
    setIrveOption(1)
    setProjectInfo({ companyName: '', companyAddress: '', workAddress: '', phone: '', email: '', logo: '' })
  }

  const downloadJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      projectInfo,
      inputs: { housing, locals, garages, elevators, motors, otherLoads, parking, irveOption },
      settings,
      calculations: result,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `prevision-cargas-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const downloadReport = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const addHeader = () => {
      doc.setFillColor(8, 47, 73)
      doc.rect(0, 0, pageWidth, 24, 'F')
      doc.setTextColor(255, 255, 255)
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
      doc.setDrawColor(203, 213, 225)
      doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15)
      doc.setTextColor(100, 116, 139)
      doc.setFontSize(8)
      doc.text('Documento generado por Electro-cálculos · Valores editables según proyecto', 15, pageHeight - 9)
      doc.text(`Página ${page}`, pageWidth - 15, pageHeight - 9, { align: 'right' })
    }
    const section = (title: string, y: number) => {
      doc.setTextColor(8, 47, 73)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text(title, 15, y)
      return y + 5
    }

    addHeader()
    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('Informe de previsión de cargas', 15, 42)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-ES')}`, 15, 50)
    doc.text(projectInfo.companyAddress ? `Empresa: ${projectInfo.companyAddress}` : 'Cálculo basado en los datos introducidos y parámetros configurables.', 15, 57)
    if (projectInfo.workAddress) doc.text(`Dirección de obra: ${projectInfo.workAddress}`, 15, 63)
    if (projectInfo.phone || projectInfo.email) doc.text([projectInfo.phone, projectInfo.email].filter(Boolean).join(' · '), pageWidth - 15, 57, { align: 'right' })
    doc.setFillColor(236, 254, 255)
    doc.roundedRect(15, 66, pageWidth - 30, 25, 3, 3, 'F')
    doc.setTextColor(8, 47, 73)
    doc.setFontSize(10)
    doc.text('POTENCIA TOTAL PREVISTA', 22, 76)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(`${fmt(result.total)} W`, 22, 85)

    let y = section('1. Resumen de resultados', 106)
    autoTable(doc, { startY: y, head: [['Código', 'Concepto', 'Potencia prevista']], body: [['P1', 'Viviendas', `${fmt(result.p1)} W`], ['P2', 'Servicios generales', `${fmt(result.p2)} W`], ['P3', 'Locales y oficinas', `${fmt(result.p3)} W`], ['P4', 'Garajes', `${fmt(result.p4)} W`], ['P5', 'IRVE', `${fmt(result.p5)} W`], ['', 'TOTAL', `${fmt(result.total)} W`]], theme: 'grid', headStyles: { fillColor: [8, 47, 73] }, styles: { fontSize: 9 }, margin: { left: 15, right: 15 } })
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 145
    y += 15
    y = section('2. Datos de cálculo', y)
    autoTable(doc, { startY: y, head: [['Parámetro', 'Valor']], body: [['Total viviendas', `${result.homes} uds.`], ['Potencia media vivienda', `${fmt(result.average)} W`], ['Coeficiente simultaneidad', `${result.cs}`], ['Plazas consideradas IRVE', `${result.plazas}`]], theme: 'striped', headStyles: { fillColor: [8, 47, 73] }, styles: { fontSize: 9 }, margin: { left: 15, right: 15 } })

    const addDetailPage = (title: string, head: string[], body: string[][]) => {
      doc.addPage()
      addHeader()
      let top = section(title, 38)
      autoTable(doc, { startY: top, head: [head], body, theme: 'grid', headStyles: { fillColor: [8, 47, 73] }, styles: { fontSize: 8 }, margin: { left: 15, right: 15 } })
    }
    addDetailPage('3. Servicios generales', ['Descripción', 'Tipo', 'Potencia'], [...elevators.map(row => [row.name, row.ita, `${fmt(row.unit === 'CV' ? row.power * settings.cvToWatts : row.power)} W`]), ...motors.map(row => [row.name, 'Motor', `${fmt(row.unit === 'CV' ? row.power * settings.cvToWatts : row.power)} W`]), ...otherLoads.map(row => [row.name, 'Otra carga', `${fmt(row.power)} W`])])
    addDetailPage('4. Locales y oficinas', ['Descripción', 'Superficie', 'Previsión'], locals.map(row => [row.name, `${row.area} m²`, `${fmt(Math.max(row.real || 0, row.area * settings.localPowerPerM2, row.area ? settings.minimumSupplyPower : 0))} W`]))
    addDetailPage('5. Garajes', ['Descripción', 'Ventilación', 'Superficie', 'Previsión'], garages.map(row => [row.name, row.ventilation, `${row.area} m²`, `${fmt(Math.max(row.area * (row.ventilation === 'Forzada' ? settings.forcedGaragePowerPerM2 : settings.naturalGaragePowerPerM2), row.area ? settings.minimumSupplyPower : 0))} W`]))
    for (let page = 1; page <= doc.getNumberOfPages(); page += 1) { doc.setPage(page); addFooter(page) }
    doc.save(`memoria-tecnica-prevision-cargas-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  if (!storageLoaded) {
    return <main className="min-h-screen bg-[#f5f7f8] text-slate-950" aria-busy="true"><div className="mx-auto max-w-7xl px-5 py-10 text-sm text-slate-500" role="status">Cargando datos guardados…</div></main>
  }

  return (
    <main className="min-h-screen bg-[#f5f7f8] text-slate-950">
      <header className="border-b border-slate-200 bg-paper">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-slate-950 ring-1 ring-slate-800"><img src="/icons/electricity.png" alt="" className="size-7 object-contain" /></div><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700">Electro-cálculos</p><h1 className="text-lg font-bold tracking-tight">Previsión de cargas</h1></div></div>
          <div className="hidden items-center gap-3 text-right sm:flex"><div><p className="text-xs text-slate-500">Referencia normativa</p><p className="text-sm font-semibold">ITC-BT-10 · REBT</p></div><div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Cálculo activo</div></div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <div className="mb-8 max-w-3xl"><p className="mb-2 text-sm font-semibold text-cyan-700">Herramienta de ingeniería</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Calcula la previsión de cargas de tu edificio</h2><p className="mt-3 text-base leading-7 text-slate-600">Introduce los datos del proyecto y obtén el desglose de potencia conforme a las tablas y criterios de la hoja de cálculo original.</p></div>
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl ring-0 gap-0 sm:max-w-3xl">
            <div className="mb-6 flex items-start justify-between gap-4"><div><DialogTitle id="settings-title" className="text-xl font-bold text-slate-950">Parámetros de cálculo</DialogTitle><DialogDescription id="settings-description" className="mt-1 text-sm text-slate-500">Ajusta los valores utilizados en las previsiones. Los cambios se guardan en este navegador.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar parámetros de cálculo" />}><X /></DialogClose></div>
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-slate-200 p-4"><h4 className="mb-4 text-sm font-bold text-slate-800">Viviendas y suministros</h4><div className="grid gap-4 sm:grid-cols-2">
                <SettingInput label="Vivienda básica" value={settings.basicHousingPower} suffix="W" onChange={value => updateSetting('basicHousingPower', value)} />
                <SettingInput label="Vivienda elevada" value={settings.elevatedHousingPower} suffix="W" onChange={value => updateSetting('elevatedHousingPower', value)} />
                <SettingInput label="Locales por superficie" value={settings.localPowerPerM2} suffix="W/m²" onChange={value => updateSetting('localPowerPerM2', value)} />
                <SettingInput label="Mínimo por suministro" value={settings.minimumSupplyPower} suffix="W" onChange={value => updateSetting('minimumSupplyPower', value)} />
              </div></section>
              <section className="rounded-xl border border-slate-200 p-4"><h4 className="mb-4 text-sm font-bold text-slate-800">Garajes</h4><div className="grid gap-4 sm:grid-cols-2">
                <SettingInput label="Ventilación forzada" value={settings.forcedGaragePowerPerM2} suffix="W/m²" onChange={value => updateSetting('forcedGaragePowerPerM2', value)} />
                <SettingInput label="Ventilación natural" value={settings.naturalGaragePowerPerM2} suffix="W/m²" onChange={value => updateSetting('naturalGaragePowerPerM2', value)} />
              </div></section>
              <section className="rounded-xl border border-slate-200 p-4 md:col-span-2"><h4 className="mb-4 text-sm font-bold text-slate-800">Coeficientes y equipos</h4><div className="grid gap-4 sm:grid-cols-2">
                <SettingInput label="Coeficiente de ascensores" value={settings.elevatorCoefficient} suffix="Cs" step="0.01" onChange={value => updateSetting('elevatorCoefficient', value)} />
                <SettingInput label="Coeficiente de motores" value={settings.motorCoefficient} suffix="Cs" step="0.01" onChange={value => updateSetting('motorCoefficient', value)} />
                <SettingInput label="Coeficiente de otras cargas" value={settings.otherLoadCoefficient} suffix="Cs" step="0.01" onChange={value => updateSetting('otherLoadCoefficient', value)} />
                <SettingInput label="Potencia del cargador IRVE" value={settings.evChargerPower} suffix="W" onChange={value => updateSetting('evChargerPower', value)} />
                <SettingInput label="Conversión de CV" value={settings.cvToWatts} suffix="W/CV" step="0.1" onChange={value => updateSetting('cvToWatts', value)} />
              </div></section>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><Button type="button" variant="link" className="px-0 text-sm font-semibold text-cyan-700 underline-offset-4 hover:underline" onClick={() => setSettings(defaultSettings)}>Restaurar valores predeterminados</Button><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold sm:min-w-28" onClick={() => setShowSettings(false)}>Listo</Button></div>
          </DialogContent>
        </Dialog>
        <Dialog open={showProjectInfo} onOpenChange={setShowProjectInfo}>
          <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl ring-0 gap-0 sm:max-w-2xl">
            <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="project-info-title" className="text-xl font-bold text-slate-950">Datos de la memoria técnica</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">Estos datos aparecerán en la cabecera del PDF y se guardan en este navegador.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar diálogo" />}><X /></DialogClose></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="label">Nombre de empresa</span><Input className="w-full" value={projectInfo.companyName} onChange={event => updateProjectInfo('companyName', event.target.value)} placeholder="Instalaciones Ejemplo S.L." /></label>
              <label><span className="label">Dirección de empresa</span><Input className="w-full" value={projectInfo.companyAddress} onChange={event => updateProjectInfo('companyAddress', event.target.value)} placeholder="Calle, número, ciudad" /></label>
              <label><span className="label">Teléfono</span><Input className="w-full" value={projectInfo.phone} onChange={event => updateProjectInfo('phone', event.target.value)} placeholder="+34 900 000 000" /></label>
              <label><span className="label">Correo electrónico</span><Input className="w-full" type="email" value={projectInfo.email} onChange={event => updateProjectInfo('email', event.target.value)} placeholder="contacto@empresa.es" /></label>
              <label><span className="label">Dirección de obra</span><Input className="w-full" value={projectInfo.workAddress} onChange={event => updateProjectInfo('workAddress', event.target.value)} placeholder="Emplazamiento del proyecto" /></label>
              <label className="sm:col-span-2"><span className="label">Logo de empresa</span><Input className="w-full" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => handleLogo(event.target.files?.[0])} />{projectInfo.logo && <div className="mt-3 flex items-center gap-3"><img src={projectInfo.logo} alt="Vista previa del logo" className="size-14 rounded-lg border border-slate-200 object-contain p-1" /><Button type="button" variant="link" className="px-0 text-sm font-semibold text-red-600" onClick={() => updateProjectInfo('logo', '')}>Quitar logo</Button></div>}</label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setShowProjectInfo(false)}>Cerrar</Button><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setShowProjectInfo(false)}>Guardar datos</Button></div>
          </DialogContent>
        </Dialog>
        <Dialog open={showSimultaneityTable} onOpenChange={setShowSimultaneityTable}>
          <DialogContent id="simultaneity-dialog" showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl ring-0 gap-0 sm:max-w-xl">
            <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="simultaneity-title" className="text-xl font-bold text-slate-950">Coeficiente de simultaneidad</DialogTitle><DialogDescription id="simultaneity-description" className="mt-1 text-sm text-slate-500">Tabla 1 de la ITC-BT-10 según el número de viviendas.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tabla de simultaneidad" />}><X /></DialogClose></div>
            <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-slate-200">
              <Table className="w-full text-left text-sm">
                <TableHeader className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><TableRow><TableHead scope="col" className="px-4 py-3 text-center">N.º viviendas (n)</TableHead><TableHead scope="col" className="px-4 py-3 text-center">Coeficiente</TableHead></TableRow></TableHeader>
                <TableBody>{ITC_BT_10_COEFFICIENTS.slice(1).map((coefficient, index) => <TableRow key={index + 1} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-paper' : 'bg-slate-50/50'} transition-colors hover:bg-cyan-50`}><TableCell className="px-4 py-2 text-center tabular-nums">{index + 1}</TableCell><TableCell className="px-4 py-2 text-center font-medium tabular-nums">{fmtDec(coefficient)}</TableCell></TableRow>)}<TableRow className="border-t border-slate-200 bg-cyan-50/70"><TableCell className="px-4 py-3 text-center font-semibold">n &gt; 21</TableCell><TableCell className="px-4 py-3 text-center font-semibold">15,3 + (n − 21) × 0,5</TableCell></TableRow></TableBody>
              </Table>
            </div>
            <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm leading-5 text-amber-800"><b>Tarifa nocturna:</b> el coeficiente de simultaneidad es igual al número de viviendas (n).</p>
            <div className="mt-6 flex justify-end"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setShowSimultaneityTable(false)}>Cerrar</Button></div>
          </DialogContent>
        </Dialog>
        <Dialog open={showItaTable} onOpenChange={setShowItaTable}>
          <DialogContent showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl ring-0 gap-0 sm:max-w-3xl">
              <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="ita-table-title" className="text-xl font-bold text-slate-950">Tipos de ascensores · Tabla ITA</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">Clasificación según ITC-BT 10 (REBT). Selecciona el tipo de aparato elevador en función de las características del ascensor.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar diálogo" />}><X /></DialogClose></div>
              <div className="grid gap-3 md:hidden">
                {ITA_TYPES.map(ita => <article key={`mobile-${ita.type}`} className="rounded-xl border border-slate-200 bg-paper p-4">
                  <div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-cyan-700">{ita.type}</h4><span className="text-sm font-semibold tabular-nums">{fmtDec(ita.potencia)} kW</span></div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div><dt className="label">Carga</dt><dd className="mt-1 tabular-nums">{ita.carga} kg</dd></div>
                    <div><dt className="label">Personas</dt><dd className="mt-1 tabular-nums">{ita.personas}</dd></div>
                    <div className="col-span-2"><dt className="label">Velocidad</dt><dd className="mt-1 tabular-nums">{fmtDec(ita.velocidad)} m/s</dd></div>
                  </dl>
                </article>)}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table className="w-full text-left text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <TableHead className="px-4 py-3">Tipo</TableHead>
                      <TableHead className="px-4 py-3 text-right">Carga (kg)</TableHead>
                      <TableHead className="px-4 py-3 text-right">Personas</TableHead>
                      <TableHead className="px-4 py-3 text-right">Velocidad (m/s)</TableHead>
                      <TableHead className="px-4 py-3 text-right">Potencia (kW)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ITA_TYPES.map((ita, idx) => (
                      <TableRow key={ita.type} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-paper' : 'bg-slate-50/50'} hover:bg-cyan-50 transition-colors`}>
                        <TableCell className="px-4 py-3 font-semibold text-cyan-700">{ita.type}</TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums">{ita.carga}</TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums">{ita.personas}</TableCell>
                        <TableCell className="px-4 py-3 text-right tabular-nums">{fmtDec(ita.velocidad)}</TableCell>
                        <TableCell className="px-4 py-3 text-right font-medium tabular-nums">{ita.potencia}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-5 rounded-lg bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                <p className="flex items-start gap-2"><Info data-icon="inline-start" className="mt-0.5 shrink-0" /><span>Esta tabla es informativa. La potencia del ascensor debe introducirse manualmente según las especificaciones del fabricante. Los valores de la tabla ITC-BT 10 son orientativos.</span></p>
              </div>
              <div className="mt-6 flex justify-end"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setShowItaTable(false)}>Cerrar</Button></div>
          </DialogContent>
        </Dialog>
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'cargas' | 'lga' | 'di')} className="gap-6">
          <TabsList className="h-auto w-fit gap-1 rounded-xl border border-slate-200 bg-paper p-1">
            <TabsTrigger value="cargas" className="h-auto rounded-lg px-4 py-2 text-sm font-semibold">Previsión de cargas</TabsTrigger>
            <TabsTrigger value="lga" className="h-auto rounded-lg px-4 py-2 text-sm font-semibold">LGA · ITC-BT-14</TabsTrigger>
            <TabsTrigger value="di" className="h-auto rounded-lg px-4 py-2 text-sm font-semibold">DI · ITC-BT-15</TabsTrigger>
          </TabsList>
          <TabsContent value="cargas">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm">
              <SectionTitle number="01" title="Viviendas" subtitle="Añade cada vivienda y selecciona su grado de electrificación" />
              <div className="grid gap-3 md:hidden">
                {housing.map((row, i) => <article key={`mobile-${i}`} className="rounded-xl border border-slate-200 bg-paper p-4">
                  <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold">Vivienda {i + 1}</h4><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar vivienda ${i + 1}`} onClick={() => setHousing(current => current.filter((_, index) => index !== i))}><Trash2 /></Button></div>
                  <div className="grid gap-3">
                    <label><span className="label">Electrificación</span><ChoiceSelect className="w-full" value={row.level} onChange={event => { const level = event as HousingRow['level']; setHousing(current => current.map((house, index) => index === i ? { ...house, level, power: level === 'Básica' ? settings.basicHousingPower : settings.elevatedHousingPower } : house)) }} items={['Básica', 'Elevada']} /></label>
                    <label><span className="label">Potencia (W)</span><Input className="w-full" type="number" min="0" value={row.power} onChange={event => setHousing(current => current.map((house, index) => index === i ? { ...house, power: Number(event.target.value) } : house))} /></label>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="text-slate-500">Subtotal</span><strong className="tabular-nums">{fmt(row.power * row.homes)} W</strong></div>
                  </div>
                </article>)}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table className="w-full min-w-[620px] text-left text-sm">
                  <TableHeader><TableRow className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><TableHead className="pb-3">Vivienda</TableHead><TableHead className="pb-3">Electrificación</TableHead><TableHead className="pb-3">Potencia (W)</TableHead><TableHead className="pb-3 text-right">Subtotal (W)</TableHead><TableHead className="pb-3" /></TableRow></TableHeader>
                  <TableBody>{housing.map((row, i) => <TableRow key={i} className="border-b border-slate-100">
                    <TableCell className="py-3 font-medium">Vivienda {i + 1}</TableCell>
                    <TableCell className="py-3"><ChoiceSelect value={row.level} onChange={event => { const level = event as HousingRow['level']; setHousing(current => current.map((house, index) => index === i ? { ...house, level, power: level === 'Básica' ? settings.basicHousingPower : settings.elevatedHousingPower } : house)) }} items={['Básica', 'Elevada']} /></TableCell>
                    <TableCell className="py-3"><Input className="w-32" type="number" min="0" value={row.power} onChange={event => setHousing(current => current.map((house, index) => index === i ? { ...house, power: Number(event.target.value) } : house))} /></TableCell>
                    <TableCell className="py-3 text-right font-semibold tabular-nums">{fmt(row.power * row.homes)}</TableCell>
                    <TableCell className="py-3 text-right"><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar vivienda ${i + 1}`} onClick={() => setHousing(current => current.filter((_, index) => index !== i))}><Trash2 /></Button></TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              </div>
              {housing.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No hay viviendas añadidas.</p>}
              <div className="mt-4 flex items-center justify-between gap-3"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setHousing(current => [...current, { level: 'Básica', power: settings.basicHousingPower, homes: 1 }])}><Plus data-icon="inline-start" /> Añadir vivienda</Button><Metric label="P1 · Viviendas" value={`${fmt(result.p1)} W`} accent /></div>
            </section>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Metric label="Total viviendas" value={`${result.homes} uds.`} /><Metric label="Potencia media" value={`${fmt(result.average)} W`} /><div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Coeficiente de simultaneidad</p>
              <div className="mt-1 flex items-center justify-between gap-2"><p className="font-bold tabular-nums">{fmtDec(result.cs)}</p><Button type="button" variant="outline" size="icon" aria-label="Ver tabla del coeficiente de simultaneidad" aria-haspopup="dialog" aria-controls="simultaneity-dialog" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-transparent text-slate-500 transition-colors hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-700" onClick={() => setShowSimultaneityTable(true)}><Table2 className="size-4" aria-hidden="true" /></Button></div>
            </div></div>
            <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm"><SectionTitle number="02" title="Servicios generales" subtitle="Añade cada ascensor, motor y carga con sus datos específicos" /><div className="flex flex-col gap-4"><ServiceTable title="Ascensores" addLabel="Añadir ascensor" onAdd={() => setElevators(es => [...es, { name: `Ascensor ${es.length + 1}`, ita: 'ITA-1', power: 0, unit: 'W' }])} headers={['Descripción', 'ITA', 'Potencia', 'Unidad', '']} rows={elevators.map((row, i) => [<Input key="name" className="w-32" value={row.name} onChange={e => setElevators(es => es.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />, <div key="ita-group" className="flex items-center gap-1"><ChoiceSelect key="ita" value={row.ita} onChange={e => setElevators(es => es.map((x, j) => j === i ? { ...x, ita: e as ElevatorRow['ita'] } : x))} items={['ITA-1', 'ITA-2', 'ITA-3', 'ITA-4', 'ITA-5', 'ITA-6']} /><Button key="ita-info" type="button" variant="outline" size="icon" className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-transparent text-slate-500 transition-colors hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-600" aria-label="Ver tabla de tipos ITA" onClick={() => setShowItaTable(true)}><Table2 className="size-4" /></Button></div>, <Input key="power" className="w-24" type="number" min="0" value={row.power || ''} onChange={e => setElevators(es => es.map((x, j) => j === i ? { ...x, power: Number(e.target.value) } : x))} />, <ChoiceSelect key="unit" value={row.unit} onChange={e => setElevators(es => es.map((x, j) => j === i ? { ...x, unit: e as ElevatorRow['unit'] } : x))} items={['W', 'CV']} />, <Button key="remove" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setElevators(es => es.filter((_, j) => j !== i))}><Trash2 /></Button>])} /><ServiceTable title="Motores" addLabel="Añadir motor" onAdd={() => setMotors(ms => [...ms, { name: `Motor ${ms.length + 1}`, power: 0, unit: 'W' }])} headers={['Descripción', 'Potencia', 'Unidad', '']} rows={motors.map((row, i) => [<Input key="name" className="w-36" value={row.name} onChange={e => setMotors(ms => ms.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />, <Input key="power" className="w-24" type="number" min="0" value={row.power || ''} onChange={e => setMotors(ms => ms.map((x, j) => j === i ? { ...x, power: Number(e.target.value) } : x))} />, <ChoiceSelect key="unit" value={row.unit} onChange={e => setMotors(ms => ms.map((x, j) => j === i ? { ...x, unit: e as MotorRow['unit'] } : x))} items={['W', 'CV']} />, <Button key="remove" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setMotors(ms => ms.filter((_, j) => j !== i))}><Trash2 /></Button>])} /><ServiceTable title="Otras cargas" addLabel="Añadir carga" onAdd={() => setOtherLoads(ls => [...ls, { name: `Carga ${ls.length + 1}`, power: 0 }])} headers={['Descripción', 'Potencia (W)', '']} rows={otherLoads.map((row, i) => [<Input key="name" className="w-44" value={row.name} onChange={e => setOtherLoads(ls => ls.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />, <Input key="power" className="w-28" type="number" min="0" value={row.power || ''} onChange={e => setOtherLoads(ls => ls.map((x, j) => j === i ? { ...x, power: Number(e.target.value) } : x))} />, <Button key="remove" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setOtherLoads(ls => ls.filter((_, j) => j !== i))}><Trash2 /></Button>])} /></div><Metric label="P2 · Servicios generales" value={`${fmt(result.p2)} W`} accent /><p className="mt-4 flex items-start gap-2 rounded-lg bg-cyan-50 p-3 text-xs leading-5 text-cyan-900"><Info data-icon="inline-start" /> ITA permite distinguir la potencia del ascensor. Coeficientes actuales: ascensores ×{fmtDec(settings.elevatorCoefficient)}, motores ×{fmtDec(settings.motorCoefficient)} y otras cargas ×{fmtDec(settings.otherLoadCoefficient)}. Conversión para potencias expresadas en CV: {fmtDec(settings.cvToWatts)} W/CV. Los cambios en Parámetros de cálculo se aplican automáticamente a P2.</p></section>
            <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm"><SectionTitle number="03" title="Locales, oficinas e industrias" subtitle="Se toma el mayor valor entre previsión real, superficie y mínimo por abonado" /><EditableTable headers={['Descripción', 'Superficie (m²)', 'Previsión real (W)', 'P prevista (W)', '']} rows={locals.map((row, i) => [row.name, <Input key="a" className="w-24" type="number" min="0" value={row.area || ''} onChange={e => setLocals(ls => ls.map((x, j) => j === i ? { ...x, area: Number(e.target.value) } : x))} />, <Input key="b" className="w-28" type="number" min="0" value={row.real || ''} onChange={e => setLocals(ls => ls.map((x, j) => j === i ? { ...x, real: Number(e.target.value) } : x))} />, <strong key="c" className="tabular-nums">{fmt(previewLocalPower(row, settings))}</strong>, <Button key="d" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setLocals(ls => ls.filter((_, j) => j !== i))}><Trash2 data-icon="inline-start" /></Button>])} />{locals.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No hay locales añadidos.</p>}<div className="mt-4 flex items-center justify-between gap-3"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setLocals(ls => [...ls, { name: `Local ${ls.length + 1}`, type: 'Comercial/oficina', area: 0, real: 0 }])}><Plus data-icon="inline-start" /> Añadir local</Button><Metric label="P3 · Locales y oficinas" value={`${fmt(result.p3)} W`} accent /></div></section>
            <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm"><SectionTitle number="04" title="Garajes" subtitle="Previsión según ventilación y superficie" /><EditableTable headers={['Descripción', 'Ventilación', 'Superficie (m²)', 'P prevista (W)', '']} rows={garages.map((row, i) => [row.name, <ChoiceSelect key="a" value={row.ventilation} onChange={e => setGarages(gs => gs.map((x, j) => j === i ? { ...x, ventilation: e as GarageRow['ventilation'] } : x))} items={['Forzada', 'Natural']} />, <Input key="b" className="w-24" type="number" min="0" value={row.area || ''} onChange={e => setGarages(gs => gs.map((x, j) => j === i ? { ...x, area: Number(e.target.value) } : x))} />, <strong key="c" className="tabular-nums">{fmt(previewGaragePower(row, settings))}</strong>, <Button key="d" type="button" variant="ghost" size="icon" aria-label={`Eliminar ${row.name}`} onClick={() => setGarages(gs => gs.filter((_, j) => j !== i))}><Trash2 data-icon="inline-start" /></Button>])} />{garages.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No hay garajes añadidos.</p>}<div className="mt-4 flex items-center justify-between gap-3"><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setGarages(gs => [...gs, { name: `Garaje ${gs.length + 1}`, ventilation: 'Forzada', area: 0 }])}><Plus data-icon="inline-start" /> Añadir garaje</Button><Metric label="P4 · Garajes" value={`${fmt(result.p4)} W`} accent /></div></section>
            <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm"><SectionTitle number="05" title="Recarga de vehículos eléctricos · IRVE" subtitle="Selecciona el escenario de previsión" /><div className="grid gap-3 sm:grid-cols-[180px_1fr]"><LabeledInput label="Plazas de aparcamiento" value={parking === 0 ? '' : String(parking)} suffix="uds." onChange={e => setParking(Number(e.target.value))} /><FieldSet><FieldLegend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opción de cálculo</FieldLegend><RadioGroup value={irveOption} onValueChange={value => setIrveOption(Number(value))}>{['Todas las plazas · sin SPL','Todas las plazas · con SPL','Mínimo 10% de plazas'].map((name, i) => <FieldLabel key={name} htmlFor={`irve-${i + 1}`} onClick={() => setIrveOption(i + 1)} className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${irveOption === i + 1 ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200'}`}><RadioGroupItem id={`irve-${i + 1}`} value={i + 1} />{name}<span className="ml-auto text-xs text-slate-500">Cs {i === 1 ? '0,3' : '1'}</span></FieldLabel>)}</RadioGroup></FieldSet></div><div className="mt-4 flex justify-end"><Metric label={`P5 · IRVE · ${result.plazas} plazas consideradas`} value={`${fmt(result.p5)} W`} accent /></div></section>
          </div>
          <aside className="flex flex-col gap-4 xl:sticky xl:top-6 xl:self-start"><div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl"><div className="border-b border-white/10 p-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Resultado del proyecto</p><p className="mt-5 text-4xl font-bold tabular-nums tracking-tight">{fmt(result.total)} <span className="text-lg font-medium text-slate-400">W</span></p><p className="mt-1 text-sm text-slate-400">Potencia total prevista</p></div><div className="flex flex-col gap-3 p-6">{[['P1', 'Viviendas', result.p1], ['P2', 'Servicios generales', result.p2], ['P3', 'Locales y oficinas', result.p3], ['P4', 'Garajes', result.p4], ['P5', 'IRVE', result.p5]].map(([code, label, value]) => <div key={code as string} className="flex items-center justify-between text-sm"><span className="text-slate-400"><b className="mr-2 text-cyan-300">{code}</b>{label}</span><span className="font-semibold tabular-nums">{fmt(value as number)} W</span></div>)}<div className="my-2 h-px bg-white/10" /><div className="flex items-center justify-between"><span className="font-semibold">Total</span><span className="text-xl font-bold tabular-nums text-cyan-300">{fmt(result.total)} W</span></div></div></div><div className="mt-4 flex flex-col gap-2"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={downloadReport}><Download data-icon="inline-start" /> Descargar resumen PDF</Button><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={downloadJson}><Download data-icon="inline-start" /> Descargar datos JSON</Button><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={reset}><RotateCcw data-icon="inline-start" /> Cargar ejemplo</Button><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" aria-label="Limpiar datos del proyecto y memoria técnica" onClick={clear}><Trash2 data-icon="inline-start" /> Limpiar</Button></div>
            <button type="button" className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-paper p-5 text-left shadow-sm transition-colors hover:border-cyan-300 hover:bg-cyan-50/40" onClick={() => setShowSettings(true)}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><SlidersHorizontal className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Parámetros de cálculo</span><span className="mt-1 block text-xs leading-5 text-slate-500">Ajusta viviendas, garajes, coeficientes y equipos en un solo lugar.</span></span>
              <span className="text-sm font-semibold text-cyan-700">Configurar</span>
            </button>
            <section className="rounded-2xl border border-slate-200 bg-paper p-5 shadow-sm">
              <div className="mb-3"><h3 className="text-sm font-bold">Datos de la memoria técnica</h3><p className="mt-1 text-xs leading-5 text-slate-500">Completa los datos que aparecerán en la cabecera del PDF.</p></div>
              <Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold w-full" onClick={() => setShowProjectInfo(true)}><Building2 data-icon="inline-start" /> Editar datos del proyecto</Button>
            </section>
            <button type="button" aria-haspopup="dialog" aria-controls="references-dialog" className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-paper px-4 py-3 text-left text-sm font-semibold" onClick={() => setShowReferences(true)}>
              <span>Tablas y referencias</span><span className="flex items-center gap-2 text-cyan-700"><span className="text-xs">Ver tablas</span><Table2 className="size-4" /></span>
            </button>
            <Dialog open={showReferences} onOpenChange={setShowReferences}>
              <DialogContent id="references-dialog" showCloseButton={false} className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-paper p-6 shadow-2xl ring-0 gap-0 sm:max-w-2xl">
                <div className="mb-5 flex items-start justify-between gap-4"><div><DialogTitle id="references-title" className="text-xl font-bold text-slate-950">Tablas y referencias</DialogTitle><DialogDescription id="references-description" className="mt-1 text-sm text-slate-500">Criterios de previsión de cargas según ITC-BT-10.</DialogDescription></div><DialogClose render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar tablas y referencias" />}><X /></DialogClose></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p className="rounded-lg bg-slate-50 p-3 text-sm"><b>Electrificación básica:</b> 5.750 W.</p>
                  <p className="rounded-lg bg-slate-50 p-3 text-sm"><b>Electrificación elevada:</b> 9.200 W o superior.</p>
                  <p className="rounded-lg bg-slate-50 p-3 text-sm"><b>Locales:</b> mínimo 3.450 W por abonado.</p>
                  <p className="rounded-lg bg-slate-50 p-3 text-sm"><b>Garajes:</b> 20 W/m² con ventilación forzada y 10 W/m² con ventilación natural.</p>
                  <p className="rounded-lg bg-slate-50 p-3 text-sm sm:col-span-2"><b>IRVE:</b> 3.680 W por plaza.</p>
                </div>
                <h4 className="mt-6 font-bold text-slate-800">Coeficiente de simultaneidad · ITC-BT-10</h4>
                <div className="mt-2 max-h-[45vh] overflow-y-auto rounded-lg border border-slate-200">
                  <Table className="w-full text-left text-sm">
                    <TableHeader className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <TableRow><TableHead scope="col" className="px-4 py-3 text-center">N.º viviendas (n)</TableHead><TableHead scope="col" className="px-4 py-3 text-center">Coeficiente de simultaneidad</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>{ITC_BT_10_COEFFICIENTS.slice(1).map((coefficient, index) => <TableRow key={index + 1} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-paper' : 'bg-slate-50/50'} transition-colors hover:bg-cyan-50`}><TableCell className="px-4 py-2 text-center tabular-nums">{index + 1}</TableCell><TableCell className="px-4 py-2 text-center font-medium tabular-nums">{fmtDec(coefficient)}</TableCell></TableRow>)}<TableRow className="border-t border-slate-200 bg-cyan-50/70"><TableCell className="px-4 py-3 text-center font-semibold">n &gt; 21</TableCell><TableCell className="px-4 py-3 text-center font-semibold">15,3 + (n − 21) × 0,5</TableCell></TableRow></TableBody>
                  </Table>
                </div>
                <p className="mt-4 rounded-lg bg-amber-50 p-4 text-sm leading-5 text-amber-800"><b>Tarifa nocturna:</b> el coeficiente de simultaneidad es igual al número de viviendas (n).</p>
                <div className="mt-6 flex justify-end"><Button type="button" variant="default" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold" onClick={() => setShowReferences(false)}>Cerrar</Button></div>
              </DialogContent>
            </Dialog></aside>
        </div>
          </TabsContent>
          <TabsContent value="lga">
            <LgaPanel state={lga} onChange={updateLga} onOpenTables={() => setShowLineTables(true)} />
          </TabsContent>
          <TabsContent value="di">
            <DiPanel state={di} onChange={updateDi} onOpenTables={() => setShowLineTables(true)} />
          </TabsContent>
        </Tabs>
        <LineTablesDialog open={showLineTables} onOpenChange={setShowLineTables} />
      </div>
      <footer className="border-t border-slate-200 bg-paper">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 sm:flex-row lg:px-8">
          <p className="text-center text-xs leading-5 text-slate-500">
            Código abierto bajo licencia <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 underline-offset-4 hover:underline">MIT</a> · Iconos por <a href="https://icons8.com" target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 underline-offset-4 hover:underline">Icons8</a>
          </p>
          <a href="https://github.com/fitoji/rebt-calc" target="_blank" rel="noopener noreferrer" aria-label="Ver el código fuente en GitHub" className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-950">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>
            <span>fitoji/rebt-calc</span>
          </a>
        </div>
      </footer>
    </main>
  )
}

function SectionTitle({ number, title, subtitle }: { number: string; title: string; subtitle: string }) { return <div className="mb-5"><span className="block text-xs font-bold tracking-wide text-cyan-600">{number}</span><h3 className="mt-1 font-bold">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div> }
function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className={`rounded-xl p-3 ${accent ? 'bg-cyan-50' : 'bg-slate-50'}`}><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-bold tabular-nums ${accent ? 'text-cyan-700' : ''}`}>{value}</p></div> }
function ChoiceSelect({ id, className, value, onChange, items }: { id?: string; className?: string; value: string; onChange: (value: string) => void; items: string[] }) { return <Select value={value} onValueChange={next => onChange(next == null ? value : String(next))}><SelectTrigger id={id} className={className}><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{items.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent></Select> }
function LabeledInput({ label, value, suffix, onChange }: { label: string; value: string; suffix: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) { return <label><span className="label">{label}</span><span className="relative block"><Input className="w-full pr-12" value={value} onChange={onChange} type={onChange ? 'number' : 'text'} readOnly={!onChange} /><span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">{suffix}</span></span></label> }
function SettingInput({ label, value, suffix, step = '1', onChange }: { label: string; value: number; suffix: string; step?: string; onChange: (value: number) => void }) { return <label><span className="label">{label}</span><span className="relative block"><Input className="w-full pr-16" type="number" min="0" step={step} value={value} onChange={event => onChange(Number(event.target.value))} /><span className="pointer-events-none absolute right-3 top-2.5 text-xs text-slate-400">{suffix}</span></span></label> }
function ServiceTable({ title, addLabel, onAdd, headers, rows }: { title: string; addLabel: string; onAdd: () => void; headers: string[]; rows: React.ReactNode[][] }) { return <div><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-slate-700">{title}</h4><Button type="button" variant="outline" className="w-full h-auto gap-2 rounded-xl px-4 py-3 font-semibold px-3 py-2 text-xs" onClick={onAdd}><Plus data-icon="inline-start" /> {addLabel}</Button></div><EditableTable headers={headers} rows={rows} />{rows.length === 0 && <p className="py-3 text-center text-sm text-slate-500">No hay elementos añadidos.</p>}</div> }
function EditableTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <>
    <div className="grid gap-3 md:hidden">
      {rows.map((row, rowIndex) => <article key={`mobile-row-${rowIndex}`} className="rounded-xl border border-slate-200 bg-paper p-3">
        <div className="grid gap-3">
          {row.map((cell, columnIndex) => {
            const header = headers[columnIndex]
            return header
              ? <div key={`${header}-${columnIndex}`} className="grid gap-1"><span className="text-xs font-semibold text-slate-500">{header}</span><div className="min-w-0">{cell}</div></div>
              : <div key={`action-${columnIndex}`} className="flex justify-end">{cell}</div>
          })}
        </div>
      </article>)}
    </div>
    <div className="hidden overflow-x-auto md:block">
      <Table className="w-full min-w-[580px] text-left text-sm">
        <TableHeader><TableRow className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">{headers.map((header, index) => <TableHead key={`${header}-${index}`} scope="col" className="pb-3">{header}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row, rowIndex) => <TableRow key={rowIndex} className="border-b border-slate-100">{row.map((cell, columnIndex) => <TableCell key={columnIndex} className="py-3">{cell}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </div>
  </>
}

export default LoadCalculator
