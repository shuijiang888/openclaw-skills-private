"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
import { dispatchProfitDataChanged } from "@/lib/profit-data-events";
import { parseDemoRole } from "@/lib/approval";
import { canImportConsoleCsv } from "@/lib/demo-role-modules";
import { withClientBasePath } from "@/lib/client-url";

export function CustomerCsvImport() {
  const router = useRouter();
  const demoRole = parseDemoRole(useDemoRole());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const csvText = await file.text();
      const res = await fetch(withClientBasePath("/api/console/import/customers"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({ csvText }),
      });
      const j = (await res.json()) as {
        error?: string;
        created?: number;
        skipped?: number;
        totalInput?: number;
      };
      if (!res.ok) {
        throw new Error(j.error ?? "导入失败");
      }
      setMsg(
        `完成：新建 ${j.created} 条，同名跳过 ${j.skipped} 条（共解析 ${j.totalInput} 行）。`,
      );
      dispatchProfitDataChanged();
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }, [router]);

  if (!canImportConsoleCsv(demoRole)) {
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
        <strong className="font-semibold">总经理只读：</strong>
        客户主数据可浏览与导出；批量 CSV 导入须管理员（演示模式选「管理员」，登录模式用管理员账号）。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
      <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        批量导入客户（CSV）
      </h3>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        请先将右上角「试点角色」设为<strong>管理员</strong>（或登录管理员账号）。表头须含{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">name</code>
        ，可选 <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">tier</code>、
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">arDays</code>。
        tier：NORMAL / KEY / STRATEGIC。与库内<strong>客户名</strong>完全相同则跳过。
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400">
          {busy ? "导入中…" : "选择 CSV 文件"}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <a
          href={withClientBasePath("/templates/customers-import-template.csv")}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          download
        >
          下载模板
        </a>
      </div>
      {msg ? (
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">{msg}</p>
      ) : null}
    </div>
  );
}
