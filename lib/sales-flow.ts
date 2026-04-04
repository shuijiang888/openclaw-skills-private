export type FlowStage =
  | "LEAD_QUALIFIED"
  | "DISCOVERY"
  | "SOLUTION"
  | "PROPOSAL"
  | "DEAL_DESK"
  | "CLOSED_WON"
  | "CLOSED_LOST";

export const FLOW_STAGE_LABEL: Record<FlowStage, string> = {
  LEAD_QUALIFIED: "线索判定",
  DISCOVERY: "需求发现",
  SOLUTION: "方案共创",
  PROPOSAL: "商务提案",
  DEAL_DESK: "Deal Desk",
  CLOSED_WON: "赢单",
  CLOSED_LOST: "丢单",
};

export const FLOW_STAGE_OPTIONS: FlowStage[] = [
  "LEAD_QUALIFIED",
  "DISCOVERY",
  "SOLUTION",
  "PROPOSAL",
  "DEAL_DESK",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export type BattleCardId =
  | "COMPETITOR_SWAP"
  | "EXEC_VISIT"
  | "POC_ESCORT"
  | "RENEWAL_RISK"
  | "PROCUREMENT_BLOCK";

export type BattleCardTemplate = {
  id: BattleCardId;
  label: string;
  stage: FlowStage;
  defaultNextStep: string;
  dueInDays: number;
  checklist: string[];
};

export const BATTLE_CARD_TEMPLATES: BattleCardTemplate[] = [
  {
    id: "COMPETITOR_SWAP",
    label: "竞品替换战役",
    stage: "SOLUTION",
    defaultNextStep: "安排 30 分钟竞品差异化演示，锁定 2 个关键业务人。",
    dueInDays: 2,
    checklist: ["竞品清单", "反对点脚本", "价值对照页"],
  },
  {
    id: "EXEC_VISIT",
    label: "高层共访推进",
    stage: "PROPOSAL",
    defaultNextStep: "约客户业务一把手共访，确认年度目标与上线节奏。",
    dueInDays: 3,
    checklist: ["客户高层画像", "共访议程", "会后纪要模板"],
  },
  {
    id: "POC_ESCORT",
    label: "POC 护航",
    stage: "SOLUTION",
    defaultNextStep: "明确 POC 成功标准，发布日会机制并指定责任人。",
    dueInDays: 1,
    checklist: ["POC 成功标准", "项目排期", "风险清单"],
  },
  {
    id: "RENEWAL_RISK",
    label: "续费风险挽回",
    stage: "DISCOVERY",
    defaultNextStep: "完成续费风险访谈并产出分层挽回计划。",
    dueInDays: 2,
    checklist: ["使用率报告", "续费障碍", "ROI 复盘"],
  },
  {
    id: "PROCUREMENT_BLOCK",
    label: "采购博弈解锁",
    stage: "DEAL_DESK",
    defaultNextStep: "与采购确认条款底线，准备可交换条件清单后上 Deal Desk。",
    dueInDays: 2,
    checklist: ["条款红线", "让利换条件", "审批链路"],
  },
];

export function flowStageLabel(stage: string): string {
  return FLOW_STAGE_LABEL[stage as FlowStage] ?? stage;
}

export function normalizeFlowStage(
  input: unknown,
  fallback: FlowStage = "LEAD_QUALIFIED",
): FlowStage {
  if (typeof input !== "string") return fallback;
  const v = input.trim().toUpperCase() as FlowStage;
  return FLOW_STAGE_OPTIONS.includes(v) ? v : fallback;
}

export function parseBattleCardId(input: unknown): BattleCardId | null {
  if (typeof input !== "string") return null;
  const v = input.trim().toUpperCase();
  return (
    BATTLE_CARD_TEMPLATES.find((card) => card.id === v as BattleCardId)?.id ??
    null
  );
}

export function battleCardTemplateById(
  id: BattleCardId | string | null | undefined,
): BattleCardTemplate | null {
  if (!id) return null;
  return BATTLE_CARD_TEMPLATES.find((card) => card.id === id) ?? null;
}

export function stageFromProjectStatus(status: string): FlowStage {
  if (status === "APPROVED") return "CLOSED_WON";
  if (status === "CLOSED_LOST") return "CLOSED_LOST";
  if (status === "PENDING_APPROVAL") return "DEAL_DESK";
  if (status === "PRICED") return "PROPOSAL";
  return "DISCOVERY";
}

export function statusFromFlowStage(stage: FlowStage): string {
  if (stage === "CLOSED_WON") return "APPROVED";
  if (stage === "CLOSED_LOST") return "CLOSED_LOST";
  if (stage === "DEAL_DESK") return "PENDING_APPROVAL";
  if (stage === "SOLUTION" || stage === "PROPOSAL") return "PRICED";
  if (stage === "LEAD_QUALIFIED" || stage === "DISCOVERY") return "DRAFT";
  if (stage === "PROPOSAL") return "PRICED";
  return "DRAFT";
}

export function nextStepOverdueDays(
  nextStepDueAt: Date | string | null | undefined,
  now = new Date(),
): number {
  if (!nextStepDueAt) return 0;
  const due =
    typeof nextStepDueAt === "string" ? new Date(nextStepDueAt) : nextStepDueAt;
  if (Number.isNaN(due.getTime())) return 0;
  const ms = now.getTime() - due.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function dueDateLabel(
  nextStepDueAt: Date | string | null | undefined,
): string {
  if (!nextStepDueAt) return "未设置";
  const due =
    typeof nextStepDueAt === "string" ? new Date(nextStepDueAt) : nextStepDueAt;
  if (Number.isNaN(due.getTime())) return "未设置";
  return due.toLocaleDateString("zh-CN");
}
