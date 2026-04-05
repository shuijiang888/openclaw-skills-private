import Link from "next/link";
import { cookies } from "next/headers";
import { CoverGate } from "@/components/CoverGate";
import { PLATFORM_AUTH_COOKIE } from "@/lib/session-cookie";
import { verifyGateAuthToken } from "@/lib/gate-auth";

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
    title: "健康检查",
    subtitle: "Health Check",
    description: "全体 Agent 共享能力入口：统一检查接口状态、关键依赖与可用性。",
    href: "/health-check",
    cta: "进入健康检查",
  },
  {
    title: "智能盈利管理系统",
    subtitle: "Profit Management",
    description: "报价、审批、项目与盈利罗盘的一体化经营管理入口。",
    href: "/profit/dashboard",
    cta: "进入盈利系统",
    highlight: true,
  },
  {
    title: "智探007",
    subtitle: "Intelligence-to-Action OS",
    description: "情报采集、行动卡、任务悬赏、积分激励与管理驾驶舱一体化系统。",
    href: "/zt007",
    cta: "进入智探007",
  },
  {
    title: "SKILL大市场（高价值、好生态、等你来）",
    subtitle: "SKILL Marketplace",
    description: "高价值能力与生态协同预留模块，后续将逐步开放入驻与连接。",
    href: "/crm",
    cta: "即将上线",
  },
];

export default async function LandingPage() {
  const token = (await cookies()).get(PLATFORM_AUTH_COOKIE)?.value;
  const gatePassed = await verifyGateAuthToken(token);

  if (!gatePassed) {
    return <CoverGate />;
  }

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
            AI价值服务作战平台
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            统一门户集中管理盈利系统、智探007与后续 CRM 连接能力，
            支持多端访问与清晰分层导航。
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
          点击对应卡片进入独立系统模块；各模块相互隔离，避免内容串台。
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
