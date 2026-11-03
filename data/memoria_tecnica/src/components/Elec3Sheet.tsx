import { useRef, useState } from "react";
import { Download, FileText, FileUp, X } from "lucide-react";
import {
  ELEC3_COLUMNS,
  PENDING_CELLS,
  readCalculatorExport,
  type Elec3Document,
  type Elec3Row,
} from "@/lib/elec3";
import { exportElec3ToCsv, exportElec3ToExcel } from "@/lib/exportElec3";

const number = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 2 });

function Cell({ row, column }: { row: Elec3Row; column: (typeof ELEC3_COLUMNS)[number] }) {
  const value = row[column.key];

  if (value === null || value === undefined || value === "") {
    return (
      <span className="text-slate-500" title="Pendent: la calculadora encara no ho calcula">
        —<span className="sr-only">Pendent</span>
      </span>
    );
  }

  return <>{typeof value === "number" ? number.format(value) : value}</>;
}

export default function Elec3Sheet() {
  const [document, setDocument] = useState<Elec3Document | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function runExport(exporter: () => Promise<void> | void) {
    setIsExporting(true);
    setError(null);
    try {
      await exporter();
    } catch {
      setError("No s’ha pogut generar el fitxer. Torna-ho a intentar.");
    } finally {
      setIsExporting(false);
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("error", () => setError("No s’ha pogut llegir el fitxer."));
    reader.addEventListener("load", () => {
      const parsed = readCalculatorExport(String(reader.result ?? ""));
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      setError(null);
      setDocument(parsed.document);
      setFileName(file.name);
    });
    reader.readAsText(file);
  }

  const pendingInRows = document
    ? PENDING_CELLS.filter((pending) => document.files.every((row) => row[pending.key] === null))
    : [];

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 print:text-xl">Memòria tècnica ELEC 3</h1>
          <p className="mt-2 max-w-[70ch] text-sm leading-6 text-slate-600 print:hidden">
            Les files són les línies del projecte tal com les exporta la calculadora. El que encara no calcula es
            mostra com a pendent, no s’estima.
          </p>
        </div>
        <div className="no-print flex shrink-0 flex-wrap items-center gap-2">
          {document && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
            >
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Carrega un altre JSON
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              handleFile(file);
            }}
          />
          {document && (
            <>
              <button
                type="button"
                onClick={() => runExport(() => exportElec3ToExcel(document, "memoria-tecnica-elec3.xlsx"))}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {isExporting ? "Exportant…" : "Excel"}
              </button>
              <button
                type="button"
                onClick={() => runExport(() => exportElec3ToCsv(document, "memoria-tecnica-elec3.csv"))}
                disabled={isExporting}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocument(null);
                  setFileName(null);
                  setError(null);
                }}
                aria-label="Tanca la memòria carregada"
                className="inline-flex items-center rounded-lg border border-transparent p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {!document ? (
        <section className="mt-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Encara no hi ha cap memòria carregada</h2>
          <p className="mt-2 max-w-[70ch] text-sm leading-6 text-slate-600 print:hidden">
            A la calculadora, <strong className="font-semibold text-slate-800">Descargar datos → JSON</strong> escriu
            el fitxer que aquesta memòria llegeix: potència, cos φ, intensitat, secció, longitud, moment, caiguda
            parcial, conductor, canalització, neutre i protecció de cada línia.
          </p>
          <p className="mt-3 max-w-[70ch] text-sm leading-6 text-slate-600">
            El fitxer no surt de l’equip: es llegeix aquí i prou.
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
          >
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Carrega el JSON
          </button>
        </section>
      ) : (
        <>
          <section className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-slate-200 py-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Emplaçament</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{document.obra || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Data</p>
              <p className="mt-1 text-sm tabular-nums text-slate-900">{document.data || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Potència total prevista</p>
              <p className="mt-1 text-sm tabular-nums text-slate-900">
                {document.totalKw === null ? "—" : `${number.format(document.totalKw)} kW`}
              </p>
            </div>
            {document.lga && (
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Línia general · context de l’edifici</p>
                <p className="mt-1 text-sm tabular-nums text-slate-900">
                  {[
                    document.lga.seccio === null ? null : `${number.format(document.lga.seccio)} mm²`,
                    document.lga.proteccio === null ? null : `In ${number.format(document.lga.proteccio)} A`,
                    document.lga.neutre === null ? null : `N ${number.format(document.lga.neutre)} mm²`,
                    document.lga.terra === null ? null : `PE ${number.format(document.lga.terra)} mm²`,
                    document.lga.tub === null ? null : `Ø ${number.format(document.lga.tub)} mm`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
            )}
          </section>

          <section className="sheet-in mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm print:overflow-visible print:rounded-none print:border-0 print:shadow-none">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-[1320px] w-full border-collapse text-[12px] leading-tight">
                <caption className="sr-only">
                  Memòria tècnica ELEC 3: {document.files.length} línies amb les columnes del model oficial
                </caption>
                <thead>
                  <tr className="bg-slate-50 text-left align-bottom">
                    <th scope="col" rowSpan={2} className="sticky left-0 z-20 bg-slate-50 px-3 py-2 font-semibold text-slate-700 print:static">
                      Tram
                    </th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Càrrega simultàn. (%)</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Potència (kW)</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">cos φ</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Intens. (A)</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Secció per fase (mm²)</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Long. (m)</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Moment elèc. (kW·m)</th>
                    <th scope="colgroup" colSpan={2} className="border-l border-slate-200 px-3 py-2 font-semibold text-slate-700">Caiguda de tensió</th>
                    <th scope="colgroup" colSpan={2} className="border-l border-slate-200 px-3 py-2 font-semibold text-slate-700">Característiques del conductor</th>
                    <th scope="col" rowSpan={2} className="border-l border-slate-200 px-3 py-2 font-semibold text-slate-700">Canalització</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Aïllam. instal·l. (kΩ)</th>
                    <th scope="col" rowSpan={2} className="border-l border-slate-200 px-3 py-2 font-semibold text-slate-700">Neutre (mm²)</th>
                    <th scope="col" rowSpan={2} className="px-3 py-2 font-semibold text-slate-700">Protecció (mm²)</th>
                  </tr>
                  <tr className="bg-slate-50 text-left align-bottom">
                    <th scope="col" className="border-l border-t border-slate-200 px-3 py-1.5 font-medium text-slate-600">Parcial (%)</th>
                    <th scope="col" className="border-t border-slate-200 px-3 py-1.5 font-medium text-slate-600">Total (%)</th>
                    <th scope="col" className="border-l border-t border-slate-200 px-3 py-1.5 font-medium text-slate-600">Tipus</th>
                    <th scope="col" className="border-t border-slate-200 px-3 py-1.5 font-medium text-slate-600">Tensió nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 whitespace-nowrap">
                  {document.files.map((row) => (
                    <tr key={row.id} className="group transition-colors hover:bg-slate-50/80">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-slate-900 group-hover:bg-slate-50 print:static"
                      >
                        <span className="block truncate">{row.nom}</span>
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          {row.tipus}
                        </span>
                      </th>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[1]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[2]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[3]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[4]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[5]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[6]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[7]} /></td>
                      <td className="border-l border-slate-100 px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[8]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[9]} /></td>
                      <td className="border-l border-slate-100 px-3 py-2 text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[10]} /></td>
                      <td className="px-3 py-2 text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[11]} /></td>
                      <td className="border-l border-slate-100 px-3 py-2 text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[12]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[13]} /></td>
                      <td className="border-l border-slate-100 px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[14]} /></td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700"><Cell row={row} column={ELEC3_COLUMNS[15]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 print:hidden">
              <p>
                {document.files.length} {document.files.length === 1 ? "línia" : "línies"}
                {fileName ? ` · ${fileName}` : ""}
              </p>
              <p>
                {pendingInRows.length === 0
                  ? "Cap cel·la pendent."
                  : `Pendent a totes les files: ${pendingInRows.map((pending) => pending.label).join(", ")}.`}
              </p>
            </footer>
            <p className="hidden border-t border-slate-200 px-4 py-3 text-[10px] text-slate-500 print:block">
              Model ELEC 3 (G146NSIN-157-00) · memòria generada amb Electro-cálculos · les cel·les amb guió queden pendents
            </p>
          </section>
        </>
      )}
    </div>
  );
}
