import { prisma } from "@/lib/prisma";

export type ZtSystemConfigShape = {
  id: string;
  llmEnabled: boolean;
  llmProvider: string;
  llmModel: string;
  llmInteractiveEnabled: boolean;
  llmPasswordRequired: boolean;
  llmAutomationBypassPassword: boolean;
  mobileExperienceEnabled: boolean;
  multiEndpointEnabled: boolean;
  featuresJson: string;
  updatedByUserId: string | null;
};

const DEFAULT_CONFIG: Omit<ZtSystemConfigShape, "updatedByUserId"> = {
  id: "default",
  llmEnabled: true,
  llmProvider: "minimax",
  llmModel: "MiniMax-M2.7",
  llmInteractiveEnabled: true,
  llmPasswordRequired: true,
  llmAutomationBypassPassword: true,
  mobileExperienceEnabled: true,
  multiEndpointEnabled: true,
  featuresJson: "{}",
};

function fallbackConfig(): ZtSystemConfigShape {
  return {
    ...DEFAULT_CONFIG,
    updatedByUserId: null,
  };
}

/**
 * 安全读取系统配置：当数据库尚未完成迁移时回落默认值，保证线上可用性。
 */
export async function getZtSystemConfigSafe(): Promise<ZtSystemConfigShape> {
  try {
    const row = await prisma.ztSystemConfig.upsert({
      where: { id: DEFAULT_CONFIG.id },
      update: {},
      create: DEFAULT_CONFIG,
    });
    return row;
  } catch {
    return fallbackConfig();
  }
}

export async function getZtSystemConfig() {
  return getZtSystemConfigSafe();
}

export async function ensureZtSystemConfig() {
  return getZtSystemConfigSafe();
}

export function sanitizeZtSystemConfigPatch(
  body: Record<string, unknown>,
): Partial<ZtSystemConfigShape> {
  const patch: Partial<ZtSystemConfigShape> = {};
  if (typeof body.llmEnabled === "boolean") patch.llmEnabled = body.llmEnabled;
  if (typeof body.llmProvider === "string")
    patch.llmProvider = body.llmProvider.trim().slice(0, 32) || "minimax";
  if (typeof body.llmModel === "string")
    patch.llmModel = body.llmModel.trim().slice(0, 64) || "MiniMax-M2.7";
  if (typeof body.llmInteractiveEnabled === "boolean") {
    patch.llmInteractiveEnabled = body.llmInteractiveEnabled;
  }
  if (typeof body.llmPasswordRequired === "boolean") {
    patch.llmPasswordRequired = body.llmPasswordRequired;
  }
  if (typeof body.llmAutomationBypassPassword === "boolean") {
    patch.llmAutomationBypassPassword = body.llmAutomationBypassPassword;
  }
  if (typeof body.mobileExperienceEnabled === "boolean") {
    patch.mobileExperienceEnabled = body.mobileExperienceEnabled;
  }
  if (typeof body.multiEndpointEnabled === "boolean") {
    patch.multiEndpointEnabled = body.multiEndpointEnabled;
  }
  if (typeof body.featuresJson === "string") {
    const raw = body.featuresJson.trim();
    patch.featuresJson = raw.startsWith("{") ? raw : "{}";
  }
  return patch;
}

