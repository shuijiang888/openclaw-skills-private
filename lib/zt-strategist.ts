import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ztRoleFromRequest } from "@/lib/http";
import { getRequestUserContext } from "@/lib/request-user";
import { actorRoleCandidatesForZt } from "@/lib/zt-ranks";

export type StrategistFocus =
  | "overall"
  | "city"
  | "publisher"
  | "task"
  | "points"
  | "definition";

type SnapshotKpis = {
  submissions: number;
  activeTasks: number;
  hotCities: number;
  activePublishers: number;
  pendingActions: number;
  totalPoints: number;
};

type CityHotspot = {
  city: string;
  count: number;
  last7d: number;
  delta7d: number;
};

type PublisherHotspot = {
  publisher: string;
  count: number;
  actorRole: string;
};

type TaskHotspot = {
  taskId: string;
  title: string;
  submissions: number;
  status: string;
  rewardPoints: number;
};

type PointsHotspot = {
  actor: string;
  points: number;
  rank: string;
};

type DefinitionHotspot = {
  definitionId: string;
  category: string;
  name: string;
  count: number;
};

export type StrategistSnapshot = {
  generatedAt: string;
  scopeLabel: string;
  kpis: SnapshotKpis;
  hotspots: {
    byCity: CityHotspot[];
    byPublisher: PublisherHotspot[];
    byTask: TaskHotspot[];
    byPoints: PointsHotspot[];
    byDefinition: DefinitionHotspot[];
  };
  warnings: string[];
  opportunities: string[];
};

export type StrategistMessage = {
  role: "user" | "assistant";
  content: string;
};

function inferFocusByQuestion(raw: string): StrategistFocus {
  const q = raw.trim();
  if (!q) return "overall";
  if (/城市|区域|辖区|地区|成都|广州|深圳|武汉|郑州|福州|厦门/.test(q)) {
    return "city";
  }
  if (/发布人|人员|伙伴|员工|谁在发|组织/.test(q)) {
    return "publisher";
  }
  if (/任务|悬赏|行动|状态|闭环/.test(q)) {
    return "task";
  }
  if (/积分|军衔|激励|奖励/.test(q)) {
    return "points";
  }
  if (/定义|分类|标签|商情|情报类型|口径/.test(q)) {
    return "definition";
  }
  return "overall";
}

function topItems<T>(entries: T[], n = 5): T[] {
  return entries.slice(0, n);
}

function roleScopeFromRequest(req: Request): {
  submissionWhere?: Prisma.ZtSubmissionWhereInput;
  actionWhere?: Prisma.ZtActionCardWhereInput;
  walletWhere?: Prisma.ZtPointWalletWhereInput;
  scopeLabel: string;
} {
  const ctx = getRequestUserContext(req);
  const role = ztRoleFromRequest(req);
  const roleScope = actorRoleCandidatesForZt(role);
  const adminView = ctx.isZtManager;
  if (adminView) {
    return {
      submissionWhere: undefined,
      actionWhere: { status: "OPEN" },
      walletWhere: undefined,
      scopeLabel: "全域视角",
    };
  }
  if (ctx.userId) {
    return {
      submissionWhere: {
        OR: [{ userId: ctx.userId }, { actorRole: { in: roleScope } }],
      },
      actionWhere: { status: "OPEN", assignedRole: { in: roleScope } },
      walletWhere: {
        OR: [{ userId: ctx.userId }, { actorRole: { in: roleScope } }],
      },
      scopeLabel: "角色协同视角",
    };
  }
  return {
    submissionWhere: { actorRole: { in: roleScope } },
    actionWhere: { status: "OPEN", assignedRole: { in: roleScope } },
    walletWhere: { actorRole: { in: roleScope } },
    scopeLabel: "角色视角",
  };
}

