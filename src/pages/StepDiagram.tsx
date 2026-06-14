import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeaveStore } from '@/store/weaveStore';
import { splitLayers } from '@/utils/algorithms/layerSplitter';
import StepTimeline from '@/components/StepTimeline';
import WeaveGrid from '@/components/WeaveGrid';
import type { WeaveLayer, WeaveCell } from '@/types';

type LayerStatus = 'completed' | 'current' | 'pending';

interface LayerWithStatus extends WeaveLayer {
  status: LayerStatus;
}

const MOCK_MATRIX: WeaveCell[][] = [
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
];

function buildMockLayers(): WeaveLayer[] {
  return splitLayers(MOCK_MATRIX);
}

export default function StepDiagram() {
  const { layers: storeLayers } = useWeaveStore();

  const [layers, setLayers] = useState<LayerWithStatus[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sourceLayers = storeLayers.length > 0 ? storeLayers : buildMockLayers();
    if (sourceLayers.length === 0) return;

    const layersWithStatus: LayerWithStatus[] = sourceLayers.map((layer, index) => ({
      ...layer,
      status: index === 0 ? 'current' : index === 1 ? 'pending' : 'pending',
    }));

    layersWithStatus[0].status = 'completed';
    if (layersWithStatus.length > 1) {
      layersWithStatus[1].status = 'current';
    }
    for (let i = 2; i < layersWithStatus.length; i++) {
      layersWithStatus[i].status = 'pending';
    }

    setLayers(layersWithStatus);
    setSelectedLayerId((prev) => {
      if (!prev && layersWithStatus.length > 0) {
        return layersWithStatus[1]?.id || layersWithStatus[0].id;
      }
      return prev;
    });
  }, [storeLayers]);

  const selectedLayer = useMemo(
    () => layers.find((l) => l.id === selectedLayerId) || null,
    [layers, selectedLayerId]
  );

  const currentSteps = useMemo(
    () => selectedLayer?.steps ?? [],
    [selectedLayer]
  );
  const currentStep = currentSteps[currentStepIndex] || null;

  const totalSteps = currentSteps.length;
  const progressPercent = totalSteps > 0 ? ((currentStepIndex + (isPlaying ? animationProgress : 0)) / totalSteps) * 100 : 0;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAnimationProgress((prev) => {
        const next = prev + 0.02;
        if (next >= 1) {
          setCurrentStepIndex((idx) => {
            if (idx >= totalSteps - 1) {
              setIsPlaying(false);
              return idx;
            }
            return idx + 1;
          });
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, totalSteps]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handlePrevStep = useCallback(() => {
    setIsPlaying(false);
    setAnimationProgress(0);
    setCurrentStepIndex((idx) => Math.max(0, idx - 1));
  }, []);

  const handleNextStep = useCallback(() => {
    setIsPlaying(false);
    setAnimationProgress(0);
    setCurrentStepIndex((idx) => Math.min(totalSteps - 1, idx + 1));
  }, [totalSteps]);

  const handleSelectLayer = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
    setCurrentStepIndex(0);
    setAnimationProgress(0);
    setIsPlaying(false);
  }, []);

  const toggleStepExpand = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  const timelineSteps = useMemo(() => {
    return currentSteps.map((step, idx) => ({
      id: step.id,
      title: step.instruction.length > 20 ? step.instruction.slice(0, 20) + '...' : `步骤 ${idx + 1}`,
      description: step.instruction,
      status: idx < currentStepIndex
        ? 'completed' as const
        : idx === currentStepIndex
        ? 'current' as const
        : 'pending' as const,
      tips: [
        `起篾数：${step.startCount}`,
        `收篾数：${step.endCount}`,
        idx % 2 === 0 ? '保持篾条张力均匀' : '注意挑压方向不要出错',
      ],
    }));
  }, [currentSteps, currentStepIndex]);

  const getStatusIcon = (status: LayerStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={18} className="text-bambooGreen-500" fill="currentColor" fillOpacity={0.15} />;
      case 'current':
        return <Clock size={18} className="text-bambooGreen-600 animate-pulse-soft" />;
      case 'pending':
      default:
        return <Circle size={18} className="text-bamboo-400" />;
    }
  };

  const getLineClass = (status: LayerStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-bambooGreen-400';
      case 'current':
      case 'pending':
      default:
        return 'bg-bamboo-200';
    }
  };

  const renderWeaveAnimation = () => {
    const pattern = currentStep?.pattern || (selectedLayer?.steps?.[0]?.pattern ?? [[1, 0, 1, 0], [0, 1, 0, 1]]);
    const rows = pattern.length;
    const cols = rows > 0 ? pattern[0].length : 0;
    const cellSize = 36;
    const padding = 24;
    const width = cols * cellSize + padding * 2;
    const height = rows * cellSize + padding * 2;

    const activeCells = Math.floor(rows * cols * animationProgress);

    return (
      <div className="flex flex-col items-center justify-center flex-1 w-full">
        <div className="relative rounded-2xl border border-bamboo-200 bg-bambooCream-50/80 p-6 shadow-bamboo">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="overflow-visible"
          >
            <defs>
              <linearGradient id="warpGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D2BE80" />
                <stop offset="100%" stopColor="#A88B3D" />
              </linearGradient>
              <linearGradient id="weftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7BB676" />
                <stop offset="100%" stopColor="#5B8C5A" />
              </linearGradient>
            </defs>

            {Array.from({ length: cols }).map((_, c) => (
              <rect
                key={`warp-${c}`}
                x={padding + c * cellSize + cellSize * 0.35}
                y={padding}
                width={cellSize * 0.3}
                height={rows * cellSize}
                fill="url(#warpGrad)"
                rx={2}
                opacity={0.85}
              />
            ))}

            {pattern.map((row, r) =>
              row.map((cell, c) => {
                const cellIndex = r * cols + c;
                const isActive = cellIndex < activeCells || !isPlaying;
                const isPick = cell === 1;

                return (
                  <g key={`cell-${r}-${c}`}>
                    {isPick ? (
                      <rect
                        x={padding + c * cellSize}
                        y={padding + r * cellSize + cellSize * 0.35}
                        width={cellSize}
                        height={cellSize * 0.3}
                        fill="url(#weftGrad)"
                        rx={2}
                        opacity={isActive ? 1 : 0.2}
                        style={{
                          transition: 'opacity 0.3s ease-out',
                        }}
                      />
                    ) : (
                      <rect
                        x={padding + c * cellSize}
                        y={padding + r * cellSize + cellSize * 0.35}
                        width={cellSize}
                        height={cellSize * 0.3}
                        fill="url(#weftGrad)"
                        rx={2}
                        opacity={isActive ? 0.5 : 0.1}
                        style={{
                          transition: 'opacity 0.3s ease-out',
                        }}
                      />
                    )}
                    {isActive && (
                      <text
                        x={padding + c * cellSize + cellSize / 2}
                        y={padding + r * cellSize + cellSize / 2 + 4}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight="bold"
                        fill={isPick ? '#355134' : '#523419'}
                        style={{ transition: 'opacity 0.3s ease-out' }}
                        opacity={isActive ? 1 : 0}
                      >
                        {isPick ? '挑' : '压'}
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {isPlaying && (
              <g>
                {(() => {
                  const idx = Math.min(activeCells, rows * cols - 1);
                  const r = Math.floor(idx / cols);
                  const c = idx % cols;
                  const cx = padding + c * cellSize + cellSize / 2;
                  const cy = padding + r * cellSize + cellSize / 2;
                  return (
                    <>
                      <circle cx={cx} cy={cy} r={cellSize * 0.55} fill="none" stroke="#5B9D57" strokeWidth={2} opacity={0.6}>
                        <animate attributeName="r" values={`${cellSize * 0.4};${cellSize * 0.65};${cellSize * 0.4}`} dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1s" repeatCount="indefinite" />
                      </circle>
                    </>
                  );
                })()}
              </g>
            )}
          </svg>
        </div>

        <div className="mt-6 max-w-md text-center">
          <div className="inline-block rounded-full bg-bambooGreen-100/70 px-4 py-1.5 mb-3">
            <span className="font-kai text-sm text-bambooGreen-700">
              步骤 {currentStepIndex + 1} / {totalSteps}
            </span>
          </div>
          <p className="font-song text-base text-bambooBrown-700 leading-relaxed">
            {currentStep?.instruction || '请选择左侧图层查看工序步骤'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-bamboo-50/50">
      <div className="w-72 flex-shrink-0 border-r border-bamboo-200 bg-bambooCream-50/60 backdrop-blur-sm overflow-y-auto">
        <div className="p-5 border-b border-bamboo-200 bg-gradient-to-r from-bambooCream-100/80 to-bamboo-100/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bambooGreen-500 shadow-bamboo">
              <Layers size={22} className="text-white" />
            </div>
            <div>
              <h2 className="font-song text-lg font-semibold text-bambooBrown-800">图层时间轴</h2>
              <p className="font-kai text-xs text-bambooBrown-500 mt-0.5">共 {layers.length} 个编织层</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="relative pl-1">
            {layers.map((layer, index) => {
              const isLast = index === layers.length - 1;
              const isSelected = layer.id === selectedLayerId;

              return (
                <div key={layer.id} className="relative pb-5 last:pb-0">
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute left-[11px] top-7 w-[2px]',
                        getLineClass(layer.status)
                      )}
                      style={{ height: 'calc(100% - 20px)' }}
                    />
                  )}

                  <div className="flex gap-3">
                    <div className="flex-shrink-0 pt-1">
                      {getStatusIcon(layer.status)}
                    </div>

                    <button
                      onClick={() => handleSelectLayer(layer.id)}
                      className={cn(
                        'flex-1 text-left rounded-xl border p-3.5 transition-all duration-200',
                        isSelected
                          ? 'border-bambooGreen-400 bg-bambooGreen-50/80 shadow-bamboo scale-[1.02]'
                          : layer.status === 'completed'
                          ? 'border-bamboo-200 bg-bambooCream-50/70 hover:bg-bambooCream-100/70 hover:border-bamboo-300'
                          : layer.status === 'current'
                          ? 'border-bamboo-300 bg-bamboo-100/50 hover:bg-bamboo-100/80'
                          : 'border-bamboo-100 bg-bambooCream-50/40 opacity-75 hover:opacity-100'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-kai text-xs text-bambooBrown-400">
                              第 {layer.layerIndex + 1} 层
                            </span>
                            {layer.status === 'current' && (
                              <span className="rounded-full bg-bambooGreen-100 px-2 py-0.5 font-kai text-[10px] text-bambooGreen-700">
                                进行中
                              </span>
                            )}
                            {layer.status === 'completed' && (
                              <span className="rounded-full bg-bambooGreen-50 px-2 py-0.5 font-kai text-[10px] text-bambooGreen-600">
                                已完成
                              </span>
                            )}
                          </div>
                          <h3
                            className={cn(
                              'font-song text-sm font-semibold mt-1 truncate',
                              isSelected
                                ? 'text-bambooGreen-700'
                                : layer.status === 'pending'
                                ? 'text-bambooBrown-500'
                                : 'text-bambooBrown-700'
                            )}
                          >
                            {layer.layerName}
                          </h3>
                          <p className="font-song text-xs text-bambooBrown-500 mt-1 line-clamp-2">
                            {layer.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="font-kai text-[11px] text-bambooBrown-500">
                          {layer.steps.length} 个步骤
                        </span>
                        {layer.warpSubset && (
                          <span className="font-kai text-[11px] text-bambooBrown-400">
                            经篾 {layer.warpSubset.length} 根
                          </span>
                        )}
                        {layer.weftSubset && (
                          <span className="font-kai text-[11px] text-bambooBrown-400">
                            纬篾 {layer.weftSubset.length} 根
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-bamboo-200 bg-bambooCream-50/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-song text-xl font-bold text-bambooBrown-800">
                {selectedLayer?.layerName || '工序动画演示'}
              </h1>
              <p className="font-kai text-sm text-bambooBrown-500 mt-1">
                {selectedLayer?.description || '选择左侧图层查看编织动画'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto bg-woven-pattern bg-woven-sm">
          {renderWeaveAnimation()}
        </div>

        <div className="border-t border-bamboo-200 bg-bambooCream-50/90 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-4 max-w-2xl mx-auto">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                currentStepIndex === 0
                  ? 'bg-bamboo-100 text-bamboo-300 cursor-not-allowed'
                  : 'bg-bamboo-200 text-bambooBrown-700 hover:bg-bamboo-300 hover:shadow-md'
              )}
            >
              <SkipBack size={18} />
            </button>

            <button
              onClick={handlePlayPause}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full shadow-bamboo transition-all hover:shadow-bamboo-hover hover:scale-105',
                isPlaying
                  ? 'bg-bambooBrown-500 text-white'
                  : 'bg-bambooGreen-500 text-white'
              )}
            >
              {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
            </button>

            <button
              onClick={handleNextStep}
              disabled={currentStepIndex >= totalSteps - 1}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-all',
                currentStepIndex >= totalSteps - 1
                  ? 'bg-bamboo-100 text-bamboo-300 cursor-not-allowed'
                  : 'bg-bamboo-200 text-bambooBrown-700 hover:bg-bamboo-300 hover:shadow-md'
              )}
            >
              <SkipForward size={18} />
            </button>

            <div className="flex-1 ml-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-kai text-xs text-bambooBrown-500">
                  进度
                </span>
                <span className="font-kai text-xs font-semibold text-bambooGreen-600">
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-bamboo-200/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-bambooGreen-400 to-bambooGreen-600 transition-all duration-150 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-96 flex-shrink-0 border-l border-bamboo-200 bg-bambooCream-50/60 backdrop-blur-sm overflow-y-auto">
        <div className="p-5 border-b border-bamboo-200 bg-gradient-to-l from-bambooCream-100/80 to-bamboo-100/60">
          <h2 className="font-song text-lg font-semibold text-bambooBrown-800">工序详情</h2>
          <p className="font-kai text-xs text-bambooBrown-500 mt-0.5">
            {selectedLayer ? `${currentSteps.length} 个编织步骤` : '请选择图层'}
          </p>
        </div>

        {selectedLayer && currentSteps.length > 0 ? (
          <div className="p-4">
            <StepTimeline steps={timelineSteps} className="mb-6" />

            <div className="space-y-4">
              <h3 className="font-song text-base font-semibold text-bambooBrown-700 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-bambooGreen-500" />
                当前步骤详情
              </h3>

              <div className="rounded-xl border border-bamboo-200 bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-kai text-xs text-bambooBrown-400 mb-1">
                      步骤 {currentStepIndex + 1}
                    </div>
                    <h4 className="font-song text-sm font-semibold text-bambooBrown-800">
                      {currentStep?.instruction.slice(0, 30)}
                      {currentStep && currentStep.instruction.length > 30 ? '...' : ''}
                    </h4>
                  </div>
                  <button
                    onClick={() => currentStep && toggleStepExpand(currentStep.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-bamboo-100 text-bambooBrown-600 hover:bg-bamboo-200 transition-colors"
                  >
                    {expandedSteps.has(currentStep?.id || '') ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-lg bg-bambooCream-100/70 p-3">
                    <div className="font-kai text-[11px] text-bambooBrown-400 mb-1">起篾数</div>
                    <div className="font-song text-xl font-bold text-bambooGreen-600">
                      {currentStep?.startCount ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg bg-bambooCream-100/70 p-3">
                    <div className="font-kai text-[11px] text-bambooBrown-400 mb-1">收篾数</div>
                    <div className="font-song text-xl font-bold text-bambooBrown-600">
                      {currentStep?.endCount ?? 0}
                    </div>
                  </div>
                </div>

                <p className="font-song text-sm text-bambooBrown-600 leading-relaxed mb-3">
                  {currentStep?.instruction}
                </p>

                {expandedSteps.has(currentStep?.id || '') && currentStep?.pattern && (
                  <div className="mt-4 pt-4 border-t border-bamboo-100">
                    <div className="mb-3">
                      <h5 className="font-kai text-xs font-semibold text-bambooBrown-600 mb-2">
                        挑压小图预览
                      </h5>
                      <div className="flex justify-center">
                        <WeaveGrid
                          weaveMatrix={currentStep.pattern}
                          cellSize={28}
                          readOnly
                        />
                      </div>
                    </div>

                    <div>
                      <h5 className="font-kai text-xs font-semibold text-bambooBrown-600 mb-2">
                        分层拆解说明
                      </h5>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 rounded-lg bg-bambooGreen-50/60 p-2.5">
                          <div className="h-2 w-2 mt-1.5 rounded-full bg-bambooGreen-500 flex-shrink-0" />
                          <p className="font-song text-xs text-bambooBrown-700">
                            经篾层：{selectedLayer.warpSubset?.length || currentStep.pattern[0]?.length || 0} 根经篾已固定，作为编织基底
                          </p>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg bg-bamboo-100/60 p-2.5">
                          <div className="h-2 w-2 mt-1.5 rounded-full bg-bamboo-500 flex-shrink-0" />
                          <p className="font-song text-xs text-bambooBrown-700">
                            纬篾层：第 {currentStep.startCount} - {currentStep.endCount} 根纬篾按挑压规律穿引
                          </p>
                        </div>
                        <div className="flex items-start gap-2 rounded-lg bg-bambooBrown-100/50 p-2.5">
                          <div className="h-2 w-2 mt-1.5 rounded-full bg-bambooBrown-500 flex-shrink-0" />
                          <p className="font-song text-xs text-bambooBrown-700">
                            完成此步骤后，将形成 {currentStep.pattern.length} 行 × {currentStep.pattern[0]?.length || 0} 列的编织结构
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-bambooGreen-200 bg-bambooGreen-50/60 p-4">
                <h4 className="font-kai text-sm font-semibold text-bambooGreen-700 mb-2">
                  工艺要点
                </h4>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 font-song text-xs text-bambooBrown-700">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-bambooGreen-500 flex-shrink-0" />
                    保持篾条张力均匀，避免过紧或过松
                  </li>
                  <li className="flex items-start gap-2 font-song text-xs text-bambooBrown-700">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-bambooGreen-500 flex-shrink-0" />
                    每根纬篾穿引后需用工具压实
                  </li>
                  <li className="flex items-start gap-2 font-song text-xs text-bambooBrown-700">
                    <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-bambooGreen-500 flex-shrink-0" />
                    注意挑压方向，挑为经篾在上，压为纬篾在上
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 px-6">
            <Layers size={48} className="text-bamboo-300 mb-4" />
            <p className="font-song text-sm text-bambooBrown-500 text-center">
              请从左侧选择一个图层
              <br />
              查看详细工序信息
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
