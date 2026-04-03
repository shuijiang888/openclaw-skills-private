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
  marginHighPct: 30,
  growthHighPct: 20,
};

const DEFAULT_ALERT_RULES = [
  { conditionLabel: "毛利率 <15%", actionLabel: "成本优化或提价", sortOrder: 0 },
  {
    conditionLabel: "单一客户占比 >30%",
    actionLabel: "客户结构分散",
    sortOrder: 1,
  },
  {
    conditionLabel: "账期 >90 天",
    actionLabel: "加强回款 / 收紧信用",
    sortOrder: 2,
  },
  {
    conditionLabel: "材料成本占比 >60%",
    actionLabel: "锁价或对冲",
    sortOrder: 3,
  },
  {
    conditionLabel: "竞品降价 >10%",
    actionLabel: "差异化叙事",
    sortOrder: 4,
  },
  {
    conditionLabel: "产能利用率 <70%",
    actionLabel: "调整排产或外协",
    sortOrder: 5,
  },
];

async function main() {
  const threshold = await prisma.compassQuadrantThreshold.findUnique({
    where: { id: DEFAULT_THRESHOLD.id },
  });
  if (!threshold) {
    await prisma.compassQuadrantThreshold.create({ data: DEFAULT_THRESHOLD });
    console.log(
      "[seed:reference] 已创建罗盘四象限默认阈值（高毛利≥30%、高增长≥20%）",
    );
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
