"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import type { DemoRole } from "@/lib/approval";
import { ASSISTANT_CSRF_HEADER } from "@/lib/agent-csrf-constants";
import { withClientBasePath } from "@/lib/client-url";
import { getRolePlaybook } from "@/lib/role-playbook";
import type { CoeffPatch } from "@/lib/quote-natural-language";

type Baseline = {
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
};

type ParseApiResponse = {
  source: "ollama" | "minimax" | "rules";
  model?: string;
  fallbackReason?: string;
  summary: string[];
  hints: string[];
  patch: CoeffPatch;
};

type ParseApiError = {
  error?: string;
  code?: string;
  requestId?: string;
};

type NodeId = "customer" | "bom" | "engine" | "quote" | "approval";

type NodeResult = ParseApiResponse & { requestId: string | null };

type NodeConfig = {
  id: NodeId;
  title: string;
  goal: string;
  canApplyPatch: boolean;
};

const NODE_CONFIGS: NodeConfig[] = [
  {
    id: "customer",
    title: "① 客户需求识别",
    goal: "识别技术规格、交付节奏、交付风险和客户价值等级。",
    canApplyPatch: true,
  },
  {
    id: "bom",
    title: "② BOM 成本拆解",
    goal: "核对材料/人工/制费/期间费用口径，并识别缺漏项。",
    canApplyPatch: true,
  },
  {
    id: "engine",
    title: "③ 成本计算引擎",
    goal: "判断六项系数是否合理，保证建议价与利润口径一致。",
    canApplyPatch: true,
  },
  {
    id: "quote",
    title: "④ 智能报价生成",
    goal: "给出建议报价叙事、对标差异与赢率关注点。",
    canApplyPatch: true,
  },
  {
    id: "approval",
    title: "⑤ 分层审批建议",
    goal: "判断审批层级是否匹配折扣带，给出可批复动作。",
    canApplyPatch: false,
  },
];

function pickNodeInstruction(id: NodeId): string {
  if (id === "customer") {
    return "重点识别客户需求变化、关系风险、交付优先级；必要时可建议微调客户/交期/产品系数。";
  }
  if (id === "bom") {
    return "重点检查成本口径完整性、BOM 偏差与隐藏费用；必要时可建议微调产品/批量系数。";
  }
  if (id === "engine") {
    return "重点检查六项系数是否自洽、是否符合策略边界；可给出系数修正。";
  }
  if (id === "quote") {
    return "重点给出报价叙事、对标差异和胜率提升动作；必要时可建议系数修正。";
  }
  return "重点给出审批链建议、折扣与权限匹配、提交前补充材料；一般不改系数。";
}

function hasPatch(patch: CoeffPatch): boolean {
  return Object.keys(patch).length > 0;
}

function isParseApiResponse(value: unknown): value is ParseApiResponse {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const source = body.source;
  return (
    (source === "ollama" || source === "minimax" || source === "rules") &&
    Array.isArray(body.summary) &&
    Array.isArray(body.hints) &&
    body.patch !== null &&
    typeof body.patch === "object"
  );
}

function normalizeErrorResult(
  status: number,
  body: unknown,
  requestId: string | null,
): NodeResult {
  const apiError = (body ?? {}) as ParseApiError;
  const errorText =
    typeof apiError.error === "string" && apiError.error.trim().length > 0
      ? apiError.error.trim()
      : `服务调用失败（HTTP ${status}）`;
  return {
    source: "rules",
    summary: ["该节点 AI 建议暂不可用，已降级为提示模式。"],
    hints: [errorText],
    patch: {},
    requestId: requestId ?? apiError.requestId ?? null,
    fallbackReason: "请检查 AI 服务配置或联系管理员。",
  };
}

function sourceLabel(source: ParseApiResponse["source"]): string {
  if (source === "ollama") return "Ollama 大模型";
  if (source === "minimax") return "MiniMax 大模型";
  return "规则引擎";
}

