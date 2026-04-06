# 给 Cursor 的指令（collab-005）

**task_id:** `collab-005`

## 背景

collab-004 产出了《汇川技术商机洞察报告》（collaboration/opportunity_insight_report.md），质量已验收（88/100）。本轮目标：将报告转化为一线销售能直接使用的"问答话术"，可用于销售培训、角色演练和客户拜访参考。

**依赖项：** collaboration/opportunity_insight_report.md（collab-004 产出）必须就绪。

## 完成定义（DoD）

- [ ] 新增文件 `collaboration/huichuan_sales_talktrack.md`
- [ ] 文件包含"开场话术 + 痛点问答 + 竞品应对 + 异议处理 + 促成话术"五类
- [ ] 每类至少 3-5 条实际可用的问答对
- [ ] 语气贴合工业制造业 B2B 销售场景，非泛泛而言
- [ ] 量化结果处注明"POC/授权后校准"（同报告保持一致）
- [ ] `./scripts/check-collab.sh` 退出码 0

## 验收步骤

1. **读已就绪的** `collaboration/opportunity_insight_report.md`，提炼汇川四大痛点和三条价值叙事
2. **写第一章：开场话术**（3-5条）
   - 基于汇川行业背景（工业自动化/制造业）的标准开场白
   - 每条含"顾问问什么"+"销售怎么答"
3. **写第二章：痛点切入问答**（4-6条）
   - 对应报告四大痛点（线索分散/长周期协同/客户分层/合规审计）
   - 每条含"客户问/异议"+"销售话术"
4. **写第三章：竞品应对话术**（3-5条）
   - 对标"国际SaaS（如Salesforce）"和"国产通用CRM"的差异化话术
5. **写第四章：常见异议处理**（3-5条）
   - 制造业大客户典型异议："已有SAP"/"预算在IT"/"等竞标"
   - 每条含异议类型 + 话术
6. **写第五章：促成与跟进话术**（3-5条）
   - POC后/报价后/高层拜访后的跟进话术
7. **更新 STATUS.md**：`task_id: collab-005`，`state: done`，`last_step: 完成汇川销售话术`

## 非目标

- 不修改与本任务无关的脚本逻辑（如需更新 check-collab.sh 明确说明）
- 不调用任何 API（不跑真实 FABM 查询）
- 不做真实客户接触
- 不修改已验收的 opportunity_insight_report.md

## 安全约束

无新增高危操作。按 AGENTS.md 红线执行即可。

## 样例产出

文件路径：`collaboration/huichuan_sales_talktrack.md`

格式参考：
```
# 汇川技术 — 销售话术手册

## 一、开场话术
### 场景：首次电话/拜访工业自动化企业
Q: ...（客户问）
A: ...（销售答）

## 二、痛点切入问答
### 痛点1：线索分散
Q: ...
A: ...

## 三、竞品应对
### 对标Salesforce
Q: ...
A: ...
```

---
**注：** 所有量化结果（ROI、数值）标注"需POC/授权后校准"，保持与商机洞察报告口径一致。
