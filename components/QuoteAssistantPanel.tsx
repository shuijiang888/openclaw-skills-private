"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentMascot } from "@/components/AgentMascot";
import { demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
import type { DemoRole } from "@/lib/approval";
import { parseDemoRole } from "@/lib/approval";
import { ASSISTANT_CSRF_HEADER } from "@/lib/agent-csrf-constants";
import {
  parseQuoteNaturalLanguage,
  type CoeffPatch,
} from "@/lib/quote-natural-language";
import { getRolePlaybook } from "@/lib/role-playbook";
import { withClientBasePath } from "@/lib/client-url";

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

type LlmStatusJson = {
  provider: "none" | "ollama" | "minimax";
  llmEnabled: boolean;
  llmPasswordRequired: boolean;
  llmProviderLabel: string;
  llmModel: string | null;
  minimaxConfigured?: boolean;
  minimaxBaseUrl?: string | null;
  ollamaEnabled?: boolean;
  model: string | null;
  baseUrl: string | null;
  reachable: boolean;
  modelReady: boolean;
  availableModels: string[];
  latencyMs: number;
  error?: string;
};

/** A1：可点击触发已有流程（人在回路） */
export type QuoteAgentQuickActions = {
  busy: boolean;
  locked: boolean;
  pendingRole: string | null;
  canActApprove: boolean;
  onRecalculate: () => void | Promise<void>;
  onSubmitApproval: () => void | Promise<void>;
  onApprove: () => void | Promise<void>;
  onRefreshProject: () => void | Promise<void>;
};

export function QuoteAssistantPanel({
  baseline,
  disabled,
  onApplyCoefficients,
  agentQuickActions,
  demoRole: demoRoleProp,
}: {
  baseline: Baseline;
  disabled: boolean;
  onApplyCoefficients: (patch: CoeffPatch) => void;
  /** A1：与报价台主按钮同源 API，便于在助手内一键触发 */
  agentQuickActions?: QuoteAgentQuickActions | null;
  /** 与左侧工作台身份一致时，示例与引导随角色变化 */
  demoRole?: DemoRole;
}) {
  const sessionRole = parseDemoRole(useDemoRole());
  const actorRole = demoRoleProp ?? sessionRole;
  const playbook = useMemo(
    () => getRolePlaybook(actorRole),
    [actorRole],
  );
  const examples = playbook.quoteExamples;
  const quickPhrases = playbook.agentQuickPhrases ?? [];

  const [text, setText] = useState("");
  const [parsedSummary, setParsedSummary] = useState<string[]>([]);
  const [parsedHints, setParsedHints] = useState<string[]>([]);
  const [lastPatch, setLastPatch] = useState<CoeffPatch | null>(null);
  const [parsing, setParsing] = useState(false);
  const [lastSource, setLastSource] = useState<
    "ollama" | "minimax" | "rules" | null
  >(
    null,
  );
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(
    null,
  );
  const [llmModel, setLlmModel] = useState<string | null>(null);
  const [llmProviderLabel, setLlmProviderLabel] = useState<string>("未启用");
  const [llmPasswordRequired, setLlmPasswordRequired] = useState(true);
  const [llmPassword, setLlmPassword] = useState("");
  const [llmPasswordError, setLlmPasswordError] = useState<string | null>(null);
  const [lastParseRequestId, setLastParseRequestId] = useState<string | null>(
    null,
  );
  const [llmProbe, setLlmProbe] = useState<LlmStatusJson | null>(null);
  const [probeBusy, setProbeBusy] = useState(false);
  /** 与 GET /api/assistant/quote-parse 下发的 Cookie 成对，生产环境 CSRF 必填 */
  const [assistantCsrf, setAssistantCsrf] = useState<string | null>(null);
  const [assistantCsrfRequired, setAssistantCsrfRequired] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const syncAssistantConfig = useCallback((j: {
    llmEnabled?: boolean;
    llmPasswordRequired?: boolean;
    llmProviderLabel?: string;
    model?: string | null;
    csrfToken?: string;
    csrfRequired?: boolean;
  }) => {
    setLlmConfigured(Boolean(j.llmEnabled));
    setLlmModel(j.model ?? null);
    setLlmProviderLabel(j.llmProviderLabel ?? "未启用");
    setLlmPasswordRequired(j.llmPasswordRequired ?? true);
    setAssistantCsrfRequired(Boolean(j.csrfRequired));
    if (typeof j.csrfToken === "string" && j.csrfToken.length > 0) {
      setAssistantCsrf(j.csrfToken);
    } else if (!j.csrfRequired) {
      setAssistantCsrf(null);
    }
  }, []);

  const runLlmProbe = useCallback(() => {
    setProbeBusy(true);
    void fetch(withClientBasePath("/api/assistant/ollama-status"))
      .then(async (r) => (await r.json()) as LlmStatusJson)
      .then(setLlmProbe)
      .catch(() =>
        setLlmProbe({
          provider: "none",
          llmEnabled: false,
          llmPasswordRequired: true,
          llmProviderLabel: "不可用",
          llmModel: null,
          model: null,
          baseUrl: null,
          reachable: false,
          modelReady: false,
          availableModels: [],
          latencyMs: 0,
          error: "状态接口请求失败",
        }),
      )
      .finally(() => setProbeBusy(false));
  }, []);

  useEffect(() => {
    if (llmConfigured !== true) {
      setLlmProbe(null);
      return;
    }
    runLlmProbe();
  }, [llmConfigured, runLlmProbe]);

  useEffect(() => {
    void fetch(withClientBasePath("/api/assistant/quote-parse"))
      .then((r) => r.json())
      .then(syncAssistantConfig)
      .catch(() => {
        setLlmConfigured(false);
        setLlmModel(null);
        setLlmProviderLabel("未启用");
        setLlmPasswordRequired(true);
        setAssistantCsrf(null);
        setAssistantCsrfRequired(false);
      });
  }, [syncAssistantConfig]);

  const applyLocalRules = useCallback(() => {
    const r = parseQuoteNaturalLanguage(text, baseline);
    setParsedSummary(r.summary);
    setParsedHints(r.hints);
    setLastSource("rules");
    setFallbackReason(null);
    setLastParseRequestId(null);
    setLastPatch(Object.keys(r.patch).length ? r.patch : null);
  }, [text, baseline]);

  const runParse = useCallback(async () => {
    if (!text.trim()) {
      applyLocalRules();
      return;
    }
    setParsing(true);
    setFallbackReason(null);
    setLlmPasswordError(null);
    try {
      const res = await fetch(withClientBasePath("/api/assistant/quote-parse"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...demoHeaders(),
          ...(assistantCsrf
            ? { [ASSISTANT_CSRF_HEADER]: assistantCsrf }
            : {}),
        },
        body: JSON.stringify({
          text,
          baseline,
          llmPassword: llmPassword.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          code?: string;
          error?: string;
        };
        if (res.status === 403 && errJson.code === "llm_password_invalid") {
          setLlmPasswordError(errJson.error ?? "密码错误，未启用大模型。");
        }
        if (res.status === 403 && errJson.code === "csrf_failed") {
          const r2 = await fetch(withClientBasePath("/api/assistant/quote-parse"));
          if (r2.ok) {
            const j2 = (await r2.json()) as { csrfToken?: string };
            if (typeof j2.csrfToken === "string") setAssistantCsrf(j2.csrfToken);
          }
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as ParseApiResponse;
      setParsedSummary(data.summary);
      setParsedHints(data.hints);
      setLastSource(data.source);
      setFallbackReason(data.fallbackReason ?? null);
      setLastParseRequestId(res.headers.get("x-request-id"));
      setLastPatch(Object.keys(data.patch).length ? data.patch : null);
    } catch {
      const r = parseQuoteNaturalLanguage(text, baseline);
      setParsedSummary(r.summary);
      setParsedHints(["请求解析接口失败，已改用本地规则。", ...r.hints]);
      setLastSource("rules");
      setFallbackReason(null);
      setLastParseRequestId(null);
      setLastPatch(Object.keys(r.patch).length ? r.patch : null);
    } finally {
      setParsing(false);
    }
  }, [text, baseline, applyLocalRules, assistantCsrf, llmPassword]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const v = typeof reader.result === "string" ? reader.result : "";
      setText(v.slice(0, 8000));
    };
    reader.readAsText(f, "UTF-8");
    e.target.value = "";
  };

  const assistantRemoteReady =
    llmConfigured !== null &&
    (!assistantCsrfRequired || assistantCsrf !== null);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/90 via-white to-white p-4 shadow-md dark:border-violet-900/40 dark:from-violet-950/50 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/10" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <AgentMascot size={64} />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-violet-950 dark:text-violet-200">
                报价智能助手
                <span className="ml-2 rounded-md bg-violet-200/60 px-1.5 py-0.5 text-[10px] font-medium text-violet-900 dark:bg-violet-900/50 dark:text-violet-200">
                  {playbook.label}
                </span>
              </h2>
              <p className="mt-0.5 text-[10px] font-medium text-violet-900/85 dark:text-violet-200/85">
                本档优先：{playbook.priorities[0]?.title ?? "系数与风险"} —{" "}
                {playbook.priorities[0]?.detail.slice(0, 72)}
                {(playbook.priorities[0]?.detail.length ?? 0) > 72 ? "…" : ""}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-violet-800/80 dark:text-violet-300/70">
                用中文描述商机与客户诉求；可通过{" "}
                <strong>{llmProviderLabel}</strong> 大模型解析系数（未通过密码校验时自动回退规则引擎）（需在{" "}
                <code className="rounded bg-violet-100 px-0.5 dark:bg-violet-900/50">
                  .env
                </code>{" "}
                中开启），失败时自动回退规则引擎。支持粘贴与文本文件导入。
              </p>
              {llmConfigured === true ? (
                <div className="mt-1.5 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                      大模型已启用：{llmModel ?? "—"}（当前提供方：{llmProviderLabel}）
                    </p>
                    <button
                      type="button"
                      disabled={probeBusy}
                      onClick={() => runLlmProbe()}
                      className="rounded border border-emerald-300/80 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
                    >
                      {probeBusy ? "检测中…" : "检测连接"}
                    </button>
                  </div>
                  {llmPasswordRequired ? (
                    <div className="space-y-1">
                      <label className="block text-[10px] text-violet-900 dark:text-violet-200">
                        每次调用大模型密码（由系统拥有者控制）
                      </label>
                      <input
                        type="password"
                        value={llmPassword}
                        onChange={(e) => setLlmPassword(e.target.value)}
                        placeholder="输入密码后才会启用大模型"
                        className="w-full rounded-md border border-violet-300 bg-white px-2 py-1.5 text-xs text-slate-900 dark:border-violet-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                      {llmPasswordError ? (
                        <p className="text-[10px] text-red-700 dark:text-red-300">
                          {llmPasswordError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {llmProbe?.llmEnabled ? (
                    llmProbe.reachable && llmProbe.modelReady ? (
                      <p className="text-[10px] text-emerald-800/90 dark:text-emerald-300/90">
                        {llmProviderLabel} 服务可达，模型已就绪（{llmProbe.latencyMs}
                        ms）。
                      </p>
                    ) : llmProbe.reachable ? (
                      <p className="text-[10px] text-amber-900 dark:text-amber-200">
                        已连上 {llmProviderLabel}，但未找到配置模型：{llmProbe.error ?? "请检查模型配置"}{" "}
                        {llmProbe.availableModels.length > 0
                          ? `（可见模型：${llmProbe.availableModels.slice(0, 4).join("、")}…）`
                          : null}
                      </p>
                    ) : (
                      <p className="text-[10px] text-red-700 dark:text-red-300">
                        无法连接 {llmProviderLabel}：{llmProbe.error ?? "请确认网络与 API 配置"}
                      </p>
                    )
                  ) : llmProbe === null ? (
                    <p className="text-[10px] text-zinc-500">正在检测大模型服务…</p>
                  ) : null}
                </div>
              ) : llmConfigured === false ? (
                <p className="mt-1.5 text-[10px] text-zinc-600 dark:text-zinc-400">
                  当前未启用大模型，解析将仅用规则。可设置以下任一配置：
                  <code className="mx-1 rounded bg-zinc-200/80 px-0.5 dark:bg-zinc-700">
                    OLLAMA_ENABLED=1
                  </code>
                  或
                  <code className="mx-1 rounded bg-zinc-200/80 px-0.5 dark:bg-zinc-700">
                    MINIMAX_ENABLED=1
                  </code>
                  。
                </p>
              ) : null}
            </div>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${
              lastSource === "ollama" || lastSource === "minimax"
                ? "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300"
                : lastSource === "rules"
                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  : "bg-violet-600/10 text-violet-800 dark:text-violet-200"
            }`}
          >
            {lastSource === "ollama" || lastSource === "minimax"
              ? "大模型"
              : lastSource === "rules"
                ? "规则"
                : "文本"}
          </span>
        </div>

        <textarea
          className="mt-3 min-h-[120px] w-full resize-y rounded-xl border border-violet-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/25 dark:border-violet-800/60 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="例如：战略客户催单，小批量加急，需要改板定制…"
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {llmConfigured === null ? (
          <p className="mt-1.5 text-[10px] text-zinc-500">正在连接助手服务…</p>
        ) : assistantCsrfRequired && !assistantCsrf ? (
          <p className="mt-1.5 text-[10px] text-zinc-500">
            正在准备安全会话（CSRF）…
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || parsing || !assistantRemoteReady}
            onClick={() => void runParse()}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50"
          >
            {parsing ? "解析中…" : "解析语义"}
          </button>
          <button
            type="button"
            disabled={disabled || parsing}
            onClick={applyLocalRules}
            className="rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-100/80 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200"
          >
            仅用规则
          </button>
          <button
            type="button"
            disabled={disabled || !lastPatch}
            onClick={() => lastPatch && onApplyCoefficients(lastPatch)}
            className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-violet-950/50"
          >
            应用到系数
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-950/40"
          >
            导入文本文件
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={onPickFile}
          />
        </div>

        <p className="mt-2 text-[10px] text-violet-700/70 dark:text-violet-400/70">
          快捷示例（点击填入）：
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {examples.map((ex, i) => (
            <button
              key={`ex-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => setText(ex)}
              className="max-w-full truncate rounded-full border border-violet-200/80 bg-white/80 px-2.5 py-1 text-[10px] text-violet-900 hover:bg-violet-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-200"
              title={ex}
            >
              {ex.length > 20 ? `${ex.slice(0, 18)}…` : ex}
            </button>
          ))}
        </div>

        {quickPhrases.length > 0 ? (
          <>
            <p className="mt-3 text-[10px] text-violet-700/70 dark:text-violet-400/70">
              角色话术（追加到输入框，便于与描述混写）：
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {quickPhrases.map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setText((prev) =>
                      prev.trim()
                        ? `${prev.trim()}\n${qp.text}`
                        : qp.text,
                    )
                  }
                  className="rounded-full border border-emerald-200/90 bg-emerald-50/80 px-2.5 py-1 text-[10px] font-medium text-emerald-900 hover:bg-emerald-100/80 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  title={qp.text}
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {agentQuickActions ? (
          <div className="mt-4 rounded-xl border border-violet-300/60 bg-violet-100/30 p-3 dark:border-violet-800/60 dark:bg-violet-950/30">
            <h3 className="text-[11px] font-semibold text-violet-950 dark:text-violet-200">
              快捷操作（A1 · 人点确认）
            </h3>
            <p className="mt-1 text-[10px] leading-relaxed text-violet-900/80 dark:text-violet-300/75">
              以下直接调用与左侧工作台相同的接口；不自动执行，需您确认点击。
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  disabled || agentQuickActions.busy || !lastPatch
                }
                onClick={() => lastPatch && onApplyCoefficients(lastPatch)}
                className="rounded-lg bg-violet-700 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
              >
                应用解析到系数
              </button>
              <button
                type="button"
                disabled={disabled || agentQuickActions.busy || agentQuickActions.locked}
                onClick={() => void agentQuickActions.onRecalculate()}
                className="rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-[10px] font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-slate-900 dark:text-violet-200"
              >
                重新测算
              </button>
              <button
                type="button"
                disabled={disabled || agentQuickActions.busy}
                onClick={() => void agentQuickActions.onRefreshProject()}
                className="rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-[10px] font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-slate-900 dark:text-violet-200"
              >
                刷新本单
              </button>
              <button
                type="button"
                disabled={
                  disabled ||
                  agentQuickActions.busy ||
                  agentQuickActions.locked ||
                  !!agentQuickActions.pendingRole
                }
                onClick={() => void agentQuickActions.onSubmitApproval()}
                className="rounded-lg border border-zinc-400 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                提交审批
              </button>
              <button
                type="button"
                disabled={
                  disabled ||
                  agentQuickActions.busy ||
                  agentQuickActions.locked ||
                  !agentQuickActions.pendingRole ||
                  !agentQuickActions.canActApprove
                }
                onClick={() => void agentQuickActions.onApprove()}
                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                审批通过
              </button>
              <a
                href={withClientBasePath("/api/export/projects")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-violet-300 px-2.5 py-1.5 text-[10px] font-medium text-violet-900 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-950/50"
              >
                导出项目 CSV
              </a>
            </div>
          </div>
        ) : null}

        {(parsedSummary.length > 0 || parsedHints.length > 0) && (
          <div className="mt-3 space-y-2 rounded-xl border border-violet-100 bg-white/70 p-3 text-xs dark:border-violet-900/40 dark:bg-slate-950/60">
            {fallbackReason ? (
              <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                {fallbackReason}
              </p>
            ) : null}
            {parsedSummary.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-slate-700 dark:text-slate-300">
                {parsedSummary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            {parsedHints.map((h) => (
              <p
                key={h}
                className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-200/90"
              >
                {h}
              </p>
            ))}
            {lastParseRequestId ? (
              <p className="border-t border-violet-100 pt-2 text-[10px] text-zinc-600 dark:border-violet-900/50 dark:text-zinc-400">
                本次解析{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono dark:bg-zinc-800">
                  x-request-id
                </code>
                ：<span className="font-mono">{lastParseRequestId}</span>
                {" · "}
                <Link
                  href="/console/agent-audit"
                  className="font-medium text-violet-700 underline dark:text-violet-300"
                >
                  智能体审计
                </Link>
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
