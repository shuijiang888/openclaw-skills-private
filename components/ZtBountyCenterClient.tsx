"use client";

import { FormEvent, useEffect, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type BountyTask = {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  status: string;
};

export function ZtBountyCenterClient() {
  const [tasks, setTasks] = useState<BountyTask[]>([]);
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
    title: "",
    region: "",
    format: "text",
    signalType: "tactical",
    content: "",
    taskId: "",
  });

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
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  async function submitSignal(e: FormEvent) {
    e.preventDefault();
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
        title: "",
        region: "",
        format: "text",
        signalType: "tactical",
        content: "",
        taskId: "",
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
          />
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={form.taskId}
            onChange={(e) => setForm((p) => ({ ...p, taskId: e.target.value }))}
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
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-sm text-cyan-200 disabled:opacity-60"
          >
            {busy ? "提交中..." : "提交情报 +8"}
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
