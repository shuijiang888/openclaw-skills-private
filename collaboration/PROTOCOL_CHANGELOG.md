# Protocol 变更日志

## v1.0（collab-001 前）

- 初始约定：`HANDOFF` + `STATUS` + `check-collab.sh`

## v1.1（collab-002 后）

- 新增：`TEMPLATE.md` 标准任务模板
- 改进：复盘机制，Cursor 每轮可在 `retrospectives/` 留档
- 改进：`CURRENT_TASK.md` 保持纯叙述；YAML 运行态只在 `STATUS.md`

## v1.2（collab-003）

- 新增：`HEALTH_CHECKLIST.md` 交接质量门禁（OpenClaw 写 HANDOFF 前自检）
- 新增：本变更日志，协议演进可追踪
- 目标：减少模糊 DoD、边界遗漏与返工

## v1.3（collab-004）

- 改进：`CURRENT_TASK.md` 保持纯人类可读叙述，不含 YAML 状态块
- 改进：写 HANDOFF 前先过 HEALTH_CHECKLIST（必填项必填）
- 新增：collab-004 引入真实业务任务，验证协议对复杂场景的承载能力
- 改进：collab-004-non-goal-vs-dod.md 记录「非目标」与 DoD 冲突问题，下轮 HANDOFF 规范措辞

## v1.4（collab-005）

- 改进：「非目标」字段措辞规范为「不修改与本任务无关的脚本逻辑」，避免与 DoD/验收冲突
- 新增：HANDOFF 明确标注「如需更新 check-collab.sh 须在任务内说明」，避免隐式修改

## v1.5（collab-006）

- 新增：Phase 1 设计任务（五文一系统：问卷设计/评分模型/报告模板/架构设计/用户旅程）
- 目标：构建「企业营销诊断 Skill」系统，驱动客户预约咨询
- 创新点：问卷→诊断报告→CRM线索 全链路设计

## v1.6（collab-007）

- 新增：Phase 2 开发任务（问卷H5 MVP原型）
- 范围：静态HTML问卷（26题）+ 浏览器内计分 + 报告摘要展示
- 里程碑：从设计文档→可运行原型，验证用户体验

## v1.7（collab-008）

- 升级：问卷H5 MVP → 企业级专业版
- 新增：基础信息4题（Q_B1-Q_B4）
- 新增：SVG雷达图（动态绑定6维度数据，无外部依赖）
- 新增：html2pdf.js PDF导出（A4，含公司名称）
- 新增：配置化（CONFIG对象，销售可自定义预约链接）
- 加分项：雷达图动画/PDF loading动画/行业Benchmark/分享图

## v1.8（collab-009）

- 新增：企业营销诊断系统完整设计文档
- 输出：openapi_integration + database_schema + backend_api + deployment_guide + crm_workflow
- 目标：从H5→完整系统，Agent1/2可照此直接开发部署
- 里程碑：腾讯云部署，/diag/*路由，纷享CRM OpenAPI对接

## v1.9（collab-010）

- 新增：医疗器械行业版营销诊断系统
- 包含1：行业定制问卷（26题，医疗器械特征选项）
- 包含2：行业Benchmark数据（制造业/医疗器械/能源三行业）；H5 分位估算：`calcPercentile(score)` ≈ `clamp(round(50 + (score - avg) / std * 25), 1, 99)`
- 包含3：AI诊断建议（LLM API集成，KIMI/Gemini；浏览器 CORS 受限时走后端代理）
- 里程碑：从单一制造业→双行业覆盖+AI增强+Benchmark对比
