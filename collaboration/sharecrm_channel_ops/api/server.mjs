/**
 * 纷享销客海外渠道运营 — 高保真演示 API
 * SQLite + JWT(HMAC) + 静态 Web；种子数据见 ../data/seed.json
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import Database from "better-sqlite3";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WEB_DIR = join(ROOT, "web");
const SEED_PATH = join(ROOT, "data", "seed.json");

const PORT = Number(process.env.PORT || 8790);
const DB_PATH = process.env.SHARECRM_DB_PATH || join(__dirname, "sharecrm_channel.db");
const JWT_SECRET = process.env.JWT_SECRET || "sharecrm-demo-change-me-in-production";
const TOKEN_TTL_SEC = Number(process.env.TOKEN_TTL_SEC || 604800);
const SHARECRM_DEMO_MODE = process.env.SHARECRM_DEMO_MODE === "1" || process.env.SHARECRM_DEMO_MODE === "true";

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS app_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','sales')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS channel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_code TEXT NOT NULL UNIQUE,
  name_cn TEXT,
  name_en TEXT NOT NULL,
  country_code TEXT NOT NULL,
  region TEXT NOT NULL,
  lifecycle_stage TEXT NOT NULL,
  abc_class TEXT NOT NULL CHECK (abc_class IN ('A','B','C')),
  clv_score REAL NOT NULL DEFAULT 0,
  agreement_expire_date TEXT,
  sam_flag INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','SLEEP','EXIT')),
  owner_user_id INTEGER REFERENCES app_user(id),
  last_contact_date TEXT,
  notes TEXT,
  strategic_fit_score REAL,
  profit_dim_score REAL,
  growth_dim_score REAL,
  annual_revenue_usd REAL,
  gross_margin_pct REAL,
  ar_overdue_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_channel_region ON channel(region);
CREATE INDEX IF NOT EXISTS idx_channel_abc ON channel(abc_class);
CREATE INDEX IF NOT EXISTS idx_channel_owner ON channel(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_channel_country ON channel(country_code);

CREATE TABLE IF NOT EXISTS channel_monthly_metric (
  channel_id INTEGER NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  ym TEXT NOT NULL,
  revenue_usd REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (channel_id, ym)
);

CREATE TABLE IF NOT EXISTS market_intel (
  country_code TEXT PRIMARY KEY,
  opportunity_score INTEGER NOT NULL,
  policy_digest TEXT,
  competitor_note TEXT,
  product_fit_note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_brief (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warn','critical')),
  message TEXT NOT NULL,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alert_channel ON alert(channel_id);
CREATE INDEX IF NOT EXISTS idx_alert_ack ON alert(acknowledged_at);

CREATE TABLE IF NOT EXISTS import_batch (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  actor_user_id INTEGER REFERENCES app_user(id),
  action TEXT NOT NULL,
  row_total INTEGER NOT NULL DEFAULT 0,
  row_ok INTEGER NOT NULL DEFAULT 0,
  row_err INTEGER NOT NULL DEFAULT 0,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_import_batch_created ON import_batch(created_at);
`);

(function migrateIntelV2() {
  const cols = [
    ["value_headline", "TEXT"],
    ["trend_direction", "TEXT"],
    ["trend_note", "TEXT"],
    ["key_risk", "TEXT"],
    ["key_window", "TEXT"],
    ["tags_json", "TEXT"],
  ];
  for (const [name, typ] of cols) {
    try {
      db.exec(`ALTER TABLE market_intel ADD COLUMN ${name} ${typ}`);
    } catch (_) {
      /* already exists */
    }
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS intel_note (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country_code TEXT NOT NULL,
      actor_user_id INTEGER REFERENCES app_user(id),
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_intel_note_cc ON intel_note(country_code, created_at);
  `);
})();

(function migrateChannel360() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS channel_competitor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      threat TEXT NOT NULL DEFAULT 'medium' CHECK(threat IN ('low','medium','high')),
      note TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ch_comp_ch ON channel_competitor(channel_id);
    CREATE TABLE IF NOT EXISTS channel_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
      actor_user_id INTEGER REFERENCES app_user(id),
      kind TEXT NOT NULL CHECK(kind IN ('enablement','issue','request','competitor','milestone','visit')),
      title TEXT NOT NULL,
      body TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','doing','done','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ch_act_ch ON channel_activity(channel_id, created_at);
  `);
})();

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expect = createHmac("sha256", JWT_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

function loadSeed() {
  if (!existsSync(SEED_PATH)) return null;
  return JSON.parse(readFileSync(SEED_PATH, "utf8"));
}

function ensureSeed() {
  const u = db.prepare(`SELECT COUNT(*) AS c FROM app_user`).get();
  if (u.c > 0) return;
  const seed = loadSeed();
  if (!seed) return;

  const insUser = db.prepare(
    `INSERT INTO app_user (email, password, name, role) VALUES (?,?,?,?)`
  );
  const emailToId = new Map();
  for (const row of seed.users || []) {
    const info = insUser.run(row.email, row.password, row.name, row.role);
    emailToId.set(String(row.email).toLowerCase(), Number(info.lastInsertRowid));
  }

  const insCh = db.prepare(`
    INSERT INTO channel (
      channel_code, name_cn, name_en, country_code, region, lifecycle_stage, abc_class,
      clv_score, agreement_expire_date, sam_flag, status, owner_user_id, last_contact_date,
      notes, strategic_fit_score, profit_dim_score, growth_dim_score,
      annual_revenue_usd, gross_margin_pct, ar_overdue_days
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (const c of seed.channels || []) {
    const oid = c.owner_email ? emailToId.get(String(c.owner_email).toLowerCase()) : null;
    insCh.run(
      c.channel_code,
      c.name_cn ?? null,
      c.name_en,
      c.country_code,
      c.region,
      c.lifecycle_stage,
      c.abc_class,
      Number(c.clv_score) || 0,
      c.agreement_expire_date ?? null,
      c.sam_flag ? 1 : 0,
      c.status,
      oid,
      c.last_contact_date ?? null,
      c.notes ?? null,
      c.strategic_fit_score ?? null,
      c.profit_dim_score ?? null,
      c.growth_dim_score ?? null,
      c.annual_revenue_usd ?? null,
      c.gross_margin_pct ?? null,
      c.ar_overdue_days ?? 0
    );
  }

  const insIntel = db.prepare(`
    INSERT INTO market_intel (
      country_code, opportunity_score, policy_digest, competitor_note, product_fit_note,
      value_headline, trend_direction, trend_note, key_risk, key_window, tags_json
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (const m of seed.market_intel || []) {
    const tagsJson =
      m.tags_json != null
        ? String(m.tags_json)
        : m.tags != null
          ? JSON.stringify(m.tags)
          : null;
    insIntel.run(
      m.country_code,
      m.opportunity_score,
      m.policy_digest ?? "",
      m.competitor_note ?? "",
      m.product_fit_note ?? "",
      m.value_headline ?? null,
      m.trend_direction ?? null,
      m.trend_note ?? null,
      m.key_risk ?? null,
      m.key_window ?? null,
      tagsJson
    );
  }

  const insBrief = db.prepare(
    `INSERT INTO sales_brief (country_code, title, body_markdown) VALUES (?,?,?)`
  );
  for (const b of seed.sales_briefs || []) {
    insBrief.run(b.country_code, b.title, b.body_markdown);
  }

  const codeToId = new Map(
    db.prepare(`SELECT id, channel_code FROM channel`).all().map((r) => [r.channel_code, r.id])
  );
  const insAl = db.prepare(`
    INSERT INTO alert (channel_id, alert_type, severity, message) VALUES (?,?,?,?)
  `);
  for (const a of seed.alerts || []) {
    const cid = codeToId.get(a.channel_code);
    if (cid) insAl.run(cid, a.alert_type, a.severity, a.message);
  }

  const insComp = db.prepare(
    `INSERT INTO channel_competitor (channel_id, name, threat, note) VALUES (?,?,?,?)`
  );
  for (const x of seed.channel_competitors || []) {
    const cid = codeToId.get(x.channel_code);
    if (cid) {
      insComp.run(cid, String(x.name).slice(0, 200), x.threat || "medium", x.note != null ? String(x.note).slice(0, 2000) : "");
    }
  }
  const insAct = db.prepare(
    `INSERT INTO channel_activity (channel_id, actor_user_id, kind, title, body, status) VALUES (?,?,?,?,?,?)`
  );
  const emailToUserId = new Map(
    db.prepare(`SELECT id, lower(email) AS e FROM app_user`).all().map((r) => [r.e, r.id])
  );
  const actKinds = new Set(["enablement", "issue", "request", "competitor", "milestone", "visit"]);
  for (const x of seed.channel_activities || []) {
    const cid = codeToId.get(x.channel_code);
    if (!cid) continue;
    const kind = String(x.kind || "visit");
    if (!actKinds.has(kind)) continue;
    const aid = x.actor_email ? emailToUserId.get(String(x.actor_email).toLowerCase()) : null;
    insAct.run(
      cid,
      aid ?? null,
      kind,
      String(x.title || "").slice(0, 200),
      x.body != null ? String(x.body).slice(0, 4000) : "",
      ["open", "doing", "done", "cancelled"].includes(x.status) ? x.status : "open"
    );
  }

  seedMonthlyForAllChannels();
}

/** 为每个渠道生成 12 个月演示出货（与年出货额大致匹配） */
function seedMonthlyForAllChannels() {
  const insM = db.prepare(
    `INSERT OR REPLACE INTO channel_monthly_metric (channel_id, ym, revenue_usd) VALUES (?,?,?)`
  );
  const now = new Date();
  const all = db.prepare(`SELECT id, annual_revenue_usd FROM channel`).all();
  for (const ch of all) {
    const base = ch.annual_revenue_usd && ch.annual_revenue_usd > 0 ? ch.annual_revenue_usd / 12 : 8000;
    for (let k = 11; k >= 0; k--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const wave = 1 + 0.14 * Math.sin(k * 0.65 + ch.id * 0.31);
      const dip = k < 2 ? 0.9 : 1;
      insM.run(ch.id, ym, Math.round(base * wave * dip));
    }
  }
}

function nextChannelCode(region) {
  const prefix = `SHARECRM-${region}-`;
  const rows = db
    .prepare(`SELECT channel_code FROM channel WHERE channel_code LIKE ?`)
    .all(prefix + "%");
  let maxN = 0;
  const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`);
  for (const r of rows) {
    const m = r.channel_code.match(re);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return `${prefix}${String(maxN + 1).padStart(3, "0")}`;
}

ensureSeed();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true, credentials: true });
await app.register(fastifyMultipart, { limits: { fileSize: 5 * 1024 * 1024 } });

function getAuth(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return verifyToken(h.slice(7));
  return null;
}

function channelScopeWhere(user) {
  if (!user) return { sql: "1=0", args: [] };
  if (user.role === "admin" || user.role === "manager") return { sql: "1=1", args: [] };
  return { sql: "c.owner_user_id = ?", args: [user.sub] };
}

app.get("/v1/health", async () => ({
  ok: true,
  service: "sharecrm-channel-ops",
  time: new Date().toISOString(),
}));

/** 前端演示模式、标题等；无需登录 */
app.get("/v1/config", async () => ({
  demo_mode: SHARECRM_DEMO_MODE,
  product_title: "纷享销客海外渠道拓展运营管理系统",
}));

/** 价值图谱长页 HTML 片段（避免子路径下静态路径不一致） */
app.get("/v1/demo/value-map-html", async (req, reply) => {
  const p = join(WEB_DIR, "value-map-snippet.html");
  if (!existsSync(p)) return reply.code(404).send({ error: "value_map_missing" });
  reply.type("text/html; charset=utf-8").send(readFileSync(p, "utf8"));
});

app.post("/v1/auth/login", async (req, reply) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return reply.code(400).send({ error: "missing_credentials" });
  const row = db.prepare(`SELECT * FROM app_user WHERE lower(email) = ?`).get(email);
  if (!row || row.password !== password) {
    return reply.code(401).send({ error: "invalid_credentials" });
  }
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const token = signToken({ sub: row.id, role: row.role, email: row.email, exp });
  return {
    token,
    user: { id: row.id, email: row.email, name: row.name, role: row.role },
  };
});

app.get("/v1/me", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const row = db.prepare(`SELECT id, email, name, role FROM app_user WHERE id = ?`).get(auth.sub);
  if (!row) return reply.code(401).send({ error: "unauthorized" });
  return { user: row };
});

app.get("/v1/dashboard/summary", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const sc = channelScopeWhere(auth);
  const chFilter = sc.sql === "1=1" ? "" : ` AND ${sc.sql.replace(/c\./g, "ch.")}`;
  const args = [...sc.args];

  const total = db
    .prepare(
      `SELECT COUNT(*) AS n FROM channel ch WHERE 1=1 ${chFilter}`
    )
    .get(...args);
  const byAbc = db
    .prepare(
      `SELECT ch.abc_class AS k, COUNT(*) AS n FROM channel ch WHERE 1=1 ${chFilter} GROUP BY ch.abc_class`
    )
    .all(...args);
  const byRegion = db
    .prepare(
      `SELECT ch.region AS k, COUNT(*) AS n FROM channel ch WHERE 1=1 ${chFilter} GROUP BY ch.region`
    )
    .all(...args);
  const revenue = db
    .prepare(
      `SELECT COALESCE(SUM(ch.annual_revenue_usd),0) AS s FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args);
  const alertsOpen = db
    .prepare(
      `SELECT COUNT(*) AS n FROM alert a
       JOIN channel ch ON ch.id = a.channel_id
       WHERE a.acknowledged_at IS NULL ${chFilter}`
    )
    .get(...args);
  const sam = db
    .prepare(
      `SELECT COUNT(*) AS n FROM channel ch WHERE ch.sam_flag=1 AND ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args);

  return {
    channelCount: total.n,
    abc: Object.fromEntries(byAbc.map((r) => [r.k, r.n])),
    region: Object.fromEntries(byRegion.map((r) => [r.k, r.n])),
    activeRevenueUsd: revenue.s,
    openAlerts: alertsOpen.n,
    samAccounts: sam.n,
  };
});

/** 驾驶舱图表：区域出货、月度趋势、TOP 渠道、情报分、与 summary 同口径 */
app.get("/v1/analytics/overview", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const sc = channelScopeWhere(auth);
  const chFilter = sc.sql === "1=1" ? "" : ` AND ${sc.sql.replace(/c\./g, "ch.")}`;
  const args = [...sc.args];

  const chF = sc.sql === "1=1" ? "" : ` AND ${sc.sql.replace(/c\./g, "ch.")}`;
  const sumArgs = [...sc.args];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM channel ch WHERE 1=1 ${chF}`).get(...sumArgs);
  const byAbc = db
    .prepare(`SELECT ch.abc_class AS k, COUNT(*) AS n FROM channel ch WHERE 1=1 ${chF} GROUP BY ch.abc_class`)
    .all(...sumArgs);
  const byRegion = db
    .prepare(`SELECT ch.region AS k, COUNT(*) AS n FROM channel ch WHERE 1=1 ${chF} GROUP BY ch.region`)
    .all(...sumArgs);
  const revenue = db
    .prepare(
      `SELECT COALESCE(SUM(ch.annual_revenue_usd), 0) AS s FROM channel ch WHERE ch.status = 'ACTIVE' ${chF}`
    )
    .get(...sumArgs);
  const alertsOpen = db
    .prepare(
      `SELECT COUNT(*) AS n FROM alert a
       JOIN channel ch ON ch.id = a.channel_id
       WHERE a.acknowledged_at IS NULL ${chF}`
    )
    .get(...sumArgs);
  const sam = db
    .prepare(`SELECT COUNT(*) AS n FROM channel ch WHERE ch.sam_flag = 1 AND ch.status = 'ACTIVE' ${chF}`)
    .get(...sumArgs);
  const sum = {
    channelCount: total.n,
    abc: Object.fromEntries(byAbc.map((r) => [r.k, r.n])),
    region: Object.fromEntries(byRegion.map((r) => [r.k, r.n])),
    activeRevenueUsd: revenue.s,
    openAlerts: alertsOpen.n,
    samAccounts: sam.n,
  };

  const revenueByRegion = db
    .prepare(
      `SELECT ch.region AS region,
              SUM(COALESCE(ch.annual_revenue_usd, 0)) AS revenue,
              COUNT(*) AS channel_count
       FROM channel ch WHERE ch.status = 'ACTIVE' ${chFilter}
       GROUP BY ch.region ORDER BY revenue DESC`
    )
    .all(...args);

  const monthlyTrend = db
    .prepare(
      `SELECT m.ym, SUM(m.revenue_usd) AS total
       FROM channel_monthly_metric m
       INNER JOIN channel ch ON ch.id = m.channel_id
       WHERE ch.status = 'ACTIVE' ${chFilter}
       GROUP BY m.ym ORDER BY m.ym ASC LIMIT 18`
    )
    .all(...args);

  const topChannels = db
    .prepare(
      `SELECT ch.id, ch.channel_code, ch.name_en, ch.annual_revenue_usd, ch.abc_class, ch.region, ch.country_code
       FROM channel ch WHERE ch.status = 'ACTIVE' ${chFilter}
       ORDER BY COALESCE(ch.annual_revenue_usd, 0) DESC LIMIT 12`
    )
    .all(...args);

  const intelOpportunity = db
    .prepare(`SELECT country_code, opportunity_score FROM market_intel ORDER BY opportunity_score DESC`)
    .all();

  const marginByClass = db
    .prepare(
      `SELECT ch.abc_class AS abc_class,
              AVG(COALESCE(ch.gross_margin_pct, 0)) AS avg_margin,
              SUM(COALESCE(ch.annual_revenue_usd, 0)) AS revenue_sum,
              COUNT(*) AS n
       FROM channel ch WHERE ch.status = 'ACTIVE' ${chFilter}
       GROUP BY ch.abc_class`
    )
    .all(...args);

  return {
    summary: sum,
    revenueByRegion,
    monthlyTrend,
    topChannels,
    intelOpportunity,
    marginByClass,
  };
});

app.get("/v1/users", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const rows = db.prepare(`SELECT id, email, name, role FROM app_user ORDER BY role DESC, id`).all();
  return { items: rows };
});

