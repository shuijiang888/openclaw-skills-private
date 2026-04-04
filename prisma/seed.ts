import { PrismaClient } from "@prisma/client";
import {
  buildAiSuggestion,
  discountPercent,
  suggestedPriceFromCosts,
  totalCost,
} from "../lib/calc";
import { requiredRoleForDiscount } from "../lib/approval";
import { defaultBenchmarkPrices } from "../lib/benchmarks";
import { pilotSeedUsers } from "../lib/seed-pilot";
import { appendTimeline } from "../lib/timeline";
import { emptyStageEvidence, stageFromProjectStatus } from "../lib/sales-flow";

const prisma = new PrismaClient();

type Coeffs = {
  material: number;
  labor: number;
  overhead: number;
  period: number;
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
};

async function createScenario(
  customerId: string,
  customerTier: string,
  args: {
    name: string;
    productName: string;
    quantity: number;
    leadDays: number;
    isStandard: boolean;
    isSmallOrder: boolean;
    status: string;
    coeffs: Coeffs;
    counterPrice?: number | null;
    approvedPrice?: number | null;
    forcePendingRole?: string | null;
    note?: string;
  },
) {
  const suggestedPrice = suggestedPriceFromCosts(args.coeffs);
  const cost = totalCost(args.coeffs);
  const ai = buildAiSuggestion({ suggestedPrice, cost, customerTier });

  let pendingRole: string | null = args.forcePendingRole ?? null;
  if (
    args.status === "PENDING_APPROVAL" &&
    args.counterPrice != null &&
    !pendingRole
  ) {
    const d = discountPercent(suggestedPrice, args.counterPrice);
    pendingRole = requiredRoleForDiscount(d).role;
  }

  let timelineJson = appendTimeline(undefined, {
    kind: "seed",
    title: "CRM 插件试点数据初始化",
    detail: args.note ?? args.name,
  });
  timelineJson = appendTimeline(timelineJson, {
    kind: "calc",
    title: "订阅报价测算完成",
    detail: `建议价 ${suggestedPrice}`,
  });
  if (args.status === "PENDING_APPROVAL") {
    timelineJson = appendTimeline(timelineJson, {
      kind: "submit",
      title: "已提交 Deal Desk（试点示例）",
    });
  }
  if (args.status === "APPROVED") {
    timelineJson = appendTimeline(timelineJson, {
      kind: "approve",
      title: "Deal Desk 批复通过（试点示例）",
      detail: `成交价 ${args.approvedPrice ?? args.counterPrice ?? suggestedPrice}`,
    });
  }

  const flowStage = stageFromProjectStatus(args.status);
  const nextStep =
    args.status === "CLOSED_LOST"
      ? "完成丢单复盘并录入关键原因（预算/竞品/关系/交付）。"
      : args.status === "APPROVED"
        ? "安排上线后 14 天复盘，沉淀样板案例。"
        : args.status === "PENDING_APPROVAL"
          ? "准备 Deal Desk 材料并明确让步边界。"
          : "推进下一次客户触达，明确负责人与输出物。";
  const nextStepDueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  await prisma.project.create({
    data: {
      name: args.name,
      productName: args.productName,
      customerId,
      quantity: args.quantity,
      leadDays: args.leadDays,
      isStandard: args.isStandard,
      isSmallOrder: args.isSmallOrder,
      flowStage,
      nextStep,
      nextStepDueAt,
      stageEvidenceJson: JSON.stringify({
        ...emptyStageEvidence(),
        icpConfirmed: args.status !== "DRAFT",
        championMapped:
          args.status === "APPROVED" ||
          args.status === "PENDING_APPROVAL" ||
          args.status === "CLOSED_LOST",
        discoveryNotes:
          args.status === "APPROVED" ||
          args.status === "PENDING_APPROVAL" ||
          args.status === "CLOSED_LOST",
        painValueHypothesis:
          args.status === "APPROVED" ||
          args.status === "PENDING_APPROVAL" ||
          args.status === "CLOSED_LOST",
        solutionDraft:
          args.status === "APPROVED" ||
          args.status === "PENDING_APPROVAL" ||
          args.status === "CLOSED_LOST",
        pocPlan:
          args.status === "APPROVED" ||
          args.status === "PENDING_APPROVAL" ||
          args.status === "CLOSED_LOST",
        proposalDeck:
          args.status === "APPROVED" ||
          args.status === "PENDING_APPROVAL",
        commercialTerms:
          args.status === "APPROVED" || args.status === "PENDING_APPROVAL",
        dealDeskPacket: args.status === "PENDING_APPROVAL",
        lossReasonCaptured: args.status === "CLOSED_LOST",
      }),
      closeLostReason:
        args.status === "CLOSED_LOST" ? "预算冻结并转投竞品替代方案" : "",
      lastStageAt: new Date(),
      status: args.status,
      quote: {
        create: {
          ...args.coeffs,
          suggestedPrice,
          counterPrice: args.counterPrice ?? null,
          approvedPrice: args.approvedPrice ?? null,
          pendingRole,
          benchmarksJson: JSON.stringify(defaultBenchmarkPrices(suggestedPrice)),
          aiSuggestion: ai,
          timelineJson,
        },
      },
    },
  });
}

