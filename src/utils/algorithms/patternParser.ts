import type { WeaveCell, DetectedPattern, PatternType } from '@/types';

export function parseImageToMatrix(
  canvas: HTMLCanvasElement,
  rows: number,
  cols: number
): WeaveCell[][] {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return createEmptyMatrix(rows, cols);
  }

  const { width, height } = canvas;
  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const matrix: WeaveCell[][] = [];

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const grayscaleData: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grayscaleData.push(gray);
  }

  let sum = 0;
  for (let i = 0; i < grayscaleData.length; i++) {
    sum += grayscaleData[i];
  }
  const threshold = sum / grayscaleData.length;

  for (let row = 0; row < rows; row++) {
    const rowData: WeaveCell[] = [];
    for (let col = 0; col < cols; col++) {
      const startX = Math.floor(col * cellWidth);
      const startY = Math.floor(row * cellHeight);
      const endX = Math.min(Math.floor((col + 1) * cellWidth), width);
      const endY = Math.min(Math.floor((row + 1) * cellHeight), height);

      let cellSum = 0;
      let cellCount = 0;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = y * width + x;
          cellSum += grayscaleData[idx];
          cellCount++;
        }
      }

      const avgGray = cellCount > 0 ? cellSum / cellCount : threshold;
      rowData.push(avgGray >= threshold ? 1 : 0);
    }
    matrix.push(rowData);
  }

  return matrix;
}

function createEmptyMatrix(rows: number, cols: number): WeaveCell[][] {
  const matrix: WeaveCell[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: WeaveCell[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(0);
    }
    matrix.push(row);
  }
  return matrix;
}

export function detectPatterns(matrix: WeaveCell[][]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const rows = matrix.length;
  if (rows === 0) return patterns;
  const cols = matrix[0].length;

  const crossPatterns = detectCrossPattern(matrix, rows, cols);
  patterns.push(...crossPatterns);

  const hexagonPatterns = detectHexagonPattern(matrix, rows, cols);
  patterns.push(...hexagonPatterns);

  const herringbonePatterns = detectHerringbonePattern(matrix, rows, cols);
  patterns.push(...herringbonePatterns);

  return mergeOverlappingPatterns(patterns);
}

function detectCrossPattern(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const windowSize = 2;
  const minMatches = 2;

  for (let startRow = 0; startRow <= rows - windowSize; startRow++) {
    for (let startCol = 0; startCol <= cols - windowSize; startCol++) {
      let matchCount = 0;
      let valid = true;

      for (let r = 0; r < windowSize && valid; r++) {
        for (let c = 0; c < windowSize && valid; c++) {
          const expected: WeaveCell = ((startRow + r + startCol + c) % 2 === 0) ? 1 : 0;
          if (matrix[startRow + r]?.[startCol + c] !== expected) {
            valid = false;
          }
        }
      }

      if (valid) {
        matchCount = countConsecutiveMatches(
          matrix,
          startRow,
          startCol,
          windowSize,
          (r, c) => {
            for (let dr = 0; dr < windowSize; dr++) {
              for (let dc = 0; dc < windowSize; dc++) {
                const expected: WeaveCell = ((r + dr + c + dc) % 2 === 0) ? 1 : 0;
                if (matrix[r + dr]?.[c + dc] !== expected) return false;
              }
            }
            return true;
          }
        );

        if (matchCount >= minMatches) {
          patterns.push({
            type: 'cross',
            startRow,
            startCol,
            width: windowSize * matchCount,
            height: windowSize,
          });
        }
      }
    }
  }

  return patterns;
}

