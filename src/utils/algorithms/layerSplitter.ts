import type { WeaveCell, WeaveLayer, WeaveStep } from '@/types';

export function splitLayers(matrix: WeaveCell[][]): WeaveLayer[] {
  const rows = matrix.length;
  if (rows === 0) return [];
  const cols = matrix[0].length;

  const layers: WeaveLayer[] = [];

  const frequencyMap = analyzeFrequency(matrix, rows, cols);
  const groups = groupByFrequency(frequencyMap);

  const baseLayer = createBaseLayer(matrix, rows, cols);
  layers.push(baseLayer);

  groups.forEach((group, index) => {
    if (group.cells.length === 0) return;

    const layer = createPatternLayer(matrix, group, index + 1, rows, cols);
    layers.push(layer);
  });

  const borderLayer = createBorderLayer(matrix, rows, cols, layers.length);
  if (borderLayer) {
    layers.push(borderLayer);
  }

  return layers;
}

function analyzeFrequency(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): Map<string, number> {
  const frequencyMap = new Map<string, number>();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      const frequency = calculateCellFrequency(matrix, r, c, rows, cols);
      frequencyMap.set(key, frequency);
    }
  }

  return frequencyMap;
}

function calculateCellFrequency(
  matrix: WeaveCell[][],
  row: number,
  col: number,
  rows: number,
  cols: number
): number {
  const value = matrix[row][col];
  let count = 0;
  const window = 1;

  for (let dr = -window; dr <= window; dr++) {
    for (let dc = -window; dc <= window; dc++) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        if (matrix[nr][nc] === value) {
          count++;
        }
      }
    }
  }

  return count;
}

interface CellGroup {
  frequency: number;
  cells: Array<{ row: number; col: number }>;
  value: WeaveCell;
}

function groupByFrequency(frequencyMap: Map<string, number>): CellGroup[] {
  const groups: CellGroup[] = [];
  const freqValues = Array.from(new Set(Array.from(frequencyMap.values()))).sort(
    (a, b) => b - a
  );

  freqValues.forEach((freq) => {
    const cells1: Array<{ row: number; col: number }> = [];
    const cells0: Array<{ row: number; col: number }> = [];

    frequencyMap.forEach((f, key) => {
      if (f === freq) {
        const [r, c] = key.split(',').map(Number);
        if (f > 5) {
          cells1.push({ row: r, col: c });
        }
      }
    });

    if (cells1.length > 0) {
      groups.push({ frequency: freq, cells: cells1, value: 1 });
    }
    if (cells0.length > 0) {
      groups.push({ frequency: freq, cells: cells0, value: 0 });
    }
  });

  return groups;
}

function createBaseLayer(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): WeaveLayer {
  const warpSubset: number[] = [];
  const weftSubset: number[] = [];

  for (let i = 0; i < cols; i++) warpSubset.push(i);
  for (let i = 0; i < rows; i++) weftSubset.push(i);

  const steps = generateBaseSteps(matrix, rows, cols);

  return {
    id: generateLayerId(),
    layerIndex: 0,
    layerName: '基础层（起篾）',
    description: '铺设全部经篾与纬篾，形成基础挑压结构',
    warpSubset,
    weftSubset,
    steps,
  };
}

function createPatternLayer(
  matrix: WeaveCell[][],
  group: CellGroup,
  layerIndex: number,
  rows: number,
  cols: number
): WeaveLayer {
  const warpSet = new Set<number>();
  const weftSet = new Set<number>();

  group.cells.forEach(({ row, col }) => {
    weftSet.add(row);
    warpSet.add(col);
  });

  const warpSubset = Array.from(warpSet).sort((a, b) => a - b);
  const weftSubset = Array.from(weftSet).sort((a, b) => a - b);

  const subMatrix = extractSubMatrix(matrix, weftSubset, warpSubset);
  const steps = generateSteps(subMatrix);

  const layerNames = [
    '主纹层（图案编织）',
    '副纹层（点缀装饰）',
    '细节层（精修处理）',
  ];

  return {
    id: generateLayerId(),
    layerIndex,
    layerName: layerNames[layerIndex - 1] || `编织层 ${layerIndex}`,
    description: `共 ${weftSubset.length} 根纬篾，${warpSubset.length} 根经篾`,
    warpSubset,
    weftSubset,
    steps,
  };
}

