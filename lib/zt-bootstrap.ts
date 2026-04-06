import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPointsAndSyncRank } from "@/lib/zt-points";

const ROLE_BASE_POINTS: Record<string, number> = {
  SALES_MANAGER: 120,
  SALES_DIRECTOR: 180,
  SALES_VP: 260,
  GM: 320,
  ADMIN: 220,
};

const DEFAULT_INTEL_DEFINITIONS = [
  {
    code: "COMPETITOR_PRICE",
    name: "竞品价格异动",
    category: "MARKET",
    description: "采集竞品折扣、促销与报价异常，辅助任务悬赏与行动卡策略。",
    requiredFields: ["title", "content", "region", "competitor", "evidence"],
    allowedSignalTypes: ["tactical", "strategic"],
    allowedFormats: ["text", "image", "link"],
    taskTemplateHint: "请附竞品名称、报价变化、来源链接/截图与影响客户。",
    defaultRewardPoints: 8,
    sortOrder: 10,
  },
  {
    code: "DECISION_CHANGE",
    name: "决策链异动",
    category: "CUSTOMER",
    description: "识别关键岗位变动、预算窗口变化、组织重组等决策链情报。",
    requiredFields: ["title", "content", "region", "customerName", "nextAction"],
    allowedSignalTypes: ["strategic", "forecast"],
    allowedFormats: ["text", "voice", "link"],
    taskTemplateHint: "重点标注岗位变动时间、影响范围和建议下一步动作。",
    defaultRewardPoints: 10,
    sortOrder: 20,
  },
  {
    code: "DELIVERY_RISK",
    name: "交付风险预警",
    category: "DELIVERY",
    description: "跟踪交付延期、质量事件、核心器件风险等战情热点。",
    requiredFields: ["title", "content", "region", "impactLevel", "evidence"],
    allowedSignalTypes: ["risk", "tactical"],
    allowedFormats: ["text", "image", "video", "link"],
    taskTemplateHint: "需明确风险等级、影响客户和建议缓解动作。",
    defaultRewardPoints: 12,
    sortOrder: 30,
  },
] as const;

