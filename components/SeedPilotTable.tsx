"use client";

import { useMemo, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";

export type Stage = "INVITED" | "ACTIVATED" | "FEEDBACK" | "DONE";
type SeedPilotRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  pilotStage: Stage;
  invitedAt: string;
  activatedAt: string | null;
  firstFeedbackAt: string | null;
  feedbackScore: number | null;
  issueCount: number;
  todoCount: number;
  ownerRole: string;
  lastActivityAt: string;
  notes: string;
  slaOverdueDays: number;
};
export type SeedPilotSummary = {
  total: number;
  invited: number;
  activated: number;
  feedback: number;
  done: number;
  dropped: number;
  avgScore: number | null;
  totalIssues: number;
  totalTodos: number;
};

const STAGE_LABEL: Record<Stage, string> = {
  INVITED: "已邀请",
  ACTIVATED: "已激活",
  FEEDBACK: "待反馈",
  DONE: "已完成",
};

function fmt(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("zh-CN");
}

function overdueTone(days: number): string {
  if (days <= 0) return "text-emerald-600";
  if (days <= 3) return "text-amber-600";
  return "text-red-600";
}

export function SeedPilotTable({
  rows,
  actorRole,
  canAssignOwner,
  canEditScoring,
}: {
  rows: SeedPilotRow[];
  actorRole: string;
  canAssignOwner: boolean;
  canEditScoring: boolean;
}) {
  const [data, setData] = useState(rows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const summary = useMemo(() => {
    const all = data.length;
    const by = {
      invited: 0,
      activated: 0,
      feedback: 0,
      done: 0,
    };
    let scoreSum = 0;
    let scoreN = 0;
    let issues = 0;
    let todos = 0;
    for (const r of data) {
      if (r.pilotStage === "INVITED") by.invited += 1;
      else if (r.pilotStage === "ACTIVATED") by.activated += 1;
      else if (r.pilotStage === "FEEDBACK") by.feedback += 1;
      else by.done += 1;
      if (typeof r.feedbackScore === "number") {
        scoreSum += r.feedbackScore;
        scoreN += 1;
      }
      issues += r.issueCount;
      todos += r.todoCount;
    }
    return {
      all,
      by,
      activationPct: all > 0 ? Math.round(((all - by.invited) / all) * 1000) / 10 : 0,
      feedbackPct:
        all > 0 ? Math.round(((by.feedback + by.done) / all) * 1000) / 10 : 0,
      avgScore: scoreN > 0 ? Math.round((scoreSum / scoreN) * 10) / 10 : null,
      issues,
      todos,
    };
  }, [data]);

  async function patchRow(
    id: string,
    patch: Partial<{
      pilotStage: Stage;
      ownerRole: string;
      feedbackScore: number | null;
      issueCount: number;
      todoCount: number;
      notes: string;
    }>,
  ) {
    if (
      (!canAssignOwner && patch.ownerRole !== undefined) ||
      (!canEditScoring &&
        (patch.feedbackScore !== undefined ||
          patch.issueCount !== undefined ||
          patch.todoCount !== undefined))
    ) {
      setMsg(`当前角色 ${actorRole} 无此字段编辑权限。`);
      return;
    }

    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch("/api/console/seed-pilot", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({ id, ...patch }),
      });
      const j = (await res.json()) as { error?: string; row?: SeedPilotRow };
      if (!res.ok || !j.row) {
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...j.row! } : r)));
      setMsg("已更新。");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="种子用户总数" value={summary.all} hint="目标 50" />
        <StatCard
          label="激活率"
          value={`${summary.activationPct}%`}
          hint={`${summary.by.activated + summary.by.feedback + summary.by.done}/${summary.all}`}
        />
        <StatCard
          label="反馈覆盖率"
          value={`${summary.feedbackPct}%`}
          hint={`${summary.by.feedback + summary.by.done}/${summary.all}`}
        />
        <StatCard
          label="平均反馈分"
          value={summary.avgScore == null ? "—" : String(summary.avgScore)}
          hint="1-5 分"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SmallStat label="待反馈" value={summary.by.feedback} />
        <SmallStat label="问题总数" value={summary.issues} />
        <SmallStat label="待办总数" value={summary.todos} />
      </div>

      {msg ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">{msg}</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[1120px] text-left text-xs">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
            <tr>
              <th className="px-3 py-2 font-medium">用户</th>
              <th className="px-3 py-2 font-medium">角色</th>
              <th className="px-3 py-2 font-medium">阶段</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium text-right">评分</th>
              <th className="px-3 py-2 font-medium text-right">问题</th>
              <th className="px-3 py-2 font-medium text-right">待办</th>
              <th className="px-3 py-2 font-medium">邀请/激活/反馈</th>
              <th className="px-3 py-2 font-medium text-right">SLA</th>
              <th className="px-3 py-2 font-medium">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                    {r.name}
                  </div>
                  <div className="text-[10px] text-zinc-500">{r.email}</div>
                </td>
                <td className="px-3 py-2">{r.role}</td>
                <td className="px-3 py-2">
                  <select
                    value={r.pilotStage}
                    disabled={busyId === r.id}
                    onChange={(e) =>
                      void patchRow(r.id, { pilotStage: e.target.value as Stage })
                    }
                    className="rounded border border-zinc-300 bg-white px-1.5 py-1 dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    {(Object.keys(STAGE_LABEL) as Stage[]).map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={r.ownerRole}
                    disabled={busyId === r.id || !canAssignOwner}
                    onBlur={(e) =>
                      void patchRow(r.id, { ownerRole: e.currentTarget.value })
                    }
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      setData((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, ownerRole: v } : x)),
                      );
                    }}
                    className="rounded border border-zinc-300 bg-white px-1.5 py-1 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    <option value="SDR">SDR</option>
                    <option value="AE">AE</option>
                    <option value="PRE_SALES">PRE_SALES</option>
                    <option value="SALES_MANAGER">SALES_MANAGER</option>
                    <option value="VP">VP</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={r.feedbackScore ?? ""}
                    disabled={busyId === r.id || !canEditScoring}
                    onBlur={(e) => {
                      const raw = e.currentTarget.value.trim();
                      const v = raw === "" ? null : Number(raw);
                      void patchRow(r.id, { feedbackScore: v });
                    }}
                    onChange={(e) => {
                      const raw = e.currentTarget.value;
                      const v = raw === "" ? null : Number(raw);
                      setData((prev) =>
                        prev.map((x) =>
                          x.id === r.id
                            ? { ...x, feedbackScore: v }
                            : x,
                        ),
                      );
                    }}
                    className="w-16 rounded border border-zinc-300 bg-white px-1.5 py-1 text-right disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={r.issueCount}
                    disabled={busyId === r.id || !canEditScoring}
                    onBlur={(e) =>
                      void patchRow(r.id, {
                        issueCount: Math.max(
                          0,
                          Number.isFinite(Number(e.currentTarget.value))
                            ? Math.round(Number(e.currentTarget.value))
                            : 0,
                        ),
                      })
                    }
                    onChange={(e) => {
                      const n = Number(e.currentTarget.value);
                      const v = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
                      setData((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, issueCount: v } : x,
                        ),
                      );
                    }}
                    className="w-16 rounded border border-zinc-300 bg-white px-1.5 py-1 text-right disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={r.todoCount}
                    disabled={busyId === r.id || !canEditScoring}
                    onBlur={(e) =>
                      void patchRow(r.id, {
                        todoCount: Math.max(
                          0,
                          Number.isFinite(Number(e.currentTarget.value))
                            ? Math.round(Number(e.currentTarget.value))
                            : 0,
                        ),
                      })
                    }
                    onChange={(e) => {
                      const n = Number(e.currentTarget.value);
                      const v = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
                      setData((prev) =>
                        prev.map((x) =>
                          x.id === r.id ? { ...x, todoCount: v } : x,
                        ),
                      );
                    }}
                    className="w-16 rounded border border-zinc-300 bg-white px-1.5 py-1 text-right disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </td>
                <td className="px-3 py-2 text-[10px] text-zinc-500">
                  邀请 {fmt(r.invitedAt)}
                  <br />
                  激活 {fmt(r.activatedAt)}
                  <br />
                  反馈 {fmt(r.firstFeedbackAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.slaOverdueDays > 0 ? (
                    <span className={`font-semibold ${overdueTone(r.slaOverdueDays)}`}>
                      逾期 {r.slaOverdueDays} 天
                    </span>
                  ) : (
                    <span className="text-emerald-600">正常</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.notes}
                    disabled={busyId === r.id}
                    onBlur={(e) =>
                      void patchRow(r.id, { notes: e.currentTarget.value.trim() })
                    }
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      setData((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, notes: v } : x)),
                      );
                    }}
                    className="w-full rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      <div className="mt-1 text-[10px] text-zinc-500">{hint}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
