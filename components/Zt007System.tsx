"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ZT_ROLE_OPTIONS, demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
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
  intelDefId?: string | null;
  title: string;
  description: string;
  taskType: string;
  rewardPoints: number;
  status: string;
};

type Submission = {
  id: string;
  title: string;
  intelDefId?: string | null;
  signalType: string;
  region: string;
  format: string;
  actorRole: string;
  status: string;
  pointsGranted: number;
  createdAt: string;
};

type SubmissionFeedback = {
  pointsDelta: number;
  currentPoints: number;
  rank: string;
  rankChanged: boolean;
  ledgerId: string;
};

type Redemption = {
  id: string;
  item: string;
  pointsCost: number;
  redeemCode: string;
  status: string;
  createdAt: string;
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

function explainSubmissionError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "提交失败";
  if (/signalType not allowed/i.test(raw)) {
    const expected = raw.split("expected:")[1]?.trim() ?? "";
    return expected
      ? `当前情报类型与商情定义不匹配，请改为：${expected.replace(/\//g, " / ")}`
      : "当前情报类型与商情定义不匹配，请重新选择。";
  }
  if (/format not allowed/i.test(raw)) {
    const expected = raw.split("expected:")[1]?.trim() ?? "";
    return expected
      ? `当前提交格式与商情定义不匹配，请改为：${expected.replace(/\//g, " / ")}`
      : "当前提交格式与商情定义不匹配，请重新选择。";
  }
  if (/missing required fields:/i.test(raw)) {
    const fields = (raw.split(":")[1] ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => prettyFieldLabel(x));
    return fields.length > 0
      ? `仍有必填项未填写：${fields.join("、")}`
      : "仍有必填项未填写，请检查后重试。";
  }
  return raw;
}