export async function ensureZt007Seed(prisma: PrismaClient) {
  await prisma.ztSystemConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      llmEnabled: true,
      llmProvider: "minimax",
      llmModel: "MiniMax-M2.7",
      llmInteractiveEnabled: true,
      llmPasswordRequired: true,
      llmAutomationBypassPassword: true,
      mobileExperienceEnabled: true,
      multiEndpointEnabled: true,
    },
  });

  for (const [actorRole, points] of Object.entries(ROLE_BASE_POINTS)) {
    await prisma.ztPointWallet.upsert({
      where: { actorRole },
      update: {},
      create: {
        actorRole,
        points,
        lifetimePoints: points,
        rank: "战士",
        rankLevel: 1,
      },
    });
  }

  for (const def of DEFAULT_INTEL_DEFINITIONS) {
    await prisma.ztIntelDefinition.upsert({
      where: { code: def.code },
      update: {
        name: def.name,
        category: def.category,
        description: def.description,
        requiredFieldsJson: JSON.stringify(def.requiredFields),
        allowedSignalTypesJson: JSON.stringify(def.allowedSignalTypes),
        allowedFormatsJson: JSON.stringify(def.allowedFormats),
        taskTemplateHint: def.taskTemplateHint,
        defaultRewardPoints: def.defaultRewardPoints,
        isActive: true,
        sortOrder: def.sortOrder,
      },
      create: {
        code: def.code,
        name: def.name,
        category: def.category,
        description: def.description,
        requiredFieldsJson: JSON.stringify(def.requiredFields),
        allowedSignalTypesJson: JSON.stringify(def.allowedSignalTypes),
        allowedFormatsJson: JSON.stringify(def.allowedFormats),
        taskTemplateHint: def.taskTemplateHint,
        defaultRewardPoints: def.defaultRewardPoints,
        isActive: true,
        sortOrder: def.sortOrder,
      },
    });
  }
  const intelDefs = await prisma.ztIntelDefinition.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
  });
  const intelDefIdByCode = new Map(intelDefs.map((x) => [x.code, x.id]));

  const roleWallets = await prisma.ztPointWallet.findMany({
    where: { userId: null, actorRole: { not: null } },
  });
  for (const row of roleWallets) {
    await applyPointsAndSyncRank(prisma, {
      actorRole: row.actorRole,
      pointsDelta: 0,
      action: "BOOTSTRAP_SYNC_RANK",
      reason: "bootstrap sync rank",
    });
  }

  if ((await prisma.ztActionCard.count()) === 0) {
    await prisma.ztActionCard.createMany({
      data: [
        {
          title: "P0 · CIO changed at Alpha Medical",
          reason: "Role change + budget cycle + trusted source",
          suggestion: "Contact relationship chain within 24h with script A3",
          priority: "P0",
          assignedRole: "SALES_DIRECTOR",
          rewardPoints: 20,
        },
        {
          title: "P1 · ERP hiring spike at SmartFab",
          reason: "12 implementation hiring signals detected",
          suggestion: "Schedule discovery questions in next customer touchpoint",
          priority: "P1",
          assignedRole: "SALES_MANAGER",
          rewardPoints: 15,
        },
        {
          title: "P1 · Regional subsidy policy update",
          reason: "Policy fit for at least 8 target accounts",
          suggestion: "Push policy brief and create two follow-up calls this week",
          priority: "P1",
          assignedRole: "SALES_VP",
          rewardPoints: 10,
        },
      ],
    });
  }

  if ((await prisma.ztBountyTask.count()) < 5) {
    await prisma.ztBountyTask.createMany({
      data: [
        {
          intelDefId: intelDefIdByCode.get("DECISION_CHANGE") ?? null,
          title: "华南制造业 CIO 人事变动线索征集",
          description: "聚焦广州/深圳制造企业，提交来源链接、截图与变动时间。",
          taskType: "strategic",
          rewardPoints: 80,
          status: "OPEN",
          deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        },
        {
          intelDefId: intelDefIdByCode.get("COMPETITOR_PRICE") ?? null,
          title: "华东竞品降价策略监测",
          description: "收集上海/苏州/杭州重点客户相关竞品折扣、促销与投标动作。",
          taskType: "tactical",
          rewardPoints: 60,
          status: "OPEN",
          deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        },
        {
          intelDefId: intelDefIdByCode.get("DELIVERY_RISK") ?? null,
          title: "新能源车厂供应链风险情报",
          description: "追踪交付延期、核心器件短缺、质量事故等风险点并标注影响客户。",
          taskType: "risk",
          rewardPoints: 70,
          status: "OPEN",
          deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
        },
        {
          intelDefId: intelDefIdByCode.get("DECISION_CHANGE") ?? null,
          title: "医疗行业标杆案例话术沉淀",
          description: "提交可复用赢单话术模板，需包含场景、突破点、提问脚本。",
          taskType: "knowledge",
          rewardPoints: 40,
          status: "OPEN",
          deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        },
        {
          intelDefId: intelDefIdByCode.get("DECISION_CHANGE") ?? null,
          title: "西南区域重点客户预算窗口预判",
          description: "围绕成都/重庆目标客户，提交预算释放周期与决策链线索。",
          taskType: "forecast",
          rewardPoints: 55,
          status: "OPEN",
          deadlineAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6),
        },
      ],
    });
  }

  if ((await prisma.ztSignal.count()) === 0) {
    await prisma.ztSignal.createMany({
      data: [
        {
          title: "CIO changed at Alpha Medical",
          content: "New CIO joined from top cloud vendor.",
          signalType: "strategic",
          region: "Shenzhen",
          sourceFormat: "text",
          actorRole: "SALES_DIRECTOR",
          points: 8,
          status: "NEW",
        },
        {
          title: "ERP hiring growth at SmartFab",
          content: "12 ERP implementation openings posted this week.",
          signalType: "tactical",
          region: "Guangzhou",
          sourceFormat: "link",
          actorRole: "SALES_MANAGER",
          points: 6,
          status: "NEW",
        },
      ],
    });
  }

  return {
    intelDefinitions: await prisma.ztIntelDefinition.count(),
    wallets: await prisma.ztPointWallet.count(),
    actionCards: await prisma.ztActionCard.count(),
    tasks: await prisma.ztBountyTask.count(),
    signals: await prisma.ztSignal.count(),
    rankLogs: await prisma.ztRankChangeLog.count(),
  };
}

export async function ensureZtBootstrap() {
  return ensureZt007Seed(prisma);
}

export async function ztBootstrap() {
  return ensureZt007Seed(prisma);
}
