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
  SDR: {
    label: "SDR",
    dashboardIntro:
      "当前档聚焦线索转商机与首次报价：把客户画像、场景与订阅包信息录全，尽快进入 Deal Desk 流程。",
    priorities: [
      { title: "线索质量达标", detail: "补齐行业、角色、预算与预计上线窗口，避免无效推进。" },
      { title: "订阅包信息完整", detail: "席位数、模块包与周期口径一致，便于后续 AE/售前接力。" },
      { title: "Deal Desk 可追溯", detail: "折扣原因写清，确保 Deal Desk 链和时间线可复盘。" },
    ],
    agentFocus:
      "操作者为 SDR：给出可执行、低风险的商机推进建议，优先强调信息完整性与流程合规。",
    quoteExamples: [
      "新客户首访，意向 30 席位，先要标准版月付试用。",
      "电商客户希望先上销售自动化，预算紧，要求两周上线。",
      "客户在对比两家 CRM，想先看移动端拜访能力。",
    ],
    managerChecklist: [
      "客户名称、行业、关键联系人与 CRM 档案一致。",
      "订阅周期（月付/年付）和席位数口径一致。",
      "若折扣触发 Deal Desk，备注中写清竞争态势与目标日期。",
      "商机阶段与下一步动作可被 AE/售前直接接手。",
    ],
    agentQuickPhrases: [
      { label: "+首轮推进", text: "本单已补齐客户画像与业务场景，请进入 Deal Desk 首轮评估。" },
      { label: "+折扣背景", text: "折扣原因：客户处于竞品替换窗口，需先以试用方案进入短名单。" },
      { label: "+试用说明", text: "建议先按标准订阅包试用，验收后再扩容与升级版本。" },
    ],
  },
  AE: {
    label: "AE",
    dashboardIntro:
      "负责成交推进与商业条款：平衡赢单概率、客单价与回款条件，按 Deal Desk 要求推进。",
    priorities: [
      { title: "条款组合优化", detail: "价格、周期、回款与上线承诺要联动，不只谈折扣。" },
      { title: "Deal Desk 命中项", detail: "明确当前折扣带、所需审批档和补充材料。" },
      { title: "赢单路径清晰", detail: "竞品对比、关键异议与下一次客户动作要可执行。" },
    ],
    agentFocus:
      "操作者为 AE：在成交概率与价格纪律之间给出可执行建议，强调可批复和可落地。",
    quoteExamples: [
      "客户希望首年年付 200 席位，但要求额外 15% 折扣。",
      "竞品报价更低，客户愿意接受分阶段上线换价格。",
      "集团客户想先买基础包，承诺季度扩容。",
    ],
    agentQuickPhrases: [
      { label: "+商业条款", text: "请结合周期、回款和上线里程碑，给出可批复的打包条款建议。" },
      { label: "+竞品回应", text: "请生成对竞品低价的回应口径，强调价值与落地确定性。" },
      { label: "+Deal Desk 备注", text: "本单进入 Deal Desk，请输出给销售经理复核的关键要点。" },
    ],
  },
  PRE_SALES: {
    label: "售前",
    dashboardIntro:
      "聚焦方案价值与可交付承诺：把业务场景、技术边界和上线风险转成成交支撑材料。",
    priorities: [
      { title: "POC 成功标准", detail: "明确里程碑、验收口径与客户责任边界。" },
      { title: "价值证据", detail: "将业务收益、效率提升与风险降低量化描述。" },
      { title: "交付风险披露", detail: "提前识别接口、数据和组织变更风险，避免过度承诺。" },
    ],
    agentFocus:
      "操作者为售前：输出专业、可落地的方案建议，兼顾技术可信度与商务可成交性。",
    quoteExamples: [
      "客户要求两周内完成 SFA 与企业微信集成演示。",
      "希望先做销售流程改造试点，再决定全员上线。",
      "担心数据迁移影响业务连续性，需要阶段性方案。",
    ],
    agentQuickPhrases: [
      { label: "+POC 目标", text: "请按 POC 成功标准拆解阶段目标、验收指标与风险兜底方案。" },
      { label: "+价值证明", text: "请补充业务价值量化口径，支持 AE 在 Deal Desk 评审中引用。" },
      { label: "+交付边界", text: "请明确接口、数据与客户侧资源依赖，避免超范围承诺。" },
    ],
  },
  SALES_MANAGER: {
    label: "销售经理",
    dashboardIntro:
      "负责 Deal Desk 队列与团队节奏：统一审批尺度，保证报价纪律和赢单效率。",
    priorities: [
      { title: "Deal Desk 队列健康", detail: "优先处理临近截止商机，避免卡在 Deal Desk。" },
      { title: "折扣结构可控", detail: "识别异常让利与高风险项目，统一批复口径。" },
      { title: "团队辅导闭环", detail: "用销售教练总结共性问题并沉淀话术模板。" },
    ],
    agentFocus:
      "操作者为销售经理：在执行效率与风险控制间做平衡，输出可执行的 Deal Desk 建议。",
    quoteExamples: [
      "本周多个商机同时进入 Deal Desk，需先处理高概率且高价值项目。",
      "某区域持续低价成交，需核查是否偏离定价纪律。",
      "售前反馈交付风险升高，需要调整成交承诺节奏。",
    ],
    agentQuickPhrases: [
      { label: "+队列优先级", text: "请按客户价值和赢单概率给出 Deal Desk 队列优先级建议。" },
      { label: "+批复口径", text: "请整理本单 Deal Desk 结论与限制条件，便于团队执行一致。" },
      { label: "+复盘项", text: "请给出本单可复用的教练要点，沉淀到团队打法中。" },
    ],
  },
  VP: {
    label: "VP",
    dashboardIntro:
      "从组合经营视角管理全盘：把客户价值、赢单概率和资源投入做结构化取舍。",
    priorities: [
      { title: "组合结构", detail: "关注高价值低概率和低价值高概率项目的资源配置。" },
      { title: "政策例外", detail: "超出销售经理档的折扣需有明确回收路径和复盘机制。" },
      { title: "治理与可观测", detail: "维护规则、阈值与审计数据的一致性，保障策略执行。" },
    ],
    agentFocus:
      "操作者为 VP：建议需体现组合管理与政策治理，突出风险、回收路径与执行闭环。",
    quoteExamples: [
      "重点客户希望年度框架大幅让利，需评估长期回收路径。",
      "多个高价值商机同时推进，需决定售前资源倾斜顺序。",
      "区域策略差异导致成交率波动，需统一 Deal Desk 评审尺度。",
    ],
    agentQuickPhrases: [
      { label: "+组合决策", text: "请按客户价值×赢单概率给出资源倾斜与 Deal Desk 策略建议。" },
      { label: "+例外治理", text: "本单若突破常规折扣，请明确回收路径、责任人与复盘节点。" },
      { label: "+一致性核查", text: "请检查建议是否与当前阈值和 Deal Desk 规则一致，并标注偏差。" },
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
