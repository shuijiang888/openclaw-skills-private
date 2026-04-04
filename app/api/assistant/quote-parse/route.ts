import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ASSISTANT_CSRF_COOKIE,
  ASSISTANT_CSRF_HEADER,
} from "@/lib/agent-csrf-constants";
import {
  createAssistantCsrfToken,
  isAssistantCsrfEnabled,
} from "@/lib/agent-csrf";
import {
  getRequestClientKey,
  checkAgentRateLimit,
} from "@/lib/agent-rate-limit";
import { validateQuoteParseBody } from "@/lib/agent-quote-parse-validation";
import { textDigestForAudit } from "@/lib/agent-audit-digest";
import {
  newRequestId,
  withRequestIdHeader,
  writeAgentAuditSafe,
} from "@/lib/agent-audit";
import { detectUserPromptInjectionSignals } from "@/lib/agent-injection-heuristics";
import {
  parseQuoteNaturalLanguage,
  type CoeffPatch,
} from "@/lib/quote-natural-language";
import { demoRoleFromRequest } from "@/lib/http";
import { getOllamaConfig, parseQuoteWithOllama } from "@/lib/ollama-quote-assistant";
import { QUOTE_PARSE_PROMPT_VERSION } from "@/lib/prompts/quote-parse-system";
import { prisma } from "@/lib/prisma";
import { loadCompassQuadrantThresholdsSafe } from "@/lib/load-compass-quadrant-threshold";
import {
  buildCompassRulesContextForPrompt,
  type CompassAlertRuleForPrompt,
} from "@/lib/compass-rule-prompt";

/** 本地 35B 推理可能超过 60s，放宽上限（部署到 Vercel 等时亦生效） */
export const maxDuration = 300;

export type QuoteParseResponse = {
  source: "ollama" | "rules";
  model?: string;
  fallbackReason?: string;
  summary: string[];
  hints: string[];
  patch: CoeffPatch;
};

/** 供前端展示是否已配置本机 Ollama；生产环境可下发 CSRF token */
export async function GET() {
  const cfg = getOllamaConfig();
  const csrfOn = isAssistantCsrfEnabled();
  const payload: Record<string, unknown> = {
    ollamaEnabled: Boolean(cfg),
    model: cfg?.model ?? null,
    csrfRequired: csrfOn,
    promptVersion: QUOTE_PARSE_PROMPT_VERSION,
  };

  if (csrfOn) {
    const token = createAssistantCsrfToken();
    payload.csrfToken = token;
    const res = NextResponse.json(payload);
    res.cookies.set(ASSISTANT_CSRF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 4,
    });
    return res;
  }

  return NextResponse.json(payload);
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const rh = withRequestIdHeader(requestId);

  const limited = checkAgentRateLimit(getRequestClientKey(req));
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: "请求过于频繁，请稍后重试",
        code: "rate_limited",
        requestId,
      },
      {
        status: 429,
        headers: {
          ...rh,
          "Retry-After": String(limited.retryAfterSec),
        },
      },
    );
  }

  if (isAssistantCsrfEnabled()) {
    const jar = await cookies();
    const cookieTok = jar.get(ASSISTANT_CSRF_COOKIE)?.value;
    const headerTok = req.headers.get(ASSISTANT_CSRF_HEADER)?.trim();
    if (!cookieTok || !headerTok || cookieTok !== headerTok) {
      return NextResponse.json(
        {
          error: "安全校验失败，请刷新页面后重试",
          code: "csrf_failed",
          requestId,
        },
        { status: 403, headers: rh },
      );
    }
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "请求体不是合法 JSON", code: "bad_json", requestId },
      { status: 400, headers: rh },
    );
  }

  const parsed = validateQuoteParseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, code: "validation_error", requestId },
      { status: 400, headers: rh },
    );
  }

  const { text, baseline } = parsed.value;
  const cfg = getOllamaConfig();
  const actorRole = demoRoleFromRequest(req);
  const textDigest = textDigestForAudit(text);
  const injectionSignals = detectUserPromptInjectionSignals(text);

  let response: QuoteParseResponse;
  let outputTruncated = false;
  let schemaRejected = false;

  if (cfg) {
    try {
      let compassRuleContext: string | undefined;
      try {
        const [thresholds, rules] = await Promise.all([
          loadCompassQuadrantThresholdsSafe(),
          prisma.compassAlertRule.findMany({
            orderBy: { sortOrder: "asc" },
            take: 12,
          }),
        ]);

        compassRuleContext = buildCompassRulesContextForPrompt(
          thresholds,
          rules as CompassAlertRuleForPrompt[],
        );
      } catch {
        /* 忽略罗盘规则注入失败，仍按原有 LLM 行为解析 */
      }

      const llm = await parseQuoteWithOllama(
        text,
        baseline,
        actorRole,
        compassRuleContext,
      );
      outputTruncated = llm.outputTruncated;
      schemaRejected = llm.schemaRejected;
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

  if (injectionSignals.length > 0) {
    const guardHint =
      "系统已尝试仅按业务语义解析；若输入中含指令类语句，请勿依赖其对系数的影响，以 Deal Desk 规则为准。";
    response = {
      ...response,
      hints: [guardHint, ...response.hints].slice(0, 12),
    };
  }

  await writeAgentAuditSafe({
    requestId,
    route: "POST /api/assistant/quote-parse",
    action: "quote_parse",
    req,
    meta: {
      source: response.source,
      actorRole,
      textLength: textDigest.length,
      textSha256Prefix: textDigest.sha256Prefix,
      promptVersion: QUOTE_PARSE_PROMPT_VERSION,
      injectionSignals,
      outputTruncated,
      schemaRejected,
      patchKeys: Object.keys(response.patch),
      model: response.model ?? null,
      fallbackReason: response.fallbackReason ?? null,
    },
  });

  return NextResponse.json(response, {
    headers: { ...rh, "x-profit-prompt-version": QUOTE_PARSE_PROMPT_VERSION },
  });
}
