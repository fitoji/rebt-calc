import ExcelJS from "exceljs";
import type { MemoriaTramo } from "@/data/memoriaTramos";

const COLUMNS: { header: string; key: keyof MemoriaTramo; width: number }[] = [
  { header: "Tram", key: "tram", width: 32 },
  { header: "Long. (m)", key: "longitud", width: 12 },
  { header: "Potència (kW)", key: "potencia", width: 14 },
  { header: "Coef. simultaneïtat", key: "coeficienteSimultaneidad", width: 20 },
  { header: "Cos φ", key: "cosPhi", width: 10 },
  { header: "Intensitat (A)", key: "intensidad", width: 14 },
  { header: "Secció (mm²)", key: "seccion", width: 14 },
  { header: "Moment elèc. (kW·m)", key: "momentoElectrico", width: 20 },
  { header: "Caiguda parcial (%)", key: "caidaParcial", width: 20 },
  { header: "Caiguda total (%)", key: "caidaTotal", width: 18 },
];

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportTramosToCsv(rows: MemoriaTramo[], fileName: string) {
  const header = COLUMNS.map((column) => escapeCsvCell(column.header)).join(";");
  const body = rows.map((row) =>
    COLUMNS.map((column) => escapeCsvCell(row[column.key] as string | number | null)).join(";"),
  );
  const csv = [header, ...body].join("\r\n");
  triggerDownload(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), fileName);
}

export async function exportTramosToExcel(rows: MemoriaTramo[], fileName: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Derivacions");

  sheet.columns = COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF0F172A" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 32;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  rows.forEach((row) => {
    sheet.addRow(
      COLUMNS.reduce<Record<string, string | number | null>>((values, column) => {
        values[column.key] = row[column.key] as string | number | null;
        return values;
      }, {}),
    );
  });

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName,
  );
}
