/**
 * Paleta del PDF.
 *
 * jsPDF dibuja en su propio lienzo: no tiene DOM ni acceso a la hoja de estilos,
 * así que no puede leer las variables CSS. Estos son los equivalentes RGB de los
 * tokens semánticos de `app/globals.css` y deben moverse juntos: si cambia un
 * token de marca, cambia también el PDF.
 *
 * @type {{
 *   headerBand: [number, number, number],
 *   onBand: [number, number, number],
 *   title: [number, number, number],
 *   ink: [number, number, number],
 *   inkMuted: [number, number, number],
 *   inkFaint: [number, number, number],
 *   line: [number, number, number],
 *   brandSoft: [number, number, number],
 * }}
 */
export const PDF_COLORS = {
  /** Banda de cabecera de cada página. */
  headerBand: [8, 47, 73],
  /** Texto sobre la banda de cabecera. */
  onBand: [255, 255, 255],
  /** Títulos de sección. */
  title: [8, 47, 73],
  /** Texto principal. */
  ink: [15, 23, 42],
  /** Texto secundario. */
  inkMuted: [71, 85, 105],
  /** Pie de página. */
  inkFaint: [100, 116, 139],
  /** Reglas y bordes. */
  line: [203, 213, 225],
  /** Fila destacada. */
  brandSoft: [236, 254, 255],
}
