import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Star,
  Package,
  ListChecks,
  AlertCircle,
  ChevronRight,
  Ruler,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeaveStore } from '@/store/weaveStore';
import { splitLayers } from '@/utils/algorithms/layerSplitter';
import WeaveGrid from '@/components/WeaveGrid';
import type { WeaveLayer, WeaveCell, WeaveStepDetail, MaterialItem } from '@/types';

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

function buildMockStepDetails(): WeaveStepDetail[] {
  const mockSteps: WeaveStepDetail[] = [];
  const steps = [
    { name: '起篾准备', desc: '准备并排布经篾，建立编织骨架', rows: 0, difficulty: 2, minutes: 15 },
    { name: '固定经篾', desc: '固定经篾两端，保持张力均匀', rows: 0, difficulty: 1, minutes: 10 },
    { name: '第1-2行编织', desc: '按挑压规律编织第1至2行纬篾', rows: 2, difficulty: 2, minutes: 8 },
    { name: '第3-4行编织', desc: '按挑压规律编织第3至4行纬篾', rows: 2, difficulty: 3, minutes: 10 },
    { name: '第5-6行编织', desc: '按挑压规律编织第5至6行纬篾', rows: 2, difficulty: 3, minutes: 10 },
    { name: '第7-8行编织', desc: '按挑压规律编织第7至8行纬篾', rows: 2, difficulty: 2, minutes: 8 },
    { name: '检查收边', desc: '检查所有纬篾挑压是否正确', rows: 0, difficulty: 2, minutes: 5 },
    { name: '修剪收边', desc: '修剪多余篾条，进行收边处理', rows: 0, difficulty: 3, minutes: 12 },
  ];

  steps.forEach((step, idx) => {
    const matrixSlice = step.rows > 0 ? MOCK_MATRIX.slice(Math.max(0, idx * 2 - 2), Math.max(0, idx * 2 - 2) + step.rows) : undefined;
    mockSteps.push({
      id: `mock-step-${idx}`,
      stepIndex: idx,
      instruction: step.desc,
      startCount: idx * 2,
      endCount: idx * 2 + step.rows,
      matrixSlice,
      requiredMaterials: [
        {
          id: `mat-${idx}-1`,
          spec: idx < 2 ? '经篾-主骨架' : '纬篾-基础',
          color: idx < 2 ? '本色' : idx % 2 === 0 ? '竹青' : '本色',
          widthMm: 5,
          lengthMm: 330,
          count: step.rows > 0 ? step.rows : 4,
          processIndex: idx < 2 ? 0 : 1,
        },
        ...(idx >= 6 ? [{
          id: `mat-${idx}-2`,
          spec: '收边篾',
          color: '碳化',
          widthMm: 6,
          lengthMm: 360,
          count: 2,
          processIndex: 2,
        }] : []),
      ],
      tips: [
        '保持篾条张力均匀，避免过紧或过松',
        '每根纬篾穿引后需用工具压实',
        '注意挑压方向，挑为经篾在上，压为纬篾在上',
        '每完成3-5根检查一次平整度',
      ],
      estimatedMinutes: step.minutes,
      difficulty: step.difficulty as 1 | 2 | 3 | 4 | 5,
    });
  });

  return mockSteps;
}

function DifficultyStars({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={cn(
            i < difficulty
              ? 'text-amber-400 fill-amber-400'
              : 'text-bamboo-300'
          )}
        />
      ))}
    </div>
  );
}