async function seedBulk(
  customers: { id: string; tier: string }[],
  base: Coeffs,
) {
  const regions = ["华东", "华南", "华北", "西南", "海外"];
  const packages = [
    "增长版",
    "专业版",
    "企业版",
    "销售自动化包",
    "客户成功包",
    "渠道管理包",
  ];
  const statuses = [
    "PRICED",
    "PRICED",
    "APPROVED",
    "DRAFT",
    "PENDING_APPROVAL",
    "CLOSED_LOST",
    "PRICED",
    "APPROVED",
    "PENDING_APPROVAL",
    "PRICED",
    "DRAFT",
  ] as const;

  for (let i = 1; i <= 50; i++) {
    const c = customers[i % customers.length];
    const st = statuses[i % statuses.length];
    const coeffs: Coeffs = {
      ...base,
      material: 2200 + ((i * 137) % 3200),
      labor: 350 + ((i * 47) % 700),
      overhead: 500 + ((i * 61) % 850),
      period: 220 + ((i * 31) % 500),
      coeffCustomer: 1.02 + ((i % 6) * 0.03),
      coeffIndustry: 0.95 + ((i % 5) * 0.03),
      coeffRegion: 0.9 + ((i % 4) * 0.03),
      coeffProduct: 1.0 + ((i % 6) * 0.025),
      coeffLead: 0.94 + ((i % 5) * 0.03),
      coeffQty: 0.86 + ((i % 8) * 0.02),
    };

    const seats = 20 + ((i * 9) % 220);
    const leadDays = 7 + (i % 22);
    const termMonths = 1 + (i % 12);
    const packageName = packages[i % packages.length];
    const name = `${regions[i % regions.length]}·${packageName}订阅 #${String(i).padStart(3, "0")}`;

    let counter: number | null = null;
    let force: string | null = null;
    let approvedPrice: number | null = null;

    if (st === "PENDING_APPROVAL") {
      if (i % 3 === 0) {
        const sp = suggestedPriceFromCosts(coeffs);
        counter = Math.round(sp * (0.85 + (i % 4) * 0.035) * 100) / 100;
      } else {
        force = (["AE", "SALES_MANAGER", "VP"] as const)[i % 3];
      }
    }

    if (st === "APPROVED") {
      const sp = suggestedPriceFromCosts(coeffs);
      approvedPrice = i % 2 === 0 ? Math.round(sp * 0.97 * 100) / 100 : sp;
    }

    await createScenario(c.id, c.tier, {
      name,
      productName: `${seats} 席位 / ${termMonths} 个月 / ${leadDays} 天上线`,
      quantity: seats,
      leadDays,
      isStandard: i % 5 !== 0,
      isSmallOrder: seats < 80,
      status: st,
      coeffs,
      counterPrice: counter,
      approvedPrice,
      forcePendingRole: force,
      note: `CRM 插件规模试点批次 ${i}`,
    });
  }
}

