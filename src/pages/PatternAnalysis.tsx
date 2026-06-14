import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Grid3X3,
  RefreshCw,
  Shuffle,
  Hexagon,
  X,
} from 'lucide-react';
import WeaveGrid from '@/components/WeaveGrid';
import { useWeaveStore } from '@/store/weaveStore';
import { parseImageToMatrix, detectPatterns } from '@/utils/algorithms/patternParser';
import type { WeaveCell, DetectedPattern, WeaveMatrix } from '@/types';

function generateCheckerboard(rows: number, cols: number): WeaveCell[][] {
  const matrix: WeaveCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: WeaveCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(((r + c) % 2 === 0) ? 1 : 0);
    }
    matrix.push(row);
  }
  return matrix;
}

function getPatternLabel(type: string): string {
  switch (type) {
    case 'cross':
      return '十字孔';
    case 'hexagon':
      return '六角孔';
    case 'herringbone':
      return '人字编';
    default:
      return type;
  }
}

function getPatternIcon(type: string) {
  switch (type) {
    case 'cross':
      return <Grid3X3 size={16} />;
    case 'hexagon':
      return <Hexagon size={16} />;
    case 'herringbone':
      return <Shuffle size={16} />;
    default:
      return <Grid3X3 size={16} />;
  }
}

function getPatternColor(type: string): string {
  switch (type) {
    case 'cross':
      return 'bg-bambooGreen-100 text-bambooGreen-700 border-bambooGreen-300';
    case 'hexagon':
      return 'bg-bambooCream-200 text-bambooBrown-700 border-bamboo-400';
    case 'herringbone':
      return 'bg-bamboo-100 text-bambooBrown-600 border-bamboo-300';
    default:
      return 'bg-bambooCream-100 text-bambooBrown-600 border-bamboo-300';
  }
}

