window.UNIVERSAL_QUESTIONNAIRE_BUNDLE = {
  version: "universal_v1",
  industries: {
    medical_device: {
      label: "医疗器械行业",
      segments: [
        { id: "ivd", text: "IVD / 体外诊断" },
        { id: "device", text: "医疗设备（影像/手术/监护）" },
        { id: "material", text: "高值耗材（骨科/心血管等）" },
        { id: "home", text: "家用医疗器械" },
        { id: "other", text: "其他医疗器械" }
      ],
      questionnaireVersion: "medical_v2",
      scoringModelVersion: "score_v1_9",
      reportTitle: "医疗器械营销能力诊断报告",
      dims: [
        { name: "市场定位", maxW: 20 },
        { name: "获客渠道", maxW: 20 },
        { name: "销售推进", maxW: 20 },
        { name: "客户成功", maxW: 15 },
        { name: "组织协同", maxW: 15 },
        { name: "数字化应用", maxW: 10 }
      ],
      questions: [
        { id: "M1_Q1", dim: 0, type: "sc", title: "对行业政策与采购机制的理解程度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M1_Q2", dim: 1, type: "sc", title: "学术推广到商机转化闭环是否清晰？", options: [{k:"a",t:"清晰",s:5},{k:"b",t:"一般",s:3},{k:"c",t:"不清晰",s:1}] },
        { id: "M1_Q3", dim: 2, type: "sc", title: "关键项目推进是否有统一方法？", options: [{k:"a",t:"有",s:5},{k:"b",t:"部分有",s:3},{k:"c",t:"没有",s:1}] },
        { id: "M1_Q4", dim: 4, type: "sc", title: "跨部门协作效率如何？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M2_Q1", dim: 3, type: "sc", title: "售后与复购机制成熟度如何？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M2_Q2", dim: 5, type: "sc", title: "CRM 及数据工具应用程度？", options: [{k:"a",t:"深度",s:5},{k:"b",t:"中等",s:3},{k:"c",t:"浅层",s:1}] },
        { id: "M2_Q3", dim: 1, type: "sc", title: "渠道协同机制是否稳定？", options: [{k:"a",t:"稳定",s:5},{k:"b",t:"一般",s:3},{k:"c",t:"不稳定",s:1}] },
        { id: "M2_Q4", dim: 0, type: "sc", title: "产品价值表达是否分层精准？", options: [{k:"a",t:"精准",s:5},{k:"b",t:"一般",s:3},{k:"c",t:"薄弱",s:1}] },
        { id: "M3_Q1", dim: 2, type: "sc", title: "商机阶段定义与退出标准是否统一？", options: [{k:"a",t:"统一",s:5},{k:"b",t:"部分统一",s:3},{k:"c",t:"不统一",s:1}] },
        { id: "M3_Q2", dim: 5, type: "sc", title: "AI 辅助经营应用程度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] }
      ]
    },
    energy: {
      label: "能源电力行业",
      segments: [
        { id: "grid", text: "电网" },
        { id: "generation", text: "发电" },
        { id: "storage", text: "储能" },
        { id: "pv_wind", text: "光伏/风电" },
        { id: "epc", text: "EPC 总包" },
        { id: "other", text: "其他" }
      ],
      questionnaireVersion: "energy_v1",
      scoringModelVersion: "score_v1_9",
      reportTitle: "能源电力行业营销诊断报告",
      dims: [
        { name: "市场与认知", maxW: 25 },
        { name: "经营与痛点治理", maxW: 25 },
        { name: "数字化能力", maxW: 25 },
        { name: "转型与合作意向", maxW: 25 }
      ],
      questions: [
        { id: "M1_Q1", dim: 0, type: "sc", title: "对细分赛道竞争格局认知深度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M1_Q2", dim: 0, type: "sc", title: "项目型销售机制标准化程度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M1_Q3", dim: 1, type: "sc", title: "项目周期长问题治理能力？", options: [{k:"a",t:"强",s:5},{k:"b",t:"中",s:3},{k:"c",t:"弱",s:1}] },
        { id: "M1_Q4", dim: 1, type: "sc", title: "政企关系维护是否体系化？", options: [{k:"a",t:"体系化",s:5},{k:"b",t:"部分体系化",s:3},{k:"c",t:"未体系化",s:1}] },
        { id: "M2_Q1", dim: 2, type: "sc", title: "CRM 使用深度如何？", options: [{k:"a",t:"深度",s:5},{k:"b",t:"中等",s:3},{k:"c",t:"浅层",s:1}] },
        { id: "M2_Q2", dim: 2, type: "sc", title: "数据孤岛影响程度？", options: [{k:"a",t:"低",s:5},{k:"b",t:"中",s:3},{k:"c",t:"高",s:1}] },
        { id: "M2_Q3", dim: 3, type: "sc", title: "合作模式与预算规划清晰度？", options: [{k:"a",t:"清晰",s:5},{k:"b",t:"一般",s:3},{k:"c",t:"不清晰",s:1}] },
        { id: "M2_Q4", dim: 3, type: "sc", title: "标杆共建意愿强度？", options: [{k:"a",t:"强",s:5},{k:"b",t:"中",s:3},{k:"c",t:"弱",s:1}] },
        { id: "M3_Q1", dim: 1, type: "sc", title: "投标策略复用能力？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M3_Q2", dim: 2, type: "sc", title: "AI/IoT 经营应用成熟度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] }
      ]
    },
    smart_manufacturing: {
      label: "智能制造行业",
      segments: [
        { id: "discrete", text: "离散制造" },
        { id: "process", text: "流程制造" },
        { id: "assembly", text: "装配制造" },
        { id: "defense", text: "军工制造" },
        { id: "robot", text: "机器人产业" },
        { id: "other", text: "其他" }
      ],
      questionnaireVersion: "smart_mfg_v1",
      scoringModelVersion: "score_v1_9",
      reportTitle: "智能制造营销能力诊断报告",
      dims: [
        { name: "市场定位", maxW: 20 },
        { name: "获客渠道", maxW: 20 },
        { name: "销售推进", maxW: 20 },
        { name: "客户成功", maxW: 15 },
        { name: "组织协同", maxW: 15 },
        { name: "数字化应用", maxW: 10 }
      ],
      questions: [
        { id: "M1_Q1", dim: 0, type: "sc", title: "赛道趋势与客户诉求理解程度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M1_Q2", dim: 1, type: "sc", title: "渠道分销与直销协同成熟度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M1_Q3", dim: 2, type: "sc", title: "项目型销售标准化程度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M1_Q4", dim: 4, type: "sc", title: "跨部门协同效率如何？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M2_Q1", dim: 3, type: "sc", title: "交付周期与客户满意稳定性？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M2_Q2", dim: 5, type: "sc", title: "ERP/MES/CRM 数据打通程度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M2_Q3", dim: 5, type: "sc", title: "AI 应用于经营分析成熟度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] },
        { id: "M2_Q4", dim: 4, type: "sc", title: "合作与共建意愿强度？", options: [{k:"a",t:"强",s:5},{k:"b",t:"中",s:3},{k:"c",t:"弱",s:1}] },
        { id: "M3_Q1", dim: 1, type: "sc", title: "渠道冲突治理能力如何？", options: [{k:"a",t:"强",s:5},{k:"b",t:"中",s:3},{k:"c",t:"弱",s:1}] },
        { id: "M3_Q2", dim: 2, type: "sc", title: "关键项目复盘机制成熟度？", options: [{k:"a",t:"高",s:5},{k:"b",t:"中",s:3},{k:"c",t:"低",s:1}] }
      ]
    }
  }
};
