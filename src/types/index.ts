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

/**
 * 用料方案
 * 同一模板下可保存多组不同参数的用料方案
 */
export interface MaterialPlan {
  id: string;
  name: string;
  templateId: string;
  params: WeaveParams;
  materials: MaterialItem[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 工序步骤详情
 * 包含步骤对应矩阵片段、用料项等更详细信息
 */
export interface WeaveStepDetail extends WeaveStep {
  /** 步骤对应的矩阵片段 */
  matrixSlice?: WeaveCell[][];
  /** 本步骤所需用料 */
  requiredMaterials?: MaterialItem[];
  /** 操作要点 */
  tips?: string[];
  /** 预计耗时（分钟） */
  estimatedMinutes?: number;
  /** 难度等级 */
  difficulty?: 1 | 2 | 3 | 4 | 5;
}

/**
 * 模板对比结果
 */
export interface TemplateComparison {
  templateA: PatternTemplate;
  templateB: PatternTemplate;
  matrixDiff: {
    totalCells: number;
    diffCells: number;
    diffPercent: number;
  };
  paramsDiff: {
    key: string;
    label: string;
    valueA: number;
    valueB: number;
    diff: number;
    winner: 'A' | 'B' | 'equal';
  }[];
  materialDiff: {
    totalCountA: number;
    totalCountB: number;
    totalLengthA: number;
    totalLengthB: number;
    winner: 'A' | 'B' | 'equal';
  };
  validationDiff: {
    errorsA: number;
    errorsB: number;
    warningsA: number;
    warningsB: number;
    riskWinner: 'A' | 'B' | 'equal';
  };
}

export type HighlightRole = 'target' | 'affect';

export interface HighlightCell {
  row: number;
  col: number;
  role: HighlightRole;
}

/**
 * 局部修正上下文
 * 选中异常位置时的高亮和建议状态
 */
export interface CorrectionContext {
  row: number;
  col: number;
  errorType: string;
  suggestion?: string;
  relatedCells: HighlightCell[];
  fixAction?: string;
  currentIndex?: number;
  totalCount?: number;
}
