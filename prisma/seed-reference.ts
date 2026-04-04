/**
 * 仅补齐「罗盘基准配置」：不删除、不修改客户/项目/报价/罗盘条目/用户/审计。
 * - CompassQuadrantThreshold：若无 id=default 则创建默认阈值
 * - CompassAlertRule：仅当表为空时插入内置规则（已有规则则跳过，避免覆盖真环境定制）
 *
 * 用法：npm run db:seed:reference
 */
import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_THRESHOLD = {
  id: "default" as const,
  marginHighPct: 60,
  growthHighPct: 60,
};

const DEFAULT_ALERT_RULES = [
  { conditionLabel: "客户价值 <60", actionLabel: "补强客户经营计划", sortOrder: 0 },
  {
    conditionLabel: "赢单概率 <60%",
    actionLabel: "销售教练介入复盘",
    sortOrder: 1,
  },
  {
    conditionLabel: "Deal Desk 待办 >20 单",
    actionLabel: "按优先级分批清队列",
    sortOrder: 2,
  },
  {
    conditionLabel: "标准订阅包折扣 >15%",
    actionLabel: "升级到销售经理/VP Deal Desk",
    sortOrder: 3,
  },
  {
    conditionLabel: "试用转正率 <35%",
    actionLabel: "优化试用成功标准与跟进节奏",
    sortOrder: 4,
  },
  {
    conditionLabel: "关键行业商机停滞 >14 天",
    actionLabel: "发起跨角色协同推进",
    sortOrder: 5,
  },
];

async function main() {
  const threshold = await prisma.compassQuadrantThreshold.findUnique({
    where: { id: DEFAULT_THRESHOLD.id },
  });
  if (!threshold) {
    await prisma.compassQuadrantThreshold.create({ data: DEFAULT_THRESHOLD });
    console.log("[seed:reference] 已创建罗盘四象限默认阈值（客户价值≥60、赢单概率≥60）");
  } else {
    console.log(
      "[seed:reference] 罗盘四象限阈值已存在，跳过（保留当前配置）",
    );
  }

  const ruleCount = await prisma.compassAlertRule.count();
  if (ruleCount === 0) {
    for (const row of DEFAULT_ALERT_RULES) {
      await prisma.compassAlertRule.create({ data: row });
    }
    console.log(
      `[seed:reference] 已插入 ${DEFAULT_ALERT_RULES.length} 条罗盘对策规则（表原为空的首次初始化）`,
    );
  } else {
    console.log(
      `[seed:reference] 罗盘对策规则已有 ${ruleCount} 条，跳过（不覆盖真数据或定制规则）`,
    );
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
