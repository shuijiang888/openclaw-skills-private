import { headers } from "next/headers";
import { SeedPilotTable } from "@/components/SeedPilotTable";
import { parseDemoRole } from "@/lib/approval";
import {
  canAssignSeedPilotOwner,
  canEditSeedPilotScoring,
} from "@/lib/seed-pilot-permissions";
import type { Stage } from "@/components/SeedPilotTable";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ConsoleSeedPilotPage() {
  const hdr = await headers();
  const role = parseDemoRole(hdr.get("x-profit-session-role") ?? hdr.get("x-demo-role"));
  const rows = await prisma.seedPilotUser.findMany({
    orderBy: [{ pilotStage: "asc" }, { lastActivityAt: "desc" }],
  });
  const actorRole = role;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        面向 50 位种子用户的试点推进看板：覆盖邀请、激活、反馈、复盘全流程。
        销售经理可更新推进状态，VP 额外可维护 owner、问题与待办数据，用于周会闭环。
      </p>
      <SeedPilotTable
        rows={rows.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          role: r.role,
          pilotStage: r.pilotStage as Stage,
          invitedAt: r.invitedAt.toISOString(),
          activatedAt: r.activatedAt?.toISOString() ?? null,
          firstFeedbackAt: r.firstFeedbackAt?.toISOString() ?? null,
          feedbackScore: r.feedbackScore,
          issueCount: r.issueCount,
          todoCount: r.todoCount,
          ownerRole: r.ownerRole,
          lastActivityAt: r.lastActivityAt.toISOString(),
          notes: r.notes,
        }))}
        actorRole={actorRole}
        canAssignOwner={canAssignSeedPilotOwner(actorRole)}
        canEditScoring={canEditSeedPilotScoring(actorRole)}
      />
    </div>
  );
}
