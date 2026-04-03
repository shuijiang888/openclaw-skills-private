import { NextResponse } from "next/server";
import { shouldRedactAgentProbeDetails } from "@/lib/agent-public-metadata";
import { probeOllama } from "@/lib/ollama-health";
import { getOllamaConfig } from "@/lib/ollama-quote-assistant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 自检：Ollama 是否启动、OLLAMA_MODEL 是否已 pull（不写审计） */
export async function GET() {
  const cfg = getOllamaConfig();
  const redact = shouldRedactAgentProbeDetails();
  if (!cfg) {
    return NextResponse.json({
      ollamaEnabled: false,
      model: null,
      baseUrl: null,
      reachable: false,
      modelReady: false,
      availableModels: [] as string[],
      latencyMs: 0,
    });
  }
  const probe = await probeOllama(cfg);
  return NextResponse.json({
    ollamaEnabled: true,
    model: probe.configuredModel,
    baseUrl: redact ? null : probe.baseUrl,
    reachable: probe.reachable,
    modelReady: probe.modelReady,
    availableModels: redact ? ([] as string[]) : probe.availableModels,
    latencyMs: probe.latencyMs,
    error: probe.error,
  });
}
