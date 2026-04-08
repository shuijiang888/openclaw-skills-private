/* global fetch, localStorage, document, window, Chart */

const TOKEN_KEY = "srne_ops_token";
const USER_KEY = "srne_ops_user";

let appConfig = { demo_mode: false };

const chartColors = {
  primary: "rgba(61, 158, 239, 0.85)",
  primaryDim: "rgba(61, 158, 239, 0.2)",
  grid: "rgba(255, 255, 255, 0.08)",
  text: "#8b9aab",
  ok: "rgba(127, 217, 154, 0.8)",
  warn: "rgba(255, 204, 102, 0.85)",
  danger: "rgba(240, 113, 120, 0.75)",
};

/** 与网关子路径部署一致 */
function apiBase() {
  const p = window.location.pathname || "";
  if (p === "/srne" || p.startsWith("/srne/")) return "/srne";
  return "";
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(apiBase() + path, { ...opts, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: "invalid_json", raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function $(sel) {
  return document.querySelector(sel);
}

const __charts = [];
function destroyCharts() {
  while (__charts.length) {
    const c = __charts.pop();
    try {
      c.destroy();
    } catch (_) {}
  }
}
function regChart(ch) {
  if (ch) __charts.push(ch);
}

function applyChartDefaults() {
  if (typeof Chart === "undefined") return;
  Chart.defaults.color = chartColors.text;
  Chart.defaults.borderColor = chartColors.grid;
  Chart.defaults.font.family = '"DM Sans", system-ui, sans-serif';
}

function showView(name) {
  destroyCharts();
  document.querySelectorAll("[data-view]").forEach((el) => {
    el.classList.toggle("hidden", el.getAttribute("data-view") !== name);
  });
  document.querySelectorAll(".sidebar nav button").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-nav") === name);
  });
  $("#viewTitle").textContent =
    {
      dashboard: "运营总览",
      channels: "渠道商",
      channelDetail: "渠道商详情",
      intel: "市场情报",
      sales: "销售赋能",
      perf: "绩效看板",
      playbook: "业务作战台",
      valueMap: "全场景价值图谱",
      valueRoi: "价值量化 / ROI",
      alerts: "预警中心",
      import: "数据与录入",
    }[name] || "";
}

function parseUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function setAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
  updateShell();
}

function updateShell() {
  const user = parseUser();
  const authed = !!localStorage.getItem(TOKEN_KEY);
  $("#shellApp").classList.toggle("hidden", !authed);
  $("#shellLogin").classList.toggle("hidden", authed);
  if (user) {
    $("#userLabel").innerHTML = `<strong>${user.name}</strong> · ${user.role} · ${user.email}`;
  }
  const sales = !!(user && user.role === "sales");
  const hideImport = sales || appConfig.demo_mode;
  $("#navImport").classList.toggle("hidden", hideImport);
  const qa = $("#btnOpenQuickAdd");
  const qa2 = $("#btnOpenQuickAdd2");
  if (qa) qa.classList.toggle("hidden", sales || appConfig.demo_mode);
  if (qa2) qa2.classList.toggle("hidden", sales || appConfig.demo_mode);
}

async function fetchAppConfig() {
  try {
    const prefix = apiBase();
    const res = await fetch(prefix + "/v1/config");
    if (!res.ok) return;
    appConfig = await res.json();
    document.documentElement.classList.toggle("srne-demo-mode", !!appConfig.demo_mode);
  } catch (_) {
    appConfig = { demo_mode: false };
  }
}

function showCopyToast() {
  const t = $("#copyBriefToast");
  if (!t) return;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 2800);
}

async function copyExecutiveBriefing() {
  const lines = [
    "# 硕日海外渠道运营 · 高管简报",
    "",
    "生成时间: " + new Date().toLocaleString("zh-CN"),
    "",
  ];
  try {
    const pb = await api("/v1/scenarios/playbook");
    const tp = pb.target_pulse || {};
    const sla = pb.alert_sla_open || {};
    lines.push("## 目标脉搏");
    lines.push(`- ${tp.period_label || "—"}`);
    lines.push(`- 年出货 roll（演示）: ${tp.annual_revenue_roll_usd ?? "—"} USD`);
    lines.push(`- 演示达成指数: ${tp.proxy_attainment_pct ?? "—"}%`);
    lines.push("");
    lines.push("## 预警 SLA（未关）");
    lines.push(`- 合计: ${sla.total_open ?? 0} · Critical: ${sla.critical_open ?? 0}`);
    const b = sla.age_buckets || {};
    lines.push(`- 库龄 0–3 天: ${b.days_0_3 ?? 0} · 4–7 天: ${b.days_4_7 ?? 0} · ≥8 天: ${b.days_8_plus ?? 0}`);
    lines.push("");
    const cg = pb.coverage_gaps || {};
    lines.push("## 覆盖缺口");
    lines.push(`- 未分配负责人活跃渠道: ${cg.unassigned_active_channels ?? 0}`);
    lines.push(`- 有渠道但缺情报卡国家数: ${cg.active_countries_without_intel ?? 0}`);
    lines.push("");
    lines.push("## 优先动作（前 5）");
    (pb.priority_actions || []).slice(0, 5).forEach((a, i) => {
      lines.push(`${i + 1}. ${a.title} — ${a.detail}`);
    });
  } catch (_) {
    lines.push("（作战台数据暂不可用）");
  }
  try {
    const sc = await api("/v1/performance/scorecard");
    lines.push("");
    lines.push("## 绩效要点");
    const f = sc.bsc?.financial;
    if (f) {
      lines.push(
        `- 年出货 roll ${f.annual_revenue_roll_usd} USD · 达成指数 ${f.proxy_quarter_attainment_pct}% · A 类收入占比 ${f.a_class_revenue_share_pct}%`
      );
    }
    (sc.operational?.narrative || []).slice(0, 4).forEach((t) => lines.push(`- ${t}`));
  } catch (_) {
    lines.push("");
    lines.push("（绩效数据暂不可用）");
  }
  const text = lines.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showCopyToast();
  } catch (_) {
    window.prompt("请手动复制：", text);
  }
}

let valueMapLoaded = false;
async function loadValueMap() {
  const mount = $("#valueMapMount");
  if (!mount || valueMapLoaded) return;
  try {
    const prefix = apiBase();
    const res = await fetch(prefix + "/v1/demo/value-map-html");
    if (!res.ok) throw new Error("bad");
    mount.innerHTML = await res.text();
    valueMapLoaded = true;
  } catch (_) {
    mount.innerHTML =
      '<p class="muted">价值图谱加载失败，请刷新重试。若持续失败，请确认服务端已更新并包含 <code>value-map-snippet.html</code>。</p>';
  }
}

const VROI_STORAGE_KEY = "srne_vroi_inputs_v1";
const VROI_DEFAULTS = {
  sysFeeWan: 14,
  weekHrs: 26,
  effPct: 33,
  hourCostWan: 0.042,
  riskWan: 14,
  otherWan: 5,
};

function vroiNum(el, fallback) {
  const v = parseFloat(el && el.value);
  return Number.isFinite(v) ? v : fallback;
}

function computeVroiModel() {
  const sysFeeWan = Math.max(0, vroiNum($("#vroiSysFee"), VROI_DEFAULTS.sysFeeWan));
  const weekHrs = Math.max(0, vroiNum($("#vroiWeekHrs"), VROI_DEFAULTS.weekHrs));
  const effPct = Math.min(90, Math.max(0, vroiNum($("#vroiEffPct"), VROI_DEFAULTS.effPct)));
  const hourCostWan = Math.max(0, vroiNum($("#vroiHourCost"), VROI_DEFAULTS.hourCostWan));
  const riskWan = Math.max(0, vroiNum($("#vroiRiskWan"), VROI_DEFAULTS.riskWan));
  const otherWan = Math.max(0, vroiNum($("#vroiOtherWan"), VROI_DEFAULTS.otherWan));

  const weeksPerYear = 52;
  const laborBaselineWan = weekHrs * weeksPerYear * hourCostWan;
  const laborSaveWan = laborBaselineWan * (effPct / 100);
  const laborAfterWan = laborBaselineWan - laborSaveWan;
  const totalBenefitWan = laborSaveWan + riskWan + otherWan;
  const netWan = totalBenefitWan - sysFeeWan;
  const roiX = sysFeeWan > 0 ? netWan / sysFeeWan : null;
  const paybackMo = netWan > 0 && sysFeeWan > 0 ? sysFeeWan / (netWan / 12) : null;

  return {
    sysFeeWan,
    weekHrs,
    effPct,
    hourCostWan,
    riskWan,
    otherWan,
    laborBaselineWan,
    laborSaveWan,
    laborAfterWan,
    totalBenefitWan,
    netWan,
    roiX,
    paybackMo,
  };
}

