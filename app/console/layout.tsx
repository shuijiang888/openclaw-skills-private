import { ConsoleAccessGuard } from "@/components/ConsoleAccessGuard";
import { ConsoleSidebar } from "@/components/ConsoleSidebar";
import { FxiaokeBrandBadge } from "@/components/FxiaokeBrandBadge";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            运营与配置后台
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            与前台工作台共用同一套数据；此处侧重主数据、审批队列与规则可视化。入口与菜单随右上角「演示身份」变化。
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            品牌联合
          </p>
          <div className="mt-1">
            <FxiaokeBrandBadge variant="compact" />
          </div>
        </div>
      </div>
      <ConsoleAccessGuard>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <ConsoleSidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </ConsoleAccessGuard>
    </div>
  );
}
