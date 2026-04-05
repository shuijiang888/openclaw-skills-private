"use client";

export default function GlobalLoadingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-5 py-8 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
        系统正在加载，请稍候…
      </div>
    </div>
  );
}
