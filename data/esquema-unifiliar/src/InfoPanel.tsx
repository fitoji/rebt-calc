import type { PrevisionJSON } from '@/types';
import { KindLegend } from './UnifilarDiagram';
import { IEC_SYMBOL_CATALOG } from './symbols';

function kw(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(w % 1000 === 0 ? 0 : 2)} kW`;
  return `${w} W`;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${accent ?? 'text-slate-800'}`}>{value}</div>
    </div>
  );
}

export function InfoPanel({ data }: { data: PrevisionJSON }) {
  const c = data.calculations;
  const lga = data.project.lga;
  const lgaRes = lga.result;
  const di = data.project.di;
  const diRes = di?.result;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Resumen de la previsión</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Stat label="Viviendas" value={`${c.homes}`} />
          <Stat label="Potencia viviendas" value={kw(c.housingPower)} />
          <Stat label="Coef. simultaneidad" value={`${c.cs}`} />
          <Stat label="P1 Viviendas" value={kw(c.p1)} />
          <Stat label="P2 Servicios" value={kw(c.p2)} />
          <Stat label="P3 Locales" value={kw(c.p3)} />
          <Stat label="P4 Garaje" value={kw(c.p4)} />
          <Stat label="P5 IRVE" value={kw(c.p5)} />
          <Stat label="Potencia total" value={kw(c.total)} accent="text-blue-700" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Stat label="Ascensor" value={kw(c.elevatorPower)} />
          <Stat label="Motor" value={kw(c.motorPower)} />
          <Stat label="Alumbrado" value={kw(c.lightingPower)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Línea general de alimentación (LGA)</h2>
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Potencia" value={kw(lga.powerW)} />
          <Stat label="Tensión" value={`${lga.voltageV} V`} />
          <Stat label="Sección" value={`${lgaRes?.finalSection ?? 0} mm²`} accent="text-blue-700" />
          <Stat label="Protección IGA" value={`${lgaRes?.protection ?? 0} A`} accent="text-blue-700" />
          <Stat label="Cable" value={lgaRes?.cableType ?? '—'} />
          <Stat label="Caída de tensión" value={`${lgaRes?.dropPercent.toFixed(2) ?? '—'} %`} accent={lgaRes?.ok ? 'text-emerald-600' : 'text-red-600'} />
          <Stat label="Longitud" value={`${lga.lengthM} m`} />
          <Stat label="Método" value={`${lga.method} · ${lga.insulation}`} />
        </div>
      </section>

      {di && diRes && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Derivación individual (DI)</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat label="Potencia" value={kw(di.powerW)} />
            <Stat label="Tensión" value={`${di.voltageV} V`} />
            <Stat label="Sección" value={`${diRes.finalSection} mm²`} accent="text-blue-700" />
            <Stat label="Protección" value={`${diRes.protection} A`} accent="text-blue-700" />
            <Stat label="Cable" value={diRes.cableType} />
            <Stat label="Caída de tensión" value={`${diRes.dropPercent.toFixed(2)} %`} accent={diRes.ok ? 'text-emerald-600' : 'text-red-600'} />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Leyenda de tipos de carga</h2>
        <KindLegend />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-slate-800">Librería de símbolos UNE-EN 60617</h2>
        <p className="mb-3 text-xs text-slate-500">Símbolos gráficos según UNE-EN 60617 (idéntica a IEC 60617).</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {IEC_SYMBOL_CATALOG.map((s) => (
            <div key={s.code} className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-3">
              <svg width={44} height={44} viewBox="-22 -22 44 44">
                <g transform="translate(0,-2)">{s.render}</g>
              </svg>
              <div className="mt-1.5 text-center">
                <div className="text-xs font-semibold text-slate-700">{s.name}</div>
                <div className="text-[10px] text-slate-400">{s.code}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Esquema orientativo según REBT (Reglamento Electrotécnico para Baja Tensión, RD 842/2005) y normas UNE aplicables.
        </p>
      </section>
    </div>
  );
}
