import { PageContainer } from "@/components/PageContainer";
import { ZtHonorCenterClient } from "@/components/ZtHonorCenterClient";

export const dynamic = "force-dynamic";

export default function ZtHonorPage() {
  return (
    <PageContainer className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          智探007 · 荣誉积分中心
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          查看个人积分进度并发起兑换申请，形成荣誉激励闭环。
        </p>
      </div>
      <ZtHonorCenterClient />
    </PageContainer>
  );
}
