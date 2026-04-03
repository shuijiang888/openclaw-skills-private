"use client";

import { useEffect, useState } from "react";

type DataPoint = {
  id: string;
  name: string;
  customerName: string;
  grossMargin: number;
  growth: number;
  quadrant: string;
  sortOrder: number;
};

type Props = {
  items: DataPoint[];
  marginThreshold: number;
  growthThreshold: number;
};

const QUADRANT_COLORS: Record<string, { fill: string; bg: string; label: string }> = {
  STAR: { fill: "#10b981", bg: "rgba(16, 185, 129, 0.06)", label: "明星" },
  CASH_COW: { fill: "#0ea5e9", bg: "rgba(14, 165, 233, 0.06)", label: "现金牛" },
  QUESTION: { fill: "#f59e0b", bg: "rgba(245, 158, 11, 0.06)", label: "问题" },
  DOG: { fill: "#ef4444", bg: "rgba(239, 68, 68, 0.06)", label: "瘦狗" },
};

export function CompassScatterChart({ items, marginThreshold, growthThreshold }: Props) {
  const [mounted, setMounted] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const W = 600, H = 420;
  const PAD = { top: 40, right: 30, bottom: 50, left: 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const margins = items.map(i => i.grossMargin);
  const growths = items.map(i => i.growth);
  const xMin = Math.min(0, ...growths) - 5;
  const xMax = Math.max(40, ...growths) + 5;
  const yMin = Math.min(0, ...margins) - 5;
  const yMax = Math.max(45, ...margins) + 5;

  const scaleX = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const scaleY = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const threshX = scaleX(growthThreshold);
  const threshY = scaleY(marginThreshold);

  const hovered = items.find(i => i.id === hoveredId);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 420 }}>
        <defs>
          <filter id="bubble-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.15" />
          </filter>
          <linearGradient id="grid-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="url(#grid-fade)" rx="4" />

        {/* quadrant backgrounds */}
        <rect x={PAD.left} y={PAD.top} width={threshX - PAD.left} height={threshY - PAD.top}
          fill={QUADRANT_COLORS.STAR.bg} rx="4" />
        <rect x={threshX} y={PAD.top} width={PAD.left + plotW - threshX} height={threshY - PAD.top}
          fill={QUADRANT_COLORS.CASH_COW.bg} rx="4" />
        <rect x={PAD.left} y={threshY} width={threshX - PAD.left} height={PAD.top + plotH - threshY}
          fill={QUADRANT_COLORS.QUESTION.bg} rx="4" />
        <rect x={threshX} y={threshY} width={PAD.left + plotW - threshX} height={PAD.top + plotH - threshY}
          fill={QUADRANT_COLORS.DOG.bg} rx="4" />

        {/* grid lines */}
        {[0, 10, 20, 30, 40].filter(v => v >= yMin && v <= yMax).map(v => (
          <g key={`gy-${v}`}>
            <line x1={PAD.left} y1={scaleY(v)} x2={PAD.left + plotW} y2={scaleY(v)}
              stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x={PAD.left - 8} y={scaleY(v) + 4} textAnchor="end"
              className="fill-slate-400" fontSize="10">{v}%</text>
          </g>
        ))}
        {[0, 10, 20, 30, 40].filter(v => v >= xMin && v <= xMax).map(v => (
          <g key={`gx-${v}`}>
            <line x1={scaleX(v)} y1={PAD.top} x2={scaleX(v)} y2={PAD.top + plotH}
              stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x={scaleX(v)} y={PAD.top + plotH + 18} textAnchor="middle"
              className="fill-slate-400" fontSize="10">{v > 0 ? "+" : ""}{v}%</text>
          </g>
        ))}

        {/* threshold lines */}
        <line x1={threshX} y1={PAD.top} x2={threshX} y2={PAD.top + plotH}
          stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,3" />
        <line x1={PAD.left} y1={threshY} x2={PAD.left + plotW} y2={threshY}
          stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="6,3" />

        {/* quadrant labels */}
        <text x={PAD.left + 10} y={PAD.top + 18} fontSize="11" fontWeight="600" className="fill-emerald-600" opacity="0.7">明星</text>
        <text x={PAD.left + plotW - 10} y={PAD.top + 18} fontSize="11" fontWeight="600" className="fill-sky-600" opacity="0.7" textAnchor="end">现金牛</text>
        <text x={PAD.left + 10} y={PAD.top + plotH - 8} fontSize="11" fontWeight="600" className="fill-amber-600" opacity="0.7">问题</text>
        <text x={PAD.left + plotW - 10} y={PAD.top + plotH - 8} fontSize="11" fontWeight="600" className="fill-red-500" opacity="0.7" textAnchor="end">瘦狗</text>

        {/* data points with entrance animation */}
        {items.map((item, idx) => {
          const cx = scaleX(item.growth);
          const cy = scaleY(item.grossMargin);
          const qc = QUADRANT_COLORS[item.quadrant] ?? QUADRANT_COLORS.DOG;
          const isHovered = item.id === hoveredId;
          const r = isHovered ? 10 : 7;

          return (
            <g key={item.id}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={cx} cy={cy} r={r}
                fill={qc.fill}
                fillOpacity={isHovered ? 0.95 : 0.75}
                stroke="white" strokeWidth="2"
                filter="url(#bubble-shadow)"
                style={{
                  transform: mounted ? "scale(1)" : "scale(0)",
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 60}ms, r 0.2s ease`,
                }}
              />
              <text
                x={cx} y={cy + 3.5}
                textAnchor="middle" fontSize="8" fontWeight="700"
                fill="white"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.3s ease ${idx * 60 + 300}ms`,
                  pointerEvents: "none",
                }}
              >
                {item.sortOrder}
              </text>
            </g>
          );
        })}

        {/* axis labels */}
        <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle"
          fontSize="11" fontWeight="600" className="fill-slate-500">
          增长率 →
        </text>
        <text x={14} y={PAD.top + plotH / 2} textAnchor="middle"
          fontSize="11" fontWeight="600" className="fill-slate-500"
          transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}>
          毛利率 →
        </text>
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
          style={{ minWidth: 220 }}>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: (QUADRANT_COLORS[hovered.quadrant] ?? QUADRANT_COLORS.DOG).fill }} />
            <span className="text-sm font-bold text-slate-900 dark:text-white">#{hovered.sortOrder} {hovered.name}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-slate-500">客户</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">{hovered.customerName}</span>
            <span className="text-slate-500">毛利率</span>
            <span className="font-bold tabular-nums" style={{ color: (QUADRANT_COLORS[hovered.quadrant] ?? QUADRANT_COLORS.DOG).fill }}>
              {hovered.grossMargin.toFixed(1)}%
            </span>
            <span className="text-slate-500">增长率</span>
            <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
              {hovered.growth > 0 ? "+" : ""}{hovered.growth.toFixed(1)}%
            </span>
            <span className="text-slate-500">象限</span>
            <span className="font-medium" style={{ color: (QUADRANT_COLORS[hovered.quadrant] ?? QUADRANT_COLORS.DOG).fill }}>
              {(QUADRANT_COLORS[hovered.quadrant] ?? QUADRANT_COLORS.DOG).label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
