import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

const PHASES = [
  {
    phase: "近期 · 最小可用加强版（约 3–6 个月）",
    items: [
      "业财系统或表格主数据同步与报价回写订单草稿",
      "系数方案版本化、按客户群/产品线生效",
      "审批时效、自动通道占比、低毛利清单等管理报表",
      "真实登录、角色库与字段级脱敏",
    ],
    value: "能用、少错、可审计、少录入。",
  },
  {
    phase: "中期（约 6–18 个月）",
    items: [
      "基于历史成交校准胜率与加权模型",
      "材料/汇率/批量情景一键模拟",
      "可配置多级会签、并行审批、代理",
      "移动端 / 企业微信待办",
    ],
    value: "更快决策、更准预测、更贴组织。",
  },
  {
    phase: "远期（18 个月+）",
    items: [
      "结合库存与产能利用率的报价区间策略",
      "与产品生命周期 / 客户关系系统深度打通，支持配置化报价",
      "行业模板包缩短实施周期",
    ],
    value: "系统参与经营策略，而不只是算价工具。",
  },
];

export default function RoadmapPage() {
  return (
    <PageContainer className="space-y-10 pb-12">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500">
          第三章摘要 · 前瞻计划与价值预期
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">AI 交付与价值服务</h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          按价值与依赖递增分期；完整论述见{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
            docs/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md
          </code>{" "}
          第三章。当前站点为一期可交互产品试点版。
        </p>
      </div>

      <ol className="relative space-y-8 border-l border-zinc-200 pl-8 dark:border-zinc-700">
        {PHASES.map((p, i) => (
          <li key={p.phase} className="relative">
            <span className="absolute -left-[34px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {i + 1}
            </span>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {p.phase}
            </h2>
            <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              价值预期：{p.value}
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              {p.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        若需评估落地前置条件，请见{" "}
        <Link
          href="/console/readiness"
          className="text-blue-600 dark:text-blue-400"
        >
          管理后台 → 落地准备
        </Link>
        。
      </p>
    </PageContainer>
  );
}
