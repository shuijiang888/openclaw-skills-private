import { NextResponse } from "next/server";
import { shouldRedactAgentProbeDetails } from "@/lib/agent-public-metadata";
import { probeOllama } from "@/lib/ollama-health";
import { getOllamaConfig } from "@/lib/ollama-quote-assistant";
import { getMiniMaxConfig } from "@/lib/minimax-quote-assistant";
import { isLlmPasswordRequired } from "@/lib/agent-llm-password";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 自检：Ollama 是否启动、OLLAMA_MODEL 是否已 pull（不写审计） */
export async function GET() {
  const cfg = getOllamaConfig();
  const miniCfg = getMiniMaxConfig();
  const redact = shouldRedactAgentProbeDetails();
  const llmPasswordRequired = isLlmPasswordRequired();
  if (miniCfg) {
    return NextResponse.json({
      provider: "minimax",
      llmEnabled: true,
      llmProviderLabel: "MiniMax",
      llmPasswordRequired,
      llmModel: miniCfg.model,
      minimaxConfigured: true,
      minimaxBaseUrl: redact ? null : miniCfg.baseUrl,
      model: miniCfg.model,
      baseUrl: redact ? null : miniCfg.baseUrl,
      reachable: true,
      modelReady: true,
      availableModels: redact ? ([] as string[]) : [miniCfg.model],
      latencyMs: 0,
    });
  }
  if (!cfg) {
    return NextResponse.json({
      provider: "none",
      llmEnabled: false,
      llmProviderLabel: "未启用",
      ollamaEnabled: false,
      model: null,
      baseUrl: null,
      reachable: false,
      modelReady: false,
      availableModels: [] as string[],
      latencyMs: 0,
      llmProvider: "rules",
      minimaxEnabled: false,
      minimaxModel: null,
      llmPasswordRequired,
    });
  }
  const probe = await probeOllama(cfg);
  return NextResponse.json({
    provider: "ollama",
    llmEnabled: true,
    llmProviderLabel: "Ollama",
    ollamaEnabled: true,
    model: probe.configuredModel,
    baseUrl: redact ? null : probe.baseUrl,
    reachable: probe.reachable,
    modelReady: probe.modelReady,
    availableModels: redact ? ([] as string[]) : probe.availableModels,
    latencyMs: probe.latencyMs,
    error: probe.error,
    llmProvider: "ollama",
    minimaxEnabled: false,
    minimaxModel: null,
    llmPasswordRequired,
  });
}