export function ProfitNodeAiCopilot({
  demoRole,
  baseline,
  context,
  disabled,
  onApplyCoefficients,
}: {
  demoRole: DemoRole;
  baseline: Baseline;
  context: {
    projectName: string;
    customerName: string;
    customerTier: string;
    productName: string;
    quantity: number;
    leadDays: number;
    status: string;
    isStandard: boolean;
    isSmallOrder: boolean;
    suggestedPrice: number;
    counterPrice: number | null;
    grossMarginAtSuggest: number;
    grossMarginAtOffer: number;
    winRate: number;
    requiredApprovalLabel: string;
    shuntChannel: "AUTO" | "COLLAB";
    shuntReasons: string[];
  };
  disabled: boolean;
  onApplyCoefficients: (patch: CoeffPatch) => void;
}) {
  const [activeNode, setActiveNode] = useState<NodeId>("customer");
  const [loadingNode, setLoadingNode] = useState<NodeId | null>(null);
  const [resultMap, setResultMap] = useState<Partial<Record<NodeId, NodeResult>>>(
    {},
  );
  const [assistantCsrf, setAssistantCsrf] = useState<string | null>(null);
  const [assistantCsrfRequired, setAssistantCsrfRequired] = useState(false);

  const playbook = useMemo(() => getRolePlaybook(demoRole), [demoRole]);

  useEffect(() => {
    void fetch(withClientBasePath("/api/assistant/quote-parse"))
      .then((r) => r.json())
      .then((j: { csrfToken?: string; csrfRequired?: boolean }) => {
        setAssistantCsrfRequired(Boolean(j.csrfRequired));
        setAssistantCsrf(j.csrfToken ?? null);
      })
      .catch(() => {
        setAssistantCsrf(null);
        setAssistantCsrfRequired(false);
      });
  }, []);

  const buildPrompt = useCallback(
    (node: NodeConfig) => {
      return [
        `关键节点：${node.title}`,
        `节点目标：${node.goal}`,
        `节点指令：${pickNodeInstruction(node.id)}`,
        `当前角色：${playbook.label}`,
        `角色关注：${playbook.agentFocus}`,
        `项目：${context.projectName}`,
        `客户：${context.customerName}（${context.customerTier}）`,
        `产品：${context.productName}`,
        `数量/交期：${context.quantity} / ${context.leadDays}天`,
        `项目状态：${context.status}`,
        `标品/小额：${context.isStandard ? "是" : "否"} / ${
          context.isSmallOrder ? "是" : "否"
        }`,
        `建议价：${context.suggestedPrice}`,
        `客户还价：${context.counterPrice ?? "无"}`,
        `建议毛利率：${context.grossMarginAtSuggest}%`,
        `还价毛利率：${context.grossMarginAtOffer}%`,
        `综合胜率：${context.winRate}%`,
        `建议审批链：${context.requiredApprovalLabel}`,
        `分流通道：${context.shuntChannel === "AUTO" ? "自动报价" : "人机协同"}`,
        `分流依据：${context.shuntReasons.join("；") || "无"}`,
        "请输出 summary/hints/patch JSON。",
        "若该节点不应调整系数，patch 必须是 {}。",
      ].join("\n");
    },
    [context, playbook],
  );

  const runNode = useCallback(
    async (node: NodeConfig) => {
      if (loadingNode) return;
      setActiveNode(node.id);
      setLoadingNode(node.id);
      try {
        const res = await fetch(withClientBasePath("/api/assistant/quote-parse"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...demoHeaders(),
            ...(assistantCsrf ? { [ASSISTANT_CSRF_HEADER]: assistantCsrf } : {}),
          },
          body: JSON.stringify({ text: buildPrompt(node), baseline }),
        });
        const requestId = res.headers.get("x-request-id");
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        const nextResult: NodeResult = !res.ok
          ? normalizeErrorResult(res.status, body, requestId)
          : isParseApiResponse(body)
            ? {
                ...body,
                requestId,
              }
            : normalizeErrorResult(res.status, body, requestId);
        setResultMap((prev) => ({
          ...prev,
          [node.id]: {
            ...nextResult,
          },
        }));
      } catch {
        setResultMap((prev) => ({
          ...prev,
          [node.id]: {
            source: "rules",
            summary: ["节点建议暂时不可用，请稍后重试。"],
            hints: ["接口调用失败，已回退到占位提示。"],
            patch: {},
            requestId: null,
          },
        }));
      } finally {
        setLoadingNode(null);
      }
    },
    [assistantCsrf, baseline, buildPrompt, loadingNode],
  );

  const activeResult = resultMap[activeNode];

  return (
    <section className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-4 shadow-sm dark:border-cyan-900/40 dark:bg-cyan-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">
            关键节点 AI 共驾（角色感知）
          </h2>
          <p className="mt-1 text-xs text-cyan-900/80 dark:text-cyan-200/80">
            对齐“客户需求→BOM→成本引擎→智能报价→分层审批”五段流程，按当前角色输出建议与风险提示。
          </p>
        </div>
        <span className="rounded-md border border-cyan-300 bg-white px-2 py-1 text-[10px] font-medium text-cyan-900 dark:border-cyan-800 dark:bg-slate-900 dark:text-cyan-200">
          当前角色：{playbook.label}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {NODE_CONFIGS.map((node) => (
          <button
            key={node.id}
            type="button"
            disabled={disabled || loadingNode !== null}
            onClick={() => void runNode(node)}
            className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
              activeNode === node.id
                ? "border-cyan-500 bg-cyan-100 text-cyan-950 dark:bg-cyan-900/40 dark:text-cyan-100"
                : "border-cyan-200 bg-white text-cyan-900 hover:bg-cyan-100 dark:border-cyan-900/50 dark:bg-slate-900 dark:text-cyan-200 dark:hover:bg-cyan-900/20"
            } disabled:opacity-60`}
          >
            <div className="font-semibold">{node.title}</div>
            <div className="mt-1 line-clamp-2 text-[11px] opacity-80">{node.goal}</div>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-cyan-200 bg-white p-3 text-xs dark:border-cyan-900/50 dark:bg-slate-950/60">
        {loadingNode === activeNode ? (
          <p className="text-cyan-900/80 dark:text-cyan-200/80">AI 正在生成建议…</p>
        ) : activeResult ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-medium text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-200">
                来源：{sourceLabel(activeResult.source)}
              </span>
              {activeResult.requestId ? (
                <span className="text-[10px] text-zinc-500">
                  request-id:{" "}
                  <code className="font-mono">{activeResult.requestId}</code>
                </span>
              ) : null}
            </div>

            {activeResult.summary.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-zinc-700 dark:text-zinc-300">
                {activeResult.summary.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            ) : null}

            {activeResult.hints.map((h) => (
              <p key={h} className="text-[11px] text-amber-800 dark:text-amber-300">
                {h}
              </p>
            ))}

            {activeResult.fallbackReason ? (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {activeResult.fallbackReason}
              </p>
            ) : null}

            {NODE_CONFIGS.find((n) => n.id === activeNode)?.canApplyPatch &&
            hasPatch(activeResult.patch) ? (
              <div className="pt-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onApplyCoefficients(activeResult.patch)}
                  className="rounded-md bg-cyan-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  应用该节点建议到系数
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-zinc-500 dark:text-zinc-400">
            请选择一个关键节点，生成角色化 AI 建议。
          </p>
        )}
      </div>

      {assistantCsrfRequired && !assistantCsrf ? (
        <p className="mt-2 text-[10px] text-zinc-500">
          正在准备安全会话（CSRF）…
        </p>
      ) : null}
    </section>
  );
}
