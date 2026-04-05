import { prisma } from "@/lib/prisma";
import { getZtSystemConfigSafe } from "@/lib/zt-system-config";

type Flags = {
  bountyStateMachineEnabled: boolean;
  redemptionReviewEnabled: boolean;
  mobileCompactCardsEnabled: boolean;
};

const DEFAULT_FLAGS: Flags = {
  bountyStateMachineEnabled: true,
  redemptionReviewEnabled: true,
  mobileCompactCardsEnabled: true,
};

function safeParseFeaturesJson(raw: string): Partial<Flags> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      bountyStateMachineEnabled:
        typeof parsed.bountyStateMachineEnabled === "boolean"
          ? parsed.bountyStateMachineEnabled
          : undefined,
      redemptionReviewEnabled:
        typeof parsed.redemptionReviewEnabled === "boolean"
          ? parsed.redemptionReviewEnabled
          : undefined,
      mobileCompactCardsEnabled:
        typeof parsed.mobileCompactCardsEnabled === "boolean"
          ? parsed.mobileCompactCardsEnabled
          : undefined,
    };
  } catch {
    return {};
  }
}

export async function getZtFeatureFlags(): Promise<Flags> {
  const cfg = await getZtSystemConfigSafe();
  const parsed = safeParseFeaturesJson(cfg.featuresJson);
  return {
    bountyStateMachineEnabled:
      parsed.bountyStateMachineEnabled ?? DEFAULT_FLAGS.bountyStateMachineEnabled,
    redemptionReviewEnabled:
      parsed.redemptionReviewEnabled ?? DEFAULT_FLAGS.redemptionReviewEnabled,
    mobileCompactCardsEnabled:
      parsed.mobileCompactCardsEnabled ?? DEFAULT_FLAGS.mobileCompactCardsEnabled,
  };
}

export async function setZtFeatureFlagsPatch(patch: Partial<Flags>) {
  const cfg = await getZtSystemConfigSafe();
  const current = safeParseFeaturesJson(cfg.featuresJson);
  const merged: Flags = {
    bountyStateMachineEnabled:
      patch.bountyStateMachineEnabled ??
      current.bountyStateMachineEnabled ??
      DEFAULT_FLAGS.bountyStateMachineEnabled,
    redemptionReviewEnabled:
      patch.redemptionReviewEnabled ??
      current.redemptionReviewEnabled ??
      DEFAULT_FLAGS.redemptionReviewEnabled,
    mobileCompactCardsEnabled:
      patch.mobileCompactCardsEnabled ??
      current.mobileCompactCardsEnabled ??
      DEFAULT_FLAGS.mobileCompactCardsEnabled,
  };
  await prisma.ztSystemConfig.upsert({
    where: { id: "default" },
    update: { featuresJson: JSON.stringify(merged) },
    create: { id: "default", featuresJson: JSON.stringify(merged) },
  });
  return merged;
}
