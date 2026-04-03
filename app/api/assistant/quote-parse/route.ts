import { NextResponse } from "next/server";
import {
  newRequestId,
  withRequestIdHeader,
  writeAgentAuditSafe,
} from "@/lib/agent-audit";
import {
  parseQuoteNaturalLanguage,
  QUOTE_COEFF_DEFAULTS,
  type CoeffPatch,
} from "@/lib/quote-natural-language";
import { getOllamaConfig, parseQuoteWithOllama } from "@/lib/ollama-quote-assistant";

/** 本地 35B 推理可能超过 60s，放宽上限（部署到 Vercel 等时亦生效） */
export const maxDuration = 300;

type BaselineBody = Partial<typeof QUOTE_COEFF_DEFAULTS>;

function mergeBaseline(body: BaselineBody | undefined): Record<string, number> {
  return {
    coeffCustomer: body?.coeffCustomer ?? QUOTE_COEFF_DEFAULTS.coeffCustomer,
    coeffIndustry: body?.coeffIndustry ?? QUOTE_COEFF_DEFAULTS.coeffIndustry,
    coeffRegion: body?.coeffRegion ?? QUOTE_COEFF_DEFAULTS.coeffRegion,
    coeffProduct: body?.coeffProduct ?? QUOTE_COEFF_DEFAULTS.coeffProduct,
    coeffLead: body?.coeffLead ?? QUOTE_COEFF_DEFAULTS.coeffLead,
    coeffQty: body?.coeffQty ?? QUOTE_COEFF_DEFAULTS.coeffQty,
  };
}

export type QuoteParseResponse = {
  source: "ollama" | "rules";
  model?: string;
  fallbackReason?: string;
  summary: string[];
  hints: string[];
  patch: CoeffPatch;
};

/** 供前端展示是否已配置本机 Ollama */
export async function GET() {
  const cfg = getOllamaConfig();
  return NextResponse.json({
    ollamaEnabled: Boolean(cfg),
    model: cfg?.model ?? null,
  });
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const rh = withRequestIdHeader(requestId);

  const body = (await req.json()) as {
    text?: string;
    baseline?: BaselineBody;
  };
  const text = body.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json(
      { error: "text 不能为空" },
      { status: 400, headers: rh },
    );
  }

  const baseline = mergeBaseline(body.baseline);
  const cfg = getOllamaConfig();

  let response: QuoteParseResponse;

  if (cfg) {
    try {
      const llm = await parseQuoteWithOllama(text, baseline);
      response = {
        source: "ollama",
        model: llm.model,
        summary: llm.summary,
        hints: llm.hints,
        patch: llm.patch,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const rules = parseQuoteNaturalLanguage(text, baseline);
      response = {
        source: "rules",
        model: cfg.model,
        fallbackReason: `已连接配置的本机模型「${cfg.model}」，但调用失败（${msg}），已改用规则引擎`,
        summary: rules.summary,
        hints: rules.hints,
        patch: rules.patch,
      };
    }
  } else {
    const rules = parseQuoteNaturalLanguage(text, baseline);
    response = {
      source: "rules",
      summary: rules.summary,
      hints: rules.hints,
      patch: rules.patch,
    };
  }

  await writeAgentAuditSafe({
    requestId,
    route: "POST /api/assistant/quote-parse",
    action: "quote_parse",
    req,
    meta: {
      source: response.source,
      textLength: text.length,
      patchKeys: Object.keys(response.patch),
      model: response.model ?? null,
    },
  });

  return NextResponse.json(response, { headers: rh });
}
