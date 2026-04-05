"use client";

import { useEffect, useState } from "react";

type Props = {
  value: number;
  max?: number;
  label?: string;
  size?: number;
};

export function GaugeChart({ value, max = 100, label, size = 160 }: Props) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimatedValue(value), 200);
    return () => clearTimeout(t);
  }, [value]);

  const cx = size / 2, cy = size / 2 + 10;
  const R = size / 2 - 20;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;

  const ratio = Math.min(1, Math.max(0, animatedValue / max));
  const currentAngle = startAngle + totalAngle * ratio;

  const arcPath = (fromDeg: number, toDeg: number, r: number) => {
    const from = (fromDeg * Math.PI) / 180;
    const to = (toDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(from);
    const y1 = cy + r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy + r * Math.sin(to);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const color = value >= 70 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: size, maxHeight: size }}>
        <defs>
          <linearGradient id={`gauge-grad-${label}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* background track */}
        <path d={arcPath(startAngle, endAngle, R)}
          fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />

        {/* value arc */}
        <path d={arcPath(startAngle, currentAngle, R)}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          style={{
            transition: "all 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />

        {/* center value */}
        <text x={cx} y={cy - 2} textAnchor="middle"
          fontSize="28" fontWeight="800" fill={color}
          className="tabular-nums">
          {Math.round(animatedValue)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle"
          fontSize="10" className="fill-slate-400" fontWeight="500">
          / {max}
        </text>
      </svg>
      {label && (
        <span className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</span>
      )}
    </div>
  );
}