app.post("/v1/channels", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const b = req.body || {};
  const region = String(b.region || "SEA").toUpperCase().slice(0, 10);
  const name_en = String(b.name_en || "").trim().slice(0, 200);
  const country_code = String(b.country_code || "").toUpperCase().slice(0, 5);
  if (!name_en || !country_code) {
    return reply.code(400).send({ error: "missing_name_en_or_country" });
  }
  const channel_code = nextChannelCode(region);
  const abc_class = ["A", "B", "C"].includes(String(b.abc_class || "B").toUpperCase())
    ? String(b.abc_class).toUpperCase().slice(0, 1)
    : "B";
  const annual_revenue_usd = b.annual_revenue_usd != null ? Number(b.annual_revenue_usd) : 80000;
  const gross_margin_pct = b.gross_margin_pct != null ? Number(b.gross_margin_pct) : 22;
  const owner_user_id = b.owner_user_id != null ? Number(b.owner_user_id) : null;
  const clv_score = Math.min(520, Math.round(45 + annual_revenue_usd / 12000 + gross_margin_pct * 2));

  const stmt = db.prepare(`
    INSERT INTO channel (
      channel_code, name_cn, name_en, country_code, region, lifecycle_stage, abc_class,
      clv_score, agreement_expire_date, sam_flag, status, owner_user_id, last_contact_date,
      notes, strategic_fit_score, profit_dim_score, growth_dim_score,
      annual_revenue_usd, gross_margin_pct, ar_overdue_days, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
  `);
  const info = stmt.run(
    channel_code,
    b.name_cn != null ? String(b.name_cn).slice(0, 200) : null,
    name_en,
    country_code,
    region,
    String(b.lifecycle_stage || "active").toLowerCase(),
    abc_class,
    clv_score,
    b.agreement_expire_date ? String(b.agreement_expire_date).slice(0, 10) : null,
    b.sam_flag ? 1 : 0,
    String(b.status || "ACTIVE").toUpperCase(),
    owner_user_id,
    new Date().toISOString().slice(0, 10),
    b.notes != null ? String(b.notes).slice(0, 4000) : null,
    20,
    20,
    18,
    annual_revenue_usd,
    gross_margin_pct,
    b.ar_overdue_days != null ? Number(b.ar_overdue_days) : 0
  );
  const id = Number(info.lastInsertRowid);
  seedMonthlyForSingleChannel(id, annual_revenue_usd);
  const row = db
    .prepare(
      `SELECT c.*, u.name AS owner_name, u.email AS owner_email
       FROM channel c LEFT JOIN app_user u ON u.id = c.owner_user_id WHERE c.id = ?`
    )
    .get(id);
  return reply.code(201).send({ channel: mapChannelRow(row) });
});

