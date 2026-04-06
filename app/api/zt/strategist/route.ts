import { NextResponse } from "next/server";
import { ensureZtBootstrap } from "@/lib/zt-bootstrap";
import {
  buildStrategistSnapshot,
  generateStrategistReply,
  type StrategistFocus,
  type StrategistMessage,
} from "@/lib/zt-strategist";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type StrategistQuery = {
  question?: string;
  scope?: StrategistFocus | "all";
  messages?: StrategistMessage[];
  reportMode?: boolean;
};

function parseScope(input: string | null): StrategistFocus {
  const v = String(input ?? "")
    .trim()
    .toLowerCase();
  if (
    v === "city" ||
    v === "publisher" ||
    v === "task" ||
    v === "points" ||
    v === "definition"
  ) {
    return v as StrategistFocus;
  }
  return "overall";
}

export async function POST(req: Request) {
  try {
    await ensureZtBootstrap();
    const body = (await req.json().catch(() => ({}))) as StrategistQuery;
    const question = String(body.question ?? "").trim();
    const scope =
      body.scope && body.scope !== "all"
        ? (body.scope as StrategistFocus)
        : parseScope(null);
    const snapshot = await buildStrategistSnapshot(req);
    const messages: StrategistMessage[] = Array.isArray(body.messages)
      ? body.messages
      : question
        ? [{ role: "user", content: question }]
        : [];
    const { focus, reply } = generateStrategistReply({
      snapshot,
      messages,
      focus: scope,
      reportMode: Boolean(body.reportMode),
    });
    const lines = reply
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    const recommendations = lines
      .filter((x) => x.startsWith("- "))
      .slice(0, 6)
      .map((x) => x.replace(/^- /, ""));
    const topSignalTypes = snapshot.hotspots.byDefinition.map((x) => ({
      signalType: x.category,
      count: x.count,
    }));

    return NextResponse.json({
      ok: true,
      scope: focus,
      provider: "rules",
      model: null,
      report: {
        title: "AI大军师战情研判",
        generatedAt: snapshot.generatedAt,
        portraits: {
          submissionCount: snapshot.kpis.submissions,
          activeTaskCount: snapshot.kpis.activeTasks,
          activeIntelDefinitions: snapshot.hotspots.byDefinition.length,
          topRegions: snapshot.hotspots.byCity.map((x) => ({
            region: x.city,
            count: x.count,
          })),
          topSignalTypes,
          hotIntelDefinitions: snapshot.hotspots.byDefinition.map((x) => ({
            code: x.definitionId,
            name: x.name,
            count: x.count,
          })),
          roleActivity: snapshot.hotspots.byPublisher.map((x) => ({
            actorRole: x.actorRole,
            count: x.count,
          })),
          trendHints: [...snapshot.opportunities, ...snapshot.warnings].slice(0, 8),
        },
        analysis: lines.slice(0, 6),
        forecast: snapshot.opportunities.slice(0, 5),
        recommendations:
          recommendations.length > 0
            ? recommendations
            : [
                "将热点城市与热点商情定义绑定成专题战役。",
                "对高频但低闭环任务设置责任人与截止时间。",
                "每周复盘头部发布人方法并沉淀为组织模板。",
              ],
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "zt_strategist_unavailable",
        message:
          error instanceof Error ? error.message : "zt strategist unavailable",
      },
      { status: 503 },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = parseScope(url.searchParams.get("scope"));
  const question = String(url.searchParams.get("question") ?? "").trim();
  const fakeReq = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ scope, question, reportMode: false }),
  });
  return POST(fakeReq);
}