function fmtWan(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const x = Math.round(n * 100) / 100;
  return x.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function renderVroi() {
  const r = computeVroiModel();
  const lab = $("#vroiEffPctLab");
  if (lab) lab.textContent = `${Math.round(r.effPct)}%`;

  const kpi = $("#vroiKpiRow");
  if (kpi) {
    const roiStr = r.roiX != null ? `${fmtWan(r.roiX)} 倍` : "—";
    const payStr = r.paybackMo != null ? `${fmtWan(r.paybackMo)} 月` : "—";
    kpi.innerHTML = `
      <div class="vroi-kpi"><div class="lab">年总收益（演示）</div><div class="val">${fmtWan(r.totalBenefitWan)} 万</div></div>
      <div class="vroi-kpi"><div class="lab">年净收益</div><div class="val">${fmtWan(r.netWan)} 万</div></div>
      <div class="vroi-kpi vroi-kpi-highlight"><div class="lab">ROI（倍）</div><div class="val">${roiStr}</div></div>
      <div class="vroi-kpi"><div class="lab">静态回收期</div><div class="val">${payStr}</div></div>
    `;
  }

  const tb = $("#vroiTbody");
  if (tb) {
    tb.innerHTML = `
      <tr>
        <td>工时相关成本</td>
        <td>${fmtWan(r.laborBaselineWan)}</td>
        <td>${fmtWan(r.laborAfterWan)}</td>
        <td><strong>${fmtWan(r.laborSaveWan)}</strong>（节省）</td>
      </tr>
      <tr>
        <td>风险与机会价值（演示）</td>
        <td>0</td>
        <td>${fmtWan(r.riskWan)}</td>
        <td><strong>${fmtWan(r.riskWan)}</strong></td>
      </tr>
      <tr>
        <td>其他硬节省</td>
        <td>0</td>
        <td>${fmtWan(r.otherWan)}</td>
        <td><strong>${fmtWan(r.otherWan)}</strong></td>
      </tr>
      <tr>
        <td><strong>年总收益（演示合计）</strong></td>
        <td colspan="2" class="muted small">工时节省 + 风险与机会 + 其他硬节省</td>
        <td><strong>${fmtWan(r.totalBenefitWan)}</strong></td>
      </tr>
      <tr>
        <td><strong>系统年费</strong></td>
        <td colspan="2" class="muted">—</td>
        <td><strong>−${fmtWan(r.sysFeeWan)}</strong></td>
      </tr>
      <tr>
        <td><strong>年净收益</strong></td>
        <td colspan="2" class="muted">—</td>
        <td><strong>${fmtWan(r.netWan)}</strong></td>
      </tr>
    `;
  }
}

function applyVroiDefaults() {
  const d = VROI_DEFAULTS;
  const m = {
    vroiSysFee: d.sysFeeWan,
    vroiWeekHrs: d.weekHrs,
    vroiEffPct: d.effPct,
    vroiHourCost: d.hourCostWan,
    vroiRiskWan: d.riskWan,
    vroiOtherWan: d.otherWan,
  };
  Object.entries(m).forEach(([id, val]) => {
    const el = $(`#${id}`);
    if (el) el.value = String(val);
  });
}

function saveVroiToStorage() {
  try {
    const d = VROI_DEFAULTS;
    const payload = {
      sysFeeWan: vroiNum($("#vroiSysFee"), d.sysFeeWan),
      weekHrs: vroiNum($("#vroiWeekHrs"), d.weekHrs),
      effPct: vroiNum($("#vroiEffPct"), d.effPct),
      hourCostWan: vroiNum($("#vroiHourCost"), d.hourCostWan),
      riskWan: vroiNum($("#vroiRiskWan"), d.riskWan),
      otherWan: vroiNum($("#vroiOtherWan"), d.otherWan),
    };
    localStorage.setItem(VROI_STORAGE_KEY, JSON.stringify(payload));
  } catch (_) {}
}

function loadVroiFromStorage() {
  try {
    const raw = localStorage.getItem(VROI_STORAGE_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (typeof o !== "object" || !o) return;
    const map = [
      ["vroiSysFee", "sysFeeWan"],
      ["vroiWeekHrs", "weekHrs"],
      ["vroiEffPct", "effPct"],
      ["vroiHourCost", "hourCostWan"],
      ["vroiRiskWan", "riskWan"],
      ["vroiOtherWan", "otherWan"],
    ];
    map.forEach(([id, key]) => {
      if (o[key] == null) return;
      const el = $(`#${id}`);
      if (el) el.value = String(o[key]);
    });
  } catch (_) {}
}

function bindValueRoi() {
  const ids = ["vroiSysFee", "vroiWeekHrs", "vroiEffPct", "vroiHourCost", "vroiRiskWan", "vroiOtherWan"];
  ids.forEach((id) => {
    const el = $(`#${id}`);
    if (!el) return;
    el.addEventListener("input", () => {
      renderVroi();
      saveVroiToStorage();
    });
  });
  $("#btnVroiReset")?.addEventListener("click", () => {
    applyVroiDefaults();
    try {
      localStorage.removeItem(VROI_STORAGE_KEY);
    } catch (_) {}
    renderVroi();
  });
  $("#btnVroiCopy")?.addEventListener("click", () => copyVroiMarkdown().catch((e) => alert(e.message)));
}

let valueRoiBound = false;
function loadValueRoi() {
  if (!valueRoiBound) {
    bindValueRoi();
    valueRoiBound = true;
  }
  loadVroiFromStorage();
  renderVroi();
}

async function copyVroiMarkdown() {
  const r = computeVroiModel();
  const lines = [
    "# 硕日渠道 OS · 价值量化对比（演示）",
    "",
    "## 参数",
    `- 系统年费：${fmtWan(r.sysFeeWan)} 万元/年`,
    `- 周工时：${fmtWan(r.weekHrs)} 小时`,
    `- 工时节省比例：${Math.round(r.effPct)}%`,
    `- 万元/小时：${fmtWan(r.hourCostWan)}`,
    `- 风险与机会价值：${fmtWan(r.riskWan)} 万元/年`,
    `- 其他硬节省：${fmtWan(r.otherWan)} 万元/年`,
    "",
    "## 结果",
    `- 年工时成本（现状）：${fmtWan(r.laborBaselineWan)} 万`,
    `- 工时节省额：${fmtWan(r.laborSaveWan)} 万`,
    `- 年总收益（演示）：${fmtWan(r.totalBenefitWan)} 万`,
    `- 年净收益：${fmtWan(r.netWan)} 万`,
    `- ROI：${r.roiX != null ? fmtWan(r.roiX) + " 倍" : "—"}`,
    `- 静态回收期：${r.paybackMo != null ? fmtWan(r.paybackMo) + " 月" : "—"}`,
    "",
    "_模型为前端演示，非审计或合同依据。_",
  ];
  const text = lines.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    const h = $("#vroiCopyHint");
    if (h) {
      h.textContent = "已复制 Markdown 摘要";
      setTimeout(() => {
        if (h) h.textContent = "";
      }, 2500);
    }
  } catch (_) {
    window.prompt("请手动复制：", text);
  }
}

function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "k";
  return String(Math.round(n));
}

function slaAgeLabel(ageDays, severity) {
  const n = Number(ageDays) || 0;
  let cls = "sla-ok";
  if (n >= 8) cls = "sla-bad";
  else if (n >= 4) cls = "sla-warn";
  if (severity === "critical" && n >= 3) cls = "sla-bad";
  return `<span class="sla-pill ${cls}">${n} 天</span>`;
}

const PLAYBOOK_KIND_LABEL = {
  alert_critical: "预警",
  ar_risk: "回款",
  stale_contact: "联络",
};

