import { NextResponse } from "next/server";
import { ztBootstrap } from "@/lib/zt-bootstrap";

export async function POST() {
  const summary = await ztBootstrap();
  return NextResponse.json({ ok: true, summary });
}
