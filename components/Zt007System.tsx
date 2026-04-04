"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type Overview = {
  systemName: string;
  mode: string;
  rolloutWave: string;
  activeUsers: number;
  targetUsers: number;
  opportunityLiftPct: number;
  actionExecution48hPct: number;
  feedbackCompletionPct: number;
  budgetProfile: string;
  honorStyle: string;
  redemptionCoordinator: string;
};

type ActionCard = {
  id: string;
  title: string;
  reason: string;
  suggestion: string;
  priority: string;
  status: string;
  rewardPoints: number;
};

type BountyTask = {
  id: string;
  title: string;
  description: string;
  taskType: string;
  rewardPoints: number;
  status: string;
};

type Submission = {
  id: string;
  title: string;
  signalType: string;
  region: string;
  format: string;
  actorRole: string;
  status: string;
  pointsGranted: number;
  createdAt: string;
};

type Redemption = {
  id: string;
  item: string;
  pointsCost: number;
  redeemCode: string;
  status: string;
  createdAt: string;
};

type OverviewResponse = {
  overview: Overview;
  wallet: { actorRole: string; points: number } | null;
  user: {
    userId: string | null;
    ztRole: string;
    rank: string;
    points: number;
    lifetimePoints: number;
    nextRankAt: number | null;
    progressToNext: number;
    lastRankChangedAt: string | null;
  } | null;
  metrics: {
    signals: number;
    openActionCards: number;
    bountyTasks: number;
    submissions: number;
    redemptions: number;
  };
};

const MOBILE_BP = 780;

