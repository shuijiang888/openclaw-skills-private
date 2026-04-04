import Link from "next/link";

type PortalCard = {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  cta: string;
  highlight?: boolean;
};

const portalCards: PortalCard[] = [
  {
    title: "智探007",
    subtitle: "Intelligence-to-Action OS",
    description:
      "情报采集、行动卡、任务悬赏、积分激励与管理驾驶舱一体化系统。点击即可进入完整功能页。",
    href: "/zt007",
    cta: "进入智探007",
    highlight: true,
  },
  {
    title: "盈利决策工作台",
    subtitle: "报价 / 审批 / 罗盘",
    description: "从项目报价到审批流转再到盈利复盘，形成经营闭环。",
    href: "/dashboard",
    cta: "进入工作台",
  },
  {
    title: "运营管理后台",
    subtitle: "规则 / 审计 / 准备度",
    description: "集中管理规则、查看审计与落地自检，支持规模化运营。",
    href: "/console",
    cta: "进入后台",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10 sm:space-y-10 sm:pb-14">
      <section className="relative overflow-hidden rounded-3xl border border-slate-700/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-5 py-10 text-white shadow-xl shadow-slate-900/20 sm:px-8 sm:py-12 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_-10%,rgba(56,189,248,0.18),transparent)]" />
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative z-10">
          <p className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-cyan-100">
            Unified Entry Portal
          </p>
          <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
            智探007 系统门户
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            在一个页面直观查看所有系统入口，手机、Pad、PC 自适应访问。
            当前已接入智探007完整系统，可直接一键进入业务功能。
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
            {["Mobile Ready", "Pad Ready", "Desktop Ready", "Role-aware"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1"
                >
                  {tag}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
          系统入口卡片
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          点击任意卡片可进入对应系统，推荐从「智探007」开始体验完整闭环。
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portalCards.map((card) => (
            <article
              key={card.title}
              className={[
                "flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900",
                card.highlight
                  ? "border-cyan-300/70 ring-1 ring-cyan-300/40 dark:border-cyan-500/50"
                  : "border-slate-200 dark:border-slate-700",
              ].join(" ")}
            >
              <p
                className={[
                  "text-xs font-semibold tracking-wide",
                  card.highlight ? "text-cyan-700 dark:text-cyan-300" : "text-slate-500",
                ].join(" ")}
              >
                {card.subtitle}
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">
                {card.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {card.description}
              </p>
              <Link
                href={card.href}
                className={[
                  "mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                  card.highlight
                    ? "bg-cyan-600 text-white hover:bg-cyan-500"
                    : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
                ].join(" ")}
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
