import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapIntelDefinitionRow } from "@/lib/zt-intel-definitions";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureZtBootstrap();
    const rows = await prisma.ztIntelDefinition.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ items: rows.map(mapIntelDefinitionRow) });
  } catch (error) {
    return NextResponse.json(
      {
        error: "intel_definitions_unavailable",
        message:
          error instanceof Error
            ? error.message
            : "intel definitions unavailable",
      },
      { status: 503 },
    );
  }
}
