import { PageContainer } from "@/components/PageContainer";
import { ZtActionCenterClient } from "@/components/ZtActionCenterClient";
import { SystemHero } from "@/components/SystemHero";

export const dynamic = "force-dynamic";

export default function ZtActionCenterPage() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        badge="Action Center"
        title="智探007 · 行动中心"
        description="聚焦当日行动卡，完成即写入积分与军衔流水。"
        tone="cyan"
      />
      <ZtActionCenterClient />
    </PageContainer>
  );
}