async function loadPlaybook() {
  const pb = await api("/v1/scenarios/playbook");
  const ul = $("#playbookScenarioBullets");
  ul.innerHTML = (pb.scenarios_intro || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");

  const tp = pb.target_pulse || {};
  $("#playbookPeriod").textContent = tp.period_label || "—";
  $("#playbookRev").textContent = fmtUsd(tp.annual_revenue_roll_usd);
  $("#playbookAtt").textContent = tp.proxy_attainment_pct != null ? String(tp.proxy_attainment_pct) : "—";
  $("#playbookTgt").textContent = fmtUsd(tp.target_ref_quarter_usd);

  const sla = pb.alert_sla_open || {};
  $("#playbookOpenAlerts").textContent = sla.total_open ?? "—";
  $("#playbookCritAlerts").textContent = sla.critical_open ?? "—";
  $("#playbookSlaNote").textContent = sla.note || "";
  const b = sla.age_buckets || {};
  $("#playbookSlaBuckets").innerHTML = `
    <div class="sla-bucket-row"><span>0–3 天</span><strong>${b.days_0_3 ?? 0}</strong></div>
    <div class="sla-bucket-row"><span>4–7 天</span><strong>${b.days_4_7 ?? 0}</strong></div>
    <div class="sla-bucket-row"><span>≥8 天</span><strong class="sla-bucket-hot">${b.days_8_plus ?? 0}</strong></div>
  `;

  const cg = pb.coverage_gaps || {};
  $("#playbookUnassigned").textContent = cg.unassigned_active_channels ?? "—";
  $("#playbookIntelGap").textContent = cg.active_countries_without_intel ?? "—";
  const ga = $("#playbookGapActions");
  if (ga) {
    ga.innerHTML = `
      <button type="button" class="btn secondary" id="pbGapChannels">打开渠道列表</button>
      <button type="button" class="btn secondary" id="pbGapIntel">打开情报国别表</button>
    `;
    $("#pbGapChannels")?.addEventListener("click", () => {
      showView("channels");
      loadChannels().catch((e) => console.error(e));
    });
    $("#pbGapIntel")?.addEventListener("click", () => {
      showView("intel");
      loadIntelList().catch((e) => console.error(e));
    });
  }

  const tb = $("#playbookActionsTable tbody");
  tb.innerHTML = "";
  for (const a of pb.priority_actions || []) {
    const tr = document.createElement("tr");
    const label = PLAYBOOK_KIND_LABEL[a.kind] || a.kind;
    tr.innerHTML = `
      <td>${escapeHtml(label)}</td>
      <td>${escapeHtml(a.title)}</td>
      <td>${escapeHtml(a.detail)}</td>
      <td>${a.channel_id ? `<button type="button" class="btn secondary pb-open-ch" data-cid="${a.channel_id}">打开渠道</button>` : "—"}</td>
    `;
    tb.appendChild(tr);
  }
  tb.querySelectorAll(".pb-open-ch").forEach((btn) => {
    btn.addEventListener("click", () => openChannel(Number(btn.getAttribute("data-cid"))));
  });
}

async function loadDashboard() {
  const d = await api("/v1/analytics/overview");
  const s = d.summary;
  $("#kpiChannels").textContent = s.channelCount;
  $("#kpiRevenue").textContent =
    s.activeRevenueUsd >= 1e6
      ? `${(s.activeRevenueUsd / 1e6).toFixed(2)}M USD`
      : `${Math.round(s.activeRevenueUsd / 1000)}k USD`;
  $("#kpiAlerts").textContent = s.openAlerts;
  $("#kpiSam").textContent = s.samAccounts;
  $("#kpiAbc").textContent = `A ${s.abc.A || 0} · B ${s.abc.B || 0} · C ${s.abc.C || 0}`;

  const op = $("#dashIntelOppty");
  if (op) {
    const top = (d.intelOpportunity || []).slice(0, 12);
    if (!top.length) {
      op.textContent = "暂无国别情报数据";
    } else {
      op.innerHTML = top
        .map(
          (x) =>
            `<div class="dash-intel-row"><a href="#" class="dash-intel-cc" data-cc="${escapeHtml(x.country_code)}">${escapeHtml(
              x.country_code
            )}</a> <span class="muted">机会指数</span> <strong>${Number(x.opportunity_score) || 0}</strong></div>`
        )
        .join("");
      op.querySelectorAll(".dash-intel-cc").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const cc = a.getAttribute("data-cc");
          showView("intel");
          loadIntelList()
            .then(() => openIntel(cc))
            .catch((err) => console.error(err));
        });
      });
    }
  }

  destroyCharts();
  if (typeof Chart === "undefined") return;
  applyChartDefaults();

  regChart(
    new Chart($("#chartRegionBar"), {
      type: "bar",
      data: {
        labels: d.revenueByRegion.map((x) => x.region),
        datasets: [
          {
            label: "年出货 USD",
            data: d.revenueByRegion.map((x) => x.revenue),
            backgroundColor: chartColors.primary,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtUsd(v) } } },
        onClick: (_evt, els) => {
          if (!els.length) return;
          const r = d.revenueByRegion[els[0].index];
          if (r && r.region) jumpChannelsByRegion(r.region);
        },
      },
    })
  );

  regChart(
    new Chart($("#chartAbcDoughnut"), {
      type: "doughnut",
      data: {
        labels: ["A 战略", "B 成长", "C 标准"],
        datasets: [
          {
            data: [s.abc.A || 0, s.abc.B || 0, s.abc.C || 0],
            backgroundColor: [chartColors.ok, chartColors.warn, chartColors.danger],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        onClick: (_evt, els) => {
          if (!els.length) return;
          const abc = ["A", "B", "C"][els[0].index];
          if (abc) jumpChannelsByAbc(abc);
        },
      },
    })
  );

  regChart(
    new Chart($("#chartMonthlyLine"), {
      type: "line",
      data: {
        labels: d.monthlyTrend.map((x) => x.ym),
        datasets: [
          {
            label: "月度出货合计",
            data: d.monthlyTrend.map((x) => x.total),
            borderColor: chartColors.primary,
            backgroundColor: chartColors.primaryDim,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtUsd(v) } } },
      },
    })
  );

  regChart(
    new Chart($("#chartTopBar"), {
      type: "bar",
      data: {
        labels: d.topChannels.map((x) => x.channel_code),
        datasets: [
          {
            label: "年出货",
            data: d.topChannels.map((x) => x.annual_revenue_usd || 0),
            backgroundColor: "rgba(61, 158, 239, 0.65)",
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { callback: (v) => fmtUsd(v) } } },
        onClick: (_evt, els) => {
          if (!els.length) return;
          const row = d.topChannels[els[0].index];
          if (row && row.id != null) openChannel(Number(row.id));
        },
      },
    })
  );
}