function seedMonthlyForSingleChannel(channelId, annualUsd) {
  const insM = db.prepare(
    `INSERT OR REPLACE INTO channel_monthly_metric (channel_id, ym, revenue_usd) VALUES (?,?,?)`
  );
  const now = new Date();
  const base = annualUsd && annualUsd > 0 ? annualUsd / 12 : 8000;
  for (let k = 11; k >= 0; k--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const wave = 1 + 0.12 * Math.sin(k * 0.7 + channelId * 0.2);
    insM.run(channelId, ym, Math.round(base * wave * (k < 2 ? 0.92 : 1)));
  }
}

app.post("/v1/channels/:id/monthly-metrics", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const id = Number(req.params.id);
  const sc = channelScopeWhere(auth);
  const row = db.prepare(`SELECT * FROM channel c WHERE c.id = ? AND ${sc.sql}`).get(id, ...sc.args);
  if (!row) return reply.code(404).send({ error: "not_found" });
  if (auth.role === "sales" && row.owner_user_id !== auth.sub) {
    return reply.code(403).send({ error: "forbidden" });
  }
  const body = req.body || {};
  const ym = String(body.ym || "").trim();
  if (!/^\d{4}-\d{2}$/.test(ym)) return reply.code(400).send({ error: "invalid_ym" });
  const revenue_usd = Number(body.revenue_usd);
  if (Number.isNaN(revenue_usd) || revenue_usd < 0) {
    return reply.code(400).send({ error: "invalid_revenue" });
  }
  db.prepare(
    `INSERT OR REPLACE INTO channel_monthly_metric (channel_id, ym, revenue_usd) VALUES (?,?,?)`
  ).run(id, ym, revenue_usd);
  return { ok: true, channel_id: id, ym, revenue_usd };
});

app.get("/v1/channels", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const q = req.query || {};
  const sc = channelScopeWhere(auth);
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 100));
  const offset = Math.max(0, Number(q.offset) || 0);
  const region = typeof q.region === "string" ? q.region.trim() : "";
  const abc = typeof q.abc === "string" ? q.abc.trim() : "";
  const search = typeof q.q === "string" ? q.q.trim() : "";

  const conds = [sc.sql];
  const args = [...sc.args];
  if (region) {
    conds.push(`c.region = ?`);
    args.push(region);
  }
  if (abc && ["A", "B", "C"].includes(abc)) {
    conds.push(`c.abc_class = ?`);
    args.push(abc);
  }
  if (search) {
    conds.push(`(c.channel_code LIKE ? OR c.name_en LIKE ? OR IFNULL(c.name_cn,'') LIKE ?)`);
    const s = `%${search}%`;
    args.push(s, s, s);
  }
  const country = typeof q.country === "string" ? q.country.trim().toUpperCase() : "";
  if (country.length >= 2 && country.length <= 5) {
    conds.push(`c.country_code = ?`);
    args.push(country);
  }
  const where = conds.join(" AND ");
  const rows = db
    .prepare(
      `SELECT c.*, u.name AS owner_name, u.email AS owner_email
       FROM channel c
       LEFT JOIN app_user u ON u.id = c.owner_user_id
       WHERE ${where}
       ORDER BY c.updated_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...args, limit, offset);
  const cnt = db.prepare(`SELECT COUNT(*) AS n FROM channel c WHERE ${where}`).get(...args);
  return { total: cnt.n, items: rows };
});

function mapChannelRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    channel_code: r.channel_code,
    name_cn: r.name_cn,
    name_en: r.name_en,
    country_code: r.country_code,
    region: r.region,
    lifecycle_stage: r.lifecycle_stage,
    abc_class: r.abc_class,
    clv_score: r.clv_score,
    agreement_expire_date: r.agreement_expire_date,
    sam_flag: !!r.sam_flag,
    status: r.status,
    owner_user_id: r.owner_user_id,
    owner_name: r.owner_name,
    owner_email: r.owner_email,
    last_contact_date: r.last_contact_date,
    notes: r.notes,
    strategic_fit_score: r.strategic_fit_score,
    profit_dim_score: r.profit_dim_score,
    growth_dim_score: r.growth_dim_score,
    annual_revenue_usd: r.annual_revenue_usd,
    gross_margin_pct: r.gross_margin_pct,
    ar_overdue_days: r.ar_overdue_days,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function parseIntelTags(jsonStr) {
  if (!jsonStr) return [];
  try {
    const x = JSON.parse(jsonStr);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return [];
  }
}

function mapIntelRow(r) {
  if (!r) return null;
  return {
    country_code: r.country_code,
    opportunity_score: r.opportunity_score,
    policy_digest: r.policy_digest,
    competitor_note: r.competitor_note,
    product_fit_note: r.product_fit_note,
    updated_at: r.updated_at,
    value_headline: r.value_headline,
    trend_direction: r.trend_direction,
    trend_note: r.trend_note,
    key_risk: r.key_risk,
    key_window: r.key_window,
    tags: parseIntelTags(r.tags_json),
  };
}

function computeChannelPerformanceInsight(monthlyRows, ch) {
  const rows = [...(monthlyRows || [])].sort((a, b) => String(a.ym).localeCompare(String(b.ym)));
  const n = rows.length;
  const tail = rows.slice(Math.max(0, n - 3));
  const prev = rows.slice(Math.max(0, n - 6), Math.max(0, n - 3));
  const sum = (arr) => arr.reduce((s, x) => s + (Number(x.revenue_usd) || 0), 0);
  const sT = sum(tail);
  const sP = sum(prev);
  let trend = "stable";
  let pct = 0;
  if (sP > 0) {
    pct = Math.round(((sT - sP) / sP) * 1000) / 10;
    if (pct >= 8) trend = "up";
    else if (pct <= -8) trend = "down";
  } else if (sT > 0) trend = "up";
  const lines = [];
  lines.push(
    `近 3 个有数据月份出货合计约 ${Math.round(sT)} USD；对比再往前 3 个月约 ${Math.round(sP)} USD（演示月度明细）。`
  );
  if (trend === "up") lines.push("趋势洞察：回暖 / 扩张，可加大赋能资源与联合案例投入。");
  else if (trend === "down") lines.push("趋势洞察：承压，建议对齐预警、竞品与需求工单排查根因。");
  else lines.push("趋势洞察：相对稳定，可用目标阶梯与分级策略微调激励。");
  if (ch.abc_class === "A") lines.push("A 级渠道：资金流与信息流应优先保障，便于区域战报达成。");
  return {
    trend,
    recent_3m_revenue_usd: Math.round(sT),
    prior_3m_revenue_usd: Math.round(sP),
    change_pct_vs_prior: pct,
    narrative_lines: lines,
  };
}

function buildChannelFlows(ch, _metrics, bc, competitors, activities) {
  const info = [];
  const biz = [];
  const fin = [];
  info.push({
    key: "intel",
    label: "国家情报",
    detail: bc?.market_intel
      ? `${ch.country_code} 机会指数 ${bc.market_intel.opportunity_score}，政策/竞品摘要与市场情报模块同源。`
      : `${ch.country_code} 尚无情报卡片 — 信息流缺口，建议优先补录。`,
  });
  if (bc?.sales_brief?.title) {
    info.push({
      key: "brief",
      label: "销售简报",
      detail: `已挂载《${bc.sales_brief.title}》，拜访前可读 + 纪要回写活动动态。`,
    });
  }
  info.push({
    key: "master",
    label: "主数据档案",
    detail:
      "静态：编码/国家/区域/分级/协议期；动态：联系日、生命周期、备注与下方活动流 — 构成 360 信息底座。",
  });
  const visitN = (activities || []).filter((a) => a.kind === "visit").length;
  if (visitN)
    info.push({ key: "visit", label: "现场输入", detail: `已登记 ${visitN} 条拜访/现场类记录，可反哺情报与需求。` });

  biz.push({
    key: "lifecycle",
    label: "业务流程",
    detail: `生命周期 ${ch.lifecycle_stage} · 运营状态 ${ch.status}${ch.sam_flag ? " · SAM 战略客户" : ""}，对应准入—培育—复盘闭环。`,
  });
  biz.push({
    key: "alerts",
    label: "预警 / SLA",
    detail: `${bc?.open_alerts_count ?? 0} 条未关预警与作战台 SLA 同源，关闭即业务流节点完成。`,
  });
  const reqOpen = (activities || []).filter((a) => a.kind === "request" && a.status !== "done" && a.status !== "cancelled").length;
  const issOpen = (activities || []).filter((a) => a.kind === "issue" && a.status !== "done" && a.status !== "cancelled").length;
  biz.push({
    key: "demand",
    label: "问题与需求工单",
    detail: `打开中：需求 ${reqOpen} · 问题 ${issOpen}（演示，可对接 CRM/工单）。`,
  });
  biz.push({
    key: "enable",
    label: "赋能动态",
    detail: `培训/物料/样机等活动见「赋能支持」类记录；竞品条目 ${competitors?.length ?? 0} 家支撑竞争策略。`,
  });

  fin.push({
    key: "roll",
    label: "出货节奏",
    detail: `年出货 roll（演示）约 ${Math.round(Number(ch.annual_revenue_usd) || 0)} USD；月度曲线即「资金流」时间展开。`,
  });
  fin.push({
    key: "margin_ar",
    label: "毛利 × 应收",
    detail: `毛利率 ${ch.gross_margin_pct != null ? ch.gross_margin_pct + "%" : "—"}；应收逾期 ${ch.ar_overdue_days ?? 0} 天 — 信用与回款压力指标。`,
  });
  fin.push({
    key: "quote",
    label: "报价联动",
    detail: "销售赋能按国家估算到岸与建议零售价，可与本渠道国家代码一键联动试算。",
  });
  return { information: info, business: biz, financial: fin };
}

function getChannelRowScoped(auth, id) {
  const sc = channelScopeWhere(auth);
  return db
    .prepare(
      `SELECT c.*, u.name AS owner_name, u.email AS owner_email
       FROM channel c
       LEFT JOIN app_user u ON u.id = c.owner_user_id
       WHERE c.id = ? AND ${sc.sql}`
    )
    .get(id, ...sc.args);
}

function intelCrossLinksForCountry(countryCode, auth) {
  const cc = String(countryCode || "").toUpperCase();
  const sc = channelScopeWhere(auth);
  const chWhere = `c.country_code = ? AND c.status = 'ACTIVE' AND ${sc.sql}`;
  const args = [cc, ...sc.args];
  const agg = db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(c.annual_revenue_usd), 0) AS rev FROM channel c WHERE ${chWhere}`).get(...args);
  const alWhere = `c.country_code = ? AND a.acknowledged_at IS NULL AND ${sc.sql}`;
  const alArgs = [cc, ...sc.args];
  const openAlerts = db
    .prepare(`SELECT COUNT(*) AS n FROM alert a JOIN channel c ON c.id = a.channel_id WHERE ${alWhere}`)
    .get(...alArgs).n;
  const topCh = db
    .prepare(
      `SELECT c.id, c.channel_code, c.name_en, COALESCE(c.annual_revenue_usd, 0) AS annual_revenue_usd
       FROM channel c WHERE ${chWhere}
       ORDER BY COALESCE(c.annual_revenue_usd, 0) DESC LIMIT 5`
    )
    .all(...args);
  return {
    scope_active_channels: agg.n,
    scope_revenue_roll_usd: agg.rev,
    scope_open_alerts: openAlerts,
    top_channels: topCh.map((c) => ({
      id: c.id,
      channel_code: c.channel_code,
      name_en: c.name_en,
      annual_revenue_usd: c.annual_revenue_usd,
    })),
  };
}

