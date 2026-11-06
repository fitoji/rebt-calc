// Librería de símbolos SVG propios según UNE-EN 60617 (IEC 60617)
// Cada símbolo se dibuja centrado en el origen (0,0) con terminales
// superior (y = -14) e inferior (y = +14). El padre lo posiciona con
// <g transform="translate(x,y)">.

export interface SymProps {
  color?: string;
  sw?: number;
}

const C = '#0f172a';
const W = 2;

type P = Required<SymProps>;

function defaults(p: SymProps): P {
  return { color: p.color ?? C, sw: p.sw ?? W };
}

// 02-02-04  Conductor / línea (vertical, con marcas de número de conductores)
export function Conductor({
  x, y1, y2, color = C, sw = W, ticks = 0,
}: { x: number; y1: number; y2: number; color?: string; sw?: number; ticks?: number }) {
  const mid = (y1 + y2) / 2;
  const tickEls: React.ReactNode[] = [];
  if (ticks > 0) {
    const step = 7;
    const start = mid - ((ticks - 1) * step) / 2;
    for (let i = 0; i < ticks; i++) {
      const ty = start + i * step;
      tickEls.push(
        <line key={i} x1={x - 6} y1={ty + 4} x2={x + 6} y2={ty - 4} stroke={color} strokeWidth={sw} />,
      );
    }
  }
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={sw} />
      {tickEls}
    </g>
  );
}

