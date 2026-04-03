export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-700 shadow-md ring-1 ring-white/10 dark:from-amber-500 dark:to-amber-600 dark:ring-amber-400/20 ${className}`}
      aria-hidden
    >
      <span className="text-[11px] font-bold tracking-tight text-white dark:text-slate-950">
        智盈
      </span>
    </div>
  );
}
