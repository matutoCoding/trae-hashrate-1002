import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepStatus = "pending" | "current" | "completed";

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  status: StepStatus;
  duration?: string;
  tips?: string[];
}

export interface StepTimelineProps {
  steps: StepItem[];
  className?: string;
}

export default function StepTimeline({ steps, className }: StepTimelineProps) {
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={22} className="text-bambooGreen-500" fill="currentColor" fillOpacity={0.15} />;
      case "current":
        return <Clock size={22} className="text-bambooGreen-600 animate-pulse-soft" />;
      case "pending":
      default:
        return <Circle size={22} className="text-bamboo-400" />;
    }
  };

  const getLineClass = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return "bg-bambooGreen-400";
      case "current":
      case "pending":
      default:
        return "bg-bamboo-200";
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="relative pl-2">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative pb-8 last:pb-0">
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[11px] top-7 w-[2px]",
                    getLineClass(step.status)
                  )}
                  style={{ height: "calc(100% - 28px)" }}
                />
              )}

              <div className="flex gap-4">
                <div className="flex-shrink-0 pt-1">{getStatusIcon(step.status)}</div>

                <div
                  className={cn(
                    "flex-1 rounded-xl border p-4 transition-all",
                    step.status === "current"
                      ? "border-bambooGreen-300 bg-bambooGreen-50/70 shadow-bamboo"
                      : step.status === "completed"
                      ? "border-bamboo-200 bg-bambooCream-50/60"
                      : "border-bamboo-100 bg-bambooCream-50/30 opacity-75"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        className={cn(
                          "font-song text-lg font-semibold",
                          step.status === "current"
                            ? "text-bambooGreen-700"
                            : step.status === "completed"
                            ? "text-bambooBrown-800"
                            : "text-bambooBrown-500"
                        )}
                      >
                        <span className="mr-2 text-sm font-normal opacity-60">
                          步骤 {index + 1}
                        </span>
                        {step.title}
                      </h3>
                      {step.description && (
                        <p
                          className={cn(
                            "mt-1 font-song text-sm",
                            step.status === "pending"
                              ? "text-bambooBrown-400"
                              : "text-bambooBrown-600"
                          )}
                        >
                          {step.description}
                        </p>
                      )}
                    </div>
                    {step.duration && (
                      <span
                        className={cn(
                          "flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1 font-kai text-xs",
                          step.status === "current"
                            ? "bg-bambooGreen-100 text-bambooGreen-700"
                            : "bg-bambooCream-200 text-bambooBrown-600"
                        )}
                      >
                        {step.duration}
                      </span>
                    )}
                  </div>

                  {step.tips && step.tips.length > 0 && step.status !== "pending" && (
                    <div className="mt-3 rounded-lg bg-bambooCream-100/60 p-3">
                      <p className="mb-1.5 font-kai text-xs font-semibold text-bambooBrown-600">
                        工艺要点：
                      </p>
                      <ul className="space-y-1">
                        {step.tips.map((tip, tipIndex) => (
                          <li
                            key={tipIndex}
                            className="flex items-start gap-2 font-song text-xs text-bambooBrown-600"
                          >
                            <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-bambooGreen-500" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
