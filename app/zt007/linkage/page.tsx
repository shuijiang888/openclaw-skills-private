import { PageContainer } from "@/components/PageContainer";
import { SystemHero } from "@/components/SystemHero";
import { ZtLinkageBoard } from "@/components/ZtLinkageBoard";

export const dynamic = "force-dynamic";

export default function ZtLinkagePage() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        badge="P2 Batch3"
        title="情报→商机→报价 联动看板"
        description="聚合智探007情报、任务与盈利系统报价项目，展示跨系统联动热度与可执行落点。"
        tone="violet"
      />
      <ZtLinkageBoard />
    </PageContainer>
  );
}
