"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { demoHeaders, useDemoRole } from "@/components/RoleSwitcher";
import { parseDemoRole } from "@/lib/approval";
import { canAccessConsoleRules } from "@/lib/demo-role-modules";
import { dispatchProfitDataChanged } from "@/lib/profit-data-events";
import { withClientBasePath } from "@/lib/client-url";

type ApiResponse = {
  created?: number;
  skipped?: number;
  totalInput?: number;
  error?: string;
};

export function CompassAlertRulesCsvImport() {
  const router = useRouter();
  const demoRole = parseDemoRole(useDemoRole());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setBusy(true);
      setMsg(null);
      try {
        const csvText = await file.text();
        const res = await fetch(
          withClientBasePath("/api/console/import/compass-alert-rules"),
          {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...demoHeaders(),
          },
          body: JSON.stringify({ csvText }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as ApiResponse;
        if (!res.ok) throw new Error(j.error ?? "导入失败");
        setMsg(
          `完成：新建 ${j.created ?? 0} 条；跳过 ${j.skipped ?? 0} 条；解析 ${j.totalInput ?? 0} 行。`,
        );
        dispatchProfitDataChanged();
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "导入失败");
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  if (!canAccessConsoleRules(demoRole)) {
    return (
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
        <strong className="font-semibold">批量导入需管理员：</strong>
        请将右上角「试点角色」设为「管理员」，或使用管理员账号登录后再导入。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          批量导入对策矩阵（CSV）
        </h3>
        <a
          href={withClientBasePath("/templates/compass-alert-rules-import-template.csv")}
          className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          download
        >
          下载模板
        </a>
      </div>

      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
        表头必填：`conditionLabel`（触发条件）、`actionLabel`（建议动作）、`sortOrder`（排序，非负整数）。
        导入会追加新增行，不会覆盖现有规则。
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
      </div>

      {msg ? (
        <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">{msg}</p>
      ) : null}
    </div>
  );
}

