import { cn } from "@/lib/utils";

export type WeaveCell = 0 | 1;

export interface WeaveGridProps {
  weaveMatrix: WeaveCell[][];
  onCellClick?: (row: number, col: number, value: WeaveCell) => void;
  cellSize?: number;
  readOnly?: boolean;
  className?: string;
}

export default function WeaveGrid({
  weaveMatrix,
  onCellClick,
  cellSize = 32,
  readOnly = false,
  className,
}: WeaveGridProps) {
  const rows = weaveMatrix.length;
  const cols = rows > 0 ? weaveMatrix[0].length : 0;

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
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleClick(rowIndex, colIndex)}
                className={cn(
                  "flex items-center justify-center rounded-sm transition-all duration-150",
                  isPick
                    ? "bg-bambooGreen-400/70 border border-bambooGreen-600/40"
                    : "bg-bamboo-300/60 border border-bamboo-500/40",
                  !readOnly && "hover:bg-bambooGreen-200/80 hover:shadow-md hover:scale-105 cursor-pointer"
                )}
                style={{ width: cellSize, height: cellSize }}
                title={isPick ? "挑" : "压"}
              >
                <span
                  className={cn(
                    "text-xs font-bold font-kai select-none",
                    isPick ? "text-bambooGreen-800" : "text-bambooBrown-700"
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
