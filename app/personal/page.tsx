import { PageContainer } from "@/components/PageContainer";
import { PersonalWorkspaceClient } from "@/components/PersonalWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function PersonalWorkspacePage() {
  return (
    <PageContainer className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold">个人工作台</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          查看你的军衔、积分、升级进度和最近贡献记录。
        </p>
      </div>
      <PersonalWorkspaceClient />
    </PageContainer>
  );
}
