import { useEffect, useMemo, useCallback } from 'react';
import { Binary, AlertTriangle, CheckCircle2, Ruler, Eye, Lock, Wand2, ChevronUp, ChevronDown, X, Lightbulb, Target } from 'lucide-react';
import { useWeaveStore } from '@/store/weaveStore';
import { calcDensity, calcPorosity, calcLightTransmission } from '@/utils/algorithms/calculator';
import { validateClosure } from '@/utils/algorithms/validator';
import WeaveGrid from '@/components/WeaveGrid';
import GaugeMeter from '@/components/GaugeMeter';
import type { WeaveCell, WeaveMatrix, ValidationError, ValidationWarning, CorrectionContext, HighlightCell } from '@/types';

function generateMockMatrix(): WeaveMatrix {
  const rows = 8;
  const cols = 10;
  const warpCodes: WeaveCell[][] = [];
  const weftCodes: WeaveCell[][] = [];

  for (let r = 0; r < rows; r++) {
    const warpRow: WeaveCell[] = [];
    const weftRow: WeaveCell[] = [];
    for (let c = 0; c < cols; c++) {
      const val = ((r + c) % 2) as WeaveCell;
      warpRow.push(val);
      weftRow.push((val === 1 ? 0 : 1) as WeaveCell);
    }
    warpCodes.push(warpRow);
    weftCodes.push(weftRow);
  }

  warpCodes[2][0] = 1;
  warpCodes[5][cols - 1] = 0;
  warpCodes[3][3] = 0;
  warpCodes[3][4] = 0;
  warpCodes[3][5] = 0;

  return {
    rows,
    cols,
    cellSize: 32,
    warpCodes,
    weftCodes,
    detectedPatterns: [
      { type: 'plain', startRow: 0, startCol: 0, width: 6, height: 6 },
    ],
  };
}

