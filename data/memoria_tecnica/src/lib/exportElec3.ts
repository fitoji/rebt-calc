import ExcelJS from "exceljs";
import { ELEC3_COLUMNS, type Elec3Document } from "@/lib/elec3";

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

export function exportElec3ToCsv(document: Elec3Document, fileName: string) {
  const header = ELEC3_COLUMNS.map((column) => escapeCsvCell(column.header)).join(";");
  const body = document.files.map((row) =>
    ELEC3_COLUMNS.map((column) => escapeCsvCell(row[column.key])).join(";"),
  );
  const csv = [header, ...body].join("\r\n");
  triggerDownload(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), fileName);
}

export async function exportElec3ToExcel(document: Elec3Document, fileName: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ELEC 3", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  sheet.mergeCells(1, 1, 1, ELEC3_COLUMNS.length);
  sheet.getCell(1, 1).value = "MEMÒRIA TÈCNICA · MODEL ELEC 3";
  sheet.getCell(1, 1).font = { bold: true, size: 14 };

  sheet.getCell(2, 1).value = "Emplaçament";
  sheet.getCell(2, 2).value = document.obra || "—";
  sheet.getCell(3, 1).value = "Data";
  sheet.getCell(3, 2).value = document.data || "—";

  const headerRow = sheet.getRow(4);
  ELEC3_COLUMNS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.alignment = { wrapText: true, vertical: "bottom" };
    sheet.getColumn(index + 1).width = column.width;
  });
  headerRow.height = 46;

  document.files.forEach((row, rowIndex) => {
    const sheetRow = sheet.getRow(5 + rowIndex);
    ELEC3_COLUMNS.forEach((column, index) => {
      const cell = sheetRow.getCell(index + 1);
      const value = row[column.key];
      cell.value = value;
      cell.font = { size: 9 };
      if (column.numeric) cell.alignment = { horizontal: "right" };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    fileName,
  );
}
