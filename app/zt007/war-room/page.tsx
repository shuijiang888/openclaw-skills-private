import { PageContainer } from "@/components/PageContainer";
import { SystemHero } from "@/components/SystemHero";
import { ZtWarRoomBoard } from "@/components/ZtWarRoomBoard";

export const dynamic = "force-dynamic";

export default function ZtWarRoomPage() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        badge="War Room"
        title="智探007 · 作战指挥大屏"
        description="按城市、发布人、任务、积分、商情定义五大维度动态轮播，提供战场级可视化指挥视图。"
        tone="violet"
        tags={["Live Snapshot", "Command View", "Hotspot Tracking"]}
      />
      <ZtWarRoomBoard />
    </PageContainer>
  );
}