app.get("/v1/channels/:id", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const id = Number(req.params.id);
  const sc = channelScopeWhere(auth);
  const row = db
    .prepare(
      `SELECT c.*, u.name AS owner_name, u.email AS owner_email
       FROM channel c
       LEFT JOIN app_user u ON u.id = c.owner_user_id
       WHERE c.id = ? AND ${sc.sql}`
    )
    .get(id, ...sc.args);
  if (!row) return reply.code(404).send({ error: "not_found" });
  const metrics = db
    .prepare(
      `SELECT ym, revenue_usd FROM channel_monthly_metric WHERE channel_id = ? ORDER BY ym ASC`
    )
    .all(id);
  const alerts = db
    .prepare(
      `SELECT *, CAST((julianday('now') - julianday(created_at)) AS INTEGER) AS age_days
       FROM alert WHERE channel_id = ? ORDER BY datetime(created_at) DESC LIMIT 20`
    )
    .all(id);
  const intelRow = db
    .prepare(
      `SELECT country_code, opportunity_score, updated_at, value_headline, trend_direction, tags_json
       FROM market_intel WHERE country_code = ?`
    )
    .get(row.country_code);
  const briefRow = db
    .prepare(`SELECT title, updated_at FROM sales_brief WHERE country_code = ?`)
    .get(row.country_code);
  const openCt = db
    .prepare(`SELECT COUNT(*) AS n FROM alert WHERE channel_id = ? AND acknowledged_at IS NULL`)
    .get(id);
  const critCt = db
    .prepare(
      `SELECT COUNT(*) AS n FROM alert WHERE channel_id = ? AND acknowledged_at IS NULL AND severity = 'critical'`
    )
    .get(id);
  const business_context = {
    country_code: row.country_code,
    market_intel: intelRow
      ? {
          opportunity_score: intelRow.opportunity_score,
          updated_at: intelRow.updated_at,
          value_headline: intelRow.value_headline,
          trend_direction: intelRow.trend_direction,
          tags: parseIntelTags(intelRow.tags_json),
        }
      : null,
    sales_brief: briefRow ? { title: briefRow.title, updated_at: briefRow.updated_at } : null,
    open_alerts_count: openCt.n,
    critical_open_count: critCt.n,
    hints: [],
  };
  if (!intelRow) {
    business_context.hints.push("该国尚无市场情报卡片，可在「市场情报」补录或优先拓展调研。");
  } else if (intelRow.value_headline) {
    business_context.hints.push(`情报摘要：${intelRow.value_headline}`);
  }
  if (intelRow && parseIntelTags(intelRow.tags_json).length) {
    business_context.hints.push(`情报标签：${parseIntelTags(intelRow.tags_json).join(" · ")}`);
  }
  if (critCt.n > 0) {
    business_context.hints.push("存在未关闭的 critical 预警，建议当日闭环或升级。");
  }
  if ((row.ar_overdue_days || 0) > 15) {
    business_context.hints.push("应收逾期偏高，建议财务/渠道对账联动的跟进动作。");
  }

  const competitors = db
    .prepare(`SELECT id, name, threat, note, updated_at FROM channel_competitor WHERE channel_id = ? ORDER BY id`)
    .all(id);
  const activities = db
    .prepare(
      `SELECT a.id, a.kind, a.title, a.body, a.status, a.created_at, u.name AS actor_name
       FROM channel_activity a
       LEFT JOIN app_user u ON u.id = a.actor_user_id
       WHERE a.channel_id = ?
       ORDER BY datetime(a.created_at) DESC
       LIMIT 50`
    )
    .all(id);
  const performance_insight = computeChannelPerformanceInsight(metrics, row);
  const flows = buildChannelFlows(row, metrics, business_context, competitors, activities);
  const static_profile = {
    channel_code: row.channel_code,
    name_en: row.name_en,
    name_cn: row.name_cn,
    country_code: row.country_code,
    region: row.region,
    lifecycle_stage: row.lifecycle_stage,
    abc_class: row.abc_class,
    status: row.status,
    agreement_expire_date: row.agreement_expire_date,
    last_contact_date: row.last_contact_date,
    owner_name: row.owner_name,
    owner_email: row.owner_email,
    sam_flag: !!row.sam_flag,
  };

  return {
    channel: mapChannelRow(row),
    monthly: metrics,
    alerts,
    business_context,
    channel_360: {
      static_profile,
      performance_insight,
      flows,
      competitors,
      activities,
    },
  };
});

app.patch("/v1/channels/:id", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const id = Number(req.params.id);
  const sc = channelScopeWhere(auth);
  const row = db.prepare(`SELECT * FROM channel c WHERE c.id = ? AND ${sc.sql}`).get(id, ...sc.args);
  if (!row) return reply.code(404).send({ error: "not_found" });

  const body = req.body || {};
  const allowed = [
    "notes",
    "last_contact_date",
    "lifecycle_stage",
    "status",
    "abc_class",
    "sam_flag",
  ];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === "sam_flag") {
      sets.push(`sam_flag = ?`);
      vals.push(body[k] ? 1 : 0);
    } else {
      sets.push(`${k} = ?`);
      vals.push(String(body[k]).slice(0, 2000));
    }
  }
  if (!sets.length) return reply.code(400).send({ error: "no_updates" });
  sets.push(`updated_at = datetime('now')`);
  db.prepare(`UPDATE channel SET ${sets.join(", ")} WHERE id = ?`).run(...vals, id);
  const updated = db
    .prepare(
      `SELECT c.*, u.name AS owner_name, u.email AS owner_email
       FROM channel c LEFT JOIN app_user u ON u.id = c.owner_user_id WHERE c.id = ?`
    )
    .get(id);
  return { channel: mapChannelRow(updated) };
});