function detectHexagonPattern(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const windowRows = 3;
  const windowCols = 3;
  const minMatches = 1;

  const hexagonPattern: WeaveCell[][] = [
    [0, 1, 0],
    [1, 0, 1],
    [0, 1, 0],
  ];

  for (let startRow = 0; startRow <= rows - windowRows; startRow++) {
    for (let startCol = 0; startCol <= cols - windowCols; startCol++) {
      let match = true;
      for (let r = 0; r < windowRows && match; r++) {
        for (let c = 0; c < windowCols && match; c++) {
          if (matrix[startRow + r]?.[startCol + c] !== hexagonPattern[r][c]) {
            match = false;
          }
        }
      }

      if (match) {
        patterns.push({
          type: 'hexagon',
          startRow,
          startCol,
          width: windowCols,
          height: windowRows,
        });
      }
    }
  }

  return patterns.slice(0, minMatches > 0 ? patterns.length : 0);
}

function detectHerringbonePattern(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const minLength = 4;

  for (let startRow = 0; startRow < rows; startRow++) {
    for (let startCol = 0; startCol < cols; startCol++) {
      const length = countHerringboneStair(matrix, startRow, startCol, rows, cols);
      if (length >= minLength) {
        patterns.push({
          type: 'herringbone',
          startRow,
          startCol,
          width: length,
          height: length,
        });
      }
    }
  }

  return patterns;
}

function countHerringboneStair(
  matrix: WeaveCell[][],
  startRow: number,
  startCol: number,
  rows: number,
  cols: number
): number {
  let count = 0;
  let r = startRow;
  let c = startCol;
  let lastValue: WeaveCell | null = null;

  while (r < rows && c < cols) {
    const current = matrix[r]?.[c];
    if (current === undefined) break;

    if (lastValue !== null && current === lastValue) {
      break;
    }

    count++;
    lastValue = current;

    const diagR = r + 1;
    const diagC = c + 1;
    if (diagR < rows && diagC < cols) {
      const diagVal = matrix[diagR]?.[diagC];
      if (diagVal !== undefined && diagVal === lastValue) {
        break;
      }
    }

    r++;
    c++;
  }

  return count;
}

function countConsecutiveMatches(
  matrix: WeaveCell[][],
  startRow: number,
  startCol: number,
  windowSize: number,
  matcher: (r: number, c: number) => boolean
): number {
  let count = 0;
  let col = startCol;
  const maxCols = matrix[0]?.length || 0;

  while (col + windowSize <= maxCols && matcher(startRow, col)) {
    count++;
    col += windowSize;
  }

  return count;
}

function mergeOverlappingPatterns(patterns: DetectedPattern[]): DetectedPattern[] {
  if (patterns.length <= 1) return patterns;

  const sorted = [...patterns].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.startRow !== b.startRow) return a.startRow - b.startRow;
    return a.startCol - b.startCol;
  });

  const merged: DetectedPattern[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;

    let current = { ...sorted[i] };
    used.add(i);

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j) || sorted[j].type !== current.type) continue;

      const other = sorted[j];
      if (patternsOverlap(current, other)) {
        current = mergePatterns(current, other);
        used.add(j);
      }
    }

    merged.push(current);
  }

  return merged;
}

function patternsOverlap(a: DetectedPattern, b: DetectedPattern): boolean {
  const aRight = a.startCol + a.width;
  const aBottom = a.startRow + a.height;
  const bRight = b.startCol + b.width;
  const bBottom = b.startRow + b.height;

  return !(
    aRight < b.startCol ||
    bRight < a.startCol ||
    aBottom < b.startRow ||
    bBottom < a.startRow
  );
}

function mergePatterns(a: DetectedPattern, b: DetectedPattern): DetectedPattern {
  const startRow = Math.min(a.startRow, b.startRow);
  const startCol = Math.min(a.startCol, b.startCol);
  const endRow = Math.max(a.startRow + a.height, b.startRow + b.height);
  const endCol = Math.max(a.startCol + a.width, b.startCol + b.width);

  return {
    type: a.type,
    startRow,
    startCol,
    width: endCol - startCol,
    height: endRow - startRow,
  };
}

export type { PatternType };
