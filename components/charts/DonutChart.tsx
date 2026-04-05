"use client";

import { useEffect, useState } from "react";

type Segment = { label: string; value: number; color: string };

type Props = {
  segments: Segment[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
};

export function DonutChart({ segments, size = 180, centerLabel, centerValue }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(t);
  }, []);

  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 10;
  const r = R * 0.6;
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  let cumAngle = -90;
  const arcs = segments.map((seg) => {
    const angle = total > 0 ? (seg.value / total) * 360 : 0;
    const startAngle = cumAngle;
    cumAngle += angle;
    return { ...seg, startAngle, angle };
  });

  const describeArc = (startDeg: number, angleDeg: number, outerR: number, innerR: number) => {
    if (angleDeg >= 360) angleDeg = 359.99;
    const s = (startDeg * Math.PI) / 180;
    const e = ((startDeg + angleDeg) * Math.PI) / 180;
    const x1o = cx + outerR * Math.cos(s), y1o = cy + outerR * Math.sin(s);
    const x2o = cx + outerR * Math.cos(e), y2o = cy + outerR * Math.sin(e);
    const x1i = cx + innerR * Math.cos(e), y1i = cy + innerR * Math.sin(e);
    const x2i = cx + innerR * Math.cos(s), y2i = cy + innerR * Math.sin(s);
    const large = angleDeg > 180 ? 1 : 0;
    return `M ${x1o} ${y1o} A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${large} 0 ${x2i} ${y2i} Z`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: size, maxHeight: size }}>
        <defs>
          <filter id="donut-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
          </filter>
        </defs>
        {arcs.map((arc, i) => (
          <path
            key={i}
            d={describeArc(arc.startAngle, arc.angle, R, r)}
            fill={arc.color}
            filter="url(#donut-shadow)"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? "scale(1)" : "scale(0.8)",
              transformOrigin: `${cx}px ${cy}px`,
              transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 120}ms`,
            }}
          />
        ))}
        {centerValue && (
          <>
            <text x={cx} y={cy - 4} textAnchor="middle"
              fontSize="22" fontWeight="800" className="fill-slate-900 dark:fill-white tabular-nums">
              {centerValue}
            </text>
            {centerLabel && (
              <text x={cx} y={cy + 14} textAnchor="middle"
                fontSize="10" className="fill-slate-400" fontWeight="500">
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
            <span className="text-slate-600 dark:text-slate-400">{seg.label}</span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-white">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
