import { PrismaClient } from "@prisma/client";
import {
  suggestedPriceFromCosts,
  totalCost,
  buildAiSuggestion,
  discountPercent,
} from "../lib/calc";
import { requiredRoleForDiscount } from "../lib/approval";
import { appendTimeline } from "../lib/timeline";
import { defaultBenchmarkPrices } from "../lib/benchmarks";

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
  const ai = buildAiSuggestion({
    suggestedPrice,
    cost,
    customerTier,
  });

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
    title: "演示数据初始化",
    detail: args.note ?? args.name,
  });
  timelineJson = appendTimeline(timelineJson, {
    kind: "calc",
    title: "成本与系数测算完成",
    detail: `建议价 ${suggestedPrice}`,
  });
  if (args.status === "PENDING_APPROVAL") {
    timelineJson = appendTimeline(timelineJson, {
      kind: "submit",
      title: "已提交审批（演示）",
    });
  }
  if (args.status === "APPROVED") {
    timelineJson = appendTimeline(timelineJson, {
      kind: "approve",
      title: "审批通过（演示）",
      detail: `成交价 ${args.approvedPrice ?? args.counterPrice ?? suggestedPrice}`,
    });
  }

  await prisma.project.create({
    data: {
      name: args.name,
      productName: args.productName,
      customerId,
      quantity: args.quantity,
      leadDays: args.leadDays,
      isStandard: args.isStandard,
      isSmallOrder: args.isSmallOrder,
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
  const lines = ["HDI", "FPC", "刚挠", "金属基", "高频", "MiniLED", "封装基板"];
  const statuses = [
    "PRICED",
    "PRICED",
    "APPROVED",
    "DRAFT",
    "PENDING_APPROVAL",
    "PRICED",
    "APPROVED",
    "PENDING_APPROVAL",
    "PRICED",
    "DRAFT",
  ] as const;

  for (let i = 1; i <= 56; i++) {
    const c = customers[i % customers.length];
    const st = statuses[i % statuses.length];
    const m = 2600 + ((i * 173) % 10400);
    const coeffs: Coeffs = {
      ...base,
      material: m,
      labor: 350 + ((i * 67) % 1300),
      overhead: 550 + ((i * 71) % 2100),
      period: 180 + ((i * 41) % 950),
      coeffCustomer: 1.05 + ((i % 6) * 0.025),
      coeffIndustry: 1.04 + ((i % 5) * 0.02),
      coeffRegion: 0.92 + ((i % 4) * 0.02),
      coeffProduct: 1.02 + ((i % 7) * 0.015),
      coeffLead: 1.03 + ((i % 5) * 0.012),
      coeffQty: 0.86 + ((i % 9) * 0.014),
    };
    const qty = 400 + ((i * 127) % 12000);
    const name = `${regions[i % regions.length]}·${lines[i % lines.length]}批量 #${String(i).padStart(3, "0")}`;

    let counter: number | null = null;
    let force: string | null = null;
    let approvedPrice: number | null = null;

    if (st === "PENDING_APPROVAL") {
      if (i % 4 === 0) {
        const sp = suggestedPriceFromCosts(coeffs);
        counter = Math.round(sp * (0.86 + (i % 4) * 0.03) * 100) / 100;
      } else {
        force = (["SALES_MANAGER", "SALES_DIRECTOR", "SALES_VP"] as const)[
          i % 3
        ];
      }
    }
    if (st === "APPROVED") {
      const sp = suggestedPriceFromCosts(coeffs);
      approvedPrice = i % 2 === 0 ? Math.round(sp * 0.97 * 100) / 100 : sp;
    }

    await createScenario(c.id, c.tier, {
      name,
      productName: `${qty} PCS / ${10 + (i % 35)} 天`,
      quantity: qty,
      leadDays: 10 + (i % 35),
      isStandard: i % 5 !== 0,
      isSmallOrder: i % 4 === 0,
      status: st,
      coeffs,
      counterPrice: counter,
      approvedPrice,
      forcePendingRole: force,
      note: `规模演示批次 ${i}`,
    });
  }
}

async function main() {
  await prisma.agentAuditLog.deleteMany();
  await prisma.compassAlertRule.deleteMany();
  await prisma.compassQuadrantThreshold.deleteMany();
  await prisma.compassItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();

  const customerRows = [
    { name: "华信通信技术", tier: "STRATEGIC", arDays: 75 },
    { name: "云栈数据科技", tier: "KEY", arDays: 45 },
    { name: "XX 通信科技", tier: "KEY", arDays: 45 },
    { name: "长风汽车电子", tier: "KEY", arDays: 60 },
    { name: "捷联工控", tier: "NORMAL", arDays: 30 },
    { name: "晨曦消费电子", tier: "NORMAL", arDays: 35 },
    { name: "海港医疗电子", tier: "KEY", arDays: 40 },
    { name: "九州能源装备", tier: "NORMAL", arDays: 55 },
    { name: "星河光电科技", tier: "KEY", arDays: 42 },
    { name: "超导新材股份", tier: "NORMAL", arDays: 38 },
    { name: "领航防务系统", tier: "STRATEGIC", arDays: 90 },
    { name: "维科医疗器械", tier: "KEY", arDays: 50 },
    { name: "蓝图机器人", tier: "KEY", arDays: 36 },
    { name: "恒润电力电子", tier: "NORMAL", arDays: 48 },
    { name: "晶都半导体", tier: "KEY", arDays: 44 },
    { name: "驭速汽车零部件", tier: "KEY", arDays: 58 },
    { name: "海睿物联网", tier: "NORMAL", arDays: 33 },
    { name: "磐石精密制造", tier: "NORMAL", arDays: 40 },
  ];

  for (const c of customerRows) {
    await prisma.customer.create({ data: c });
  }

  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  const cid = (name: string) => customers.find((c) => c.name === name)!.id;

  const base: Coeffs = {
    material: 5200,
    labor: 900,
    overhead: 1400,
    period: 500,
    coeffCustomer: 1.12,
    coeffIndustry: 1.08,
    coeffRegion: 1,
    coeffProduct: 1.06,
    coeffLead: 1.05,
    coeffQty: 0.96,
  };

  await createScenario(cid("XX 通信科技"), "KEY", {
    name: "5G 基站 HDI 板",
    productName: "10K PCS / 15 天交期",
    quantity: 10000,
    leadDays: 15,
    isStandard: false,
    isSmallOrder: false,
    status: "PRICED",
    coeffs: {
      ...base,
      material: 8500,
      labor: 1200,
      overhead: 2300,
      period: 1000,
      coeffCustomer: 1.15,
      coeffIndustry: 1.1,
      coeffRegion: 0.95,
      coeffProduct: 1.2,
      coeffLead: 1.08,
      coeffQty: 0.92,
    },
    counterPrice: 16000,
    note: "经典案例：高议价，提交审批可走总监/VP 链",
  });

  await createScenario(cid("捷联工控"), "NORMAL", {
    name: "标准工控板小批量",
    productName: "500 PCS / 20 天",
    quantity: 500,
    leadDays: 20,
    isStandard: true,
    isSmallOrder: true,
    status: "PRICED",
    coeffs: { ...base, coeffQty: 0.94 },
    counterPrice: null,
    note: "自动通道候选：标品+小额+无还价",
  });

  await createScenario(cid("云栈数据科技"), "KEY", {
    name: "数据中心背板扩容",
    productName: "3K PCS / 25 天",
    quantity: 3000,
    leadDays: 25,
    isStandard: true,
    isSmallOrder: false,
    status: "PENDING_APPROVAL",
    coeffs: { ...base, material: 6800, coeffCustomer: 1.18 },
    counterPrice: null,
    forcePendingRole: "SALES_MANAGER",
    note: "待审批（经理档）：可切换经理身份直接通过",
  });

  const coeffsCar = {
    ...base,
    material: 9100,
    labor: 1400,
    overhead: 2600,
    period: 900,
    coeffCustomer: 1.14,
    coeffIndustry: 1.12,
  };
  const sugCar = suggestedPriceFromCosts(coeffsCar);
  await createScenario(cid("长风汽车电子"), "KEY", {
    name: "车规域控制器 PCB",
    productName: "2K PCS / 30 天 AEC-Q",
    quantity: 2000,
    leadDays: 30,
    isStandard: false,
    isSmallOrder: false,
    status: "PENDING_APPROVAL",
    coeffs: coeffsCar,
    counterPrice: Math.round(sugCar * 0.82 * 100) / 100,
    note: "深度折扣 → 通常需 VP/总经理",
  });

  await createScenario(cid("晨曦消费电子"), "NORMAL", {
    name: "穿戴设备软板",
    productName: "8K PCS / 12 天",
    quantity: 8000,
    leadDays: 12,
    isStandard: true,
    isSmallOrder: false,
    status: "APPROVED",
    coeffs: { ...base, material: 3100, labor: 600, overhead: 900, period: 350 },
    counterPrice: null,
    approvedPrice: null,
    note: "已核准：按建议价成交",
  });
  const wear = await prisma.project.findFirst({
    where: { name: "穿戴设备软板" },
    include: { quote: true },
  });
  if (wear?.quote) {
    const sp = wear.quote.suggestedPrice;
    await prisma.quote.update({
      where: { id: wear.quote.id },
      data: { approvedPrice: sp },
    });
  }

  await createScenario(cid("海港医疗电子"), "KEY", {
    name: "监护仪主控模块",
    productName: "1.2K PCS / 18 天",
    quantity: 1200,
    leadDays: 18,
    isStandard: false,
    isSmallOrder: true,
    status: "DRAFT",
    coeffs: { ...base, material: 4200, coeffProduct: 1.15 },
    counterPrice: null,
    note: "草稿：可进工作台继续改成本/系数",
  });

  await createScenario(cid("华信通信技术"), "STRATEGIC", {
    name: "骨干网光模块载板",
    productName: "5K PCS / 22 天",
    quantity: 5000,
    leadDays: 22,
    isStandard: false,
    isSmallOrder: false,
    status: "PENDING_APPROVAL",
    coeffs: {
      ...base,
      material: 12000,
      labor: 1800,
      overhead: 3200,
      period: 1200,
      coeffCustomer: 1.22,
      coeffIndustry: 1.15,
    },
    counterPrice: null,
    forcePendingRole: "SALES_DIRECTOR",
    note: "战略客户：强制人机协同，待总监",
  });

  await createScenario(cid("九州能源装备"), "NORMAL", {
    name: "储能 BMS 控制板",
    productName: "600 PCS / 28 天",
    quantity: 600,
    leadDays: 28,
    isStandard: true,
    isSmallOrder: true,
    status: "APPROVED",
    coeffs: base,
    counterPrice: null,
    approvedPrice: null,
    note: "已成交演示",
  });
  const bms = await prisma.project.findFirst({
    where: { name: "储能 BMS 控制板" },
    include: { quote: true },
  });
  if (bms?.quote) {
    const sp = bms.quote.suggestedPrice;
    const deal = Math.round(sp * 0.96 * 100) / 100;
    await prisma.quote.update({
      where: { id: bms.quote.id },
      data: { counterPrice: deal, approvedPrice: deal },
    });
  }

  await createScenario(cid("云栈数据科技"), "KEY", {
    name: "AI 服务器电源板",
    productName: "1.5K PCS / 21 天",
    quantity: 1500,
    leadDays: 21,
    isStandard: true,
    isSmallOrder: false,
    status: "PRICED",
    coeffs: { ...base, material: 7800, coeffIndustry: 1.14 },
    counterPrice: null,
    note: "待议价：可填客户还价后提交审批",
  });

  await createScenario(cid("捷联工控"), "NORMAL", {
    name: "网关通信子卡",
    productName: "2K PCS / 16 天",
    quantity: 2000,
    leadDays: 16,
    isStandard: true,
    isSmallOrder: true,
    status: "PENDING_APPROVAL",
    coeffs: { ...base, material: 2800, labor: 500, overhead: 800, period: 300 },
    counterPrice: null,
    forcePendingRole: "SALES_VP",
    note: "演示 VP 档待办",
  });

  await seedBulk(
    customers.map((c) => ({ id: c.id, tier: c.tier })),
    base,
  );

  const compass = [
    {
      name: "5G 基站 HDI",
      customerName: "华系通信",
      grossMargin: 32,
      growth: 25,
      quadrant: "STAR",
      strategy: "关键保护 · 加大交付与产能倾斜",
      priority: "最高",
      sortOrder: 1,
    },
    {
      name: "数据中心背板",
      customerName: "云栈数据",
      grossMargin: 28,
      growth: 8,
      quadrant: "CASH_COW",
      strategy: "维持份额 · 稳现金流",
      priority: "高",
      sortOrder: 2,
    },
    {
      name: "AI 服务器电源板",
      customerName: "云栈数据",
      grossMargin: 26,
      growth: 42,
      quadrant: "STAR",
      strategy: "高增赛道 · 评估产能与材料锁价",
      priority: "最高",
      sortOrder: 3,
    },
    {
      name: "车规域控 PCB",
      customerName: "长风汽车",
      grossMargin: 14,
      growth: 35,
      quadrant: "QUESTION",
      strategy: "降本或提价 · 谨慎扩产",
      priority: "中",
      sortOrder: 4,
    },
    {
      name: "医疗监护主控",
      customerName: "海港医疗",
      grossMargin: 22,
      growth: 12,
      quadrant: "CASH_COW",
      strategy: "稳健维护 · 关注注册与合规成本",
      priority: "中高",
      sortOrder: 5,
    },
    {
      name: "储能 BMS 板",
      customerName: "九州能源",
      grossMargin: 19,
      growth: 55,
      quadrant: "QUESTION",
      strategy: "高增长低毛利 · 需套期或长单锁价",
      priority: "中",
      sortOrder: 6,
    },
    {
      name: "消费电子软板",
      customerName: "晨曦集合单",
      grossMargin: 11,
      growth: -3,
      quadrant: "DOG",
      strategy: "收缩 SKU · 止损",
      priority: "低",
      sortOrder: 7,
    },
    {
      name: "工控小批量",
      customerName: "捷联工控",
      grossMargin: 27,
      growth: 6,
      quadrant: "CASH_COW",
      strategy: "保留利基 · 自动化报价提效",
      priority: "中",
      sortOrder: 8,
    },
    {
      name: "防务雷达射频板",
      customerName: "领航防务",
      grossMargin: 35,
      growth: 48,
      quadrant: "STAR",
      strategy: "高壁垒 · 保交付与合规审查",
      priority: "最高",
      sortOrder: 9,
    },
    {
      name: "手术机器人传感板",
      customerName: "维科医疗",
      grossMargin: 30,
      growth: 22,
      quadrant: "STAR",
      strategy: "高毛利高增 · 扩产前先锁供应链",
      priority: "最高",
      sortOrder: 10,
    },
    {
      name: "协作臂控制板",
      customerName: "蓝图机器人",
      grossMargin: 24,
      growth: 31,
      quadrant: "STAR",
      strategy: "赛道热 · 关注价格战与账期",
      priority: "高",
      sortOrder: 11,
    },
    {
      name: "光伏逆变器功率板",
      customerName: "恒润电力",
      grossMargin: 18,
      growth: 40,
      quadrant: "QUESTION",
      strategy: "量大利薄 · 套保+长单",
      priority: "中",
      sortOrder: 12,
    },
    {
      name: "车规灯驱模组",
      customerName: "驭速汽车",
      grossMargin: 16,
      growth: 18,
      quadrant: "QUESTION",
      strategy: "降价压力大 · 差异化或退出低端",
      priority: "中",
      sortOrder: 13,
    },
    {
      name: "晶圆测试接口板",
      customerName: "晶都半导体",
      grossMargin: 29,
      growth: 9,
      quadrant: "CASH_COW",
      strategy: "利基稳态 · 维持服务响应",
      priority: "高",
      sortOrder: 14,
    },
    {
      name: "MiniLED 背光 FPC",
      customerName: "星河光电",
      grossMargin: 21,
      growth: 28,
      quadrant: "CASH_COW",
      strategy: "技术迭代快 · 绑定头部客户",
      priority: "中高",
      sortOrder: 15,
    },
    {
      name: "超导滤波子卡",
      customerName: "超导新材",
      grossMargin: 13,
      growth: 52,
      quadrant: "QUESTION",
      strategy: "科研转量产 · 严控打样成本",
      priority: "中",
      sortOrder: 16,
    },
    {
      name: "海外白牌机顶盒",
      customerName: "海睿物联网",
      grossMargin: 9,
      growth: -2,
      quadrant: "DOG",
      strategy: "低毛利负增长 · 收缩或代工",
      priority: "低",
      sortOrder: 17,
    },
    {
      name: "精密冲压件配套 PCB",
      customerName: "磐石精密",
      grossMargin: 25,
      growth: 7,
      quadrant: "CASH_COW",
      strategy: "稳定利基 · 自动化报价覆盖",
      priority: "中",
      sortOrder: 18,
    },
    {
      name: "东南亚代工大单",
      customerName: "海外渠道",
      grossMargin: 12,
      growth: 15,
      quadrant: "QUESTION",
      strategy: "账期与汇兑风险 · 需信用证",
      priority: "中",
      sortOrder: 19,
    },
    {
      name: "西南园区集采",
      customerName: "区域代理",
      grossMargin: 20,
      growth: 11,
      quadrant: "CASH_COW",
      strategy: "走量保现金 · 防止串货压价",
      priority: "中",
      sortOrder: 20,
    },
  ];

  for (const row of compass) {
    await prisma.compassItem.create({ data: row });
  }

  const compassAlertRules = [
    { conditionLabel: "毛利率 <15%", actionLabel: "成本优化或提价", sortOrder: 0 },
    {
      conditionLabel: "单一客户占比 >30%",
      actionLabel: "客户结构分散",
      sortOrder: 1,
    },
    { conditionLabel: "账期 >90 天", actionLabel: "加强回款 / 收紧信用", sortOrder: 2 },
    { conditionLabel: "材料成本占比 >60%", actionLabel: "锁价或对冲", sortOrder: 3 },
    { conditionLabel: "竞品降价 >10%", actionLabel: "差异化叙事", sortOrder: 4 },
    { conditionLabel: "产能利用率 <70%", actionLabel: "调整排产或外协", sortOrder: 5 },
  ];
  for (const row of compassAlertRules) {
    await prisma.compassAlertRule.create({ data: row });
  }

  await prisma.compassQuadrantThreshold.create({
    data: {
      id: "default",
      marginHighPct: 30,
      growthHighPct: 20,
    },
  });
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