app.post("/v1/channels/:id/competitors", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const id = Number(req.params.id);
  const row = getChannelRowScoped(auth, id);
  if (!row) return reply.code(404).send({ error: "not_found" });
  if (auth.role === "sales" && row.owner_user_id !== auth.sub) {
    return reply.code(403).send({ error: "forbidden" });
  }
  const body = req.body || {};
  const name = String(body.name || "").trim();
  if (!name) return reply.code(400).send({ error: "name_required" });
  const threat = ["low", "medium", "high"].includes(String(body.threat || "").toLowerCase())
    ? String(body.threat).toLowerCase()
    : "medium";
  const note = body.note != null ? String(body.note).slice(0, 2000) : "";
  const info = db
    .prepare(`INSERT INTO channel_competitor (channel_id, name, threat, note) VALUES (?,?,?,?)`)
    .run(id, name.slice(0, 200), threat, note);
  const c = db.prepare(`SELECT * FROM channel_competitor WHERE id = ?`).get(info.lastInsertRowid);
  return { competitor: c };
});

app.delete("/v1/channels/:id/competitors/:cid", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const id = Number(req.params.id);
  const cid = Number(req.params.cid);
  const row = getChannelRowScoped(auth, id);
  if (!row) return reply.code(404).send({ error: "not_found" });
  if (auth.role === "sales" && row.owner_user_id !== auth.sub) {
    return reply.code(403).send({ error: "forbidden" });
  }
  const r = db.prepare(`SELECT id FROM channel_competitor WHERE id = ? AND channel_id = ?`).get(cid, id);
  if (!r) return reply.code(404).send({ error: "not_found" });
  db.prepare(`DELETE FROM channel_competitor WHERE id = ?`).run(cid);
  return { ok: true };
});

app.post("/v1/channels/:id/activities", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const id = Number(req.params.id);
  const row = getChannelRowScoped(auth, id);
  if (!row) return reply.code(404).send({ error: "not_found" });
  const body = req.body || {};
  const kind = String(body.kind || "visit").toLowerCase();
  if (!["enablement", "issue", "request", "competitor", "milestone", "visit"].includes(kind)) {
    return reply.code(400).send({ error: "invalid_kind" });
  }
  const title = String(body.title || "").trim();
  if (!title) return reply.code(400).send({ error: "title_required" });
  const b = body.body != null ? String(body.body).slice(0, 4000) : "";
  const st = String(body.status || "open");
  const status = ["open", "doing", "done", "cancelled"].includes(st) ? st : "open";
  const info = db
    .prepare(`INSERT INTO channel_activity (channel_id, actor_user_id, kind, title, body, status) VALUES (?,?,?,?,?,?)`)
    .run(id, auth.sub, kind, title.slice(0, 200), b, status);
  const a = db
    .prepare(
      `SELECT a.*, u.name AS actor_name FROM channel_activity a LEFT JOIN app_user u ON u.id = a.actor_user_id WHERE a.id = ?`
    )
    .get(info.lastInsertRowid);
  return { activity: a };
});

app.patch("/v1/channels/:id/activities/:aid", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const id = Number(req.params.id);
  const aid = Number(req.params.aid);
  const row = getChannelRowScoped(auth, id);
  if (!row) return reply.code(404).send({ error: "not_found" });
  const ex = db.prepare(`SELECT id FROM channel_activity WHERE id = ? AND channel_id = ?`).get(aid, id);
  if (!ex) return reply.code(404).send({ error: "not_found" });
  const body = req.body || {};
  if (body.status === undefined) return reply.code(400).send({ error: "no_updates" });
  const st = String(body.status);
  if (!["open", "doing", "done", "cancelled"].includes(st)) return reply.code(400).send({ error: "invalid_status" });
  db.prepare(`UPDATE channel_activity SET status = ? WHERE id = ?`).run(st, aid);
  const a = db
    .prepare(
      `SELECT a.*, u.name AS actor_name FROM channel_activity a LEFT JOIN app_user u ON u.id = a.actor_user_id WHERE a.id = ?`
    )
    .get(aid);
  return { activity: a };
});

app.get("/v1/alerts", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const sc = channelScopeWhere(auth);
  const onlyOpen = req.query?.open === "1" || req.query?.open === "true";
  const rows = db
    .prepare(
      `SELECT a.*, c.channel_code, c.name_en,
              CAST((julianday('now') - julianday(a.created_at)) AS INTEGER) AS age_days
       FROM alert a
       JOIN channel c ON c.id = a.channel_id
       WHERE ${sc.sql.replace(/c\./g, "c.")} ${onlyOpen ? "AND a.acknowledged_at IS NULL" : ""}
       ORDER BY datetime(a.created_at) DESC
       LIMIT 100`
    )
    .all(...sc.args);
  return { items: rows };
});

app.post("/v1/alerts/:id/ack", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const aid = Number(req.params.id);
  const sc = channelScopeWhere(auth);
  const a = db
    .prepare(
      `SELECT a.id FROM alert a JOIN channel c ON c.id = a.channel_id WHERE a.id = ? AND ${sc.sql}`
    )
    .get(aid, ...sc.args);
  if (!a) return reply.code(404).send({ error: "not_found" });
  db.prepare(`UPDATE alert SET acknowledged_at = datetime('now') WHERE id = ?`).run(aid);
  return { ok: true };
});

app.get("/v1/intel/countries", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const rows = db.prepare(`SELECT * FROM market_intel ORDER BY opportunity_score DESC`).all();
  const items = rows.map((r) => {
    const x = intelCrossLinksForCountry(r.country_code, auth);
    return {
      ...mapIntelRow(r),
      scope_active_channels: x.scope_active_channels,
      scope_revenue_roll_usd: x.scope_revenue_roll_usd,
      scope_open_alerts: x.scope_open_alerts,
    };
  });
  return { items };
});

app.get("/v1/intel/:countryCode", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const cc = String(req.params.countryCode || "").toUpperCase();
  const row = db.prepare(`SELECT * FROM market_intel WHERE country_code = ?`).get(cc);
  const brief = db.prepare(`SELECT * FROM sales_brief WHERE country_code = ?`).get(cc);
  if (!row && !brief) return reply.code(404).send({ error: "not_found" });
  const cross_links = intelCrossLinksForCountry(cc, auth);
  const notes = row
    ? db
        .prepare(
          `SELECT n.id, n.body, n.created_at, u.name AS actor_name
           FROM intel_note n
           LEFT JOIN app_user u ON u.id = n.actor_user_id
           WHERE n.country_code = ?
           ORDER BY datetime(n.created_at) DESC
           LIMIT 25`
        )
        .all(cc)
    : [];
  return {
    intel: row ? mapIntelRow(row) : null,
    brief,
    cross_links,
    intel_notes: notes,
  };
});

app.patch("/v1/intel/:countryCode", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const cc = String(req.params.countryCode || "").toUpperCase();
  const exists = db.prepare(`SELECT 1 FROM market_intel WHERE country_code = ?`).get(cc);
  if (!exists) return reply.code(404).send({ error: "not_found" });
  const body = req.body || {};
  const allowed = [
    "opportunity_score",
    "policy_digest",
    "competitor_note",
    "product_fit_note",
    "value_headline",
    "trend_direction",
    "trend_note",
    "key_risk",
    "key_window",
  ];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if (k === "opportunity_score") {
      const n = Number(body[k]);
      if (Number.isNaN(n) || n < 0 || n > 100) continue;
      sets.push(`${k} = ?`);
      vals.push(Math.round(n));
    } else if (k === "trend_direction") {
      const t = String(body[k]).toLowerCase();
      if (!["up", "stable", "down"].includes(t)) continue;
      sets.push(`${k} = ?`);
      vals.push(t);
    } else {
      sets.push(`${k} = ?`);
      vals.push(String(body[k]).slice(0, 8000));
    }
  }
  if (body.tags !== undefined) {
    const arr = Array.isArray(body.tags) ? body.tags : [];
    sets.push(`tags_json = ?`);
    vals.push(JSON.stringify(arr.map((x) => String(x).slice(0, 40)).slice(0, 16)));
  }
  if (!sets.length) return reply.code(400).send({ error: "no_updates" });
  sets.push(`updated_at = datetime('now')`);
  db.prepare(`UPDATE market_intel SET ${sets.join(", ")} WHERE country_code = ?`).run(...vals, cc);
  const row = db.prepare(`SELECT * FROM market_intel WHERE country_code = ?`).get(cc);
  return { intel: mapIntelRow(row) };
});

app.post("/v1/intel/:countryCode/notes", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const cc = String(req.params.countryCode || "").toUpperCase();
  const row = db.prepare(`SELECT 1 FROM market_intel WHERE country_code = ?`).get(cc);
  if (!row) return reply.code(404).send({ error: "not_found" });
  const body = req.body || {};
  const text = String(body.body ?? "").trim();
  if (!text) return reply.code(400).send({ error: "empty_body" });
  const info = db
    .prepare(`INSERT INTO intel_note (country_code, actor_user_id, body) VALUES (?,?,?)`)
    .run(cc, auth.sub, text.slice(0, 4000));
  const n = db
    .prepare(
      `SELECT n.id, n.body, n.created_at, u.name AS actor_name
       FROM intel_note n LEFT JOIN app_user u ON u.id = n.actor_user_id WHERE n.id = ?`
    )
    .get(info.lastInsertRowid);
  return { note: n };
});

