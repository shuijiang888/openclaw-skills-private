"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "profit_readiness_v1";

type Item = { id: string; title: string; detail: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "业务侧",
    items: [
      {
        id: "b1",
        title: "报价与成本口径书面共识",
        detail: "报价毛利是否含期间费/税；与财务结转映射关系。",
      },
      {
        id: "b2",
        title: "审批授权与折扣档位制度",
        detail: "职级与折扣区间对应，可与系统规则配置对齐。",
      },
      {
        id: "b3",
        title: "客户/产品分级标准",
        detail: "战略客户、标品、小额订单等定义清晰。",
      },
      {
        id: "b4",
        title: "主数据责任人",
        detail: "客户、物料、价格清单的维护 Owner。",
      },
    ],
  },
  {
    title: "数据与集成",
    items: [
      {
        id: "d1",
        title: "成本数据来源路径",
        detail: "一期可导入；生产期对接 ERP/MES 或定期同步。",
      },
      {
        id: "d2",
        title: "历史报价与成交回流",
        detail: "CRM/合同系统或表格规范，支撑对标与胜率。",
      },
      {
        id: "d3",
        title: "组织与账号",
        detail: "试点期可用 Header 切换角色；生产期建议 SSO 与组织架构。",
      },
    ],
  },
  {
    title: "管理与安全",
    items: [
      {
        id: "m1",
        title: "变革与考核对齐",
        detail: "还价留痕、超权限升级；KPI 不唯收入。",
      },
      {
        id: "m2",
        title: "权限与审计",
        detail: "成本/底价分级可见；操作日志与备份策略。",
      },
      {
        id: "m3",
        title: "运行环境",
        detail: "生产建议 PostgreSQL 等；SQLite 适合单机试点与轻量部署。",
      },
    ],
  },
];

export function ReadinessChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">
            自检进度（仅保存在本机浏览器）
          </span>
          <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
            {done} / {total}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-all dark:bg-blue-500"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title}>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {g.title}
          </h2>
          <ul className="mt-3 space-y-3">
            {g.items.map((it) => (
              <li
                key={it.id}
                className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  id={it.id}
                  checked={Boolean(checked[it.id])}
                  onChange={() => toggle(it.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
                />
                <label htmlFor={it.id} className="min-w-0 cursor-pointer">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {it.title}
                  </span>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {it.detail}
                  </p>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-zinc-500">
        对应战略文档第二章「落地部署的业务、数据与管理依赖性」。完整表格见{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          docs/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md
        </code>
        。
      </p>
    </div>
  );
}
