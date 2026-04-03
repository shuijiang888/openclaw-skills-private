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
};

export const ROLE_PLAYBOOK: Record<DemoRole, RolePlaybook> = {
  SALES_MANAGER: {
    label: "销售经理",
    dashboardIntro:
      "当前档聚焦落地询价：维护成本基准、系数与折扣叙事，及时提交审批。智能助手在总监档开放，可先用语义描述草稿后请上级把关。",
    priorities: [
      { title: "把成本与系数填实", detail: "材料/人工/费用与六项系数决定建议价与毛利口径。" },
      { title: "对齐客户评级与交期", detail: "评级与交期影响分流结论与助手解析权重。" },
      { title: "折扣透明可审计", detail: "提交前确认折扣带与所需审批角色一致。" },
    ],
    agentFocus:
      "操作者为一线销售经理：请在合规范围内给出系数微调建议，优先保证可批复、可交付，折扣与特批要求严格对应审批链；语气温和务实。",
    quoteExamples: [
      "标品目录料，客户要年框价，竞标激烈，交期可分批。",
      "老客户加急小批试产，有改板风险，需保毛利底线。",
      "新客户首单，账期 45 天，价格敏感但愿意长协。",
    ],
    managerChecklist: [
      "成本四项与业务口径一致（无遗漏制造/期间费用）。",
      "客户名称、评级、账期与 CRM/纷享记录对齐。",
      "交期与「加急/插单」描述与系数联动自洽。",
      "若折扣超出本档权限，材料里写清原因再提交审批。",
    ],
  },
  SALES_DIRECTOR: {
    label: "销售总监",
    dashboardIntro:
      "管控多条商机与折扣带：用工作台扫风险池，用智能助手批量对齐话术与系数策略。",
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
  },
  SALES_VP: {
    label: "销售副总裁",
    dashboardIntro:
      "投资组合视角：识别结构性低毛利、自动化通道潜力与大客户依赖，配合战略叙事做取舍。",
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
  },
  GM: {
    label: "总经理",
    dashboardIntro:
      "经营结果责任人：从工作台与控制台把握审批、主数据与客户健康度；特批必须可追踪。",
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
  },
};

export function getRolePlaybook(role: DemoRole): RolePlaybook {
  return ROLE_PLAYBOOK[role];
}

/** 拼入 Ollama user 消息：置于不可信输入之前，仅作角色视角说明 */
export function buildRoleAgentContextForPrompt(role: DemoRole): string {
  const p = ROLE_PLAYBOOK[role];
  return `【当前操作角色（可信）】${p.label}\n【解析优先视角】${p.agentFocus}`;
}
