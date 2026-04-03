import {
  COMPASS_QUADRANT_DEFAULTS,
  type CompassQuadrantThresholds,
} from "@/lib/compass-quadrant";
import { prisma } from "@/lib/prisma";

type ThresholdDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<{
    marginHighPct: number;
    growthHighPct: number;
    updatedAt: Date;
  } | null>;
  upsert: (args: unknown) => Promise<{
    marginHighPct: number;
    growthHighPct: number;
    updatedAt: Date;
  }>;
};

function getThresholdDelegate(): ThresholdDelegate | undefined {
  const d = (
    prisma as unknown as { compassQuadrantThreshold?: ThresholdDelegate }
  ).compassQuadrantThreshold;
  if (!d || typeof d.findUnique !== "function") return undefined;
  return d;
}

/** 供 GET `/api/console/compass-quadrant-threshold`：含 persisted / updatedAt */
export async function tryGetCompassQuadrantThresholdRow(): Promise<{
  id: string;
  marginHighPct: number;
  growthHighPct: number;
  updatedAt: string | null;
  persisted: boolean;
}> {
  const id = "default";
  try {
    const delegate = getThresholdDelegate();
    if (!delegate) {
      return { id, ...COMPASS_QUADRANT_DEFAULTS, updatedAt: null, persisted: false };
    }
    const row = await delegate.findUnique({ where: { id } });
    if (!row) {
      return { id, ...COMPASS_QUADRANT_DEFAULTS, updatedAt: null, persisted: false };
    }
    return {
      id,
      marginHighPct: row.marginHighPct,
      growthHighPct: row.growthHighPct,
      updatedAt: row.updatedAt.toISOString(),
      persisted: true,
    };
  } catch {
    return { id, ...COMPASS_QUADRANT_DEFAULTS, updatedAt: null, persisted: false };
  }
}

/** 旧 Client / 未 db push 时避免整页 500，回退默认阈值 */
export async function loadCompassQuadrantThresholdsSafe(): Promise<CompassQuadrantThresholds> {
  const r = await tryGetCompassQuadrantThresholdRow();
  return { marginHighPct: r.marginHighPct, growthHighPct: r.growthHighPct };
}

export async function upsertCompassQuadrantThresholdSafe(
  data: CompassQuadrantThresholds,
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  try {
    const delegate = getThresholdDelegate();
    if (!delegate || typeof delegate.upsert !== "function") {
      return {
        ok: false,
        error:
          "数据库未就绪：请在 profit-web 执行 npx prisma generate && npx prisma db push && npm run db:seed，然后重启 npm run dev",
      };
    }
    const row = await delegate.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: { ...data },
    });
    return { ok: true, updatedAt: row.updatedAt.toISOString() };
  } catch {
    return {
      ok: false,
      error:
        "写入失败：请确认已 npx prisma db push 且 dev.db 可写，并已执行 npx prisma generate",
    };
  }
}
