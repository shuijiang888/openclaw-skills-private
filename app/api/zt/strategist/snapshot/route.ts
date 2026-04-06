import { NextResponse } from "next/server";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import { buildStrategistSnapshot } from "@/lib/zt-strategist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await ensureZtBootstrap();
    const snapshot = await buildStrategistSnapshot(req);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        error: "zt_strategist_snapshot_unavailable",
        message:
          error instanceof Error ? error.message : "zt strategist snapshot unavailable",
      },
      { status: 503 },
    );
  }
}