function priorityBadge(priority: string) {
  const p = priority.toUpperCase();
  if (p === "P0") return "bg-rose-500/15 text-rose-200 border-rose-500/40";
  if (p === "P1")
    return "bg-amber-500/15 text-amber-200 border-amber-500/40";
  return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(withClientBasePath(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...demoHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function Zt007System() {
  const role = useDemoRole();
  const roleLabel =
    {
      SALES_MANAGER: "销售经理",
      SALES_DIRECTOR: "销售总监",
      SALES_VP: "销售副总裁",
      GM: "总经理",
      ADMIN: "管理员",
      SOLDIER: "战士",
      SQUAD_LEADER: "班长",
      PLATOON_LEADER: "排长",
      COMPANY_COMMANDER: "连长",
      DIVISION_COMMANDER: "师长",
      CORPS_COMMANDER: "军长",
      COMMANDER: "司令",
      GENERAL: "将军",
      SUPERADMIN: "超超级管理员",
    }[role] ?? role;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [tasks, setTasks] = useState<BountyTask[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [reds, setReds] = useState<Redemption[]>([]);
  const [device, setDevice] = useState<"mobile" | "tablet/desktop">(
    typeof window !== "undefined" && window.innerWidth < MOBILE_BP
      ? "mobile"
      : "tablet/desktop",
  );

  useEffect(() => {
    const onResize = () => {
      setDevice(window.innerWidth < MOBILE_BP ? "mobile" : "tablet/desktop");
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, ac, bt, sr, rr] = await Promise.all([
        api<OverviewResponse>("/api/zt/overview"),
        api<{ items: ActionCard[] }>("/api/zt/action-cards"),
        api<{ items: BountyTask[] }>("/api/zt/bounty-tasks"),
        api<{ items: Submission[] }>("/api/zt/submissions/recent"),
        api<{ items: Redemption[] }>("/api/zt/redemptions"),
      ]);
      setOverview(ov);
      setCards(ac.items);
      setTasks(bt.items);
      setSubs(sr.items);
      setReds(rr.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll, role]);

  const [submissionForm, setSubmissionForm] = useState({
    title: "",
    region: "",
    format: "text",
    signalType: "tactical",
    content: "",
    taskId: "",
  });

  const [redeemForm, setRedeemForm] = useState({
    item: "Training Session",
    pointsCost: 100,
  });
  const [bootstrapping, setBootstrapping] = useState(false);

  const doneCount = useMemo(
    () => cards.filter((c) => c.status === "DONE").length,
    [cards],
  );

  const publishedCapabilities = [
    { name: "情报提交与审核入账", status: "已发布", href: "/zt007" },
    { name: "行动卡闭环（完成即入积分）", status: "已发布", href: "/zt007" },
    { name: "任务悬赏众包", status: "已发布", href: "/zt007" },
    { name: "积分兑换", status: "已发布", href: "/zt007" },
    { name: "个人工作台", status: "已发布", href: "/personal" },
    { name: "智探007系统维护", status: "已发布", href: "/console/system" },
    { name: "智探007用户组织", status: "已发布", href: "/console/users" },
    { name: "盈利报价工作台", status: "已发布", href: "/dashboard" },
    { name: "后台规则/审计", status: "已发布", href: "/console" },
    { name: "健康检查页", status: "已发布", href: "/health-check" },
  ] as const;

  async function markDone(id: string) {
    try {
      await api<{ ok: boolean }>(`/api/zt/action-cards/${id}/done`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "mark done failed");
    }
  }

  async function submitSignal(e: FormEvent) {
    e.preventDefault();
    try {
      await api<{ ok: boolean }>("/api/zt/submissions", {
        method: "POST",
        body: JSON.stringify({
          ...submissionForm,
          taskId: submissionForm.taskId || undefined,
        }),
      });
      setSubmissionForm({
        title: "",
        region: "",
        format: "text",
        signalType: "tactical",
        content: "",
        taskId: "",
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "submit failed");
    }
  }

  async function createRedemption(e: FormEvent) {
    e.preventDefault();
    try {
      await api<{ ok: boolean }>("/api/zt/redemptions", {
        method: "POST",
        body: JSON.stringify(redeemForm),
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "redemption failed");
    }
  }

  async function bootstrapSystemData() {
    setBootstrapping(true);
    try {
      await api<{ ok: boolean }>("/api/zt/bootstrap", { method: "POST" });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "bootstrap failed");
    } finally {
      setBootstrapping(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-5 text-slate-100 shadow-lg shadow-cyan-500/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-cyan-300/80">
              Intelligence-to-Action OS
            </p>
            <h1 className="mt-1 text-2xl font-bold text-cyan-300">
              智探007 · Unified MVP System
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              一个系统入口覆盖：今日行动卡、情报众包任务、积分荣誉、管理看板与双模式架构视图。
            </p>
            <p className="mt-2 text-xs text-cyan-100/90">
              当前演示角色：{roleLabel}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-500 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            onClick={() => void loadAll()}
          >
            Refresh
          </button>
          <button
            type="button"
            disabled={bootstrapping}
            className="rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
            onClick={() => void bootstrapSystemData()}
          >
            {bootstrapping ? "初始化中…" : "一键初始化数据"}
          </button>
        </div>
      </section>

      {overview?.user ? (
        <section className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-cyan-200">
              我的军衔工作台
            </h2>
            <span className="rounded-full border border-cyan-300/60 px-2 py-0.5 text-xs text-cyan-100">
              当前军衔：{overview.user.rank}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-cyan-600/40 bg-slate-950/50 p-3">
              <p className="text-xs text-cyan-300">当前积分</p>
              <p className="mt-1 text-xl font-bold text-cyan-100">
                {overview.user.points}
              </p>
            </div>
            <div className="rounded-lg border border-cyan-600/40 bg-slate-950/50 p-3">
              <p className="text-xs text-cyan-300">累计积分</p>
              <p className="mt-1 text-xl font-bold text-cyan-100">
                {overview.user.lifetimePoints}
              </p>
            </div>
            <div className="rounded-lg border border-cyan-600/40 bg-slate-950/50 p-3">
              <p className="text-xs text-cyan-300">升级还需</p>
              <p className="mt-1 text-xl font-bold text-cyan-100">
                {overview.user.nextRankAt
                  ? overview.user.progressToNext
                  : "已最高"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-cyan-200">
            已发布能力矩阵（团队可直接使用）
          </h2>
          <Link
            href={withClientBasePath("/health-check")}
            className="text-xs font-semibold text-cyan-300 underline"
          >
            打开健康检查
          </Link>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {publishedCapabilities.map((item) => (
            <Link
              key={item.name}
              href={withClientBasePath(item.href)}
              className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 hover:border-cyan-500/60"
            >
              <p className="text-sm font-medium text-slate-100">{item.name}</p>
              <p className="mt-1 text-xs text-emerald-300">{item.status}</p>
            </Link>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading || !overview ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-300">
          Loading system modules...
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CardKpi
              label="North Star Lift"
              value={`${overview.overview.opportunityLiftPct}%`}
            />
            <CardKpi
              label="48h Execution"
              value={`${overview.overview.actionExecution48hPct}%`}
            />
            <CardKpi label="Wallet Points" value={`${overview.wallet?.points ?? 0}`} />
            <CardKpi label="Client Device" value={device} />
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cyan-200">
                  Today Action Cards
                </h2>
                <span className="text-xs text-slate-400">
                  done {doneCount}/{cards.length}
                </span>
              </div>
              <div className="space-y-2">
                {cards.map((c) => (
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
                      className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200 disabled:opacity-40"
                      disabled={c.status === "DONE"}
                      onClick={() => void markDone(c.id)}
                    >
                      {c.status === "DONE"
                        ? "DONE"
                        : `Mark Done +${c.rewardPoints}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                Mission Control
              </h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>Wave: {overview.overview.rolloutWave}</li>
                <li>
                  Active users: {overview.overview.activeUsers}/
                  {overview.overview.targetUsers}
                </li>
                <li>Mode: {overview.overview.mode}</li>
                <li>Budget profile: {overview.overview.budgetProfile}</li>
                <li>Honor style: {overview.overview.honorStyle}</li>
                <li>
                  Redemption coordinator:{" "}
                  {overview.overview.redemptionCoordinator}
                </li>
              </ul>
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-400">
                Metrics: signals {overview.metrics.signals} · tasks{" "}
                {overview.metrics.bountyTasks} · submissions{" "}
                {overview.metrics.submissions}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-3">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                Bounty Tasks + Submission
              </h2>
              <div className="space-y-2">
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

              <form className="mt-4 space-y-2" onSubmit={submitSignal}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    placeholder="signal title"
                    value={submissionForm.title}
                    onChange={(e) =>
                      setSubmissionForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                  <input
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    placeholder="region"
                    value={submissionForm.region}
                    onChange={(e) =>
                      setSubmissionForm((p) => ({ ...p, region: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={submissionForm.signalType}
                    onChange={(e) =>
                      setSubmissionForm((p) => ({
                        ...p,
                        signalType: e.target.value,
                      }))
                    }
                  >
                    <option value="strategic">strategic</option>
                    <option value="tactical">tactical</option>
                    <option value="knowledge">knowledge</option>
                  </select>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={submissionForm.format}
                    onChange={(e) =>
                      setSubmissionForm((p) => ({ ...p, format: e.target.value }))
                    }
                  >
                    <option value="text">text</option>
                    <option value="voice">voice</option>
                    <option value="image">image</option>
                    <option value="video">video</option>
                    <option value="link">link</option>
                  </select>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={submissionForm.taskId}
                    onChange={(e) =>
                      setSubmissionForm((p) => ({ ...p, taskId: e.target.value }))
                    }
                  >
                    <option value="">task(optional)</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  className="min-h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  placeholder="submission content"
                  value={submissionForm.content}
                  onChange={(e) =>
                    setSubmissionForm((p) => ({ ...p, content: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-sm text-cyan-200"
                >
                  Submit +8
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                Recent submissions
              </h2>
              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {subs.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
                  >
                    <p className="font-medium text-slate-100">{s.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {s.signalType ? `${s.signalType} · ` : ""}
                      {s.region || "region-na"} · {s.format} · {s.actorRole}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-3">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                Honor & Redemption
              </h2>
              <form className="grid gap-2 sm:grid-cols-3" onSubmit={createRedemption}>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={redeemForm.item}
                  onChange={(e) =>
                    setRedeemForm((p) => ({ ...p, item: e.target.value }))
                  }
                >
                  <option value="Training Session">Training Session</option>
                  <option value="1:1 Coaching">1:1 Coaching</option>
                  <option value="Monthly Honor Pack">Monthly Honor Pack</option>
                </select>
                <select
                  className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={redeemForm.pointsCost}
                  onChange={(e) =>
                    setRedeemForm((p) => ({
                      ...p,
                      pointsCost: Number(e.target.value),
                    }))
                  }
                >
                  <option value={100}>100</option>
                  <option value={300}>300</option>
                  <option value={500}>500</option>
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-200"
                >
                  Create redemption
                </button>
              </form>

              <div className="mt-3 space-y-2">
                {reds.map((r) => (
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
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                Systemized Structure
              </h2>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-300">
                <li>single entry + unified data loop</li>
                <li>mobile/tablet responsive layout</li>
                <li>role-based operational visibility</li>
                <li>persistent API-backed records</li>
                <li>standalone-first, CRM-ready architecture</li>
              </ol>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CardKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
