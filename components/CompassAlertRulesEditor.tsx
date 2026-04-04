"use client";

import { useCallback, useState } from "react";
import { dispatchProfitDataChanged } from "@/lib/profit-data-events";
import { demoHeaders } from "@/components/RoleSwitcher";

type Rule = {
  id: string;
  conditionLabel: string;
  actionLabel: string;
  sortOrder: number;
};

export function CompassAlertRulesEditor({ initial }: { initial: Rule[] }) {
  const [rules, setRules] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/console/compass-alert-rules", {
      headers: { ...demoHeaders() },
    });
    if (r.ok) setRules((await r.json()) as Rule[]);
  }, []);

  async function saveRow(row: Rule) {
    setBusyId(row.id);
    setMsg(null);
    try {
      const res = await fetch(`/api/console/compass-alert-rules/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({
          conditionLabel: row.conditionLabel,
          actionLabel: row.actionLabel,
          sortOrder: row.sortOrder,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "保存失败");
      }
      setMsg("已保存");
      dispatchProfitDataChanged();
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusyId(null);
    }
  }

  async function addRow() {
    setBusyId("__new__");
    setMsg(null);
    try {
      const res = await fetch("/api/console/compass-alert-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({
          conditionLabel: "新触发条件（请修改）",
          actionLabel: "建议动作（请修改）",
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "添加失败");
      }
      setMsg("已添加新行，请编辑后保存");
      dispatchProfitDataChanged();
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "添加失败");
    } finally {
      setBusyId(null);
    }
  }

  async function removeRow(id: string) {
    if (!confirm("确定删除该条预警规则？前台罗盘与列表将同步变更。")) return;
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/console/compass-alert-rules/${id}`, {
        method: "DELETE",
        headers: { ...demoHeaders() },
      });
      if (!res.ok) throw new Error("删除失败");
      setMsg("已删除");
      dispatchProfitDataChanged();
      await refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  }

  function updateLocal(id: string, patch: Partial<Rule>) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">{msg}</p>
      ) : null}
      <div className="space-y-3">
        {rules.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-950/40"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="text-zinc-500">触发条件</span>
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                  value={r.conditionLabel}
                  onChange={(e) =>
                    updateLocal(r.id, { conditionLabel: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-500">建议动作</span>
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                  value={r.actionLabel}
                  onChange={(e) =>
                    updateLocal(r.id, { actionLabel: e.target.value })
                  }
                />
              </label>
            </div>
            <label className="mt-2 block w-24 text-xs">
              <span className="text-zinc-500">排序</span>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={r.sortOrder}
                onChange={(e) =>
                  updateLocal(r.id, { sortOrder: Number(e.target.value) })
                }
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void saveRow(r)}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
              >
                {busyId === r.id ? "保存中…" : "保存本行"}
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void removeRow(r.id)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={busyId !== null}
        onClick={() => void addRow()}
        className="rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {busyId === "__new__" ? "添加中…" : "＋ 新增一条规则 "}
      </button>
      <p className="text-[11px] leading-relaxed text-zinc-500">
        保存后立即影响「客户价值罗盘」对策矩阵与管理台列表；无需重启服务。
      </p>
    </div>
  );
}
