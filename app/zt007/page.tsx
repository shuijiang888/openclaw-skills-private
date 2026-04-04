import { PageContainer } from "@/components/PageContainer";
import { Zt007System } from "@/components/Zt007System";

export const dynamic = "force-dynamic";

export default function Zt007Page() {
  return (
    <PageContainer className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          智探007 · 完整系统（MVP）
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          单入口、角色切换、行动卡、任务悬赏、情报提交、积分与兑换、管理驾驶舱。
        </p>
      </div>
      <Zt007System />
    </PageContainer>
  );
}
