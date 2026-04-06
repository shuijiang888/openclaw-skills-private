# 给 Cursor 的指令（collab-008）

**task_id:** `collab-008`

## 背景

collab-007 验收通过（92/100），但发现两个必须修复的问题：
1. **Q1-Q4 基础信息缺失**——无法收集公司名称/行业/规模，CRM线索不完整
2. **报告页过于简单**——仅有文字列表，没有可视化

本轮对 Cursor 提出更高要求：
- 增加 **雷达图**（6维度得分对比可视化）
- 增加 **PDF导出**（html2pdf.js）
- 增加 **配置化**（销售可自定义公司名/预约链接）
- 整体报告页设计升级为企业专业级

---

## 完成定义（DoD）

- [ ] `h5_questionnaire.html` 修复并增强，所有 DoD 项全部通过
- [ ] 基础信息4题（Q_B1～Q_B4）在Q1前插入，不影响后面26题编号
- [ ] 报告页有 **SVG雷达图**（6维度，动态绑定数据，非静态图）
- [ ] 报告页有 **PDF导出按钮**（html2pdf.js，点击生成下载）
- [ ] 报告页底部CTA的**预约链接可配置**（非硬编码alert）
- [ ] 整体报告页设计升级为企业专业报告风格（配色/版式）
- [ ] `./scripts/check-collab.sh` 更新绑定 collab-008
- [ ] `STATUS.md`：`task_id: collab-008`，`state: done`

---

## 参考文件（必须先读）

- `collaboration/marketing_diagnosis/mvp/h5_questionnaire.html` — 现有实现，Q1～Q26 逻辑不变
- `collaboration/marketing_diagnosis/scoring_model.md` — 评分规则
- `collaboration/marketing_diagnosis/report_template.md` — 报告结构参考

---

## 验收步骤

### Step 1：修复基础信息4题

在问卷开头（Q1前）插入企业基本信息一节，共4题：

```html
<!-- 新增：企业基本信息 -->
<section id="section-basic" class="card">
  <div class="section-label">📋 企业基本信息（必填）</div>
  
  <!-- Q_B1：填空 -->
  <div class="q-title">贵司名称是？</div>
  <input type="text" id="basic-name" placeholder="请输入公司全称" />
  
  <!-- Q_B2：单选 -->
  <div class="q-title">所属行业？</div>
  <div class="opts-row">
    <button type="button" class="opt" data-sc="1">制造业</button>
    <button type="button" class="opt" data-sc="2">服务业</button>
    <button type="button" class="opt" data-sc="3">科技/互联网</button>
    <button type="button" class="opt" data-sc="4">金融</button>
    <button type="button" class="opt" data-sc="5">其他</button>
  </div>
  
  <!-- Q_B3：单选 -->
  <div class="q-title">企业规模？</div>
  <div class="opts-row">
    <button type="button" class="opt" data-sc="1">50人以下</button>
    <button type="button" class="opt" data-sc="2">50-200人</button>
    <button type="button" class="opt" data-sc="3">200-1000人</button>
    <button type="button" class="opt" data-sc="4">1000人以上</button>
  </div>
  
  <!-- Q_B4：单选 -->
  <div class="q-title">成立年限？</div>
  <div class="opts-row">
    <button type="button" class="opt" data-sc="1">3年以下</button>
    <button type="button" class="opt" data-sc="2">3-10年</button>
    <button type="button" class="opt" data-sc="3">10年以上</button>
  </div>
</section>
```

**要求：**
- 插入后重新编号：问卷从Q_B1开始 → Q1→Q26（新增的4题叫QB1-QB4）
- state对象增加`basic: { name:'', industry: null, scale: null, years: null }`
- 基础信息作为第一屏展示，点击"开始答题"才进入QB1
- 总题数变成30题（4基础+26能力），进度条相应调整

### Step 2：设计SVG雷达图

报告页增加6维度雷达图（SVG实现，不依赖ECharts等库）：

```javascript
// 雷达图数据结构（6个维度）
var radarData = {
  labels: ['市场定位', '获客渠道', '销售管道', '客户成功', '团队激励', '数字化'],
  datasets: [{
    values: [weighted_d1, weighted_d2, weighted_d3, weighted_d4, weighted_d5, weighted_d6],
    max: [20, 20, 20, 15, 15, 10]  // 各维度满分
  }]
};
```

**SVG雷达图要求：**
- 6边形雷达图（蜘蛛网格式）
- 每个轴标注维度名称和当前得分/满分（如"市场定位 15/20"）
- 得分区域填充半透明蓝色
- 参考网格线（满分/75%/50%/25% 各一圈）
- 纯SVG + JavaScript动态绑定数据，无外部依赖
- 雷达图尺寸：300×300px，移动端居中显示

