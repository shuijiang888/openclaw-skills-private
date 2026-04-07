/* global fetch, localStorage, document, window */

const TOKEN_KEY = "srne_ops_token";
const USER_KEY = "srne_ops_user";

function apiBase() {
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

function showView(name) {
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
      alerts: "预警中心",
      import: "数据导入",
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
  const imp = $("#navImport");
  if (imp) imp.classList.toggle("hidden", user && user.role === "sales");
}

async function loadDashboard() {
  const s = await api("/v1/dashboard/summary");
  $("#kpiChannels").textContent = s.channelCount;
  $("#kpiRevenue").textContent =
    s.activeRevenueUsd >= 1e6
      ? `${(s.activeRevenueUsd / 1e6).toFixed(2)}M USD`
      : `${Math.round(s.activeRevenueUsd / 1000)}k USD`;
  $("#kpiAlerts").textContent = s.openAlerts;
  $("#kpiSam").textContent = s.samAccounts;
  $("#kpiAbc").textContent = `A ${s.abc.A || 0} · B ${s.abc.B || 0} · C ${s.abc.C || 0}`;
}

async function loadChannels() {
  const region = $("#filterRegion").value;
  const abc = $("#filterAbc").value;
  const q = $("#filterQ").value.trim();
  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (abc) params.set("abc", abc);
  if (q) params.set("q", q);
  const res = await api("/v1/channels?" + params.toString());
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

async function openChannel(id) {
  currentChannelId = id;
  showView("channelDetail");
  const res = await api("/v1/channels/" + id);
  const c = res.channel;
  $("#chTitle").textContent = `${c.channel_code} · ${c.name_en}`;
  $("#chMeta").innerHTML = `
    <div class="row"><span class="muted">国家</span> ${c.country_code} &nbsp;|&nbsp; <span class="muted">区域</span> ${c.region}
    &nbsp;|&nbsp; <span class="muted">分级</span> <span class="badge ${c.abc_class}">${c.abc_class}</span>
    &nbsp;|&nbsp; <span class="muted">CLV(演示)</span> ${Number(c.clv_score).toFixed(1)}
    &nbsp;|&nbsp; <span class="muted">状态</span> ${c.status}</div>
    <p class="muted">负责人：${escapeHtml(c.owner_name || "—")} ${c.owner_email ? `(${escapeHtml(c.owner_email)})` : ""}</p>
  `;
  $("#chNotes").value = c.notes || "";
  const maxR = Math.max(...res.monthly.map((m) => m.revenue_usd), 1);
  const chart = $("#monthlyChart");
  chart.innerHTML = "";
  res.monthly.forEach((m) => {
    const h = Math.round((m.revenue_usd / maxR) * 100);
    const d = document.createElement("div");
    d.className = "bar";
    d.style.height = h + "%";
    d.innerHTML = `<span>${m.ym.slice(5)}</span>`;
    chart.appendChild(d);
  });
  const altb = $("#chAlerts tbody");
  altb.innerHTML = "";
  for (const a of res.alerts) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.severity}</td>
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

async function runQuote() {
  const body = {
    countryCode: $("#quoteCountry").value,
    category: $("#quoteCat").value,
    qty: Number($("#quoteQty").value || 1),
    fobUnitUsd: Number($("#quoteFob").value || 45),
  };
  const r = await api("/v1/tools/quote", { method: "POST", body });
  $("#quoteOut").textContent = JSON.stringify(r, null, 2);
}

async function loadAlerts() {
  const res = await api("/v1/alerts?open=1");
  const tb = $("#alertsTable tbody");
  tb.innerHTML = "";
  for (const a of res.items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.severity}</td>
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

async function loadPerf() {
  const res = await api("/v1/performance/summary");
  $("#perfOut").textContent = JSON.stringify(res.byClass, null, 2);
}

async function doImportJson() {
  let data;
  try {
    data = JSON.parse($("#importJson").value);
  } catch (e) {
    $("#importResult").textContent = "JSON 解析失败：" + e.message;
    return;
  }
  const r = await api("/v1/import/channels", { method: "POST", body: data });
  $("#importResult").textContent = JSON.stringify(r, null, 2);
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
}

function bindNav() {
  document.querySelectorAll(".sidebar nav button[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = btn.getAttribute("data-nav");
      showView(v);
      if (v === "dashboard") loadDashboard();
      if (v === "channels") loadChannels();
      if (v === "intel") {
        loadIntelList();
        $("#intelDetail").classList.add("hidden");
      }
      if (v === "alerts") loadAlerts();
      if (v === "perf") loadPerf();
    });
  });
  $("#btnBackChannels").addEventListener("click", () => {
    showView("channels");
    loadChannels();
  });
  $("#btnSaveNotes").addEventListener("click", () => saveChannelNotes());
  $("#btnApplyFilters").addEventListener("click", () => loadChannels());
  $("#btnRunQuote").addEventListener("click", () => runQuote().catch((e) => alert(e.message)));
  $("#btnImportJson").addEventListener("click", () => doImportJson().catch((e) => alert(e.message)));
  $("#btnImportFile").addEventListener("click", () => doImportFile().catch((e) => alert(e.message)));
}

document.addEventListener("DOMContentLoaded", () => {
  bindNav();
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#loginError").textContent = "";
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    try {
      const r = await api("/v1/auth/login", { method: "POST", body: { email, password } });
      setAuth(r.token, r.user);
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
    showView("dashboard");
    loadDashboard().catch(() => setAuth(null, null));
  }
});