async function loadChannels() {
  const region = $("#filterRegion").value;
  const abc = $("#filterAbc").value;
  const q = $("#filterQ").value.trim();
  const country = ($("#filterCountry") && $("#filterCountry").value.trim().toUpperCase()) || "";
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (abc) params.set("abc", abc);
  if (q) params.set("q", q);
  if (country.length >= 2) params.set("country", country);
  params.set("limit", "100");
  const res = await api("/v1/channels?" + params.toString());
  $("#channelListMeta").textContent = `共 ${res.total} 条渠道（演示数据），当前最多展示 ${res.items.length} 条`;
  const tb = $("#channelTable tbody");
  tb.innerHTML = "";
  for (const c of res.items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><a href="#" data-id="${c.id}" class="ch-link">${c.channel_code}</a></td>
      <td>${escapeHtml(c.name_en)}${c.name_cn ? `<div class="muted">${escapeHtml(c.name_cn)}</div>` : ""}</td>
      <td>${c.country_code}</td>
      <td>${c.region}</td>
      <td><span class="badge ${c.abc_class}">${c.abc_class}</span></td>
      <td>${fmtUsd(c.annual_revenue_usd)}</td>
      <td>${c.gross_margin_pct != null ? Number(c.gross_margin_pct).toFixed(1) + "%" : "—"}</td>
      <td>${c.clv_score != null ? Number(c.clv_score).toFixed(1) : "—"}</td>
      <td>${c.sam_flag ? '<span class="badge sam">SAM</span>' : "—"}</td>
      <td>${c.status}</td>
    `;
    tb.appendChild(tr);
  }
  tb.querySelectorAll(".ch-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openChannel(Number(a.getAttribute("data-id")));
    });
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let currentChannelId = null;
let channelMonthlyChart = null;
let channelRadarChart = null;

function destroyChannelCharts() {
  [channelMonthlyChart, channelRadarChart].forEach((c) => {
    try {
      c && c.destroy();
    } catch (_) {}
  });
  channelMonthlyChart = channelRadarChart = null;
}

const CH_ACT_KIND_LABEL = {
  enablement: "赋能支持",
  issue: "问题",
  request: "需求",
  competitor: "竞争",
  milestone: "里程碑",
  visit: "拜访/现场",
};

function flowColHtml(title, items, tone) {
  const rows = (items || [])
    .map(
      (x) =>
        `<div class="flow-item"><strong>${escapeHtml(x.label)}</strong><p class="muted small">${escapeHtml(x.detail)}</p></div>`
    )
    .join("");
  return `<div class="flow-col flow-col-${tone}"><h4>${escapeHtml(title)}</h4>${rows}</div>`;
}

function renderChannel360(res) {
  const mount = $("#ch360Mount");
  if (!mount) return;
  const g = res.channel_360;
  const c = res.channel;
  if (!g) {
    mount.innerHTML = '<p class="muted">360 聚合数据暂不可用，请更新服务端。</p>';
    return;
  }
  const u = parseUser();
  const canMutate =
    u && (u.role === "admin" || u.role === "manager" || (u.role === "sales" && Number(u.id) === Number(c.owner_user_id)));
  const sp = g.static_profile || {};
  const pi = g.performance_insight || {};
  const flows = g.flows || {};
  const trendLab = { up: "↑ 上行", down: "↓ 承压", stable: "→ 平稳" }[pi.trend] || pi.trend;
  const comps = g.competitors || [];
  const acts = g.activities || [];

  let html = `<div class="panel ch360-hero">
    <h2>渠道 360° · 信息流 / 业务流 / 资金流</h2>
    <p class="muted small">以本渠道为主键，把情报、工单、出货、毛利、应收与预警串成可讲清的闭环；下列三列对应「看见什么 → 推进什么 → 钱怎么走」。</p>
    <div class="flow-three">
      ${flowColHtml("信息流", flows.information, "info")}
      ${flowColHtml("业务流", flows.business, "biz")}
      ${flowColHtml("资金流", flows.financial, "fin")}
    </div>
    <div class="row flex-wrap ch360-quick-btns" style="margin-top:14px;gap:8px">
      <button type="button" class="btn secondary" id="ch360BtnIntel">市场情报（该国）</button>
      <button type="button" class="btn secondary" id="ch360BtnQuote">销售报价试算</button>
      <button type="button" class="btn secondary" id="ch360BtnPlaybook">业务作战台</button>
    </div>
  </div>`;

  html += `<div class="panel ch360-insight">
    <h3>业绩增长趋势洞察（演示月度）</h3>
    <p><span class="ch360-trend-tag">${escapeHtml(trendLab)}</span>
    近 3 月约 <strong>${fmtUsd(pi.recent_3m_revenue_usd)}</strong> USD · 对比前 3 月 <strong>${fmtUsd(pi.prior_3m_revenue_usd)}</strong> USD
    · 变化 <strong>${pi.change_pct_vs_prior != null ? pi.change_pct_vs_prior + "%" : "—"}</strong></p>
    <ul class="muted small">${(pi.narrative_lines || []).map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
  </div>`;

  html += `<div class="panel ch360-static">
    <h3>静态主数据</h3>
    <div class="ch360-static-grid">
      <div><span class="lab">编码</span>${escapeHtml(sp.channel_code)}</div>
      <div><span class="lab">国家/区域</span>${escapeHtml(sp.country_code)} / ${escapeHtml(sp.region)}</div>
      <div><span class="lab">生命周期</span>${escapeHtml(sp.lifecycle_stage)}</div>
      <div><span class="lab">协议到期</span>${escapeHtml(sp.agreement_expire_date || "—")}</div>
      <div><span class="lab">最近联系</span>${escapeHtml(sp.last_contact_date || "—")}</div>
      <div><span class="lab">负责人</span>${escapeHtml(sp.owner_name || "—")}</div>
    </div>
    <p class="muted small">动态主数据：联系日、分级、状态、备注等在列表与 PATCH 中维护；下方「动态与工单」记录过程事件。</p>
  </div>`;

  html += `<div class="panel ch360-comp">
    <h3>竞争管理</h3>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>竞品</th><th>威胁</th><th>备注</th>${canMutate ? "<th></th>" : ""}</tr></thead><tbody>`;
  for (const co of comps) {
    html += `<tr>
      <td>${escapeHtml(co.name)}</td>
      <td><span class="threat-${co.threat}">${escapeHtml(co.threat)}</span></td>
      <td class="muted small">${escapeHtml(co.note || "—")}</td>
      ${
        canMutate
          ? `<td><button type="button" class="btn secondary small ch360-del-comp" data-cid="${co.id}">删除</button></td>`
          : ""
      }
    </tr>`;
  }
  html += `</tbody></table></div>`;
  if (canMutate) {
    html += `<div class="row flex-wrap ch360-comp-form" style="margin-top:10px;gap:8px;align-items:flex-end">
      <label>竞品名称 <input type="text" id="ch360CompName" placeholder="品牌或联盟" style="min-width:140px" /></label>
      <label>威胁
        <select id="ch360CompThreat"><option value="low">low</option><option value="medium" selected>medium</option><option value="high">high</option></select>
      </label>
      <label style="flex:1;min-width:200px">备注 <input type="text" id="ch360CompNote" placeholder="策略要点" /></label>
      <button type="button" class="btn" id="ch360AddComp">添加</button>
    </div>`;
  }
  html += `</div>`;

  html += `<div class="panel ch360-act">
    <h3>动态与工单（赋能 · 问题 · 需求 · 拜访）</h3>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>时间</th><th>类型</th><th>标题</th><th>状态</th><th>记录人</th></tr></thead><tbody>`;
  for (const a of acts) {
    const kindL = CH_ACT_KIND_LABEL[a.kind] || a.kind;
    html += `<tr>
      <td class="muted small">${escapeHtml(a.created_at)}</td>
      <td>${escapeHtml(kindL)}</td>
      <td>${escapeHtml(a.title)}<div class="muted small">${escapeHtml(a.body || "")}</div></td>
      <td>${
        canMutate
          ? `<select class="ch360-act-status" data-aid="${a.id}">
          <option value="open" ${a.status === "open" ? "selected" : ""}>open</option>
          <option value="doing" ${a.status === "doing" ? "selected" : ""}>doing</option>
          <option value="done" ${a.status === "done" ? "selected" : ""}>done</option>
          <option value="cancelled" ${a.status === "cancelled" ? "selected" : ""}>cancelled</option>
        </select>`
          : escapeHtml(a.status)
      }</td>
      <td class="muted small">${escapeHtml(a.actor_name || "—")}</td>
    </tr>`;
  }
  html += `</tbody></table></div>`;
  if (canMutate) {
    html += `<div class="ch360-act-form" style="margin-top:12px">
      <div class="row flex-wrap" style="gap:8px">
        <select id="ch360ActKind">
          <option value="visit">拜访/现场</option>
          <option value="enablement">赋能支持</option>
          <option value="request">需求</option>
          <option value="issue">问题</option>
          <option value="milestone">里程碑</option>
          <option value="competitor">竞争动态</option>
        </select>
        <input type="text" id="ch360ActTitle" placeholder="标题" style="min-width:180px;flex:1" />
      </div>
      <textarea id="ch360ActBody" rows="2" placeholder="补充说明…" style="width:100%;margin-top:8px"></textarea>
      <button type="button" class="btn" id="ch360AddAct" style="margin-top:8px">登记一条</button>
    </div>`;
  }
  html += `</div>`;

  mount.innerHTML = html;

  $("#ch360BtnIntel")?.addEventListener("click", () => {
    showView("intel");
    loadIntelList()
      .then(() => openIntel(c.country_code))
      .catch((e) => console.error(e));
  });
  $("#ch360BtnQuote")?.addEventListener("click", () => jumpIntelToQuote(c.country_code));
  $("#ch360BtnPlaybook")?.addEventListener("click", () => jumpIntelToPlaybook());

  $("#ch360AddComp")?.addEventListener("click", async () => {
    const name = ($("#ch360CompName") && $("#ch360CompName").value.trim()) || "";
    if (!name) return;
    await api(`/v1/channels/${currentChannelId}/competitors`, {
      method: "POST",
      body: {
        name,
        threat: $("#ch360CompThreat").value,
        note: $("#ch360CompNote").value.trim(),
      },
    });
    openChannel(currentChannelId);
  });
  mount.querySelectorAll(".ch360-del-comp").forEach((b) => {
    b.addEventListener("click", async () => {
      const cid = b.getAttribute("data-cid");
      await api(`/v1/channels/${currentChannelId}/competitors/${cid}`, { method: "DELETE" });
      openChannel(currentChannelId);
    });
  });
  $("#ch360AddAct")?.addEventListener("click", async () => {
    const title = ($("#ch360ActTitle") && $("#ch360ActTitle").value.trim()) || "";
    if (!title) return;
    await api(`/v1/channels/${currentChannelId}/activities`, {
      method: "POST",
      body: {
        kind: $("#ch360ActKind").value,
        title,
        body: ($("#ch360ActBody") && $("#ch360ActBody").value) || "",
      },
    });
    openChannel(currentChannelId);
  });
  mount.querySelectorAll(".ch360-act-status").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const aid = sel.getAttribute("data-aid");
      await api(`/v1/channels/${currentChannelId}/activities/${aid}`, {
        method: "PATCH",
        body: { status: sel.value },
      });
    });
  });
}

async function openChannel(id) {
  currentChannelId = id;
  showView("channelDetail");
  destroyChannelCharts();
  const res = await api("/v1/channels/" + id);
  const c = res.channel;
  $("#chTitle").textContent = `${c.channel_code} · ${c.name_en}`;
  $("#chMeta").innerHTML = `
    <div class="row"><span class="muted">国家</span> ${c.country_code} &nbsp;|&nbsp; <span class="muted">区域</span> ${c.region}
    &nbsp;|&nbsp; <span class="muted">分级</span> <span class="badge ${c.abc_class}">${c.abc_class}</span>
    &nbsp;|&nbsp; <span class="muted">CLV(演示)</span> ${Number(c.clv_score).toFixed(1)}
    &nbsp;|&nbsp; <span class="muted">年出货</span> ${fmtUsd(c.annual_revenue_usd)} USD
    &nbsp;|&nbsp; <span class="muted">状态</span> ${c.status}</div>
    <p class="muted">负责人：${escapeHtml(c.owner_name || "—")} ${c.owner_email ? `(${escapeHtml(c.owner_email)})` : ""}</p>
    <p class="muted small ch-meta-drill">
      <a href="#" id="chDrillIntel">情报 · ${escapeHtml(c.country_code)}</a>
      <span> · </span>
      <a href="#" id="chDrillChList">该国渠道</a>
      <span> · </span>
      <a href="#" id="chDrillRegionList">本区域渠道</a>
      <span> · </span>
      <a href="#" id="chDrillQuote">报价</a>
      <span> · </span>
      <a href="#" id="chDrillPlaybook">作战台</a>
      <span> · </span>
      <a href="#" id="chDrillAlerts">预警中心</a>
    </p>
  `;
  $("#chDrillIntel")?.addEventListener("click", (e) => {
    e.preventDefault();
    showView("intel");
    loadIntelList()
      .then(() => openIntel(c.country_code))
      .catch((err) => console.error(err));
  });
  $("#chDrillChList")?.addEventListener("click", (e) => {
    e.preventDefault();
    jumpIntelToChannels(c.country_code);
  });
  $("#chDrillRegionList")?.addEventListener("click", (e) => {
    e.preventDefault();
    jumpChannelsByRegion(c.region);
  });
  $("#chDrillQuote")?.addEventListener("click", (e) => {
    e.preventDefault();
    jumpIntelToQuote(c.country_code);
  });
  $("#chDrillPlaybook")?.addEventListener("click", (e) => {
    e.preventDefault();
    jumpIntelToPlaybook();
  });
  $("#chDrillAlerts")?.addEventListener("click", (e) => {
    e.preventDefault();
    showView("alerts");
    loadAlerts().catch((err) => console.error(err));
  });
  renderChannel360(res);
  const ctx = res.business_context;
  const ctxEl = $("#chBusinessContextBody");
  if (ctx) {
    const intel = ctx.market_intel;
    const br = ctx.sales_brief;
    let html = `<p><strong>未关预警</strong> ${ctx.open_alerts_count} 条（Critical <strong>${ctx.critical_open_count}</strong>）</p>`;
    if (intel) {
      html += `<p><strong>市场情报</strong> 机会指数 <strong>${intel.opportunity_score}</strong> · 更新 ${escapeHtml(intel.updated_at || "—")}</p>`;
    } else {
      html += `<p><strong>市场情报</strong> 暂无该国卡片</p>`;
    }
    if (br) {
      html += `<p><strong>销售简报</strong> ${escapeHtml(br.title)} <span class="muted">(${escapeHtml(br.updated_at || "")})</span></p>`;
    }
    html += `<p><button type="button" class="btn secondary" id="btnChOpenIntel">在「市场情报」打开 ${escapeHtml(ctx.country_code)}</button></p>`;
    if ((ctx.hints || []).length) {
      html += `<ul class="hint-list">${ctx.hints.map((h) => `<li>${escapeHtml(h)}</li>`).join("")}</ul>`;
    }
    ctxEl.innerHTML = html;
    const bi = $("#btnChOpenIntel");
    if (bi) {
      bi.addEventListener("click", () => {
        showView("intel");
        loadIntelList()
          .then(() => openIntel(ctx.country_code))
          .catch((e) => console.error(e));
      });
    }
  } else {
    ctxEl.textContent = "—";
  }
  $("#chNotes").value = c.notes || "";

  if (typeof Chart !== "undefined") {
    applyChartDefaults();
    const labels = res.monthly.map((m) => m.ym);
    const vals = res.monthly.map((m) => m.revenue_usd);
    channelMonthlyChart = new Chart($("#chartChannelMonthly"), {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "月出货 USD",
            data: vals,
            borderColor: chartColors.primary,
            backgroundColor: chartColors.primaryDim,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtUsd(v) } } },
      },
    });

    const s1 = Number(c.strategic_fit_score) || 0;
    const s2 = Number(c.profit_dim_score) || 0;
    const s3 = Number(c.growth_dim_score) || 0;
    channelRadarChart = new Chart($("#chartChannelRadar"), {
      type: "radar",
      data: {
        labels: ["战略契合(35%)", "盈利能力(35%)", "成长潜力(30%)"],
        datasets: [
          {
            label: "演示得分",
            data: [s1, s2, s3],
            fill: true,
            backgroundColor: "rgba(61, 158, 239, 0.25)",
            borderColor: chartColors.primary,
            pointBackgroundColor: chartColors.primary,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { beginAtZero: true, suggestedMax: 35, ticks: { stepSize: 10 } } },
      },
    });
  }

  const altb = $("#chAlerts tbody");
  altb.innerHTML = "";
  for (const a of res.alerts) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.severity}</td>
      <td>${slaAgeLabel(a.age_days, a.severity)}</td>
      <td>${escapeHtml(a.message)}</td>
      <td>${a.acknowledged_at ? "已确认" : '<button class="btn secondary ack-a" data-aid="' + a.id + '">确认</button>'}</td>
    `;
    altb.appendChild(tr);
  }
  altb.querySelectorAll(".ack-a").forEach((b) => {
    b.addEventListener("click", async () => {
      await api("/v1/alerts/" + b.getAttribute("data-aid") + "/ack", { method: "POST" });
      openChannel(currentChannelId);
    });
  });

  const ymInput = $("#metricYm");
  if (ymInput) {
    const t = new Date();
    ymInput.value = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
  }
}

async function saveChannelNotes() {
  if (!currentChannelId) return;
  await api("/v1/channels/" + currentChannelId, {
    method: "PATCH",
    body: { notes: $("#chNotes").value },
  });
  $("#chSaveHint").textContent = "已保存 " + new Date().toLocaleTimeString();
  setTimeout(() => {
    $("#chSaveHint").textContent = "";
  }, 2500);
}

async function addMonthlyMetric() {
  if (!currentChannelId) return;
  const ymRaw = $("#metricYm").value;
  const ym = ymRaw && ymRaw.length >= 7 ? ymRaw.slice(0, 7) : "";
  const revenue = Number($("#metricRevenue").value);
  if (!/^\d{4}-\d{2}$/.test(ym)) {
    $("#metricHint").textContent = "请选择有效月份";
    return;
  }
  if (Number.isNaN(revenue) || revenue < 0) {
    $("#metricHint").textContent = "请输入出货金额";
    return;
  }
  await api("/v1/channels/" + currentChannelId + "/monthly-metrics", {
    method: "POST",
    body: { ym, revenue_usd: revenue },
  });
  $("#metricHint").textContent = "已写入 " + ym;
  $("#metricRevenue").value = "";
  openChannel(currentChannelId);
}

let intelBarChart = null;
let currentIntelCountry = null;

function intelTrendLabel(d) {
  if (d === "up") return '<span class="intel-trend intel-trend-up">↑ 上行</span>';
  if (d === "down") return '<span class="intel-trend intel-trend-down">↓ 承压</span>';
  if (d === "stable") return '<span class="intel-trend intel-trend-stable">→ 平稳</span>';
  return '<span class="muted">—</span>';
}

function jumpIntelToChannels(cc) {
  const el = $("#filterCountry");
  if (el) el.value = cc;
  showView("channels");
  loadChannels().catch((e) => console.error(e));
}

/** 总览 / 绩效区域表 → 渠道列表（按区域） */
function jumpChannelsByRegion(region) {
  const el = $("#filterRegion");
  if (el) el.value = region || "";
  const fc = $("#filterCountry");
  if (fc) fc.value = "";
  showView("channels");
  loadChannels().catch((e) => console.error(e));
}

/** 总览 A/B/C 图 → 渠道列表（按分级） */
function jumpChannelsByAbc(abc) {
  const el = $("#filterAbc");
  if (el) el.value = abc || "";
  const fc = $("#filterCountry");
  if (fc) fc.value = "";
  showView("channels");
  loadChannels().catch((e) => console.error(e));
}

function jumpIntelToPlaybook() {
  showView("playbook");
  loadPlaybook().catch((e) => console.error(e));
}

function jumpIntelToQuote(cc) {
  try {
    sessionStorage.setItem("srne_prefill_quote_country", cc);
  } catch (_) {}
  showView("sales");
  const sel = $("#quoteCountry");
  if (sel) {
    const opt = Array.from(sel.options).find((o) => o.value === cc);
    if (opt) sel.value = cc;
  }
  runQuote().catch(() => {});
}

async function loadIntelList() {
  const res = await api("/v1/intel/countries");
  const tb = $("#intelTable tbody");
  tb.innerHTML = "";
  for (const m of res.items) {
    const tr = document.createElement("tr");
    const hl = String(m.value_headline || m.policy_digest || "");
    tr.innerHTML = `
      <td><a href="#" data-cc="${m.country_code}" class="intel-link">${m.country_code}</a></td>
      <td>${intelTrendLabel(m.trend_direction)}</td>
      <td><strong>${m.opportunity_score}</strong></td>
      <td>${m.scope_active_channels ?? 0}</td>
      <td>${fmtUsd(m.scope_revenue_roll_usd)}</td>
      <td>${m.scope_open_alerts ?? 0}</td>
      <td class="intel-hl-cell">${escapeHtml(hl.length > 56 ? hl.slice(0, 56) + "…" : hl)}</td>
    `;
    tb.appendChild(tr);
  }
  tb.querySelectorAll(".intel-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openIntel(a.getAttribute("data-cc"));
    });
  });

  if (typeof Chart !== "undefined") {
    applyChartDefaults();
    try {
      intelBarChart && intelBarChart.destroy();
    } catch (_) {}
    const items = [...res.items].sort((a, b) => a.opportunity_score - b.opportunity_score);
    intelBarChart = new Chart($("#chartIntelBar"), {
      type: "bar",
      data: {
        labels: items.map((x) => x.country_code),
        datasets: [
          {
            label: "机会指数",
            data: items.map((x) => x.opportunity_score),
            backgroundColor: items.map((x) =>
              x.opportunity_score >= 82 ? chartColors.ok : x.opportunity_score >= 75 ? chartColors.warn : chartColors.danger
            ),
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { min: 0, max: 100 } },
        onClick: (_, els) => {
          if (els.length && items[els[0].index]) openIntel(items[els[0].index].country_code);
        },
      },
    });
  }
}

