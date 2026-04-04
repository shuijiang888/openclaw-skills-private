import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export async function GET() {
  await ensureZtBootstrap();
  const rows = await prisma.ztBountyTask.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items: rows });
}

