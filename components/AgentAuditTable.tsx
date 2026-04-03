"use client";

import { useCallback, useEffect, useState } from "react";
import { demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
import { PROFIT_DATA_CHANGED } from "@/lib/profit-data-events";
import { parseDemoRole } from "@/lib/approval";

type Row = {
  id: string;
  requestId: string;
  route: string;
  action: string;
  actorRole: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

export function AgentAuditTable() {
  const role = parseDemoRole(useDemoRole());
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadRows = useCallback(() => {
    if (role !== "ADMIN") {
      setRows([]);
      return;
    }
    void fetch("/api/console/agent-audit", { headers: { ...demoHeaders() } })
      .then(async (r) => {
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        return r.json() as Promise<Row[]>;
      })
      .then(setRows)
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : "加载失败");
        setRows([]);
      });
  }, [role]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (role !== "ADMIN") return;
    const onSync = () => loadRows();
    window.addEventListener(PROFIT_DATA_CHANGED, onSync);
    return () => window.removeEventListener(PROFIT_DATA_CHANGED, onSync);
  }, [role, loadRows]);

  if (role !== "ADMIN") {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        请将右上角演示身份切换为「管理员」后查看审计日志。
      </p>
    );
  }

  if (err) {
    return <p className="text-sm text-red-600 dark:text-red-400">{err}</p>;
  }

  if (rows === null) {
    return <p className="text-sm text-zinc-500">加载中…</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        暂无记录。在报价台保存报价/调整系数、使用助手解析、提交或完成审批后会出现条目（需已执行{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">db push</code>）。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-zinc-100 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/50">
          <tr>
            <th className="px-3 py-2 font-medium">时间</th>
            <th className="px-3 py-2 font-medium">requestId</th>
            <th className="px-3 py-2 font-medium">动作</th>
            <th className="px-3 py-2 font-medium">角色</th>
            <th className="px-3 py-2 font-medium">元数据</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                {new Date(r.createdAt).toLocaleString("zh-CN")}
              </td>
              <td className="px-3 py-2 font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                {r.requestId}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium text-zinc-800 dark:text-zinc-200">
                  {r.action}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">{r.route}</div>
              </td>
              <td className="whitespace-nowrap px-3 py-2">{r.actorRole}</td>
              <td className="max-w-xs px-3 py-2">
                <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                  {JSON.stringify(r.meta, null, 2)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
