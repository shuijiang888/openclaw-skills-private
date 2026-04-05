import { PageContainer } from "@/components/PageContainer";
import { NewProjectForm } from "./NewProjectForm";

export default function NewProjectPage() {
  return (
    <PageContainer className="space-y-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white/90 px-5 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <p className="text-[11px] font-semibold tracking-wide text-amber-800 dark:text-amber-400">
          新建业务机会
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          新建报价
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          创建项目并自动生成首版建议价与对标参考。提交后将直接进入智能报价工作台。
        </p>
      </div>
      <NewProjectForm />
    </PageContainer>
  );
}
