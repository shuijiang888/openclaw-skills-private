window.UNIVERSAL_QUESTIONNAIRE_BUNDLE = {
  version: "universal_chenwei_v1",
  fingerprint: "universal-chenwei-h5 fingerprint",
  roles: [
    { id: "sales", text: "销售角色" },
    { id: "manager", text: "管理角色" },
    { id: "service", text: "服务角色" }
  ],
  salesModes: [
    { id: "direct", text: "直销模式" },
    { id: "channel", text: "渠道分销" },
    { id: "project", text: "项目制销售" },
    { id: "hybrid", text: "混合增长" }
  ],
  industries: [
    { id: "medical_device", text: "医疗器械" },
    { id: "energy", text: "能源电力" },
    { id: "smart_manufacturing", text: "智能制造" }
  ],
  segsByIndustry: {
    medical_device: [
      { id: "ivd", text: "IVD / 体外诊断" },
      { id: "device", text: "医疗设备（影像/手术/监护）" },
      { id: "material", text: "高值耗材" },
      { id: "home", text: "家用医疗器械" },
      { id: "other", text: "其他医疗器械" }
    ],
    energy: [
      { id: "grid", text: "电网" },
      { id: "generation", text: "发电" },
      { id: "storage", text: "储能" },
      { id: "pv_wind", text: "光伏/风电" },
      { id: "epc", text: "EPC 总包" },
      { id: "other", text: "其他" }
    ],
    smart_manufacturing: [
      { id: "discrete", text: "离散制造" },
      { id: "process", text: "流程制造" },
      { id: "assembly", text: "装配制造" },
      { id: "defense", text: "军工制造" },
      { id: "robot", text: "机器人产业" },
      { id: "other", text: "其他" }
    ]
  },
  questions: [
    { id: "U_Q1", dim: 0, type: "sc", title: "你的目标客户画像是否结构化且可复用？", options: [{k:"a",t:"已结构化并持续更新",s:5},{k:"b",t:"部分结构化",s:3},{k:"c",t:"主要靠经验",s:1}] },
    { id: "U_Q2", dim: 0, type: "sc", title: "对行业趋势与竞品变化的响应速度如何？", options: [{k:"a",t:"提前布局",s:5},{k:"b",t:"跟随响应",s:3},{k:"c",t:"被动应对",s:1}] },
    { id: "U_Q3", dim: 1, type: "mc", title: "线索质量主要问题（可多选）", options: [{k:"a",t:"无效线索多",s:2},{k:"b",t:"来源重复",s:2},{k:"c",t:"分发不均",s:1}] },
    { id: "U_Q4", dim: 1, type: "sc", title: "商机阶段定义与退出标准是否统一？", options: [{k:"a",t:"统一且可审计",s:5},{k:"b",t:"部分统一",s:3},{k:"c",t:"不统一",s:1}] },
    { id: "U_Q5", dim: 2, type: "sc", title: "跨部门（销售/市场/交付）协同效率如何？", options: [{k:"a",t:"高效",s:5},{k:"b",t:"一般",s:3},{k:"c",t:"经常卡点",s:1}] },
    { id: "U_Q6", dim: 2, type: "mc", title: "团队执行常见短板（可多选）", options: [{k:"a",t:"目标拆解不清",s:2},{k:"b",t:"过程跟进不足",s:2},{k:"c",t:"复盘机制薄弱",s:1}] },
    { id: "U_Q7", dim: 3, type: "sc", title: "CRM 在日常经营中的使用深度如何？", options: [{k:"a",t:"全流程使用",s:5},{k:"b",t:"核心环节使用",s:3},{k:"c",t:"基础录入为主",s:1}] },
    { id: "U_Q8", dim: 3, type: "sc", title: "关键数据是否能形成闭环看板？", options: [{k:"a",t:"实时闭环",s:5},{k:"b",t:"周度闭环",s:3},{k:"c",t:"临时统计",s:1}] },
    { id: "U_Q9", dim: 4, type: "sc", title: "你对外部咨询/系统共建的合作意愿如何？", options: [{k:"a",t:"强意愿",s:5},{k:"b",t:"有条件",s:3},{k:"c",t:"观望",s:1}] },
    { id: "U_Q10", dim: 4, type: "sc", title: "预算与里程碑规划是否清晰？", options: [{k:"a",t:"清晰",s:5},{k:"b",t:"部分清晰",s:3},{k:"c",t:"尚不清晰",s:1}] }
  ]
};
