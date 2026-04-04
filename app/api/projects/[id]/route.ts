import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";
import {
  allowedTransitionTargets,
  battleCardTemplateById,
  mergeStageEvidence,
  normalizeFlowStage,
  parseStageEvidence,
  parseBattleCardId,
  type StageEvidenceKey,
  statusFromFlowStage,
  validateStageTransition,
} from "@/lib/sales-flow";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { customer: true, quote: true },
  });
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
  return NextResponse.json(enrichProject(project));
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.project.findUnique({
    where: { id },
    include: { quote: { select: { pendingRole: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const currentStage = normalizeFlowStage(existing.flowStage);
  const stageChanged = body.flowStage !== undefined;
  const nextStage = stageChanged
    ? normalizeFlowStage(body.flowStage, currentStage)
    : currentStage;
  const status = stageChanged ? statusFromFlowStage(nextStage) : existing.status;

  const battleCard = parseBattleCardId(
    body.battleCard !== undefined ? body.battleCard : existing.battleCard,
  );
  const template = battleCardTemplateById(battleCard);

  const nextStep =
    body.nextStep !== undefined
      ? String(body.nextStep ?? "").trim()
      : existing.nextStep || template?.defaultNextStep || "";
  const dueInput =
    body.nextStepDueAt !== undefined ? body.nextStepDueAt : existing.nextStepDueAt;
  const dueCandidate =
    dueInput && typeof dueInput === "string"
      ? new Date(dueInput)
      : dueInput instanceof Date
        ? dueInput
        : null;
  const nextStepDueAt =
    dueCandidate && !Number.isNaN(dueCandidate.getTime()) ? dueCandidate : null;
  const currentEvidence = parseStageEvidence(existing.stageEvidenceJson);
  const evidencePatchRaw =
    body.stageEvidence &&
    typeof body.stageEvidence === "object" &&
    !Array.isArray(body.stageEvidence)
      ? (body.stageEvidence as Record<string, unknown>)
      : {};
  const evidencePatch: Partial<Record<StageEvidenceKey, unknown>> = {};
  for (const [k, v] of Object.entries(evidencePatchRaw)) {
    evidencePatch[k as StageEvidenceKey] = v;
  }
  const stageEvidence = mergeStageEvidence(currentEvidence, evidencePatch);
  const closeLostReason =
    body.closeLostReason !== undefined
      ? String(body.closeLostReason ?? "").trim()
      : existing.closeLostReason;

  if (stageChanged && nextStage !== currentStage) {
    const validation = validateStageTransition({
      from: currentStage,
      to: nextStage,
      evidence: stageEvidence,
      nextStep,
      nextStepDueAt,
      closeLostReason,
      hasPendingRole: Boolean(existing.quote?.pendingRole),
    });
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "阶段迁移未通过校验",
          detail: validation.reasons.join("；"),
          reasons: validation.reasons,
          missingEvidence: validation.missingKeys,
          allowedTargets: allowedTransitionTargets(currentStage),
        },
        { status: 400 },
      );
    }
  }

  await prisma.project.update({
    where: { id },
    data: {
      flowStage: nextStage,
      status,
      battleCard,
      nextStep,
      nextStepDueAt,
      stageEvidenceJson: JSON.stringify(stageEvidence),
      closeLostReason,
      lastStageAt: stageChanged ? new Date() : existing.lastStageAt,
    },
  });

  const project = await prisma.project.findUnique({
    where: { id },
    include: { customer: true, quote: true },
  });
  if (!project) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }
  return NextResponse.json(enrichProject(project));
}
