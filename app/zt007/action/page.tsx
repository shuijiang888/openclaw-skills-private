import { PageContainer } from "@/components/PageContainer";
import { ZtActionCenterClient } from "@/components/ZtActionCenterClient";

export const dynamic = "force-dynamic";

export default function ZtActionCenterPage() {
  return (
    <PageContainer className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          智探007 · 行动中心
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          聚焦当日行动卡，完成即写入积分与军衔流水。
        </p>
      </div>
      <ZtActionCenterClient />
    </PageContainer>
  );
}
