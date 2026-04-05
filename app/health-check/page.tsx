import { PageContainer } from "@/components/PageContainer";
import { HealthCheckDashboard } from "@/components/HealthCheckDashboard";

export const dynamic = "force-dynamic";

export default function HealthCheckPage() {
  return (
    <PageContainer className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          健康检查页
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          一页检查核心页面与 API 状态，便于你和团队快速判断系统是否可用。
        </p>
      </div>
      <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/70 p-4 text-xs text-cyan-900 shadow-sm dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-100">
        <p className="font-semibold">发布前建议执行</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>npm run release:preflight</li>
          <li>npm run zt:acceptance（门禁→行动→悬赏→积分→个人工作台）</li>
        </ul>
      </div>
      <HealthCheckDashboard />
    </PageContainer>
  );
}
