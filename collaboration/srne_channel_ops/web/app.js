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
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
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
      },
    })
  );
}

async function loadChannels() {
  const region = $("#filterRegion").value;
  const abc = $("#filterAbc").value;
  const q = $("#filterQ").value.trim();
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (abc) params.set("abc", abc);
  if (q) params.set("q", q);
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
  `;
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

async function loadIntelList() {
  const res = await api("/v1/intel/countries");
  const tb = $("#intelTable tbody");
  tb.innerHTML = "";
  for (const m of res.items) {
    const tr = document.createElement("tr");
    const pd = String(m.policy_digest || "");
    tr.innerHTML = `
      <td><a href="#" data-cc="${m.country_code}" class="intel-link">${m.country_code}</a></td>
      <td>${m.opportunity_score}</td>
      <td>${escapeHtml(pd.length > 80 ? pd.slice(0, 80) + "…" : pd)}</td>
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
  const res = await api("/v1/intel/" + cc);
  $("#intelDetail").classList.remove("hidden");
  const intel = res.intel;
  const brief = res.brief;
  let html = "";
  if (intel) {
    html += `<h3>${intel.country_code} · 机会指数 ${intel.opportunity_score}</h3>
      <p><strong>政策</strong><br>${escapeHtml(intel.policy_digest)}</p>
      <p><strong>竞品</strong><br>${escapeHtml(intel.competitor_note)}</p>
      <p><strong>产品匹配</strong><br>${escapeHtml(intel.product_fit_note)}</p>`;
  }
  if (brief) {
    html += `<h3>${escapeHtml(brief.title)}</h3><pre style="white-space:pre-wrap;font:inherit;color:var(--muted)">${escapeHtml(brief.body_markdown)}</pre>`;
  }
  $("#intelBody").innerHTML = html || "暂无详情";
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
    tr.innerHTML = `
      <td>${a.severity}</td>
      <td>${slaAgeLabel(a.age_days, a.severity)}</td>
      <td>${escapeHtml(a.channel_code)}</td>
      <td>${escapeHtml(a.message)}</td>
      <td><button class="btn secondary ack-b" data-aid="${a.id}">确认</button></td>
    `;
    tb.appendChild(tr);
  }
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
    `;
    rt.appendChild(tr);
  }

  const wt = $("#perfWatchTable tbody");
  wt.innerHTML = "";
  for (const w of sc.watchlist || []) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(w.channel_code)}</td>
      <td>${escapeHtml(w.name_en)}</td>
      <td><span class="badge ${w.abc_class}">${w.abc_class}</span></td>
      <td>${w.ar_overdue_days}</td>
      <td>${fmtUsd(w.annual_revenue_usd)}</td>
      <td>${w.clv_score != null ? Number(w.clv_score).toFixed(1) : "—"}</td>
      <td>${w.last_contact_date || "—"}</td>
    `;
    wt.appendChild(tr);
  }

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
        loadIntelList().catch((e) => console.error(e));
      }
      if (v === "alerts") loadAlerts().catch((e) => console.error(e));
      if (v === "playbook") loadPlaybook().catch((e) => console.error(e));
      if (v === "valueMap") loadValueMap().catch((e) => console.error(e));
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
