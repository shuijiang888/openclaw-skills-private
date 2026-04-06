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
  taskType?: string;
  deadlineAt?: string | null;
  reviewNote?: string;
  allowedTransitions?: string[];
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

type TaskEditForm = {
  taskId: string;
  intelDefId: string;
  title: string;
  description: string;
  rewardPoints: number;
  status: string;
  deadlineAt: string;
};

type TaskCreateForm = {
  intelDefId: string;
  title: string;
  description: string;
  rewardPoints: number;
  deadlineAt: string;
};

function toDatetimeLocalInput(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const offsetMs = d.getTimezoneOffset() * 60 * 1000;
  const local = new Date(d.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

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

function normalizeSubmissionError(raw: string): string {
  const msg = String(raw ?? "").trim();
  if (!msg) return "提交失败，请稍后重试。";
  if (/signalType not allowed/i.test(msg)) {
    return "当前“情报类型”不符合该商情定义要求，请重新选择情报类型后再提交。";
  }
  if (/format not allowed/i.test(msg)) {
    return "当前“提交格式”不符合该商情定义要求，请重新选择提交格式后再提交。";
  }
  if (/missing required fields:/i.test(msg)) {
    const rawFields = msg.split(":")[1] ?? "";
    const fields = rawFields
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => prettyFieldLabel(x));
    return `仍有必填项未填写：${fields.join("、")}。请补充后再提交。`;
  }
  if (/intelDefId required|invalid intelDefId/i.test(msg)) {
    return "商情定义无效或未启用，请重新选择商情定义后提交。";
  }
  return msg;
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
    def?.allowedFormats?.length ? def.allowedFormats : ["text", "image", "video", "voice", "link"];
  return {
    signalType: allowedSignalTypes.includes(current.signalType)
      ? current.signalType
      : allowedSignalTypes[0],
    format: allowedFormats.includes(current.format) ? current.format : allowedFormats[0],
  };
}

export function ZtBountyCenterClient() {
  const [tasks, setTasks] = useState<BountyTask[]>([]);
  const [intelDefs, setIntelDefs] = useState<IntelDef[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("REVIEWING");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<TaskEditForm | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [creatingTask, setCreatingTask] = useState<TaskCreateForm>({
    intelDefId: "",
    title: "",
    description: "",
    rewardPoints: 30,
    deadlineAt: "",
  });
  const [creatingTaskBusy, setCreatingTaskBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
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
  const visibleTasks = tasks.filter((task) =>
    statusFilter === "ALL" ? true : task.status === statusFilter,
  );
  const taskStatusCount = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1;
    return acc;
  }, {});
  async function load() {
    const res = await fetch(withClientBasePath("/api/zt/bounty-tasks"), {
      cache: "no-store",
      credentials: "include",
      headers: { ...demoHeaders() },
    });
    const payload = (await res.json().catch(() => ({}))) as {
      items?: BountyTask[];
      message?: string;
      isManager?: boolean;
    };
    if (!res.ok) throw new Error(payload.message ?? "加载悬赏任务失败");
    setTasks(payload.items ?? []);
    setIsManager(payload.isManager === true);

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
    setCreatingTask((prev) => ({
      ...prev,
      intelDefId: prev.intelDefId || defs[0]?.id || "",
    }));
    setForm((prev) => {
      const currentValid = defs.some((x) => x.id === prev.intelDefId);
      const nextIntelDefId = currentValid ? prev.intelDefId : (defs[0]?.id ?? "");
      const matched = defs.find((x) => x.id === nextIntelDefId) ?? null;
      const allowedSignalTypes =
        matched?.allowedSignalTypes?.length ? matched.allowedSignalTypes : ["strategic", "tactical", "knowledge"];
      const allowedFormats =
        matched?.allowedFormats?.length ? matched.allowedFormats : ["text", "image", "video", "voice", "link"];
      return {
        ...prev,
        intelDefId: nextIntelDefId,
        signalType: allowedSignalTypes.includes(prev.signalType)
          ? prev.signalType
          : allowedSignalTypes[0],
        format: allowedFormats.includes(prev.format) ? prev.format : allowedFormats[0],
      };
    });
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "加载失败"));
  }, []);

  useEffect(() => {
    setSelectedTaskIds((prev) => prev.filter((id) => tasks.some((t) => t.id === id)));
    setEditingTask((prev) => {
      if (!prev) return null;
      return tasks.some((t) => t.id === prev.taskId) ? prev : null;
    });
  }, [tasks]);

  async function updateTaskStatus(
    taskId: string,
    status: string,
    options?: { askReviewNote?: boolean },
  ) {
    setReviewBusyId(taskId);
    setError("");
    setMessage("");
    try {
      const needReviewNote =
        options?.askReviewNote && (status === "APPROVED" || status === "REJECTED");
      const reviewNote = needReviewNote
        ? window.prompt("可选：审核备注（可留空）", "") ?? ""
        : "";
      const res = await fetch(withClientBasePath("/api/zt/bounty-tasks"), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({ taskId, status, reviewNote }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        throw new Error(payload.message ?? payload.error ?? "任务状态更新失败");
      }
      setMessage(`任务状态已更新为 ${status}`);
      await load();
    } catch (err) {
      const raw = err instanceof Error ? err.message : "任务状态更新失败";
      setError(
        /forbidden/i.test(raw)
          ? "当前角色无权执行该状态流转。"
          : /invalid transition/i.test(raw)
            ? "当前任务状态不允许此流转，请按流程推进。"
            : raw,
      );
    } finally {
      setReviewBusyId(null);
    }
  }

  async function batchUpdateStatus() {
    if (selectedTaskIds.length === 0) {
      setError("请先勾选至少一个任务。");
      return;
    }
    setBulkBusy(true);
    setError("");
    setMessage("");
    try {
      let okCount = 0;
      let failCount = 0;
      const needReviewNote = bulkStatus === "APPROVED" || bulkStatus === "REJECTED";
      const reviewNote = needReviewNote
        ? window.prompt("可选：本次批量操作审核备注（可留空）", "") ?? ""
        : "";
      for (const taskId of selectedTaskIds) {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(withClientBasePath("/api/zt/bounty-tasks"), {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            ...demoHeaders(),
          },
          body: JSON.stringify({ taskId, status: bulkStatus, reviewNote }),
        });
        if (res.ok) {
          okCount += 1;
        } else {
          failCount += 1;
        }
      }
      setMessage(
        `批量处理完成：成功 ${okCount} 条，失败 ${failCount} 条（可能因状态不匹配或权限限制）。`,
      );
      setSelectedTaskIds([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量处理失败");
    } finally {
      setBulkBusy(false);
    }
  }

  function openTaskEditor(task: BountyTask) {
    setEditingTask({
      taskId: task.id,
      intelDefId: task.intelDefId ?? "",
      title: task.title,
      description: task.description,
      rewardPoints: task.rewardPoints,
      status: task.status,
      deadlineAt: toDatetimeLocalInput(task.deadlineAt),
    });
  }

  async function createTask() {
    if (!creatingTask.intelDefId) {
      setError("请先选择商情定义后再创建任务。");
      return;
    }
    if (!creatingTask.title.trim() || !creatingTask.description.trim()) {
      setError("任务标题和任务说明不能为空。");
      return;
    }
    setCreatingTaskBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(withClientBasePath("/api/zt/bounty-tasks"), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({
          intelDefId: creatingTask.intelDefId,
          title: creatingTask.title.trim(),
          description: creatingTask.description.trim(),
          rewardPoints: creatingTask.rewardPoints,
          deadlineAt: creatingTask.deadlineAt
            ? new Date(creatingTask.deadlineAt).toISOString()
            : undefined,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? "任务创建失败");
      setMessage("任务已创建。");
      setCreatingTask((prev) => ({
        ...prev,
        title: "",
        description: "",
        rewardPoints: 30,
        deadlineAt: "",
      }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务创建失败");
    } finally {
      setCreatingTaskBusy(false);
    }
  }

  async function saveTaskEdit() {
    if (!editingTask) return;
    setSavingTask(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(withClientBasePath("/api/zt/bounty-tasks"), {
        method: "PUT",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({
          taskId: editingTask.taskId,
          intelDefId: editingTask.intelDefId,
          title: editingTask.title,
          description: editingTask.description,
          rewardPoints: editingTask.rewardPoints,
          status: editingTask.status,
          deadlineAt: editingTask.deadlineAt
            ? new Date(editingTask.deadlineAt).toISOString()
            : null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(payload.message ?? payload.error ?? "任务保存失败");
      setMessage("任务已更新。");
      setEditingTask(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "任务保存失败");
    } finally {
      setSavingTask(false);
    }
  }

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
      setError(normalizeSubmissionError(err instanceof Error ? err.message : "提交失败"));
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { value: "ALL", label: "全部" },
            { value: "OPEN", label: "待认领" },
            { value: "CLAIMED", label: "进行中" },
            { value: "REVIEWING", label: "待审核" },
            { value: "APPROVED", label: "已通过" },
            { value: "REJECTED", label: "已驳回" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                statusFilter === opt.value
                  ? "border-cyan-400/80 bg-cyan-500/20 text-cyan-100"
                  : "border-slate-600 text-slate-300 hover:border-cyan-500/60"
              }`}
            >
              {opt.label}
              {opt.value !== "ALL" ? ` ${taskStatusCount[opt.value] ?? 0}` : ` ${tasks.length}`}
            </button>
          ))}
        </div>
        {isManager ? (
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-cyan-200">批量审核操作</p>
              <select
                className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-100"
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
              >
                <option value="REVIEWING">批量送审</option>
                <option value="APPROVED">批量通过</option>
                <option value="REJECTED">批量驳回</option>
                <option value="OPEN">批量重开</option>
              </select>
              <button
                type="button"
                disabled={bulkBusy || selectedTaskIds.length === 0}
                onClick={() => void batchUpdateStatus()}
                className="min-h-11 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-200 disabled:opacity-55"
              >
                {bulkBusy ? "处理中..." : `执行批量操作（${selectedTaskIds.length}）`}
              </button>
            </div>
          </div>
        ) : null}
        <div className="mt-3 space-y-2">
          {visibleTasks.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                {isManager ? (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.includes(t.id)}
                      onChange={(e) =>
                        setSelectedTaskIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, t.id]))
                            : prev.filter((id) => id !== t.id),
                        )
                      }
                    />
                    选中
                  </label>
                ) : null}
                <p className="font-medium text-slate-100">{t.title}</p>
                <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                  +{t.rewardPoints}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{t.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                <span className="rounded-full border border-slate-600 px-2 py-0.5">
                  状态：{t.status}
                </span>
                {t.deadlineAt ? (
                  <span className="rounded-full border border-slate-600 px-2 py-0.5">
                    截止：{new Date(t.deadlineAt).toLocaleDateString()}
                  </span>
                ) : null}
                {t.taskType ? (
                  <span className="rounded-full border border-slate-600 px-2 py-0.5">
                    类型：{t.taskType}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  disabled={reviewBusyId === t.id || !t.allowedTransitions?.includes("CLAIMED")}
                  onClick={() => void updateTaskStatus(t.id, "CLAIMED")}
                  className="min-h-11 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-2.5 text-xs font-medium text-cyan-200 disabled:opacity-45"
                >
                  认领
                </button>
                <button
                  type="button"
                  disabled={reviewBusyId === t.id || !t.allowedTransitions?.includes("REVIEWING")}
                  onClick={() => void updateTaskStatus(t.id, "REVIEWING")}
                  className="min-h-11 rounded-md border border-amber-500/35 bg-amber-500/15 px-2.5 text-xs font-medium text-amber-200 disabled:opacity-45"
                >
                  送审
                </button>
                <button
                  type="button"
                  disabled={reviewBusyId === t.id || !t.allowedTransitions?.includes("APPROVED")}
                  onClick={() =>
                    void updateTaskStatus(t.id, "APPROVED", { askReviewNote: true })
                  }
                  className="min-h-11 rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2.5 text-xs font-medium text-emerald-200 disabled:opacity-45"
                >
                  通过
                </button>
                <button
                  type="button"
                  disabled={reviewBusyId === t.id || !t.allowedTransitions?.includes("REJECTED")}
                  onClick={() =>
                    void updateTaskStatus(t.id, "REJECTED", { askReviewNote: true })
                  }
                  className="min-h-11 rounded-md border border-rose-500/35 bg-rose-500/15 px-2.5 text-xs font-medium text-rose-200 disabled:opacity-45"
                >
                  驳回
                </button>
                {isManager ? (
                  <button
                    type="button"
                    onClick={() => openTaskEditor(t)}
                    className="min-h-11 rounded-md border border-slate-500/40 bg-slate-700/20 px-2.5 text-xs font-medium text-slate-200"
                  >
                    编辑任务
                  </button>
                ) : null}
              </div>
              {t.reviewNote ? (
                <p className="mt-2 rounded-md border border-slate-700 bg-slate-900/40 px-2.5 py-1.5 text-xs text-slate-300">
                  审核备注：{t.reviewNote}
                </p>
              ) : null}
            </div>
          ))}
          {visibleTasks.length === 0 ? (
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-400">
              当前筛选条件下暂无任务。
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 lg:col-span-2">
        {isManager ? (
          <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">任务管理（管理员）</h3>
            <div className="mt-2 grid gap-2">
              <select
                className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={creatingTask.intelDefId}
                onChange={(e) =>
                  setCreatingTask((prev) => ({ ...prev, intelDefId: e.target.value }))
                }
              >
                <option value="">选择商情定义</option>
                {intelDefs.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.category}] {d.name}
                  </option>
                ))}
              </select>
              <input
                className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="任务标题"
                value={creatingTask.title}
                onChange={(e) =>
                  setCreatingTask((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <textarea
                className="min-h-20 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                placeholder="任务说明"
                value={creatingTask.description}
                onChange={(e) =>
                  setCreatingTask((prev) => ({ ...prev, description: e.target.value }))
                }
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={creatingTask.rewardPoints}
                  onChange={(e) =>
                    setCreatingTask((prev) => ({
                      ...prev,
                      rewardPoints: Math.max(1, Number(e.target.value || 1)),
                    }))
                  }
                />
                <input
                  type="datetime-local"
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={creatingTask.deadlineAt}
                  onChange={(e) =>
                    setCreatingTask((prev) => ({ ...prev, deadlineAt: e.target.value }))
                  }
                />
              </div>
              <button
                type="button"
                disabled={creatingTaskBusy}
                onClick={() => void createTask()}
                className="min-h-11 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-200 disabled:opacity-55"
              >
                {creatingTaskBusy ? "创建中..." : "创建任务"}
              </button>
            </div>
          </div>
        ) : null}
        {isManager && editingTask ? (
          <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
            <h3 className="text-sm font-semibold text-cyan-200">任务编辑</h3>
            <div className="mt-2 grid gap-2">
              <select
                className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={editingTask.intelDefId}
                onChange={(e) =>
                  setEditingTask((prev) =>
                    prev
                      ? {
                          ...prev,
                          intelDefId: e.target.value,
                        }
                      : prev,
                  )
                }
              >
                <option value="">不绑定定义</option>
                {intelDefs.map((d) => (
                  <option key={d.id} value={d.id}>
                    [{d.category}] {d.name}
                  </option>
                ))}
              </select>
              <input
                className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={editingTask.title}
                onChange={(e) =>
                  setEditingTask((prev) =>
                    prev
                      ? {
                          ...prev,
                          title: e.target.value,
                        }
                      : prev,
                  )
                }
              />
              <textarea
                className="min-h-20 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                value={editingTask.description}
                onChange={(e) =>
                  setEditingTask((prev) =>
                    prev
                      ? {
                          ...prev,
                          description: e.target.value,
                        }
                      : prev,
                  )
                }
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={editingTask.rewardPoints}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev
                        ? {
                            ...prev,
                            rewardPoints: Number(e.target.value),
                          }
                        : prev,
                    )
                  }
                />
                <select
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={editingTask.status}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev
                        ? {
                            ...prev,
                            status: e.target.value,
                          }
                        : prev,
                    )
                  }
                >
                  <option value="OPEN">OPEN</option>
                  <option value="CLAIMED">CLAIMED</option>
                  <option value="REVIEWING">REVIEWING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
                <input
                  type="datetime-local"
                  className="min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  value={editingTask.deadlineAt}
                  onChange={(e) =>
                    setEditingTask((prev) =>
                      prev
                        ? {
                            ...prev,
                            deadlineAt: e.target.value,
                          }
                        : prev,
                    )
                  }
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingTask}
                  onClick={() => void saveTaskEdit()}
                  className="min-h-11 rounded-md border border-cyan-500/35 bg-cyan-500/15 px-3 text-xs font-semibold text-cyan-200 disabled:opacity-55"
                >
                  {savingTask ? "保存中..." : "保存任务"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="min-h-11 rounded-md border border-slate-600 px-3 text-xs text-slate-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <h2 className="text-lg font-semibold text-cyan-200">提交情报</h2>
        <form className="mt-3 space-y-2" onSubmit={submitSignal}>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            value={form.intelDefId}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                intelDefId: e.target.value,
                signalType: (
                  intelDefs.find((x) => x.id === e.target.value)?.allowedSignalTypes?.[0] ??
                  p.signalType
                ),
                format: (
                  intelDefs.find((x) => x.id === e.target.value)?.allowedFormats?.[0] ??
                  p.format
                ),
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
                const nextIntelDefId = task?.intelDefId ?? p.intelDefId;
                const normalized = normalizeByIntelDef(intelDefs, nextIntelDefId, p);
                return {
                  ...p,
                  taskId: nextTaskId,
                  intelDefId: nextIntelDefId,
                  signalType: normalized.signalType,
                  format: normalized.format,
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