async function openIntel(cc) {
  currentIntelCountry = cc;
  const res = await api("/v1/intel/" + cc);
  $("#intelDetail").classList.remove("hidden");
  $("#intelDetailTitle").textContent = `${cc} · 国别情报与联动`;
  const intel = res.intel;
  const brief = res.brief;
  const x = res.cross_links || {};
  const user = parseUser();
  const canEdit = user && (user.role === "admin" || user.role === "manager");
  const tags = (intel && intel.tags) || [];
  const tagsHtml = tags.length
    ? tags.map((t) => `<span class="intel-tag">${escapeHtml(t)}</span>`).join("")
    : "";

  let html = "";

  if (!intel && brief) {
    html += `<p class="muted">该国暂无结构化情报卡片，以下为销售简报；仍可按下方按钮联动渠道与报价。</p>`;
  }

  if (intel) {
    html += `<div class="intel-hero">
      <div class="intel-hero-score"><span class="intel-hero-n">${intel.opportunity_score}</span><span class="intel-hero-lab">机会指数</span></div>
      <div class="intel-hero-meta">
        ${intelTrendLabel(intel.trend_direction)}
        <span class="muted small">更新 ${escapeHtml(intel.updated_at || "—")}</span>
      </div>
      <div class="intel-hero-tags">${tagsHtml}</div>
    </div>`;

    if (intel.value_headline) {
      html += `<div class="intel-value-line">${escapeHtml(intel.value_headline)}</div>`;
    }

    html += `<div class="intel-risk-grid">
      <div class="intel-kv"><span class="lab">关键风险</span><p>${escapeHtml(intel.key_risk || "—")}</p></div>
      <div class="intel-kv"><span class="lab">机会窗口 / 动作焦点</span><p>${escapeHtml(intel.key_window || "—")}</p></div>
    </div>`;
    if (intel.trend_note) {
      html += `<p class="intel-trend-note muted"><strong>趋势备注</strong> ${escapeHtml(intel.trend_note)}</p>`;
    }
  }

  html += `<div class="intel-cross panel-inner">
    <h3>与业务模块联动（当前登录数据范围）</h3>
    <div class="intel-cross-stats">
      <div><span class="lab">活跃渠道</span><strong>${x.scope_active_channels ?? 0}</strong></div>
      <div><span class="lab">年出货 roll</span><strong>${fmtUsd(x.scope_revenue_roll_usd)} USD</strong></div>
      <div><span class="lab">未关预警</span><strong>${x.scope_open_alerts ?? 0}</strong></div>
    </div>
    <div class="row flex-wrap intel-cross-actions">
      <button type="button" class="btn secondary intel-act-ch" data-cc="${cc}">打开渠道列表（已筛该国）</button>
      <button type="button" class="btn secondary intel-act-pb">打开业务作战台</button>
      <button type="button" class="btn secondary intel-act-q" data-cc="${cc}">销售报价（预填国家）</button>
    </div>`;
  const tops = x.top_channels || [];
  if (tops.length) {
    html += `<p class="muted small">TOP 出货渠道（可点进详情）：</p><ul class="intel-top-ch">`;
    for (const ch of tops) {
      html += `<li><a href="#" class="intel-open-ch" data-id="${ch.id}">${escapeHtml(ch.channel_code)}</a> · ${escapeHtml(ch.name_en)} · ${fmtUsd(ch.annual_revenue_usd)}</li>`;
    }
    html += `</ul>`;
  }
  html += `</div>`;

  if (intel) {
    html += `<div class="intel-pillars">
      <div class="intel-pillar"><h4>政策</h4><p>${escapeHtml(intel.policy_digest || "—")}</p></div>
      <div class="intel-pillar"><h4>竞品</h4><p>${escapeHtml(intel.competitor_note || "—")}</p></div>
      <div class="intel-pillar"><h4>产品匹配</h4><p>${escapeHtml(intel.product_fit_note || "—")}</p></div>
    </div>`;
  }

  if (brief) {
    html += `<div class="intel-brief-block"><h3>${escapeHtml(brief.title)}</h3>
      <pre class="intel-brief-pre">${escapeHtml(brief.body_markdown)}</pre></div>`;
  }

  const notes = res.intel_notes || [];
  html += `<div class="intel-notes panel-inner">
    <h3>现场纪要 / 拜访记录（输出沉淀）</h3>
    <ul class="intel-note-list">`;
  for (const n of notes) {
    html += `<li><span class="muted small">${escapeHtml(n.created_at)} ${escapeHtml(n.actor_name || "")}</span><br>${escapeHtml(n.body)}</li>`;
  }
  html += `</ul>
    <textarea id="intelNoteBody" rows="3" placeholder="写一条纪要（全员可见）…"></textarea>
    <div class="row" style="margin-top:8px">
      <button type="button" class="btn" id="btnIntelPostNote">发布纪要</button>
      <span class="muted" id="intelNoteHint"></span>
    </div>
  </div>`;

  if (canEdit && intel && intel.country_code) {
    html += `<details class="intel-edit panel-inner"><summary>修订情报（管理员/总监）</summary>
      <div class="intel-edit-grid">
        <label>机会指数 0–100 <input type="number" id="intelEdScore" min="0" max="100" value="${intel.opportunity_score}" /></label>
        <label>趋势
          <select id="intelEdTrend">
            <option value="up" ${intel.trend_direction === "up" ? "selected" : ""}>上行</option>
            <option value="stable" ${intel.trend_direction === "stable" ? "selected" : ""}>平稳</option>
            <option value="down" ${intel.trend_direction === "down" ? "selected" : ""}>承压</option>
          </select>
        </label>
      </div>
      <label class="block-label">价值一句话</label>
      <textarea id="intelEdHeadline" rows="2">${escapeHtml(intel.value_headline || "")}</textarea>
      <label class="block-label">趋势备注</label>
      <textarea id="intelEdTrendNote" rows="2">${escapeHtml(intel.trend_note || "")}</textarea>
      <label class="block-label">关键风险</label>
      <textarea id="intelEdRisk" rows="2">${escapeHtml(intel.key_risk || "")}</textarea>
      <label class="block-label">机会窗口</label>
      <textarea id="intelEdWin" rows="2">${escapeHtml(intel.key_window || "")}</textarea>
      <label class="block-label">政策摘要</label>
      <textarea id="intelEdPol" rows="3">${escapeHtml(intel.policy_digest || "")}</textarea>
      <label class="block-label">竞品</label>
      <textarea id="intelEdComp" rows="2">${escapeHtml(intel.competitor_note || "")}</textarea>
      <label class="block-label">产品匹配</label>
      <textarea id="intelEdFit" rows="2">${escapeHtml(intel.product_fit_note || "")}</textarea>
      <label class="block-label">标签（英文逗号分隔）</label>
      <input type="text" id="intelEdTags" value="${escapeHtml(tags.join(","))}" />
      <div class="row" style="margin-top:10px">
        <button type="button" class="btn" id="btnIntelSave">保存修订</button>
        <span class="muted" id="intelEdHint"></span>
      </div>
    </details>`;
  }

  $("#intelBody").innerHTML = html || "<p class='muted'>暂无详情</p>";

  $("#intelBody").querySelectorAll(".intel-act-ch").forEach((b) => {
    b.addEventListener("click", () => jumpIntelToChannels(b.getAttribute("data-cc")));
  });
  const apb = $("#intelBody").querySelector(".intel-act-pb");
  if (apb) apb.addEventListener("click", () => jumpIntelToPlaybook());
  $("#intelBody").querySelectorAll(".intel-act-q").forEach((b) => {
    b.addEventListener("click", () => jumpIntelToQuote(b.getAttribute("data-cc")));
  });
  $("#intelBody").querySelectorAll(".intel-open-ch").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openChannel(Number(a.getAttribute("data-id")));
    });
  });
  const btnN = $("#intelBody").querySelector("#btnIntelPostNote");
  if (btnN) btnN.addEventListener("click", () => postIntelNote().catch((e) => alert(e.message)));
  const btnS = $("#intelBody").querySelector("#btnIntelSave");
  if (btnS) btnS.addEventListener("click", () => saveIntelEdits().catch((e) => alert(e.message)));
}

