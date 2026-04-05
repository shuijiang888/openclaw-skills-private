"use client";

import { useEffect, useState } from "react";

type DataPoint = { label: string; value: number; max?: number };

type Props = {
  data: DataPoint[];
  size?: number;
  color?: string;
};

export function RadarChart({ data, size = 200, color = "#d97706" }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);

  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 30;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const pointAt = (i: number, r: number) => {
    const angle = -Math.PI / 2 + i * angleStep;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const levels = [0.25, 0.5, 0.75, 1];

  const dataPoints = data.map((d, i) => {
    const ratio = d.value / (d.max ?? 100);
    return pointAt(i, R * Math.min(1, Math.max(0, ratio)));
  });

  const pathD = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: size, maxHeight: size }}>
      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* level rings */}
      {levels.map(l => {
        const pts = Array.from({ length: n }, (_, i) => pointAt(i, R * l));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return <path key={l} d={d} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />;
      })}

      {/* axis lines */}
      {data.map((_, i) => {
        const p = pointAt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="0.5" />;
      })}

      {/* data polygon */}
      <path
        d={pathD}
        fill="url(#radar-fill)"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "scale(1)" : "scale(0.3)",
          transformOrigin: `${cx}px ${cy}px`,
          transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />

      {/* data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i} cx={p.x} cy={p.y} r="4"
          fill={color} stroke="white" strokeWidth="2"
          style={{
            opacity: mounted ? 1 : 0,
            transition: `opacity 0.3s ease ${i * 100 + 500}ms`,
          }}
        />
      ))}

      {/* labels */}
      {data.map((d, i) => {
        const p = pointAt(i, R + 18);
        return (
          <text key={i} x={p.x} y={p.y + 4} textAnchor="middle"
            fontSize="10" fontWeight="600" className="fill-slate-600">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}