async function seedUsers() {
  const userRows = pilotSeedUsers();
  await prisma.seedPilotUser.deleteMany();
  for (let i = 0; i < userRows.length; i++) {
    const row = userRows[i];
    const stage =
      i % 10 === 0
        ? "INVITED"
        : i % 10 <= 5
          ? "ACTIVATED"
          : i % 10 <= 8
            ? "FEEDBACK"
            : "DONE";
    const invitedAt = new Date(Date.now() - (i % 14) * 24 * 60 * 60 * 1000);
    const activatedAt =
      i % 6 === 0
        ? null
        : new Date(invitedAt.getTime() + (1 + (i % 4)) * 60 * 60 * 1000);
    const firstFeedbackAt =
      i % 5 === 0 || !activatedAt
        ? null
        : new Date(activatedAt.getTime() + (2 + (i % 3)) * 24 * 60 * 60 * 1000);
    const feedbackScore = firstFeedbackAt ? 3 + (i % 3) : null;
    const issueCount = i % 4;
    const todoCount = i % 3;
    const ownerRole = i % 10 < 7 ? "SALES_MANAGER" : "VP";

    await prisma.user.upsert({
      where: { email: row.email },
      create: {
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: "seed-only-login-disabled",
      },
      update: {
        name: row.name,
        role: row.role,
      },
    });

    await prisma.seedPilotUser.upsert({
      where: { email: row.email },
      create: {
        email: row.email,
        name: row.name,
        role: row.role,
        pilotStage: stage,
        invitedAt,
        activatedAt,
        firstFeedbackAt,
        feedbackScore,
        issueCount,
        todoCount,
        ownerRole,
        lastActivityAt: activatedAt ?? invitedAt,
        notes:
          stage === "DONE"
            ? "已完成首轮试点与复盘，建议纳入第二批样板案例。"
            : stage === "FEEDBACK"
              ? "已激活，待补齐业务反馈问卷。"
              : stage === "ACTIVATED"
                ? "完成登录与首单，等待反馈回收。"
                : "已发邀请，等待激活。",
      },
      update: {
        name: row.name,
        role: row.role,
        pilotStage: stage,
        invitedAt,
        activatedAt,
        firstFeedbackAt,
        feedbackScore,
        issueCount,
        todoCount,
        ownerRole,
        lastActivityAt: activatedAt ?? invitedAt,
        notes:
          stage === "DONE"
            ? "已完成首轮试点与复盘，建议纳入第二批样板案例。"
            : stage === "FEEDBACK"
              ? "已激活，待补齐业务反馈问卷。"
              : stage === "ACTIVATED"
                ? "完成登录与首单，等待反馈回收。"
                : "已发邀请，等待激活。",
      },
    });
  }
}

