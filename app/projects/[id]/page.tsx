import { PageContainer } from "@/components/PageContainer";
import { Workbench } from "./Workbench";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Params) {
  const { id } = await params;
  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">智能报价工作台</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          系数测算、对标、分流与审批；右侧为「报价智能助手」，支持自然语言与文档导入（演示模式下角色见右上角「试点角色」）。
          工作台内新增「关键节点 AI 共驾」，覆盖客户需求、BOM、成本引擎、智能报价与分层审批。
        </p>
      </div>
      <Workbench projectId={id} />
    </PageContainer>
  );
}