export async function buildStrategistSnapshot(req: Request): Promise<StrategistSnapshot> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const { submissionWhere, actionWhere, walletWhere, scopeLabel } =
    roleScopeFromRequest(req);

  const [defs, submissions, tasks, pendingActions, wallets] = await Promise.all([
    prisma.ztIntelDefinition.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.ztSubmission.findMany({
      where: submissionWhere,
      select: {
        id: true,
        taskId: true,
        intelDefId: true,
        actorName: true,
        actorRole: true,
        region: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.ztBountyTask.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        rewardPoints: true,
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.ztActionCard.count({
      where: actionWhere,
    }),
    prisma.ztPointWallet.findMany({
      where: walletWhere,
      select: {
        actorRole: true,
        user: { select: { name: true } },
        points: true,
        rank: true,
      },
      orderBy: [{ points: "desc" }, { updatedAt: "desc" }],
      take: 20,
    }),
  ]);

  const defsMap = new Map(defs.map((d) => [d.id, d]));
  const cityCount = new Map<string, number>();
  const cityLast7 = new Map<string, number>();
  const cityPrev7 = new Map<string, number>();
  const publisherCount = new Map<string, { count: number; actorRole: string }>();
  const taskCount = new Map<string, number>();
  const defCount = new Map<string, number>();

  for (const row of submissions) {
    const city = row.region.trim() || "未标注区域";
    cityCount.set(city, (cityCount.get(city) ?? 0) + 1);
    if (row.createdAt >= sevenDaysAgo) {
      cityLast7.set(city, (cityLast7.get(city) ?? 0) + 1);
    } else if (row.createdAt >= fourteenDaysAgo) {
      cityPrev7.set(city, (cityPrev7.get(city) ?? 0) + 1);
    }

    const publisher = row.actorName.trim() || row.actorRole || "匿名";
    const prevPublisher = publisherCount.get(publisher);
    if (prevPublisher) {
      prevPublisher.count += 1;
      publisherCount.set(publisher, prevPublisher);
    } else {
      publisherCount.set(publisher, { count: 1, actorRole: row.actorRole });
    }

    if (row.taskId) {
      taskCount.set(row.taskId, (taskCount.get(row.taskId) ?? 0) + 1);
    }
    if (row.intelDefId) {
      defCount.set(row.intelDefId, (defCount.get(row.intelDefId) ?? 0) + 1);
    }
  }

  const byCity = topItems(
    Array.from(cityCount.entries())
      .map(([city, count]) => ({
        city,
        count,
        last7d: cityLast7.get(city) ?? 0,
        delta7d: (cityLast7.get(city) ?? 0) - (cityPrev7.get(city) ?? 0),
      }))
      .sort((a, b) => b.count - a.count || b.last7d - a.last7d),
    8,
  );

  const byPublisher = topItems(
    Array.from(publisherCount.entries())
      .map(([publisher, v]) => ({
        publisher,
        count: v.count,
        actorRole: v.actorRole,
      }))
      .sort((a, b) => b.count - a.count),
    8,
  );

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const byTask = topItems(
    tasks
      .map((t) => ({
        taskId: t.id,
        title: t.title,
        submissions: taskCount.get(t.id) ?? 0,
        status: t.status,
        rewardPoints: t.rewardPoints,
      }))
      .sort((a, b) => b.submissions - a.submissions || b.rewardPoints - a.rewardPoints),
    8,
  );

  const byDefinition = topItems(
    Array.from(defCount.entries())
      .map(([definitionId, count]) => {
        const def = defsMap.get(definitionId);
        return {
          definitionId,
          category: def?.category ?? "UNKNOWN",
          name: def?.name ?? "未命名定义",
          count,
        };
      })
      .sort((a, b) => b.count - a.count),
    8,
  );

  const byPoints = topItems(
    wallets
      .map((w) => ({
        actor: w.user?.name?.trim() || w.actorRole || "未命名",
        points: w.points,
        rank: w.rank,
      }))
      .sort((a, b) => b.points - a.points),
    8,
  );

  const totalPoints = wallets.reduce((acc, x) => acc + x.points, 0);
  const untagged = cityCount.get("未标注区域") ?? 0;
  const warnings: string[] = [];
  const opportunities: string[] = [];
  if (submissions.length > 0 && untagged / submissions.length >= 0.2) {
    warnings.push("区域未标注占比偏高，建议将 region 设为硬约束并纳入质检。");
  }
  if (byDefinition.length === 0) {
    warnings.push("尚未形成商情定义命中数据，建议优先推动按定义提报。");
  }
  if ((byTask[0]?.submissions ?? 0) <= 1) {
    warnings.push("悬赏任务参与度偏低，建议提高头部任务积分并强化督办。");
  }
  if (byCity[0]) {
    opportunities.push(
      `热点城市「${byCity[0].city}」情报量最高，可优先部署专项行动卡与高奖励悬赏。`,
    );
  }
  if (byPublisher[0]) {
    opportunities.push(
      `核心情报贡献者「${byPublisher[0].publisher}」活跃，建议设立可复制话术与协同机制。`,
    );
  }
  if (byDefinition[0]) {
    opportunities.push(
      `当前最有价值定义是「${byDefinition[0].name}」，可扩展为专题战役看板。`,
    );
  }

  return {
    generatedAt: now.toISOString(),
    scopeLabel,
    kpis: {
      submissions: submissions.length,
      activeTasks: tasks.filter((x) => x.status === "OPEN").length,
      hotCities: byCity.length,
      activePublishers: byPublisher.length,
      pendingActions,
      totalPoints,
    },
    hotspots: {
      byCity,
      byPublisher,
      byTask,
      byPoints,
      byDefinition,
    },
    warnings,
    opportunities,
  };
}

export function generateStrategistReply(input: {
  snapshot: StrategistSnapshot;
  messages: StrategistMessage[];
  focus?: StrategistFocus;
  reportMode?: boolean;
}): { focus: StrategistFocus; reply: string } {
  const lastUser =
    [...input.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  const focus = input.focus && input.focus !== "overall"
    ? input.focus
    : inferFocusByQuestion(lastUser);
  const s = input.snapshot;
  const cityTop = s.hotspots.byCity[0];
  const pubTop = s.hotspots.byPublisher[0];
  const taskTop = s.hotspots.byTask[0];
  const pointTop = s.hotspots.byPoints[0];
  const defTop = s.hotspots.byDefinition[0];

  if (input.reportMode) {
    const report = [
      `【AI大军师战情研判报告】`,
      `生成时间：${new Date(s.generatedAt).toLocaleString("zh-CN")} · 视角：${s.scopeLabel}`,
      "",
      "一、全域态势",
      `- 情报提交：${s.kpis.submissions}`,
      `- 开放任务：${s.kpis.activeTasks} · 待执行行动卡：${s.kpis.pendingActions}`,
      `- 活跃城市：${s.kpis.hotCities} · 活跃发布人：${s.kpis.activePublishers}`,
      `- 总积分存量：${s.kpis.totalPoints}`,
      "",
      "二、热点焦点",
      cityTop
        ? `- 城市热点：${cityTop.city}（总量 ${cityTop.count}，近7天 ${cityTop.last7d}，环比 ${cityTop.delta7d >= 0 ? "+" : ""}${cityTop.delta7d}）`
        : "- 城市热点：暂无",
      pubTop
        ? `- 人员热点：${pubTop.publisher}（提交 ${pubTop.count}，角色 ${pubTop.actorRole}）`
        : "- 人员热点：暂无",
      taskTop
        ? `- 任务热点：${taskTop.title}（关联提交 ${taskTop.submissions}，状态 ${taskTop.status}）`
        : "- 任务热点：暂无",
      defTop
        ? `- 定义热点：${defTop.name}（分类 ${defTop.category}，命中 ${defTop.count}）`
        : "- 定义热点：暂无",
      "",
      "三、风险预警",
      ...(s.warnings.length > 0 ? s.warnings.map((w) => `- ${w}`) : ["- 当前未检测到高风险红线。"]),
      "",
      "四、48小时作战建议",
      ...(s.opportunities.length > 0
        ? s.opportunities.map((o) => `- ${o}`)
        : ["- 建议先补齐商情定义覆盖，并围绕头部城市建立专题悬赏。"]),
      "- 指挥建议：将热点城市 + 热门商情定义交叉成“战区专题任务”，提升闭环速度。",
      "",
      lastUser ? `附：本次提问焦点「${lastUser.slice(0, 80)}」已纳入研判。` : "",
    ]
      .filter(Boolean)
      .join("\n");
    return { focus, reply: report };
  }

  if (focus === "city") {
    const lines = [
      "从城市维度看，当前战情热度排序：",
      ...s.hotspots.byCity.slice(0, 5).map(
        (x, i) =>
          `${i + 1}. ${x.city}（总量 ${x.count}，近7天 ${x.last7d}，环比 ${x.delta7d >= 0 ? "+" : ""}${x.delta7d}）`,
      ),
      "建议：对前两名城市启动专班任务，将“定义热点”与城市热点进行绑定投放。",
    ];
    return { focus, reply: lines.join("\n") };
  }

  if (focus === "publisher") {
    const lines = [
      "从发布人/伙伴维度看，核心贡献者如下：",
      ...s.hotspots.byPublisher
        .slice(0, 5)
        .map((x, i) => `${i + 1}. ${x.publisher}（${x.actorRole}，提交 ${x.count}）`),
      "建议：为头部贡献者配置“追问模板 + 复盘机制”，把个人能力沉淀为组织能力。",
    ];
    return { focus, reply: lines.join("\n") };
  }

  if (focus === "task") {
    const lines = [
      "从任务/悬赏维度看，当前热任务如下：",
      ...s.hotspots.byTask
        .slice(0, 5)
        .map(
          (x, i) =>
            `${i + 1}. ${x.title}（关联提交 ${x.submissions}，状态 ${x.status}，奖励 ${x.rewardPoints}）`,
        ),
      "建议：对提交高、未结案任务触发“行动卡督办”，形成明确责任人和截止时间。",
    ];
    return { focus, reply: lines.join("\n") };
  }

  if (focus === "points") {
    const lines = [
      "从积分/军衔维度看，当前战绩榜如下：",
      ...s.hotspots.byPoints
        .slice(0, 5)
        .map((x, i) => `${i + 1}. ${x.actor}（${x.rank}，积分 ${x.points}）`),
      "建议：将“高积分但低任务闭环”的角色拉入复盘，防止只上报不转化。",
    ];
    return { focus, reply: lines.join("\n") };
  }

  if (focus === "definition") {
    const lines = [
      "从商情定义维度看，当前命中焦点：",
      ...s.hotspots.byDefinition
        .slice(0, 5)
        .map((x, i) => `${i + 1}. ${x.name}（${x.category}，命中 ${x.count}）`),
      "建议：将前两类定义升级为“专题战役”，配置专属悬赏 + 行动卡 + 周报复盘。",
    ];
    return { focus, reply: lines.join("\n") };
  }

  const overviewLines = [
    "军师总览判断：当前系统已具备“定义驱动 + 热点聚焦 + 行动闭环”基础。",
    `- 总体情报量 ${s.kpis.submissions}，开放任务 ${s.kpis.activeTasks}，待执行行动卡 ${s.kpis.pendingActions}`,
    cityTop ? `- 城市焦点：${cityTop.city}` : "- 城市焦点：暂无",
    defTop ? `- 定义焦点：${defTop.name}` : "- 定义焦点：暂无",
    ...(s.warnings.length > 0 ? [`- 风险提示：${s.warnings[0]}`] : []),
    ...(s.opportunities.length > 0 ? [`- 优先动作：${s.opportunities[0]}`] : []),
    "你可以继续追问：城市、发布人、任务、积分、定义任一维度，我会给出更细研判。",
  ];
  return { focus, reply: overviewLines.join("\n") };
}

