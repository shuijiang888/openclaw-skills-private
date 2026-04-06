import { ZtSystemConfigEditor } from "@/components/ZtSystemConfigEditor";
import { ZtIntelDefinitionsManager } from "@/components/ZtIntelDefinitionsManager";
import { ensureZtSystemConfig } from "@/lib/zt-system-config";

export const dynamic = "force-dynamic";

export default async function ConsoleSystemPage() {
  const config = await ensureZtSystemConfig();
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          智探007 · 系统维护
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          管理 AI 模型使用策略、移动端体验与多端接入开关。管理员可维护，超超级管理员拥有最高权限。
        </p>
      </div>
      <ZtSystemConfigEditor initial={config} />
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          商业情报定义中心
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          统一维护商情分类、字段要求、允许格式与默认积分；前台任务/提交将基于这里的定义执行，避免开放输入导致口径漂移。
        </p>
      </div>
      <ZtIntelDefinitionsManager initialItems={[]} />
    </div>
  );
}
