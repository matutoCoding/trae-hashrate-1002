import { useState, useEffect, useMemo } from 'react';
import {
  List,
  Calculator,
  Plus,
  Download,
  TrendingUp,
  Package,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Ruler,
  Layers,
  AlertCircle,
  Edit2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWeaveStore } from '@/store/weaveStore';
import { calcMaterials } from '@/utils/algorithms/calculator';
import type { MaterialItem } from '@/types';

interface MaterialGroupData {
  id: string;
  name: string;
  items: MaterialItem[];
}

const PROCESS_NAMES = ['起篾工序', '编织工序', '收边工序', '装饰工序'];

const COLOR_MAP: Record<string, string> = {
  本色: 'bg-bamboo-300',
  碳化: 'bg-bambooBrown-500',
  竹青: 'bg-bambooGreen-400',
  染色红: 'bg-red-500',
  染色蓝: 'bg-blue-500',
  染色绿: 'bg-green-500',
  染色黄: 'bg-yellow-500',
  染色黑: 'bg-gray-800',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const MOCK_MATERIALS: MaterialItem[] = [
  { id: generateId(), spec: '经篾-主骨架', color: '本色', widthMm: 5, lengthMm: 420, count: 60, processIndex: 0 },
  { id: generateId(), spec: '经篾-加强', color: '碳化', widthMm: 6, lengthMm: 420, count: 12, processIndex: 0 },
  { id: generateId(), spec: '经篾-边框', color: '本色', widthMm: 8, lengthMm: 450, count: 8, processIndex: 0 },
  { id: generateId(), spec: '纬篾-基础', color: '本色', widthMm: 5, lengthMm: 380, count: 72, processIndex: 1 },
  { id: generateId(), spec: '纬篾-花纹', color: '竹青', widthMm: 4, lengthMm: 380, count: 24, processIndex: 1 },
  { id: generateId(), spec: '纬篾-花纹', color: '染色红', widthMm: 4, lengthMm: 380, count: 12, processIndex: 1 },
  { id: generateId(), spec: '收边篾', color: '碳化', widthMm: 6, lengthMm: 500, count: 16, processIndex: 2 },
  { id: generateId(), spec: '装饰篾-图案', color: '染色蓝', widthMm: 3, lengthMm: 200, count: 30, processIndex: 3 },
  { id: generateId(), spec: '装饰篾-镶边', color: '染色黄', widthMm: 3, lengthMm: 150, count: 20, processIndex: 3 },
];

export default function MaterialList() {
  const { weaveParams, setParams, calculateMaterials, materials } = useWeaveStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['warp', 'weft', 'color']));
  const [localMaterials, setLocalMaterials] = useState<MaterialItem[]>(MOCK_MATERIALS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MaterialItem>>({
    spec: '',
    color: '本色',
    widthMm: 5,
    lengthMm: 300,
    count: 10,
    processIndex: 0,
  });

  useEffect(() => {
    if (materials.length > 0) {
      setLocalMaterials(materials);
    }
  }, [materials]);

  const groups = useMemo<MaterialGroupData[]>(() => {
    const warpItems = localMaterials.filter((m) => m.spec.includes('经篾'));
    const weftItems = localMaterials.filter((m) => m.spec.includes('纬篾'));
    const otherItems = localMaterials.filter(
      (m) => !m.spec.includes('经篾') && !m.spec.includes('纬篾')
    );

    return [
      { id: 'warp', name: '经篾组', items: warpItems },
      { id: 'weft', name: '纬篾组', items: weftItems },
      { id: 'color', name: '配色篾组', items: otherItems },
    ];
  }, [localMaterials]);

  const totals = useMemo(() => {
    const totalCount = localMaterials.reduce((sum, m) => sum + m.count, 0);
    const totalLengthMm = localMaterials.reduce((sum, m) => sum + m.lengthMm * m.count, 0);
    const totalLengthM = totalLengthMm / 1000;
    const warpCount = localMaterials.filter((m) => m.spec.includes('经篾')).reduce((s, m) => s + m.count, 0);
    const weftCount = localMaterials.filter((m) => m.spec.includes('纬篾')).reduce((s, m) => s + m.count, 0);
    const estimatedWeightKg = (totalLengthMm * 0.0008 * weaveParams.bambooWidth).toFixed(2);
    return { totalCount, totalLengthMm, totalLengthM, warpCount, weftCount, estimatedWeightKg };
  }, [localMaterials, weaveParams.bambooWidth]);

  const lossData = useMemo(() => {
    const lossRate = weaveParams.lossRate;
    const theoreticalLengthM = totals.totalLengthM / lossRate;
    const actualLengthM = totals.totalLengthM;
    const lossLengthM = actualLengthM - theoreticalLengthM;
    return {
      lossRate: ((lossRate - 1) * 100).toFixed(1),
      theoretical: theoreticalLengthM.toFixed(2),
      actual: actualLengthM.toFixed(2),
      loss: lossLengthM.toFixed(2),
    };
  }, [totals, weaveParams.lossRate]);

  const processDistribution = useMemo(() => {
    const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    localMaterials.forEach((m) => {
      dist[m.processIndex] = (dist[m.processIndex] || 0) + m.count;
    });
    const maxVal = Math.max(...Object.values(dist), 1);
    return Object.entries(dist).map(([idx, count]) => ({
      index: Number(idx),
      name: PROCESS_NAMES[Number(idx)] || `工序${idx}`,
      count,
      percent: (count / maxVal) * 100,
    }));
  }, [localMaterials]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleRecalculate = () => {
    calculateMaterials();
  };

  const handleAddItem = () => {
    if (!newItem.spec) return;
    const item: MaterialItem = {
      id: generateId(),
      spec: newItem.spec || '',
      color: newItem.color || '本色',
      widthMm: newItem.widthMm || 5,
      lengthMm: newItem.lengthMm || 300,
      count: newItem.count || 10,
      processIndex: newItem.processIndex || 0,
    };
    setLocalMaterials((prev) => [...prev, item]);
    setShowAddForm(false);
    setNewItem({ spec: '', color: '本色', widthMm: 5, lengthMm: 300, count: 10, processIndex: 0 });
  };

  const handleDeleteItem = (id: string) => {
    setLocalMaterials((prev) => prev.filter((m) => m.id !== id));
  };

  const handleExport = () => {
    const data = {
      exportTime: new Date().toISOString(),
      params: weaveParams,
      materials: localMaterials,
      totals: {
        totalCount: totals.totalCount,
        totalLengthM: totals.totalLengthM.toFixed(2),
        estimatedWeightKg: totals.estimatedWeightKg,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `备料清单_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParamChange = (key: keyof typeof weaveParams, value: number) => {
    setParams({ [key]: value });
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="card-bamboo flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bambooGreen-100">
              <List className="h-5 w-5 text-bambooGreen-600" />
            </div>
            <div>
              <h1 className="font-song text-xl font-bold text-bambooBrown-800">备料清单</h1>
              <p className="font-song text-sm text-bambooBrown-500">
                根据工艺参数自动计算篾条用量与损耗预估
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleRecalculate} className="btn-primary flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              重新计算
            </button>
            <button onClick={() => setShowAddForm(true)} className="btn-secondary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              添加备料项
            </button>
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <Download className="h-4 w-4" />
              导出清单
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="card-bamboo">
              <div className="mb-4 flex items-center gap-2 border-b border-bamboo-200 pb-3">
                <Ruler className="h-4 w-4 text-bambooGreen-600" />
                <h2 className="font-song text-base font-semibold text-bambooBrown-800">工艺参数设置</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className="label-bamboo">篾宽 (mm)</label>
                  <input
                    type="number"
                    className="input-bamboo"
                    value={weaveParams.bambooWidth}
                    onChange={(e) => handleParamChange('bambooWidth', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label-bamboo">间隙 (mm)</label>
                  <input
                    type="number"
                    className="input-bamboo"
                    value={weaveParams.bambooGap}
                    onChange={(e) => handleParamChange('bambooGap', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label-bamboo">损耗系数</label>
                  <input
                    type="number"
                    step="0.05"
                    className="input-bamboo"
                    value={weaveParams.lossRate}
                    onChange={(e) => handleParamChange('lossRate', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label-bamboo">成品宽 (cm)</label>
                  <input
                    type="number"
                    className="input-bamboo"
                    value={weaveParams.finishedWidth}
                    onChange={(e) => handleParamChange('finishedWidth', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label-bamboo">成品高 (cm)</label>
                  <input
                    type="number"
                    className="input-bamboo"
                    value={weaveParams.finishedHeight}
                    onChange={(e) => handleParamChange('finishedHeight', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {showAddForm && (
              <div className="card-bamboo border-bambooGreen-300">
                <div className="mb-4 flex items-center justify-between border-b border-bamboo-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-bambooGreen-600" />
                    <h2 className="font-song text-base font-semibold text-bambooBrown-800">添加备料项</h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <div>
                    <label className="label-bamboo">规格</label>
                    <input
                      type="text"
                      className="input-bamboo"
                      placeholder="如：经篾-主骨架"
                      value={newItem.spec}
                      onChange={(e) => setNewItem((p) => ({ ...p, spec: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label-bamboo">颜色</label>
                    <select
                      className="input-bamboo"
                      value={newItem.color}
                      onChange={(e) => setNewItem((p) => ({ ...p, color: e.target.value }))}
                    >
                      {Object.keys(COLOR_MAP).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-bamboo">篾宽 (mm)</label>
                    <input
                      type="number"
                      className="input-bamboo"
                      value={newItem.widthMm}
                      onChange={(e) => setNewItem((p) => ({ ...p, widthMm: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="label-bamboo">篾长 (mm)</label>
                    <input
                      type="number"
                      className="input-bamboo"
                      value={newItem.lengthMm}
                      onChange={(e) => setNewItem((p) => ({ ...p, lengthMm: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="label-bamboo">数量 (根)</label>
                    <input
                      type="number"
                      className="input-bamboo"
                      value={newItem.count}
                      onChange={(e) => setNewItem((p) => ({ ...p, count: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="label-bamboo">所属工序</label>
                    <select
                      className="input-bamboo"
                      value={newItem.processIndex}
                      onChange={(e) => setNewItem((p) => ({ ...p, processIndex: Number(e.target.value) }))}
                    >
                      {PROCESS_NAMES.map((n, i) => (
                        <option key={i} value={i}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button className="btn-secondary" onClick={() => setShowAddForm(false)}>取消</button>
                  <button className="btn-primary" onClick={handleAddItem}>确认添加</button>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-bamboo-200 bg-bambooCream-50/80 shadow-bamboo">
              <div className="border-b border-bamboo-200 bg-bambooCream-100/60 px-5 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-song text-base font-semibold text-bambooBrown-800">
                    备料明细
                  </span>
                  <div className="flex items-center gap-4 font-song text-sm text-bambooBrown-600">
                    <span>共 {groups.length} 组</span>
                    <span>{localMaterials.length} 项</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-bamboo-100">
                {groups.map((group) => {
                  const isExpanded = expandedGroups.has(group.id);
                  const groupCount = group.items.reduce((s, i) => s + i.count, 0);
                  const groupLength = group.items.reduce((s, i) => s + i.lengthMm * i.count, 0);

                  return (
                    <div key={group.id}>
                      <div
                        className={cn(
                          "flex cursor-pointer items-center justify-between bg-bambooCream-50 px-5 py-3 transition-colors hover:bg-bambooCream-100/60",
                          !isExpanded && "border-b border-bamboo-100"
                        )}
                        onClick={() => toggleGroup(group.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown size={18} className="text-bambooGreen-600" />
                          ) : (
                            <ChevronRight size={18} className="text-bambooBrown-500" />
                          )}
                          <Layers size={16} className="text-bambooGreen-500" />
                          <span className="font-song font-semibold text-bambooBrown-800">
                            {group.name}
                          </span>
                          <span className="tag-bamboo">{group.items.length} 项</span>
                        </div>
                        <div className="flex items-center gap-4 font-song text-sm">
                          <span className="text-bambooBrown-600">
                            小计数量: <span className="font-semibold text-bambooGreen-700">{groupCount} 根</span>
                          </span>
                          <span className="text-bambooBrown-600">
                            小计长度: <span className="font-semibold text-bambooGreen-700">{(groupLength / 1000).toFixed(2)} m</span>
                          </span>
                        </div>
                      </div>

                      {isExpanded && group.items.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-bambooCream-100/40 text-left font-song text-sm text-bambooBrown-600">
                                <th className="px-5 py-2 font-medium">规格</th>
                                <th className="px-5 py-2 font-medium">颜色</th>
                                <th className="px-5 py-2 font-medium text-right">篾宽(mm)</th>
                                <th className="px-5 py-2 font-medium text-right">篾长(mm)</th>
                                <th className="px-5 py-2 font-medium text-right">数量(根)</th>
                                <th className="px-5 py-2 font-medium">所属工序</th>
                                <th className="px-5 py-2 font-medium text-right">小计(m)</th>
                                <th className="px-5 py-2 font-medium">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-bamboo-100">
                              {group.items.map((item) => (
                                <tr
                                  key={item.id}
                                  className="transition-colors hover:bg-bambooGreen-50/50"
                                >
                                  <td className="px-5 py-3 font-song text-bambooBrown-800">
                                    {item.spec}
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "inline-block h-4 w-4 rounded border border-bamboo-400",
                                          COLOR_MAP[item.color] || "bg-bamboo-300"
                                        )}
                                      />
                                      <span className="font-song text-bambooBrown-600">
                                        {item.color}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3 text-right font-song text-bambooBrown-700">
                                    {item.widthMm}
                                  </td>
                                  <td className="px-5 py-3 text-right font-song text-bambooBrown-700">
                                    {item.lengthMm}
                                  </td>
                                  <td className="px-5 py-3 text-right font-song font-semibold text-bambooGreen-700">
                                    {item.count}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="tag-bamboo">
                                      {PROCESS_NAMES[item.processIndex] || `工序${item.processIndex}`}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3 text-right font-song font-semibold text-bambooBrown-800">
                                    {((item.lengthMm * item.count) / 1000).toFixed(2)}
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-warning hover:text-warning-dark transition-colors"
                                        title="删除"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {isExpanded && group.items.length === 0 && (
                        <div className="px-5 py-8 text-center font-song text-bambooBrown-400">
                          暂无备料数据
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t-2 border-bambooGreen-400 bg-gradient-to-r from-bambooGreen-100 via-bambooGreen-50 to-bamboo-100 px-5 py-4">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="font-song text-xs text-bambooBrown-500 mb-1">总数量</div>
                    <div className="font-song text-2xl font-bold text-bambooGreen-700">
                      {totals.totalCount}
                      <span className="ml-1 text-sm font-normal text-bambooBrown-600">根</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-song text-xs text-bambooBrown-500 mb-1">总长度</div>
                    <div className="font-song text-2xl font-bold text-bambooGreen-700">
                      {totals.totalLengthM.toFixed(2)}
                      <span className="ml-1 text-sm font-normal text-bambooBrown-600">米</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-song text-xs text-bambooBrown-500 mb-1">预估重量</div>
                    <div className="font-song text-2xl font-bold text-bambooBrown-700">
                      {totals.estimatedWeightKg}
                      <span className="ml-1 text-sm font-normal text-bambooBrown-600">kg</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-song text-xs text-bambooBrown-500 mb-1">经/纬比</div>
                    <div className="font-song text-2xl font-bold text-bambooBrown-700">
                      {totals.warpCount}:{totals.weftCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="card-bamboo">
              <div className="mb-4 flex items-center gap-2 border-b border-bamboo-200 pb-3">
                <Package className="h-4 w-4 text-bambooGreen-600" />
                <h3 className="font-song text-base font-semibold text-bambooBrown-800">材料统计</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-bambooGreen-200 bg-bambooGreen-50/50 p-3">
                  <div className="font-song text-xs text-bambooBrown-500">总用篾量</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-song text-xl font-bold text-bambooGreen-700">
                      {totals.totalCount}
                    </span>
                    <span className="font-song text-xs text-bambooBrown-500">根</span>
                  </div>
                </div>
                <div className="rounded-lg border border-bambooGreen-200 bg-bambooGreen-50/50 p-3">
                  <div className="font-song text-xs text-bambooBrown-500">总长度</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-song text-xl font-bold text-bambooGreen-700">
                      {totals.totalLengthM.toFixed(1)}
                    </span>
                    <span className="font-song text-xs text-bambooBrown-500">米</span>
                  </div>
                </div>
                <div className="rounded-lg border border-bamboo-200 bg-bamboo-50/50 p-3">
                  <div className="font-song text-xs text-bambooBrown-500">经篾数</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-song text-xl font-bold text-bambooBrown-700">
                      {totals.warpCount}
                    </span>
                    <span className="font-song text-xs text-bambooBrown-500">根</span>
                  </div>
                </div>
                <div className="rounded-lg border border-bamboo-200 bg-bamboo-50/50 p-3">
                  <div className="font-song text-xs text-bambooBrown-500">纬篾数</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-song text-xl font-bold text-bambooBrown-700">
                      {totals.weftCount}
                    </span>
                    <span className="font-song text-xs text-bambooBrown-500">根</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-bamboo">
              <div className="mb-4 flex items-center gap-2 border-b border-bamboo-200 pb-3">
                <TrendingUp className="h-4 w-4 text-bambooGreen-600" />
                <h3 className="font-song text-base font-semibold text-bambooBrown-800">损耗预估</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md bg-bamboo-100/50 px-3 py-2">
                  <span className="font-song text-sm text-bambooBrown-600 flex items-center gap-1">
                    <AlertCircle size={14} className="text-warning" />
                    损耗系数
                  </span>
                  <span className="font-song text-sm font-bold text-warning">
                    {lossData.lossRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="font-song text-sm text-bambooBrown-600">理论用量</span>
                  <span className="font-song text-sm font-semibold text-bambooBrown-700">
                    {lossData.theoretical} m
                  </span>
                </div>
                <div className="flex items-center justify-between px-1 py-1">
                  <span className="font-song text-sm text-bambooBrown-600">实际用量</span>
                  <span className="font-song text-sm font-semibold text-bambooGreen-700">
                    {lossData.actual} m
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-warning/10 px-3 py-2">
                  <span className="font-song text-sm text-bambooBrown-700">损耗量</span>
                  <span className="font-song text-sm font-bold text-warning">
                    +{lossData.loss} m
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex justify-between font-song text-xs text-bambooBrown-500">
                    <span>理论</span>
                    <span>实际</span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-bamboo-100">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-bambooGreen-400/60"
                      style={{
                        width: `${(Number(lossData.theoretical) / Number(lossData.actual)) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute top-0 h-full rounded-full bg-warning/60"
                      style={{
                        left: `${(Number(lossData.theoretical) / Number(lossData.actual)) * 100}%`,
                        width: `${(Number(lossData.loss) / Number(lossData.actual)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card-bamboo">
              <div className="mb-4 flex items-center gap-2 border-b border-bamboo-200 pb-3">
                <BarChart3 className="h-4 w-4 text-bambooGreen-600" />
                <h3 className="font-song text-base font-semibold text-bambooBrown-800">工序分布</h3>
              </div>
              <div className="space-y-3">
                {processDistribution.map((item) => (
                  <div key={item.index}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-song text-xs text-bambooBrown-600">{item.name}</span>
                      <span className="font-song text-xs font-semibold text-bambooGreen-700">
                        {item.count} 根
                      </span>
                    </div>
                    <div className="relative h-5 overflow-hidden rounded-md bg-bambooCream-100">
                      <div
                        className={cn(
                          "h-full rounded-md transition-all duration-500",
                          item.index === 0 && "bg-gradient-to-r from-bambooGreen-400 to-bambooGreen-500",
                          item.index === 1 && "bg-gradient-to-r from-bamboo-400 to-bamboo-500",
                          item.index === 2 && "bg-gradient-to-r from-bambooBrown-400 to-bambooBrown-500",
                          item.index === 3 && "bg-gradient-to-r from-bambooGreen-300 to-bambooGreen-400"
                        )}
                        style={{ width: `${Math.max(item.percent, 5)}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center font-song text-xs font-medium text-white drop-shadow-sm">
                        {item.percent > 15 ? `${item.count}根` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
