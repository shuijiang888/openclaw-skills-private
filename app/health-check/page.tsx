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
      <HealthCheckDashboard />
    </PageContainer>
  );
}