async function main() {
  console.warn(
    "[profit-web] db:seed 将清空客户/项目/报价/罗盘项等。真实库请勿执行；仅补配置请用: npm run db:seed:reference",
  );
  await prisma.agentAuditLog.deleteMany();
  await prisma.compassAlertRule.deleteMany();
  await prisma.compassQuadrantThreshold.deleteMany();
  await prisma.compassItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();

  const customerRows = [
    { name: "星云零售集团", tier: "STRATEGIC", arDays: 45 },
    { name: "海纳医药营销", tier: "KEY", arDays: 38 },
    { name: "远航工业服务", tier: "KEY", arDays: 42 },
    { name: "华迈新能源渠道", tier: "KEY", arDays: 35 },
    { name: "新域科技销售", tier: "NORMAL", arDays: 30 },
    { name: "安诺数字制造", tier: "NORMAL", arDays: 33 },
    { name: "博晟教育服务", tier: "KEY", arDays: 36 },
    { name: "锦程物流网络", tier: "NORMAL", arDays: 40 },
    { name: "数联金融顾问", tier: "KEY", arDays: 32 },
    { name: "启明医疗器械", tier: "NORMAL", arDays: 34 },
    { name: "蓝鲸消费科技", tier: "STRATEGIC", arDays: 50 },
    { name: "天域汽车服务", tier: "KEY", arDays: 41 },
    { name: "卓越家居渠道", tier: "KEY", arDays: 37 },
    { name: "联拓供应链", tier: "NORMAL", arDays: 39 },
    { name: "华岭通讯运营", tier: "KEY", arDays: 35 },
    { name: "优迈文旅集团", tier: "KEY", arDays: 43 },
    { name: "朗星跨境电商", tier: "NORMAL", arDays: 34 },
    { name: "明川企业服务", tier: "NORMAL", arDays: 31 },
  ];

  for (const c of customerRows) {
    await prisma.customer.create({ data: c });
  }

  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  const cid = (name: string) => customers.find((c) => c.name === name)!.id;

  const base: Coeffs = {
    material: 2600,
    labor: 480,
    overhead: 720,
    period: 360,
    coeffCustomer: 1.1,
    coeffIndustry: 1.02,
    coeffRegion: 0.98,
    coeffProduct: 1.06,
    coeffLead: 1.0,
    coeffQty: 0.94,
  };

  await createScenario(cid("蓝鲸消费科技"), "STRATEGIC", {
    name: "集团 CRM 企业版扩容",
    productName: "300 席位 / 12 个月 / 20 天上线",
    quantity: 300,
    leadDays: 20,
    isStandard: false,
    isSmallOrder: false,
    status: "PENDING_APPROVAL",
    coeffs: {
      ...base,
      material: 4200,
      labor: 650,
      overhead: 980,
      period: 560,
      coeffCustomer: 1.2,
      coeffIndustry: 1.08,
      coeffProduct: 1.18,
      coeffLead: 1.07,
      coeffQty: 0.9,
    },
    counterPrice: null,
    forcePendingRole: "SALES_MANAGER",
    note: "高客户价值，需销售经理牵头 Deal Desk。",
  });

  await createScenario(cid("新域科技销售"), "NORMAL", {
    name: "标准增长版月付试用",
    productName: "40 席位 / 1 个月 / 7 天上线",
    quantity: 40,
    leadDays: 7,
    isStandard: true,
    isSmallOrder: true,
    status: "PRICED",
    coeffs: { ...base, coeffQty: 0.96, coeffLead: 0.97 },
    note: "自动通道候选：标准包 + 小单 + 低折扣。",
  });

  await createScenario(cid("海纳医药营销"), "KEY", {
    name: "医药渠道管理包首年签约",
    productName: "160 席位 / 12 个月 / 18 天上线",
    quantity: 160,
    leadDays: 18,
    isStandard: true,
    isSmallOrder: false,
    status: "PENDING_APPROVAL",
    coeffs: { ...base, material: 3500, coeffCustomer: 1.16, coeffProduct: 1.1 },
    counterPrice: null,
    forcePendingRole: "AE",
    note: "AE 档 Deal Desk 待办。",
  });

  const coeffsComplex = {
    ...base,
    material: 4700,
    labor: 760,
    overhead: 1120,
    period: 620,
    coeffCustomer: 1.18,
    coeffIndustry: 1.1,
    coeffProduct: 1.22,
    coeffLead: 1.1,
  };
  const sugComplex = suggestedPriceFromCosts(coeffsComplex);
  await createScenario(cid("远航工业服务"), "KEY", {
    name: "多组织协同定制包",
    productName: "220 席位 / 24 个月 / 25 天上线",
    quantity: 220,
    leadDays: 25,
    isStandard: false,
    isSmallOrder: false,
    status: "PENDING_APPROVAL",
    coeffs: coeffsComplex,
    counterPrice: Math.round(sugComplex * 0.8 * 100) / 100,
    note: "深度折扣，通常需 VP 特批。",
  });

  await createScenario(cid("卓越家居渠道"), "KEY", {
    name: "渠道管理包年度续费",
    productName: "120 席位 / 12 个月 / 10 天上线",
    quantity: 120,
    leadDays: 10,
    isStandard: true,
    isSmallOrder: false,
    status: "APPROVED",
    coeffs: { ...base, material: 2900, labor: 420, overhead: 680, period: 300 },
    note: "已核准：按建议价成交。",
  });
  const renew = await prisma.project.findFirst({
    where: { name: "渠道管理包年度续费" },
    include: { quote: true },
  });
  if (renew?.quote) {
    await prisma.quote.update({
      where: { id: renew.quote.id },
      data: { approvedPrice: renew.quote.suggestedPrice },
    });
  }

  await createScenario(cid("博晟教育服务"), "KEY", {
    name: "教育行业销售自动化试点",
    productName: "90 席位 / 6 个月 / 14 天上线",
    quantity: 90,
    leadDays: 14,
    isStandard: false,
    isSmallOrder: false,
    status: "DRAFT",
    coeffs: { ...base, material: 3100, coeffProduct: 1.14 },
    note: "草稿：待售前补齐 POC 方案后再提交。",
  });

  await createScenario(cid("星云零售集团"), "STRATEGIC", {
    name: "零售全域 CRM 升级",
    productName: "420 席位 / 24 个月 / 28 天上线",
    quantity: 420,
    leadDays: 28,
    isStandard: false,
    isSmallOrder: false,
    status: "PENDING_APPROVAL",
    coeffs: {
      ...base,
      material: 5600,
      labor: 840,
      overhead: 1300,
      period: 760,
      coeffCustomer: 1.24,
      coeffIndustry: 1.13,
      coeffProduct: 1.2,
      coeffLead: 1.08,
      coeffQty: 0.89,
    },
    counterPrice: null,
    forcePendingRole: "SALES_MANAGER",
    note: "战略客户：强制 Deal Desk 协同。",
  });

  await createScenario(cid("朗星跨境电商"), "NORMAL", {
    name: "跨境销售管理标准版",
    productName: "60 席位 / 12 个月 / 9 天上线",
    quantity: 60,
    leadDays: 9,
    isStandard: true,
    isSmallOrder: true,
    status: "APPROVED",
    coeffs: base,
    note: "已成交试点示例。",
  });
  const cross = await prisma.project.findFirst({
    where: { name: "跨境销售管理标准版" },
    include: { quote: true },
  });
  if (cross?.quote) {
    const sp = cross.quote.suggestedPrice;
    const deal = Math.round(sp * 0.96 * 100) / 100;
    await prisma.quote.update({
      where: { id: cross.quote.id },
      data: { counterPrice: deal, approvedPrice: deal },
    });
  }

  await createScenario(cid("数联金融顾问"), "KEY", {
    name: "金融行业客户成功包",
    productName: "110 席位 / 12 个月 / 16 天上线",
    quantity: 110,
    leadDays: 16,
    isStandard: true,
    isSmallOrder: false,
    status: "PRICED",
    coeffs: { ...base, material: 3400, coeffIndustry: 1.12 },
    note: "待议价：可填客户还价后提交 Deal Desk。",
  });

  await createScenario(cid("明川企业服务"), "NORMAL", {
    name: "SMB 线索管理快速包",
    productName: "35 席位 / 3 个月 / 8 天上线",
    quantity: 35,
    leadDays: 8,
    isStandard: true,
    isSmallOrder: true,
    status: "PENDING_APPROVAL",
    coeffs: { ...base, material: 2400, labor: 360, overhead: 520, period: 230 },
    counterPrice: null,
    forcePendingRole: "VP",
    note: "VP 档待办样例。",
  });

  await seedBulk(
    customers.map((c) => ({ id: c.id, tier: c.tier })),
    base,
  );

  const compass = [
    {
      name: "集团 CRM 企业版扩容",
      customerName: "蓝鲸消费科技",
      grossMargin: 82,
      growth: 76,
      quadrant: "STAR",
      strategy: "高价值高概率：优先投入售前与客户成功资源",
      priority: "最高",
      sortOrder: 1,
    },
    {
      name: "医药渠道管理包首年签约",
      customerName: "海纳医药营销",
      grossMargin: 74,
      growth: 58,
      quadrant: "CASH_COW",
      strategy: "高价值低概率：强化高层共识与风险兜底条款",
      priority: "高",
      sortOrder: 2,
    },
    {
      name: "标准增长版月付试用",
      customerName: "新域科技销售",
      grossMargin: 44,
      growth: 72,
      quadrant: "QUESTION",
      strategy: "低价值高概率：标准化推进，控制投入强度",
      priority: "中",
      sortOrder: 3,
    },
    {
      name: "跨境销售管理标准版",
      customerName: "朗星跨境电商",
      grossMargin: 38,
      growth: 42,
      quadrant: "DOG",
      strategy: "低价值低概率：限制折扣，优先高潜客户",
      priority: "低",
      sortOrder: 4,
    },
    {
      name: "零售全域 CRM 升级",
      customerName: "星云零售集团",
      grossMargin: 86,
      growth: 63,
      quadrant: "STAR",
      strategy: "战略客户：Deal Desk 全程跟进并锁定多阶段扩容",
      priority: "最高",
      sortOrder: 5,
    },
    {
      name: "多组织协同定制包",
      customerName: "远航工业服务",
      grossMargin: 68,
      growth: 39,
      quadrant: "CASH_COW",
      strategy: "高价值低概率：收敛范围后再给折扣",
      priority: "高",
      sortOrder: 6,
    },
    {
      name: "教育行业销售自动化试点",
      customerName: "博晟教育服务",
      grossMargin: 49,
      growth: 66,
      quadrant: "QUESTION",
      strategy: "通过 POC 提升赢单概率，避免超配售前资源",
      priority: "中",
      sortOrder: 7,
    },
    {
      name: "金融行业客户成功包",
      customerName: "数联金融顾问",
      grossMargin: 57,
      growth: 48,
      quadrant: "DOG",
      strategy: "先做关键异议突破，再决定是否延展投入",
      priority: "中低",
      sortOrder: 8,
    },
  ];

  for (const row of compass) {
    await prisma.compassItem.create({ data: row });
  }

  const compassAlertRules = [
    { conditionLabel: "客户价值 <50 且 赢单概率 <50", actionLabel: "限制投入，聚焦高潜商机", sortOrder: 0 },
    { conditionLabel: "客户价值 >=70 但 赢单概率 <55", actionLabel: "Deal Desk 升级评审并安排高层共访", sortOrder: 1 },
    { conditionLabel: "赢单概率 >=70 但客户价值 <55", actionLabel: "采用标准订阅包快速成交，控制折扣", sortOrder: 2 },
    { conditionLabel: "折扣 >20%", actionLabel: "仅 VP 可批，必须写明回收路径", sortOrder: 3 },
    { conditionLabel: "预计上线周期 <10 天", actionLabel: "售前确认交付边界并更新风险说明", sortOrder: 4 },
    { conditionLabel: "战略客户且非标准包", actionLabel: "强制销售教练协同并保留完整时间线", sortOrder: 5 },
  ];
  for (const row of compassAlertRules) {
    await prisma.compassAlertRule.create({ data: row });
  }

  await prisma.compassQuadrantThreshold.create({
    data: {
      id: "default",
      marginHighPct: 60,
      growthHighPct: 60,
    },
  });

  await seedUsers();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
