import { PageContainer } from "@/components/PageContainer";
import { NewProjectForm } from "./NewProjectForm";

export default function NewProjectPage() {
  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">新建报价</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          创建项目并自动生成首版建议价与对标参考。
        </p>
      </div>
      <NewProjectForm />
    </PageContainer>
  );
}
