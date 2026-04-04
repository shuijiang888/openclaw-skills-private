import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export async function GET() {
  try {
    await ensureZtBootstrap();
    const rows = await prisma.ztBountyTask.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items: rows });
  } catch (error) {
    return NextResponse.json(
      {
        error: "bounty_tasks_unavailable",
        message:
          error instanceof Error ? error.message : "bounty tasks unavailable",
      },
      { status: 503 },
    );
  }
}

