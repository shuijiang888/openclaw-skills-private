import { detectUserPromptInjectionSignals } from "@/lib/agent-injection-heuristics";

export type ModelTier = "cost" | "advanced";

type RouteDecision = {
  tier: ModelTier;
  reason: string;
  enableOllama: boolean;
};

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function envNum(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Auto model routing:
 * - default: cost tier (rules parser)
 * - advanced tier when task complexity/risk is high
 */
export function decideQuoteParseModelTier(input: {
  text: string;
  actorRole: string;
}): RouteDecision {
  const autoRouting = envBool("PROFIT_MODEL_AUTO_ROUTING", true);
  const preferAdvanced = envBool("PROFIT_MODEL_FORCE_ADVANCED", false);
  const advancedRoleSet = new Set(
    (process.env.PROFIT_MODEL_ADVANCED_ROLES ??
      "SALES_VP,GM,ADMIN")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );

  if (!autoRouting) {
    if (preferAdvanced) {
      return {
        tier: "advanced",
        reason: "auto_routing_disabled_force_advanced",
        enableOllama: true,
      };
    }
    return {
      tier: "cost",
      reason: "auto_routing_disabled_default_cost",
      enableOllama: false,
    };
  }

  if (preferAdvanced) {
    return {
      tier: "advanced",
      reason: "force_advanced",
      enableOllama: true,
    };
  }

  const text = input.text ?? "";
  const role = (input.actorRole ?? "").toUpperCase();
  const complexityChars = envNum("PROFIT_MODEL_COMPLEXITY_CHARS", 600);
  const injectSignals = detectUserPromptInjectionSignals(text);

  const hasStrategicKeywords =
    /战略|高管|CIO|CEO|CTO|融资|并购|政策|招投标|竞品|价格战|合规|风控/i.test(
      text,
    );
  const hasUrgentKeywords = /加急|必须|立即|窗口期|高优先级|P0|P1/i.test(text);
  const hasLargePayload = text.length >= complexityChars;
  const roleNeedsAdvanced = advancedRoleSet.has(role);

  const needAdvanced =
    roleNeedsAdvanced ||
    hasStrategicKeywords ||
    hasUrgentKeywords ||
    hasLargePayload ||
    injectSignals.length > 0;

  if (needAdvanced) {
    return {
      tier: "advanced",
      reason: [
        roleNeedsAdvanced ? "role" : "",
        hasStrategicKeywords ? "strategic_keywords" : "",
        hasUrgentKeywords ? "urgent_keywords" : "",
        hasLargePayload ? "large_payload" : "",
        injectSignals.length > 0 ? "injection_signals" : "",
      ]
        .filter(Boolean)
        .join(","),
      enableOllama: true,
    };
  }

  return {
    tier: "cost",
    reason: "default_cost_path",
    enableOllama: false,
  };
}
