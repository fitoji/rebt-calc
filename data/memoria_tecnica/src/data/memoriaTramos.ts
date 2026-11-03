export interface MemoriaTramo {
  id: string;
  tram: string;
  longitud: number | null;
  potencia: number | null;
  coeficienteSimultaneidad: number | null;
  cosPhi: number | null;
  intensidad: number | null;
  seccion: number | null;
  momentoElectrico: number | null;
  caidaParcial: number | null;
  caidaTotal: number | null;
}

const TRAMOS_ETIQUETAS = [
  "Derivación individual (A-B)",
  "Derivaciones C-D",
  "E-F",
  "G-H",
  "I-J",
  "K-L",
  "M-N",
  "O-P",
  "Q-R",
  "S-T",
  "U-V",
  "W-X",
  "Y-Z",
];

export const memoriaTramos: MemoriaTramo[] = TRAMOS_ETIQUETAS.map((tram, index) => ({
  id: `tramo-${index + 1}`,
  tram,
  longitud: null,
  potencia: null,
  coeficienteSimultaneidad: null,
  cosPhi: null,
  intensidad: null,
  seccion: null,
  momentoElectrico: null,
  caidaParcial: null,
  caidaTotal: null,
}));
