"use client";

import { FormEvent, useEffect, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type OverviewResponse = {
  user: {
    rank: string;
    points: number;
    lifetimePoints: number;
    progressToNext: number;
    nextRankAt: number | null;
  } | null;
};

type Redemption = {
  id: string;
  item: string;
  pointsCost: number;
  status: string;
  redeemCode: string;
  createdAt: string;
};

export function ZtHonorCenterClient() {
  const [overview, setOverview] = useState<OverviewResponse["user"]>(null);
  const [items, setItems] = useState<Redemption[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState("");
  const [form, setForm] = useState({ item: "Training Session", pointsCost: 100 });

  async function load() {
    setError("");
    const [ovRes, redRes] = await Promise.all([
      fetch(withClientBasePath("/api/zt/overview"), {
        cache: "no-store",
        credentials: "include",
        headers: { ...demoHeaders() },
      }),
      fetch(withClientBasePath("/api/zt/redemptions"), {
        cache: "no-store",
        credentials: "include",
        headers: { ...demoHeaders() },
      }),
    ]);
    const ov = (await ovRes.json().catch(() => ({}))) as OverviewResponse;
    const red = (await redRes.json().catch(() => ({}))) as {
      items?: Redemption[];
      message?: string;
    };
    if (!ovRes.ok || !redRes.ok) {
      throw new Error(red.message ?? "加载荣誉积分模块失败");
    }
    setOverview(ov.user ?? null);
    setItems(red.items ?? []);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  async function redeem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(withClientBasePath("/api/zt/redemptions"), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify(form),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? "兑换失败");
      setMessage("兑换申请已提交。");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "兑换失败");
    } finally {
      setBusy(false);
    }
  }

  async function reviewRedemption(id: string, decision: "APPROVED" | "REJECTED") {
    setReviewBusyId(id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(withClientBasePath("/api/zt/redemptions"), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({ id, decision }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? "审核失败");
      setMessage(
        decision === "APPROVED" ? "兑换申请已通过并进入发放流程。" : "兑换申请已驳回。",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "审核失败");
    } finally {
      setReviewBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold text-cyan-200">荣誉积分中心</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <p className="text-xs text-slate-400">当前军衔</p>
            <p className="mt-1 text-base font-semibold text-slate-100">
              {overview?.rank ?? "-"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <p className="text-xs text-slate-400">当前积分</p>
            <p className="mt-1 text-base font-semibold text-slate-100">
              {overview?.points ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <p className="text-xs text-slate-400">升级还需</p>
            <p className="mt-1 text-base font-semibold text-slate-100">
              {overview?.nextRankAt ? overview.progressToNext : "已最高"}
            </p>
          </div>
        </div>
      </section>

      <form
        className="grid gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-3"
        onSubmit={redeem}
      >
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={form.item}
          onChange={(e) => setForm((p) => ({ ...p, item: e.target.value }))}
        >
          <option value="Training Session">Training Session</option>
          <option value="1:1 Coaching">1:1 Coaching</option>
          <option value="Monthly Honor Pack">Monthly Honor Pack</option>
        </select>
        <select
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={form.pointsCost}
          onChange={(e) =>
            setForm((p) => ({ ...p, pointsCost: Number(e.target.value) }))
          }
        >
          <option value={100}>100</option>
          <option value={300}>300</option>
          <option value={500}>500</option>
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200 disabled:opacity-60"
        >
          {busy ? "提交中..." : "发起兑换申请"}
        </button>
      </form>

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

      <section className="space-y-2">
        {items.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-slate-100">{r.item}</p>
              <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300">
                {r.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              cost {r.pointsCost} · code {r.redeemCode}
            </p>
            {r.status === "REQUESTED" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={Boolean(reviewBusyId)}
                  onClick={() => void reviewRedemption(r.id, "APPROVED")}
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200 disabled:opacity-50"
                >
                  {reviewBusyId === r.id ? "处理中..." : "审核通过"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(reviewBusyId)}
                  onClick={() => void reviewRedemption(r.id, "REJECTED")}
                  className="rounded-md border border-rose-500/30 bg-rose-500/15 px-2.5 py-1 text-xs text-rose-200 disabled:opacity-50"
                >
                  {reviewBusyId === r.id ? "处理中..." : "驳回"}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
