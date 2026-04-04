(function () {
  const KEY = "zt007_cloud_demo_v1";
  const state = Object.assign(
    { score: 180, done: 0, submissions: [], redemptions: [], role: "sales" },
    JSON.parse(localStorage.getItem(KEY) || "{}"),
  );

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[m] || m;
    });
  }

  function render() {
    const score = document.getElementById("score");
    const done = document.getElementById("done");
    const subList = document.getElementById("subList");
    const redList = document.getElementById("redList");
    const subCount = document.getElementById("subCount");
    const roleSelect = document.getElementById("roleSelect");
    const device = document.getElementById("device");
    if (score) score.textContent = String(state.score);
    if (done) done.textContent = String(state.done);
    if (subCount) subCount.textContent = String(state.submissions.length);
    if (roleSelect) roleSelect.value = state.role;
    if (device) {
      const w = window.innerWidth;
      device.textContent = w < 780 ? "mobile" : w < 1024 ? "tablet" : "desktop";
    }

    if (subList) {
      subList.innerHTML = state.submissions.length
        ? state.submissions
            .slice()
            .reverse()
            .map(
              (s) => `<div class="item">
                <div class="row"><strong>${esc(s.title)}</strong><span class="badge">${esc(s.type)}</span></div>
                <div class="small">${esc(s.region)} · ${esc(s.format)} · ${new Date(s.ts).toLocaleString()}</div>
              </div>`,
            )
            .join("")
        : '<div class="small">No submissions yet.</div>';
    }

    if (redList) {
      redList.innerHTML = state.redemptions.length
        ? state.redemptions
            .slice()
            .reverse()
            .map(
              (r) => `<div class="item">
                <div class="row"><strong>${esc(r.item)}</strong><span class="badge ok">REQUESTED</span></div>
                <div class="small">Code: ${esc(r.code)} · Cost: ${r.cost} · ${new Date(r.ts).toLocaleString()}</div>
              </div>`,
            )
            .join("")
        : '<div class="small">No redemption records.</div>';
    }

    const mgrOpsAdmin = document.querySelectorAll(".only-mgr,.only-ops,.only-admin");
    mgrOpsAdmin.forEach((el) => {
      el.classList.add("hidden");
    });
    if (state.role === "manager" || state.role === "ops" || state.role === "admin") {
      document.querySelectorAll(".only-mgr").forEach((el) => el.classList.remove("hidden"));
    }
    if (state.role === "ops" || state.role === "admin") {
      document.querySelectorAll(".only-ops").forEach((el) => el.classList.remove("hidden"));
    }
    if (state.role === "admin") {
      document.querySelectorAll(".only-admin").forEach((el) => el.classList.remove("hidden"));
    }
  }

  document.querySelectorAll("[data-done]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.locked === "1") return;
      const reward = Number(btn.getAttribute("data-reward") || 10);
      state.score += reward;
      state.done += 1;
      btn.dataset.locked = "1";
      btn.textContent = "Done";
      save();
      render();
    });
  });

  document.querySelectorAll("[data-claim]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.textContent = "Claimed";
      btn.disabled = true;
    });
  });

  const roleSelect = document.getElementById("roleSelect");
  if (roleSelect) {
    roleSelect.addEventListener("change", (e) => {
      state.role = e.target.value;
      save();
      render();
    });
  }

  const form = document.getElementById("submissionForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const title = String(fd.get("title") || "").trim();
      const content = String(fd.get("content") || "").trim();
      if (!title || !content) {
        alert("Please fill title and content.");
        return;
      }
      state.submissions.push({
        title,
        content,
        type: String(fd.get("type") || "tactical"),
        region: String(fd.get("region") || ""),
        format: String(fd.get("format") || "text"),
        ts: Date.now(),
      });
      state.score += 8;
      form.reset();
      save();
      render();
    });
  }

  const openRedeem = document.getElementById("openRedeem");
  const closeRedeem = document.getElementById("closeRedeem");
  const redeemModal = document.getElementById("redeemModal");
  const redeemForm = document.getElementById("redeemForm");
  if (openRedeem && redeemModal) {
    openRedeem.addEventListener("click", () => {
      redeemModal.style.display = "flex";
    });
  }
  if (closeRedeem && redeemModal) {
    closeRedeem.addEventListener("click", () => {
      redeemModal.style.display = "none";
    });
  }
  if (redeemForm && redeemModal) {
    redeemForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(redeemForm);
      const item = String(fd.get("item") || "Training Session");
      const cost = Number(fd.get("cost") || 100);
      if (state.score < cost) {
        alert("Insufficient points.");
        return;
      }
      state.score -= cost;
      state.redemptions.push({
        item,
        cost,
        code: `RDM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        ts: Date.now(),
      });
      redeemModal.style.display = "none";
      save();
      render();
    });
  }

  window.addEventListener("resize", render);
  render();
})();
