# 《企业营销能力诊断报告》（Markdown 模板）

> 占位符约定：`{{变量名}}`。由报告引擎替换。  
> 诊断版本：`{{report_version}}`（如 `marketing-diagnosis/1.0`）。

---

# 企业营销能力诊断报告

> **诊断日期：** {{diagnosis_date}}  
> **被诊断企业：** {{company_name}}（{{industry_hint}}）  
> **诊断版本：** {{report_version}}  
> **问卷提交 ID：** {{submission_id}}

---

## 一、概览

- **综合得分：** {{total_score}} / 100（**{{level_name}}**）
- **雷达维度（文字描述）：**  
  - 市场定位 {{d1_weighted}} / 20  
  - 获客渠道 {{d2_weighted}} / 20  
  - 销售管道 {{d3_weighted}} / 20  
  - 客户成功 {{d4_weighted}} / 15  
  - 团队激励 {{d5_weighted}} / 15  
  - 数字化 {{d6_weighted}} / 10  

- **核心发现（3 条）：**  
  1. {{insight_1}}  
  2. {{insight_2}}  
  3. {{insight_3}}  

---

## 二、分维度详解

### 2.1 市场定位与目标客户（得分 {{d1_weighted}} / 20）

- **评价：** {{d1_comment}}  
- **关键问题：** {{d1_issues}}  
- **改进建议：** {{d1_actions}}  

### 2.2 获客渠道与线索质量（得分 {{d2_weighted}} / 20）

- **评价：** {{d2_comment}}  
- **关键问题：** {{d2_issues}}  
- **改进建议：** {{d2_actions}}  

### 2.3 销售管道与赢单率（得分 {{d3_weighted}} / 20）

- **评价：** {{d3_comment}}  
- **关键问题：** {{d3_issues}}  
- **改进建议：** {{d3_actions}}  

### 2.4 客户成功与续费/复购（得分 {{d4_weighted}} / 15）

- **评价：** {{d4_comment}}  
- **关键问题：** {{d4_issues}}  
- **改进建议：** {{d4_actions}}  

### 2.5 团队架构与激励机制（得分 {{d5_weighted}} / 15）

- **评价：** {{d5_comment}}  
- **关键问题：** {{d5_issues}}  
- **改进建议：** {{d5_actions}}  

### 2.6 数字化工具与数据应用（得分 {{d6_weighted}} / 10）

- **评价：** {{d6_comment}}  
- **关键问题：** {{d6_issues}}  
- **改进建议：** {{d6_actions}}  

---

## 三、核心问题 TOP3

### TOP1：{{top1_title}}

- **问题描述：** {{top1_desc}}  
- **为什么重要：** {{top1_why}}  
- **建议行动：** {{top1_action}}  

### TOP2：{{top2_title}}

- **问题描述：** {{top2_desc}}  
- **为什么重要：** {{top2_why}}  
- **建议行动：** {{top2_action}}  

### TOP3：{{top3_title}}

- **问题描述：** {{top3_desc}}  
- **为什么重要：** {{top3_why}}  
- **建议行动：** {{top3_action}}  

---

## 四、解决方案建议（按紧迫程度）

| 排序 | 关联问题 | 方案概要 | 预期效果 | 适合服务类型 |
|------|----------|----------|----------|--------------|
| P0 | {{s1_problem}} | {{s1_solution}} | {{s1_outcome}} | {{s1_service}} |
| P1 | {{s2_problem}} | {{s2_solution}} | {{s2_outcome}} | {{s2_service}} |
| P2 | {{s3_problem}} | {{s3_solution}} | {{s3_outcome}} | {{s3_service}} |

**服务类型枚举建议：** 公开课培训 / 企业内训 / 管理咨询 / 陪跑教练 / AI+CRM 实施与运营。

---

## 五、下一步行动建议

### 立即可做（本周）

- {{week_action_1}}  
- {{week_action_2}}  

### 短期改善（1–3 个月）

- {{short_action_1}}  
- {{short_action_2}}  

### 中长期提升（3–12 个月）

- {{long_action_1}}  
- {{long_action_2}}  

---

## 六、我们的服务推荐

- **与 TOP3 的对应关系：** {{service_mapping}}  
- **推荐组合：** {{bundle_recommendation}}  
- **若需量化 ROI 叙事：** 请在 POC 或授权尽调后更新数据（与 collab-004/005 口径一致）。

---

## 七、预约专家咨询

{{cta_intro}}

- **预约链接：** {{booking_url}}  
- **二维码：** （嵌入 {{booking_qr_image_url}}）  
- **联系电话：** {{sales_hotline}}  
- **工作时间：** {{office_hours}}  

---

## 附录（可选）

- **答题时长：** {{duration_sec}} 秒  
- **可信度标记：** {{trust_flag}}  
- **原始答题 JSON ID：** {{raw_payload_ref}}  
