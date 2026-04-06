"use client";

import { useEffect, useMemo, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type Snapshot = {
  generatedAt: string;
  scopeLabel: string;
  kpis: {
    submissions: number;
    activeTasks: number;
    hotCities: number;
    activePublishers: number;
    pendingActions: number;
    totalPoints: number;
  };
  hotspots: {
    byCity: Array<{ city: string; count: number; last7d: number; delta7d: number }>;
    byPublisher: Array<{ publisher: string; count: number; actorRole: string }>;
    byTask: Array<{
      taskId: string;
      title: string;
      submissions: number;
      status: string;
      rewardPoints: number;
    }>;
    byPoints: Array<{ actor: string; points: number; rank: string }>;
    byDefinition: Array<{
      definitionId: string;
      category: string;
      name: string;
      count: number;
    }>;
  };
  warnings: string[];
  opportunities: string[];
};

const BOARD_ORDER = ["city", "publisher", "task", "points", "definition"] as const;
type BoardKey = (typeof BOARD_ORDER)[number];

export function ZtWarRoomBoard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [board, setBoard] = useState<BoardKey>("city");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(withClientBasePath("/api/zt/strategist/snapshot"), {
        cache: "no-store",
        credentials: "include",
        headers: { ...demoHeaders() },
      });
      const payload = (await res.json().catch(() => ({}))) as
        | { ok: boolean; snapshot: Snapshot }
        | { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(
          (payload as { message?: string; error?: string }).message ??
            (payload as { error?: string }).error ??
            "战情大屏加载失败",
        );
      }
      const nextSnapshot =
        "snapshot" in payload && payload.snapshot ? payload.snapshot : null;
      if (!nextSnapshot) throw new Error("战情数据为空");
      setSnapshot(nextSnapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBoard((prev) => {
        const idx = BOARD_ORDER.indexOf(prev);
        const next = (idx + 1) % BOARD_ORDER.length;
        return BOARD_ORDER[next];
      });
    }, 8000);
    return () => window.clearInterval(timer);
  }, []);

  const title = useMemo(() => {
    if (board === "city") return "城市战区热点";
    if (board === "publisher") return "情报发布人榜";
    if (board === "task") return "任务攻坚态势";
    if (board === "points") return "积分军衔战绩榜";
    return "商情定义命中榜";
  }, [board]);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/35 p-5 text-slate-100 shadow-2xl shadow-cyan-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
              Command Screen · Live
            </p>
            <h2 className="mt-1 text-2xl font-black text-cyan-100 sm:text-3xl">{title}</h2>
            <p className="mt-1 text-xs text-slate-300">
              {snapshot
                ? `数据视角：${snapshot.scopeLabel} · 更新时间：${new Date(snapshot.generatedAt).toLocaleString("zh-CN")}`
                : "正在接入战情数据流..."}
            </p>
          </div>
          <div className="flex gap-2">
            {BOARD_ORDER.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setBoard(x)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  board === x
                    ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                    : "border-slate-600 text-slate-300 hover:border-cyan-500/60"
                }`}
              >
                {x === "city"
                  ? "城市"
                  : x === "publisher"
                    ? "发布人"
                    : x === "task"
                      ? "任务"
                      : x === "points"
                        ? "积分"
                        : "定义"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="情报总量" value={String(snapshot?.kpis.submissions ?? 0)} />
          <Kpi label="待执行行动卡" value={String(snapshot?.kpis.pendingActions ?? 0)} />
          <Kpi label="积分总量" value={String(snapshot?.kpis.totalPoints ?? 0)} />
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-300/25 bg-slate-950/45 p-4">
          {busy ? <p className="text-sm text-cyan-200">战情链路同步中...</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {!busy && !error && snapshot ? (
            <BoardTable board={board} snapshot={snapshot} />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/20 px-4 py-3">
      <p className="text-xs text-cyan-200/80">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function BoardTable({ board, snapshot }: { board: BoardKey; snapshot: Snapshot }) {
  if (board === "city") {
    return (
      <Table
        headers={["城市", "总量", "近7天", "环比"]}
        rows={snapshot.hotspots.byCity.map((x) => [
          x.city,
          String(x.count),
          String(x.last7d),
          `${x.delta7d >= 0 ? "+" : ""}${x.delta7d}`,
        ])}
      />
    );
  }
  if (board === "publisher") {
    return (
      <Table
        headers={["发布人", "角色", "提交数"]}
        rows={snapshot.hotspots.byPublisher.map((x) => [
          x.publisher,
          x.actorRole,
          String(x.count),
        ])}
      />
    );
  }
  if (board === "task") {
    return (
      <Table
        headers={["任务", "提交数", "奖励", "状态"]}
        rows={snapshot.hotspots.byTask.map((x) => [
          x.title,
          String(x.submissions),
          String(x.rewardPoints),
          x.status,
        ])}
      />
    );
  }
  if (board === "points") {
    return (
      <Table
        headers={["人员", "军衔", "积分"]}
        rows={snapshot.hotspots.byPoints.map((x) => [x.actor, x.rank, String(x.points)])}
      />
    );
  }
  return (
    <Table
      headers={["定义", "分类", "命中"]}
      rows={snapshot.hotspots.byDefinition.map((x) => [x.name, x.category, String(x.count)])}
    />
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-300">当前维度暂无可展示数据。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-cyan-900/50 text-cyan-200">
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={`${idx}-${r[0] ?? idx}`}
              className="border-b border-slate-800/70 text-slate-100 hover:bg-cyan-950/25"
            >
              {r.map((c, cidx) => (
                <td key={`${idx}-${cidx}`} className="px-2 py-2">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
