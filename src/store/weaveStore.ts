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
      set({ materials: [] });
      return;
    }

    const { rows, cols } = weaveMatrix;
    const { bambooWidth, bambooGap, finishedWidth, finishedHeight, lossRate } = weaveParams;

    const unitLength = bambooWidth + bambooGap;
    const warpCount = Math.ceil(finishedWidth / unitLength);
    const weftCount = Math.ceil(finishedHeight / unitLength);

    const materials: MaterialItem[] = [
      {
        id: generateId(),
        spec: '经篾',
        color: '本色',
        widthMm: bambooWidth,
        lengthMm: Math.ceil(finishedHeight * lossRate),
        count: Math.max(warpCount, cols),
        processIndex: 0,
      },
      {
        id: generateId(),
        spec: '纬篾',
        color: '本色',
        widthMm: bambooWidth,
        lengthMm: Math.ceil(finishedWidth * lossRate),
        count: Math.max(weftCount, rows),
        processIndex: 1,
      },
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
        materials: template.materials,
        validationResult: null,
        selectedCell: null,
      });
    }
  },

  deleteTemplate: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
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

      const templates = [...get().templates, template];
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
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        const templates = JSON.parse(stored) as PatternTemplate[];
        set({ templates });
      }
    } catch (e) {
      console.error('Failed to load templates from localStorage:', e);
      set({ templates: [] });
    }
  },

  setSelectedCell: (cell) => {
    set({ selectedCell: cell });
  },

  setCurrentTemplate: (template) => {
    set({ currentTemplate: template });
  },
}));
