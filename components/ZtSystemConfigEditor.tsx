"use client";

import { useEffect, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type ZtSystemConfig = {
  id: string;
  llmEnabled: boolean;
  llmProvider: string;
  llmModel: string;
  llmInteractiveEnabled: boolean;
  llmPasswordRequired: boolean;
  llmAutomationBypassPassword: boolean;
  mobileExperienceEnabled: boolean;
  multiEndpointEnabled: boolean;
  featuresJson: string;
  updatedAt?: string;
};

type ZtFeatureFlags = {
  adminSeeAllActionCards?: boolean;
  demoWorkspaceEnabled?: boolean;
  strictRoleWalletMapping?: boolean;
  showSubmissionPointFeedback?: boolean;
};

export function ZtSystemConfigEditor({
  initial,
}: {
  initial?: ZtSystemConfig | null;
}) {
  const [data, setData] = useState<ZtSystemConfig | null>(initial ?? null);
  const [flags, setFlags] = useState<ZtFeatureFlags>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    try {
      const parsed = JSON.parse(data.featuresJson || "{}") as ZtFeatureFlags;
      setFlags(parsed);
    } catch {
      setFlags({});
    }
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(withClientBasePath("/api/console/zt/system-config"), {
          headers: { ...demoHeaders() },
        });
        if (!r.ok) throw new Error("加载失败");
        const j = (await r.json()) as ZtSystemConfig;
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setMsg(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!data) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(withClientBasePath("/api/console/zt/system-config"), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({
          ...data,
          featuresJson: JSON.stringify(flags),
        }),
      });
      const j = (await r.json()) as ZtSystemConfig | { error?: string };
      if (!r.ok) throw new Error((j as { error?: string }).error ?? "保存失败");
      setData(j as ZtSystemConfig);
      setMsg("已保存系统配置");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        加载配置中…
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        智探007 · 系统维护开关（管理员/超管）
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Toggle
          label="启用大模型能力"
          checked={data.llmEnabled}
          onChange={(v) => setData({ ...data, llmEnabled: v })}
        />
        <Toggle
          label="允许前台交互调用大模型"
          checked={data.llmInteractiveEnabled}
          onChange={(v) => setData({ ...data, llmInteractiveEnabled: v })}
        />
        <Toggle
          label="交互调用需密码"
          checked={data.llmPasswordRequired}
          onChange={(v) => setData({ ...data, llmPasswordRequired: v })}
        />
        <Toggle
          label="自动化场景可免密"
          checked={data.llmAutomationBypassPassword}
          onChange={(v) => setData({ ...data, llmAutomationBypassPassword: v })}
        />
        <Toggle
          label="移动端增强体验开关"
          checked={data.mobileExperienceEnabled}
          onChange={(v) => setData({ ...data, mobileExperienceEnabled: v })}
        />
        <Toggle
          label="多端口接入机制开关"
          checked={data.multiEndpointEnabled}
          onChange={(v) => setData({ ...data, multiEndpointEnabled: v })}
        />
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          功能开关（featuresJson）
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Toggle
            label="管理员可见全部行动卡"
            checked={Boolean(flags.adminSeeAllActionCards)}
            onChange={(v) =>
              setFlags((prev) => ({ ...prev, adminSeeAllActionCards: v }))
            }
          />
          <Toggle
            label="演示模式个人工作台"
            checked={Boolean(flags.demoWorkspaceEnabled)}
            onChange={(v) =>
              setFlags((prev) => ({ ...prev, demoWorkspaceEnabled: v }))
            }
          />
          <Toggle
            label="严格角色积分映射"
            checked={Boolean(flags.strictRoleWalletMapping)}
            onChange={(v) =>
              setFlags((prev) => ({ ...prev, strictRoleWalletMapping: v }))
            }
          />
          <Toggle
            label="显示提交积分反馈"
            checked={Boolean(flags.showSubmissionPointFeedback)}
            onChange={(v) =>
              setFlags((prev) => ({ ...prev, showSubmissionPointFeedback: v }))
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs">
          <span className="text-zinc-500">大模型提供商</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={data.llmProvider}
            onChange={(e) => setData({ ...data, llmProvider: e.target.value })}
          />
        </label>
        <label className="text-xs">
          <span className="text-zinc-500">大模型型号</span>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={data.llmModel}
            onChange={(e) => setData({ ...data, llmModel: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 dark:bg-amber-500 dark:text-slate-950"
        >
          {busy ? "保存中…" : "保存配置"}
        </button>
        <span className="text-xs text-zinc-500">
          更新时间：
          {data.updatedAt
            ? new Date(data.updatedAt).toLocaleString("zh-CN")
            : "未记录"}
        </span>
      </div>
      {msg ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{msg}</p> : null}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
