import type { Customer, Project, Quote } from "@prisma/client";
import { enrichProject } from "@/lib/serialize";

export type PortfolioValueMetrics = {
  /** 建议价口径下毛利率 &lt; 15% 的报价单数 */
  lowMarginQuoteCount: number;
  /** 当前测算满足「快速通道」条件的报价单数 */
  autoChannelEligibleCount: number;
  /** 待审批项目数 */
  pendingApprovalCount: number;
  /** 已核准项目数 */
  approvedCount: number;
  /** 项目总数 */
  projectCount: number;
};

export function computePortfolioMetrics(
  rows: (Project & { customer: Customer; quote: Quote | null })[],
): PortfolioValueMetrics {
  let lowMarginQuoteCount = 0;
  let autoChannelEligibleCount = 0;
  let pendingApprovalCount = 0;
  let approvedCount = 0;

  for (const raw of rows) {
    if (raw.status === "PENDING_APPROVAL") pendingApprovalCount += 1;
    if (raw.status === "APPROVED") approvedCount += 1;
    const p = enrichProject(raw);
    if (!p.quote || !("computed" in p.quote)) continue;
    const q = p.quote;
    if (q.computed.grossMarginAtSuggest < 15) lowMarginQuoteCount += 1;
    if (q.computed.shunt.channel === "AUTO") autoChannelEligibleCount += 1;
  }

  return {
    lowMarginQuoteCount,
    autoChannelEligibleCount,
    pendingApprovalCount,
    approvedCount,
    projectCount: rows.length,
  };
}