function MaterialItemCard({ item }: { item: MaterialItem }) {
  const colorMap: Record<string, string> = {
    '本色': 'bg-bamboo-300',
    '碳化': 'bg-bambooBrown-500',
    '竹青': 'bg-bambooGreen-400',
    '染色黄': 'bg-yellow-400',
    '染色红': 'bg-red-400',
    '染色蓝': 'bg-blue-400',
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-bambooCream-50/80 p-2 border border-bamboo-100">
      <div className={cn(
        'w-3 h-8 rounded-sm flex-shrink-0',
        colorMap[item.color] || 'bg-bamboo-300'
      )} />
      <div className="flex-1 min-w-0">
        <div className="font-kai text-xs font-medium text-bambooBrown-700 truncate">
          {item.spec}
        </div>
        <div className="flex items-center gap-2 font-kai text-[10px] text-bambooBrown-500">
          <span className="flex items-center gap-0.5">
            <Ruler size={10} />
            {item.lengthMm}mm
          </span>
          <span className="flex items-center gap-0.5">
            <Palette size={10} />
            {item.color}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="font-song text-sm font-bold text-bambooGreen-600">
          {item.count}
        </div>
        <div className="font-kai text-[10px] text-bambooBrown-400">
          根
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
  isActive,
  isCompleted,
  onClick,
}: {
  step: WeaveStepDetail;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-xl border p-4 cursor-pointer transition-all duration-300',
        'hover:shadow-bamboo-hover hover:-translate-y-0.5',
        isActive
          ? 'border-bambooGreen-400 bg-bambooGreen-50/80 shadow-bamboo scale-[1.02] ring-2 ring-bambooGreen-300/50'
          : isCompleted
          ? 'border-bamboo-200 bg-bambooCream-50/70 hover:border-bamboo-300'
          : 'border-bamboo-100 bg-bambooCream-50/40 opacity-75 hover:opacity-100'
      )}
    >
      {isActive && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-8 w-1 bg-bambooGreen-500 rounded-full animate-pulse-soft" />
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold font-song',
            isActive
              ? 'bg-bambooGreen-500 text-white'
              : isCompleted
              ? 'bg-bambooGreen-100 text-bambooGreen-600'
              : 'bg-bamboo-200 text-bambooBrown-500'
          )}>
            {isCompleted ? <CheckCircle2 size={16} /> : index + 1}
          </div>
          <div>
            <h4 className={cn(
              'font-song text-sm font-semibold',
              isActive ? 'text-bambooGreen-700' : 'text-bambooBrown-700'
            )}>
              步骤 {index + 1}
            </h4>
          </div>
        </div>
        <ChevronRight
          size={16}
          className={cn(
            'mt-1 flex-shrink-0 transition-colors',
            isActive ? 'text-bambooGreen-500' : 'text-bamboo-300'
          )}
        />
      </div>

      <p className={cn(
        'font-song text-sm leading-relaxed mb-3',
        isActive ? 'text-bambooBrown-700' : 'text-bambooBrown-600'
      )}>
        {step.instruction}
      </p>

      {step.matrixSlice && step.matrixSlice.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="h-3 w-1 rounded-full bg-bambooGreen-400" />
            <span className="font-kai text-[11px] font-medium text-bambooBrown-600">
              矩阵预览（第{step.startCount + 1}-{step.endCount}行）
            </span>
          </div>
          <div className="flex justify-center">
            <WeaveGrid
              weaveMatrix={step.matrixSlice}
              cellSize={20}
              readOnly
              className="!p-1.5"
            />
          </div>
        </div>
      )}

      {step.requiredMaterials && step.requiredMaterials.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Package size={12} className="text-bambooGreen-500" />
            <span className="font-kai text-[11px] font-medium text-bambooBrown-600">
              用料信息
            </span>
          </div>
          <div className="space-y-1.5">
            {step.requiredMaterials.map((mat) => (
              <MaterialItemCard key={mat.id} item={mat} />
            ))}
          </div>
        </div>
      )}

      {step.tips && step.tips.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ListChecks size={12} className="text-bambooGreen-500" />
            <span className="font-kai text-[11px] font-medium text-bambooBrown-600">
              操作要点
            </span>
          </div>
          <ul className="space-y-1">
            {step.tips.slice(0, 4).map((tip, tipIdx) => (
              <li key={tipIdx} className="flex items-start gap-1.5 font-song text-[11px] text-bambooBrown-600">
                <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-bambooGreen-400 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-bamboo-100">
        <div className="flex items-center gap-1.5">
          <Clock size={12} className="text-bambooBrown-400" />
          <span className="font-kai text-[11px] text-bambooBrown-500">
            {step.estimatedMinutes || 10} 分钟
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle size={12} className="text-bambooBrown-400" />
          <DifficultyStars difficulty={step.difficulty || 2} />
        </div>
      </div>
    </div>
  );
}

interface MaterialSummaryItem {
  spec: string;
  color: string;
  widthMm: number;
  lengthMm: number;
  totalCount: number;
  cumulativeCount: number;
  stepCounts: number[];
}

function MaterialSummary({ stepDetails, currentStepIndex }: {
  stepDetails: WeaveStepDetail[];
  currentStepIndex: number;
}) {
  const materialSummary = useMemo(() => {
    const summary = new Map<string, MaterialSummaryItem>();

    stepDetails.forEach((step, stepIdx) => {
      step.requiredMaterials?.forEach((mat) => {
        const key = `${mat.spec}-${mat.color}-${mat.widthMm}-${mat.lengthMm}`;
        if (!summary.has(key)) {
          summary.set(key, {
            spec: mat.spec,
            color: mat.color,
            widthMm: mat.widthMm,
            lengthMm: mat.lengthMm,
            totalCount: 0,
            cumulativeCount: 0,
            stepCounts: new Array(stepDetails.length).fill(0),
          });
        }
        const entry = summary.get(key)!;
        entry.totalCount += mat.count;
        if (stepIdx <= currentStepIndex) {
          entry.cumulativeCount += mat.count;
        }
        entry.stepCounts[stepIdx] = mat.count;
      });
    });

    return Array.from(summary.values());
  }, [stepDetails, currentStepIndex]);

  const totalTime = useMemo(() => {
    return stepDetails.reduce((sum, step) => sum + (step.estimatedMinutes || 10), 0);
  }, [stepDetails]);

  const completedTime = useMemo(() => {
    return stepDetails
      .slice(0, currentStepIndex + 1)
      .reduce((sum, step) => sum + (step.estimatedMinutes || 10), 0);
  }, [stepDetails, currentStepIndex]);

  return (
    <div className="rounded-xl border border-bamboo-200 bg-bambooCream-50/80 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-song text-sm font-semibold text-bambooBrown-700 flex items-center gap-2">
          <Package size={16} className="text-bambooGreen-500" />
          按步骤备料汇总
        </h3>
        <div className="flex items-center gap-1 font-kai text-[11px] text-bambooBrown-500">
          <Clock size={12} />
          <span>已用 {completedTime} / 共 {totalTime} 分钟</span>
        </div>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {materialSummary.map((mat, idx) => {
          const progress = mat.totalCount > 0 ? (mat.cumulativeCount / mat.totalCount) * 100 : 0;
          return (
            <div key={idx} className="rounded-lg bg-white/60 p-2.5 border border-bamboo-100">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-2 h-6 rounded-sm',
                    mat.color === '本色' ? 'bg-bamboo-300' :
                    mat.color === '碳化' ? 'bg-bambooBrown-500' :
                    mat.color === '竹青' ? 'bg-bambooGreen-400' : 'bg-bamboo-300'
                  )} />
                  <div>
                    <div className="font-kai text-xs font-medium text-bambooBrown-700">
                      {mat.spec}
                    </div>
                    <div className="font-kai text-[10px] text-bambooBrown-500">
                      {mat.color} · {mat.widthMm}mm · {mat.lengthMm}mm
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-song text-sm font-bold text-bambooGreen-600">
                    {mat.cumulativeCount} / {mat.totalCount}
                  </div>
                  <div className="font-kai text-[10px] text-bambooBrown-400">
                    根
                  </div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-bamboo-200/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-bambooGreen-400 to-bambooGreen-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-bamboo-200">
        <div className="flex items-center justify-between">
          <span className="font-kai text-xs text-bambooBrown-500">
            累计完成进度
          </span>
          <span className="font-song text-sm font-bold text-bambooGreen-600">
            {Math.round(((currentStepIndex + 1) / stepDetails.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StepDiagram() {
  const { layers: storeLayers, stepDetails, generateStepDetails, weaveMatrix } = useWeaveStore();

  const [layers, setLayers] = useState<LayerWithStatus[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const stepCardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const displaySteps = useMemo(() => {
    if (stepDetails && stepDetails.length > 0) {
      return stepDetails;
    }
    return buildMockStepDetails();
  }, [stepDetails]);

  useEffect(() => {
    if (weaveMatrix) {
      generateStepDetails();
    }
  }, [weaveMatrix, generateStepDetails]);

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

  const totalSteps = displaySteps.length;
  const progressPercent = totalSteps > 0 ? ((currentStepIndex + (isPlaying ? animationProgress : 0)) / totalSteps) * 100 : 0;

  const currentStep = displaySteps[currentStepIndex] || null;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setAnimationProgress((prev) => {
        const next = prev + 0.015;
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

  useEffect(() => {
    const cardEl = stepCardRefs.current.get(currentStepIndex);
    if (cardEl && rightPanelRef.current) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStepIndex]);

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

  const handleStepCardClick = useCallback((index: number) => {
    setIsPlaying(false);
    setAnimationProgress(0);
    setCurrentStepIndex(index);
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
    const pattern = currentStep?.matrixSlice || (currentStep as any)?.pattern || MOCK_MATRIX.slice(0, 4);
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

                      {isSelected && layer.steps.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-bamboo-200/60">
                          <div className="space-y-1.5">
                            {layer.steps.slice(0, 3).map((step, stepIdx) => (
                              <div
                                key={step.id}
                                className="flex items-center gap-2 text-[11px] font-kai text-bambooBrown-600"
                              >
                                <span className="w-4 h-4 flex items-center justify-center rounded-full bg-bamboo-200/60 text-bambooBrown-600 text-[9px]">
                                  {stepIdx + 1}
                                </span>
                                <span className="truncate">
                                  {step.instruction.length > 15
                                    ? step.instruction.slice(0, 15) + '...'
                                    : step.instruction}
                                </span>
                              </div>
                            ))}
                            {layer.steps.length > 3 && (
                              <div className="text-[10px] font-kai text-bambooBrown-400 pl-6">
                                还有 {layer.steps.length - 3} 个步骤...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-kai text-xs text-bambooBrown-500">当前步骤</div>
                <div className="font-song text-lg font-bold text-bambooGreen-600">
                  {currentStepIndex + 1} / {totalSteps}
                </div>
              </div>
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

        <div className="border-t border-bamboo-200 bg-bambooCream-50/80 px-6 py-3">
          <MaterialSummary
            stepDetails={displaySteps}
            currentStepIndex={currentStepIndex}
          />
        </div>
      </div>

      <div
        ref={rightPanelRef}
        className="w-96 flex-shrink-0 border-l border-bamboo-200 bg-bambooCream-50/60 backdrop-blur-sm overflow-y-auto"
      >
        <div className="p-5 border-b border-bamboo-200 bg-gradient-to-l from-bambooCream-100/80 to-bamboo-100/60 sticky top-0 z-10">
          <h2 className="font-song text-lg font-semibold text-bambooBrown-800">工序卡片</h2>
          <p className="font-kai text-xs text-bambooBrown-500 mt-0.5">
            共 {displaySteps.length} 个编织步骤
          </p>
        </div>

        <div className="p-4 space-y-4">
          {displaySteps.map((step, index) => (
            <div
              key={step.id}
              ref={(el) => {
                if (el) {
                  stepCardRefs.current.set(index, el);
                }
              }}
            >
              <StepCard
                step={step}
                index={index}
                isActive={index === currentStepIndex}
                isCompleted={index < currentStepIndex}
                onClick={() => handleStepCardClick(index)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