async function postIntelNote() {
  if (!currentIntelCountry) return;
  const body = ($("#intelNoteBody") && $("#intelNoteBody").value.trim()) || "";
  if (!body) return;
  await api(`/v1/intel/${currentIntelCountry}/notes`, { method: "POST", body: { body } });
  const h = $("#intelNoteHint");
  if (h) h.textContent = "已发布";
  setTimeout(() => {
    if (h) h.textContent = "";
  }, 2000);
  if ($("#intelNoteBody")) $("#intelNoteBody").value = "";
  openIntel(currentIntelCountry);
}

async function saveIntelEdits() {
  if (!currentIntelCountry) return;
  const tagStr = ($("#intelEdTags") && $("#intelEdTags").value) || "";
  const tags = tagStr
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  await api(`/v1/intel/${currentIntelCountry}`, {
    method: "PATCH",
    body: {
      opportunity_score: Number($("#intelEdScore").value),
      trend_direction: $("#intelEdTrend").value,
      value_headline: $("#intelEdHeadline").value,
      trend_note: $("#intelEdTrendNote").value,
      key_risk: $("#intelEdRisk").value,
      key_window: $("#intelEdWin").value,
      policy_digest: $("#intelEdPol").value,
      competitor_note: $("#intelEdComp").value,
      product_fit_note: $("#intelEdFit").value,
      tags,
    },
  });
  const h = $("#intelEdHint");
  if (h) h.textContent = "已保存";
  setTimeout(() => {
    if (h) h.textContent = "";
  }, 2000);
  loadIntelList().catch((e) => console.error(e));
  openIntel(currentIntelCountry);
}

let quoteDoughnut = null;

async function runQuote() {
  const body = {
    countryCode: $("#quoteCountry").value,
    category: $("#quoteCat").value,
    qty: Number($("#quoteQty").value || 1),
    fobUnitUsd: Number($("#quoteFob").value || 45),
  };
  const r = await api("/v1/tools/quote", { method: "POST", body });
  $("#quoteOut").textContent = JSON.stringify(r, null, 2);

  if (typeof Chart !== "undefined") {
    applyChartDefaults();
    const q = body.qty;
    const pu = r.perUnitUsd;
    const fobT = pu.fob * q;
    const tarT = pu.tariff * q;
    const freT = pu.freight * q;
    try {
      quoteDoughnut && quoteDoughnut.destroy();
    } catch (_) {}
    quoteDoughnut = new Chart($("#chartQuoteBreakdown"), {
      type: "doughnut",
      data: {
        labels: ["FOB", "关税", "运费估算"],
        datasets: [
          {
            data: [fobT, tarT, freT],
            backgroundColor: [
              "rgba(61, 158, 239, 0.85)",
              "rgba(255, 204, 102, 0.85)",
              "rgba(127, 217, 154, 0.75)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.raw;
                const sum = fobT + tarT + freT || 1;
                return `${ctx.label}: $${v.toFixed(0)} (${((v / sum) * 100).toFixed(1)}%)`;
              },
            },
          },
        },
      },
    });
  }
}

async function loadAlerts() {
  const res = await api("/v1/alerts?open=1");
  const tb = $("#alertsTable tbody");
  tb.innerHTML = "";
  for (const a of res.items) {
    const tr = document.createElement("tr");
    const cid = a.channel_id != null ? Number(a.channel_id) : null;
    const chCell =
      cid != null
        ? `<a href="#" class="drill-ch-link" data-cid="${cid}">${escapeHtml(a.channel_code)}</a>`
        : escapeHtml(a.channel_code);
    tr.innerHTML = `
      <td>${a.severity}</td>
      <td>${slaAgeLabel(a.age_days, a.severity)}</td>
      <td>${chCell}</td>
      <td>${escapeHtml(a.message)}</td>
      <td><button type="button" class="btn secondary ack-b" data-aid="${a.id}">确认</button>
      ${cid != null ? ` <button type="button" class="btn secondary open-ch-from-alert" data-cid="${cid}">渠道详情</button>` : ""}</td>
    `;
    tb.appendChild(tr);
  }
  tb.querySelectorAll(".drill-ch-link, .open-ch-from-alert").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openChannel(Number(el.getAttribute("data-cid")));
    });
  });
  tb.querySelectorAll(".ack-b").forEach((b) => {
    b.addEventListener("click", async () => {
      await api("/v1/alerts/" + b.getAttribute("data-aid") + "/ack", { method: "POST" });
      loadAlerts();
    });
  });
}

function trafficDot(t) {
  const cls = t === "green" ? "tl-green" : t === "yellow" ? "tl-yellow" : "tl-red";
  return `<span class="traffic-dot ${cls}" title="${t}"></span>`;
}

