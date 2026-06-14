import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MaterialItem {
  id: string;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  note?: string;
}

export interface MaterialGroup {
  id: string;
  name: string;
  items: MaterialItem[];
}

export interface MaterialTableProps {
  groups: MaterialGroup[];
  className?: string;
}

export default function MaterialTable({ groups, className }: MaterialTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.map((g) => g.id))
  );

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

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
  const totalQuantity = groups.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-bamboo-200 bg-bambooCream-50/80 shadow-bamboo",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-bamboo-200 bg-bambooCream-100/60 px-5 py-3">
        <span className="font-song text-base font-semibold text-bambooBrown-800">
          备料清单
        </span>
        <div className="flex items-center gap-4 font-song text-sm text-bambooBrown-600">
          <span>共 {groups.length} 组</span>
          <span>{totalItems} 项</span>
          <span className="text-bambooGreen-700 font-semibold">
            总量: {totalQuantity}
          </span>
        </div>
      </div>

      <div className="divide-y divide-bamboo-100">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const groupTotal = group.items.reduce((s, i) => s + i.quantity, 0);

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
                  <span className="font-song font-semibold text-bambooBrown-800">
                    {group.name}
                  </span>
                  <span className="tag-bamboo">{group.items.length} 项</span>
                </div>
                <span className="font-song text-sm text-bambooGreen-700">
                  小计: {groupTotal}
                </span>
              </div>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-bambooCream-100/40 text-left font-song text-sm text-bambooBrown-600">
                        <th className="px-5 py-2 font-medium">名称</th>
                        <th className="px-5 py-2 font-medium">规格</th>
                        <th className="px-5 py-2 font-medium text-right">数量</th>
                        <th className="px-5 py-2 font-medium">单位</th>
                        <th className="px-5 py-2 font-medium">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bamboo-100">
                      {group.items.map((item) => (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-bambooGreen-50/50"
                        >
                          <td className="px-5 py-3 font-song text-bambooBrown-800">
                            {item.name}
                          </td>
                          <td className="px-5 py-3 font-song text-bambooBrown-600">
                            {item.spec}
                          </td>
                          <td className="px-5 py-3 text-right font-song font-semibold text-bambooGreen-700">
                            {item.quantity}
                          </td>
                          <td className="px-5 py-3 font-song text-bambooBrown-600">
                            {item.unit}
                          </td>
                          <td className="px-5 py-3 font-song text-bambooBrown-500">
                            {item.note || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
