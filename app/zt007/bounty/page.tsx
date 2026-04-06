import { PageContainer } from "@/components/PageContainer";
import { SystemHero } from "@/components/SystemHero";
import { ZtBountyCenterClient } from "@/components/ZtBountyCenterClient";

export const dynamic = "force-dynamic";

export default function ZtBountyPage() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        eyebrow="Bounty Intelligence Workflow"
        title="智探007 · 悬赏任务"
        description="在统一商情定义下进行任务众包、情报提交与状态流转，确保每条线索都可追踪、可复盘。"
      />
      <ZtBountyCenterClient />
    </PageContainer>
  );
}