function renderPerfBsc(sc) {
  $("#perfPeriodLabel").textContent = sc.targets.fiscal_period_label;
  const f = sc.bsc.financial;
  const c = sc.bsc.customer;
  const p = sc.bsc.process;
  const l = sc.bsc.learning;
  $("#perfBscGrid").innerHTML = `
    <div class="bsc-card">
      <h3>财务</h3>
      <p>年出货 roll <strong>${fmtUsd(f.annual_revenue_roll_usd)}</strong> USD</p>
      <p>演示达成指数 <strong>${f.proxy_quarter_attainment_pct}%</strong> ${trafficDot(f.traffic_revenue)}</p>
      <p>A 类出货占比 <strong>${f.a_class_revenue_share_pct}%</strong> / 目标 ${f.target_a_share_pct}% ${trafficDot(f.traffic_a_share)}</p>
      <p>均毛利 <strong>${f.avg_gross_margin_pct}%</strong> / 目标 ${f.target_margin_pct}% ${trafficDot(f.traffic_margin)}</p>
    </div>
    <div class="bsc-card">
      <h3>客户</h3>
      <p>活跃渠道 <strong>${c.active_channels}</strong></p>
      <p>SAM <strong>${c.sam_accounts}</strong>（${c.sam_ratio_pct}%）</p>
      <p>A 类收入占比 <strong>${c.a_share_pct}%</strong></p>
    </div>
    <div class="bsc-card">
      <h3>流程</h3>
      <p>未关预警 <strong>${JSON.stringify(p.open_alerts_by_severity)}</strong></p>
      <p>均逾期天数 <strong>${p.avg_ar_days}</strong> / 目标 ≤${p.target_max_ar_days} ${trafficDot(p.traffic_ar)}</p>
      <p class="muted small">账龄桶：0天 ${p.ar_buckets?.b0 ?? 0} · 1–15 ${p.ar_buckets?.b1 ?? 0} · 16–30 ${p.ar_buckets?.b2 ?? 0} · &gt;30 ${p.ar_buckets?.b3 ?? 0}</p>
    </div>
    <div class="bsc-card">
      <h3>学习成长</h3>
      <p class="muted small">${l.note}</p>
      <p>近30天导入批次 <strong>${l.import_batches_30d}</strong></p>
      <p>CRM 采用率（演示） <strong>${l.placeholder_crm_adoption_pct}%</strong></p>
    </div>
  `;
}

function renderPerfTables(sc) {
  const rt = $("#perfRegionDetailTable tbody");
  rt.innerHTML = "";
  for (const r of sc.region_scorecard || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.region}</td>
      <td>${r.channels}</td>
      <td>${fmtUsd(r.revenue_usd)}</td>
      <td>${fmtUsd(r.target_quarter_usd)}</td>
      <td>${r.attainment_pct}%</td>
      <td>${trafficDot(r.traffic)}</td>
      <td>${r.avg_margin_pct}%</td>
      <td>${r.a_count}</td>
      <td>${r.ar_over_30}</td>
      <td><button type="button" class="btn secondary small drill-perf-region" data-reg="${escapeHtml(r.region)}">区域渠道</button></td>
    `;
    rt.appendChild(tr);
  }
  rt.querySelectorAll(".drill-perf-region").forEach((b) => {
    b.addEventListener("click", () => jumpChannelsByRegion(b.getAttribute("data-reg")));
  });

  const wt = $("#perfWatchTable tbody");
  wt.innerHTML = "";
  for (const w of sc.watchlist || []) {
    const tr = document.createElement("tr");
    const wid = w.channel_id != null ? Number(w.channel_id) : null;
    tr.innerHTML = `
      <td>${escapeHtml(w.channel_code)}</td>
      <td>${escapeHtml(w.name_en)}</td>
      <td><span class="badge ${w.abc_class}">${w.abc_class}</span></td>
      <td>${w.ar_overdue_days}</td>
      <td>${fmtUsd(w.annual_revenue_usd)}</td>
      <td>${w.clv_score != null ? Number(w.clv_score).toFixed(1) : "—"}</td>
      <td>${w.last_contact_date || "—"}</td>
      <td>${
        wid
          ? `<button type="button" class="btn secondary small drill-perf-ch" data-cid="${wid}">渠道详情</button>`
          : "—"
      }</td>
    `;
    wt.appendChild(tr);
  }
  wt.querySelectorAll(".drill-perf-ch").forEach((b) => {
    b.addEventListener("click", () => openChannel(Number(b.getAttribute("data-cid"))));
  });

  const ot = $("#perfOwnerTable tbody");
  ot.innerHTML = "";
  for (const o of sc.owner_leaderboard || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(o.name)}</td>
      <td>${o.email ? escapeHtml(o.email) : "—"}</td>
      <td>${o.channel_cnt}</td>
      <td>${fmtUsd(o.revenue_usd)}</td>
      <td>${o.avg_margin != null ? Math.round(o.avg_margin * 10) / 10 : "—"}</td>
      <td>${o.ar_watch}</td>
    `;
    ot.appendChild(tr);
  }

  const lc = $("#perfLifecycleMount");
  lc.innerHTML = (sc.lifecycle_funnel || [])
    .map((x) => `<div class="funnel-row"><span>${x.stage}</span><strong>${x.n}</strong></div>`)
    .join("");

  const pm = $("#perfProcessMount");
  const sev = sc.bsc.process.open_alerts_by_severity || {};
  pm.innerHTML = `
    <p>Critical: <strong>${sev.critical ?? 0}</strong> · Warn: <strong>${sev.warn ?? 0}</strong> · Info: <strong>${sev.info ?? 0}</strong></p>
    <p class="muted small">结合「预警中心」可做日清闭环。</p>
  `;

  const ul = $("#perfNarrativeList");
  ul.innerHTML = (sc.operational?.narrative || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
}

async function loadPerf() {
  const sc = await api("/v1/performance/scorecard");
  $("#perfOut").textContent = JSON.stringify(sc, null, 2);
  renderPerfBsc(sc);
  renderPerfTables(sc);

  const d = await api("/v1/analytics/overview");

  if (typeof Chart === "undefined") return;
  applyChartDefaults();
  destroyCharts();

  const regions = sc.region_scorecard || [];
  regChart(
    new Chart($("#chartPerfRegion"), {
      type: "bar",
      data: {
        labels: regions.map((x) => x.region),
        datasets: [
          {
            label: "达成率 %",
            data: regions.map((x) => Math.min(x.attainment_pct, 150)),
            backgroundColor: regions.map((x) =>
              x.traffic === "green" ? chartColors.ok : x.traffic === "yellow" ? chartColors.warn : chartColors.danger
            ),
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { max: 150, beginAtZero: true } },
      },
    })
  );

  const mom = sc.monthly_trend_rev || [];
  regChart(
    new Chart($("#chartPerfMom"), {
      type: "line",
      data: {
        labels: mom.map((x) => x.ym),
        datasets: [
          {
            label: "月度出货",
            data: mom.map((x) => x.total),
            borderColor: chartColors.primary,
            backgroundColor: chartColors.primaryDim,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => fmtUsd(v) } } },
      },
    })
  );

  const mb = d.marginByClass || [];
  const labels = mb.map((x) => x.abc_class + " 级");
  regChart(
    new Chart($("#chartPerfMargin"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "平均毛利率 %",
            data: mb.map((x) => Number(x.avg_margin) || 0),
            backgroundColor: chartColors.primary,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 40 } },
      },
    })
  );
  regChart(
    new Chart($("#chartPerfRev"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: mb.map((x) => Number(x.revenue_sum) || 0),
            backgroundColor: [chartColors.ok, chartColors.warn, chartColors.danger],
            borderWidth: 0,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
    })
  );
}

function getChannelsFromImportTextarea() {
  const t = $("#importJson").value.trim();
  if (!t) throw new Error("请粘贴或生成 JSON");
  const data = JSON.parse(t);
  if (!Array.isArray(data.channels)) throw new Error('JSON 须包含数组字段 "channels"');
  return data.channels;
}

function parseCsvToChannels(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error("CSV 至少包含表头与一行数据");
  const headers = lines[0].split(",").map((h) => h.trim());
  const numFields = new Set([
    "annual_revenue_usd",
    "gross_margin_pct",
    "ar_overdue_days",
    "clv_score",
    "owner_user_id",
    "strategic_fit_score",
    "profit_dim_score",
    "growth_dim_score",
  ]);
  const channels = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const o = {};
    headers.forEach((h, j) => {
      let v = cells[j];
      if (v === undefined || v === "") return;
      if (numFields.has(h)) o[h] = Number(v);
      else if (h === "sam_flag") o[h] = v === "1" || v.toLowerCase() === "true";
      else o[h] = v;
    });
    channels.push(o);
  }
  return channels;
}

async function runImportPreview() {
  $("#importPreviewHint").textContent = "";
  $("#btnImportCommit").disabled = true;
  let channels;
  try {
    channels = getChannelsFromImportTextarea();
  } catch (e) {
    $("#importPreviewHint").textContent = e.message;
    return;
  }
  const r = await api("/v1/import/channels/preview", { method: "POST", body: { channels } });
  const tb = $("#importPreviewTable tbody");
  tb.innerHTML = "";
  for (const row of r.rows) {
    const tr = document.createElement("tr");
    if (row.status === "ok") {
      tr.innerHTML = `
        <td>${row.row}</td>
        <td><span class="import-ok">通过</span></td>
        <td>${escapeHtml(row.channel_code)} · ${escapeHtml(row.name_en)}<div class="muted small">${escapeHtml(row.snapshot)}</div></td>
        <td>—</td>`;
    } else {
      tr.innerHTML = `
        <td>${row.row}</td>
        <td><span class="import-err">失败</span></td>
        <td>${escapeHtml(row.channel_code)}</td>
        <td>${(row.issues || []).map((x) => escapeHtml(x)).join("；")}</td>`;
    }
    tb.appendChild(tr);
  }
  $("#importPreviewHint").textContent = `共 ${r.row_total} 行：可写入 ${r.row_ok}，失败 ${r.row_err}。失败行修正前无法写入。`;
  $("#btnImportCommit").disabled = r.row_err > 0 || r.row_ok === 0;
  $("#importStepBadge2").classList.add("import-step-done");
}

