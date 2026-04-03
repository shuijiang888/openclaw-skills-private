import { ReadinessChecklist } from "@/components/ReadinessChecklist";

export default function ConsoleReadinessPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        用于立项与实施前自检：勾选表示企业侧已具备或已排期该项。内容对齐
        <code className="mx-1 rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
          VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md
        </code>
        第二章。
      </p>
      <ReadinessChecklist />
    </div>
  );
}
