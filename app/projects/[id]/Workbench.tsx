"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { dispatchProfitDataChanged } from "@/lib/profit-data-events";
import { demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
import { BossBriefingCard } from "@/components/BossBriefingCard";
import { QuoteAssistantPanel } from "@/components/QuoteAssistantPanel";
import { SalesManagerBenchCard } from "@/components/SalesManagerBenchCard";
import { QuoteRuleExplainCard } from "@/components/QuoteRuleExplainCard";
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
              审计留痕可在切换为「VP」后从「智能体审计」检索。
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
      if (!res.ok) throw new Error("提交 Deal Desk 失败");
      setData(await res.json());
      showRequestAuditTip("已提交 Deal Desk。", res);
      dispatchProfitDataChanged();
    } catch {
      setErr("提交 Deal Desk 失败");
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
            : (j.error as string) ?? "Deal Desk 批复失败",
        );
      }
      setData(j);
      showRequestAuditTip("Deal Desk 批复已通过。", res);
      dispatchProfitDataChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Deal Desk 批复失败");
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

  function applyCoeffPatch(patch: CoeffPatch) {
    if (!data?.quote) return;
    const next = { ...data.quote, ...patch };
    setData({ ...data, quote: next });
    const labelMap: Record<string, string> = {
      coeffCustomer: "客户",
      coeffIndustry: "赢单概率",
      coeffRegion: "关系推进",
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
        title: "销售教练已调整报价系数",
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
        qv.computed.shunt.channel === "AUTO" ? "自动报价" : "Deal Desk 协同",
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
          <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-1">
          <h2 className="text-sm font-medium text-zinc-500">项目摘要</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">客户</dt>
              <dd className="text-right font-medium">{data.customer.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">客户评级</dt>
              <dd className="text-right">
                {customerTierLabel(data.customer.tier)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">项目状态</dt>
              <dd className="text-right">
                {projectStatusLabel(data.status)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">数量 / 交期</dt>
              <dd className="text-right tabular-nums">
                {data.quantity} · {data.leadDays} 天
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">标准订阅包 / 小 ACV</dt>
              <dd className="text-right">
                {data.isStandard ? "是" : "否"} /{" "}
                {data.isSmallOrder ? "是" : "否"}
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

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <h2 className="text-sm font-medium text-zinc-500">成本基准</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {(
              [
                ["材料", q.material, "material"],
                ["人工", q.labor, "labor"],
                ["制费", q.overhead, "overhead"],
                ["期间", q.period, "period"],
              ] as const
            ).map(([label, val, key]) => (
              <label key={key} className="block text-xs">
                <span className="text-zinc-500">{label}</span>
                <input
                  type="number"
                  disabled={locked}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
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
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm">
            成本合计{" "}
            <span className="font-semibold tabular-nums">
              ¥{q.computed.totalCost.toLocaleString("zh-CN")}
            </span>
          </p>
        </section>
          </div>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">智能系数叠加</h2>
          <span className="text-xs text-zinc-500">
            连乘系数 {q.computed.coefficientProduct}
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["客户", q.coeffCustomer, "coeffCustomer"],
              ["行业", q.coeffIndustry, "coeffIndustry"],
              ["区域", q.coeffRegion, "coeffRegion"],
              ["产品", q.coeffProduct, "coeffProduct"],
              ["交期", q.coeffLead, "coeffLead"],
              ["批量", q.coeffQty, "coeffQty"],
            ] as const
          ).map(([label, val, key]) => (
            <label key={key} className="block text-xs">
              <span className="text-zinc-500">{label}</span>
              <input
                type="number"
                step="0.01"
                disabled={locked}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                value={val}
                onChange={(e) =>
                  setData({
                    ...data,
                    quote: { ...q, [key]: Number(e.target.value) },
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
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="rounded-lg bg-red-600 px-4 py-3 text-white shadow">
            <div className="text-xs opacity-90">建议价</div>
            <div className="text-xl font-semibold tabular-nums">
              ¥{q.suggestedPrice.toLocaleString("zh-CN")}
            </div>
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            建议客户价值{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {q.computed.grossMarginAtSuggest}%
            </span>
          </div>
        </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium">参考对比</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-2">口径</th>
                  <th className="py-2 pr-2 text-right">价格</th>
                  <th className="py-2 text-right">较建议价</th>
                </tr>
              </thead>
              <tbody>
                {q.benchmarks.map((b) => (
                  <tr
                    key={b.name}
                    className="border-b border-zinc-50 dark:border-zinc-800/80"
                  >
                    <td className="py-2 pr-2">{b.name}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      ¥{b.price.toLocaleString("zh-CN")}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${
                        b.diffPct <= 0 ? "text-emerald-600" : "text-amber-600"
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

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium">胜率（规则加权）</h2>
          <div className="mt-3 space-y-2 text-xs">
            {(
              [
                ["价格竞争力", q.wsPrice, "wsPrice"],
                ["客情", q.wsRelation, "wsRelation"],
                ["交付", q.wsDelivery, "wsDelivery"],
                ["技术匹配", q.wsTech, "wsTech"],
                ["账期", q.wsPayment, "wsPayment"],
              ] as const
            ).map(([label, val, key]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-20 text-zinc-500">{label}</span>
                <input
                  type="range"
                  min={0}
 max={100}
                  disabled={locked}
                  value={val}
                  className="flex-1"
                  onChange={(e) =>
                    setData({
                      ...data,
                      quote: { ...q, [key]: Number(e.target.value) },
                    })
                  }
                  onMouseUp={() =>
                    void patchQuote({
                      wsPrice: q.wsPrice,
                      wsRelation: q.wsRelation,
                      wsDelivery: q.wsDelivery,
                      wsTech: q.wsTech,
                      wsPayment: q.wsPayment,
                    })
                  }
                  onTouchEnd={() =>
                    void patchQuote({
                      wsPrice: q.wsPrice,
                      wsRelation: q.wsRelation,
                      wsDelivery: q.wsDelivery,
                      wsTech: q.wsTech,
                      wsPayment: q.wsPayment,
                    })
                  }
                />
                <span className="w-8 text-right tabular-nums">{val}</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">综合胜率</span>
              <span className="font-semibold text-emerald-600">
                {q.computed.winRate}%
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${q.computed.winRate}%` }}
              />
            </div>
          </div>
        </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium">客户还价</h2>
          <label className="mt-3 block text-sm">
            <span className="text-zinc-500">还价金额（空=未还价）</span>
            <input
              type="number"
              disabled={locked}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={q.counterPrice ?? ""}
              placeholder={`参考 ${q.suggestedPrice}`}
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
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            折扣约{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {q.computed.discountPercentDisplay}%
            </span>
            ，还价后客户价值{" "}
            <span className="font-medium">{q.computed.grossMarginAtOffer}%</span>
          </p>
          <p className="mt-2 text-sm">
            建议 Deal Desk 链：{" "}
            <span className="font-medium">
              {q.computed.requiredApproval.label}
            </span>
          </p>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium">智能分流</h2>
          <p className="mt-2 text-sm">
            当前通道：{" "}
            <span
              className={
                q.computed.shunt.channel === "AUTO"
                  ? "font-semibold text-emerald-600"
                  : "font-semibold text-amber-600"
              }
            >
              {q.computed.shunt.channel === "AUTO"
                ? "自动报价"
                : "Deal Desk 协同"}
            </span>
          </p>
          <ul className="mt-2 list-inside list-disc text-xs text-zinc-600 dark:text-zinc-400">
            {q.computed.shunt.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
          </div>

          <QuoteRuleExplainCard quote={q} />

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium">报价建议（规则文案）</h2>
        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {q.aiSuggestion}
        </pre>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium">Deal Desk 时间线</h2>
        <ol className="mt-4 space-y-3 border-l border-zinc-200 pl-4 dark:border-zinc-700">
          {timeline.map((ev) => (
            <li key={ev.at + ev.title} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-zinc-400" />
              <div className="font-medium">{ev.title}</div>
              <div className="text-xs text-zinc-500">
                {new Date(ev.at).toLocaleString("zh-CN")}
                {ev.detail ? ` · ${ev.detail}` : ""}
              </div>
            </li>
          ))}
        </ol>
        {q.pendingRole ? (
          <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
            待 Deal Desk 角色：
            <strong>{demoRoleLabelForUi(q.pendingRole)}</strong>
            {canActApprove
              ? " · 当前身份可点「Deal Desk 批复通过」"
              : " · 请在右上角将「试点角色」切换为不低于该档后再批复（登录模式请换具备权限的账号）"}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={locked || busy || !!q.pendingRole}
            onClick={() => void submitApproval()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            提交 Deal Desk
          </button>
          <button
            type="button"
            disabled={locked || busy || !q.pendingRole || !canActApprove}
            onClick={() => void approve()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Deal Desk 批复通过
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
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            重新测算
          </button>
        </div>
          </section>
        </div>

        <aside className="mt-8 space-y-4 xl:sticky xl:top-24 xl:mt-0">
          {!assistantAllowed ? <SalesManagerBenchCard /> : null}
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
