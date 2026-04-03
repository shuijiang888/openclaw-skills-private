import { AgentAuditExportButton } from "@/components/AgentAuditExportButton";
import { AgentAuditTable } from "@/components/AgentAuditTable";
import { AgentMascot } from "@/components/AgentMascot";

export default function ConsoleAgentAuditPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-4">
          <AgentMascot size={56} className="max-sm:scale-90" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              智能体审计（A2 · 试点）
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              记录报价助手解析、提交审批、审批通过、报价保存（
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">quote_patch</code>
              ）等关键操作的{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">requestId</code>{" "}
              与操作角色（演示模式为「试点角色」，登录模式为会话角色）。响应头{" "}
              <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">x-request-id</code>{" "}
              可与本表对照。
            </p>
          </div>
        </div>
        <AgentAuditExportButton />
      </div>
      <AgentAuditTable />
    </div>
  );
}