// 02-02-05  Embarrado (busbar)
export function Busbar({
  x1, y1, x2, y2, color = '#0f172a', sw = 5,
}: { x1: number; y1: number; x2: number; y2: number; color?: string; sw?: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeLinecap="round" />;
}

// 02-02-15  Fuente de alimentación de red (AC)
export function NetworkSource(p: SymProps) {
  const { color, sw } = defaults(p);
  return (
    <g>
      <line x1={0} y1={11} x2={0} y2={14} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={0} r={11} fill="#fff" stroke={color} strokeWidth={sw} />
      <path d="M -6 0 Q -3 -7 0 0 T 6 0" fill="none" stroke={color} strokeWidth={sw} />
    </g>
  );
}

// 02-04-01  Seccionador
export function Disconnector(p: SymProps) {
  const { color, sw } = defaults(p);
  return (
    <g>
      <line x1={0} y1={-14} x2={0} y2={-7} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={-7} r={3} fill="none" stroke={color} strokeWidth={sw} />
      <line x1={0} y1={5} x2={11} y2={-13} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={5} r={2.5} fill={color} />
      <line x1={0} y1={5} x2={0} y2={14} stroke={color} strokeWidth={sw} />
    </g>
  );
}

// 02-04-03  Interruptor automático (circuit-breaker) — seccionador con "×"
export function CircuitBreaker(p: SymProps) {
  const { color, sw } = defaults(p);
  return (
    <g>
      <line x1={0} y1={-14} x2={0} y2={-7} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={-7} r={3} fill="none" stroke={color} strokeWidth={sw} />
      <line x1={0} y1={5} x2={11} y2={-13} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={5} r={2.5} fill={color} />
      <line x1={0} y1={5} x2={0} y2={14} stroke={color} strokeWidth={sw} />
      {/* marca de automático */}
      <line x1={-3.2} y1={-10.2} x2={3.2} y2={-3.8} stroke={color} strokeWidth={sw} />
      <line x1={-3.2} y1={-3.8} x2={3.2} y2={-10.2} stroke={color} strokeWidth={sw} />
    </g>
  );
}

// 02-04-06  Interruptor diferencial (RCD) — automático + relé de corriente residual
export function RCD(p: SymProps) {
  const { color, sw } = defaults(p);
  return (
    <g>
      <line x1={0} y1={-14} x2={0} y2={-7} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={-7} r={3} fill="none" stroke={color} strokeWidth={sw} />
      <line x1={0} y1={5} x2={11} y2={-13} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={5} r={2.5} fill={color} />
      <line x1={0} y1={5} x2={0} y2={14} stroke={color} strokeWidth={sw} />
      <line x1={-3.2} y1={-10.2} x2={3.2} y2={-3.8} stroke={color} strokeWidth={sw} />
      <line x1={-3.2} y1={-3.8} x2={3.2} y2={-10.2} stroke={color} strokeWidth={sw} />
      {/* relé diferencial */}
      <line x1={0} y1={2} x2={9} y2={2} stroke={color} strokeWidth={sw - 0.4} />
      <rect x={9} y={-3} width={15} height={11} rx={1.5} fill="#fff" stroke={color} strokeWidth={sw - 0.4} />
      <text x={16.5} y={5} fontSize={6.5} fill={color} textAnchor="middle">IΔn</text>
    </g>
  );
}

// 02-18-01  Fusible
export function Fuse(p: SymProps) {
  const { color, sw } = defaults(p);
  return (
    <g>
      <line x1={0} y1={-14} x2={0} y2={-9} stroke={color} strokeWidth={sw} />
      <rect x={-5} y={-9} width={10} height={18} rx={1.5} fill="#fff" stroke={color} strokeWidth={sw} />
      <line x1={0} y1={-9} x2={0} y2={9} stroke={color} strokeWidth={sw - 0.4} />
      <line x1={0} y1={9} x2={0} y2={14} stroke={color} strokeWidth={sw} />
    </g>
  );
}

// 02-17-05  Contador de energía (Wh)
export function EnergyMeter(p: SymProps) {
  const { color, sw } = defaults(p);
  return (
    <g>
      <line x1={0} y1={-14} x2={0} y2={-10} stroke={color} strokeWidth={sw} />
      <circle cx={0} cy={0} r={10} fill="#fff" stroke={color} strokeWidth={sw} />
      <text x={0} y={3.5} fontSize={8} fill={color} fontWeight={700} textAnchor="middle">Wh</text>
      <line x1={0} y1={10} x2={0} y2={14} stroke={color} strokeWidth={sw} />
    </g>
  );
}

// 02-12-01  Puesta a tierra
export function Earth(p: SymProps) {
  const { color, sw } = defaults(p);
  return (
    <g>
      <line x1={0} y1={-14} x2={0} y2={0} stroke={color} strokeWidth={sw} />
      <line x1={-10} y1={0} x2={10} y2={0} stroke={color} strokeWidth={sw} />
      <line x1={-6.5} y1={5} x2={6.5} y2={5} stroke={color} strokeWidth={sw} />
      <line x1={-3} y1={10} x2={3} y2={10} stroke={color} strokeWidth={sw} />
    </g>
  );
}

// 02-15-01  Carga / receptor genérico (semicírculo) + etiqueta
export function Load({
  label, sub, color = C, sw = W,
}: { label: string; sub?: string; color?: string; sw?: number }) {
  return (
    <g>
      <line x1={0} y1={-14} x2={0} y2={-8} stroke={color} strokeWidth={sw} />
      <path d="M -11 -8 A 11 11 0 0 1 11 -8 L -11 -8 Z" fill="#fff" stroke={color} strokeWidth={sw} />
      <line x1={0} y1={3} x2={0} y2={14} stroke={color} strokeWidth={sw} />
      {label && (
        <g>
          <rect x={16} y={-12} width={94} height={26} rx={4} fill={color} fillOpacity={0.07} stroke={color} strokeWidth={1.4} />
          <text x={63} y={-1} fontSize={10} fill={color} fontWeight={700} textAnchor="middle">{label}</text>
          {sub && <text x={63} y={10} fontSize={8.5} fill="#64748b" textAnchor="middle">{sub}</text>}
        </g>
      )}
    </g>
  );
}

// Marca de número de polos (indicación "3P", "1P") como anotación textual
export function PoleMark({ x, y, text, color = '#64748b' }: { x: number; y: number; text: string; color?: string }) {
  return <text x={x} y={y} fontSize={8.5} fill={color} textAnchor="middle">{text}</text>;
}

// Catálogo para la leyenda
export const IEC_SYMBOL_CATALOG: {
  code: string;
  name: string;
  render: React.ReactNode;
}[] = [
  { code: '02-02-15', name: 'Fuente de red (AC)', render: <NetworkSource /> },
  { code: '02-04-03', name: 'Interruptor automático', render: <CircuitBreaker /> },
  { code: '02-04-06', name: 'Interruptor diferencial', render: <RCD /> },
  { code: '02-04-01', name: 'Seccionador', render: <Disconnector /> },
  { code: '02-17-05', name: 'Contador de energía', render: <EnergyMeter /> },
  { code: '02-18-01', name: 'Fusible', render: <Fuse /> },
  { code: '02-12-01', name: 'Puesta a tierra', render: <Earth /> },
  { code: '02-15-01', name: 'Receptor / carga', render: <Load label="" /> },
];