### Step 3：升级报告页设计

**整体风格：企业级专业报告**

```html
<!-- 报告页结构 -->
<div id="report-page">
  <header class="report-header">
    <h1>《企业营销能力诊断报告》</h1>
    <div class="report-meta">
      <span>{{公司名称}}</span>
      <span>{{诊断日期}}</span>
      <span>问卷编号：{{submission_id}}</span>
    </div>
  </header>
  
  <!-- 综合得分 -->
  <div class="score-hero">
    <div class="score-number">{{总分}}</div>
    <div class="score-label">综合得分 / 100</div>
    <div class="score-level">{{等级}}</div>
  </div>
  
  <!-- 雷达图 -->
  <div class="radar-section">
    <h2>六维度能力雷达</h2>
    <svg id="radar-chart" width="300" height="300"></svg>
    <div class="radar-legend">
      <!-- 各维度得分列表 -->
    </div>
  </div>
  
  <!-- TOP3问题 -->
  <div class="top3-section">
    <h2>核心问题 TOP3</h2>
    <!-- 按加权分最低的3个维度生成 -->
  </div>
  
  <!-- 预约CTA -->
  <div class="cta-section">
    <p>基于本次诊断，建议与营销专家进行30分钟一对一交流</p>
    <a href="{{booking_url}}" class="btn-book">立即预约专家咨询</a>
  </div>
  
  <!-- 导出按钮 -->
  <button id="btn-export-pdf">导出PDF报告</button>
</div>
```

**设计要求：**
- 报告页有独立CSS，风格：深蓝主色调，白色背景，专业报告感
- 字体层级清晰（标题/正文/数据）
- 雷达图区域有浅灰背景框
- CTA按钮大且醒目（触屏友好）

### Step 4：集成html2pdf.js

使用CDN引入html2pdf.js（不超过200KB）：

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

**PDF导出功能：**

```javascript
document.getElementById('btn-export-pdf').addEventListener('click', function() {
  var element = document.getElementById('report-page');
  var opt = {
    margin: 10,
    filename: '企业营销诊断报告_' + (state.basic.name || '企业') + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
});
```

**要求：**
- PDF文件名包含公司名称
- A4竖版
- 图片清晰度足够
- 导出时按钮显示"正在生成..."状态

### Step 5：预约链接配置化

**要求：**
- 在HTML文件顶部定义配置对象（销售可修改）：

```javascript
var CONFIG = {
  companyName: '纷享销客·中西南',
  bookingUrl: 'https://example.com/booking',  // 替换为实际预约链接
  hotline: '400-XXX-XXXX',
  reportTitle: '企业营销能力诊断报告'
};
```

- 预约按钮链接到`CONFIG.bookingUrl`（新窗口打开）
- 联系信息（电话）从CONFIG读取
- 报告中公司名称从`state.basic.name`读取

### Step 6：其他升级

**必做：**
- 进度条调整：总题数从26变为30（4基础+26能力）
- 基础信息收集后，点击"开始答题"按钮才进入QB1
- 报告页显示公司名称（在标题旁）
- 联系信息（Q26）中联系电话从CONFIG读取

**可选（若时间允许）：**
- 增加答题时长统计（报告中显示"答题时长X分钟"）
- 报告中增加"同类企业对比"（模拟数据）

---

## 非目标

- 不修改与本任务无关的脚本逻辑
- 不接入后端API（线索仍为演示alert）
- 不做CRM对接（Phase 2才做）
- 不修改`questionnaire_design.md`（保持独立文档）

---

## 安全约束

无高危操作。按 AGENTS.md 红线执行即可。

---

## 验收标准自检清单

- [ ] 双击HTML可直接打开
- [ ] 第一屏显示企业基本信息4题，填写后进入能力题
- [ ] 进度条正确（0～30题）
- [ ] 雷达图SVG动态生成，数据与得分一致
- [ ] 点击"导出PDF"可下载A4 PDF文件（文件名含公司名）
- [ ] 预约按钮链接到CONFIG.bookingUrl
- [ ] 报告页显示公司名称
- [ ] 移动端（375px）布局正常
- [ ] 企业微信打开无问题

---

## 加分项（完成后额外加分）

以下为"做了就更好"的功能，不做不影响验收：

- [ ] 雷达图有动画效果（从中心展开到各点）
- [ ] PDF导出有loading动画
- [ ] 报告中显示"行业Benchmark参考"（模拟数据，标注"样本量N=XX"）
- [ ] 分享截图按钮（一键生成分享图片）