async function runImportCommit() {
  let channels;
  try {
    channels = getChannelsFromImportTextarea();
  } catch (e) {
    alert(e.message);
    return;
  }
  const r = await api("/v1/import/channels", { method: "POST", body: { channels } });
  $("#importResult").textContent = JSON.stringify(r, null, 2);
  $("#importStepBadge3").classList.add("import-step-done");
  $("#btnImportCommit").disabled = true;
  await loadImportBatches();
}

async function doImportJsonDirect() {
  if (!window.confirm("跳过校验预览将直接写入数据库，生产环境不推荐。确定？")) return;
  let data;
  try {
    data = JSON.parse($("#importJson").value);
  } catch (e) {
    $("#importResult").textContent = "JSON 解析失败：" + e.message;
    return;
  }
  const r = await api("/v1/import/channels", { method: "POST", body: data });
  $("#importResult").textContent = JSON.stringify(r, null, 2);
  await loadImportBatches();
}

async function doImportFile() {
  const f = $("#importFile").files[0];
  if (!f) {
    $("#importResult").textContent = "请选择文件";
    return;
  }
  const fd = new FormData();
  fd.append("file", f);
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(apiBase() + "/v1/import/channels/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const text = await res.text();
  $("#importResult").textContent = text;
  await loadImportBatches();
}

async function loadImportTemplate() {
  const t = await api("/v1/import/template");
  $("#importJson").value = JSON.stringify({ channels: t.channels }, null, 2);
  $("#importResult").textContent =
    "字段规范：\n" + JSON.stringify(t.field_spec || {}, null, 2) + "\n\n可修改 channel_code 后先做「校验预览」。";
  $("#importStepBadge1").classList.add("import-step-done");
}

async function loadImportBatches() {
  try {
    const r = await api("/v1/import/batches");
    const tb = $("#importBatchesTable tbody");
    tb.innerHTML = "";
    for (const b of r.items) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(b.created_at)}</td>
        <td><code class="batch-id">${escapeHtml(b.public_id)}</code></td>
        <td>${escapeHtml(b.action)}</td>
        <td>${b.row_total}</td>
        <td>${b.row_ok}</td>
        <td>${b.row_err}</td>`;
      tb.appendChild(tr);
    }
  } catch (_) {
    /* 销售无权限 */
  }
}

function onCsvToJson() {
  const f = $("#importCsvFile").files[0];
  if (!f) {
    alert("请选择 CSV 文件");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const channels = parseCsvToChannels(String(reader.result));
      $("#importJson").value = JSON.stringify({ channels }, null, 2);
      $("#importPreviewHint").textContent = `已从 CSV 解析 ${channels.length} 条，请继续「校验预览」。`;
      $("#importStepBadge1").classList.add("import-step-done");
      $("#btnImportCommit").disabled = true;
    } catch (e) {
      alert(e.message);
    }
  };
  reader.readAsText(f, "UTF-8");
}

function fillSampleImport() {
  $("#importJson").value = JSON.stringify(
    {
      channels: [
        {
          channel_code: "SRNE-SEA-098",
          name_en: "Sample Import Co",
          name_cn: "演示导入公司",
          country_code: "SG",
          region: "SEA",
          lifecycle_stage: "active",
          abc_class: "B",
          clv_score: 110,
          status: "ACTIVE",
          annual_revenue_usd: 77000,
          gross_margin_pct: 20,
          ar_overdue_days: 0,
        },
      ],
    },
    null,
    2
  );
  $("#importResult").textContent = "已填入示例；提交前请改编码避免与现网冲突。";
}

async function openQuickAddModal() {
  const user = parseUser();
  if (!user || user.role === "sales") return;
  $("#modalQuickAdd").classList.remove("hidden");
  $("#qaHint").textContent = "";
  const sel = $("#qaOwner");
  sel.innerHTML = '<option value="">—</option>';
  try {
    const u = await api("/v1/users");
    for (const row of u.items) {
      const o = document.createElement("option");
      o.value = String(row.id);
      o.textContent = `${row.name} (${row.email})`;
      sel.appendChild(o);
    }
  } catch (_) {}
}

function closeQuickAddModal() {
  $("#modalQuickAdd").classList.add("hidden");
}

async function submitQuickAdd() {
  const name_en = $("#qaNameEn").value.trim();
  const country = $("#qaCountry").value.trim().toUpperCase();
  if (!name_en || !country) {
    $("#qaHint").textContent = "请填写英文名称与国家代码";
    return;
  }
  try {
    const body = {
      name_en,
      name_cn: $("#qaNameCn").value.trim() || null,
      country_code: country,
      region: $("#qaRegion").value,
      abc_class: $("#qaAbc").value,
      annual_revenue_usd: Number($("#qaRevenue").value) || 80000,
      gross_margin_pct: Number($("#qaMargin").value) || 22,
    };
    const oid = $("#qaOwner").value;
    if (oid) body.owner_user_id = Number(oid);
    const r = await api("/v1/channels", { method: "POST", body });
    $("#qaHint").textContent = "已创建 " + r.channel.channel_code;
    setTimeout(() => {
      closeQuickAddModal();
      showView("channels");
      loadChannels();
    }, 600);
  } catch (e) {
    $("#qaHint").textContent = e.data?.error || e.message;
  }
}

function bindNav() {
  document.querySelectorAll(".sidebar nav button[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-nav");
      showView(v);
      if (v === "dashboard") loadDashboard().catch((e) => console.error(e));
      if (v === "channels") loadChannels().catch((e) => console.error(e));
      if (v === "intel") {
        $("#intelDetail").classList.add("hidden");
        currentIntelCountry = null;
        loadIntelList().catch((e) => console.error(e));
      }
      if (v === "alerts") loadAlerts().catch((e) => console.error(e));
      if (v === "playbook") loadPlaybook().catch((e) => console.error(e));
      if (v === "valueMap") loadValueMap().catch((e) => console.error(e));
      if (v === "valueRoi") loadValueRoi();
      if (v === "perf") loadPerf().catch((e) => console.error(e));
      if (v === "import") loadImportBatches().catch(() => {});
    });
  });
  $("#btnBackChannels").addEventListener("click", () => {
    destroyChannelCharts();
    showView("channels");
    loadChannels();
  });
  $("#btnSaveNotes").addEventListener("click", () => saveChannelNotes());
  $("#btnApplyFilters").addEventListener("click", () => loadChannels());
  $("#btnRunQuote").addEventListener("click", () => runQuote().catch((e) => alert(e.message)));
  $("#btnImportPreview").addEventListener("click", () => runImportPreview().catch((e) => alert(e.message)));
  $("#btnImportCommit").addEventListener("click", () => runImportCommit().catch((e) => alert(e.message)));
  $("#btnImportJson").addEventListener("click", () => doImportJsonDirect().catch((e) => alert(e.message)));
  $("#btnImportFile").addEventListener("click", () => doImportFile().catch((e) => alert(e.message)));
  $("#btnCsvToJson").addEventListener("click", () => onCsvToJson());
  $("#btnRefreshBatches").addEventListener("click", () => loadImportBatches().catch((e) => alert(e.message)));
  $("#btnLoadTemplate").addEventListener("click", () => loadImportTemplate().catch((e) => alert(e.message)));
  $("#btnFillSample").addEventListener("click", fillSampleImport);
  $("#btnOpenQuickAdd").addEventListener("click", () => openQuickAddModal());
  $("#btnOpenQuickAdd2").addEventListener("click", () => openQuickAddModal());
  $("#qaCancel").addEventListener("click", closeQuickAddModal);
  $("#qaSubmit").addEventListener("click", () => submitQuickAdd());
  $("#btnAddMetric").addEventListener("click", () => addMonthlyMetric().catch((e) => alert(e.message)));
  const btnIntelClose = $("#btnIntelCloseDetail");
  if (btnIntelClose) {
    btnIntelClose.addEventListener("click", () => {
      $("#intelDetail").classList.add("hidden");
      currentIntelCountry = null;
    });
  }
  $("#modalQuickAdd").addEventListener("click", (e) => {
    if (e.target.id === "modalQuickAdd") closeQuickAddModal();
  });
  document.querySelectorAll("[data-nav-jump]").forEach((el) => {
    el.addEventListener("click", () => {
      const v = el.getAttribute("data-nav-jump");
      if (!v) return;
      showView(v);
      if (v === "valueMap") loadValueMap().catch((e) => console.error(e));
    });
  });
  const briefBtns = [
    "#btnCopyExecBrief",
    "#btnCopyBriefDash",
    "#btnCopyBriefPlaybook",
    "#btnCopyBriefPerf",
  ];
  briefBtns.forEach((sel) => {
    const b = $(sel);
    if (b) b.addEventListener("click", () => copyExecutiveBriefing().catch((e) => alert(e.message)));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchAppConfig().then(() => updateShell());
  bindNav();
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#loginError").textContent = "";
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    try {
      const r = await api("/v1/auth/login", { method: "POST", body: { email, password } });
      setAuth(r.token, r.user);
      await fetchAppConfig();
      updateShell();
      $("#loginError").classList.add("hidden");
      $("#loginError").textContent = "";
      showView("dashboard");
      await loadDashboard();
    } catch (err) {
      $("#loginError").classList.remove("hidden");
      $("#loginError").textContent = err.data?.error || err.message || "登录失败";
    }
  });
  $("#btnLogout").addEventListener("click", () => {
    setAuth(null, null);
    showView("dashboard");
  });
  updateShell();
  if (localStorage.getItem(TOKEN_KEY)) {
    fetchAppConfig()
      .then(() => {
        updateShell();
        showView("dashboard");
        return loadDashboard();
      })
      .catch(() => setAuth(null, null));
  }
});
