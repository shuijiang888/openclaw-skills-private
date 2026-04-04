import type { CompassQuadrantThresholds } from "@/lib/compass-quadrant";

export type CompassAlertRuleForPrompt = {
  conditionLabel: string;
  actionLabel: string;
  sortOrder: number;
};

/**
 * 将「客户价值罗盘阈值 + 对策矩阵规则」拼成模型可读的可信上下文。
 * 注意：仅用于 prompt 注入；不要让其出现在“不可信输入”标记中。
 */
export function buildCompassRulesContextForPrompt(
  thresholds: CompassQuadrantThresholds,
  rules: CompassAlertRuleForPrompt[],
): string {
  const top = [...rules]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, 12);

  const lines = top.map(
    (r) => `- (${r.sortOrder}) 条件：${r.conditionLabel}；对策：${r.actionLabel}`,
  );

  return [
    `【客户价值罗盘阈值（可信配置）】客户价值 >= ${thresholds.marginHighPct}%；赢单概率 >= ${thresholds.growthHighPct}%`,
    `【对策矩阵规则（可信配置，按 sortOrder）】`,
    ...(lines.length ? lines : ["- （无可用规则）"]),
  ].join("\n");
}

