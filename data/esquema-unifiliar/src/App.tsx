import { useRef, useState } from 'react';
import { Upload, FileJson, AlertCircle, Building2, Zap, RotateCcw } from 'lucide-react';
import type { PrevisionJSON } from '@/types';
import { samplePrevision } from '@/sampleData';
import { UnifilarDiagram } from '@/UnifilarDiagram';
import { InfoPanel } from '@/InfoPanel';

function App() {
  const [data, setData] = useState<PrevisionJSON>(samplePrevision);
  const [fileName, setFileName] = useState<string>('prevision-cargas-2026-11-06.json (ejemplo)');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function loadJson(text: string, name: string) {
    try {
      const parsed = JSON.parse(text) as PrevisionJSON;
      if (!parsed.project || !parsed.project.derivations) {
        throw new Error('El JSON no contiene la sección "project.derivations".');
      }
      setData(parsed);
      setFileName(name);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo JSON.');
    }
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') loadJson(reader.result, file.name);
    };
    reader.onerror = () => setError('No se pudo leer el archivo.');
    reader.readAsText(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function resetSample() {
    setData(samplePrevision);
    setFileName('prevision-cargas-2026-11-06.json (ejemplo)');
    setError(null);
  }

  const lgaSection = data.project.lga.result?.finalSection ?? 0;
  const totalKw = (data.calculations.total / 1000).toFixed(1);
  const derivCount = data.project.derivations.length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Zap size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900">Esquema Unifilar · Edificio</h1>
              <p className="text-xs text-slate-500">REBT (RD 842/2005) · Normas UNE</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                dragging
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <Upload size={16} />
              Cargar JSON
            </button>
            <button
              onClick={resetSample}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <RotateCcw size={15} />
              Ejemplo
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        {/* Status bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileJson size={16} className="text-blue-600" />
            <span className="font-medium">{fileName}</span>
          </div>
          <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 size={16} className="text-slate-400" />
            <span>{derivCount} derivaciones</span>
          </div>
          <span className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">Total: <strong className="text-slate-900">{totalKw} kW</strong></span>
            <span className="text-slate-600">Sección LGA: <strong className="text-blue-700">{lgaSection} mm²</strong></span>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Diagram */}
        <UnifilarDiagram data={data} />

        {/* Info */}
        <div className="mt-5">
          <InfoPanel data={data} />
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          Visualizador de esquema unifilar · Datos según previsión de cargas REBT/UNE · {data.exportedAt.slice(0, 10)}
        </footer>
      </main>
    </div>
  );
}

export default App;
