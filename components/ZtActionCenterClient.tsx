"use client";

import { useEffect, useMemo, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type ActionCard = {
  id: string;
  title: string;
  reason: string;
  suggestion: string;
  priority: string;
  status: string;
  rewardPoints: number;
};

function priorityBadge(priority: string) {
  const p = priority.toUpperCase();
  if (p === "P0") return "bg-rose-500/15 text-rose-200 border-rose-500/40";
  if (p === "P1")
    return "bg-amber-500/15 text-amber-200 border-amber-500/40";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
}

export function ZtActionCenterClient() {
  const [items, setItems] = useState<ActionCard[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const res = await fetch(withClientBasePath("/api/zt/action-cards"), {
      cache: "no-store",
      credentials: "include",
      headers: { ...demoHeaders() },
    });
    const payload = (await res.json().catch(() => ({}))) as {
      items?: ActionCard[];
      message?: string;
    };
    if (!res.ok) throw new Error(payload.message ?? "加载行动卡失败");
    setItems(payload.items ?? []);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  const doneCount = useMemo(
    () => items.filter((x) => x.status === "DONE").length,
    [items],
  );

  async function markDone(id: string) {
    setBusy(id);
    setMessage("");
    setError("");
    try {
      const res = await fetch(withClientBasePath(`/api/zt/action-cards/${id}/done`), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({}),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? "操作失败");
      setMessage("行动卡已完成并更新积分。");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-cyan-200">行动中心</h2>
          <span className="text-xs text-slate-400">
            done {doneCount}/{items.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          这里是可操作页面：点击完成后将直接写入积分和军衔流水。
        </p>
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-100">{c.title}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${priorityBadge(c.priority)}`}
              >
                {c.priority}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{c.reason}</p>
            <p className="mt-1 text-xs text-slate-300">{c.suggestion}</p>
            <button
              type="button"
              disabled={c.status === "DONE" || busy === c.id}
              onClick={() => void markDone(c.id)}
              className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200 disabled:opacity-40"
            >
              {c.status === "DONE"
                ? "DONE"
                : busy === c.id
                  ? "提交中..."
                  : `Mark Done +${c.rewardPoints}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
