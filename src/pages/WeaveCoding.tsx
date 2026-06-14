import { useEffect, useMemo } from 'react';
import { Binary, AlertTriangle, CheckCircle2, Ruler, Eye, Lock } from 'lucide-react';
import { useWeaveStore } from '@/store/weaveStore';
import { calcDensity, calcPorosity, calcLightTransmission } from '@/utils/algorithms/calculator';
import { validateClosure } from '@/utils/algorithms/validator';
import WeaveGrid from '@/components/WeaveGrid';
import GaugeMeter from '@/components/GaugeMeter';
import type { WeaveCell, WeaveMatrix, ValidationError, ValidationWarning } from '@/types';

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
    setWeaveMatrix,
    setParams,
    updateCell,
    runValidation,
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
  };

  const handleParamChange = (key: keyof typeof weaveParams, value: string) => {
    const num = parseFloat(value) || 0;
    setParams({ [key]: num });
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-song text-bambooBrown-700 font-semibold">配色错位预警</span>
                {(() => {
                  const colorErrors = (validationResult?.errors || []).filter(e => e.type === 'color_shift');
                  const colorWarnings = (validationResult?.warnings || []).filter(w => w.type === 'color_shift');
                  const total = colorErrors.length + colorWarnings.length;
                  return total > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-warning text-white text-xs font-kai">
                      {total} 处异常
                    </span>
                  ) : null;
                })()}
              </div>
              {(() => {
                const colorErrors = (validationResult?.errors || []).filter(e => e.type === 'color_shift');
                const colorWarnings = (validationResult?.warnings || []).filter(w => w.type === 'color_shift');
                const allColorIssues = [...colorErrors, ...colorWarnings];
                const hasIssue = allColorIssues.length > 0;

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
                              检测到 {allColorIssues.length} 处配色错位
                            </p>
                            <p className="text-xs font-kai text-bambooBrown-600 mt-0.5">
                              相同挑压状态的相邻区域配色不一致，可能导致露色错位
                            </p>
                          </div>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto divide-y divide-warning/10">
                          {allColorIssues.map((issue, idx) => (
                            <div key={`color-${idx}`} className="p-2.5 hover:bg-warning/10 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {(issue.row !== undefined || issue.col !== undefined) && (
                                      <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning-dark text-[10px] font-bold font-kai">
                                        位置: {issue.row !== undefined ? `行${issue.row + 1}` : ''}
                                        {issue.row !== undefined && issue.col !== undefined ? '，' : ''}
                                        {issue.col !== undefined ? `列${issue.col + 1}` : ''}
                                      </span>
                                    )}
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bambooBrown-100 text-bambooBrown-700 font-kai">
                                      {issue.type === 'color_shift' ? '配色不一致' : issue.type}
                                    </span>
                                  </div>
                                  <p className="text-xs font-song text-bambooBrown-700 mt-1">{issue.message}</p>
                                  {issue.suggestion && (
                                    <p className="text-[10px] font-kai text-bambooGreen-700 mt-0.5">
                                      💡 {issue.suggestion}
                                    </p>
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
                          配色一致性良好，未检测到错位
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
