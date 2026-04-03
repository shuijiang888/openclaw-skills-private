import {
  normalizeModelCoeffPatch,
  type CoeffPatch,
  type ParseQuoteLanguageResult,
} from "@/lib/quote-natural-language";

const MAX_SUMMARY_ITEMS = 4;
const MAX_HINT_ITEMS = 12;
const MAX_LINE_CHARS = 200;

function stripControlAndCollapse(s: string): string {
  return s
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLine(s: string): string {
  return stripControlAndCollapse(s).slice(0, MAX_LINE_CHARS);
}

/**
 * 将大模型 JSON 中的叙事字段裁剪到合约范围，并保证 patch 经同一套系数规范化。
 */
export function sanitizeQuoteParseLlmOutput(
  obj: Record<string, unknown>,
  baseline: Record<string, number>,
): ParseQuoteLanguageResult & { outputTruncated: boolean; schemaRejected: boolean } {
  let outputTruncated = false;
  let schemaRejected = false;

  const rawSummary = Array.isArray(obj.summary) ? obj.summary : [];
  const rawHints = Array.isArray(obj.hints) ? obj.hints : [];
  if (!Array.isArray(obj.summary)) schemaRejected = true;
  if (!Array.isArray(obj.hints)) schemaRejected = true;

  if (rawSummary.length > MAX_SUMMARY_ITEMS) outputTruncated = true;
  if (rawHints.length > MAX_HINT_ITEMS) outputTruncated = true;

  const summary = rawSummary
    .slice(0, MAX_SUMMARY_ITEMS)
    .map((x) => cleanLine(String(x)))
    .filter(Boolean);

  const hints = rawHints
    .slice(0, MAX_HINT_ITEMS)
    .map((x) => cleanLine(String(x)))
    .filter(Boolean);

  const patch: CoeffPatch = normalizeModelCoeffPatch(obj.patch, baseline);

  return { summary, hints, patch, outputTruncated, schemaRejected };
}