function normalizeByIntelDef(
  intelDefs: IntelDef[],
  intelDefId: string,
  current: { signalType: string; format: string },
) {
  const def = intelDefs.find((x) => x.id === intelDefId) ?? null;
  const allowedSignalTypes =
    def?.allowedSignalTypes?.length ? def.allowedSignalTypes : ["strategic", "tactical", "knowledge"];
  const allowedFormats =
    def?.allowedFormats?.length ? def.allowedFormats : ["text", "voice", "image", "video", "link"];
  return {
    signalType: allowedSignalTypes.includes(current.signalType)
      ? current.signalType
      : allowedSignalTypes[0],
    format: allowedFormats.includes(current.format) ? current.format : allowedFormats[0],
  };
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
  const [message, setMessage] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<SubmissionFeedback | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [cards, setCards] = useState<ActionCard[]>([]);
  const [tasks, setTasks] = useState<BountyTask[]>([]);
  const [intelDefs, setIntelDefs] = useState<IntelDef[]>([]);
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
      const [ov, ac, bt, idf, sr, rr] = await Promise.allSettled([
        api<OverviewResponse>("/api/zt/overview"),
        api<{ items: ActionCard[] }>("/api/zt/action-cards"),
        api<{ items: BountyTask[] }>("/api/zt/bounty-tasks"),
        api<{ items: IntelDef[] }>("/api/zt/intel-definitions"),
        api<{ items: Submission[] }>("/api/zt/submissions/recent"),
        api<{ items: Redemption[] }>("/api/zt/redemptions"),
      ]);
      const failures: string[] = [];
      if (ov.status === "fulfilled") {
        setOverview(ov.value);
      } else {
        setOverview(null);
        failures.push("总览");
      }
      if (ac.status === "fulfilled") {
        setCards(ac.value.items);
      } else {
        setCards([]);
        failures.push("行动卡");
      }
      if (bt.status === "fulfilled") {
        setTasks(bt.value.items);
      } else {
        setTasks([]);
        failures.push("任务悬赏");
      }
      if (idf.status === "fulfilled") {
        setIntelDefs(idf.value.items);
        setSubmissionForm((prev) => {
          const currentValid = idf.value.items.some((x) => x.id === prev.intelDefId);
          const nextIntelDefId = currentValid ? prev.intelDefId : (idf.value.items[0]?.id ?? "");
          const normalized = normalizeByIntelDef(idf.value.items, nextIntelDefId, {
            signalType: prev.signalType,
            format: prev.format,
          });
          return {
            ...prev,
            intelDefId: nextIntelDefId,
            signalType: normalized.signalType,
            format: normalized.format,
          };
        });
      } else {
        setIntelDefs([]);
        failures.push("商业情报定义");
      }
      if (sr.status === "fulfilled") {
        setSubs(sr.value.items);
      } else {
        setSubs([]);
        failures.push("最近提交");
      }
      if (rr.status === "fulfilled") {
        setReds(rr.value.items);
      } else {
        setReds([]);
        failures.push("积分兑换");
      }
      if (failures.length > 0) {
        setError(`部分模块加载失败：${failures.join("、")}。`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setOverview(null);
      setCards([]);
      setTasks([]);
      setIntelDefs([]);
      setSubs([]);
      setReds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll, role]);

  const [submissionForm, setSubmissionForm] = useState({
    intelDefId: "",
    title: "",
    region: "",
    format: "text",
    signalType: "tactical",
    content: "",
    taskId: "",
    extraFields: {} as Record<string, string>,
  });

  const [redeemForm, setRedeemForm] = useState({
    item: "Training Session",
    pointsCost: 100,
  });
  const [bootstrapping, setBootstrapping] = useState(false);
  const canBootstrap = useMemo(
    () => ["ADMIN", "SUPERADMIN", "GENERAL"].includes(role),
    [role],
  );

  const doneCount = useMemo(
    () => cards.filter((c) => c.status === "DONE").length,
    [cards],
  );
  const selectedIntelDef = useMemo(
    () =>
      intelDefs.find((x) => x.id === submissionForm.intelDefId) ??
      null,
    [intelDefs, submissionForm.intelDefId],
  );
  const dynamicRequiredFields = useMemo(
    () =>
      (selectedIntelDef?.requiredFields ?? []).filter(
        (field) => !BUILTIN_SUBMISSION_FIELDS.has(field),
      ),
    [selectedIntelDef],
  );

  const publishedCapabilities = [
    { name: "情报提交与审核入账", status: "已发布", href: "/zt007" },
    { name: "行动卡闭环（完成即入积分）", status: "已发布", href: "/zt007/action" },
    { name: "任务悬赏众包", status: "已发布", href: "/zt007/bounty" },
    { name: "积分兑换", status: "已发布", href: "/zt007/honor" },
    { name: "个人工作台", status: "已发布", href: "/personal" },
    { name: "情报联动看板（P2 Batch3）", status: "已发布", href: "/zt007/linkage" },
    { name: "智探007系统维护", status: "已发布", href: "/console/system" },
    { name: "智探007用户组织", status: "已发布", href: "/console/users" },
    { name: "健康检查页", status: "已发布", href: "/health-check" },
  ] as const;

  const topNav = [
    { id: "overview", label: "总览" },
    { id: "today-action", label: "今日行动" },
    { id: "bounty", label: "任务悬赏" },
    { id: "honor-points", label: "荣誉积分" },
    { id: "management-cockpit", label: "管理驾驶舱" },
    { id: "architecture-release", label: "架构与上线" },
    { id: "roles", label: "角色" },
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
    setError(null);
    setMessage(null);
    setLastFeedback(null);
    if (!submissionForm.intelDefId) {
      setError("请先选择商业情报定义。");
      return;
    }
    try {
      const created = await api<{
        submission: Submission;
        wallet: {
          id: string;
          points: number;
          lifetimePoints: number;
          rank: string;
        };
        feedback?: SubmissionFeedback;
      }>("/api/zt/submissions", {
        method: "POST",
        body: JSON.stringify({
          ...submissionForm,
          taskId: submissionForm.taskId || undefined,
          extraFields: submissionForm.extraFields,
        }),
      });
      const feedback = created.feedback;
      setMessage(
        feedback?.rankChanged
          ? "情报提交成功，积分已到账，军衔已升级。"
          : "情报提交成功，积分已到账。",
      );
      if (feedback) {
        setLastFeedback(feedback);
      }
      setSubmissionForm({
        intelDefId: intelDefs[0]?.id ?? "",
        title: "",
        region: "",
        format: "text",
        signalType: "tactical",
        content: "",
        taskId: "",
        extraFields: {},
      });
      await loadAll();
    } catch (err) {
      setError(explainSubmissionError(err));
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
    if (!canBootstrap) {
      setError("当前角色无权执行初始化，请切换为管理员/超超级管理员/将军。");
      return;
    }
    setBootstrapping(true);
    try {
      await api<{ ok: boolean }>("/api/zt/bootstrap", { method: "POST" });
      await loadAll();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "bootstrap failed";
      setError(
        /forbidden/i.test(msg)
          ? "初始化被拒绝：当前角色权限不足（需管理员/超超级管理员/将军）。"
          : msg,
      );
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
            disabled={bootstrapping || !canBootstrap}
            className="rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
            onClick={() => void bootstrapSystemData()}
            title={
              canBootstrap
                ? "初始化智探007演示数据"
                : "当前角色无权限初始化数据"
            }
          >
            {bootstrapping
              ? "初始化中…"
              : canBootstrap
                ? "一键初始化数据"
                : "一键初始化数据（仅管理员）"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-cyan-200">
          智探007导航（按使用逻辑）
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {topNav.map((x) => (
            <a
              key={x.id}
              href={`#${x.id}`}
              className="rounded-full border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-cyan-500/60 hover:text-cyan-200"
            >
              {x.label}
            </a>
          ))}
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

      <section
        id="management-cockpit"
        className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-cyan-200">
            管理驾驶舱（今天已交付模块入口）
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
      {message ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      {lastFeedback ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          +{lastFeedback.pointsDelta} 分 · 当前积分 {lastFeedback.currentPoints} · 军衔{" "}
          {lastFeedback.rank}
          {lastFeedback.rankChanged ? "（已升级）" : ""} · 流水 {lastFeedback.ledgerId}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-300">
          正在加载智探007系统模块...
        </div>
      ) : !overview ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-6 text-sm text-amber-100">
          部分模块暂不可用，请点击上方「Refresh」重试，或先前往「健康检查」定位异常接口。
        </div>
      ) : (
        <>
          <section id="overview" className="space-y-3">
            <h2 className="text-lg font-semibold text-cyan-200">总览</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <CardKpi
                label="机会提升（North Star）"
                value={`${overview.overview.opportunityLiftPct}%`}
              />
              <CardKpi
                label="48小时执行率"
                value={`${overview.overview.actionExecution48hPct}%`}
              />
              <CardKpi label="当前积分" value={`${overview.wallet?.points ?? 0}`} />
              <CardKpi label="终端形态" value={device} />
            </div>
          </section>

          <section id="today-action" className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cyan-200">
                  今日行动
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
                运行看板
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

          <section id="bounty" className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-3">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                任务悬赏与情报提交
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
                    <p className="mt-1 text-xs text-slate-400">
                      {t.intelDefId
                        ? (() => {
                            const def = intelDefs.find((x) => x.id === t.intelDefId);
                            return def ? `[${def.category}] ${def.name} · ` : "";
                          })()
                        : ""}
                      {t.description}
                    </p>
                  </div>
                ))}
              </div>

              <form className="mt-4 space-y-2" onSubmit={submitSignal}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={submissionForm.intelDefId}
                    onChange={(e) =>
                      setSubmissionForm((p) => {
                        const nextIntelDefId = e.target.value;
                        const normalized = normalizeByIntelDef(intelDefs, nextIntelDefId, p);
                        return {
                          ...p,
                          intelDefId: nextIntelDefId,
                          signalType: normalized.signalType,
                          format: normalized.format,
                          extraFields: {},
                        };
                      })
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
                    required={selectedIntelDef?.requiredFields.includes("region") ?? false}
                  />
                </div>
                {submissionForm.intelDefId ? (
                  <p className="text-[11px] text-cyan-300/90">
                    当前定义：
                    {intelDefs.find((x) => x.id === submissionForm.intelDefId)?.name ??
                      "未匹配"}
                    {" · 必填字段："}
                    {(intelDefs.find((x) => x.id === submissionForm.intelDefId)
                      ?.requiredFields ?? []
                    ).join("、") || "title、content"}
                  </p>
                ) : null}
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
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={submissionForm.format}
                    onChange={(e) =>
                      setSubmissionForm((p) => ({ ...p, format: e.target.value }))
                    }
                  >
                    {(selectedIntelDef?.allowedFormats?.length
                      ? selectedIntelDef.allowedFormats
                      : ["text", "voice", "image", "video", "link"]
                    ).map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    value={submissionForm.taskId}
                    onChange={(e) =>
                      setSubmissionForm((p) => {
                        const nextTaskId = e.target.value;
                        const task = tasks.find((t) => t.id === nextTaskId);
                        const nextIntelDefId = task?.intelDefId ?? p.intelDefId;
                        const normalized = normalizeByIntelDef(intelDefs, nextIntelDefId, p);
                        return {
                          ...p,
                          taskId: nextTaskId,
                          intelDefId: nextIntelDefId,
                          signalType: normalized.signalType,
                          format: normalized.format,
                          extraFields:
                            task?.intelDefId && task.intelDefId !== p.intelDefId
                              ? {}
                              : p.extraFields,
                        };
                      })
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
                {dynamicRequiredFields.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {dynamicRequiredFields.map((field) => (
                      <input
                        key={field}
                        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        placeholder={`${prettyFieldLabel(field)}（必填）`}
                        value={submissionForm.extraFields[field] ?? ""}
                        onChange={(e) =>
                          setSubmissionForm((p) => ({
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
                <button
                  type="submit"
                  disabled={!submissionForm.intelDefId}
                  className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-3 py-1.5 text-sm text-cyan-200"
                >
                  {!submissionForm.intelDefId ? "请先配置商情定义" : "提交情报 +8"}
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                最近提交
              </h2>
              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {subs.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
                  >
                    <p className="font-medium text-slate-100">{s.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {s.intelDefId
                        ? (() => {
                            const def = intelDefs.find((x) => x.id === s.intelDefId);
                            return def ? `[${def.category}] ${def.name} · ` : "";
                          })()
                        : ""}
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

          <section id="honor-points" className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-3">
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                荣誉积分与兑换
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
                  发起兑换申请
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

            <div
              id="architecture-release"
              className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2"
            >
              <h2 className="mb-3 text-lg font-semibold text-cyan-200">
                架构与上线
              </h2>
              <ol className="list-decimal space-y-1 pl-4 text-sm text-slate-300">
                <li>单入口 + API闭环数据流</li>
                <li>移动端/Pad/桌面统一适配</li>
                <li>角色驱动可见范围与动作权限</li>
                <li>后台可维护：系统开关 + 用户组织</li>
                <li>当前上线模式：Standalone（可扩展CRM）</li>
              </ol>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                <p>上线检查：建议每日先跑健康检查页，再执行业务验收。</p>
                <Link
                  href={withClientBasePath("/health-check")}
                  className="text-cyan-300 underline"
                >
                  打开健康检查页
                </Link>
              </div>
            </div>
          </section>

          <section id="roles" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="text-lg font-semibold text-cyan-200">角色</h2>
            <p className="mt-1 text-sm text-slate-300">
              当前角色：{roleLabel}（右上角可切换）。切换后会影响行动卡、提交、积分与可见数据范围。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ZT_ROLE_OPTIONS.map((x) => (
                <span
                  key={x.value}
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    role === x.value
                      ? "border-cyan-400/70 text-cyan-200"
                      : "border-slate-600 text-slate-300"
                  }`}
                >
                  {x.label}
                </span>
              ))}
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
