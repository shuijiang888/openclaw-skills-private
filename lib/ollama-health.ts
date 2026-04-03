export type OllamaConnCfg = { baseUrl: string; model: string };

type TagsResponse = { models?: { name?: string; model?: string }[] };

/** 探测本机 Ollama 是否可达、配置模型是否已拉取（用于演示/实战自检） */
export async function probeOllama(
  cfg: OllamaConnCfg,
  opts?: { timeoutMs?: number },
): Promise<{
  reachable: boolean;
  modelReady: boolean;
  configuredModel: string;
  baseUrl: string;
  availableModels: string[];
  error?: string;
  latencyMs: number;
}> {
  const timeoutMs = opts?.timeoutMs ?? 8_000;
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      return {
        reachable: false,
        modelReady: false,
        configuredModel: cfg.model,
        baseUrl: cfg.baseUrl,
        availableModels: [],
        error: `HTTP ${res.status}`,
        latencyMs,
      };
    }
    const data = (await res.json()) as TagsResponse;
    const names = (data.models ?? [])
      .map((m) => m.name ?? m.model ?? "")
      .filter(Boolean);
    const want = cfg.model.trim();
    const modelReady = names.some((n) => {
      if (n === want) return true;
      if (n.startsWith(`${want}:`) || want.startsWith(`${n}:`)) return true;
      return false;
    });
    return {
      reachable: true,
      modelReady,
      configuredModel: want,
      baseUrl: cfg.baseUrl,
      availableModels: names.slice(0, 24),
      latencyMs,
      ...(modelReady
        ? {}
        : {
            error: `未在 Ollama 中找到模型「${want}」。请执行：ollama pull ${want}`,
          }),
    };
  } catch (e) {
    const latencyMs = Date.now() - t0;
    const msg = e instanceof Error ? e.message : String(e);
    const aborted =
      msg.includes("abort") ||
      (typeof DOMException !== "undefined" &&
        e instanceof DOMException &&
        e.name === "AbortError");
    return {
      reachable: false,
      modelReady: false,
      configuredModel: cfg.model,
      baseUrl: cfg.baseUrl,
      availableModels: [],
      error: aborted
        ? `连接超时（${timeoutMs}ms）。请确认 Ollama 已启动且 OLLAMA_BASE_URL 正确。`
        : msg,
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}