/** 规则型报价演示：关税/运费/建议价为估算，非真实报价法律依据 */
const TARIFF = { PH: 0.05, ID: 0.08, VN: 0.06, TH: 0.07, SA: 0.04, AE: 0.03, ES: 0.06, IT: 0.06, DEFAULT: 0.07 };
const FREIGHT_PER_UNIT = { controller: 2.2, hybrid_inverter: 18, battery_pack: 9, DEFAULT: 5 };

app.post("/v1/tools/quote", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const b = req.body || {};
  const country = String(b.countryCode || "PH").toUpperCase();
  const category = String(b.category || "controller");
  const qty = Math.max(1, Math.min(100000, Number(b.qty) || 1));
  const fob = Math.max(0.01, Number(b.fobUnitUsd) || 45);
  const tariffRate = TARIFF[country] ?? TARIFF.DEFAULT;
  const freight = FREIGHT_PER_UNIT[category] ?? FREIGHT_PER_UNIT.DEFAULT;
  const landed = fob * (1 + tariffRate) + freight;
  const channelMargin = 0.22;
  const retailSuggest = landed / (1 - channelMargin);
  return {
    inputs: { countryCode: country, category, qty, fobUnitUsd: fob },
    assumptions: {
      tariffRate,
      freightUsdPerUnit: freight,
      channelMarginRate: channelMargin,
      note: "演示用规则引擎；生产环境应接入财务与贸易条款。",
    },
    perUnitUsd: { fob, tariff: fob * tariffRate, freight, landed, suggestedRetail: retailSuggest },
    lineTotalsUsd: {
      fob: fob * qty,
      landed: landed * qty,
      suggestedRetail: retailSuggest * qty,
    },
  };
});

app.get("/v1/performance/summary", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const sc = channelScopeWhere(auth);
  const chFilter = sc.sql === "1=1" ? "" : ` AND ${sc.sql.replace(/c\./g, "ch.")}`;
  const args = [...sc.args];
  const rows = db
    .prepare(
      `SELECT ch.abc_class, AVG(ch.gross_margin_pct) AS avg_margin,
              AVG(ch.ar_overdue_days) AS avg_ar,
              SUM(CASE WHEN ch.abc_class='A' THEN ch.annual_revenue_usd ELSE 0 END) AS rev_a
       FROM channel ch WHERE ch.status='ACTIVE' ${chFilter} GROUP BY ch.abc_class`
    )
    .all(...args);
  return { byClass: rows };
});

/** 演示用目标口径（可与 ERP/董事会版对齐后替换） */
const SCORECARD_TARGETS = {
  fiscal_period_label: "2026 Q1（演示滚动）",
  revenue_quarter_usd: 2_400_000,
  a_class_revenue_share_pct: 70,
  target_avg_margin_pct: 24,
  max_avg_ar_days: 40,
  max_open_critical_alerts: 4,
  min_active_channel_coverage: 12,
};

function trafficLight(pct) {
  if (pct >= 92) return "green";
  if (pct >= 75) return "yellow";
  return "red";
}

