import { PageContainer } from "@/components/PageContainer";
import { SystemHero } from "@/components/SystemHero";
import { ZtHonorCenterClient } from "@/components/ZtHonorCenterClient";

export const dynamic = "force-dynamic";

export default function ZtHonorPage() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        eyebrow="Honor & Rewards"
        title="智探007 · 荣誉积分中心"
        description="查看个人积分进度并发起兑换申请，形成荣誉激励闭环。"
      />
      <ZtHonorCenterClient />
    </PageContainer>
  );
}
