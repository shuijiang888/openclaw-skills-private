import { NextResponse } from "next/server";
import { computeCompassQuadrant } from "@/lib/compass-quadrant";
import { loadCompassQuadrantThresholdsSafe } from "@/lib/load-compass-quadrant-threshold";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [items, thresholds] = await Promise.all([
    prisma.compassItem.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    loadCompassQuadrantThresholdsSafe(),
  ]);

  return NextResponse.json({
    quadrantThresholds: thresholds,
    items: items.map((i) => ({
      ...i,
      effectiveQuadrant: computeCompassQuadrant(
        i.grossMargin,
        i.growth,
        thresholds,
      ),
    })),
  });
}
