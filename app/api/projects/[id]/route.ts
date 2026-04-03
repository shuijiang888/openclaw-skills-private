import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichProject } from "@/lib/serialize";

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
