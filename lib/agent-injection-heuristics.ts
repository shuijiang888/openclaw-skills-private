/**
 * 轻量级用户输入风险启发式（非模型判定），仅用于审计与运营观测。
 */

const PATTERNS: { id: string; re: RegExp }[] = [
  { id: "ignore_prior_instructions", re: /ignore\s+(all\s+|previous\s+|above\s+)?instructions/i },
  { id: "system_prompt_leak", re: /system\s*prompt|developer\s*message/i },
  { id: "roleplay_override", re: /you\s+are\s+now|pretend\s+(you\s+are|to\s+be)/i },
  { id: "delim_injection", re: /---\s*END|BEGIN_UNTRUSTED|IGNORE\s+DELIMITER/i },
  { id: "json_override", re: /output\s+only\s+false|disregard\s+json/i },
  {
    id: "override_zh",
    re: /忽略.{0,16}(上述|前面|以上|刚刚)|不要遵守|覆盖.{0,6}规则/i,
  },
];

export function detectUserPromptInjectionSignals(text: string): string[] {
  const flags: string[] = [];
  const t = text.slice(0, 50_000);
  for (const { id, re } of PATTERNS) {
    if (re.test(t)) flags.push(id);
  }
  return flags;
}
