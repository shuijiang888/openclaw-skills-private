"use client";

import { useCallback, useState } from "react";

type ThresholdState = {
  marginHighPct: number;
  growthHighPct: number;
};

export function CompassQuadrantThresholdEditor({
  initial,
}: {
  initial: ThresholdState;
}) {
  const [marginHighPct, setMarginHighPct] = useState(initial.marginHighPct);
  const [growthHighPct, setGrowthHighPct] = useState(initial.growthHighPct);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const r = await fetch("/api/console/compass-quadrant-threshold");
    if (!r.ok) return;
    const j = (await r.json()) as ThresholdState;
    setMarginHighPct(j.marginHighPct);
    setGrowthHighPct(j.growthHighPct);
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/console/compass-quadrant-threshold", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginHighPct, growthHighPct }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "保存失败");
      }
      setMsg("已保存；盈利罗盘四象限与表格将按新阈值即时重算。");
      await reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="text-zinc-500">「高毛利」下限（%）</span>
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
            value={marginHighPct}
            onChange={(e) => setMarginHighPct(Number(e.target.value))}
          />
          <span className="mt-0.5 block text-[11px] text-zinc-500">
            毛利率 ≥ 该值视为「高毛利」
          </span>
        </label>
        <label className="block text-xs">
          <span className="text-zinc-500">「高增长」下限（%）</span>
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
            value={growthHighPct}
            onChange={(e) => setGrowthHighPct(Number(e.target.value))}
          />
          <span className="mt-0.5 block text-[11px] text-zinc-500">
            增长率 ≥ 该值视为「高增长」
          </span>
        </label>
      </div>
      {msg ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">{msg}</p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
      >
        {busy ? "保存中…" : "保存阈值"}
      </button>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        前台四象限与表格中的象限标签由「毛利率 + 增长」按上述阈值计算；与种子数据里的{" "}
        <code className="rounded bg-zinc-100 px-0.5 dark:bg-zinc-800">quadrant</code>{" "}
        字段无关，修改阈值后立即生效。
      </p>
    </div>
  );
}
