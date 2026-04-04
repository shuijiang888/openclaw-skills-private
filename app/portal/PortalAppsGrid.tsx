import Link from "next/link";
import type { PortalAppDef } from "@/lib/portal-apps";
import { PortalLogoutButton } from "./PortalLogoutButton";

const accentGlow: Record<PortalAppDef["accent"], string> = {
  amber: "from-amber-500/25 to-amber-600/5",
  cyan: "from-cyan-500/20 to-cyan-600/5",
  violet: "from-violet-500/20 to-violet-600/5",
};

const accentRing: Record<PortalAppDef["accent"], string> = {
  amber: "ring-amber-500/20",
  cyan: "ring-cyan-500/20",
  violet: "ring-violet-500/20",
};

const accentLabel: Record<PortalAppDef["accent"], string> = {
  amber: "text-amber-400",
  cyan: "text-cyan-400",
  violet: "text-violet-400",
};

function AppCard({ app }: { app: PortalAppDef }) {
  const glow = accentGlow[app.accent];
  const ring = accentRing[app.accent];
  const label = accentLabel[app.accent];

  const inner = (
    <>
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${glow} opacity-90 blur-2xl`}
      />
      <div className="relative z-10 flex flex-1 flex-col text-left">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${label}`}>
          {app.external ? "外部系统" : "本应用"}
        </span>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
          {app.title}
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
          {app.subtitle}
        </p>
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-white">
          进入系统
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </>
  );

  const className = `group relative flex min-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl ring-1 ${ring} backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.07]`;

  if (app.external) {
    return (
      <a
        href={app.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={app.href} className={className}>
      {inner}
    </Link>
  );
}

export function PortalAppsGrid({
  apps,
  userEmail,
  showLogout,
}: {
  apps: PortalAppDef[];
  userEmail: string;
  showLogout: boolean;
}) {
  return (
    <div className="relative min-h-[calc(100vh-12rem)] overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-5 py-12 shadow-2xl sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-15%,rgba(251,191,36,0.1),transparent)]" />
      <div className="pointer-events-none absolute left-1/4 bottom-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
              Unified Portal
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              统一门户
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              选择要进入的系统。后续新增业务线时，只需在门户配置中登记名称与地址。
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {userEmail ? (
              <p className="text-xs text-slate-500">
                已登录 <span className="text-slate-300">{userEmail}</span>
              </p>
            ) : null}
            {showLogout ? <PortalLogoutButton /> : null}
          </div>
        </header>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {apps.map((app) => (
            <li key={app.id}>
              <AppCard app={app} />
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-[11px] text-slate-600">
          {apps.some((a) => a.external)
            ? "标记为外部的系统将在新标签页打开；生产建议统一 HTTPS 以免混合内容被拦截。"
            : "两个入口均为同域路径，由前置 Nginx 将 / 与 /intel/ 分别指向对应站点。"}
        </p>
      </div>
    </div>
  );
}
