import { PageContainer } from "@/components/PageContainer";
import { Zt007System } from "@/components/Zt007System";
import { SystemHero } from "@/components/SystemHero";

export const dynamic = "force-dynamic";

export default function Zt007Page() {
  return (
    <PageContainer className="space-y-4">
      <SystemHero
        eyebrow="Intelligence-to-Action OS"
        title="智探007 · 完整系统（MVP）"
        description="单入口、角色切换、行动卡、任务悬赏、情报提交、积分与兑换、管理驾驶舱。"
      />
      <Zt007System />
    </PageContainer>
  );
}
