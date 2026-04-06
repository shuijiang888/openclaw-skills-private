# 给 Cursor 的指令（collab-010）

**task_id:** `collab-010`

## 背景

collab-009 完成了制造业营销诊断系统。本轮目标：打造医疗器械行业版，包含三个独立模块：
1. **医疗器械行业问卷**（26题，行业选项定制）
2. **AI诊断建议**（调用LLM API，根据6维度得分生成个性化建议）
3. **行业Benchmark对比**（模拟数据，显示"您在行业中的位置"）

**最终目标：** 一套可部署的医疗器械行业营销诊断系统，覆盖制造业/医疗器械双版本。

---

## 完成定义（DoD）

- [ ] `marketing_diagnosis/medical_device/questionnaire_medical.md` — 医疗器械行业问卷（26题，行业定制选项）
- [ ] `marketing_diagnosis/medical_device/h5_medical.html` — 医疗器械H5问卷（基于现有H5改造行业选项）
- [ ] `marketing_diagnosis/medical_device/benchmark_data.md` — 行业Benchmark数据（制造业/医疗器械/能源三行业）
- [ ] `marketing_diagnosis/medical_device/ai_diagnosis.md` — AI诊断建议设计文档（LLM API集成方案）
- [ ] `marketing_diagnosis/medical_device/h5_with_ai_benchmark.html` — 含AI建议+Benchmark的增强版H5
- [ ] `./scripts/check-collab.sh` 更新绑定 collab-010
- [ ] `STATUS.md`：`task_id: collab-010`，`state: done`

---

## 参考文件（必须先读）

- `collaboration/marketing_diagnosis/mvp/h5_questionnaire.html` — 现有制造业H5（改行业选项的基准）
- `collaboration/marketing_diagnosis/scoring_model.md` — 评分模型（不变）
- `collaboration/marketing_diagnosis/medical_device/questionnaire_medical.md`（新增问卷在此写入）
- `collaboration/marketing_diagnosis/medical_device/benchmark_data.md`（Benchmark数据）

---

## 验收步骤

### Step 1：设计医疗器械行业问卷（questionnaire_medical.md）

**要求：**
- 基于制造业问卷的结构（6维度×4题），替换行业相关选项
- 保留26题结构，替换Q1（目标客户）/Q2（战略重点）/Q5（获客渠道）/Q12（客户类型）等涉及行业特征的选择项

**行业定制要点：**

| 维度 | 制造业原选项 | 医疗器械定制选项 |
|------|-------------|----------------|
| D1-Q1 | ICP文档化/未成文/老板经验/机会驱动 | 医院/经销商/政府集采/基层医疗/OTC连锁 |
| D1-Q2 | 守住基本盘/新行业/灯塔案例/渠道扩张/出海 | 集采中标/基层覆盖/器械国产替代/学术推广/设备更新 |
| D2-Q5 | 官网/展会/转介绍/渠道/内容/电销 | 学术会议/医院采购/经销商/招投标平台/医生推荐 |
| D3-Q12 | 铁三角/项目制/单兵 | 招投标/物价审批/经销商管理/临床支撑 |
| D4-Q14 | 续约/增购 | 设备维保/耗材复购/学术合作/设备更新 |
| D5-Q18 | 新人存活/培养体系 | 经销商培训/临床培训/法规合规培训 |
| D6-Q21 | CRM/SAP/表格邮件 | HIS系统/耗材管理系统/招投标系统/合规审计 |

**输出格式：**
```markdown
# 医疗器械行业营销诊断问卷

## 维度一：市场定位与目标客户（D1）

### Q1（SC）贵司的主要目标客户是？
- A：三级医院（大型三甲）（5分）
- B：二级医院（县域中心）（3分）
- C：基层医疗机构（社区/乡镇）（2分）
- D：经销商/代理商（1分）
- E：政府集中采购/卫健委（1分）

### Q2（MC）未来12个月战略重点？（最多选2项）
- □ 集采中标与放量（2分）
- □ 基层医疗市场覆盖（2分）
- □ 器械国产替代政策红利（2分）
- □ 学术推广与临床数据（2分）
- □ 设备更新改造（2分）
```

**覆盖的医疗器械细分赛道（问卷说明中体现）：**
- 高值耗材（骨科/心血管/神经外科）
- 医疗设备（影像/检验/手术机器人）
- IVD（体外诊断）
- 家用医疗器械

