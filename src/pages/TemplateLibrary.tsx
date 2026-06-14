import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Library,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Upload,
  Eye,
  Download,
  Trash2,
  Star,
  X,
  FileText,
  Layers,
  Package,
  Edit2,
  GitCompare,
  ArrowLeftRight,
  Check,
  Minus,
  TrendingDown,
} from 'lucide-react';
import { useWeaveStore } from '@/store/weaveStore';
import WeaveGrid from '@/components/WeaveGrid';
import { cn } from '@/lib/utils';
import type { PatternTemplate, PatternType, WeaveCell, WeaveMatrix } from '@/types';

type ViewMode = 'grid' | 'list';

const PATTERN_TYPE_LABELS: Record<PatternType, string> = {
  hexagon: '六角孔',
  cross: '十字孔',
  herringbone: '人字编',
  plain: '平编',
  custom: '自定义',
};

const PATTERN_TYPE_COLORS: Record<PatternType, string> = {
  hexagon: 'bg-bambooGreen-100 text-bambooGreen-700 border-bambooGreen-200',
  cross: 'bg-bamboo-100 text-bamboo-700 border-bamboo-300',
  herringbone: 'bg-bambooBrown-100 text-bambooBrown-700 border-bambooBrown-200',
  plain: 'bg-bambooCream-200 text-bambooBrown-600 border-bamboo-300',
  custom: 'bg-bambooCream-300 text-bambooBrown-700 border-bamboo-400',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function createMatrix(rows: number, cols: number, pattern: PatternType): WeaveMatrix {
  const warpCodes: WeaveCell[][] = [];
  const weftCodes: WeaveCell[][] = [];

  for (let r = 0; r < rows; r++) {
    const warpRow: WeaveCell[] = [];
    const weftRow: WeaveCell[] = [];
    for (let c = 0; c < cols; c++) {
      let val: WeaveCell = 0;
      switch (pattern) {
        case 'plain':
          val = ((r + c) % 2) as WeaveCell;
          break;
        case 'hexagon':
          val = (((r * 2 + c) % 3) === 0 ? 1 : 0) as WeaveCell;
          break;
        case 'cross':
          val = ((r % 2 === 0 || c % 2 === 0) ? 1 : 0) as WeaveCell;
          break;
        case 'herringbone':
          val = (((r + Math.floor(c / 2)) % 2) as WeaveCell);
          break;
        case 'custom':
        default:
          val = ((r * c) % 2) as WeaveCell;
          break;
      }
      warpRow.push(val);
      weftRow.push((val === 1 ? 0 : 1) as WeaveCell);
    }
    warpCodes.push(warpRow);
    weftCodes.push(weftRow);
  }

  return {
    rows,
    cols,
    cellSize: 16,
    warpCodes,
    weftCodes,
    detectedPatterns: [
      {
        type: pattern,
        startRow: 0,
        startCol: 0,
        width: cols,
        height: rows,
      },
    ],
  };
}

function generateThumbnailSvg(pattern: PatternType, size: number = 120): string {
  const cellSize = Math.floor(size / 8);
  const gridSize = 8;
  let rects = '';

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      let isPick = false;
      switch (pattern) {
        case 'plain':
          isPick = (r + c) % 2 === 0;
          break;
        case 'hexagon':
          isPick = (r * 2 + c) % 3 === 0;
          break;
        case 'cross':
          isPick = r % 2 === 0 || c % 2 === 0;
          break;
        case 'herringbone':
          isPick = (r + Math.floor(c / 2)) % 2 === 0;
          break;
        case 'custom':
        default:
          isPick = (r * c) % 2 === 0;
          break;
      }
      const x = c * cellSize;
      const y = r * cellSize;
      const fill = isPick ? '#5B9D57' : '#D2BE80';
      const stroke = isPick ? '#476E46' : '#A88B3D';
      rects += `<rect x="${x}" y="${y}" width="${cellSize - 1}" height="${cellSize - 1}" rx="1" fill="${fill}" stroke="${stroke}" stroke-opacity="0.3"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#F8F3E3" rx="4"/>${rects}</svg>`;
}

function createMockTemplates(): PatternTemplate[] {
  const mockData: Array<{
    name: string;
    patternType: PatternType;
    difficulty: 1 | 2 | 3 | 4 | 5;
    description: string;
    tags: string[];
    rows: number;
    cols: number;
  }> = [
    {
      name: '经典六角孔',
      patternType: 'hexagon',
      difficulty: 3,
      description: '传统六角孔编织纹样，结构稳定，透气性好，常用于竹篮、筐篓等日常器具。',
      tags: ['传统', '透气', '基础'],
      rows: 12,
      cols: 12,
    },
    {
      name: '十字孔花编',
      patternType: 'cross',
      difficulty: 2,
      description: '十字形孔洞编织，结构简洁，视觉效果分明，适合入门练习。',
      tags: ['入门', '简洁', '装饰'],
      rows: 10,
      cols: 10,
    },
    {
      name: '人字编纹样',
      patternType: 'herringbone',
      difficulty: 4,
      description: '人字形交错编织，纹理流畅如行云流水，常用于高级竹编工艺品。',
      tags: ['工艺', '纹理', '高级'],
      rows: 16,
      cols: 12,
    },
    {
      name: '平编基础款',
      patternType: 'plain',
      difficulty: 1,
      description: '最基础的一挑一压平编技法，是所有竹编的入门基础。',
      tags: ['入门', '基础', '教学'],
      rows: 8,
      cols: 8,
    },
    {
      name: '六角孔变体',
      patternType: 'hexagon',
      difficulty: 4,
      description: '在传统六角孔基础上加入变化元素，形成更富层次感的编织纹样。',
      tags: ['变体', '层次', '创意'],
      rows: 14,
      cols: 14,
    },
    {
      name: '自定义组合纹',
      patternType: 'custom',
      difficulty: 5,
      description: '融合多种编法的自定义组合纹样，考验编织技巧与创意设计。',
      tags: ['创意', '组合', '大师级'],
      rows: 16,
      cols: 16,
    },
  ];

  return mockData.map((item, idx) => {
    const weaveMatrix = createMatrix(item.rows, item.cols, item.patternType);
    return {
      id: generateId() + idx,
      name: item.name,
      patternType: item.patternType,
      difficulty: item.difficulty,
      thumbnail: generateThumbnailSvg(item.patternType, 120),
      tags: item.tags,
      description: item.description,
      weaveMatrix,
      layers: [
        {
          id: generateId(),
          layerIndex: 0,
          layerName: '起篾层',
          description: '基础经篾排布',
          steps: [
            {
              id: generateId(),
              stepIndex: 0,
              instruction: `准备 ${item.cols} 根经篾，平行排列`,
              startCount: 0,
              endCount: item.cols,
            },
            {
              id: generateId(),
              stepIndex: 1,
              instruction: '固定两端，保持张力均匀',
              startCount: 0,
              endCount: item.cols,
            },
          ],
        },
        {
          id: generateId(),
          layerIndex: 1,
          layerName: `主纹层-${PATTERN_TYPE_LABELS[item.patternType]}`,
          description: `${PATTERN_TYPE_LABELS[item.patternType]}纹样编织`,
          steps: [
            {
              id: generateId(),
              stepIndex: 0,
              instruction: `按${PATTERN_TYPE_LABELS[item.patternType]}编法挑压编织`,
              startCount: 0,
              endCount: item.rows,
            },
          ],
        },
        {
          id: generateId(),
          layerIndex: 2,
          layerName: '收篾层',
          description: '收边处理',
          steps: [
            {
              id: generateId(),
              stepIndex: 0,
              instruction: '检查挑压正确性',
              startCount: 0,
              endCount: item.rows,
            },
            {
              id: generateId(),
              stepIndex: 1,
              instruction: '修剪多余篾条，收边处理',
              startCount: 0,
              endCount: item.rows,
            },
          ],
        },
      ],
      materials: [
        {
          id: generateId(),
          spec: '经篾',
          color: '本色',
          widthMm: 5,
          lengthMm: 330,
          count: item.cols,
          processIndex: 0,
        },
        {
          id: generateId(),
          spec: '纬篾',
          color: '本色',
          widthMm: 5,
          lengthMm: 330,
          count: item.rows,
          processIndex: 1,
        },
      ],
      params: {
        bambooWidth: 5,
        bambooGap: 1,
        finishedWidth: 300,
        finishedHeight: 300,
        lossRate: 1.1,
      },
      createdAt: Date.now() - idx * 86400000,
      updatedAt: Date.now() - idx * 86400000,
    };
  });
}

function DifficultyStars({ difficulty, size = 14 }: { difficulty: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= difficulty
              ? 'fill-bamboo-500 text-bamboo-500'
              : 'fill-transparent text-bamboo-300'
          )}
        />
      ))}
    </div>
  );
}