function createBorderLayer(
  matrix: WeaveCell[][],
  rows: number,
  cols: number,
  layerIndex: number
): WeaveLayer | null {
  if (rows < 4 || cols < 4) return null;

  const weftSubset = [0, rows - 1];
  const warpSubset: number[] = [];
  for (let i = 0; i < cols; i++) warpSubset.push(i);

  const borderMatrix: WeaveCell[][] = [
    matrix[0].slice(),
    matrix[rows - 1].slice(),
  ];

  const steps = generateBorderSteps(borderMatrix, cols);

  return {
    id: generateLayerId(),
    layerIndex,
    layerName: '收边层（锁口）',
    description: '首尾行加固收边，防止散口',
    warpSubset,
    weftSubset,
    steps,
  };
}

function extractSubMatrix(
  matrix: WeaveCell[][],
  rowIndices: number[],
  colIndices: number[]
): WeaveCell[][] {
  const result: WeaveCell[][] = [];
  for (const r of rowIndices) {
    const row: WeaveCell[] = [];
    for (const c of colIndices) {
      row.push(matrix[r][c]);
    }
    result.push(row);
  }
  return result;
}

export function generateSteps(layer: WeaveCell[][]): WeaveStep[] {
  const steps: WeaveStep[] = [];
  const rows = layer.length;
  if (rows === 0) return steps;
  const cols = layer[0].length;

  const stepSize = Math.max(1, Math.ceil(rows / 4));

  for (let startRow = 0; startRow < rows; startRow += stepSize) {
    const endRow = Math.min(startRow + stepSize, rows) - 1;
    const stepMatrix = layer.slice(startRow, endRow + 1);

    const instruction = buildStepInstruction(stepMatrix, startRow, endRow, cols);

    steps.push({
      id: generateStepId(),
      stepIndex: steps.length,
      instruction,
      startCount: startRow + 1,
      endCount: endRow + 1,
      pattern: stepMatrix,
    });
  }

  return steps;
}

function generateBaseSteps(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): WeaveStep[] {
  const steps: WeaveStep[] = [];

  steps.push({
    id: generateStepId(),
    stepIndex: 0,
    instruction: `整理经篾：共 ${cols} 根，均匀排列，间距均匀`,
    startCount: 1,
    endCount: cols,
  });

  const weftSteps = generateSteps(matrix);
  weftSteps.forEach((step, idx) => {
    steps.push({
      ...step,
      stepIndex: idx + 1,
      instruction: `挑压编织第 ${step.startCount}-${step.endCount} 根纬篾：${extractPatternSummary(step.pattern)}`,
    });
  });

  return steps;
}

function generateBorderSteps(
  borderMatrix: WeaveCell[][],
  cols: number
): WeaveStep[] {
  const steps: WeaveStep[] = [];

  if (borderMatrix.length >= 1) {
    steps.push({
      id: generateStepId(),
      stepIndex: 0,
      instruction: `首行收边：${cols} 根经篾全部 ${borderMatrix[0].every((v) => v === 1) ? '挑' : '压'}，加固起始端`,
      startCount: 1,
      endCount: 1,
      pattern: [borderMatrix[0]],
    });
  }

  if (borderMatrix.length >= 2) {
    steps.push({
      id: generateStepId(),
      stepIndex: 1,
      instruction: `末行收边：${cols} 根经篾全部 ${borderMatrix[1].every((v) => v === 1) ? '挑' : '压'}，加固末端并锁口`,
      startCount: 2,
      endCount: 2,
      pattern: [borderMatrix[1]],
    });
  }

  return steps;
}

function buildStepInstruction(
  stepMatrix: WeaveCell[][],
  startRow: number,
  endRow: number,
  cols: number
): string {
  const patternSummary = extractPatternSummary(stepMatrix);
  return `编织第 ${startRow + 1}-${endRow + 1} 根纬篾（共 ${endRow - startRow + 1} 根，每根 ${cols} 格）：${patternSummary}`;
}

function extractPatternSummary(matrix?: WeaveCell[][]): string {
  if (!matrix || matrix.length === 0) return '';

  const firstRow = matrix[0];
  const picks: string[] = [];

  for (let c = 0; c < Math.min(firstRow.length, 8); c++) {
    picks.push(firstRow[c] === 1 ? '挑' : '压');
  }

  let result = picks.join('-');
  if (firstRow.length > 8) {
    result += '...';
  }

  return result;
}

function generateLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
