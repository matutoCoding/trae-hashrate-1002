import { cn } from "@/lib/utils";

export interface GaugeMeterProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  unit?: string;
}

export default function GaugeMeter({
  value,
  max,
  label,
  color = "#5B9D57",
  size = 140,
  strokeWidth = 10,
  className,
  unit = "%",
}: GaugeMeterProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const dashOffset = circumference - (percentage / 100) * circumference;

  const displayValue = ((value / max) * 100).toFixed(1);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E0D4AC"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-song text-2xl font-bold"
            style={{ color }}
          >
            {displayValue}
            <span className="text-sm font-medium ml-0.5">{unit}</span>
          </span>
        </div>
      </div>
      <span className="mt-2 font-kai text-sm text-bambooBrown-700">{label}</span>
    </div>
  );
}
