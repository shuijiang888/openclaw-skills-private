import { PageContainer } from "@/components/PageContainer";
import { HealthCheckDashboard } from "@/components/HealthCheckDashboard";
import { SystemHero } from "@/components/SystemHero";

export const dynamic = "force-dynamic";

export default function HealthCheckPage() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        badge="Shared Agent Capability"
        title="健康检查页"
        description="一页检查核心页面与 API 状态，便于你和团队快速判断系统是否可用。"
      />
      <div className="rounded-2xl border border-cyan-200/80 bg-cyan-50/70 p-4 text-xs text-cyan-900 shadow-sm dark:border-cyan-900/50 dark:bg-cyan-950/20 dark:text-cyan-100">
        <p className="font-semibold">发布前建议执行</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>npm run release:preflight</li>
          <li>npm run zt:acceptance（门禁→行动→悬赏→积分→个人工作台）</li>
          <li>/api/zt/monitoring 状态非 critical（可在本页监控面板查看）</li>
        </ul>
      </div>
      <HealthCheckDashboard />
    </PageContainer>
  );
}
