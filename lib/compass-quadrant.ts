/** 与种子 / 设计文档一致的默认阈值（百分数，与 DB 中 grossMargin、growth 同口径） */
export const COMPASS_QUADRANT_DEFAULTS = {
  marginHighPct: 60,
  growthHighPct: 60,
} as const;

export type CompassQuadrantCode = "STAR" | "CASH_COW" | "QUESTION" | "DOG";

export type CompassQuadrantThresholds = {
  marginHighPct: number;
  growthHighPct: number;
};

export function computeCompassQuadrant(
  grossMargin: number,
  growth: number,
  t: CompassQuadrantThresholds,
): CompassQuadrantCode {
  const highM = grossMargin >= t.marginHighPct;
  const highG = growth >= t.growthHighPct;
  if (highM && highG) return "STAR";
  if (highM && !highG) return "CASH_COW";
  if (!highM && highG) return "QUESTION";
  return "DOG";
}

export function normalizeCompassThresholds(
  marginHighPct: unknown,
  growthHighPct: unknown,
): CompassQuadrantThresholds | null {
  const m = typeof marginHighPct === "number" ? marginHighPct : Number(marginHighPct);
  const g = typeof growthHighPct === "number" ? growthHighPct : Number(growthHighPct);
  if (!Number.isFinite(m) || !Number.isFinite(g)) return null;
  if (m < 0 || m > 100 || g < 0 || g > 100) return null;
  return { marginHighPct: m, growthHighPct: g };
}