### Step 2：生成医疗器械H5（h5_medical.html）

**要求：**
- 复制 `h5_questionnaire.html` 为基准
- 替换所有行业相关选项（使用 Step 1 的问卷内容）
- 替换CONFIG中的说明文字（"本问卷适用于医疗器械行业"）
- 整体样式与制造业版保持一致（深蓝主色调）
- 计分逻辑不变（D1-D6权重不变）

**输出：** `marketing_diagnosis/medical_device/h5_medical.html`

### Step 3：设计行业Benchmark数据（benchmark_data.md）

**要求：**
收集或估算三个行业的平均分数据：

```markdown
# 行业Benchmark数据

## 数据说明
以下数据为行业研究估算值，实际使用时标注"基于N家样本企业调研，样本量N=XX"。

## 行业综合得分分布

| 行业 | 平均分 | 中位数 | 卓越(90+)占比 | 良好(70-89)占比 | 一般(50-69)占比 | 薄弱(<50)占比 |
|------|--------|--------|-------------|----------------|----------------|--------------|
| 制造业 | 62 | 65 | 8% | 25% | 45% | 22% |
| 医疗器械 | 55 | 58 | 5% | 18% | 42% | 35% |
| 能源 | 68 | 70 | 12% | 32% | 38% | 18% |

## 各维度行业平均分

| 维度 | 制造业 | 医疗器械 | 能源 |
|------|--------|---------|------|
| D1 市场定位 | 13/20 | 11/20 | 15/20 |
| D2 获客渠道 | 11/20 | 9/20 | 13/20 |
| D3 销售管道 | 12/20 | 10/20 | 14/20 |
| D4 客户成功 | 13/15 | 11/15 | 14/15 |
| D5 团队激励 | 10/15 | 9/15 | 12/15 |
| D6 数字化 | 7/10 | 6/10 | 9/10 |

## Benchmark使用说明

在报告中显示：
"您的综合得分（75分）在医疗器械行业中超过了78%的企业，处于行业良好水平。"

计算方式：
-  percentile = (1 - (您的分数 - 行业平均) / 标准差) × 100
- 简化为：percentile = min(99, max(1, 50 + (您的分数 - 行业平均) × 2))
```

### Step 4：设计AI诊断建议方案（ai_diagnosis.md）

**要求：**
```markdown
# AI诊断建议设计方案

## 目标
根据客户6维度得分，自动生成个性化"改进建议"，不是泛泛而言，而是针对客户具体薄弱项的定制化建议。

## 技术方案

### 方案A：纯客户端（无后端，MVP）
- 使用Google Gemini API（免费，无配额限制）或 KIMI API
- 前端直接调用，敏感信息脱敏后发送
- 示例Prompt：
```
你是一位医疗器械行业营销顾问。根据以下企业诊断得分，生成3条最优先的改进建议：
- 综合得分：{总分}/100（{等级}）
- D1市场定位：{d1}/20
- D2获客渠道：{d2}/20
- D3销售管道：{d3}/20
- D4客户成功：{d4}/15
- D5团队激励：{d5}/15
- D6数字化：{d6}/10
行业：医疗器械
要求：
1. 每条建议针对得分最低的维度
2. 建议要具体，可执行
3. 包含1个医疗器械行业的实际案例或做法
4. 总字数不超过300字
```

### 方案B：后端API（生产环境）
- Node.js后端调用LLM API
- 结果缓存30分钟
- 敏感数据不外送

## 输出格式

报告页增加"AI改进建议"区域：

```html
<div id="ai-advice-section">
  <h2>🤖 AI 改进建议</h2>
  <div id="ai-advice-content">
    <!-- AI生成内容显示在这里 -->
  </div>
  <button id="btn-generate-advice">生成AI建议</button>
</div>
```

## 按钮文案与交互

- 按钮文案："🤖 获取AI改进建议"（不是"分析"）
- 点击后显示："正在生成个性化建议，请稍候..."
- 生成后内容以Markdown格式显示
- 建议底部加免责声明："AI建议仅供参考，结合实际情况决策"

## API密钥配置

在CONFIG中增加：
```javascript
var CONFIG = {
  // ... 现有配置 ...
  LLM_API_KEY: 'your_kimi_or_gemini_api_key',
  LLM_PROVIDER: 'kimi',  // 'kimi' 或 'gemini'
  LLM_API_URL: 'https://api.moonshot.cn/v1/chat/completions'
};
```

## 免责声明（必须显示）

在AI建议区域底部：
```
⚠️ AI建议基于行业通用数据生成，具体实施方案请结合贵司实际情况，并咨询专业人士意见。
```
```

