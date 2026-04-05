import type { DemoRole } from "./approval";

export type RolePlaybook = {
  /** UI 短标签 */
  label: string;
  /** 仪表盘引导语 */
  dashboardIntro: string;
  /** 今日重点 */
  priorities: { title: string; detail: string }[];
  /** 注入大模型：本角色判定系数时优先考虑的经营视角 */
  agentFocus: string;
  /** 报价助手示例话术（侧重该角色） */
  quoteExamples: string[];
  /** 销售经理档：侧栏检查清单（无 LLM 时） */
  managerChecklist?: string[];
  /** 助手内「追加」到输入框的短句（不覆盖已有内容） */
  agentQuickPhrases?: { label: string; text: string }[];
};

export const ROLE_PLAYBOOK: Record<DemoRole, RolePlaybook> = {
  SALES_MANAGER: {
    label: "销售经理",
    dashboardIntro:
      "当前档聚焦落地询价：维护成本基准、系数与折扣叙事，及时提交审批。智能助手（qwen3.5 本地大模型）已全面开放，可直接解析商机语义并调整系数。",
    priorities: [
      { title: "把成本与系数填实", detail: "材料/人工/费用与六项系数决定建议价与毛利口径。" },
      { title: "AI辅助快速定价", detail: "用智能助手描述客户/产品/交期，自动推荐系数调整。" },
      { title: "折扣透明可审计", detail: "提交前确认折扣带与所需审批角色一致。" },
    ],
    agentFocus:
      "操作者为一线销售经理：请在合规范围内给出系数微调建议，优先保证可批复、可交付，折扣与特批要求严格对应审批链；语气温和务实。对经理档给出更详细的操作指引，包括成本核对要点和系数调整理由。",
    quoteExamples: [
      "标品目录料，客户要年框价，竞标激烈，交期可分批。",
      "老客户加急小批试产，有改板风险，需保毛利底线。",
      "新客户首单，账期 45 天，价格敏感但愿意长协。",
      "华南区5G基站HDI板，14层二阶，客户催交期，量10K。",
    ],
    managerChecklist: [
      "成本四项与业务口径一致（无遗漏制造/期间费用）。",
      "客户名称、评级、账期与 CRM/纷享记录对齐。",
      "交期与「加急/插单」描述与系数联动自洽。",
      "若折扣超出本档权限，材料里写清原因再提交审批。",
      "使用智能助手后，请复核AI建议的系数是否符合实际。",
    ],
    agentQuickPhrases: [
      { label: "+AI定价", text: "请根据客户评级和产品类型，建议最优系数组合并说明理由。" },
      { label: "+提交说明", text: "本单已核对成本与系数，申请按当前客户/交期口径提交审批。" },
      { label: "+折扣原因", text: "让利原因：客户年框承诺与回款条件已书面确认，需在底价带上沿成交。" },
      { label: "+加急说明", text: "产线已协调插单，请交期系数反映加班费与良率风险。" },
      { label: "+竞品对标", text: "竞品报价低于我方约5%，请建议如何调整系数保持竞争力同时守住毛利。" },
    ],
  },
  SALES_DIRECTOR: {
    label: "销售总监",
    dashboardIntro:
      "管控多条商机与折扣带：用工作台扫风险池，用智能助手批量对齐话术与系数策略。AI助手可帮您快速判断报价是否合理。",
    priorities: [
      { title: "审批队列与折扣结构", detail: "重点看跨团队的异常折扣与低毛利项目。" },
      { title: "助手辅助一致性", detail: "用自然语言统一「标品/定制/加急」叙事，减少个人发挥。" },
      { title: "向下游交接清晰", detail: "VP/GM 特批项在系统里保留时间线与备注。" },
    ],
    agentFocus:
      "操作者为销售总监：在客户/产品/交期系数上平衡签单与利润，提示团队遵守折扣带；对定制与加急给出可执行的风险提示。",
    quoteExamples: [
      "战略客户，加急两周内交付，小批量试产，需要定制改板。",
      "内销标品，年度框大单，交期宽裕，价格竞争激烈。",
      "两条产线争产能，请先保回款好的那条的交期承诺。",
    ],
    agentQuickPhrases: [
      { label: "+团队口径", text: "请按团队统一折扣带复核各系数；非标与加急须单独提示分流风险。" },
      { label: "+批复备忘录", text: "建议批复要点：锁定交付批次、毛利底线与复盘节点。" },
      { label: "+跨区协调", text: "存在跨区撞单可能，请区域系数体现渠道保护与报价一致性。" },
    ],
  },
  SALES_VP: {
    label: "销售副总裁",
    dashboardIntro:
      "投资组合视角：识别结构性低毛利、自动化通道潜力与大客户依赖。AI助手可从组合管理角度给出决策建议。",
    priorities: [
      { title: "结构与依赖", detail: "罗盘与简报里的大客户集中度、毛利分布。" },
      { title: "政策例外", detail: "超出总监带的折扣需有清晰的战略理由与回收路径。" },
      { title: "跨区/跨行业价差", detail: "助手解析时强调区域与行业系数一致性。" },
    ],
    agentFocus:
      "操作者为销售副总裁：系数建议需体现组合管理思维，提示恶性竞价、区域串货风险；语言简洁、偏管理与策略。",
    quoteExamples: [
      "出口欧洲，行业壁垒较高，非标准结构件，需预留认证与售后成本。",
      "华东区域价格战，但可绑定三年框架，请评估首单让利幅度。",
      "与兄弟事业部共用产能，请交期系数反映机会成本。",
    ],
    agentQuickPhrases: [
      { label: "+组合视角", text: "从组合毛利与客户依赖度评估：是否值得为该单牺牲短期利润换结构份额。" },
      { label: "+政策例外", text: "本单突破常规折扣带，需写明回收路径（季度返点/增量承诺）。" },
      { label: "+竞争对标", text: "对标主要竞品报价区间，请系数反映可防守的底价与交期承诺。" },
    ],
  },
  GM: {
    label: "总经理",
    dashboardIntro:
      "经营结果责任人：从工作台与控制台把握审批、主数据与客户健康度。AI助手可快速提供经营决策支持。",
    priorities: [
      { title: "终审与资本效率", detail: "高折扣、长账期、低毛利需有对应回报假设。" },
      { title: "主数据只读检阅", detail: "后台客户清单可查看；批量导入由管理员执行。" },
      { title: "披露与复盘", detail: "简报与审计日志支撑董事会/投资人叙事。" },
    ],
    agentFocus:
      "操作者为总经理：系数与风险提示应服务经营取舍，突出合规底线、现金流与战略客户例外；避免琐碎执行细节。",
    quoteExamples: [
      "战略入围项目，允许首期亏损 3 个点换份额，但需锁量与付款里程碑。",
      "竞争对手杀价 10%，评估是否跟价及对未来建议价的锚定影响。",
      "大客户要求延展账期，请系数与价格联动给出可控区间。",
    ],
    agentQuickPhrases: [
      { label: "+现金流", text: "请同步提示账期延展对现金流的影响及建议的付款里程碑。" },
      { label: "+终审要点", text: "终审关注：战略匹配、ROI 假设与合规底线，系数调整需可审计。" },
      { label: "+例外留痕", text: "本特批需在团队侧留痕：理由、批准范围与复盘负责人。" },
    ],
  },
  ADMIN: {
    label: "管理员",
    dashboardIntro:
      "系统与主数据维护：规则、阈值、CSV 与审计；业务角色以前台工作台为主。",
    priorities: [
      { title: "系数与罗盘规则", detail: "控制台「系数与规则」与前台测算保持一致。" },
      { title: "导入与数据质量", detail: "CSV 导入后抽查分流与评级字段。" },
      { title: "智能体可观测", detail: "审计日志中的 prompt 版本与注入标记用于排障。" },
    ],
    agentFocus:
      "操作者为系统管理员：解析结果应利于核对配置与规则是否被正确执行，提示与基准配置的偏差；发现异常时偏向保守与可审计。",
    quoteExamples: [
      "回归测试：标品、标准交期，客户为战略级，请看系数是否在预期带内。",
      "模拟红海竞价场景，检查交期与客户系数是否被规则夹紧。",
    ],
    agentQuickPhrases: [
      { label: "+一致性", text: "请检查解析结果与控制台默认系数、罗盘阈值是否一致，列出偏差项。" },
      { label: "+边界用例", text: "极端场景：极低毛利+加急+战略客户，系数应如何被夹紧。" },
      { label: "+审计字段", text: "输出中请避免泄露系统配置细节，仅给出业务可读的 summary/hints。" },
    ],
  },
};

export function getRolePlaybook(role: DemoRole): RolePlaybook {
  return ROLE_PLAYBOOK[role];
}

/** 拼入 Ollama user 消息：置于不可信输入之前，仅作角色视角说明 */
export function buildRoleAgentContextForPrompt(role: DemoRole): string {
  const p = ROLE_PLAYBOOK[role];
  const priorities = p.priorities
    .slice(0, 3)
    .map((x) => `- ${x.title}：${x.detail}`)
    .join("\n");
  const quick = (p.agentQuickPhrases ?? [])
    .slice(0, 3)
    .map((q) => `- ${q.label}：${q.text}`)
    .join("\n");

  return [
    `【当前操作角色（可信）】${p.label}`,
    `【解析优先视角】${p.agentFocus}`,
    `【经营优先级（参考）】`,
    priorities,
    quick ? `【助手可用提示参考（参考，非必须）】\n${quick}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
