import { QUOTE_COEFF_DEFAULTS } from "@/lib/quote-natural-language";

type BaselineBody = Partial<typeof QUOTE_COEFF_DEFAULTS>;

/** 允许客户端传入的基准系数范围（略宽于规则 clamp，防止恶意超大数） */
const BASELINE_COEFF_MIN = 0.25;
const BASELINE_COEFF_MAX = 3;

function maxTextChars(): number {
  const n = Number(process.env.PROFIT_AGENT_MAX_TEXT_CHARS ?? 16_000);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 256_000) : 16_000;
}

export function mergeBaseline(body: BaselineBody | undefined): Record<string, number> {
  return {
    coeffCustomer: body?.coeffCustomer ?? QUOTE_COEFF_DEFAULTS.coeffCustomer,
    coeffIndustry: body?.coeffIndustry ?? QUOTE_COEFF_DEFAULTS.coeffIndustry,
    coeffRegion: body?.coeffRegion ?? QUOTE_COEFF_DEFAULTS.coeffRegion,
    coeffProduct: body?.coeffProduct ?? QUOTE_COEFF_DEFAULTS.coeffProduct,
    coeffLead: body?.coeffLead ?? QUOTE_COEFF_DEFAULTS.coeffLead,
    coeffQty: body?.coeffQty ?? QUOTE_COEFF_DEFAULTS.coeffQty,
  };
}

export type ValidatedQuoteParseBody = {
  text: string;
  baseline: Record<string, number>;
  llmPassword?: string;
};

export function validateQuoteParseBody(
  raw: unknown,
): { ok: true; value: ValidatedQuoteParseBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "请求体须为 JSON 对象" };
  }
  const o = raw as Record<string, unknown>;

  const textRaw = o.text;
  if (textRaw !== undefined && typeof textRaw !== "string") {
    return { ok: false, error: "text 须为字符串" };
  }
  const text = String(textRaw ?? "").trim();
  const maxChars = maxTextChars();
  if (!text) {
    return { ok: false, error: "text 不能为空" };
  }
  if (text.length > maxChars) {
    return { ok: false, error: `text 过长（上限 ${maxChars} 字符）` };
  }

  let baselineBody: Record<string, number> = {};
  if (o.baseline !== undefined) {
    if (!o.baseline || typeof o.baseline !== "object" || Array.isArray(o.baseline)) {
      return { ok: false, error: "baseline 须为对象" };
    }
    const b = o.baseline as Record<string, unknown>;
    const keys = [
      "coeffCustomer",
      "coeffIndustry",
      "coeffRegion",
      "coeffProduct",
      "coeffLead",
      "coeffQty",
    ] as const;
    baselineBody = {};
    for (const k of keys) {
      if (b[k] === undefined) continue;
      const n = Number(b[k]);
      if (!Number.isFinite(n)) {
        return { ok: false, error: `${k} 须为数字` };
      }
      if (n < BASELINE_COEFF_MIN || n > BASELINE_COEFF_MAX) {
        return {
          ok: false,
          error: `${k} 超出允许范围（${BASELINE_COEFF_MIN}–${BASELINE_COEFF_MAX}）`,
        };
      }
      baselineBody[k] = n;
    }
  }

  const baseline = mergeBaseline(baselineBody as BaselineBody);
  const llmPasswordRaw = o.llmPassword;
  if (llmPasswordRaw !== undefined && typeof llmPasswordRaw !== "string") {
    return { ok: false, error: "llmPassword 须为字符串" };
  }
  const llmPassword = String(llmPasswordRaw ?? "").trim();
  return {
    ok: true,
    value: { text, baseline, llmPassword: llmPassword || undefined },
  };
}
