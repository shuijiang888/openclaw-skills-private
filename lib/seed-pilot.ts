import type { DemoRole } from "@/lib/approval";

export const SEED_PILOT_ACTIVE_STATUSES = [
  "INVITED",
  "ACTIVATED",
  "FEEDBACK",
  "DONE",
  "DROPPED",
] as const;

export type SeedPilotActiveStatus = (typeof SEED_PILOT_ACTIVE_STATUSES)[number];
export type PilotStage = SeedPilotActiveStatus;

export type PilotSeedUser = {
  email: string;
  role: DemoRole;
  name: string;
};

export const SEED_PILOT_ROLE_ORDER: DemoRole[] = [
  "SDR",
  "AE",
  "PRE_SALES",
  "SALES_MANAGER",
  "VP",
];

export const defaultSeedPilotSlaByStage: Record<SeedPilotActiveStatus, number> = {
  INVITED: 2,
  ACTIVATED: 3,
  FEEDBACK: 7,
  DONE: 9999,
  DROPPED: 9999,
};

export function isSeedPilotActiveStatus(v: string): v is SeedPilotActiveStatus {
  return (SEED_PILOT_ACTIVE_STATUSES as readonly string[]).includes(v);
}

export function normalizeSeedPilotStatus(raw: unknown): SeedPilotActiveStatus | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  return isSeedPilotActiveStatus(s) ? s : null;
}

export function seedPilotStatusLabel(status: SeedPilotActiveStatus): string {
  switch (status) {
    case "INVITED":
      return "已邀请";
    case "ACTIVATED":
      return "已激活";
    case "FEEDBACK":
      return "待反馈";
    case "DONE":
      return "已完成";
    case "DROPPED":
      return "已退出";
    default:
      return status;
  }
}

export function seedPilotFeedbackSummaryLabel(kind: string): string {
  switch (kind) {
    case "BUG":
      return "Bug";
    case "GAP":
      return "能力缺口";
    case "UX":
      return "体验优化";
    case "VALUE":
      return "业务价值";
    default:
      return kind;
  }
}

export function stageSlaDays(stage: SeedPilotActiveStatus): number {
  return defaultSeedPilotSlaByStage[stage];
}

export function calcSeedPilotSlaOverdueDays(args: {
  stage: SeedPilotActiveStatus;
  invitedAt: Date | null;
  activatedAt: Date | null;
  lastActivityAt: Date | null;
  now?: Date;
}): number {
  if (args.stage === "DONE" || args.stage === "DROPPED") return 0;
  const now = args.now ?? new Date();
  const base =
    (args.stage === "INVITED" ? args.invitedAt : null) ??
    (args.stage === "ACTIVATED" ? args.activatedAt : null) ??
    args.lastActivityAt ??
    args.activatedAt ??
    args.invitedAt;
  if (!base) return 0;
  const elapsedDays = Math.floor((now.getTime() - base.getTime()) / (24 * 60 * 60 * 1000));
  const overdue = elapsedDays - stageSlaDays(args.stage);
  return overdue > 0 ? overdue : 0;
}

export function seedPilotSlaLabel(stage: SeedPilotActiveStatus): string {
  if (stage === "DONE" || stage === "DROPPED") return "已关闭";
  return `${stageSlaDays(stage)} 天`;
}

export function computeSeedPilotSlaState(args: {
  stage: SeedPilotActiveStatus;
  invitedAt: Date | null;
  activatedAt: Date | null;
  lastActivityAt: Date | null;
  now?: Date;
}): {
  stage: SeedPilotActiveStatus;
  targetDays: number;
  overdueDays: number;
  isOverdue: boolean;
  label: string;
} {
  const overdueDays = calcSeedPilotSlaOverdueDays(args);
  const targetDays = stageSlaDays(args.stage);
  return {
    stage: args.stage,
    targetDays,
    overdueDays,
    isOverdue: overdueDays > 0,
    label: overdueDays > 0 ? `超时 ${overdueDays} 天` : `SLA ${seedPilotSlaLabel(args.stage)}`,
  };
}

export function pilotSeedUsers(): PilotSeedUser[] {
  return [
    ...Array.from({ length: 12 }, (_, i) => ({
      email: `sdr${String(i + 1).padStart(2, "0")}@seed.fxiaoke.local`,
      role: "SDR" as const,
      name: `SDR${String(i + 1).padStart(2, "0")}`,
    })),
    ...Array.from({ length: 18 }, (_, i) => ({
      email: `ae${String(i + 1).padStart(2, "0")}@seed.fxiaoke.local`,
      role: "AE" as const,
      name: `AE${String(i + 1).padStart(2, "0")}`,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      email: `se${String(i + 1).padStart(2, "0")}@seed.fxiaoke.local`,
      role: "PRE_SALES" as const,
      name: `SE${String(i + 1).padStart(2, "0")}`,
    })),
    ...Array.from({ length: 7 }, (_, i) => ({
      email: `manager${String(i + 1).padStart(2, "0")}@seed.fxiaoke.local`,
      role: "SALES_MANAGER" as const,
      name: `销售经理${String(i + 1).padStart(2, "0")}`,
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      email: `vp${String(i + 1).padStart(2, "0")}@seed.fxiaoke.local`,
      role: "VP" as const,
      name: `VP${String(i + 1).padStart(2, "0")}`,
    })),
  ];
}

export function nextPilotStageForRole(
  role: DemoRole,
  idx = 0,
): PilotStage {
  if (role === "SDR") return (["INVITED", "ACTIVATED", "FEEDBACK"] as const)[idx % 3];
  if (role === "AE") return (["ACTIVATED", "FEEDBACK", "DONE"] as const)[idx % 3];
  if (role === "PRE_SALES") return (["FEEDBACK", "DONE"] as const)[idx % 2];
  if (role === "SALES_MANAGER") return (["DONE", "FEEDBACK"] as const)[idx % 2];
  return "DONE";
}
