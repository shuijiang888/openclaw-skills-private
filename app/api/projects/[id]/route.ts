import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";
import {
  battleCardTemplateById,
  normalizeFlowStage,
  parseBattleCardId,
  statusFromFlowStage,
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

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const stageChanged = body.flowStage !== undefined;
  const nextStage = stageChanged
    ? normalizeFlowStage(body.flowStage, normalizeFlowStage(existing.flowStage))
    : normalizeFlowStage(existing.flowStage);
  const status = stageChanged
    ? statusFromFlowStage(nextStage)
    : existing.status;

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

  await prisma.project.update({
    where: { id },
    data: {
      flowStage: nextStage,
      status,
      battleCard,
      nextStep,
      nextStepDueAt,
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