app.get("/v1/performance/scorecard", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const sc = channelScopeWhere(auth);
  const chFilter = sc.sql === "1=1" ? "" : ` AND ${sc.sql.replace(/c\./g, "ch.")}`;
  const args = [...sc.args];

  const revTotal = db
    .prepare(
      `SELECT COALESCE(SUM(ch.annual_revenue_usd), 0) AS s FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args).s;
  const revA = db
    .prepare(
      `SELECT COALESCE(SUM(ch.annual_revenue_usd), 0) AS s FROM channel ch WHERE ch.status='ACTIVE' AND ch.abc_class='A' ${chFilter}`
    )
    .get(...args).s;
  const aSharePct = revTotal > 0 ? Math.round((revA / revTotal) * 1000) / 10 : 0;

  const marginRow = db
    .prepare(
      `SELECT AVG(COALESCE(ch.gross_margin_pct, 0)) AS m FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args);
  const avgMargin = marginRow.m != null ? Math.round(marginRow.m * 10) / 10 : 0;

  const arRow = db
    .prepare(
      `SELECT AVG(COALESCE(ch.ar_overdue_days, 0)) AS a FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args);
  const avgAr = arRow.a != null ? Math.round(arRow.a * 10) / 10 : 0;

  const mom = db
    .prepare(
      `SELECT m.ym, SUM(m.revenue_usd) AS total
       FROM channel_monthly_metric m
       INNER JOIN channel ch ON ch.id = m.channel_id AND ch.status='ACTIVE' ${chFilter}
       GROUP BY m.ym ORDER BY m.ym DESC LIMIT 6`
    )
    .all(...args)
    .reverse();

  const regionRows = db
    .prepare(
      `SELECT ch.region,
              COUNT(*) AS channels,
              SUM(COALESCE(ch.annual_revenue_usd, 0)) AS revenue,
              AVG(COALESCE(ch.gross_margin_pct, 0)) AS avg_margin,
              SUM(CASE WHEN ch.abc_class='A' THEN 1 ELSE 0 END) AS a_cnt,
              SUM(CASE WHEN ch.ar_overdue_days > 30 THEN 1 ELSE 0 END) AS ar_high
       FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}
       GROUP BY ch.region ORDER BY revenue DESC`
    )
    .all(...args);

  const regionTargets = { SEA: 0.42, MENA: 0.22, EU: 0.24, SCA: 0.12 };
  const regionTable = regionRows.map((r) => {
    const weight = regionTargets[r.region] ?? 0.15;
    const tgt = SCORECARD_TARGETS.revenue_quarter_usd * weight;
    const att = tgt > 0 ? Math.round((r.revenue / tgt) * 1000) / 10 : 0;
    return {
      region: r.region,
      channels: r.channels,
      revenue_usd: r.revenue,
      target_quarter_usd: Math.round(tgt),
      attainment_pct: att,
      traffic: trafficLight(Math.min(att, 150)),
      avg_margin_pct: Math.round(r.avg_margin * 10) / 10,
      a_count: r.a_cnt,
      ar_over_30: r.ar_high,
    };
  });

  const lifecycle = db
    .prepare(
      `SELECT ch.lifecycle_stage AS stage, COUNT(*) AS n
       FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}
       GROUP BY ch.lifecycle_stage`
    )
    .all(...args);

  const alertsAgg = db
    .prepare(
      `SELECT a.severity, COUNT(*) AS n
       FROM alert a
       JOIN channel ch ON ch.id = a.channel_id
       WHERE a.acknowledged_at IS NULL ${chFilter}
       GROUP BY a.severity`
    )
    .all(...args);

  const channelCount = db
    .prepare(`SELECT COUNT(*) AS n FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}`)
    .get(...args).n;

  const samN = db
    .prepare(
      `SELECT COUNT(*) AS n FROM channel ch WHERE ch.sam_flag=1 AND ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args).n;

  const arBuckets = db
    .prepare(
      `SELECT
        SUM(CASE WHEN ch.ar_overdue_days <= 0 THEN 1 ELSE 0 END) AS b0,
        SUM(CASE WHEN ch.ar_overdue_days BETWEEN 1 AND 15 THEN 1 ELSE 0 END) AS b1,
        SUM(CASE WHEN ch.ar_overdue_days BETWEEN 16 AND 30 THEN 1 ELSE 0 END) AS b2,
        SUM(CASE WHEN ch.ar_overdue_days > 30 THEN 1 ELSE 0 END) AS b3
       FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args);

  const watchlist = db
    .prepare(
      `SELECT ch.id AS channel_id, ch.channel_code, ch.name_en, ch.abc_class, ch.ar_overdue_days,
              ch.annual_revenue_usd, ch.clv_score, ch.last_contact_date
       FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}
       ORDER BY ch.ar_overdue_days DESC,
                (CASE ch.abc_class WHEN 'C' THEN 2 WHEN 'B' THEN 1 ELSE 0 END) DESC,
                ch.clv_score ASC
       LIMIT 10`
    )
    .all(...args);

  const owners = db
    .prepare(
      `SELECT COALESCE(u.id, 0) AS user_id,
              COALESCE(u.name, '未分配') AS name,
              COALESCE(u.email, '') AS email,
              COUNT(ch.id) AS channel_cnt,
              SUM(COALESCE(ch.annual_revenue_usd, 0)) AS revenue_usd,
              AVG(COALESCE(ch.gross_margin_pct, 0)) AS avg_margin,
              SUM(CASE WHEN ch.ar_overdue_days > 15 THEN 1 ELSE 0 END) AS ar_watch
       FROM channel ch
       LEFT JOIN app_user u ON u.id = ch.owner_user_id
       WHERE ch.status='ACTIVE' ${chFilter}
       GROUP BY ch.owner_user_id
       ORDER BY CASE WHEN MIN(ch.owner_user_id) IS NULL THEN 1 ELSE 0 END, revenue_usd DESC`
    )
    .all(...args);

  const revenueAttainment = Math.min(
    199,
    Math.round((revTotal / (SCORECARD_TARGETS.revenue_quarter_usd * 1.15)) * 1000) / 10
  );

  const imports30 = db
    .prepare(`SELECT COUNT(*) AS n FROM import_batch WHERE datetime(created_at) >= datetime('now', '-30 days')`)
    .get().n;

  const bsc = {
    financial: {
      label: "财务",
      annual_revenue_roll_usd: revTotal,
      proxy_quarter_attainment_pct: revenueAttainment,
      target_ref_quarter_usd: SCORECARD_TARGETS.revenue_quarter_usd,
      a_class_revenue_share_pct: aSharePct,
      target_a_share_pct: SCORECARD_TARGETS.a_class_revenue_share_pct,
      avg_gross_margin_pct: avgMargin,
      target_margin_pct: SCORECARD_TARGETS.target_avg_margin_pct,
      traffic_revenue: trafficLight(revenueAttainment),
      traffic_a_share: trafficLight((aSharePct / SCORECARD_TARGETS.a_class_revenue_share_pct) * 100),
      traffic_margin: trafficLight((avgMargin / SCORECARD_TARGETS.target_avg_margin_pct) * 100),
    },
    customer: {
      label: "客户",
      active_channels: channelCount,
      sam_accounts: samN,
      sam_ratio_pct: channelCount ? Math.round((samN / channelCount) * 1000) / 10 : 0,
      a_share_pct: aSharePct,
    },
    process: {
      label: "内部流程",
      open_alerts_by_severity: Object.fromEntries(alertsAgg.map((x) => [x.severity, x.n])),
      avg_ar_days: avgAr,
      target_max_ar_days: SCORECARD_TARGETS.max_avg_ar_days,
      ar_buckets: arBuckets,
      traffic_ar: trafficLight(
        SCORECARD_TARGETS.max_avg_ar_days > 0
          ? (1 - avgAr / (SCORECARD_TARGETS.max_avg_ar_days * 1.25)) * 100
          : 80
      ),
    },
    learning: {
      label: "学习成长",
      note: "演示：可对接 CRM 登录频次、培训课时、知识库使用率",
      import_batches_30d: imports30,
      placeholder_crm_adoption_pct: channelCount >= SCORECARD_TARGETS.min_active_channel_coverage ? 88 : 62,
    },
  };

  return {
    generated_at: new Date().toISOString(),
    targets: SCORECARD_TARGETS,
    bsc,
    region_scorecard: regionTable,
    lifecycle_funnel: lifecycle,
    monthly_trend_rev: mom,
    watchlist,
    owner_leaderboard: owners,
    operational: {
      import_batches_last_30d: imports30,
      narrative: [
        "区域表将「演示季度目标」按 SEA/MENA/EU/SCA 权重拆分，用于沙盘对齐；生产可换为董事会下达口径。",
        "关注清单按逾期天数 × 分级 × CLV 综合排序，便于晨会点名。",
        "负责人战报支撑「谁扛多少出货、谁名下回款风险集中」的一对一复盘。",
      ],
    },
  };
});

/** 关键业务场景聚合：预警 SLA、回款/联络风险、目标脉搏、覆盖缺口（晨会 / 周会） */
app.get("/v1/scenarios/playbook", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const sc = channelScopeWhere(auth);
  const chFilter = sc.sql === "1=1" ? "" : ` AND ${sc.sql.replace(/c\./g, "ch.")}`;
  const args = [...sc.args];

  const slaRow = db
    .prepare(
      `SELECT
        SUM(CASE WHEN CAST((julianday('now') - julianday(a.created_at)) AS INTEGER) <= 3 THEN 1 ELSE 0 END) AS d0_3,
        SUM(CASE WHEN CAST((julianday('now') - julianday(a.created_at)) AS INTEGER) BETWEEN 4 AND 7 THEN 1 ELSE 0 END) AS d4_7,
        SUM(CASE WHEN CAST((julianday('now') - julianday(a.created_at)) AS INTEGER) >= 8 THEN 1 ELSE 0 END) AS d8p,
        SUM(CASE WHEN a.severity = 'critical' AND a.acknowledged_at IS NULL THEN 1 ELSE 0 END) AS critical_open,
        SUM(CASE WHEN a.acknowledged_at IS NULL THEN 1 ELSE 0 END) AS open_total
       FROM alert a
       JOIN channel ch ON ch.id = a.channel_id
       WHERE a.acknowledged_at IS NULL ${chFilter}`
    )
    .get(...args);

  const revTotal = db
    .prepare(
      `SELECT COALESCE(SUM(ch.annual_revenue_usd), 0) AS s FROM channel ch WHERE ch.status='ACTIVE' ${chFilter}`
    )
    .get(...args).s;
  const revenueAttainment = Math.min(
    199,
    Math.round((revTotal / (SCORECARD_TARGETS.revenue_quarter_usd * 1.15)) * 1000) / 10
  );

  const unassigned = db
    .prepare(
      `SELECT COUNT(*) AS n FROM channel ch WHERE ch.status='ACTIVE' AND ch.owner_user_id IS NULL ${chFilter}`
    )
    .get(...args);

  const intelGap = db
    .prepare(
      `SELECT COUNT(DISTINCT ch.country_code) AS n
       FROM channel ch
       LEFT JOIN market_intel mi ON mi.country_code = ch.country_code
       WHERE ch.status='ACTIVE' AND mi.country_code IS NULL ${chFilter}`
    )
    .get(...args);

  const critAlerts = db
    .prepare(
      `SELECT a.id AS alert_id, a.severity, a.message, a.created_at,
              CAST((julianday('now') - julianday(a.created_at)) AS INTEGER) AS age_days,
              ch.id AS channel_id, ch.channel_code, ch.name_en
       FROM alert a
       JOIN channel ch ON ch.id = a.channel_id
       WHERE a.acknowledged_at IS NULL AND a.severity = 'critical' ${chFilter}
       ORDER BY datetime(a.created_at) ASC
       LIMIT 8`
    )
    .all(...args);

  const arHot = db
    .prepare(
      `SELECT ch.id, ch.channel_code, ch.name_en, ch.ar_overdue_days, ch.annual_revenue_usd
       FROM channel ch
       WHERE ch.status='ACTIVE' AND ch.ar_overdue_days > 25 ${chFilter}
       ORDER BY ch.ar_overdue_days DESC
       LIMIT 5`
    )
    .all(...args);

  const staleContact = db
    .prepare(
      `SELECT ch.id, ch.channel_code, ch.name_en, ch.last_contact_date
       FROM channel ch
       WHERE ch.status='ACTIVE' ${chFilter}
         AND (ch.last_contact_date IS NULL OR date(ch.last_contact_date) < date('now', '-40 days'))
       ORDER BY
         CASE ch.abc_class WHEN 'A' THEN 0 WHEN 'B' THEN 1 ELSE 2 END,
         COALESCE(ch.annual_revenue_usd, 0) DESC
       LIMIT 5`
    )
    .all(...args);

  const priority_actions = [];
  for (const a of critAlerts.slice(0, 5)) {
    priority_actions.push({
      kind: "alert_critical",
      rank: 1,
      title: `Critical 预警已 ${a.age_days} 天未关`,
      detail: `${a.channel_code} · ${a.message}`,
      channel_id: a.channel_id,
      alert_id: a.alert_id,
    });
  }
  for (const c of arHot) {
    priority_actions.push({
      kind: "ar_risk",
      rank: 2,
      title: `应收逾期 ${c.ar_overdue_days} 天 · ${c.channel_code}`,
      detail: c.name_en,
      channel_id: c.id,
    });
  }
  for (const c of staleContact) {
    priority_actions.push({
      kind: "stale_contact",
      rank: 3,
      title: `长期未有效联系 · ${c.channel_code}`,
      detail: c.last_contact_date ? `最近联系 ${c.last_contact_date}` : "无最近联系记录",
      channel_id: c.id,
    });
  }
  priority_actions.sort((x, y) => x.rank - y.rank);

  return {
    generated_at: new Date().toISOString(),
    scenarios_intro: [
      "作战台按「预警 SLA → 回款风险 → 客户联络衰减」生成优先动作，适合晨会点名与周会复盘。",
      "目标脉搏与绩效看板同源演示口径；生产可替换为董事会/ERP 下达目标。",
    ],
    target_pulse: {
      period_label: SCORECARD_TARGETS.fiscal_period_label,
      annual_revenue_roll_usd: revTotal,
      proxy_attainment_pct: revenueAttainment,
      target_ref_quarter_usd: SCORECARD_TARGETS.revenue_quarter_usd,
    },
    alert_sla_open: {
      total_open: slaRow?.open_total || 0,
      critical_open: slaRow?.critical_open || 0,
      age_buckets: {
        days_0_3: slaRow?.d0_3 || 0,
        days_4_7: slaRow?.d4_7 || 0,
        days_8_plus: slaRow?.d8p || 0,
      },
      note: "库龄按未确认预警创建日起算；≥8 天建议升级或写入复盘纪要。",
    },
    coverage_gaps: {
      unassigned_active_channels: unassigned?.n || 0,
      active_countries_without_intel: intelGap?.n || 0,
    },
    priority_actions: priority_actions.slice(0, 12),
  };
});

const REGIONS_OK = new Set(["SEA", "MENA", "EU", "SCA"]);

function validateChannelForImport(raw) {
  const issues = [];
  const code = String(raw?.channel_code ?? "").trim();
  if (!code) issues.push("缺少 channel_code");
  else if (!/^SHARECRM-[A-Z]+-\d{3,}$/.test(code)) {
    issues.push("channel_code 须为 SHARECRM-大写区域-至少三位数字，如 SHARECRM-SEA-010");
  }
  const name_en = String(raw?.name_en ?? "").trim();
  if (!name_en) issues.push("缺少 name_en");
  const country_code = String(raw?.country_code ?? "").trim().toUpperCase();
  if (!country_code || country_code.length < 2) issues.push("缺少或非法 country_code");
  const region = String(raw?.region ?? "SEA").toUpperCase().slice(0, 10);
  if (!REGIONS_OK.has(region)) issues.push(`region 须为 SEA|MENA|EU|SCA，当前：${region}`);

  const abc_class = String(raw?.abc_class ?? "B").toUpperCase().slice(0, 1);
  if (!["A", "B", "C"].includes(abc_class)) issues.push("abc_class 须为 A/B/C");

  const status = String(raw?.status ?? "ACTIVE").toUpperCase();
  if (!["ACTIVE", "SLEEP", "EXIT"].includes(status)) issues.push("status 须为 ACTIVE|SLEEP|EXIT");

  if (issues.length) return { ok: false, issues };

  let owner_user_id = raw.owner_user_id != null ? Number(raw.owner_user_id) : null;
  if (owner_user_id && Number.isNaN(owner_user_id)) owner_user_id = null;
  if (raw.owner_email) {
    const em = String(raw.owner_email).trim().toLowerCase();
    const u = db.prepare(`SELECT id FROM app_user WHERE lower(email) = ?`).get(em);
    if (u) owner_user_id = u.id;
    else issues.push(`未找到负责人邮箱：${em}`);
  }
  if (issues.length) return { ok: false, issues };

  return {
    ok: true,
    issues: [],
    normalized: {
      channel_code: code,
      name_cn: raw.name_cn != null ? String(raw.name_cn).slice(0, 200) : null,
      name_en: name_en.slice(0, 200),
      country_code: country_code.slice(0, 5),
      region,
      lifecycle_stage: String(raw.lifecycle_stage || "active").toLowerCase(),
      abc_class,
      clv_score: Number(raw.clv_score) || 0,
      agreement_expire_date: raw.agreement_expire_date ? String(raw.agreement_expire_date).slice(0, 10) : null,
      sam_flag: raw.sam_flag ? 1 : 0,
      status,
      owner_user_id,
      last_contact_date: raw.last_contact_date ? String(raw.last_contact_date).slice(0, 16) : null,
      notes: raw.notes != null ? String(raw.notes).slice(0, 4000) : null,
      strategic_fit_score: raw.strategic_fit_score != null ? Number(raw.strategic_fit_score) : null,
      profit_dim_score: raw.profit_dim_score != null ? Number(raw.profit_dim_score) : null,
      growth_dim_score: raw.growth_dim_score != null ? Number(raw.growth_dim_score) : null,
      annual_revenue_usd: raw.annual_revenue_usd != null ? Number(raw.annual_revenue_usd) : null,
      gross_margin_pct: raw.gross_margin_pct != null ? Number(raw.gross_margin_pct) : null,
      ar_overdue_days: raw.ar_overdue_days != null ? Number(raw.ar_overdue_days) : 0,
    },
  };
}

function normalizeChannelPayload(c) {
  const v = validateChannelForImport(c);
  if (!v.ok) return { error: "validation_failed", issues: v.issues };
  return v.normalized;
}

function previewImportChannels(list) {
  const rows = [];
  let ok = 0;
  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    const v = validateChannelForImport(raw);
    if (v.ok) {
      ok++;
      rows.push({
        row: i + 1,
        status: "ok",
        channel_code: v.normalized.channel_code,
        name_en: v.normalized.name_en,
        region: v.normalized.region,
        snapshot: `${v.normalized.country_code} · ${v.normalized.abc_class} · 出货 ${v.normalized.annual_revenue_usd ?? "—"}`,
      });
    } else {
      rows.push({
        row: i + 1,
        status: "error",
        channel_code: raw?.channel_code ?? "—",
        issues: v.issues,
      });
    }
  }
  return { row_total: list.length, row_ok: ok, row_err: list.length - ok, rows };
}

function executeImportChannels(list, auth) {
  const upsert = db.prepare(`
    INSERT INTO channel (
      channel_code, name_cn, name_en, country_code, region, lifecycle_stage, abc_class,
      clv_score, agreement_expire_date, sam_flag, status, owner_user_id, last_contact_date,
      notes, strategic_fit_score, profit_dim_score, growth_dim_score,
      annual_revenue_usd, gross_margin_pct, ar_overdue_days, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
    ON CONFLICT(channel_code) DO UPDATE SET
      name_cn=excluded.name_cn,
      name_en=excluded.name_en,
      country_code=excluded.country_code,
      region=excluded.region,
      lifecycle_stage=excluded.lifecycle_stage,
      abc_class=excluded.abc_class,
      clv_score=excluded.clv_score,
      agreement_expire_date=excluded.agreement_expire_date,
      sam_flag=excluded.sam_flag,
      status=excluded.status,
      owner_user_id=excluded.owner_user_id,
      last_contact_date=excluded.last_contact_date,
      notes=excluded.notes,
      strategic_fit_score=excluded.strategic_fit_score,
      profit_dim_score=excluded.profit_dim_score,
      growth_dim_score=excluded.growth_dim_score,
      annual_revenue_usd=excluded.annual_revenue_usd,
      gross_margin_pct=excluded.gross_margin_pct,
      ar_overdue_days=excluded.ar_overdue_days,
      updated_at=datetime('now')
  `);

  let ok = 0;
  const errors = [];
  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    const n = normalizeChannelPayload(raw);
    if (n.error) {
      errors.push({
        row: i + 1,
        channel_code: raw?.channel_code,
        issues: n.issues || [n.error],
      });
      continue;
    }
    upsert.run(
      n.channel_code,
      n.name_cn,
      n.name_en,
      n.country_code,
      n.region,
      n.lifecycle_stage,
      n.abc_class,
      n.clv_score,
      n.agreement_expire_date,
      n.sam_flag,
      n.status,
      n.owner_user_id,
      n.last_contact_date,
      n.notes,
      n.strategic_fit_score,
      n.profit_dim_score,
      n.growth_dim_score,
      n.annual_revenue_usd,
      n.gross_margin_pct,
      n.ar_overdue_days
    );
    ok++;
  }

  const publicId = randomUUID();
  db.prepare(
    `INSERT INTO import_batch (public_id, actor_user_id, action, row_total, row_ok, row_err, detail_json)
     VALUES (?,?,?,?,?,?,?)`
  ).run(
    publicId,
    auth.sub,
    "upsert_channels",
    list.length,
    ok,
    errors.length,
    JSON.stringify({ errors: errors.slice(0, 80) })
  );

  return { imported: ok, errors, batch_public_id: publicId, row_total: list.length, row_err: errors.length };
}

app.get("/v1/import/template", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  return {
    channels: [
      {
        channel_code: "SHARECRM-SEA-099",
        name_en: "Demo Channel Ltd",
        name_cn: "演示渠道",
        country_code: "MY",
        region: "SEA",
        lifecycle_stage: "active",
        abc_class: "B",
        clv_score: 120,
        status: "ACTIVE",
        annual_revenue_usd: 95000,
        gross_margin_pct: 21,
        ar_overdue_days: 0,
        notes: "由模板生成，可改编码后导入",
        owner_email: "sam.zhang@sharecrm.demo",
      },
    ],
    field_spec: {
      required: ["channel_code", "name_en", "country_code", "region"],
      optional: [
        "name_cn",
        "abc_class",
        "lifecycle_stage",
        "status",
        "annual_revenue_usd",
        "gross_margin_pct",
        "ar_overdue_days",
        "clv_score",
        "sam_flag",
        "owner_user_id",
        "owner_email",
        "agreement_expire_date",
        "last_contact_date",
        "notes",
        "strategic_fit_score",
        "profit_dim_score",
        "growth_dim_score",
      ],
      region_enum: ["SEA", "MENA", "EU", "SCA"],
    },
  };
});

app.post("/v1/import/channels/preview", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const body = req.body || {};
  const list = Array.isArray(body.channels) ? body.channels : null;
  if (!list || !list.length) return reply.code(400).send({ error: "channels_required" });
  return previewImportChannels(list);
});

app.get("/v1/import/batches", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const rows = db
    .prepare(
      `SELECT public_id, action, row_total, row_ok, row_err, created_at
       FROM import_batch ORDER BY id DESC LIMIT 40`
    )
    .all();
  return { items: rows };
});

app.post("/v1/import/channels", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const body = req.body || {};
  const list = Array.isArray(body.channels) ? body.channels : null;
  if (!list || !list.length) return reply.code(400).send({ error: "channels_required" });
  return executeImportChannels(list, auth);
});

app.post("/v1/import/channels/upload", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const mp = await req.file();
  if (!mp) return reply.code(400).send({ error: "file_required" });
  const buf = await mp.toBuffer();
  let data;
  try {
    data = JSON.parse(buf.toString("utf8"));
  } catch {
    return reply.code(400).send({ error: "invalid_json" });
  }
  const list = Array.isArray(data.channels) ? data.channels : null;
  if (!list || !list.length) return reply.code(400).send({ error: "channels_required" });
  return executeImportChannels(list, auth);
});

if (existsSync(WEB_DIR)) {
  await app.register(fastifyStatic, {
    root: WEB_DIR,
    prefix: "/",
    index: ["index.html"],
  });
}

await app.listen({ port: PORT, host: "0.0.0.0" });
console.error(`ShareCRM channel ops: http://0.0.0.0:${PORT}  db=${DB_PATH}`);