export default function WeaveCoding() {
  const {
    weaveMatrix,
    weaveParams,
    validationResult,
    correctionContext,
    setWeaveMatrix,
    setParams,
    updateCell,
    runValidation,
    setCorrectionContext,
    applySuggestionFix,
  } = useWeaveStore();

  useEffect(() => {
    if (!weaveMatrix) {
      const mock = generateMockMatrix();
      setWeaveMatrix(mock);
    }
  }, [weaveMatrix, setWeaveMatrix]);

  useEffect(() => {
    if (weaveMatrix) {
      runValidation();
    }
  }, [weaveMatrix, runValidation]);

  const density = useMemo(
    () => calcDensity(weaveParams.bambooWidth, weaveParams.bambooGap),
    [weaveParams.bambooWidth, weaveParams.bambooGap]
  );

  const porosity = useMemo(
    () => calcPorosity(weaveParams.bambooWidth, weaveParams.bambooGap),
    [weaveParams.bambooWidth, weaveParams.bambooGap]
  );

  const lightTransmission = useMemo(
    () => calcLightTransmission(weaveParams.bambooWidth, weaveParams.bambooGap),
    [weaveParams.bambooWidth, weaveParams.bambooGap]
  );

  const closureValidation = useMemo(() => {
    if (!weaveMatrix) return null;
    return validateClosure(weaveMatrix.warpCodes);
  }, [weaveMatrix]);

  const realTimeMetrics = useMemo(() => {
    const unitWidth = weaveParams.bambooWidth + weaveParams.bambooGap;
    const warpCount = weaveMatrix ? weaveMatrix.cols : 0;
    const weftCount = weaveMatrix ? weaveMatrix.rows : 0;
    const calcWidth = warpCount * unitWidth;
    const calcHeight = weftCount * unitWidth;
    const totalBamboo = (calcWidth + calcHeight) * weaveParams.lossRate;
    return { warpCount, weftCount, calcWidth, calcHeight, totalBamboo };
  }, [weaveParams, weaveMatrix]);

  const handleCellClick = (row: number, col: number, value: WeaveCell) => {
    updateCell(row, col, 'warp', value);
    updateCell(row, col, 'weft', (value === 1 ? 0 : 1) as WeaveCell);

    if (correctionContext) {
      runValidation();

      setTimeout(() => {
        const state = useWeaveStore.getState();
        const newErrors = (state.validationResult?.errors || []).filter(e => e.row !== undefined && e.col !== undefined);
        const newWarnings = (state.validationResult?.warnings || []).filter(w => w.row !== undefined && w.col !== undefined);
        const newAllIssues = [
          ...newErrors.map(e => ({ ...e, level: 'error' as const })),
          ...newWarnings.map(w => ({ ...w, level: 'warning' as const })),
        ];

        if (newAllIssues.length === 0) {
          setCorrectionContext(null);
          return;
        }

        const samePositionIssue = newAllIssues.find(
          issue => issue.row === correctionContext.row && issue.col === correctionContext.col
        );

        if (samePositionIssue && samePositionIssue.row !== undefined && samePositionIssue.col !== undefined) {
          const relatedCells = buildRelatedCells(samePositionIssue.row, samePositionIssue.col);
          const currentIdx = newAllIssues.findIndex(
            issue => issue.row === samePositionIssue.row && issue.col === samePositionIssue.col
          );
          setCorrectionContext({
            row: samePositionIssue.row,
            col: samePositionIssue.col,
            errorType: samePositionIssue.type,
            suggestion: samePositionIssue.suggestion,
            relatedCells,
            fixAction: 'flip',
            currentIndex: currentIdx >= 0 ? currentIdx : 0,
            totalCount: newAllIssues.length,
          });
        } else {
          const currentIdx = correctionContext.currentIndex ?? 0;
          const nextIdx = Math.min(currentIdx, newAllIssues.length - 1);
          const nextIssue = newAllIssues[nextIdx];

          if (nextIssue && nextIssue.row !== undefined && nextIssue.col !== undefined) {
            const relatedCells = buildRelatedCells(nextIssue.row, nextIssue.col);
            setCorrectionContext({
              row: nextIssue.row,
              col: nextIssue.col,
              errorType: nextIssue.type,
              suggestion: nextIssue.suggestion,
              relatedCells,
              fixAction: 'flip',
              currentIndex: nextIdx,
              totalCount: newAllIssues.length,
            });
          } else {
            setCorrectionContext(null);
          }
        }
      }, 50);
    } else {
      runValidation();
    }
  };

  const handleParamChange = (key: keyof typeof weaveParams, value: string) => {
    const num = parseFloat(value) || 0;
    setParams({ [key]: num });
  };

  const allIssues = useMemo(() => {
    const errors = (validationResult?.errors || []).filter(e => e.row !== undefined && e.col !== undefined);
    const warnings = (validationResult?.warnings || []).filter(w => w.row !== undefined && w.col !== undefined);
    return [
      ...errors.map(e => ({ ...e, level: 'error' as const })),
      ...warnings.map(w => ({ ...w, level: 'warning' as const })),
    ];
  }, [validationResult]);

  const buildRelatedCells = useCallback((row: number, col: number): HighlightCell[] => {
    const cells: HighlightCell[] = [];
    cells.push({ row, col, role: 'target' });
    if (weaveMatrix) {
      for (let c = 0; c < weaveMatrix.cols; c++) {
        if (c !== col) {
          cells.push({ row, col: c, role: 'affect' });
        }
      }
      for (let r = 0; r < weaveMatrix.rows; r++) {
        if (r !== row) {
          cells.push({ row: r, col, role: 'affect' });
        }
      }
    }
    return cells;
  }, [weaveMatrix]);

  const handleEnterCorrection = useCallback((issue: ValidationError | (ValidationWarning & { level?: string }), index: number) => {
    if (issue.row === undefined || issue.col === undefined) return;

    const relatedCells = buildRelatedCells(issue.row, issue.col);

    setCorrectionContext({
      row: issue.row,
      col: issue.col,
      errorType: issue.type,
      suggestion: issue.suggestion,
      relatedCells,
      fixAction: 'flip',
      currentIndex: index,
      totalCount: allIssues.length,
    });
  }, [buildRelatedCells, allIssues.length, setCorrectionContext]);

  const handleExitCorrection = useCallback(() => {
    setCorrectionContext(null);
  }, [setCorrectionContext]);

  const handlePrevIssue = useCallback(() => {
    if (!correctionContext || correctionContext.currentIndex === undefined) return;
    const prevIndex = correctionContext.currentIndex - 1;
    if (prevIndex >= 0 && allIssues[prevIndex]) {
      const issue = allIssues[prevIndex];
      const relatedCells = buildRelatedCells(issue.row!, issue.col!);
      setCorrectionContext({
        row: issue.row!,
        col: issue.col!,
        errorType: issue.type,
        suggestion: issue.suggestion,
        relatedCells,
        fixAction: 'flip',
        currentIndex: prevIndex,
        totalCount: allIssues.length,
      });
    }
  }, [correctionContext, allIssues, buildRelatedCells, setCorrectionContext]);

  const handleNextIssue = useCallback(() => {
    if (!correctionContext || correctionContext.currentIndex === undefined) return;
    const nextIndex = correctionContext.currentIndex + 1;
    if (nextIndex < allIssues.length && allIssues[nextIndex]) {
      const issue = allIssues[nextIndex];
      const relatedCells = buildRelatedCells(issue.row!, issue.col!);
      setCorrectionContext({
        row: issue.row!,
        col: issue.col!,
        errorType: issue.type,
        suggestion: issue.suggestion,
        relatedCells,
        fixAction: 'flip',
        currentIndex: nextIndex,
        totalCount: allIssues.length,
      });
    }
  }, [correctionContext, allIssues, buildRelatedCells, setCorrectionContext]);

  const handleApplySuggestion = useCallback(() => {
    if (!correctionContext) return;

    const { row, col } = correctionContext;
    const currentVal = weaveMatrix?.warpCodes[row]?.[col];
    if (currentVal !== undefined) {
      const newVal = (currentVal === 1 ? 0 : 1) as WeaveCell;
      updateCell(row, col, 'warp', newVal);
      updateCell(row, col, 'weft', (newVal === 1 ? 0 : 1) as WeaveCell);
    }

    runValidation();

    setTimeout(() => {
      const state = useWeaveStore.getState();
      const newErrors = (state.validationResult?.errors || []).filter(e => e.row !== undefined && e.col !== undefined);
      const newWarnings = (state.validationResult?.warnings || []).filter(w => w.row !== undefined && w.col !== undefined);
      const newAllIssues = [
        ...newErrors.map(e => ({ ...e, level: 'error' as const })),
        ...newWarnings.map(w => ({ ...w, level: 'warning' as const })),
      ];

      if (newAllIssues.length === 0) {
        setCorrectionContext(null);
        return;
      }

      const currentIdx = correctionContext.currentIndex ?? 0;
      const nextIdx = Math.min(currentIdx, newAllIssues.length - 1);
      const nextIssue = newAllIssues[nextIdx];

      if (nextIssue && nextIssue.row !== undefined && nextIssue.col !== undefined) {
        const relatedCells = buildRelatedCells(nextIssue.row, nextIssue.col);
        setCorrectionContext({
          row: nextIssue.row,
          col: nextIssue.col,
          errorType: nextIssue.type,
          suggestion: nextIssue.suggestion,
          relatedCells,
          fixAction: 'flip',
          currentIndex: nextIdx,
          totalCount: newAllIssues.length,
        });
      } else {
        setCorrectionContext(null);
      }
    }, 50);
  }, [correctionContext, weaveMatrix, updateCell, runValidation, buildRelatedCells, setCorrectionContext]);

  const highlightCells = useMemo((): HighlightCell[] => {
    if (!correctionContext) return [];
    return correctionContext.relatedCells || [];
  }, [correctionContext]);

  const getErrorTypeLabel = (type: string): string => {
    const labelMap: Record<string, string> = {
      'open_end': '散口风险',
      'misalignment': '挑压错位',
      'color_shift': '配色不一致',
      'dense_pattern': '密集模式',
      'consecutive_same': '连续同态',
      'block_same': '区块同态',
      'edge_unstable': '边缘不稳',
    };
    return labelMap[type] || type;
  };

  return (
    <div className="min-h-screen p-6 flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-bambooGreen-500 flex items-center justify-center shadow-bamboo">
          <Binary className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-song text-2xl font-bold text-bambooBrown-800">挑压编码</h1>
          <p className="font-kai text-sm text-bamboo-600">经纬挑压序列的可视化编辑与校验</p>
        </div>
      </header>

      <section className="card-bamboo">
        <div className="flex items-center gap-2 mb-4">
          <Ruler className="w-4 h-4 text-bambooGreen-600" />
          <h2 className="font-song text-base font-semibold text-bambooBrown-700">工艺参数</h2>
          <span className="tag-bamboo ml-2">实时计算</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="label-bamboo">篾宽 (mm)</label>
            <input
              type="number"
              className="input-bamboo"
              value={weaveParams.bambooWidth}
              onChange={(e) => handleParamChange('bambooWidth', e.target.value)}
              min={0.1}
              step={0.1}
            />
          </div>
          <div>
            <label className="label-bamboo">间隙 (mm)</label>
            <input
              type="number"
              className="input-bamboo"
              value={weaveParams.bambooGap}
              onChange={(e) => handleParamChange('bambooGap', e.target.value)}
              min={0}
              step={0.1}
            />
          </div>
          <div>
            <label className="label-bamboo">成品宽度 (mm)</label>
            <input
              type="number"
              className="input-bamboo"
              value={weaveParams.finishedWidth}
              onChange={(e) => handleParamChange('finishedWidth', e.target.value)}
              min={1}
            />
          </div>
          <div>
            <label className="label-bamboo">成品高度 (mm)</label>
            <input
              type="number"
              className="input-bamboo"
              value={weaveParams.finishedHeight}
              onChange={(e) => handleParamChange('finishedHeight', e.target.value)}
              min={1}
            />
          </div>
          <div>
            <label className="label-bamboo">损耗系数</label>
            <input
              type="number"
              className="input-bamboo"
              value={weaveParams.lossRate}
              onChange={(e) => handleParamChange('lossRate', e.target.value)}
              min={1}
              step={0.01}
            />
          </div>
          <div className="bg-bambooGreen-50/60 rounded-lg p-3 border border-bambooGreen-200">
            <p className="text-xs font-kai text-bambooGreen-700 mb-1">实时估算</p>
            <div className="text-xs font-song text-bambooBrown-600 space-y-0.5">
              <p>经篾: <span className="font-semibold text-bambooGreen-700">{realTimeMetrics.warpCount}</span> 根</p>
              <p>纬篾: <span className="font-semibold text-bambooGreen-700">{realTimeMetrics.weftCount}</span> 根</p>
              <p>总长度: <span className="font-semibold text-bambooGreen-700">{realTimeMetrics.totalBamboo.toFixed(1)}</span> mm</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-8 flex flex-col gap-6">
          <div className="card-bamboo">
            <div className="flex items-center gap-2 mb-4">
              <Binary className="w-4 h-4 text-bambooGreen-600" />
              <h2 className="font-song text-base font-semibold text-bambooBrown-700">经篾挑压序列</h2>
            </div>
            <div className="overflow-x-auto pb-2" style={{ maxHeight: '180px' }}>
              <div className="flex flex-col gap-1 min-w-max">
                {weaveMatrix?.warpCodes.map((row, rowIdx) => (
                  <div key={`warp-${rowIdx}`} className="flex items-center gap-2">
                    <span className="font-kai text-xs text-bamboo-600 w-14 text-right shrink-0">
                      经{rowIdx + 1}
                    </span>
                    <div className="flex gap-0.5">
                      {row.map((cell, colIdx) => (
                        <div
                          key={`warp-${rowIdx}-${colIdx}`}
                          className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold font-song border ${
                            cell === 1
                              ? 'bg-bambooGreen-400/80 border-bambooGreen-600/50 text-bambooGreen-900'
                              : 'bg-bambooBrown-300/80 border-bambooBrown-500/50 text-bambooBrown-900'
                          }`}
                          title={cell === 1 ? '挑' : '压'}
                        >
                          {cell}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-bamboo">
            <div className="flex items-center gap-2 mb-4">
              <Binary className="w-4 h-4 text-bambooBrown-600" />
              <h2 className="font-song text-base font-semibold text-bambooBrown-700">纬篾挑压序列</h2>
            </div>
            <div className="overflow-x-auto pb-2" style={{ maxHeight: '180px' }}>
              <div className="flex flex-col gap-1 min-w-max">
                {weaveMatrix?.weftCodes.map((row, rowIdx) => (
                  <div key={`weft-${rowIdx}`} className="flex items-center gap-2">
                    <span className="font-kai text-xs text-bamboo-600 w-14 text-right shrink-0">
                      纬{rowIdx + 1}
                    </span>
                    <div className="flex gap-0.5">
                      {row.map((cell, colIdx) => (
                        <div
                          key={`weft-${rowIdx}-${colIdx}`}
                          className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold font-song border ${
                            cell === 1
                              ? 'bg-bambooGreen-400/80 border-bambooGreen-600/50 text-bambooGreen-900'
                              : 'bg-bambooBrown-300/80 border-bambooBrown-500/50 text-bambooBrown-900'
                          }`}
                          title={cell === 1 ? '挑' : '压'}
                        >
                          {cell}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-bamboo">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-bambooGreen-600" />
                <h2 className="font-song text-base font-semibold text-bambooBrown-700">挑压矩阵视图</h2>
              </div>
              <div className="flex items-center gap-3 text-xs font-kai">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-bambooGreen-400/70 border border-bambooGreen-600/40"></span>
                  挑 (1)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-bamboo-300/60 border border-bamboo-500/40"></span>
                  压 (0)
                </span>
              </div>
            </div>
            <div className="overflow-auto">
              {weaveMatrix && (
                <WeaveGrid
                  weaveMatrix={weaveMatrix.warpCodes}
                  onCellClick={handleCellClick}
                  cellSize={36}
                  highlightCells={highlightCells}
                />
              )}
            </div>
          </div>
        </section>

        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="card-bamboo flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h2 className="font-song text-base font-semibold text-bambooBrown-700">校验结果</h2>
              </div>
              <button onClick={runValidation} className="btn-secondary text-xs py-1 px-3">
                重新校验
              </button>
            </div>

            <div className="mb-3 p-3 rounded-lg bg-bambooGreen-50/60 border border-bambooGreen-200">
              <div className="flex items-center gap-2">
                {validationResult?.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-bambooGreen-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                )}
                <span className={`font-song font-semibold ${
                  validationResult?.isValid ? 'text-bambooGreen-700' : 'text-warning-dark'
                }`}>
                  {validationResult?.isValid ? '挑压结构合格' : '存在待修正问题'}
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-xs font-kai text-bambooBrown-600">
                <span>错误: <span className="font-semibold text-warning">{validationResult?.errors.length || 0}</span></span>
                <span>警告: <span className="font-semibold text-bamboo-600">{validationResult?.warnings.length || 0}</span></span>
              </div>
            </div>

            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {validationResult?.errors.map((err: ValidationError, idx: number) => (
                <div
                  key={`err-${idx}`}
                  className="p-3 rounded-lg bg-warning/5 border border-warning/30 hover:bg-warning/10 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="relative flex shrink-0 mt-0.5">
                      <span className="animate-pulse-soft w-2.5 h-2.5 rounded-full bg-warning"></span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-warning-dark">错误</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-warning/15 text-warning-dark font-kai">
                          {err.type === 'open_end' ? '散口' : err.type === 'misalignment' ? '错位' : '配色错位'}
                        </span>
                        {(err.row !== undefined || err.col !== undefined) && (
                          <span className="text-xs font-kai text-bamboo-600">
                            位置: {err.row !== undefined ? `行${err.row + 1}` : ''}
                            {err.row !== undefined && err.col !== undefined ? ', ' : ''}
                            {err.col !== undefined ? `列${err.col + 1}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-song text-bambooBrown-800 mt-1">{err.message}</p>
                      {err.suggestion && (
                        <p className="text-xs font-kai text-bambooGreen-700 mt-1">
                          💡 {err.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {validationResult?.warnings.map((warn: ValidationWarning, idx: number) => (
                <div
                  key={`warn-${idx}`}
                  className="p-3 rounded-lg bg-bamboo-100/60 border border-bamboo-300/50 hover:bg-bamboo-100 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-bamboo-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-bamboo-700">警告</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-bamboo-200/60 text-bamboo-700 font-kai">
                          {warn.type === 'dense_pattern' ? '密集模式' :
                            warn.type === 'color_shift' ? '配色' :
                            warn.type === 'consecutive_same' ? '连续同态' :
                            warn.type === 'block_same' ? '区块同态' : warn.type}
                        </span>
                        {(warn.row !== undefined || warn.col !== undefined) && (
                          <span className="text-xs font-kai text-bamboo-600">
                            位置: {warn.row !== undefined ? `行${warn.row + 1}` : ''}
                            {warn.row !== undefined && warn.col !== undefined ? ', ' : ''}
                            {warn.col !== undefined ? `列${warn.col + 1}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-song text-bambooBrown-700 mt-1">{warn.message}</p>
                      {(warn as ValidationError).suggestion && (
                        <p className="text-xs font-kai text-bambooGreen-700 mt-1">
                          💡 {(warn as ValidationError).suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {(!validationResult || (validationResult.errors.length === 0 && validationResult.warnings.length === 0)) && (
                <div className="text-center py-8 text-bamboo-500 font-kai">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-bambooGreen-400" />
                  <p>暂无问题，挑压结构良好</p>
                </div>
              )}
            </div>
          </div>

          <div className="card-bamboo">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-bambooGreen-600" />
              <h2 className="font-song text-base font-semibold text-bambooBrown-700">工艺参数面板</h2>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-5">
              <GaugeMeter
                value={density}
                max={50}
                label="密度"
                color="#5B9D57"
                size={90}
                strokeWidth={7}
                unit="根/10cm"
              />
              <GaugeMeter
                value={porosity * 100}
                max={100}
                label="孔隙率"
                color="#A88B3D"
                size={90}
                strokeWidth={7}
                unit="%"
              />
              <GaugeMeter
                value={lightTransmission * 100}
                max={100}
                label="透光率"
                color="#8B5A2B"
                size={90}
                strokeWidth={7}
                unit="%"
              />
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-song text-bambooBrown-700 font-semibold">收口锁边模拟</span>
                <span className="tag-bamboo text-[10px]">
                  {closureValidation?.isValid ? '闭合合格' : '存在开口'}
                </span>
              </div>
              <div className="bg-bambooCream-100/60 rounded-lg p-3 border border-bamboo-200/60">
                <svg viewBox="0 0 200 80" className="w-full h-20">
                  <defs>
                    <pattern id="edgeWeave" width="10" height="10" patternUnits="userSpaceOnUse">
                      <rect width="10" height="10" fill="#F0E6C8" />
                      <path d="M0,5 L10,5" stroke="#A88B3D" strokeWidth="1.5" />
                      <path d="M5,0 L5,10" stroke="#5B9D57" strokeWidth="1.5" />
                    </pattern>
                  </defs>
                  <rect x="25" y="10" width="150" height="60" fill="url(#edgeWeave)" rx="3" />
                  <path
                    d="M25,10 Q20,40 25,70"
                    fill="none"
                    stroke="#8B5A2B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="svg-animate-draw"
                  />
                  <path
                    d="M175,10 Q180,40 175,70"
                    fill="none"
                    stroke="#8B5A2B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ animationDelay: '0.2s' }}
                    className="svg-animate-draw"
                  />
                  <path
                    d="M25,10 Q100,5 175,10"
                    fill="none"
                    stroke="#8B5A2B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ animationDelay: '0.4s' }}
                    className="svg-animate-draw"
                  />
                  <path
                    d="M25,70 Q100,75 175,70"
                    fill="none"
                    stroke="#8B5A2B"
                    strokeWidth="2"
                    strokeLinecap="round"
                    style={{ animationDelay: '0.6s' }}
                    className="svg-animate-draw"
                  />
                  {[0, 1, 2, 3].map((i) => (
                    <circle
                      key={`corner-${i}`}
                      cx={i < 2 ? 25 : 175}
                      cy={i % 2 === 0 ? 10 : 70}
                      r="4"
                      fill="#5B9D57"
                      stroke="#355134"
                      strokeWidth="1"
                      style={{ animationDelay: `${0.8 + i * 0.1}s` }}
                      className="animate-weave-in"
                    />
                  ))}
                  <text x="100" y="45" textAnchor="middle" className="font-kai" fill="#523419" fontSize="10">
                    四向锁边
                  </text>
                </svg>
              </div>
            </div>

            <div>
              {correctionContext ? (
                <div className="rounded-lg border border-warning/30 bg-warning/5 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-warning/20 bg-warning/10">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-warning" />
                      <span className="text-sm font-song text-warning-dark font-semibold">局部修正模式</span>
                    </div>
                    <button
                      onClick={handleExitCorrection}
                      className="p-1 rounded hover:bg-warning/20 transition-colors"
                      title="退出修正模式"
                    >
                      <X className="w-4 h-4 text-warning-dark" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-kai text-bambooBrown-600">
                        {correctionContext.currentIndex !== undefined && correctionContext.totalCount !== undefined
                          ? `第 ${correctionContext.currentIndex + 1} / ${correctionContext.totalCount} 个`
                          : '修正中'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handlePrevIssue}
                          disabled={correctionContext.currentIndex === 0}
                          className="p-1.5 rounded bg-bambooCream-200 hover:bg-bambooCream-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="上一个异常"
                        >
                          <ChevronUp className="w-4 h-4 text-bambooBrown-700" />
                        </button>
                        <button
                          onClick={handleNextIssue}
                          disabled={
                            correctionContext.currentIndex === undefined ||
                            correctionContext.totalCount === undefined ||
                            correctionContext.currentIndex >= correctionContext.totalCount - 1
                          }
                          className="p-1.5 rounded bg-bambooCream-200 hover:bg-bambooCream-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title="下一个异常"
                        >
                          <ChevronDown className="w-4 h-4 text-bambooBrown-700" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-kai text-bambooBrown-500">当前位置</label>
                        <p className="text-sm font-song text-bambooBrown-800 font-semibold mt-0.5">
                          第 {correctionContext.row + 1} 行，第 {correctionContext.col + 1} 列
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-kai text-bambooBrown-500">错误类型</label>
                        <div className="mt-0.5">
                          <span className="inline-block px-2 py-0.5 rounded bg-warning/20 text-warning-dark text-xs font-kai font-semibold">
                            {getErrorTypeLabel(correctionContext.errorType)}
                          </span>
                        </div>
                      </div>

                      {correctionContext.suggestion && (
                        <div className="p-3 rounded-lg bg-bambooGreen-50/80 border border-bambooGreen-200">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-bambooGreen-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-kai text-bambooGreen-700 font-semibold">修正建议</p>
                              <p className="text-sm font-song text-bambooBrown-700 mt-1">
                                {correctionContext.suggestion}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 space-y-2">
                        <button
                          onClick={handleApplySuggestion}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-warning text-white rounded-lg font-song text-sm hover:bg-warning-dark transition-colors shadow-md hover:shadow-lg"
                        >
                          <Wand2 className="w-4 h-4" />
                          按建议翻转
                        </button>

                        <button
                          onClick={handleExitCorrection}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-bambooCream-200 text-bambooBrown-700 rounded-lg font-song text-sm hover:bg-bambooCream-300 transition-colors border border-bamboo-300"
                        >
                          退出修正模式
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-song text-bambooBrown-700 font-semibold">异常位置汇总</span>
                    {(() => {
                      const errors = (validationResult?.errors || []).filter(e => e.row !== undefined || e.col !== undefined);
                      const warnings = (validationResult?.warnings || []).filter(w => w.row !== undefined || w.col !== undefined);
                      const total = errors.length + warnings.length;
                      if (total > 0) {
                        return (
                          <div className="flex items-center gap-1.5">
                            {errors.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-warning text-white text-xs font-kai">
                                错误 {errors.length}
                              </span>
                            )}
                            {warnings.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-bamboo-500 text-white text-xs font-kai">
                                警告 {warnings.length}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {(() => {
                    const errors = (validationResult?.errors || []).filter(e => e.row !== undefined && e.col !== undefined);
                    const warnings = (validationResult?.warnings || []).filter(w => w.row !== undefined && w.col !== undefined);
                    const allIssuesList = [...errors.map(e => ({ ...e, level: 'error' as const })), ...warnings.map(w => ({ ...w, level: 'warning' as const }))];
                    const hasIssue = allIssuesList.length > 0;

                    return (
                      <div className={`rounded-lg border overflow-hidden ${
                        hasIssue ? 'bg-warning/5 border-warning/30' : 'bg-bambooGreen-50/60 border-bambooGreen-200'
                      }`}>
                        {hasIssue ? (
                          <div>
                            <div className="flex items-start gap-2 p-3 border-b border-warning/20">
                              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-song text-warning-dark font-semibold">
                                  检测到 {allIssuesList.length} 处异常位置
                                </p>
                                <p className="text-xs font-kai text-bambooBrown-600 mt-0.5">
                                  包含散口、挑压错位、配色错位等问题，建议逐个修正
                                </p>
                              </div>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto divide-y divide-warning/10">
                              {allIssuesList.map((issue, idx) => (
                                <div key={`issue-${idx}`} className={`p-2.5 hover:bg-warning/10 transition-colors ${
                                  issue.level === 'error' ? 'bg-warning/5' : ''
                                }`}>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {(issue.row !== undefined || issue.col !== undefined) && (
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-kai ${
                                            issue.level === 'error'
                                              ? 'bg-warning/20 text-warning-dark'
                                              : 'bg-bamboo-200/60 text-bamboo-700'
                                          }`}>
                                            📍 位置: {issue.row !== undefined ? `行${issue.row + 1}` : ''}
                                            {issue.row !== undefined && issue.col !== undefined ? '，' : ''}
                                            {issue.col !== undefined ? `列${issue.col + 1}` : ''}
                                          </span>
                                        )}
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-kai ${
                                          issue.type === 'color_shift'
                                            ? 'bg-bamboo-100 text-bamboo-700'
                                            : issue.type === 'open_end'
                                            ? 'bg-warning/15 text-warning-dark'
                                            : issue.type === 'misalignment'
                                            ? 'bg-bambooBrown-100 text-bambooBrown-700'
                                            : 'bg-bambooCream-200 text-bambooBrown-700'
                                        }`}>
                                          {getErrorTypeLabel(issue.type)}
                                        </span>
                                      </div>
                                      <p className="text-xs font-song text-bambooBrown-700 mt-1">{issue.message}</p>
                                      {issue.suggestion && (
                                        <p className="text-[10px] font-kai text-bambooGreen-700 mt-1">
                                          💡 {issue.suggestion}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      <button
                                        onClick={() => handleEnterCorrection(issue, idx)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-kai bg-warning text-white rounded hover:bg-warning-dark transition-colors"
                                      >
                                        <Target className="w-3 h-3" />
                                        进入修正
                                      </button>
                                      {issue.level === 'error' && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-soft" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-bambooGreen-600" />
                            <p className="text-sm font-song text-bambooGreen-700">
                              未检测到异常位置，挑压结构良好
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
