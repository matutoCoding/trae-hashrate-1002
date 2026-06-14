import { create } from 'zustand';
import type {
  PatternTemplate,
  WeaveMatrix,
  WeaveParams,
  WeaveLayer,
  MaterialItem,
  ValidationResult,
  WeaveCell,
  ValidationError,
  ValidationWarning,
  DetectedPattern,
} from '@/types';

const TEMPLATES_STORAGE_KEY = 'bamboo_weave_templates';

const defaultParams: WeaveParams = {
  bambooWidth: 5,
  bambooGap: 1,
  finishedWidth: 300,
  finishedHeight: 300,
  lossRate: 1.1,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function genThumbSvg(pattern: string): string {
  const cellSize = 15; const gridSize = 8; let rects = '';
  for (let r = 0; r < gridSize; r++) for (let c = 0; c < gridSize; c++) {
    let isPick = false;
    if (pattern === 'plain') isPick = (r + c) % 2 === 0;
    else if (pattern === 'hexagon') isPick = (r * 2 + c) % 3 === 0;
    else if (pattern === 'cross') isPick = r % 2 === 0 || c % 2 === 0;
    else if (pattern === 'herringbone') isPick = (r + Math.floor(c / 2)) % 2 === 0;
    else isPick = (r * c) % 2 === 0;
    const fill = isPick ? '#5B9D57' : '#D2BE80';
    const stroke = isPick ? '#476E46' : '#A88B3D';
    rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize - 1}" height="${cellSize - 1}" rx="1" fill="${fill}" stroke="${stroke}" stroke-opacity="0.3"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#F8F3E3" rx="4"/>${rects}</svg>`;
}

function genMatrix(rows: number, cols: number, pattern: string): WeaveMatrix {
  const warpCodes: WeaveCell[][] = [];
  const weftCodes: WeaveCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const warpRow: WeaveCell[] = [];
    const weftRow: WeaveCell[] = [];
    for (let c = 0; c < cols; c++) {
      let val: WeaveCell = 0;
      switch (pattern) {
        case 'plain': val = ((r + c) % 2) as WeaveCell; break;
        case 'hexagon': val = (((r * 2 + c) % 3) === 0 ? 1 : 0) as WeaveCell; break;
        case 'cross': val = ((r % 2 === 0 || c % 2 === 0) ? 1 : 0) as WeaveCell; break;
        case 'herringbone': val = (((r + Math.floor(c / 2)) % 2) as WeaveCell); break;
        default: val = ((r * c) % 2) as WeaveCell; break;
      }
      warpRow.push(val);
      weftRow.push((val === 1 ? 0 : 1) as WeaveCell);
    }
    warpCodes.push(warpRow);
    weftCodes.push(weftRow);
  }
  return { rows, cols, cellSize: 16, warpCodes, weftCodes,
    detectedPatterns: [{ type: pattern as any, startRow: 0, startCol: 0, width: cols, height: rows }] };
}

function buildDefaultTemplates(): PatternTemplate[] {
  const now = Date.now();
  return [
    { id: 'default-hexagon', name: '经典六角孔', patternType: 'hexagon', difficulty: 3, thumbnail: genThumbSvg('hexagon'),
      tags: ['传统', '透气', '基础'], description: '传统六角孔编织纹样，结构稳定，透气性好，常用于竹篮、筐篓等日常器具。',
      weaveMatrix: genMatrix(12, 12, 'hexagon'), layers: [], materials: [],
      params: { bambooWidth: 5, bambooGap: 1, finishedWidth: 300, finishedHeight: 300, lossRate: 1.1 },
      createdAt: now - 5 * 86400000, updatedAt: now - 5 * 86400000 },
    { id: 'default-cross', name: '十字孔花编', patternType: 'cross', difficulty: 2, thumbnail: genThumbSvg('cross'),
      tags: ['入门', '简洁', '装饰'], description: '十字形孔洞编织，结构简洁，视觉效果分明，适合入门练习。',
      weaveMatrix: genMatrix(10, 10, 'cross'), layers: [], materials: [],
      params: { bambooWidth: 5, bambooGap: 1, finishedWidth: 300, finishedHeight: 300, lossRate: 1.1 },
      createdAt: now - 4 * 86400000, updatedAt: now - 4 * 86400000 },
    { id: 'default-herringbone', name: '人字编纹样', patternType: 'herringbone', difficulty: 4, thumbnail: genThumbSvg('herringbone'),
      tags: ['工艺', '纹理', '高级'], description: '人字形交错编织，纹理流畅如行云流水，常用于高级竹编工艺品。',
      weaveMatrix: genMatrix(16, 12, 'herringbone'), layers: [], materials: [],
      params: { bambooWidth: 5, bambooGap: 1, finishedWidth: 300, finishedHeight: 300, lossRate: 1.1 },
      createdAt: now - 3 * 86400000, updatedAt: now - 3 * 86400000 },
    { id: 'default-plain', name: '平编基础款', patternType: 'plain', difficulty: 1, thumbnail: genThumbSvg('plain'),
      tags: ['入门', '基础', '教学'], description: '最基础的一挑一压平编技法，是所有竹编的入门基础。',
      weaveMatrix: genMatrix(8, 8, 'plain'), layers: [], materials: [],
      params: { bambooWidth: 5, bambooGap: 1, finishedWidth: 300, finishedHeight: 300, lossRate: 1.1 },
      createdAt: now - 2 * 86400000, updatedAt: now - 2 * 86400000 },
    { id: 'default-hexagon2', name: '六角孔变体', patternType: 'hexagon', difficulty: 4, thumbnail: genThumbSvg('hexagon'),
      tags: ['变体', '层次', '创意'], description: '在传统六角孔基础上加入变化元素，形成更富层次感的编织纹样。',
      weaveMatrix: genMatrix(14, 14, 'hexagon'), layers: [], materials: [],
      params: { bambooWidth: 5, bambooGap: 1, finishedWidth: 300, finishedHeight: 300, lossRate: 1.1 },
      createdAt: now - 1 * 86400000, updatedAt: now - 1 * 86400000 },
    { id: 'default-custom', name: '自定义组合纹', patternType: 'custom', difficulty: 5, thumbnail: genThumbSvg('custom'),
      tags: ['创意', '组合', '大师级'], description: '融合多种编法的自定义组合纹样，考验编织技巧与创意设计。',
      weaveMatrix: genMatrix(16, 16, 'custom'), layers: [], materials: [],
      params: { bambooWidth: 5, bambooGap: 1, finishedWidth: 300, finishedHeight: 300, lossRate: 1.1 },
      createdAt: now, updatedAt: now },
  ];
}

function ensureDefaultTemplates(templates: PatternTemplate[]): PatternTemplate[] {
  const defaults = buildDefaultTemplates();
  const existingIds = new Set(templates.map(t => t.id));
  const missingDefaults = defaults.filter(d => !existingIds.has(d.id));
  return [...templates, ...missingDefaults];
}

interface WeaveStoreState {
  currentTemplate: PatternTemplate | null;
  weaveMatrix: WeaveMatrix | null;
  weaveParams: WeaveParams;
  layers: WeaveLayer[];
  materials: MaterialItem[];
  validationResult: ValidationResult | null;
  templates: PatternTemplate[];
  selectedCell: { row: number; col: number } | null;
}

interface WeaveStoreActions {
  setWeaveMatrix: (matrix: WeaveMatrix) => void;
  updateCell: (row: number, col: number, direction: 'warp' | 'weft', value: WeaveCell) => void;
  setParams: (params: Partial<WeaveParams>) => void;
  runValidation: () => void;
  splitIntoLayers: () => void;
  calculateMaterials: () => void;
  saveTemplate: (name: string) => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  exportTemplate: (id: string) => string;
  importTemplate: (json: string) => void;
  initTemplates: () => void;
  setSelectedCell: (cell: { row: number; col: number } | null) => void;
  setCurrentTemplate: (template: PatternTemplate | null) => void;
}

export type WeaveStore = WeaveStoreState & WeaveStoreActions;

export const useWeaveStore = create<WeaveStore>((set, get) => ({
  currentTemplate: null,
  weaveMatrix: null,
  weaveParams: defaultParams,
  layers: [],
  materials: [],
  validationResult: null,
  templates: [],
  selectedCell: null,

  setWeaveMatrix: (matrix) => {
    set({ weaveMatrix: matrix });
  },

  updateCell: (row, col, direction, value) => {
    const { weaveMatrix } = get();
    if (!weaveMatrix) return;

    const newMatrix: WeaveMatrix = {
      ...weaveMatrix,
      warpCodes: weaveMatrix.warpCodes.map((r) => [...r]),
      weftCodes: weaveMatrix.weftCodes.map((r) => [...r]),
    };

    if (direction === 'warp') {
      if (newMatrix.warpCodes[row] && col < newMatrix.warpCodes[row].length) {
        newMatrix.warpCodes[row][col] = value;
      }
    } else {
      if (newMatrix.weftCodes[row] && col < newMatrix.weftCodes[row].length) {
        newMatrix.weftCodes[row][col] = value;
      }
    }

    set({ weaveMatrix: newMatrix });
  },

  setParams: (params) => {
    set((state) => ({
      weaveParams: { ...state.weaveParams, ...params },
    }));
    // 参数变化后自动重新计算材料
    get().calculateMaterials();
  },

  runValidation: () => {
    const { weaveMatrix } = get();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!weaveMatrix) {
      set({
        validationResult: {
          isValid: false,
          errors: [
            {
              type: 'misalignment',
              message: '挑压矩阵为空，请先设置矩阵数据',
            },
          ],
          warnings: [],
        },
      });
      return;
    }

    const { rows, cols, warpCodes, weftCodes } = weaveMatrix;

    for (let r = 0; r < rows; r++) {
      if (warpCodes[r]) {
        let consecutive = 1;
        for (let c = 1; c < cols; c++) {
          if (warpCodes[r][c] === warpCodes[r][c - 1]) {
            consecutive++;
            if (consecutive > 4) {
              warnings.push({
                type: 'dense_pattern',
                row: r,
                col: c,
                message: `第${r + 1}行经篾存在连续${consecutive}个同态挑压，可能影响结构稳定性`,
                suggestion: '建议调整为交替挑压模式',
              });
              break;
            }
          } else {
            consecutive = 1;
          }
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      if (warpCodes[r] && warpCodes[r].length > 0) {
        const first = warpCodes[r][0];
        const last = warpCodes[r][warpCodes[r].length - 1];
        if (first !== last) {
          errors.push({
            type: 'open_end',
            row: r,
            message: `第${r + 1}行经篾首尾挑压状态不一致，可能导致散口`,
            suggestion: '建议调整首尾状态保持一致',
          });
        }
      }
    }

    for (let c = 0; c < cols; c++) {
      let same = true;
      for (let r = 1; r < rows; r++) {
        if (warpCodes[r] && warpCodes[0] && warpCodes[r][c] !== warpCodes[0][c]) {
          same = false;
          break;
        }
      }
      if (same && rows > 1) {
        warnings.push({
          type: 'color_shift',
          col: c,
          message: `第${c + 1}列所有经篾挑压状态相同，可能导致纹样单调`,
        });
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const warpVal = warpCodes[r]?.[c];
        const weftVal = weftCodes[r]?.[c];
        if (warpVal !== undefined && weftVal !== undefined && warpVal === weftVal) {
          warnings.push({
            type: 'misalignment',
            row: r,
            col: c,
            message: `位置(${r + 1},${c + 1})经篾与纬篾挑压状态一致，可能产生冲突`,
            suggestion: '挑压应为互补关系',
          });
        }
      }
    }

    // 配色错位检测：挑压相同但相邻配色不一致的情况
    const getSimulatedColor = (r: number, c: number, val: WeaveCell): string => {
      const seed = (r * 7 + c * 13) % 5;
      if (val === 1) {
        return seed === 0 ? '染色红' : seed === 1 ? '染色蓝' : '竹青';
      }
      return seed === 2 ? '碳化' : '本色';
    };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const currentVal = warpCodes[r]?.[c];
        if (currentVal === undefined) continue;
        const currentColor = getSimulatedColor(r, c, currentVal);

        if (c < cols - 1) {
          const rightVal = warpCodes[r]?.[c + 1];
          const rightColor = getSimulatedColor(r, c + 1, rightVal as WeaveCell);
          if (currentVal === rightVal && currentColor !== rightColor) {
            errors.push({
              type: 'color_shift',
              row: r,
              col: c,
              message: `第${r + 1}行第${c + 1}列与第${c + 2}列挑压相同(=${currentVal})但配色不一致`,
              suggestion: `挑压=${currentVal} 的区域建议统一配色，当前 ${currentColor} ↔ ${rightColor}`,
            });
            if (errors.filter(e => e.type === 'color_shift').length > 6) break;
          }
        }
        if (r < rows - 1) {
          const bottomVal = warpCodes[r + 1]?.[c];
          const bottomColor = getSimulatedColor(r + 1, c, bottomVal as WeaveCell);
          if (currentVal === bottomVal && currentColor !== bottomColor) {
            errors.push({
              type: 'color_shift',
              row: r,
              col: c,
              message: `第${c + 1}列第${r + 1}行与第${r + 2}行挑压相同(=${currentVal})但配色不一致`,
              suggestion: `挑压=${currentVal} 的区域建议统一配色，当前 ${currentColor} ↔ ${bottomColor}`,
            });
            if (errors.filter(e => e.type === 'color_shift').length > 10) break;
          }
        }
      }
      if (errors.filter(e => e.type === 'color_shift').length > 10) break;
    }

    set({
      validationResult: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
    });
  },

  splitIntoLayers: () => {
    const { weaveMatrix } = get();
    if (!weaveMatrix) {
      set({ layers: [] });
      return;
    }

    const layers: WeaveLayer[] = [];
    const { rows, cols, detectedPatterns } = weaveMatrix;

    layers.push({
      id: generateId(),
      layerIndex: 0,
      layerName: '起篾层',
      description: '基础经篾排布，建立编织骨架',
      steps: [
        {
          id: generateId(),
          stepIndex: 0,
          instruction: `准备 ${cols} 根经篾，按间距平行排列`,
          startCount: 0,
          endCount: cols,
        },
        {
          id: generateId(),
          stepIndex: 1,
          instruction: '固定经篾两端，保持张力均匀',
          startCount: 0,
          endCount: cols,
        },
      ],
    });

    detectedPatterns.forEach((pattern: DetectedPattern, idx: number) => {
      layers.push({
        id: generateId(),
        layerIndex: idx + 1,
        layerName: `主纹层-${pattern.type}`,
        description: `${pattern.type} 纹样编织区域 (${pattern.startRow + 1},${pattern.startCol + 1}) - 尺寸 ${pattern.width}x${pattern.height}`,
        steps: [
          {
            id: generateId(),
            stepIndex: 0,
            instruction: `按 ${pattern.type} 编法挑压第 ${pattern.startRow + 1} 至 ${pattern.startRow + pattern.height} 行`,
            startCount: pattern.startRow,
            endCount: pattern.startRow + pattern.height,
          },
        ],
      });
    });

    layers.push({
      id: generateId(),
      layerIndex: layers.length,
      layerName: '收篾层',
      description: '完成编织后收边处理',
      steps: [
        {
          id: generateId(),
          stepIndex: 0,
          instruction: '检查所有纬篾挑压是否正确',
          startCount: 0,
          endCount: rows,
        },
        {
          id: generateId(),
          stepIndex: 1,
          instruction: '修剪多余篾条，进行收边处理',
          startCount: 0,
          endCount: rows,
        },
      ],
    });

    set({ layers });
  },

  calculateMaterials: () => {
    const { weaveMatrix, weaveParams } = get();
    if (!weaveMatrix) {
      const { bambooWidth, bambooGap, finishedWidth, finishedHeight, lossRate } = weaveParams;
      const unitLength = bambooWidth + bambooGap;
      const warpCount = Math.max(8, Math.ceil(finishedWidth / unitLength));
      const weftCount = Math.max(8, Math.ceil(finishedHeight / unitLength));
      const warpLength = Math.ceil(finishedHeight * lossRate);
      const weftLength = Math.ceil(finishedWidth * lossRate);
      const defaultMaterials: MaterialItem[] = [
        { id: generateId(), spec: '经篾-主骨架', color: '本色', widthMm: bambooWidth, lengthMm: warpLength, count: Math.floor(warpCount * 0.7), processIndex: 0 },
        { id: generateId(), spec: '经篾-加强', color: '碳化', widthMm: bambooWidth + 1, lengthMm: warpLength, count: Math.max(4, Math.floor(warpCount * 0.2)), processIndex: 0 },
        { id: generateId(), spec: '经篾-边框', color: '本色', widthMm: bambooWidth + 3, lengthMm: Math.ceil(warpLength * 1.05), count: 4, processIndex: 0 },
        { id: generateId(), spec: '纬篾-基础', color: '本色', widthMm: bambooWidth, lengthMm: weftLength, count: Math.floor(weftCount * 0.7), processIndex: 1 },
        { id: generateId(), spec: '纬篾-花纹', color: '竹青', widthMm: Math.max(2, bambooWidth - 1), lengthMm: weftLength, count: Math.max(4, Math.floor(weftCount * 0.3)), processIndex: 1 },
        { id: generateId(), spec: '收边篾', color: '碳化', widthMm: bambooWidth + 1, lengthMm: Math.ceil(Math.max(finishedWidth, finishedHeight) * lossRate * 1.1), count: 8, processIndex: 2 },
        { id: generateId(), spec: '装饰篾-镶边', color: '染色黄', widthMm: Math.max(2, bambooWidth - 2), lengthMm: Math.ceil(Math.max(finishedWidth, finishedHeight) * 0.5), count: 10, processIndex: 3 },
      ];
      set({ materials: defaultMaterials });
      return;
    }

    const { rows, cols } = weaveMatrix;
    const { bambooWidth, bambooGap, finishedWidth, finishedHeight, lossRate } = weaveParams;

    const unitLength = bambooWidth + bambooGap;
    const warpCount = Math.max(8, Math.ceil(finishedWidth / unitLength));
    const weftCount = Math.max(8, Math.ceil(finishedHeight / unitLength));
    const warpLength = Math.ceil(finishedHeight * lossRate);
    const weftLength = Math.ceil(finishedWidth * lossRate);

    const materials: MaterialItem[] = [
      { id: generateId(), spec: '经篾-主骨架', color: '本色', widthMm: bambooWidth, lengthMm: warpLength, count: Math.max(Math.floor(warpCount * 0.7), Math.floor(cols * 0.7)), processIndex: 0 },
      { id: generateId(), spec: '经篾-加强', color: '碳化', widthMm: bambooWidth + 1, lengthMm: warpLength, count: Math.max(4, Math.floor(warpCount * 0.2)), processIndex: 0 },
      { id: generateId(), spec: '经篾-边框', color: '本色', widthMm: bambooWidth + 3, lengthMm: Math.ceil(warpLength * 1.05), count: 4, processIndex: 0 },
      { id: generateId(), spec: '纬篾-基础', color: '本色', widthMm: bambooWidth, lengthMm: weftLength, count: Math.max(Math.floor(weftCount * 0.7), Math.floor(rows * 0.7)), processIndex: 1 },
      { id: generateId(), spec: '纬篾-花纹', color: '竹青', widthMm: Math.max(2, bambooWidth - 1), lengthMm: weftLength, count: Math.max(4, Math.floor(weftCount * 0.3)), processIndex: 1 },
      { id: generateId(), spec: '收边篾', color: '碳化', widthMm: bambooWidth + 1, lengthMm: Math.ceil(Math.max(finishedWidth, finishedHeight) * lossRate * 1.1), count: 8, processIndex: 2 },
      { id: generateId(), spec: '装饰篾-镶边', color: '染色黄', widthMm: Math.max(2, bambooWidth - 2), lengthMm: Math.ceil(Math.max(finishedWidth, finishedHeight) * 0.5), count: 10, processIndex: 3 },
    ];

    set({ materials });
  },

  saveTemplate: (name) => {
    const state = get();
    const now = Date.now();

    if (!state.weaveMatrix) {
      return;
    }

    const template: PatternTemplate = {
      id: state.currentTemplate?.id || generateId(),
      name,
      patternType: state.currentTemplate?.patternType || 'custom',
      difficulty: state.currentTemplate?.difficulty || 3,
      thumbnail: state.currentTemplate?.thumbnail || '',
      tags: state.currentTemplate?.tags || [],
      description: state.currentTemplate?.description || '',
      weaveMatrix: state.weaveMatrix,
      layers: state.layers,
      materials: state.materials,
      params: state.weaveParams,
      createdAt: state.currentTemplate?.createdAt || now,
      updatedAt: now,
    };

    const templates = [...state.templates];
    const existingIdx = templates.findIndex((t) => t.id === template.id);
    if (existingIdx >= 0) {
      templates[existingIdx] = template;
    } else {
      templates.push(template);
    }

    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to save templates to localStorage:', e);
    }

    set({ templates, currentTemplate: template });
  },

  loadTemplate: (id) => {
    const { templates } = get();
    const template = templates.find((t) => t.id === id);
    if (template) {
      set({
        currentTemplate: template,
        weaveMatrix: template.weaveMatrix,
        weaveParams: template.params,
        layers: template.layers,
        materials: template.materials.length > 0 ? template.materials : [],
        validationResult: null,
        selectedCell: null,
      });
      // 加载后自动计算材料和运行校验
      if (template.materials.length === 0) {
        setTimeout(() => get().calculateMaterials(), 0);
      }
      setTimeout(() => get().runValidation(), 50);
    }
  },

  deleteTemplate: (id) => {
    let templates = get().templates.filter((t) => t.id !== id);
    // 如果删空了，恢复默认模板兜底
    if (templates.length === 0) {
      templates = buildDefaultTemplates();
    }
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.error('Failed to delete template from localStorage:', e);
    }

    const currentTemplate = get().currentTemplate;
    set({
      templates,
      currentTemplate: currentTemplate?.id === id ? null : currentTemplate,
    });
  },

  exportTemplate: (id) => {
    const template = get().templates.find((t) => t.id === id);
    if (!template) return '';
    return JSON.stringify(template, null, 2);
  },

  importTemplate: (json) => {
    try {
      const template = JSON.parse(json) as PatternTemplate;
      template.id = generateId();
      template.createdAt = Date.now();
      template.updatedAt = Date.now();

      let templates = [...get().templates, template];
      // 确保默认模板存在
      templates = ensureDefaultTemplates(templates);
      try {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
      } catch (e) {
        console.error('Failed to save imported template to localStorage:', e);
      }

      set({ templates });
    } catch (e) {
      console.error('Failed to import template:', e);
      throw new Error('模板 JSON 格式无效');
    }
  },

  initTemplates: () => {
    try {
      let storedTemplates: PatternTemplate[] = [];
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        storedTemplates = JSON.parse(stored) as PatternTemplate[];
      }
      // 无论本地存储有什么，都确保默认模板存在
      const mergedTemplates = ensureDefaultTemplates(storedTemplates);
      // 如果比本地多了默认模板，同步保存回去
      if (mergedTemplates.length > storedTemplates.length) {
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(mergedTemplates));
      }
      set({ templates: mergedTemplates });
    } catch (e) {
      console.error('Failed to load templates from localStorage:', e);
      set({ templates: buildDefaultTemplates() });
    }
  },

  setSelectedCell: (cell) => {
    set({ selectedCell: cell });
  },

  setCurrentTemplate: (template) => {
    set({ currentTemplate: template });
  },
}));
