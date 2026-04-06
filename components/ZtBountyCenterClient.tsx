"use client";

import { FormEvent, useEffect, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type BountyTask = {
  id: string;
  intelDefId?: string | null;
  title: string;
  description: string;
  rewardPoints: number;
  status: string;
};

type IntelDef = {
  id: string;
  code: string;
  name: string;
  category: string;
  requiredFields: string[];
  allowedSignalTypes: string[];
  allowedFormats: string[];
  defaultRewardPoints: number;
};

const BUILTIN_SUBMISSION_FIELDS = new Set([
  "title",
  "content",
  "region",
  "signalType",
  "format",
  "taskId",
  "intelDefId",
]);

function prettyFieldLabel(field: string): string {
  const key = String(field ?? "").trim();
  if (key === "competitor") return "竞品名称";
  if (key === "evidence") return "证据来源";
  if (key === "customerName") return "客户名称";
  if (key === "nextAction") return "下一步动作";
  if (key === "impactLevel") return "影响等级";
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

export function ZtBountyCenterClient() {
  const [tasks, setTasks] = useState<BountyTask[]>([]);
  const [intelDefs, setIntelDefs] = useState<IntelDef[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lastFeedback, setLastFeedback] = useState<{
    pointsDelta: number;
    currentPoints: number;
    rank: string;
    ledgerId: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    intelDefId: "",
    title: "",
    region: "",
    format: "text",
    signalType: "tactical",
    content: "",
    taskId: "",
    extraFields: {} as Record<string, string>,
  });
  const selectedIntelDef =
    intelDefs.find((x) => x.id === form.intelDefId) ?? null;
  const dynamicRequiredFields = (selectedIntelDef?.requiredFields ?? []).filter(
    (field) => !BUILTIN_SUBMISSION_FIELDS.has(field),
  );

  async function load() {
    const res = await fetch(withClientBasePath("/api/zt/bounty-tasks"), {
      cache: "no-store",
      credentials: "include",
      headers: { ...demoHeaders() },
    });
    const payload = (await res.json().catch(() => ({}))) as {
      items?: BountyTask[];
      message?: string;
    };
    if (!res.ok) throw new Error(payload.message ?? "加载悬赏任务失败");
    setTasks(payload.items ?? []);

    const defsRes = await fetch(withClientBasePath("/api/zt/intel-definitions"), {
      cache: "no-store",
      credentials: "include",
      headers: { ...demoHeaders() },
    });
    const defsPayload = (await defsRes.json().catch(() => ({}))) as {
      items?: IntelDef[];
      message?: string;
      error?: string;
    };
    if (!defsRes.ok) {
      throw new Error(defsPayload.message ?? defsPayload.error ?? "加载情报定义失败");
    }
    const defs = defsPayload.items ?? [];
    setIntelDefs(defs);
    setForm((prev) => {
      const currentValid = defs.some((x) => x.id === prev.intelDefId);
      return {
        ...prev,
        intelDefId: currentValid ? prev.intelDefId : defs[0]?.id ?? "",
      };
    });
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  async function submitSignal(e: FormEvent) {
    e.preventDefault();
    if (!form.intelDefId) {
      setError("请先选择商业情报定义。");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(withClientBasePath("/api/zt/submissions"), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({
          ...form,
          taskId: form.taskId || undefined,
          extraFields: form.extraFields,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        feedback?: {
          pointsDelta: number;
          currentPoints: number;
          rank: string;
          rankChanged: boolean;
          ledgerId: string;
        };
      };
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? "提交失败");
      setMessage("情报提交成功，系统已自动计分。");
      if (payload.feedback) {
        setLastFeedback({
          pointsDelta: payload.feedback.pointsDelta,
          currentPoints: payload.feedback.currentPoints,
          rank: payload.feedback.rank,
          ledgerId: payload.feedback.ledgerId,
        });
      }
      setForm({
        intelDefId: intelDefs[0]?.id ?? "",
        title: "",
        region: "",
        format: "text",
        signalType: "tactical",
        content: "",
        taskId: "",
        extraFields: {},
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-3">
        <h2 className="text-lg font-semibold text-cyan-200">任务悬赏中心</h2>
        <p className="mt-1 text-xs text-slate-400">
          选择悬赏任务并提交情报，提交成功后自动进入积分闭环。
        </p>
        <div className="mt-3 space-y-2">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-100">{t.title}</p>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                  +{t.rewardPoints}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{t.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
        <h2 className="text-lg font-semibold text-cyan-200">提交情报</h2>
        <form className="mt-3 space-y-2" onSubmit={submitSignal}>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={form.intelDefId}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                intelDefId: e.target.value,
                extraFields: {},
              }))
            }
            required
          >
            {intelDefs.length === 0 ? (
              <option value="">暂无可用商情定义（请后台先配置）</option>
            ) : null}
            {intelDefs.map((d) => (
              <option key={d.id} value={d.id}>
                [{d.category}] {d.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="标题"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="区域"
            value={form.region}
            onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
            required={
              selectedIntelDef?.requiredFields?.includes("region") ?? false
            }
          />
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={form.signalType}
            onChange={(e) => setForm((p) => ({ ...p, signalType: e.target.value }))}
          >
            {(selectedIntelDef?.allowedSignalTypes?.length
              ? selectedIntelDef.allowedSignalTypes
              : ["strategic", "tactical", "knowledge"]
            ).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={form.format}
            onChange={(e) => setForm((p) => ({ ...p, format: e.target.value }))}
          >
            {(selectedIntelDef?.allowedFormats?.length
              ? selectedIntelDef.allowedFormats
              : ["text", "image", "video", "voice", "link"]
            ).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={form.taskId}
            onChange={(e) =>
              setForm((p) => {
                const nextTaskId = e.target.value;
                const task = tasks.find((t) => t.id === nextTaskId);
                return {
                  ...p,
                  taskId: nextTaskId,
                  intelDefId: task?.intelDefId ?? p.intelDefId,
                };
              })
            }
          >
            <option value="">关联任务（可选）</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            placeholder="内容"
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
            required
          />
          {dynamicRequiredFields.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {dynamicRequiredFields.map((field) => (
                <input
                  key={field}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder={`${prettyFieldLabel(field)}（必填）`}
                  value={form.extraFields[field] ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      extraFields: {
                        ...p.extraFields,
                        [field]: e.target.value,
                      },
                    }))
                  }
                  required
                />
              ))}
            </div>
          ) : null}
          {selectedIntelDef ? (
            <p className="text-[11px] text-slate-400">
              当前商情定义：{selectedIntelDef.name}（必填：
              {selectedIntelDef.requiredFields.join("、") || "title/content"}）
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !form.intelDefId}
            className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-sm text-cyan-200 disabled:opacity-60"
          >
            {busy
              ? "提交中..."
              : !form.intelDefId
                ? "请先配置商情定义"
                : "提交情报 +8"}
          </button>
        </form>
        {message ? (
          <p className="mt-2 text-xs text-emerald-300">{message}</p>
        ) : null}
        {lastFeedback ? (
          <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
            +{lastFeedback.pointsDelta} 分 · 当前 {lastFeedback.currentPoints} 分 · 军衔 {lastFeedback.rank} · 流水 {lastFeedback.ledgerId}
          </div>
        ) : null}
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
