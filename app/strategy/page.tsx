import type { Metadata } from "next";
import { PageContainer } from "@/components/PageContainer";
import { StrategyFullDoc } from "@/components/StrategyFullDoc";
import { loadStrategyMarkdown } from "@/lib/load-strategy-doc";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "战略全文 | 智能盈利管理系统",
  description: "价值主张、落地依赖与迭代前瞻（全文检索）",
};

export default async function StrategyPage() {
  const markdown = await loadStrategyMarkdown();
  return (
    <PageContainer className="max-w-4xl">
      <StrategyFullDoc markdown={markdown} />
    </PageContainer>
  );
}
