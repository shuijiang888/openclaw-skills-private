import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VALUE_PROPOSITIONS } from "@/lib/business-config";

export const dynamic = "force-dynamic";

const ARENA_PROTOTYPE =
  "https://019d4e3d-06a8-7e3f-be0c-16fe2b7d6cdf.arena.site/";

const TRUST_SEGMENTS = [
  "通信设备",
  "汽车电子",
  "医疗器械",
  "新能源装备",
  "半导体封测",
  "工业自动化",
];

export default async function LandingPage() {
  const [projectCount, customerCount, pending, approved] = await Promise.all([
    prisma.project.count(),
    prisma.customer.count(),
    prisma.project.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.project.count({ where: { status: "APPROVED" } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-14 pb-8 sm:space-y-20 sm:pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 text-white shadow-2xl shadow-slate-900/25 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(251,191,36,0.12),transparent)]" />
        <div className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-3xl text-center sm:text-left lg:mx-0 lg:max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-300/95">
            企业级 · 盈利决策中枢
          </div>
          <p className="text-xs font-medium tracking-wide text-slate-400">
            智能报价 · 分层审批 · 盈利罗盘
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
            把每一次报价，
            <span className="text-amber-400">变成可审计的利润决策</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
            统一成本口径、系数规则与分层审批，连接一线报价与老板视角的盈利结构。
            适用于<strong className="font-semibold text-white">先进制造与科技型企业</strong>
            的定价治理、毛利守护与经营复盘。
          </p>
          <ul className="mt-6 grid gap-3 text-left text-sm text-slate-300 sm:grid-cols-3">
            {[
              { t: "缩短报价响应", s: "标准单可配置自动/快速通道" },
              { t: "守住毛利底线", s: "低毛利与超额折扣自动升级审批" },
              { t: "看清利润结构", s: "罗盘象限 + 风险对策矩阵" },
            ].map((x) => (
              <li
                key={x.t}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                <div className="font-semibold text-white">{x.t}</div>
                <div className="mt-1 text-xs text-slate-400">{x.s}</div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:bg-amber-400"
            >
              进入工作台
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              了解产品价值
            </Link>
            <Link
              href="/console"
              className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-slate-300 hover:text-white"
            >
              管理后台 →
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 pt-6 text-[11px] text-slate-500 sm:justify-start">
            <span className="hidden sm:inline">资源：</span>
            <Link href="/strategy" className="hover:text-amber-400">
              战略全文
            </Link>
            <span className="text-slate-600">·</span>
            <Link href="/roadmap" className="hover:text-amber-400">
              产品路线
            </Link>
            <span className="text-slate-600">·</span>
            <a
              href={ARENA_PROTOTYPE}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-400"
            >
              交互线框原型（外站）
            </a>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50 sm:px-8">
        <p className="text-center text-[11px] font-semibold tracking-wide text-slate-600 dark:text-slate-400">
          典型服务行业场景
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {TRUST_SEGMENTS.map((s) => (
            <span
              key={s}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            实时经营脉搏
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            以下为演示环境样例数据，用于呈现「规模感」与指标叙事；生产环境可对接真实商机管道。
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "在跑商机",
              value: projectCount,
              hint: "含草稿 / 测算 / 审批 / 成交各阶段",
            },
            {
              label: "客户主数据",
              value: customerCount,
              hint: "评级驱动分流与话术策略",
            },
            {
              label: "待审批",
              value: pending,
              hint: "折扣与特价按职级自动路由",
            },
            {
              label: "已核准",
              value: approved,
              hint: "成交价与毛利留痕可复盘",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:border-amber-200/80 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-900/50"
            >
              <div className="absolute right-4 top-4 h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400/20 to-transparent opacity-0 transition group-hover:opacity-100" />
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {m.label}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {m.value}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {m.hint}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              核心能力矩阵
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              从「算得清」到「批得快」再到「看得见」——对齐销售、管理与老板三类结果。
            </p>
          </div>
          <Link
            href="/strategy"
            className="text-sm font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
          >
            查阅完整战略文档 →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {VALUE_PROPOSITIONS.map((v, i) => (
            <div
              key={v.title}
              className="flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-amber-400 dark:bg-amber-500 dark:text-slate-950">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {v.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 sm:p-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          按角色开箱即用
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          演示时在导航栏切换身份，即可体验分层审批权限与队列体验。
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "销售 / 报价",
              desc: "建项目、录成本、看系数与对标，一键生成建议价。",
              href: "/projects/new",
              cta: "新建报价",
            },
            {
              title: "销售管理",
              desc: "盯商机管道与待办，进入工作台完成批复。",
              href: "/projects",
              cta: "项目列表",
            },
            {
              title: "老板 / 高管",
              desc: "盈利罗盘与对策矩阵，看结构与风险。",
              href: "/compass",
              cta: "盈利罗盘",
            },
            {
              title: "运营 / 信息化",
              desc: "主数据、全量看板、规则与落地自检。",
              href: "/console",
              cta: "管理后台",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {r.title}
              </h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {r.desc}
              </p>
              <Link
                href={r.href}
                className="mt-4 inline-flex justify-center rounded-lg bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
              >
                {r.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 dark:border-slate-600 dark:bg-slate-900/40 lg:col-span-3">
          <h2 className="text-sm font-bold tracking-wide text-slate-600 dark:text-slate-400">
            端到端主流程
          </h2>
          <ol className="mt-4 flex flex-wrap gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            {[
              "需求与产品",
              "物料清单 / 成本",
              "系数引擎",
              "智能报价",
              "分层审批",
              "罗盘复盘",
            ].map((step, idx) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-amber-400 dark:bg-amber-500 dark:text-slate-950">
                  {idx + 1}
                </span>
                <span>{step}</span>
                {idx < 5 ? (
                  <span className="text-slate-300 dark:text-slate-600">→</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
        <blockquote className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-6 text-sm leading-relaxed text-slate-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100/90 lg:col-span-2">
          <p className="font-semibold text-slate-900 dark:text-white">
            「报价不是算一个数，而是一次经营承诺。」
          </p>
          <p className="mt-3 text-slate-700 dark:text-slate-300">
            系统将承诺拆解为成本、系数、审批与成交留痕，让利润不再停留在口头与表格碎片中。
          </p>
          <footer className="mt-4 text-xs font-medium text-amber-800/80 dark:text-amber-400/80">
            — 产品定位陈述 · 演示版
          </footer>
        </blockquote>
      </section>

      <section className="rounded-3xl bg-slate-900 px-6 py-10 text-center sm:px-10 dark:bg-slate-950">
        <h2 className="text-lg font-bold text-white sm:text-xl">
          准备向管理层汇报或启动试点验证？
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
          建议先走一遍「战略全文」与「落地准备」自检，再用种子数据演示完整审批闭环。
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/strategy"
            className="inline-flex rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400"
          >
            打开战略全文
          </Link>
          <Link
            href="/console/readiness"
            className="inline-flex rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            落地准备清单
          </Link>
        </div>
      </section>
    </div>
  );
}