export default function PatternAnalysis() {
  const setWeaveMatrix = useWeaveStore((s) => s.setWeaveMatrix);
  const storeMatrix = useWeaveStore((s) => s.weaveMatrix);

  const [rows, setRows] = useState(12);
  const [cols, setCols] = useState(12);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localMatrix, setLocalMatrix] = useState<WeaveCell[][]>(() => generateCheckerboard(12, 12));
  const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncToStore = useCallback((matrix: WeaveCell[][], patterns: DetectedPattern[]) => {
    const weaveMatrix: WeaveMatrix = {
      rows: matrix.length,
      cols: matrix.length > 0 ? matrix[0].length : 0,
      cellSize: 32,
      warpCodes: matrix,
      weftCodes: matrix.map((row) => row.map((cell) => (cell === 1 ? 0 : 1) as WeaveCell)),
      detectedPatterns: patterns,
    };
    setWeaveMatrix(weaveMatrix);
  }, [setWeaveMatrix]);

  useEffect(() => {
    const patterns = detectPatterns(localMatrix);
    setDetectedPatterns(patterns);
    syncToStore(localMatrix, patterns);
  }, [localMatrix, syncToStore]);

  useEffect(() => {
    if (!storeMatrix) {
      const initial = generateCheckerboard(12, 12);
      setLocalMatrix(initial);
    }
  }, [storeMatrix]);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleParse = () => {
    if (!imagePreview || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const matrix = parseImageToMatrix(canvas, rows, cols);
      setLocalMatrix(matrix);
    };
    img.src = imagePreview;
  };

  const handleCellClick = (row: number, col: number, value: WeaveCell) => {
    setLocalMatrix((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = value;
      return next;
    });
  };

  const handleFillCheckerboard = () => {
    setLocalMatrix(generateCheckerboard(rows, cols));
  };

  const handleFlipAll = () => {
    setLocalMatrix((prev) =>
      prev.map((row) => row.map((cell) => (cell === 1 ? 0 : 1) as WeaveCell))
    );
  };

  const handleReset = () => {
    setRows(12);
    setCols(12);
    setLocalMatrix(generateCheckerboard(12, 12));
  };

  const totalCells = localMatrix.length > 0 ? localMatrix.length * localMatrix[0].length : 0;
  const pickCount = localMatrix.reduce(
    (acc, row) => acc + row.reduce((a, c) => a + (c === 1 ? 1 : 0), 0),
    0
  );
  const pressCount = totalCells - pickCount;
  const pickRatio = totalCells > 0 ? ((pickCount / totalCells) * 100).toFixed(1) : '0.0';
  const pressRatio = totalCells > 0 ? ((pressCount / totalCells) * 100).toFixed(1) : '0.0';

  return (
    <div className="flex h-full w-full gap-6">
      <div className="flex w-72 flex-col gap-4 shrink-0">
        <div className="card-bamboo">
          <h3 className="flex items-center gap-2 font-kai text-base font-bold text-bambooBrown-800 mb-3">
            <Upload size={18} />
            图像上传
          </h3>

          {!imagePreview ? (
            <div
              onClick={handleUploadClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed
                transition-all duration-200
                ${isDragging
                  ? 'border-bambooGreen-500 bg-bambooGreen-50'
                  : 'border-bamboo-300 bg-bambooCream-50 hover:border-bambooGreen-400 hover:bg-bambooGreen-50/50'
                }
              `}
            >
              <ImageIcon size={32} className="text-bamboo-400 mb-2" />
              <span className="font-song text-sm text-bambooBrown-600">
                点击或拖拽图片到此
              </span>
              <span className="font-song text-xs text-bambooBrown-400 mt-1">
                支持 JPG / PNG / BMP
              </span>
            </div>
          ) : (
            <div className="relative group">
              <img
                src={imagePreview}
                alt="上传预览"
                className="w-full h-40 object-cover rounded-lg border border-bamboo-200"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>

        <div className="card-bamboo">
          <h3 className="flex items-center gap-2 font-kai text-base font-bold text-bambooBrown-800 mb-3">
            <Grid3X3 size={18} />
            解析设置
          </h3>

          <div className="space-y-3">
            <div>
              <label className="label-bamboo">行数</label>
              <input
                type="number"
                min={2}
                max={64}
                value={rows}
                onChange={(e) => setRows(Math.max(2, Math.min(64, parseInt(e.target.value) || 2)))}
                className="input-bamboo"
              />
            </div>
            <div>
              <label className="label-bamboo">列数</label>
              <input
                type="number"
                min={2}
                max={64}
                value={cols}
                onChange={(e) => setCols(Math.max(2, Math.min(64, parseInt(e.target.value) || 2)))}
                className="input-bamboo"
              />
            </div>
            <button
              onClick={handleParse}
              disabled={!imagePreview}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              解析图像
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="card-bamboo flex-1 flex flex-col items-center justify-center overflow-auto">
          <div className="mb-4 flex items-center gap-4">
            <h3 className="font-kai text-lg font-bold text-bambooBrown-800">
              挑压矩阵视图
            </h3>
            <span className="tag-bamboo">
              {localMatrix.length} × {localMatrix.length > 0 ? localMatrix[0].length : 0}
            </span>
            <span className="font-song text-xs text-bambooBrown-500">
              点击格子可切换挑/压状态
            </span>
          </div>
          <div className="overflow-auto max-w-full max-h-full p-4">
            <WeaveGrid
              weaveMatrix={localMatrix}
              onCellClick={handleCellClick}
              cellSize={32}
            />
          </div>
        </div>
      </div>

      <div className="flex w-80 flex-col gap-4 shrink-0 overflow-y-auto">
        <div className="card-bamboo">
          <h3 className="flex items-center gap-2 font-kai text-base font-bold text-bambooBrown-800 mb-3">
            <Hexagon size={18} />
            编法识别结果
          </h3>
          {detectedPatterns.length === 0 ? (
            <div className="py-6 text-center font-song text-sm text-bambooBrown-400">
              未识别到基础编法
            </div>
          ) : (
            <div className="space-y-2">
              {detectedPatterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 ${getPatternColor(pattern.type)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPatternIcon(pattern.type)}
                      <span className="font-kai text-sm font-semibold">
                        {getPatternLabel(pattern.type)}
                      </span>
                    </div>
                    <span className="font-song text-xs">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="mt-2 font-song text-xs space-y-1 opacity-90">
                    <div>
                      位置：({pattern.startRow + 1}, {pattern.startCol + 1})
                    </div>
                    <div>
                      尺寸：{pattern.width} × {pattern.height}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-bamboo">
          <h3 className="flex items-center gap-2 font-kai text-base font-bold text-bambooBrown-800 mb-3">
            <Grid3X3 size={18} />
            解析统计
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-song text-sm text-bambooBrown-600">总单元格</span>
              <span className="font-kai text-lg font-bold text-bambooBrown-800">
                {totalCells}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-song text-sm text-bambooBrown-600">挑数</span>
              <span className="font-kai text-lg font-bold text-bambooGreen-600">
                {pickCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-song text-sm text-bambooBrown-600">压数</span>
              <span className="font-kai text-lg font-bold text-bambooBrown-600">
                {pressCount}
              </span>
            </div>
            <div className="border-t border-bamboo-200 pt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-song text-sm text-bambooBrown-600">挑压比</span>
                <span className="font-song text-xs text-bambooBrown-500">
                  {pickRatio}% : {pressRatio}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-bamboo-200 overflow-hidden flex">
                <div
                  className="h-full bg-bambooGreen-400 transition-all duration-300"
                  style={{ width: `${pickRatio}%` }}
                />
                <div
                  className="h-full bg-bamboo-400 transition-all duration-300"
                  style={{ width: `${pressRatio}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-bamboo">
          <h3 className="flex items-center gap-2 font-kai text-base font-bold text-bambooBrown-800 mb-3">
            <Shuffle size={18} />
            快捷操作
          </h3>
          <div className="space-y-2">
            <button
              onClick={handleFillCheckerboard}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Grid3X3 size={16} />
              填充棋盘格
            </button>
            <button
              onClick={handleFlipAll}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Shuffle size={16} />
              翻转全部
            </button>
            <button
              onClick={handleReset}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              重置矩阵
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
