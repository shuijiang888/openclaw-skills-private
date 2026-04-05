"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type IntelDef = {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  requiredFields: string[];
  allowedSignalTypes: string[];
  allowedFormats: string[];
  taskTemplateHint: string;
  defaultRewardPoints: number;
  isActive: boolean;
  sortOrder: number;
};

const SIGNAL_TYPE_OPTIONS = ["strategic", "tactical", "knowledge", "risk", "forecast"];
const FORMAT_OPTIONS = ["text", "image", "video", "voice", "link"];
const REQUIRED_FIELD_SUGGESTIONS = [
  "title",
  "content",
  "region",
  "impactLevel",
  "customerName",
  "competitor",
  "evidence",
  "nextAction",
];

export function ZtIntelDefinitionsManager({
  initialItems = [],
}: {
  initialItems?: IntelDef[];
}) {
  const [items, setItems] = useState<IntelDef[]>(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "MARKET",
    description: "",
    requiredFieldsInput: "title,content,region",
    allowedSignalTypesInput: "strategic,tactical,knowledge",
    allowedFormatsInput: "text,image,link",
    taskTemplateHint: "",
    defaultRewardPoints: 8,
    sortOrder: 100,
    isActive: true,
  });

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) ||
          Number(b.isActive) - Number(a.isActive) ||
          a.code.localeCompare(b.code),
      ),
    [items],
  );

  const reload = useCallback(async () => {
    const r = await fetch(withClientBasePath("/api/console/zt/intel-definitions"), {
      cache: "no-store",
      credentials: "include",
      headers: { ...demoHeaders() },
    });
    const j = (await r.json().catch(() => ({}))) as { items?: IntelDef[]; error?: string };
    if (!r.ok) throw new Error(j.error ?? "加载情报定义失败");
    setItems(j.items ?? []);
  }, []);

  useEffect(() => {
    void reload().catch((e) => setMessage(e instanceof Error ? e.message : "加载失败"));
  }, [reload]);

  function parseCommaList(raw: string): string[] {
    return Array.from(
      new Set(
        raw
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    );
  }

  async function createDefinition() {
    setBusy("__create__");
    setMessage("");
    try {
      const r = await fetch(withClientBasePath("/api/console/zt/intel-definitions"), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          category: form.category,
          description: form.description,
          requiredFields: parseCommaList(form.requiredFieldsInput),
          allowedSignalTypes: parseCommaList(form.allowedSignalTypesInput),
          allowedFormats: parseCommaList(form.allowedFormatsInput),
          taskTemplateHint: form.taskTemplateHint,
          defaultRewardPoints: Number(form.defaultRewardPoints),
          sortOrder: Number(form.sortOrder),
          isActive: form.isActive,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "创建失败");
      setMessage("已新增商业情报定义");
      setForm((prev) => ({ ...prev, code: "", name: "", description: "", taskTemplateHint: "" }));
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "创建失败");
    } finally {
      setBusy(null);
    }
  }

  async function patchDefinition(id: string, patch: Partial<IntelDef>) {
    setBusy(id);
    setMessage("");
    try {
      const r = await fetch(withClientBasePath("/api/console/zt/intel-definitions"), {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({ id, ...patch }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "更新失败");
      setMessage("已更新商业情报定义");
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold">新增商业情报定义</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          定义会统一约束前台情报提交、悬赏任务与后续行动闭环。
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="编码，如 COMPETITOR_PRICE"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="名称，如 竞品价格异动"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            placeholder="分类，如 MARKET"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={form.requiredFieldsInput}
            onChange={(e) => setForm((p) => ({ ...p, requiredFieldsInput: e.target.value }))}
            placeholder="必填字段（逗号分隔）"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={form.allowedSignalTypesInput}
            onChange={(e) =>
              setForm((p) => ({ ...p, allowedSignalTypesInput: e.target.value }))
            }
            placeholder="允许情报类型（逗号）"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={form.allowedFormatsInput}
            onChange={(e) => setForm((p) => ({ ...p, allowedFormatsInput: e.target.value }))}
            placeholder="允许格式（逗号）"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="定义说明"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 sm:col-span-2"
          />
          <input
            value={form.taskTemplateHint}
            onChange={(e) => setForm((p) => ({ ...p, taskTemplateHint: e.target.value }))}
            placeholder="任务模板提示（例如证据要求）"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950 sm:col-span-2"
          />
          <input
            type="number"
            value={form.defaultRewardPoints}
            onChange={(e) =>
              setForm((p) => ({ ...p, defaultRewardPoints: Number(e.target.value) || 8 }))
            }
            placeholder="默认积分"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
            placeholder="排序"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            启用
          </label>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          建议字段：{REQUIRED_FIELD_SUGGESTIONS.join("、")}；类型建议：
          {SIGNAL_TYPE_OPTIONS.join("、")}；格式建议：{FORMAT_OPTIONS.join("、")}
        </div>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void createDefinition()}
          className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          {busy === "__create__" ? "创建中…" : "新增定义"}
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
          <h3 className="text-sm font-semibold">已配置商业情报定义</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((item) => (
            <div key={item.id} className="grid gap-2 px-4 py-3 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <p className="text-xs text-slate-500">{item.code}</p>
                <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                <p className="text-xs text-slate-500">{item.category}</p>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 lg:col-span-5">
                <p>{item.description || "暂无说明"}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  必填：{item.requiredFields.join("、") || "-"}；类型：
                  {item.allowedSignalTypes.join("、")}；格式：
                  {item.allowedFormats.join("、")}
                </p>
              </div>
              <div className="flex items-center gap-2 lg:col-span-4 lg:justify-end">
                <label className="text-xs">
                  <span className="mr-1 text-slate-500">积分</span>
                  <input
                    type="number"
                    value={item.defaultRewardPoints}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? { ...x, defaultRewardPoints: Number(e.target.value) || 8 }
                            : x,
                        ),
                      )
                    }
                    className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="text-xs">
                  <span className="mr-1 text-slate-500">排序</span>
                  <input
                    type="number"
                    value={item.sortOrder}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === item.id
                            ? { ...x, sortOrder: Number(e.target.value) || 0 }
                            : x,
                        ),
                      )
                    }
                    className="w-16 rounded border border-slate-300 bg-white px-1 py-0.5 dark:border-slate-600 dark:bg-slate-950"
                  />
                </label>
                <label className="inline-flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === item.id ? { ...x, isActive: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                  启用
                </label>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void patchDefinition(item.id, {
                      defaultRewardPoints: Number(item.defaultRewardPoints),
                      sortOrder: Number(item.sortOrder),
                      isActive: Boolean(item.isActive),
                    })
                  }
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  {busy === item.id ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          ))}
          {sorted.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">暂无定义，请先新增。</p>
          ) : null}
        </div>
      </section>

      {message ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
          {message}
        </p>
      ) : null}
    </div>
  );
}
