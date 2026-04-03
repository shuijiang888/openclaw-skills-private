import {
  normalizeModelCoeffPatch,
  type ParseQuoteLanguageResult,
} from "@/lib/quote-natural-language";

type OllamaChatResponse = {
  message?: { content?: string };
  error?: string;
};

/** 显式 OLLAMA_ENABLED=1 时才请求本机，避免未启动时拖慢解析。 */
export function getOllamaConfig(): { baseUrl: string; model: string } | null {
  const en = process.env.OLLAMA_ENABLED?.trim();
  if (en !== "1" && en?.toLowerCase() !== "true") {
    return null;
  }
  const baseUrl = (
    process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"
  ).replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL ?? "qwen3.5:35b";
  return { baseUrl, model };
}

const SYSTEM_PROMPT = `你是制造企业报价辅助助手。用户用中文描述商机与客户诉求；系统用六个系数连乘得到建议价：客户、行业、区域、产品、交期、批量。

请根据描述判断应如何调整系数（数值越高通常表示风险补偿或溢价空间，越低表示竞争让利或走量）。

【输出要求 — 适用于 Qwen 等本地大模型】
- 禁止输出思考过程、XML 标签、Markdown 标题或代码围栏。
- 只输出一个 JSON 对象（UTF-8），可被 JSON.parse 直接解析。

字段如下：
- summary: string[]  最多 4 条中文短句，说明判断依据
- hints: string[]  合规/毛利/交期等风险提示，没有则 []
- patch: object  只包含需要修改的键。键名必须是之一：coeffCustomer, coeffIndustry, coeffRegion, coeffProduct, coeffLead, coeffQty。值为**整条系数在调整后的最终数值**（不是增量），用数字类型（不要用字符串）。合理范围约 0.55～1.85。未改动的键不要出现在 patch 中。

若信息不足、无需改任何系数，patch 必须为 {}。`;

function buildUserContent(
  text: string,
  baseline: Record<string, number>,
): string {
  return `【用户描述】\n${text}\n\n【当前六项系数基准】\n${JSON.stringify(
    {
      coeffCustomer: baseline.coeffCustomer,
      coeffIndustry: baseline.coeffIndustry,
      coeffRegion: baseline.coeffRegion,
      coeffProduct: baseline.coeffProduct,
      coeffLead: baseline.coeffLead,
      coeffQty: baseline.coeffQty,
    },
    null,
    2,
  )}`;
}

/** 去掉常见模型包裹物，便于解析 JSON */
export function stripLlmNoiseForJson(raw: string): string {
  let s = raw.trim();
  const thinkOpen = "<" + "think" + ">";
  const thinkClose = "<" + "/" + "think" + ">";
  let i0 = s.indexOf(thinkOpen);
  let i1 = s.indexOf(thinkClose);
  if (i0 >= 0 && i1 > i0) {
    s = (s.slice(0, i0) + s.slice(i1 + thinkClose.length)).trim();
  }
  i0 = s.indexOf("<thinking>");
  i1 = s.indexOf("</thinking>");
  if (i0 >= 0 && i1 > i0) {
    s = (s.slice(0, i0) + s.slice(i1 + "</thinking>".length)).trim();
  }
  const rOpen = "<" + "redacted_thinking" + ">";
  const rClose = "<" + "/" + "redacted_thinking" + ">";
  i0 = s.indexOf(rOpen);
  i1 = s.indexOf(rClose);
  if (i0 >= 0 && i1 > i0) {
    s = (s.slice(0, i0) + s.slice(i1 + rClose.length)).trim();
  }
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) s = fence[1].trim();
  return s.trim();
}

function parseModelJsonContent(raw: string): Record<string, unknown> {
  const trimmed = stripLlmNoiseForJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("大模型返回不是合法 JSON");
    parsed = JSON.parse(m[0]);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON 根必须是对象");
  }
  return parsed as Record<string, unknown>;
}

export async function parseQuoteWithOllama(
  text: string,
  baseline: Record<string, number>,
): Promise<ParseQuoteLanguageResult & { model: string }> {
  const cfg = getOllamaConfig();
  if (!cfg) {
    throw new Error("OLLAMA_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  /** 35B 级模型在 CPU 上可能极慢，默认 5 分钟；可用 OLLAMA_TIMEOUT_MS 覆盖 */
  const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS ?? 300_000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const numPredict = Number(process.env.OLLAMA_NUM_PREDICT ?? 2048);
  const useJsonFormat = process.env.OLLAMA_JSON_FORMAT !== "0";

  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserContent(text.trim(), baseline) },
        ],
        stream: false,
        ...(useJsonFormat ? { format: "json" } : {}),
        options: {
          temperature: Number(process.env.OLLAMA_TEMPERATURE ?? 0.15),
          num_predict: Number.isFinite(numPredict) ? numPredict : 2048,
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Ollama HTTP ${res.status}${errText ? `: ${errText.slice(0, 240)}` : ""}`,
    );
  }

  const data = (await res.json()) as OllamaChatResponse;
  if (data.error) throw new Error(String(data.error));

  const raw = data.message?.content?.trim() ?? "";
  if (!raw) throw new Error("Ollama 返回内容为空");

  const obj = parseModelJsonContent(raw);
  const summary = Array.isArray(obj.summary)
    ? obj.summary.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const hints = Array.isArray(obj.hints)
    ? obj.hints.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const patch = normalizeModelCoeffPatch(obj.patch, baseline);

  return { summary, hints, patch, model: cfg.model };
}
