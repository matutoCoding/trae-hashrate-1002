import { cn } from "@/lib/utils";
import type { WeaveCell, HighlightCell, HighlightRole } from "@/types";

export interface WeaveGridProps {
  weaveMatrix: WeaveCell[][];
  onCellClick?: (row: number, col: number, value: WeaveCell) => void;
  cellSize?: number;
  readOnly?: boolean;
  className?: string;
  highlightCells?: HighlightCell[];
}

export default function WeaveGrid({
  weaveMatrix,
  onCellClick,
  cellSize = 32,
  readOnly = false,
  className,
  highlightCells = [],
}: WeaveGridProps) {
  const rows = weaveMatrix.length;
  const cols = rows > 0 ? weaveMatrix[0].length : 0;

  const highlightMap = new Map<string, HighlightRole>();
  highlightCells.forEach((cell) => {
    highlightMap.set(`${cell.row}-${cell.col}`, cell.role);
  });

  const getHighlightRole = (row: number, col: number): HighlightRole | null => {
    return highlightMap.get(`${row}-${col}`) || null;
  };

  const handleClick = (row: number, col: number) => {
    if (readOnly) return;
    const currentValue = weaveMatrix[row][col];
    const newValue = (currentValue === 1 ? 0 : 1) as WeaveCell;
    onCellClick?.(row, col, newValue);
  };

  if (rows === 0 || cols === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-bambooBrown-500", className)}>
        暂无数据
      </div>
    );
  }

  return (
    <div
      className={cn("inline-block rounded-lg border border-bamboo-200 bg-bambooCream-100/40 p-2", className)}
    >
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        }}
      >
        {weaveMatrix.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isPick = cell === 1;
            const highlightRole = getHighlightRole(rowIndex, colIndex);
            const isTarget = highlightRole === 'target';
            const isAffect = highlightRole === 'affect';

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleClick(rowIndex, colIndex)}
                className={cn(
                  "flex items-center justify-center rounded-sm transition-all duration-150 relative",
                  isPick
                    ? "bg-bambooGreen-400/70 border border-bambooGreen-600/40"
                    : "bg-bamboo-300/60 border border-bamboo-500/40",
                  !readOnly && "hover:bg-bambooGreen-200/80 hover:shadow-md hover:scale-105 cursor-pointer",
                  isTarget && "ring-2 ring-warning ring-offset-1 z-10 animate-pulse-border",
                  isAffect && "bg-amber-200/70 border-amber-400/60"
                )}
                style={{ width: cellSize, height: cellSize }}
                title={isPick ? "挑" : "压"}
              >
                {isTarget && (
                  <span className="absolute inset-0 rounded-sm animate-pulse-ring pointer-events-none" />
                )}
                <span
                  className={cn(
                    "text-xs font-bold font-kai select-none relative z-10",
                    isPick ? "text-bambooGreen-800" : "text-bambooBrown-700",
                    isTarget && "text-warning-dark"
                  )}
                >
                  {isPick ? "挑" : "压"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