function CompareWeaveGrid({
  weaveMatrix,
  diffCells,
  cellSize = 12,
}: {
  weaveMatrix: WeaveCell[][];
  diffCells: { row: number; col: number }[];
  cellSize?: number;
}) {
  const rows = weaveMatrix.length;
  const cols = rows > 0 ? weaveMatrix[0].length : 0;
  const diffSet = useMemo(() => {
    return new Set(diffCells.map(d => `${d.row}-${d.col}`));
  }, [diffCells]);

  if (rows === 0 || cols === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-bambooBrown-500 text-sm">
        暂无数据
      </div>
    );
  }

  return (
    <div className="inline-block rounded-lg border border-bamboo-200 bg-bambooCream-100/40 p-1.5">
      <div
        className="grid gap-[1px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        }}
      >
        {weaveMatrix.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isPick = cell === 1;
            const isDiff = diffSet.has(`${rowIndex}-${colIndex}`);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  "flex items-center justify-center rounded-sm transition-all",
                  isPick
                    ? "bg-bambooGreen-400/70 border border-bambooGreen-600/40"
                    : "bg-bamboo-300/60 border border-bamboo-500/40",
                  isDiff && "ring-2 ring-warning ring-offset-0"
                )}
                style={{ width: cellSize, height: cellSize }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function MaterialStatCard({
  label,
  value,
  unit,
  compareValue,
  lowerIsBetter = true,
}: {
  label: string;
  value: number;
  unit: string;
  compareValue: number;
  lowerIsBetter?: boolean;
}) {
  const isBetter = lowerIsBetter ? value < compareValue : value > compareValue;
  const isEqual = value === compareValue;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        isBetter && !isEqual
          ? 'bg-bambooGreen-50 border-bambooGreen-200'
          : 'bg-bambooCream-50 border-bamboo-100'
      )}
    >
      <div className="text-xs text-bambooBrown-500 font-song mb-1">{label}</div>
      <div className="flex items-center gap-1">
        {isBetter && !isEqual && (
          <TrendingDown className="w-3.5 h-3.5 text-bambooGreen-500" />
        )}
        {isEqual && (
          <Minus className="w-3.5 h-3.5 text-bamboo-400" />
        )}
        <span
          className={cn(
            'text-lg font-bold font-song',
            isBetter && !isEqual
              ? 'text-bambooGreen-600'
              : 'text-bambooBrown-700'
          )}
        >
          {value}
        </span>
        <span className="text-xs text-bambooBrown-400">{unit}</span>
      </div>
      {isBetter && !isEqual && (
        <div className="text-[10px] text-bambooGreen-600 mt-1 font-song">
          更省料
        </div>
      )}
    </div>
  );
}

