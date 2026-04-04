"use client";

import { useEffect, useMemo, useState } from "react";
import { withClientBasePath } from "@/lib/client-url";

type MePayload = {
  me: {
    userId: string;
    email: string | null;
    ztRole: string;
    progress: {
      points: number;
      lifetimePoints: number;
      rank: string;
      nextRankAt: number | null;
      progressToNext: number;
    } | null;
  };
  submissions: Array<{ id: string; title: string; createdAt: string }>;
  rankLogs: Array<{
    id: string;
    oldRank: string;
    newRank: string;
    points: number;
    createdAt: string;
  }>;
};

export function PersonalWorkspaceClient() {
  const [data, setData] = useState<MePayload | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(withClientBasePath("/api/zt/me"), {
          cache: "no-store",
          credentials: "include",
        });
        const j = (await r.json()) as MePayload | { error?: string };
        if (!r.ok) throw new Error((j as { error?: string }).error ?? "加载失败");
        if (!cancelled) setData(j as MePayload);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const progress = data?.me.progress ?? null;
  const nextLabel = useMemo(() => {
    if (!progress?.nextRankAt) return "已最高军衔";
    return `距升级还需 ${progress.progressToNext} 分`;
  }, [progress]);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-4">
        <Card label="当前军衔" value={progress?.rank ?? "-"} />
        <Card label="当前积分" value={String(progress?.points ?? 0)} />
        <Card label="累计积分" value={String(progress?.lifetimePoints ?? 0)} />
        <Card label="升级进度" value={nextLabel} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">最近军衔变更</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {(data?.rankLogs ?? []).map((x) => (
            <li key={x.id} className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-700">
              {new Date(x.createdAt).toLocaleString("zh-CN")}：{x.oldRank} {"->"} {x.newRank}（{x.points}分）
            </li>
          ))}
          {(data?.rankLogs?.length ?? 0) === 0 ? (
            <li className="text-slate-500">暂无军衔变更记录</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

