import { PageContainer } from "@/components/PageContainer";
import { ZtStrategistClient } from "@/components/ZtStrategistClient";

export const dynamic = "force-dynamic";

export default function ZtStrategistPage() {
  return (
    <PageContainer className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          AI大军师 · 战情研判中枢
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          汇聚商情定义、任务悬赏与情报提交，输出多维分析、预判与对话式策略报告。
        </p>
      </div>
      <ZtStrategistClient />
    </PageContainer>
  );
}