function ValidationCompareCard({
  template,
  otherTemplate,
}: {
  template: PatternTemplate;
  otherTemplate: PatternTemplate;
}) {
  const errorsA = template.weaveMatrix.rows * 0.3;
  const warningsA = template.weaveMatrix.rows * 0.5;
  const risksA = Math.floor(errorsA + warningsA * 0.5);

  const errorsB = otherTemplate.weaveMatrix.rows * 0.3;
  const warningsB = otherTemplate.weaveMatrix.rows * 0.5;
  const risksB = Math.floor(errorsB + warningsB * 0.5);

  const errors = Math.floor(errorsA);
  const warnings = Math.floor(warningsA);
  const risks = risksA;

  const otherErrors = Math.floor(errorsB);
  const otherWarnings = Math.floor(warningsB);
  const otherRisks = risksB;

  const totalRisk = errors + warnings + risks;
  const otherTotalRisk = otherErrors + otherWarnings + otherRisks;

  const isLowerRisk = totalRisk < otherTotalRisk;
  const isEqual = totalRisk === otherTotalRisk;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2',
        isLowerRisk && !isEqual
          ? 'bg-bambooGreen-50 border-bambooGreen-200'
          : 'bg-bambooCream-50 border-bamboo-100'
      )}
    >
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-lg font-bold font-song text-warning">{errors}</div>
          <div className="text-[10px] text-bambooBrown-500 font-song">错误</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold font-song text-bamboo-500">{warnings}</div>
          <div className="text-[10px] text-bambooBrown-500 font-song">警告</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold font-song text-bambooBrown-600">{risks}</div>
          <div className="text-[10px] text-bambooBrown-500 font-song">风险点</div>
        </div>
      </div>
      {isLowerRisk && !isEqual && (
        <div className="text-xs text-bambooGreen-600 text-center font-song flex items-center justify-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          风险更低
        </div>
      )}
    </div>
  );
}

