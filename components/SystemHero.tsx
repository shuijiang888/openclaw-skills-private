import type { ReactNode } from "react";

type HeroTone = "cyan" | "amber" | "violet" | "slate";

const TONE_STYLES: Record<
  HeroTone,
  { wrap: string; badge: string; title: string; text: string }
> = {
  cyan: {
    wrap:
      "border-cyan-200/70 bg-gradient-to-br from-cyan-50/95 via-white to-slate-50/90 dark:border-cyan-900/40 dark:from-cyan-950/35 dark:via-slate-900 dark:to-slate-950",
    badge:
      "border-cyan-300/70 bg-cyan-500/10 text-cyan-800 dark:border-cyan-700/70 dark:bg-cyan-500/20 dark:text-cyan-200",
    title: "text-slate-900 dark:text-slate-100",
    text: "text-slate-600 dark:text-slate-300",
  },
  amber: {
    wrap:
      "border-amber-200/70 bg-gradient-to-br from-amber-50/95 via-white to-slate-50/90 dark:border-amber-900/40 dark:from-amber-950/35 dark:via-slate-900 dark:to-slate-950",
    badge:
      "border-amber-300/70 bg-amber-500/10 text-amber-900 dark:border-amber-700/70 dark:bg-amber-500/20 dark:text-amber-200",
    title: "text-slate-900 dark:text-slate-100",
    text: "text-slate-600 dark:text-slate-300",
  },
  violet: {
    wrap:
      "border-violet-200/70 bg-gradient-to-br from-violet-50/95 via-white to-slate-50/90 dark:border-violet-900/40 dark:from-violet-950/35 dark:via-slate-900 dark:to-slate-950",
    badge:
      "border-violet-300/70 bg-violet-500/10 text-violet-900 dark:border-violet-700/70 dark:bg-violet-500/20 dark:text-violet-200",
    title: "text-slate-900 dark:text-slate-100",
    text: "text-slate-600 dark:text-slate-300",
  },
  slate: {
    wrap:
      "border-slate-200/80 bg-gradient-to-br from-white via-slate-50/90 to-slate-100/80 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950",
    badge:
      "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-700/70 dark:bg-slate-500/20 dark:text-slate-200",
    title: "text-slate-900 dark:text-slate-100",
    text: "text-slate-600 dark:text-slate-300",
  },
};

export function SystemHero({
  eyebrow,
  badge,
  title,
  description,
  tags,
  tone = "slate",
  actions,
}: {
  eyebrow?: string;
  badge?: string;
  title: string;
  description: string;
  tags?: string[];
  tone?: HeroTone;
  actions?: ReactNode;
}) {
  const style = TONE_STYLES[tone];
  const badgeText = (badge ?? eyebrow ?? "").trim();
  const normalizedTags = (tags ?? []).filter(Boolean).slice(0, 8);
  return (
    <section
      className={`rounded-2xl border px-5 py-4 shadow-sm backdrop-blur-sm sm:px-6 ${style.wrap}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {badgeText ? (
            <p
              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide ${style.badge}`}
            >
              {badgeText}
            </p>
          ) : null}
          <h1 className={`mt-2 text-xl font-bold tracking-tight sm:text-2xl ${style.title}`}>
            {title}
          </h1>
          <p className={`mt-2 max-w-3xl text-sm leading-relaxed ${style.text}`}>{description}</p>
          {normalizedTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {normalizedTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-300/70 bg-white/70 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/50 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
