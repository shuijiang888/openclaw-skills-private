"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { dispatchProfitDataChanged } from "@/lib/profit-data-events";
import { demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
import { BossBriefingCard } from "@/components/BossBriefingCard";
import { QuoteAssistantPanel } from "@/components/QuoteAssistantPanel";
import { SalesManagerBenchCard } from "@/components/SalesManagerBenchCard";
import { buildQuoteSummaryText } from "@/lib/build-quote-summary";
import {
  customerTierLabel,
  demoRoleLabelForUi,
  projectStatusLabel,
} from "@/lib/display-labels";
import { canApprove, parseDemoRole } from "@/lib/approval";
import {
  canAccessConsoleAgentAudit,
  canUseQuoteAssistant,
} from "@/lib/demo-role-modules";
import type { CoeffPatch } from "@/lib/quote-natural-language";
import { parseTimeline } from "@/lib/timeline";
import { describeCoefficients } from "@/lib/coefficient-descriptions";
import { APPROVAL_DISCOUNT_BANDS } from "@/lib/business-config";
import { RadarChart } from "@/components/charts/RadarChart";
import { GaugeChart } from "@/components/charts/GaugeChart";

type EnrichedQuote = {
  id: string;
  suggestedPrice: number;
  counterPrice: number | null;
  material: number;
  labor: number;
  overhead: number;
  period: number;
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
  benchmarks: { name: string; price: number; diffPct: number }[];
  computed: {
    totalCost: number;
    discountPercentDisplay: number;
    grossMarginAtOffer: number;
    grossMarginAtSuggest: number;
    coefficientProduct: number;
    winRate: number;
    requiredApproval: { role: string; label: string };
    shunt: { channel: "AUTO" | "COLLAB"; reasons: string[] };
  };
  wsPrice: number;
  wsRelation: number;
  wsDelivery: number;
  wsTech: number;
  wsPayment: number;
  aiSuggestion: string;
  timelineJson: string;
  pendingRole: string | null;
  approvedPrice: number | null;
};

type ProjectDTO = {
  id: string;
  name: string;
  status: string;
  productName: string;
  quantity: number;
  leadDays: number;
  isStandard: boolean;
  isSmallOrder: boolean;
  customer: { name: string; tier: string };
  quote: EnrichedQuote | null;
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    PRICED: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? colors.DRAFT}`}>
      {projectStatusLabel(status)}
    </span>
  );
}

export function Workbench({ projectId }: { projectId: string }) {
  const demoRole = parseDemoRole(useDemoRole());
  const [data, setData] = useState<ProjectDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tip, setTip] = useState<ReactNode | null>(null);
  const [lastPatchRequestId, setLastPatchRequestId] = useState<string | null>(
    null,
  );

  const showRequestAuditTip = useCallback(
    (message: string, res: Response) => {
      const rid = res.headers.get("x-request-id");
      if (!rid) {
        setTip(message);
        window.setTimeout(() => setTip(null), 2600);
        return;
      }
      const canAuditUi = canAccessConsoleAgentAudit(demoRole);
      setTip(
        <span>
          {message}{" "}
          <span className="text-emerald-900/90 dark:text-emerald-100/90">
            请求 ID{" "}
            <code className="rounded bg-emerald-200/70 px-1 font-mono text-[10px] dark:bg-emerald-900/70">
              {rid}
            </code>
          </span>
          {" · "}
          {canAuditUi ? (
            <>
              <Link
                href="/console/agent-audit"
                className="font-medium underline underline-offset-2"
              >
                智能体审计
              </Link>
              可对齐检索。
            </>
          ) : (
            <span className="text-emerald-900/80 dark:text-emerald-100/80">
              审计留痕可在切换为「管理员」后从「智能体审计」检索。
            </span>
          )}
        </span>,
      );
      window.setTimeout(() => setTip(null), 9000);
    },
    [demoRole],
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) {
      setErr("加载失败");
      return;
    }
    setData(await res.json());
    setErr(null);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchQuote(body: Record<string, unknown>) {
    if (!data?.quote) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/quotes/${data.quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...demoHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("更新失败");
      setData(await res.json());
      const rid = res.headers.get("x-request-id");
      if (rid) setLastPatchRequestId(rid);
      dispatchProfitDataChanged({ debounceMs: 500 });
    } catch {
      setErr("保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function submitApproval() {
    if (!data?.quote) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/quotes/${data.quote.id}/submit`, {
        method: "POST",
        headers: { ...demoHeaders() },
      });
      if (!res.ok) throw new Error("提交失败");
      setData(await res.json());
      showRequestAuditTip("已提交审批。", res);
      dispatchProfitDataChanged();
    } catch {
      setErr("提交审批失败");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!data?.quote) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/quotes/${data.quote.id}/approve`, {
        method: "POST",
        headers: { ...demoHeaders() },
      });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof j.detail === "string"
            ? j.detail
            : (j.error as string) ?? "审批失败",
        );
      }
      setData(j);
      showRequestAuditTip("审批已通过。", res);
      dispatchProfitDataChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "审批失败");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="text-sm text-zinc-500">{err ?? "加载中…"}</div>
    );
  }

  if (!data.quote) {
    return <div className="text-sm text-red-600">该项目尚无报价记录。</div>;
  }

  const q = data.quote;
  const timeline = parseTimeline(q.timelineJson);
  const locked = data.status === "APPROVED";
  const pendingParsed = q.pendingRole ? parseDemoRole(q.pendingRole) : null;
  const canActApprove =
    pendingParsed !== null && canApprove(demoRole, pendingParsed);
  const assistantAllowed = canUseQuoteAssistant(demoRole);

  const coeffDescs = describeCoefficients({
    ...q,
    customerTier: data.customer.tier,
    productName: data.productName,
    leadDays: data.leadDays,
    quantity: data.quantity,
    isStandard: data.isStandard,
  });

  const costFormula = `¥${q.computed.totalCost.toLocaleString("zh-CN")} × ${coeffDescs.map(d => d.value).join(" × ")}`;

  function applyCoeffPatch(patch: CoeffPatch) {
    if (!data?.quote) return;
    const next = { ...data.quote, ...patch };
    setData({ ...data, quote: next });
    const labelMap: Record<string, string> = {
      coeffCustomer: "客户",
      coeffIndustry: "行业",
      coeffRegion: "区域",
      coeffProduct: "产品",
      coeffLead: "交期",
      coeffQty: "批量",
    };
    const detail = Object.entries(patch)
      .map(([k, v]) => `${labelMap[k] ?? k} ${v}`)
      .join("；");
    void patchQuote({
      coeffCustomer: next.coeffCustomer,
      coeffIndustry: next.coeffIndustry,
      coeffRegion: next.coeffRegion,
      coeffProduct: next.coeffProduct,
      coeffLead: next.coeffLead,
      coeffQty: next.coeffQty,
      refreshBenchmarks: true,
      timelineNote: {
        kind: "assistant",
        title: "智能助手已调整报价系数",
        detail,
      },
    });
  }

  async function copyQuoteSummary() {
    if (!data?.quote) return;
    const qv = data.quote;
    const text = buildQuoteSummaryText({
      projectName: data.name,
      productName: data.productName,
      customerName: data.customer.name,
      customerTierLabel: customerTierLabel(data.customer.tier),
      projectStatusLabel: projectStatusLabel(data.status),
      quantity: data.quantity,
      leadDays: data.leadDays,
      suggestedPrice: qv.suggestedPrice,
      counterPrice: qv.counterPrice,
      grossMarginAtSuggest: qv.computed.grossMarginAtSuggest,
      grossMarginAtOffer: qv.computed.grossMarginAtOffer,
      discountPercentDisplay: qv.computed.discountPercentDisplay,
      winRate: qv.computed.winRate,
      shuntChannel:
        qv.computed.shunt.channel === "AUTO" ? "自动报价" : "人机协同",
      shuntReasons: qv.computed.shunt.reasons,
      requiredApprovalLabel: qv.computed.requiredApproval.label,
      coeffEntries: (
        [
          ["coeffCustomer", qv.coeffCustomer],
          ["coeffIndustry", qv.coeffIndustry],
          ["coeffRegion", qv.coeffRegion],
          ["coeffProduct", qv.coeffProduct],
          ["coeffLead", qv.coeffLead],
          ["coeffQty", qv.coeffQty],
        ] as const
      ).map(([key, value]) => ({ key, value })),
      aiSuggestion: qv.aiSuggestion,
    });
    try {
      await navigator.clipboard.writeText(text);
      setErr(null);
      setTip("报价摘要已复制到剪贴板");
      window.setTimeout(() => setTip(null), 2600);
    } catch {
      setErr("复制失败，请检查浏览器剪贴板权限");
    }
  }

  const winScores = [
    { label: "价格竞争力", value: q.wsPrice, key: "wsPrice" as const, desc: q.wsPrice >= 80 ? "高于市场" : "略低" },
    { label: "客户关系", value: q.wsRelation, key: "wsRelation" as const, desc: q.wsRelation >= 80 ? "合作稳定" : "需加强" },
    { label: "交付能力", value: q.wsDelivery, key: "wsDelivery" as const, desc: q.wsDelivery >= 80 ? "产能充足" : "需评估" },
    { label: "技术匹配", value: q.wsTech, key: "wsTech" as const, desc: q.wsTech >= 80 ? "工艺匹配" : "需确认" },
    { label: "付款条件", value: q.wsPayment, key: "wsPayment" as const, desc: q.wsPayment >= 70 ? "条款合理" : `账期${data.customer.tier === "STRATEGIC" ? "60" : "30"}天` },
  ];

  return (
    <div className="space-y-6">
      <BossBriefingCard />
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </div>
      ) : null}
      {tip ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {tip}
        </div>
      ) : null}
      {lastPatchRequestId ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          最近一次报价保存{" "}
          <code className="rounded bg-zinc-100 px-1 font-mono text-[10px] dark:bg-zinc-800">
            x-request-id
          </code>
          ：<span className="font-mono text-[10px]">{lastPatchRequestId}</span>
          {" · "}
          <Link
            href="/console/agent-audit"
            className="font-medium text-zinc-800 underline dark:text-zinc-200"
          >
            智能体审计
          </Link>
          可对齐（有实质变更时写入 <code className="text-[10px]">quote_patch</code>）。
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void copyQuoteSummary()}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          复制报价摘要
        </button>
      </div>

      <div className="xl:grid xl:grid-cols-[1fr_minmax(300px,380px)] xl:items-start xl:gap-8">
        <div className="min-w-0 space-y-6">
          {/* ==================== 图2：成本基准 + 系数引擎 + 参考对比 + 胜率 ==================== */}

          {/* 顶部：项目信息卡 + 成本基准 */}
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="card-hover rounded-xl border border-orange-200/60 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm dark:border-orange-800/40 dark:from-zinc-900 dark:to-orange-950/10 lg:col-span-1">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white shadow-sm">①</span>
                项目摘要
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">客户</dt>
                  <dd className="text-right font-medium">{data.customer.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">评级</dt>
                  <dd className="text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${data.customer.tier === "STRATEGIC" ? "bg-amber-100 text-amber-800" : data.customer.tier === "KEY" ? "bg-blue-100 text-blue-800" : "bg-zinc-100 text-zinc-700"}`}>
                      {customerTierLabel(data.customer.tier)}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">项目状态</dt>
                  <dd className="text-right"><StatusBadge status={data.status} /></dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">产品/规格</dt>
                  <dd className="text-right text-xs">{data.productName || "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">数量 / 交期</dt>
                  <dd className="text-right tabular-nums">
                    {data.quantity.toLocaleString()} · {data.leadDays} 天
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">标品 / 小额</dt>
                  <dd className="text-right">
                    {data.isStandard ? "✓" : "✗"} / {data.isSmallOrder ? "✓" : "✗"}
                  </dd>
                </div>
                {q.approvedPrice != null ? (
                  <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                    <dt className="text-zinc-500">核准成交价</dt>
                    <dd className="text-right font-semibold text-emerald-700 dark:text-emerald-400">
                      ¥{q.approvedPrice.toLocaleString("zh-CN")}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="card-hover rounded-xl border border-orange-200/60 bg-gradient-to-br from-white to-orange-50/30 p-4 shadow-sm dark:border-orange-800/40 dark:from-zinc-900 dark:to-orange-950/10 lg:col-span-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-bold text-white shadow-sm">②</span>
                成本基准
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                {(
                  [
                    ["直接材料", q.material, "material", "铜箔+树脂+覆铜板"],
                    ["直接人工", q.labor, "labor", "钻孔/电镀/检测工时"],
                    ["制造费用", q.overhead, "overhead", "设备折旧/厂租/能耗"],
                    ["期间费用", q.period, "period", "管理+销售+研发"],
                  ] as const
                ).map(([label, val, key, desc]) => (
                  <label key={key} className="block text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
                    <input
                      type="number"
                      disabled={locked}
                      className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                      value={val}
                      onChange={(e) =>
                        setData({
                          ...data,
                          quote: { ...q, [key]: Number(e.target.value) },
                        })
                      }
                      onBlur={() =>
                        void patchQuote({
                          material: q.material,
                          labor: q.labor,
                          overhead: q.overhead,
                          period: q.period,
                        })
                      }
                    />
                    <span className="mt-0.5 block text-[10px] text-zinc-400">{desc}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-950/30">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">初始成本</span>
                <span className="text-lg font-bold tabular-nums text-orange-700 dark:text-orange-400">
                  ¥{q.computed.totalCost.toLocaleString("zh-CN")}
                </span>
              </div>
            </section>
          </div>

          {/* 智能系数叠加引擎——对应图2中间区域 */}
          <section className="card-hover rounded-xl border border-amber-200/60 bg-gradient-to-br from-white via-amber-50/20 to-white p-4 shadow-sm dark:border-amber-800/40 dark:from-zinc-900 dark:to-amber-950/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-white shadow-sm">③</span>
                智能系数叠加引擎
              </h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                连乘系数 {q.computed.coefficientProduct}
              </span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-amber-100 text-xs text-zinc-500 dark:border-amber-900">
                    <th className="pb-2 pr-3 text-left font-medium">系数</th>
                    <th className="pb-2 pr-3 text-right font-medium">数值</th>
                    <th className="pb-2 pr-3 text-left font-medium">标签</th>
                    <th className="pb-2 pr-3 text-right font-medium">影响</th>
                    <th className="pb-2 text-left font-medium">说明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50 dark:divide-amber-900/50">
                  {coeffDescs.map((d) => (
                    <tr key={d.key}>
                      <td className="py-2 pr-3 font-medium text-zinc-800 dark:text-zinc-200">{d.label}</td>
                      <td className="py-2 pr-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          disabled={locked}
                          className="w-16 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-right text-sm tabular-nums disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                          value={q[d.key as keyof typeof q] as number}
                          onChange={(e) =>
                            setData({
                              ...data,
                              quote: { ...q, [d.key]: Number(e.target.value) },
                            })
                          }
                          onBlur={() =>
                            void patchQuote({
                              coeffCustomer: q.coeffCustomer,
                              coeffIndustry: q.coeffIndustry,
                              coeffRegion: q.coeffRegion,
                              coeffProduct: q.coeffProduct,
                              coeffLead: q.coeffLead,
                              coeffQty: q.coeffQty,
                              refreshBenchmarks: true,
                            })
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">{d.tag}</span>
                      </td>
                      <td className={`py-2 pr-3 text-right text-xs font-medium tabular-nums ${d.impactPct.startsWith("+") ? "text-red-600" : d.impactPct === "+0%" ? "text-zinc-500" : "text-emerald-600"}`}>
                        {d.impactPct}
                      </td>
                      <td className="py-2 text-xs text-zinc-500">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-start gap-6">
              <div className="shrink-0">
                <RadarChart
                  data={coeffDescs.map(d => ({ label: d.label.replace("系数", ""), value: d.value * 100, max: 185 }))}
                  size={180}
                  color="#d97706"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-zinc-600 dark:bg-amber-950/30 dark:text-zinc-400">
                  <span className="font-medium">建议报价公式</span> = {costFormula}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="price-highlight rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 text-white shadow-lg">
                <div className="text-xs font-medium opacity-90">建议报价</div>
                <div className="text-3xl font-bold tabular-nums tracking-tight">
                  ¥{q.suggestedPrice.toLocaleString("zh-CN")}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="text-zinc-600 dark:text-zinc-400">
                  建议毛利率{" "}
                  <span className="font-bold text-zinc-900 dark:text-zinc-50">
                    {q.computed.grossMarginAtSuggest}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 参考对比 + 胜率——对应图2右侧 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card-hover rounded-xl border border-purple-200/60 bg-gradient-to-br from-white to-purple-50/30 p-4 shadow-sm dark:border-purple-800/40 dark:from-zinc-900 dark:to-purple-950/10">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-purple-400 to-purple-600 text-xs font-bold text-white shadow-sm">④</span>
                参考对比分析
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-purple-100 text-zinc-500 dark:border-purple-900">
                      <th className="py-2 pr-2 font-medium">参考类型</th>
                      <th className="py-2 pr-2 text-right font-medium">价格</th>
                      <th className="py-2 text-right font-medium">差异</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 dark:divide-purple-900/50">
                    {q.benchmarks.map((b) => (
                      <tr key={b.name}>
                        <td className="py-2 pr-2 text-zinc-700 dark:text-zinc-300">{b.name}</td>
                        <td className="py-2 pr-2 text-right tabular-nums font-medium">
                          ¥{b.price.toLocaleString("zh-CN")}
                        </td>
                        <td
                          className={`py-2 text-right tabular-nums font-medium ${
                            b.diffPct <= 0 ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {b.diffPct > 0 ? "+" : ""}
                          {b.diffPct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card-hover rounded-xl border border-sky-200/60 bg-gradient-to-br from-white to-sky-50/30 p-4 shadow-sm dark:border-sky-800/40 dark:from-zinc-900 dark:to-sky-950/10">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-sky-400 to-sky-600 text-xs font-bold text-white shadow-sm">⑤</span>
                胜率预测模型
              </h2>
              <div className="mt-3 flex items-start gap-4">
                <div className="shrink-0">
                  <GaugeChart value={q.computed.winRate} label="综合胜率" size={140} />
                </div>
                <div className="flex-1 space-y-2">
                  {winScores.map((s) => (
                    <div key={s.key} className="flex items-center gap-2 text-xs">
                      <span className="w-14 font-medium text-zinc-700 dark:text-zinc-300">{s.label}</span>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`progress-bar h-full rounded-full ${s.value >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : s.value >= 60 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                            style={{ width: `${s.value}%` }}
                          />
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={locked}
                        value={s.value}
                        className="w-11 rounded border border-zinc-200 bg-white px-1 py-0.5 text-right text-xs tabular-nums disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                        onChange={(e) =>
                          setData({
                            ...data,
                            quote: { ...q, [s.key]: Number(e.target.value) },
                          })
                        }
                        onBlur={() =>
                          void patchQuote({
                            wsPrice: q.wsPrice,
                            wsRelation: q.wsRelation,
                            wsDelivery: q.wsDelivery,
                            wsTech: q.wsTech,
                            wsPayment: q.wsPayment,
                          })
                        }
                      />
                      <span className="w-14 text-right text-[10px] text-zinc-500">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* ==================== 图3：分层审批 + 客户还价 ==================== */}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card-hover rounded-xl border border-rose-200/60 bg-gradient-to-br from-white to-rose-50/30 p-4 shadow-sm dark:border-rose-800/40 dark:from-zinc-900 dark:to-rose-950/10">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-rose-400 to-rose-600 text-xs font-bold text-white shadow-sm">⑥</span>
                客户还价与折扣计算
              </h2>
              <label className="mt-3 block text-sm">
                <span className="text-zinc-500">还价金额（空=未还价）</span>
                <input
                  type="number"
                  disabled={locked}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 tabular-nums dark:border-zinc-600 dark:bg-zinc-950"
                  value={q.counterPrice ?? ""}
                  placeholder={`参考建议价 ¥${q.suggestedPrice.toLocaleString("zh-CN")}`}
                  onChange={(e) => {
                    const v = e.target.value;
                    setData({
                      ...data,
                      quote: {
                        ...q,
                        counterPrice: v === "" ? null : Number(v),
                      },
                    });
                  }}
                  onBlur={() =>
                    void patchQuote({ counterPrice: q.counterPrice })
                  }
                />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950/30">
                  <div className="text-xs text-zinc-500">折扣率</div>
                  <div className="mt-0.5 text-lg font-bold tabular-nums text-rose-700 dark:text-rose-400">
                    {q.computed.discountPercentDisplay}%
                  </div>
                </div>
                <div className="rounded-lg bg-rose-50 px-3 py-2 dark:bg-rose-950/30">
                  <div className="text-xs text-zinc-500">还价后毛利率</div>
                  <div className={`mt-0.5 text-lg font-bold tabular-nums ${q.computed.grossMarginAtOffer < 15 ? "text-red-600" : "text-emerald-600"}`}>
                    {q.computed.grossMarginAtOffer}%
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                <span className="text-zinc-600 dark:text-zinc-400">建议审批链 → </span>
                <span className="font-semibold text-amber-800 dark:text-amber-300">
                  {q.computed.requiredApproval.label}
                </span>
              </div>
            </section>

            {/* 分层审批规则——对应图3下方表格 */}
            <section className="card-hover rounded-xl border border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30 p-4 shadow-sm dark:border-amber-800/40 dark:from-zinc-900 dark:to-amber-950/10">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-white shadow-sm">⑦</span>
                授权审批规则
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-amber-100 text-zinc-500 dark:border-amber-900">
                      <th className="py-2 pr-2 font-medium">层级</th>
                      <th className="py-2 pr-2 font-medium">折扣权限</th>
                      <th className="py-2 font-medium">审批条件</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50 dark:divide-amber-900/50">
                    {APPROVAL_DISCOUNT_BANDS.map((b) => {
                      const isActive = q.computed.requiredApproval.role === b.role;
                      return (
                        <tr key={b.role} className={isActive ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
                          <td className={`py-2 pr-2 font-medium ${isActive ? "text-amber-800 dark:text-amber-300" : "text-zinc-700 dark:text-zinc-300"}`}>
                            {isActive ? "▶ " : ""}{b.label}
                          </td>
                          <td className="py-2 pr-2 text-zinc-600 dark:text-zinc-400">{b.range}</td>
                          <td className="py-2 text-zinc-500">
                            {b.role === "SALES_MANAGER" ? "标准范围内" :
                             b.role === "SALES_DIRECTOR" ? "超出经理权限" :
                             b.role === "SALES_VP" ? "大额订单/战略客户" :
                             "特殊项目/亏损风险"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* ==================== 图4：智能分流 ==================== */}
          <section className="card-hover rounded-xl border border-teal-200/60 bg-gradient-to-br from-white via-teal-50/20 to-white p-4 shadow-sm dark:border-teal-800/40 dark:from-zinc-900 dark:to-teal-950/10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-bold text-white shadow-sm">⑧</span>
              智能决策分流
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              {/* 自动报价通道 */}
              <div className={`rounded-lg border-2 p-4 ${q.computed.shunt.channel === "AUTO" ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/20" : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/30"}`}>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${q.computed.shunt.channel === "AUTO" ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                    {q.computed.shunt.channel === "AUTO" ? "✓ 当前" : "未命中"}
                  </span>
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">自动报价通道</h3>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <li>✓ 产品类型 = 标品/标准型号</li>
                  <li>✓ 订单规模 = 小项目/小订单</li>
                  <li>✓ 折扣范围 ≤ 5%</li>
                  <li>✓ 客户评级 = 普通客户</li>
                  <li>✓ 毛利率 ≥ 25%</li>
                </ul>
                <div className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400">
                  策略：报不到就拿不到，标准化快速响应
                </div>
              </div>
              {/* 人机协同通道 */}
              <div className={`rounded-lg border-2 p-4 ${q.computed.shunt.channel === "COLLAB" ? "border-amber-400 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-950/20" : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-800/30"}`}>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${q.computed.shunt.channel === "COLLAB" ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-500"}`}>
                    {q.computed.shunt.channel === "COLLAB" ? "✓ 当前" : "未命中"}
                  </span>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300">人机协同决策</h3>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                  <li>✓ 产品类型 = 定制化/复杂产品</li>
                  <li>✓ 客户评级 = 战略/大客户</li>
                  <li>✓ 订单规模 = 大项目/大批量</li>
                  <li>✓ 折扣范围 &gt; 5%（超权限）</li>
                  <li>✓ 毛利率 &lt; 25%</li>
                </ul>
                <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-400">
                  策略：不惜代价拿下，确保重点项目不流失
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs text-zinc-600 dark:bg-teal-950/30 dark:text-zinc-400">
              <span className="font-medium">本单命中条件：</span>
              {q.computed.shunt.reasons.map((r, i) => (
                <span key={i}>{i > 0 ? " · " : ""}{r}</span>
              ))}
            </div>
          </section>

          {/* ==================== 智能报价单——对应图2下半部分 ==================== */}
          <section className="gradient-border card-hover rounded-xl bg-gradient-to-br from-white via-indigo-50/20 to-white p-4 shadow-sm dark:from-zinc-900 dark:to-indigo-950/10">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-indigo-400 to-indigo-600 text-xs font-bold text-white shadow-sm">⑨</span>
              智能报价单
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              {/* 左栏：报价信息 */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">客户名称</span><span className="font-medium">{data.customer.name}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">项目名称</span><span className="font-medium">{data.name}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">产品规格</span><span>{data.productName || "—"}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">数量</span><span className="tabular-nums">{data.quantity.toLocaleString()} PCS</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">交付周期</span><span>{data.leadDays} 个工作日</span></div>
                <div className="border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <div className="flex justify-between"><span className="text-zinc-500">初始成本</span><span className="tabular-nums">¥{q.computed.totalCost.toLocaleString("zh-CN")}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">系数调整</span><span className="tabular-nums">× {q.computed.coefficientProduct}</span></div>
                  <div className="flex justify-between border-t border-zinc-100 pt-2 font-semibold dark:border-zinc-800">
                    <span>建议报价</span>
                    <span className="text-red-600 tabular-nums">¥{q.suggestedPrice.toLocaleString("zh-CN")}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 mt-1">
                    <span>毛利率</span>
                    <span className="tabular-nums">{q.computed.grossMarginAtSuggest}%</span>
                  </div>
                </div>
              </div>

              {/* 中栏：AI 建议 */}
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/20">
                <h3 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">AI 报价建议</h3>
                <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {q.aiSuggestion.split("\n").filter(Boolean).map((line, i) => (
                    <p key={i} className="flex items-start gap-1.5">
                      <span className="mt-0.5 text-indigo-500">✓</span>
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              {/* 右栏：状态追踪 */}
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-800/30">
                <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">报价状态追踪</h3>
                <div className="mt-2 space-y-2">
                  {timeline.slice(0, 5).map((ev) => (
                    <div key={ev.at + ev.title} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${ev.title.includes("通过") || ev.title.includes("完成") ? "bg-emerald-500" : ev.title.includes("待") ? "bg-amber-500" : "bg-blue-500"}`} />
                        {ev.title}
                      </span>
                      <span className="text-zinc-400 tabular-nums">
                        {new Date(ev.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                  {q.pendingRole && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        → 待审批
                      </span>
                      <span className="text-amber-600 font-medium">{demoRoleLabelForUi(q.pendingRole)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮——对应图2底部 */}
            <div className="mt-4 flex flex-wrap gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                disabled={locked || busy || !!q.pendingRole}
                onClick={() => void submitApproval()}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/20 transition hover:from-amber-600 hover:to-amber-700 hover:shadow-lg disabled:opacity-50"
              >
                提交审批
              </button>
              <button
                type="button"
                disabled={locked || busy}
                onClick={() =>
                  void patchQuote({
                    material: q.material,
                    labor: q.labor,
                    overhead: q.overhead,
                    period: q.period,
                    coeffCustomer: q.coeffCustomer,
                    coeffIndustry: q.coeffIndustry,
                    coeffRegion: q.coeffRegion,
                    coeffProduct: q.coeffProduct,
                    coeffLead: q.coeffLead,
                    coeffQty: q.coeffQty,
                    refreshBenchmarks: true,
                  })
                }
                className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-700"
              >
                重新测算
              </button>
              <button
                type="button"
                disabled={locked || busy || !q.pendingRole || !canActApprove}
                onClick={() => void approve()}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg disabled:opacity-50"
              >
                审批通过
              </button>
            </div>
            {q.pendingRole ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                待审批角色：
                <strong>{demoRoleLabelForUi(q.pendingRole)}</strong>
                {canActApprove
                  ? " · 当前身份可点「审批通过」"
                  : " · 请切换为不低于该权限的角色后再审批"}
              </p>
            ) : null}
          </section>
        </div>

        <aside className="mt-8 space-y-4 xl:sticky xl:top-24 xl:mt-0">
          {demoRole === "SALES_MANAGER" ? <SalesManagerBenchCard /> : null}
          <QuoteAssistantPanel
            demoRole={demoRole}
            disabled={locked || !assistantAllowed}
            baseline={{
              coeffCustomer: q.coeffCustomer,
              coeffIndustry: q.coeffIndustry,
              coeffRegion: q.coeffRegion,
              coeffProduct: q.coeffProduct,
              coeffLead: q.coeffLead,
              coeffQty: q.coeffQty,
            }}
            onApplyCoefficients={applyCoeffPatch}
            agentQuickActions={
              assistantAllowed
                ? {
                    busy,
                    locked,
                    pendingRole: q.pendingRole,
                    canActApprove,
                    onRecalculate: () =>
                      void patchQuote({
                        material: q.material,
                        labor: q.labor,
                        overhead: q.overhead,
                        period: q.period,
                        coeffCustomer: q.coeffCustomer,
                        coeffIndustry: q.coeffIndustry,
                        coeffRegion: q.coeffRegion,
                        coeffProduct: q.coeffProduct,
                        coeffLead: q.coeffLead,
                        coeffQty: q.coeffQty,
                        refreshBenchmarks: true,
                      }),
                    onSubmitApproval: () => void submitApproval(),
                    onApprove: () => void approve(),
                    onRefreshProject: () => void load(),
                  }
                : null
            }
          />
        </aside>
      </div>
    </div>
  );
}