### Step 5：整合成完整H5（含AI+Benchmark）（h5_with_ai_benchmark.html）

**要求：**
在医疗器械H5的基础上，集成Benchmark和AI建议两个功能：

#### 5.1 Benchmark整合
在报告页增加"行业对比"区域：

```html
<div class="benchmark-section">
  <h3>📊 行业对比</h3>
  <p>您的得分（<strong>{{total_score}}分</strong>）在医疗器械行业中超过了 <strong>{{percentile}}%</strong> 的企业</p>
  
  <!-- 简易柱状图（CSS实现） -->
  <div class="benchmark-bar">
    <div class="benchmark-yours" style="width: {{total_score}}%"></div>
    <div class="benchmark-industry" style="width: 55%"></div>
  </div>
  <div class="benchmark-legend">
    <span class="you">● 您的得分</span>
    <span class="industry">● 医疗器械行业平均</span>
  </div>
</div>
```

#### 5.2 AI建议整合
在报告页增加AI建议区域（调用Step 4的API）：

```html
<div class="ai-advice-section">
  <h3>🤖 AI 改进建议</h3>
  <div id="ai-advice-content">
    <p class="ai-placeholder">点击下方按钮，获取针对您企业的个性化改进建议</p>
  </div>
  <button id="btn-generate-advice" class="btn btn-secondary">
    🤖 获取AI改进建议
  </button>
  <p class="ai-disclaimer">⚠️ AI建议仅供参考，结合实际情况决策</p>
</div>
```

#### 5.3 JavaScript逻辑

```javascript
// 行业Benchmark数据
var BENCHMARK = {
  medical_device: { avg: 55, std: 15 },
  manufacturing: { avg: 62, std: 14 },
  energy: { avg: 68, std: 13 }
};

// 计算行业排名
function calcPercentile(score, industry) {
  var data = BENCHMARK[industry] || BENCHMARK.manufacturing;
  var percentile = Math.min(99, Math.max(1, 
    Math.round(50 + (score - data.avg) / data.std * 25)
  ));
  return percentile;
}

// AI建议生成
document.getElementById('btn-generate-advice').addEventListener('click', function() {
  var btn = this;
  var content = document.getElementById('ai-advice-content');
  btn.disabled = true;
  btn.textContent = '正在生成...';
  
  // 调用LLM API
  fetch(CONFIG.LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + CONFIG.LLM_API_KEY
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages: [{
        role: 'user',
        content: buildMedicalAdvicePrompt(res)
      }]
    })
  }).then(r => r.json())
    .then(data => {
      content.innerHTML = '<div class="ai-advice">' + parseMarkdown(data.choices[0].message.content) + '</div>';
      btn.textContent = '重新生成';
      btn.disabled = false;
    })
    .catch(err => {
      content.innerHTML = '<p class="error">生成失败，请稍后重试</p>';
      btn.disabled = false;
      btn.textContent = '🤖 获取AI改进建议';
    });
});
```

---

## 非目标

- 不实际部署后端（AI API在前端调用，MVP够用）
- 不获取真实API密钥（配置为占位符，销售配置时替换）
- 不修改制造业版本（两个版本独立存在）
- 不做PDF导出（制造业版已有）

---

## 安全约束

无高危操作。按 AGENTS.md 红线执行即可。

---

## 验收标准自检清单

- [ ] `questionnaire_medical.md` 存在，26题行业定制，医疗器械行业特征明显
- [ ] `h5_medical.html` 可在浏览器打开，行业选项已替换
- [ ] `benchmark_data.md` 包含三行业数据（D1-D6平均分）
- [ ] `ai_diagnosis.md` 包含Prompt模板和API配置方案
- [ ] `h5_with_ai_benchmark.html` 包含Benchmark柱状图和AI建议按钮
- [ ] Benchmark计算函数正确（percentile = 50 + (score - avg) / std × 25）
- [ ] AI建议按钮可点击（实际API调用需要配置密钥）
- [ ] 医疗版与制造业版视觉风格一致
- [ ] check-collab.sh 通过
