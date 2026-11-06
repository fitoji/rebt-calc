export type SystemKind = 'single-phase' | 'three-phase';
export type InsulationKind = 'PVC' | 'XLPE';

export interface LineCandidate {
  section: number;
  tableCurrent: number;
  correctedCurrent: number;
  dropPercent: number;
  dropPercentIn: number | null;
  meetsMinimum: boolean;
  meetsDrop: boolean;
  meetsDropIn: boolean;
  meetsCurrent: boolean;
}

export interface LineResult {
  sectionByDrop: number;
  ratedCurrent: number;
  groupingFactor: number;
  circuits: number;
  minimumSection: number;
  minimumTube: number | null;
  cableType: string;
  neutralSection: number;
  protectiveSection: number;
  momentKwM: number;
  gamma: number;
  housingIga: number | null;
  maxAdmissiblePowerW: number | null;
  candidates: LineCandidate[];
  protection: number;
  suggestedProtection: { rating: number; admissible: number };
  autoSection: number;
  sectionOverride: number | null;
  finalSection: number;
  tableCurrent: number;
  correctedCurrent: number;
  dropPercent: number;
  dropPercentIn: number;
  dropVoltLimit: number;
  ok: boolean;
  problems: string[];
}

export interface LineInputs {
  powerW: number;
  voltageV: number;
  cosPhi: number;
  lengthM: number;
  maxDropPercent: number;
  gamma: number;
  method: string;
  insulation: InsulationKind;
  circuits: number;
  protectionA: number;
  neutralSection: number;
  peSection: number;
  controlSection: number;
  tubeDiameter: number;
  installation: string;
  layout: string;
  layers: number;
  tubes: number;
}

export interface Line extends LineInputs {
  result?: LineResult;
}

export type DerivationKind = 'dwelling' | 'local' | 'common-services' | 'garage' | 'irve';

export interface Derivation extends Line {
  id: string;
  kind: DerivationKind;
  label: string;
  sourceKey: string;
  system: SystemKind;
  housingIgaA?: number;
  housingAreaM2?: number;
}

export interface Calculations {
  homes: number;
  housingPower: number;
  average: number;
  cs: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  total: number;
  plazas: number;
  lightingPower: number;
  motorIncrement: number;
  elevatorPower: number;
  motorPower: number;
  largestMotorPower: number;
  otherPower: number;
  localPowers: number[];
  garagePowers: number[];
  irveCs: number;
}

export interface ProjectSummary {
  loadTotal: number;
  lgaSection: number;
  derivationCount: number;
  derivationPower: number;
  warnings: string[];
}

export interface ProjectData {
  lga: Line;
  di?: Line;
  derivations: Derivation[];
  summary: ProjectSummary;
}

export interface PrevisionJSON {
  exportedAt: string;
  projectInfo?: {
    companyName?: string;
    workAddress?: string;
    phone?: string;
    email?: string;
  };
  calculations: Calculations;
  project: ProjectData;
  settings?: {
    powerUnit?: string;
  };
}
