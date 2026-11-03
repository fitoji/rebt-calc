import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileText, Search } from "lucide-react";
import { memoriaTramos, type MemoriaTramo } from "@/data/memoriaTramos";
import { exportTramosToCsv, exportTramosToExcel } from "@/lib/exportTramosToExcel";

const columnHelper = createColumnHelper<MemoriaTramo>();

const columns = [
  columnHelper.accessor("tram", { header: "Tram", size: 240 }),
  columnHelper.accessor("longitud", { header: "Long. (m)" }),
  columnHelper.accessor("potencia", { header: "Potència (kW)" }),
  columnHelper.accessor("coeficienteSimultaneidad", { header: "Coef. simultaneïtat" }),
  columnHelper.accessor("cosPhi", { header: "Cos φ" }),
  columnHelper.accessor("intensidad", { header: "Intensitat (A)" }),
  columnHelper.accessor("seccion", { header: "Secció (mm²)" }),
  columnHelper.accessor("momentoElectrico", { header: "Moment elèc. (kW·m)" }),
  columnHelper.accessor("caidaParcial", { header: "Caiguda parcial (%)" }),
  columnHelper.accessor("caidaTotal", { header: "Caiguda total (%)" }),
];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400">Pendent</span>;
  }
  return String(value);
}

export default function MemoriaTramosTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const table = useReactTable({
    data: memoriaTramos,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleRows = table.getRowModel().rows;
  const visibleCount = visibleRows.length;

  async function runExport(exporter: () => Promise<void> | void) {
    setIsExporting(true);
    setExportError(null);
    try {
      await exporter();
    } catch {
      setExportError("No s'ha pogut generar el fitxer. Torna-ho a intentar.");
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportExcel() {
    return runExport(() =>
      exportTramosToExcel(
        visibleRows.map((row) => row.original),
        "memoria-tecnica-derivacions.xlsx",
      ),
    );
  }

  function handleExportCsv() {
    return runExport(() =>
      exportTramosToCsv(
        visibleRows.map((row) => row.original),
        "memoria-tecnica-derivacions.csv",
      ),
    );
  }

  return (
    <section className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-sm ring-1 ring-slate-200">
      <header className="sticky top-0 z-30 flex flex-col gap-4 rounded-t-2xl border-b border-slate-200 bg-white/95 p-6 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Model ELEC 3</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-slate-900">
            Memòria tècnica · Càlcul de derivacions
          </h1>
        </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <label className="relative block w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Buscar tram..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExporting || visibleCount === 0}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Exportant..." : "Excel"}
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting || visibleCount === 0}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-500 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <FileText className="h-4 w-4" />
                CSV
              </button>
            </div>
          </div>
      </header>
      {exportError && (
        <p role="alert" className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
          {exportError}
        </p>
      )}

      <div className="max-h-[60vh] overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="sticky top-0 z-20 whitespace-nowrap bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!canSort}
                        className="inline-flex items-center gap-1.5 rounded transition hover:text-slate-900 disabled:cursor-default"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && sorted === "asc" && <ArrowUp className="h-3.5 w-3.5 text-sky-700" />}
                        {canSort && sorted === "desc" && <ArrowDown className="h-3.5 w-3.5 text-sky-700" />}
                        {canSort && !sorted && <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-sky-50/60">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-slate-700 tabular-nums">
                    {formatValue(cell.getValue())}
                  </td>
                ))}
              </tr>
            ))}
            {visibleCount === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-500">
                  No hi ha trams que coincideixin amb la cerca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
        {visibleCount} de {memoriaTramos.length} trams
      </footer>
    </section>
  );
}
