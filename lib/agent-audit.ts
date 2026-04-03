import { randomUUID } from "node:crypto";
import { demoRoleFromRequest } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export function newRequestId(): string {
  return randomUUID();
}

/** 旧 Client / 未 db push 时静默跳过，避免 500 */
export async function writeAgentAuditSafe(input: {
  requestId: string;
  route: string;
  action: string;
  req: Request;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const delegate = (
      prisma as unknown as {
        agentAuditLog?: {
          create: (args: {
            data: {
              requestId: string;
              route: string;
              action: string;
              actorRole: string;
              metaJson: string;
            };
          }) => Promise<unknown>;
        };
      }
    ).agentAuditLog;
    if (!delegate?.create) return;
    await delegate.create({
      data: {
        requestId: input.requestId,
        route: input.route,
        action: input.action,
        actorRole: demoRoleFromRequest(input.req),
        metaJson: JSON.stringify(input.meta ?? {}),
      },
    });
  } catch {
    /* 演示环境不因审计失败阻断主流程 */
  }
}

export function withRequestIdHeader(
  requestId: string,
): Record<string, string> {
  return { "x-request-id": requestId };
}
