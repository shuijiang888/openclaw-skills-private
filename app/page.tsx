import Link from "next/link";
import { cookies } from "next/headers";
import { CoverGate } from "@/components/CoverGate";
import { SystemHero } from "@/components/SystemHero";
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
    href: "/profit/crm",
    cta: "即将上线",
  },
  {
    title: "硕日能源系统",
    subtitle: "SRNE Channel Ops",
    description: "海外渠道拓展运营管理演示系统，覆盖渠道总览、市场情报、销售赋能与预警协同。",
    href: "/srne/",
    cta: "进入硕日能源系统",
  },
];

type SharedToolCard = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  tone: "cyan" | "amber" | "violet";
};

const sharedToolCards: SharedToolCard[] = [
  {
    eyebrow: "UNIVERSAL MARKETING DIAG",
    title: "通用营销诊断系统（实战试点）",
    description: "统一接入医疗器械、能源电力、智能制造三行业问卷与诊断 API，支持落库、统计与后续 CRM 对接。",
    href: "/diag/universal/h5_universal.html",
    cta: "进入通用诊断系统",
    tone: "cyan",
  },
  {
    eyebrow: "MARKETING DIAG H5",
    title: "能源电力行业营销诊断",
    description: "面向能源电力企业的在线诊断入口，覆盖赛道认知、项目痛点、数字化现状与合作意向。",
    href: "/diag/h5_energy.html",
    cta: "打开能源电力诊断",
    tone: "amber",
  },
  {
    eyebrow: "MARKETING DIAG H5",
    title: "医疗器械企业营销诊断",
    description: "面向医疗器械企业的一页式营销诊断问卷，聚焦渠道合规、学术推广与成交效率。",
    href: "/diag/h5_medical.html",
    cta: "打开医疗器械诊断",
    tone: "violet",
  },
  {
    eyebrow: "MARKETING DIAG H5",
    title: "智能制造行业营销诊断",
    description: "面向智能制造企业的诊断入口，围绕智造认知、核心痛点、系统数据与合作模式进行评估。",
    href: "/diag/h5_manufacturing.html",
    cta: "打开智能制造诊断",
    tone: "amber",
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
      <SystemHero
        eyebrow="Unified Entry Portal"
        title="AI价值服务作战平台"
        description="统一门户集中管理盈利系统、智探007与后续 CRM 连接能力，支持多端访问与清晰分层导航。"
        tags={["Mobile Ready", "Pad Ready", "Desktop Ready", "Role-aware"]}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
          系统入口卡片
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          点击对应卡片进入独立系统模块；各模块相互隔离，避免内容串台。
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

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 sm:text-xl">
          共享能力 · Agent工具卡
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          面向多系统的通用能力入口，便于快速诊断、联调与发布验收。
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sharedToolCards.map((card) => {
            const toneClass =
              card.tone === "cyan"
                ? {
                    border: "border-cyan-200/90 dark:border-cyan-800/60",
                    eyebrow: "text-cyan-700 dark:text-cyan-300",
                    cta: "text-cyan-700 dark:text-cyan-300",
                  }
                : card.tone === "amber"
                  ? {
                      border: "border-amber-200/90 dark:border-amber-800/60",
                      eyebrow: "text-amber-700 dark:text-amber-300",
                      cta: "text-amber-700 dark:text-amber-300",
                    }
                  : {
                      border: "border-violet-200/90 dark:border-violet-800/60",
                      eyebrow: "text-violet-700 dark:text-violet-300",
                      cta: "text-violet-700 dark:text-violet-300",
                    };

            return (
              <Link
                key={card.title}
                href={card.href}
                className={`rounded-xl border bg-white/95 p-4 shadow-sm transition hover:shadow-md dark:bg-slate-950/50 ${toneClass.border}`}
              >
                <p className={`text-xs font-semibold tracking-wide ${toneClass.eyebrow}`}>
                  {card.eyebrow}
                </p>
                <p className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {card.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {card.description}
                </p>
                <p className={`mt-3 text-xs font-semibold ${toneClass.cta}`}>
                  {card.cta} →
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
