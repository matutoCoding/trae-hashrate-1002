export type WeaveCell = 0 | 1;

export type PatternType = 'hexagon' | 'cross' | 'herringbone' | 'plain' | 'custom';

export interface DetectedPattern {
  type: PatternType;
  startRow: number;
  startCol: number;
  width: number;
  height: number;
}

export interface WeaveMatrix {
  rows: number;
  cols: number;
  cellSize: number;
  warpCodes: WeaveCell[][];
  weftCodes: WeaveCell[][];
  detectedPatterns: DetectedPattern[];
}

export interface WeaveParams {
  bambooWidth: number;
  bambooGap: number;
  finishedWidth: number;
  finishedHeight: number;
  lossRate: number;
}

export interface WeaveStep {
  id: string;
  stepIndex: number;
  instruction: string;
  startCount: number;
  endCount: number;
  diagramSvg?: string;
  pattern?: WeaveCell[][];
}

export interface WeaveLayer {
  id: string;
  layerIndex: number;
  layerName: string;
  description: string;
  steps: WeaveStep[];
  warpSubset?: number[];
  weftSubset?: number[];
}

export interface MaterialItem {
  id: string;
  spec: string;
  color: string;
  widthMm: number;
  lengthMm: number;
  count: number;
  processIndex: number;
}

export interface ValidationError {
  type: 'open_end' | 'misalignment' | 'color_shift';
  row?: number;
  col?: number;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: string;
  row?: number;
  col?: number;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface PatternTemplate {
  id: string;
  name: string;
  patternType: PatternType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  thumbnail: string;
  tags: string[];
  description: string;
  weaveMatrix: WeaveMatrix;
  layers: WeaveLayer[];
  materials: MaterialItem[];
  params: WeaveParams;
  createdAt: number;
  updatedAt: number;
}

export interface DensityResult {
  densityWarp: number;
  densityWeft: number;
  porosity: number;
  lightTransmission: number;
}

export interface MaterialsResult {
  warpBamboos: MaterialItem[];
  weftBamboos: MaterialItem[];
  totalLength: number;
}

export interface ColorShift {
  row?: number;
  col?: number;
  expected: string;
  actual: string;
  message: string;
}
