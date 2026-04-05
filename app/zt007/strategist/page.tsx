import { PageContainer } from "@/components/PageContainer";
import { SystemHero } from "@/components/SystemHero";
import { ZtStrategistClient } from "@/components/ZtStrategistClient";

export const dynamic = "force-dynamic";

export default function ZtStrategistPage() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        badge="Strategist Core"
        title="AI大军师 · 战情研判中枢"
        description="汇聚商情定义、任务悬赏与情报提交，输出多维分析、预判与对话式策略报告。"
        tone="amber"
      />
      <ZtStrategistClient />
    </PageContainer>
  );
}
