import type { Derivation, PrevisionJSON, LineResult } from '@/types';
import {
  Busbar,
  CircuitBreaker,
  Conductor,
  Earth,
  EnergyMeter,
  Load,
  NetworkSource,
  RCD,
  PoleMark,
} from '@/symbols';

const KIND_COLORS: Record<string, { stroke: string; chip: string }> = {
  dwelling: { stroke: '#2563eb', chip: 'bg-blue-100 text-blue-700 border-blue-200' },
  local: { stroke: '#d97706', chip: 'bg-amber-100 text-amber-700 border-amber-200' },
  'common-services': { stroke: '#059669', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  garage: { stroke: '#475569', chip: 'bg-slate-100 text-slate-700 border-slate-200' },
  irve: { stroke: '#0891b2', chip: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
};

const KIND_LABEL: Record<string, string> = {
  dwelling: 'Vivienda',
  local: 'Local',
  'common-services': 'Servicios generales',
  garage: 'Garaje',
  irve: 'Recarga VE',
};

function kw(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(w % 1000 === 0 ? 0 : 2)} kW`;
  return `${w} W`;
}

function poles(system: string): string {
  return system === 'three-phase' ? '4P' : '2P';
}

function cableShort(c?: string): string {
  if (!c) return '—';
  if (c.includes('RZ1')) return 'RZ1-K';
  if (c.includes('ES07')) return 'ES07Z1-K';
  return c;
}

// Etiqueta de línea (a la derecha del conductor)
function LineLabel({ x, y, title, sub, color }: { x: number; y: number; title: string; sub?: string; color?: string }) {
  return (
    <g>
      <text x={x} y={y} fontSize={10} fill={color ?? '#0f172a'} fontWeight={600}>{title}</text>
      {sub && <text x={x} y={y + 12} fontSize={8.5} fill="#64748b">{sub}</text>}
    </g>
  );
}

function LgaColumn({ x, data }: { x: number; data: PrevisionJSON }) {
  const lga = data.project.lga;
  const res = lga.result;
  const prot = res?.protection ?? lga.protectionA;
  const section = res?.finalSection ?? 0;
  const cable = res?.cableType ?? '';
  const sys = lga.voltageV === 400 ? 'three-phase' : 'single-phase';

  return (
    <g>
      {/* Fuente de red */}
      <g transform={`translate(${x},40)`}>
        <NetworkSource color="#0f172a" />
      </g>
      <Conductor x={x} y1={54} y2={96} color="#0f172a" ticks={0} />
      <LineLabel x={x + 9} y={74} title="LGA" sub={`${section} mm² · ${poles(sys)}`} />

      {/* IGA (interruptor automático) */}
      <g transform={`translate(${x},110)`}>
        <CircuitBreaker color="#0f172a" />
      </g>
      <PoleMark x={x - 22} y={113} text={poles(sys)} />
      <text x={x + 18} y={105} fontSize={10} fill="#0f172a" fontWeight={600}>IGA {prot} A</text>
      {cable && <text x={x + 18} y={117} fontSize={8.5} fill="#64748b">{cableShort(cable)}</text>}

      {/* Conductor hasta embarrado */}
      <Conductor x={x} y1={124} y2={188} color="#0f172a" ticks={sys === 'three-phase' ? 3 : 1} />
      <LineLabel x={x + 9} y={150} title={kw(lga.powerW)} sub={`${lga.voltageV} V`} />
      <text x={x + 9} y={172} fontSize={8.5} fill="#94a3b8">cos φ {lga.cosPhi} · {lga.lengthM} m</text>
      <text x={x + 9} y={184} fontSize={8.5} fill="#94a3b8">ΔU {res ? res.dropPercent.toFixed(2) : '—'} %</text>
    </g>
  );
}

function DerivationColumn({
  d, x, busY,
}: { d: Derivation; x: number; busY: number }) {
  const c = KIND_COLORS[d.kind] ?? KIND_COLORS.dwelling;
  const res = d.result;
  const prot = res?.protection ?? d.protectionA;
  const section = res?.finalSection ?? 0;
  const difA = d.housingIgaA ?? undefined;

  const tapTop = busY + 8;
  const meterY = busY + 40;
  const igaY = meterY + 42;
  const rcdY = igaY + 40;
  const loadY = rcdY + 50;

  return (
    <g>
      {/* Derivación desde embarrado */}
      <Conductor x={x} y1={tapTop} y2={meterY - 14} color={c.stroke} ticks={d.system === 'three-phase' ? 3 : 1} />
      <text x={x} y={busY + 22} fontSize={9} fill={c.stroke} fontWeight={700} textAnchor="middle">DI</text>
      <text x={x} y={busY + 33} fontSize={8} fill="#94a3b8" textAnchor="middle">{section} mm²</text>

      {/* Contador */}
      <g transform={`translate(${x},${meterY})`}>
        <EnergyMeter color={c.stroke} />
      </g>

      {/* IGA / interruptor automático de la derivación */}
      <g transform={`translate(${x},${igaY})`}>
        <CircuitBreaker color={c.stroke} />
      </g>
      <PoleMark x={x - 22} y={igaY + 3} text={poles(d.system)} />
      <text x={x + 16} y={igaY - 2} fontSize={9.5} fill={c.stroke} fontWeight={600}>{prot} A</text>

      {/* Diferencial (solo viviendas / locales / garaje) */}
      {d.kind !== 'irve' && d.kind !== 'common-services' && (
        <>
          <Conductor x={x} y1={igaY + 14} y2={rcdY - 14} color={c.stroke} />
          <g transform={`translate(${x},${rcdY})`}>
            <RCD color={c.stroke} />
          </g>
          {difA && <text x={x + 16} y={rcdY + 2} fontSize={9} fill={c.stroke} fontWeight={600}>IΔn {difA} A</text>}
        </>
      )}

      {/* Conductor hacia carga */}
      <Conductor x={x} y1={d.kind !== 'irve' && d.kind !== 'common-services' ? rcdY + 14 : igaY + 14} y2={loadY - 14} color={c.stroke} />

      {/* Receptor / carga */}
      <g transform={`translate(${x},${loadY})`}>
        <Load label={d.label} sub={`${kw(d.powerW)} · ${poles(d.system)}`} color={c.stroke} />
      </g>

      {/* Toma de tierra (junto a la carga) */}
      <g transform={`translate(${x - 28},${loadY})`}>
        <Earth color={c.stroke} sw={1.6} />
      </g>

      {/* Pie de derivación */}
      <text x={x} y={loadY + 38} fontSize={8.5} fill="#64748b" textAnchor="middle">{cableShort(res?.cableType)} · {d.lengthM} m</text>
      <text x={x} y={loadY + 50} fontSize={8.5} fill="#94a3b8" textAnchor="middle">ΔU {res ? res.dropPercent.toFixed(2) : '–'} %</text>
      {res && (
        <text x={x} y={loadY + 63} fontSize={9} fill={res.ok ? '#059669' : '#dc2626'} fontWeight={700} textAnchor="middle">
          {res.ok ? 'Conforme' : 'Revisar'}
        </text>
      )}
    </g>
  );
}

export function UnifilarDiagram({ data }: { data: PrevisionJSON }) {
  const derivations = data.project.derivations;
  const colW = 150;
  const busY = 188;
  const n = derivations.length;
  const lgaX = 95;
  const firstCol = 225;
  const width = Math.max(firstCol + n * colW + 40, 800);
  const height = 560;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" style={{ minWidth: width }}>
        <defs>
          <linearGradient id="busGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>

        {/* Cabecera del esquema */}
        <text x={lgaX} y={22} fontSize={11} fill="#0f172a" fontWeight={700} textAnchor="middle">Acometida</text>

        <LgaColumn x={lgaX} data={data} />

        {/* Embarrado */}
        <Busbar x1={lgaX} y1={busY} x2={firstCol + (n - 1) * colW + 12} y2={busY} color="url(#busGrad)" sw={5} />
        <text x={lgaX + 6} y={busY - 8} fontSize={9.5} fill="#0f172a" fontWeight={700}>
          Embarrado · {(data.calculations.total / 1000).toFixed(1)} kW
        </text>

        {/* Derivaciones */}
        {derivations.map((d, i) => (
          <DerivationColumn key={d.id} d={d} x={firstCol + i * colW} busY={busY} />
        ))}
      </svg>
    </div>
  );
}

export function KindLegend() {
  const kinds = Object.keys(KIND_COLORS);
  return (
    <div className="flex flex-wrap gap-2">
      {kinds.map((k) => (
        <span key={k} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${KIND_COLORS[k].chip}`}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: KIND_COLORS[k].stroke }} />
          {KIND_LABEL[k]}
        </span>
      ))}
    </div>
  );
}
