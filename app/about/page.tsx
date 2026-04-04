import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";

const SECTIONS = [
  {
    title: "对企业的整体价值",
    bullets: [
      "盈利可视化：商机—订阅报价—Deal Desk—成交链路可查询、可对比、可复盘。",
      "决策一致性：系数、Deal Desk 与分流减少「同单不同价、同级不同批」。",
      "响应与合规：标准场景提速，敏感折扣升级留痕。",
      "组合经营：客户价值 × 赢单概率罗盘支撑资源投放与收缩。",
    ],
  },
  {
    title: "对老板 / 决策层",
    bullets: [
      "看结构：客户价值与赢单概率分布，识别高投入低回报项目。",
      "控风险：低概率大折扣、集中度等对策提示。",
      "要结果：Deal Desk 与成交价留痕，可追问依据。",
    ],
  },
  {
    title: "对销售管理者",
    bullets: [
      "Deal Desk 队列与折扣档位透明，减少跨级扯皮。",
      "系数与对标便于复盘与辅导一线。",
      "关键单走销售教练协同，避免自动化误伤。",
    ],
  },
  {
    title: "对一线销售 / 报价员",
    bullets: [
      "订阅方案 + 系数 + 建议价，降低手算错误。",
      "规则内自动/快速通道，提示下一 Deal Desk 角色。",
      "对标与赢单概率（规则版）提供沟通素材。",
    ],
  },
  {
    title: "对财务 / 运营 / 信息化",
    bullets: [
      "推动订阅报价与收入口径对齐（生产期需与财务共建）。",
      "主数据与规则可追溯，便于对账与审计。",
      "一期可独立运行，二期通过标准接口对接业财主数据，边界清晰。",
    ],
  },
];

export default function AboutPage() {
  return (
    <PageContainer className="space-y-10 pb-12">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500">
          第一章摘要 · 完整版见仓库文档
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">价值主张</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          在「赢单」和「高质量增长」之间搭一座<strong>可度量、可决策、可复盘</strong>的桥。
          下文为战略文档第一章的结构化摘要；落地依赖与迭代路线见{" "}
          <Link href="/console/readiness" className="text-blue-600 dark:text-blue-400">
            落地准备
          </Link>{" "}
          与{" "}
          <Link href="/roadmap" className="text-blue-600 dark:text-blue-400">
            产品路线图
          </Link>
          。
        </p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {s.title}
            </h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 text-sm dark:border-zinc-600 dark:bg-zinc-950/50">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">完整文档</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          站内可检索全文见{" "}
          <Link href="/strategy" className="font-medium text-blue-600 dark:text-blue-400">
            战略全文
          </Link>
          ；仓库路径{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs dark:bg-zinc-900">
            docs/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md
          </code>
          （与 <code className="rounded bg-white px-1 text-xs dark:bg-zinc-900">profit-web/content</code>{" "}
          副本便于独立部署）。
        </p>
      </section>
    </PageContainer>
  );
}
