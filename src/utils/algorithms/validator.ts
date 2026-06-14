import type { WeaveCell, ValidationResult, ValidationError, ValidationWarning, ColorShift } from '@/types';

export function validateClosure(matrix: WeaveCell[][]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const rows = matrix.length;
  if (rows === 0) {
    return {
      isValid: false,
      errors: [{ type: 'misalignment', message: '矩阵为空' }],
      warnings: [],
    };
  }

  const cols = matrix[0].length;
  if (cols === 0) {
    return {
      isValid: false,
      errors: [{ type: 'misalignment', message: '矩阵列数为0' }],
      warnings: [],
    };
  }

  const rowEndErrors = validateRowClosure(matrix, rows, cols);
  errors.push(...rowEndErrors);

  const colEndErrors = validateColClosure(matrix, rows, cols);
  errors.push(...colEndErrors);

  const consecWarnings = validateConsecutiveSame(matrix, rows, cols);
  warnings.push(...consecWarnings);

  const alignmentWarnings = validateAlternatingPattern(matrix, rows, cols);
  warnings.push(...alignmentWarnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateRowClosure(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let row = 0; row < rows; row++) {
    const firstCell = matrix[row][0];
    const lastCell = matrix[row][cols - 1];

    if (firstCell === lastCell) {
      errors.push({
        type: 'open_end',
        row,
        message: `第 ${row + 1} 行首尾挑压状态相同，无法形成闭合循环`,
        suggestion: `建议将第 ${row + 1} 行首列或末列翻转：${firstCell === 0 ? '0→1' : '1→0'}`,
      });
    }
  }

  return errors;
}

function validateColClosure(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let col = 0; col < cols; col++) {
    const firstCell = matrix[0][col];
    const lastCell = matrix[rows - 1][col];

    if (firstCell === lastCell) {
      errors.push({
        type: 'open_end',
        col,
        message: `第 ${col + 1} 列首尾挑压状态相同，无法形成闭合循环`,
        suggestion: `建议将第 ${col + 1} 列首行或末行翻转：${firstCell === 0 ? '0→1' : '1→0'}`,
      });
    }
  }

  return errors;
}

function validateConsecutiveSame(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const maxConsecutive = 3;

  for (let row = 0; row < rows; row++) {
    let count = 1;
    for (let col = 1; col < cols; col++) {
      if (matrix[row][col] === matrix[row][col - 1]) {
        count++;
        if (count > maxConsecutive) {
          warnings.push({
            type: 'consecutive_same',
            row,
            col: col - count + 1,
            message: `第 ${row + 1} 行第 ${col - count + 2} 至 ${col + 1} 列存在连续 ${count} 个相同挑压状态，可能导致散口`,
          });
          break;
        }
      } else {
        count = 1;
      }
    }
  }

  for (let col = 0; col < cols; col++) {
    let count = 1;
    for (let row = 1; row < rows; row++) {
      if (matrix[row][col] === matrix[row - 1][col]) {
        count++;
        if (count > maxConsecutive) {
          warnings.push({
            type: 'consecutive_same',
            row: row - count + 1,
            col,
            message: `第 ${col + 1} 列第 ${row - count + 2} 至 ${row + 1} 行存在连续 ${count} 个相同挑压状态，可能导致散口`,
          });
          break;
        }
      } else {
        count = 1;
      }
    }
  }

  return warnings;
}

function validateAlternatingPattern(
  matrix: WeaveCell[][],
  rows: number,
  cols: number
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols - 1; col++) {
      if (col < cols - 1 && row < rows - 1) {
        const current = matrix[row][col];
        const right = matrix[row][col + 1];
        const bottom = matrix[row + 1][col];
        const diagonal = matrix[row + 1][col + 1];

        if (current === right && current === bottom && current === diagonal) {
          warnings.push({
            type: 'block_same',
            row,
            col,
            message: `第 ${row + 1}-${row + 2} 行，第 ${col + 1}-${col + 2} 列 2×2 区域全部为 ${current}，挑压交错性不足`,
          });
        }
      }
    }
  }

  return warnings;
}

export function detectColorShift(
  matrix: WeaveCell[][],
  colors: string[][]
): ColorShift[] {
  const shifts: ColorShift[] = [];
  const rows = matrix.length;
  if (rows === 0) return shifts;
  const cols = matrix[0].length;

  if (colors.length !== rows || (colors[0]?.length || 0) !== cols) {
    shifts.push({
      message: `配色矩阵尺寸 ${colors.length}×${colors[0]?.length || 0} 与挑压矩阵 ${rows}×${cols} 不匹配`,
      expected: `${rows}×${cols}`,
      actual: `${colors.length}×${colors[0]?.length || 0}`,
    });
    return shifts;
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const currentColor = colors[row]?.[col];
      if (!currentColor) continue;

      if (col < cols - 1) {
        const rightColor = colors[row]?.[col + 1];
        if (matrix[row][col] === matrix[row][col + 1] && currentColor !== rightColor) {
          shifts.push({
            row,
            col,
            expected: currentColor,
            actual: rightColor,
            message: `第 ${row + 1} 行第 ${col + 1} 与 ${col + 2} 列挑压相同但配色不同`,
          });
        }
      }

      if (row < rows - 1) {
        const bottomColor = colors[row + 1]?.[col];
        if (matrix[row][col] === matrix[row + 1][col] && currentColor !== bottomColor) {
          shifts.push({
            row,
            col,
            expected: currentColor,
            actual: bottomColor,
            message: `第 ${col + 1} 列第 ${row + 1} 与 ${row + 2} 行挑压相同但配色不同`,
          });
        }
      }
    }
  }

  return shifts;
}