export default function TemplateLibrary() {
  const {
    templates,
    initTemplates,
    loadTemplate,
    deleteTemplate,
    exportTemplate,
    importTemplate,
    compareIds,
    toggleCompare,
    clearCompare,
  } = useWeaveStore();

  const [searchText, setSearchText] = useState('');
  const [patternFilter, setPatternFilter] = useState<PatternType | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<PatternTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (templates.length === 0) {
      const mockTemplates = createMockTemplates();
      mockTemplates.forEach((t) => {
        useWeaveStore.setState((state) => ({
          templates: [...state.templates, t],
        }));
      });
    }
    initTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(searchText.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));
      const matchPattern = patternFilter === 'all' || t.patternType === patternFilter;
      const matchDifficulty = difficultyFilter === 0 || t.difficulty === difficultyFilter;
      return matchSearch && matchPattern && matchDifficulty;
    });
  }, [templates, searchText, patternFilter, difficultyFilter]);

  const handleViewDetail = (template: PatternTemplate) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleLoad = (template: PatternTemplate) => {
    loadTemplate(template.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除该模板吗？')) {
      deleteTemplate(id);
    }
  };

  const handleExport = (template: PatternTemplate) => {
    const json = exportTemplate(template.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        importTemplate(event.target?.result as string);
        alert('模板导入成功！');
      } catch (err) {
        alert('导入失败：模板格式无效');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleNewTemplate = () => {
    alert('新建模板功能开发中...');
  };

  const handleEdit = (template: PatternTemplate) => {
    loadTemplate(template.id);
    alert(`已加载模板"${template.name}"到编辑器`);
  };

  const compareTemplates = useMemo(() => {
    return compareIds.map(id => templates.find(t => t.id === id)).filter(Boolean) as PatternTemplate[];
  }, [compareIds, templates]);

  const matrixDiffCells = useMemo(() => {
    if (compareTemplates.length !== 2) return [];
    const [a, b] = compareTemplates;
    const diffs: { row: number; col: number }[] = [];
    const maxRows = Math.max(a.weaveMatrix.rows, b.weaveMatrix.rows);
    const maxCols = Math.max(a.weaveMatrix.cols, b.weaveMatrix.cols);
    for (let r = 0; r < maxRows; r++) {
      for (let c = 0; c < maxCols; c++) {
        const valA = a.weaveMatrix.warpCodes[r]?.[c];
        const valB = b.weaveMatrix.warpCodes[r]?.[c];
        if (valA !== valB) {
          diffs.push({ row: r, col: c });
        }
      }
    }
    return diffs;
  }, [compareTemplates]);

  const handleCompareClick = () => {
    if (compareIds.length === 2) {
      setShowCompareModal(true);
    }
  };

  const handleSwapTemplates = () => {
    if (compareIds.length === 2) {
      const [first, second] = compareIds;
      clearCompare();
      toggleCompare(second);
      toggleCompare(first);
    }
  };

  const handleLoadFromCompare = (templateId: string) => {
    loadTemplate(templateId);
    setShowCompareModal(false);
    clearCompare();
  };

  return (
    <div className="min-h-screen bg-bambooCream-50/60">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-bambooGreen-500 flex items-center justify-center shadow-bamboo">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-song text-bambooBrown-800">模板库</h1>
            <p className="text-sm text-bambooBrown-500">浏览、管理和使用竹编编织模板</p>
          </div>
        </div>

        <div className="card-bamboo mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[240px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bamboo-400" />
                <input
                  type="text"
                  placeholder="搜索模板名称或标签..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="input-bamboo pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-bambooBrown-500" />
              <span className="text-sm font-song text-bambooBrown-600">编法：</span>
              <select
                value={patternFilter}
                onChange={(e) => setPatternFilter(e.target.value as PatternType | 'all')}
                className="input-bamboo !w-auto !py-1.5 !px-3 text-sm"
              >
                <option value="all">全部</option>
                <option value="hexagon">六角孔</option>
                <option value="cross">十字孔</option>
                <option value="herringbone">人字编</option>
                <option value="plain">平编</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-song text-bambooBrown-600">难度：</span>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(Number(e.target.value))}
                className="input-bamboo !w-auto !py-1.5 !px-3 text-sm"
              >
                <option value={0}>全部</option>
                <option value={1}>★☆☆☆☆</option>
                <option value={2}>★★☆☆☆</option>
                <option value={3}>★★★☆☆</option>
                <option value={4}>★★★★☆</option>
                <option value={5}>★★★★★</option>
              </select>
            </div>

            <div className="flex items-center gap-1 p-1 bg-bambooCream-200 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all duration-200',
                  viewMode === 'grid'
                    ? 'bg-white text-bambooGreen-600 shadow-sm'
                    : 'text-bambooBrown-500 hover:text-bambooBrown-700'
                )}
                title="网格视图"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all duration-200',
                  viewMode === 'list'
                    ? 'bg-white text-bambooGreen-600 shadow-sm'
                    : 'text-bambooBrown-500 hover:text-bambooBrown-700'
                )}
                title="列表视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={handleImportClick}
                className="btn-secondary flex items-center gap-1.5 !py-1.5 !px-3 text-sm"
              >
                <Upload className="w-4 h-4" />
                导入模板
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                onClick={handleNewTemplate}
                className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3 text-sm"
              >
                <Plus className="w-4 h-4" />
                新建模板
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm text-bambooBrown-500 mb-4 font-song">
          共找到 <span className="text-bambooGreen-600 font-semibold">{filteredTemplates.length}</span> 个模板
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTemplates.map((template, index) => (
              <div
                key={template.id}
                className="card-bamboo group cursor-pointer animate-fade-in-up hover:shadow-bamboo-hover hover:-translate-y-1 transition-all duration-300"
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => handleViewDetail(template)}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-bambooCream-100 mb-3 border border-bamboo-200">
                  <div
                    className="w-full h-full"
                    dangerouslySetInnerHTML={{ __html: template.thumbnail }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompare(template.id);
                    }}
                    className={cn(
                      'absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                      compareIds.includes(template.id)
                        ? 'bg-bambooGreen-500 border-bambooGreen-600 text-white shadow-md'
                        : 'bg-white/80 border-bamboo-300 text-transparent hover:border-bambooGreen-400 hover:bg-bambooGreen-50'
                    )}
                    title={compareIds.includes(template.id) ? '取消对比' : '加入对比'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className="absolute inset-0 bg-bambooBrown-900/0 group-hover:bg-bambooBrown-900/50 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCompare(template.id);
                        }}
                        className={cn(
                          'p-2 rounded-lg transition-all',
                          compareIds.includes(template.id)
                            ? 'bg-bambooGreen-500 text-white'
                            : 'bg-white/90 hover:bg-bambooGreen-500 hover:text-white'
                        )}
                        title={compareIds.includes(template.id) ? '取消对比' : '加入对比'}
                      >
                        <GitCompare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoad(template);
                        }}
                        className="p-2 bg-white/90 rounded-lg hover:bg-bambooGreen-500 hover:text-white transition-all"
                        title="加载到编辑器"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                        className="p-2 bg-white/90 rounded-lg hover:bg-bamboo-500 hover:text-white transition-all"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(template);
                        }}
                        className="p-2 bg-white/90 rounded-lg hover:bg-bambooBrown-500 hover:text-white transition-all"
                        title="导出JSON"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                        className="p-2 bg-white/90 rounded-lg hover:bg-warning hover:text-white transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold font-song text-bambooBrown-800 truncate">
                      {template.name}
                    </h3>
                    <DifficultyStars difficulty={template.difficulty} size={12} />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                        PATTERN_TYPE_COLORS[template.patternType]
                      )}
                    >
                      {PATTERN_TYPE_LABELS[template.patternType]}
                    </span>
                    {template.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="tag-bamboo"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-bambooBrown-500 line-clamp-2 leading-relaxed">
                    {template.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-bamboo overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bamboo-200 bg-bambooCream-100/60">
                    <th className="w-12 py-3 px-4 font-song text-sm text-bambooBrown-700 text-center">
                      <div title="对比">
                        <GitCompare className="w-4 h-4 mx-auto" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-song text-sm text-bambooBrown-700">缩略图</th>
                    <th className="text-left py-3 px-4 font-song text-sm text-bambooBrown-700">名称</th>
                    <th className="text-left py-3 px-4 font-song text-sm text-bambooBrown-700">编法类型</th>
                    <th className="text-left py-3 px-4 font-song text-sm text-bambooBrown-700">难度</th>
                    <th className="text-left py-3 px-4 font-song text-sm text-bambooBrown-700">标签</th>
                    <th className="text-left py-3 px-4 font-song text-sm text-bambooBrown-700">更新时间</th>
                    <th className="text-right py-3 px-4 font-song text-sm text-bambooBrown-700">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template, index) => (
                    <tr
                      key={template.id}
                      className="border-b border-bamboo-100 hover:bg-bambooCream-100/40 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => toggleCompare(template.id)}
                          className={cn(
                            'w-5 h-5 rounded border-2 inline-flex items-center justify-center transition-all duration-200',
                            compareIds.includes(template.id)
                              ? 'bg-bambooGreen-500 border-bambooGreen-600 text-white'
                              : 'bg-white border-bamboo-300 text-transparent hover:border-bambooGreen-400 hover:bg-bambooGreen-50'
                          )}
                          title={compareIds.includes(template.id) ? '取消对比' : '加入对比'}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className="w-12 h-12 rounded-md overflow-hidden border border-bamboo-200"
                          dangerouslySetInnerHTML={{ __html: template.thumbnail }}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-song text-bambooBrown-800 font-medium">
                          {template.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            PATTERN_TYPE_COLORS[template.patternType]
                          )}
                        >
                          {PATTERN_TYPE_LABELS[template.patternType]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <DifficultyStars difficulty={template.difficulty} size={14} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="tag-bamboo">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-bambooBrown-500">
                        {new Date(template.updatedAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleViewDetail(template)}
                            className="p-1.5 rounded-md text-bambooBrown-500 hover:bg-bambooGreen-100 hover:text-bambooGreen-600 transition-all"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleLoad(template)}
                            className="p-1.5 rounded-md text-bambooBrown-500 hover:bg-bambooGreen-100 hover:text-bambooGreen-600 transition-all"
                            title="加载到编辑器"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExport(template)}
                            className="p-1.5 rounded-md text-bambooBrown-500 hover:bg-bamboo-100 hover:text-bamboo-600 transition-all"
                            title="导出JSON"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-1.5 rounded-md text-bambooBrown-500 hover:bg-red-100 hover:text-warning transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredTemplates.length === 0 && (
              <div className="py-16 text-center text-bambooBrown-500">
                <Library className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无匹配的模板</p>
              </div>
            )}
          </div>
        )}

        {filteredTemplates.length === 0 && viewMode === 'grid' && (
          <div className="card-bamboo py-16 text-center">
            <Library className="w-16 h-16 mx-auto mb-4 text-bamboo-300" />
            <p className="text-bambooBrown-500 font-song">暂无匹配的模板</p>
            <p className="text-sm text-bambooBrown-400 mt-1">尝试调整筛选条件或创建新模板</p>
          </div>
        )}
      </div>

      {compareIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-weave-in">
          <div className="card-bamboo flex items-center gap-4 px-5 py-3 shadow-bamboo-hover">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-bambooGreen-600" />
              <span className="font-song text-bambooBrown-700">
                已选 <span className="font-bold text-bambooGreen-600">{compareIds.length}</span> 个模板
                {compareIds.length < 2 && (
                  <span className="text-bambooBrown-400 text-sm ml-1">（还需选{2 - compareIds.length}个）</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearCompare}
                className="btn-secondary !py-1.5 !px-3 text-sm flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                清空
              </button>
              <button
                onClick={handleCompareClick}
                disabled={compareIds.length !== 2}
                className="btn-primary !py-1.5 !px-4 text-sm flex items-center gap-1.5"
              >
                <GitCompare className="w-4 h-4" />
                点击对比
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div className="absolute inset-0 bg-bambooBrown-900/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-bambooCream-50 shadow-2xl animate-weave-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-bamboo-200 bg-bambooCream-100/60">
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-lg overflow-hidden border border-bamboo-300 bg-white shadow-sm"
                  dangerouslySetInnerHTML={{ __html: selectedTemplate.thumbnail }}
                />
                <div>
                  <h2 className="text-xl font-bold font-song text-bambooBrown-800">
                    {selectedTemplate.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                        PATTERN_TYPE_COLORS[selectedTemplate.patternType]
                      )}
                    >
                      {PATTERN_TYPE_LABELS[selectedTemplate.patternType]}
                    </span>
                    <DifficultyStars difficulty={selectedTemplate.difficulty} size={14} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-bambooBrown-500 hover:bg-bamboo-200 hover:text-bambooBrown-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-bambooGreen-600" />
                      模板描述
                    </h3>
                    <p className="text-sm text-bambooBrown-600 leading-relaxed bg-bambooCream-100/50 rounded-lg p-3 border border-bamboo-100">
                      {selectedTemplate.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-bambooGreen-600" />
                      挑压矩阵预览
                    </h3>
                    <div className="bg-bambooCream-100/50 rounded-lg p-3 border border-bamboo-100 flex justify-center overflow-auto">
                      <WeaveGrid
                        weaveMatrix={selectedTemplate.weaveMatrix.warpCodes}
                        cellSize={12}
                        readOnly
                      />
                    </div>
                    <p className="text-xs text-bambooBrown-400 mt-2 text-center">
                      {selectedTemplate.weaveMatrix.rows} × {selectedTemplate.weaveMatrix.cols} 矩阵
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-bambooGreen-600" />
                      标签
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.tags.map((tag) => (
                        <span key={tag} className="tag-bamboo">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-bambooGreen-600" />
                      工序步骤摘要
                    </h3>
                    <div className="space-y-2">
                      {selectedTemplate.layers.map((layer, idx) => (
                        <div
                          key={layer.id}
                          className="bg-bambooCream-100/50 rounded-lg p-3 border border-bamboo-100"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-bambooGreen-500 text-white text-xs flex items-center justify-center font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-song font-semibold text-bambooBrown-700 text-sm">
                              {layer.layerName}
                            </span>
                          </div>
                          <p className="text-xs text-bambooBrown-500 ml-7">
                            {layer.steps.length} 个步骤
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-bambooGreen-600" />
                      备料数据摘要
                    </h3>
                    <div className="bg-bambooCream-100/50 rounded-lg border border-bamboo-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-bambooCream-200/60">
                            <th className="text-left py-2 px-3 font-song text-xs text-bambooBrown-600">规格</th>
                            <th className="text-left py-2 px-3 font-song text-xs text-bambooBrown-600">宽度</th>
                            <th className="text-left py-2 px-3 font-song text-xs text-bambooBrown-600">长度</th>
                            <th className="text-left py-2 px-3 font-song text-xs text-bambooBrown-600">数量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTemplate.materials.map((mat) => (
                            <tr key={mat.id} className="border-t border-bamboo-100">
                              <td className="py-2 px-3 text-bambooBrown-700">{mat.spec}</td>
                              <td className="py-2 px-3 text-bambooBrown-600">{mat.widthMm}mm</td>
                              <td className="py-2 px-3 text-bambooBrown-600">{mat.lengthMm}mm</td>
                              <td className="py-2 px-3 text-bambooBrown-600">{mat.count}根</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-xs text-bambooBrown-500">
                      成品尺寸：{selectedTemplate.params.finishedWidth}mm × {selectedTemplate.params.finishedHeight}mm
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-bamboo-200 bg-bambooCream-100/60">
              <button
                onClick={() => handleExport(selectedTemplate)}
                className="btn-secondary flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                导出JSON
              </button>
              <button
                onClick={() => {
                  handleLoad(selectedTemplate);
                  setShowModal(false);
                }}
                className="btn-primary flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                加载到编辑器
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompareModal && compareTemplates.length === 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCompareModal(false)}
        >
          <div className="absolute inset-0 bg-bambooBrown-900/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-bambooCream-50 shadow-2xl animate-weave-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-bamboo-200 bg-bambooCream-100/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-bambooGreen-500 flex items-center justify-center shadow-bamboo">
                  <GitCompare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-song text-bambooBrown-800">模板对比</h2>
                  <p className="text-xs text-bambooBrown-500">双栏对比分析，助您选择最优方案</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSwapTemplates}
                  className="p-2 rounded-lg text-bambooBrown-500 hover:bg-bamboo-200 hover:text-bambooBrown-700 transition-all"
                  title="交换位置"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-2 rounded-lg text-bambooBrown-500 hover:bg-bamboo-200 hover:text-bambooBrown-700 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-6">
                {compareTemplates.map((template, idx) => (
                  <div
                    key={template.id}
                    className={cn(
                      'space-y-5',
                      idx === 0 ? 'pr-6 border-r border-bamboo-200' : 'pl-6'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-16 h-16 rounded-lg overflow-hidden border border-bamboo-300 bg-white shadow-sm flex-shrink-0"
                        dangerouslySetInnerHTML={{ __html: template.thumbnail }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold font-song text-bambooBrown-800 text-lg truncate">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                              PATTERN_TYPE_COLORS[template.patternType]
                            )}
                          >
                            {PATTERN_TYPE_LABELS[template.patternType]}
                          </span>
                          <DifficultyStars difficulty={template.difficulty} size={12} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-bambooGreen-600" />
                        挑压矩阵
                        <span className="text-xs font-normal text-bambooBrown-400 ml-auto">
                          {template.weaveMatrix.rows} × {template.weaveMatrix.cols}
                        </span>
                      </h4>
                      <div className="bg-bambooCream-100/50 rounded-lg p-3 border border-bamboo-100 flex justify-center overflow-auto">
                        <CompareWeaveGrid
                          weaveMatrix={template.weaveMatrix.warpCodes}
                          diffCells={idx === 0 ? matrixDiffCells : matrixDiffCells}
                          cellSize={10}
                        />
                      </div>
                      <p className="text-xs text-bambooBrown-400 mt-2 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm border-2 border-warning bg-warning/10" />
                          差异单元格
                        </span>
                        <span className="mx-2">·</span>
                        共 <span className="text-warning font-semibold">{matrixDiffCells.length}</span> 处不同
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-bambooGreen-600" />
                        参数对比
                      </h4>
                      <div className="space-y-2">
                        {[
                          { key: 'bambooWidth', label: '篾宽', value: template.params.bambooWidth, unit: 'mm', lowerIsBetter: true },
                          { key: 'bambooGap', label: '间隙', value: template.params.bambooGap, unit: 'mm', lowerIsBetter: true },
                          { key: 'finishedWidth', label: '成品宽度', value: template.params.finishedWidth, unit: 'mm', lowerIsBetter: false },
                          { key: 'finishedHeight', label: '成品高度', value: template.params.finishedHeight, unit: 'mm', lowerIsBetter: false },
                          { key: 'lossRate', label: '损耗系数', value: template.params.lossRate, unit: '', lowerIsBetter: true },
                        ].map((item) => {
                          const otherTemplate = compareTemplates[idx === 0 ? 1 : 0];
                          const otherValue = otherTemplate.params[item.key as keyof typeof otherTemplate.params] as number;
                          const isBetter = item.lowerIsBetter
                            ? item.value < otherValue
                            : item.value > otherValue;
                          const isEqual = item.value === otherValue;
                          return (
                            <div
                              key={item.key}
                              className={cn(
                                'flex items-center justify-between px-3 py-2 rounded-lg border transition-all',
                                isBetter && !isEqual
                                  ? 'bg-bambooGreen-50 border-bambooGreen-200'
                                  : 'bg-bambooCream-50 border-bamboo-100'
                              )}
                            >
                              <span className="text-sm text-bambooBrown-600 font-song">{item.label}</span>
                              <div className="flex items-center gap-1.5">
                                {isBetter && !isEqual && (
                                  <TrendingDown className="w-4 h-4 text-bambooGreen-500" />
                                )}
                                {isEqual && (
                                  <Minus className="w-4 h-4 text-bamboo-400" />
                                )}
                                <span
                                  className={cn(
                                    'font-bold font-song',
                                    isBetter && !isEqual
                                      ? 'text-bambooGreen-600'
                                      : 'text-bambooBrown-700'
                                  )}
                                >
                                  {item.value}
                                  <span className="text-xs font-normal text-bambooBrown-400 ml-0.5">{item.unit}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-bambooGreen-600" />
                        备料数据
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <MaterialStatCard
                          label="总根数"
                          value={template.materials.reduce((sum, m) => sum + m.count, 0)}
                          unit="根"
                          compareValue={compareTemplates[idx === 0 ? 1 : 0].materials.reduce((sum, m) => sum + m.count, 0)}
                          lowerIsBetter
                        />
                        <MaterialStatCard
                          label="总长度"
                          value={Math.round(template.materials.reduce((sum, m) => sum + m.count * m.lengthMm, 0) / 1000 * 100) / 100}
                          unit="米"
                          compareValue={Math.round(compareTemplates[idx === 0 ? 1 : 0].materials.reduce((sum, m) => sum + m.count * m.lengthMm, 0) / 1000 * 100) / 100}
                          lowerIsBetter
                        />
                        <MaterialStatCard
                          label="经篾数"
                          value={template.materials.filter(m => m.spec.includes('经篾')).reduce((sum, m) => sum + m.count, 0)}
                          unit="根"
                          compareValue={compareTemplates[idx === 0 ? 1 : 0].materials.filter(m => m.spec.includes('经篾')).reduce((sum, m) => sum + m.count, 0)}
                          lowerIsBetter
                        />
                        <MaterialStatCard
                          label="纬篾数"
                          value={template.materials.filter(m => m.spec.includes('纬篾')).reduce((sum, m) => sum + m.count, 0)}
                          unit="根"
                          compareValue={compareTemplates[idx === 0 ? 1 : 0].materials.filter(m => m.spec.includes('纬篾')).reduce((sum, m) => sum + m.count, 0)}
                          lowerIsBetter
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold font-song text-bambooBrown-700 mb-2 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-bambooGreen-600" />
                        校验结果
                      </h4>
                      <ValidationCompareCard template={template} otherTemplate={compareTemplates[idx === 0 ? 1 : 0]} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-bamboo-200 bg-bambooCream-100/60">
              <div className="text-sm text-bambooBrown-500 font-song">
                提示：绿色标记表示该指标更优
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLoadFromCompare(compareTemplates[0].id)}
                  className="btn-secondary flex items-center gap-1.5 !py-2 !px-4"
                >
                  <FileText className="w-4 h-4" />
                  加载模板A
                </button>
                <button
                  onClick={() => handleLoadFromCompare(compareTemplates[1].id)}
                  className="btn-primary flex items-center gap-1.5 !py-2 !px-4"
                >
                  <FileText className="w-4 h-4" />
                  加载模板B
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
