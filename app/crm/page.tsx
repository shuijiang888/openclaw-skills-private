import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { SystemHero } from "@/components/SystemHero";

const MARKET_TICKERS = [
  { code: "SSE 50", value: "+1.82%" },
  { code: "科创 100", value: "+2.31%" },
  { code: "沪深 300", value: "+0.96%" },
  { code: "金融指数", value: "+1.27%" },
  { code: "数字经济", value: "+3.08%" },
  { code: "AI算力", value: "+4.12%" },
];

const READY_FEATURES = [
  {
    title: "交易大厅数字大屏",
    desc: "模拟上证交易大厅态势屏，展示指数脉冲、板块热力与成交节奏。",
  },
  {
    title: "高价值能力陈列",
    desc: "以“能力商品化”方式组织服务包，支持后续上架、试用与转化。",
  },
  {
    title: "生态伙伴协同入口",
    desc: "预留伙伴入驻机制与联合解决方案位，支撑跨组织协同交付。",
  },
];

export default function SkillMarketplacePage() {
  return (
    <PageContainer className="space-y-5 pb-10">
      <SystemHero
        badge="SKILL Marketplace"
        title="SKILL大市场 · 效果预览馆"
        description="当前为概念效果页：先展示“上海证券交易大厅 + 数字大屏”风格，后续逐步接入真实能力商品、生态伙伴与交易化流程。"
        tone="violet"
        tags={["公共门户模块", "可视化预览", "PC/Pad/Mobile 自适应"]}
        actions={
          <Link
            href="/"
            className="inline-flex rounded-lg border border-violet-300/70 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-700/70 dark:bg-slate-900/60 dark:text-violet-200 dark:hover:bg-violet-900/20"
          >
            返回门户
          </Link>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-slate-300/70 bg-slate-950 text-slate-100 shadow-[0_24px_60px_-30px_rgba(2,6,23,0.9)]">
        <div className="border-b border-cyan-400/20 bg-gradient-to-r from-slate-900 via-cyan-950/45 to-slate-900 px-4 py-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-0.5 font-semibold text-cyan-200">
              SHANGHAI EXCHANGE HALL · CONCEPT
            </span>
            {MARKET_TICKERS.map((t) => (
              <span
                key={t.code}
                className="rounded-full border border-emerald-300/35 bg-emerald-500/10 px-2 py-0.5 text-emerald-200"
              >
                {t.code} {t.value}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-xl border border-cyan-300/25 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.25),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(59,130,246,0.25),transparent_40%),linear-gradient(155deg,#020617_0%,#0a1120_50%,#0f172a_100%)] p-4">
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-200/85">
              Trading Hall Big Screen
            </p>
            <h2 className="relative mt-1 text-xl font-black text-white sm:text-2xl">
              上海证券交易大厅 · 数字大屏盛况
            </h2>
            <p className="relative mt-2 max-w-2xl text-sm text-slate-300">
              以“战情中枢”视觉呈现实时指数、热点板块、能力交易脉冲与生态协同位。当前为效果演示，后续将接入真实数据与运营后台。
            </p>

            <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
              {[
                ["能力上架队列", "28"],
                ["今日咨询线索", "136"],
                ["生态伙伴席位", "19"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-cyan-300/20 bg-slate-900/70 p-3"
                >
                  <p className="text-[11px] text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-black text-cyan-200">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {READY_FEATURES.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-violet-300/25 bg-gradient-to-br from-slate-900/95 via-slate-900 to-violet-950/30 p-3"
              >
                <p className="text-sm font-bold text-violet-200">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.desc}</p>
              </article>
            ))}
            <article className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-amber-100">
              <p className="text-sm font-bold">状态说明</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
                当前页面用于占位展示与视觉评审，点击门户卡片将稳定进入此页，不再报错。真实业务功能将按“能力上架→交易撮合→生态协同”节奏分期开放。
              </p>
            </article>
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
