/**
 * 硕日海外渠道运营 — 高保真演示 API
 * SQLite + JWT(HMAC) + 静态 Web；种子数据见 ../data/seed.json
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import Database from "better-sqlite3";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const WEB_DIR = join(ROOT, "web");
const SEED_PATH = join(ROOT, "data", "seed.json");

const PORT = Number(process.env.PORT || 8790);
const DB_PATH = process.env.SRNE_DB_PATH || join(__dirname, "srne_channel.db");
const JWT_SECRET = process.env.JWT_SECRET || "srne-demo-change-me-in-production";
const TOKEN_TTL_SEC = Number(process.env.TOKEN_TTL_SEC || 604800);

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
`);

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
    INSERT INTO market_intel (country_code, opportunity_score, policy_digest, competitor_note, product_fit_note)
    VALUES (?,?,?,?,?)
  `);
  for (const m of seed.market_intel || []) {
    insIntel.run(
      m.country_code,
      m.opportunity_score,
      m.policy_digest ?? "",
      m.competitor_note ?? "",
      m.product_fit_note ?? ""
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

  // 演示用近 6 个月出货曲线（部分渠道）
  const insM = db.prepare(
    `INSERT OR REPLACE INTO channel_monthly_metric (channel_id, ym, revenue_usd) VALUES (?,?,?)`
  );
  const demoSeries = [
    { code: "SRNE-SEA-001", base: 42000, drift: 1.04 },
    { code: "SRNE-EU-002", base: 8000, drift: 0.55 },
    { code: "SRNE-SEA-003", base: 11000, drift: 0.48 },
  ];
  const now = new Date();
  for (const d of demoSeries) {
    const cid = codeToId.get(d.code);
    if (!cid) continue;
    for (let k = 5; k >= 0; k--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const wave = 1 + 0.08 * Math.sin(k + cid);
      insM.run(cid, ym, Math.round(d.base * d.drift * wave * (k >= 2 ? 1 : 0.9)));
    }
  }
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
  service: "srne-channel-ops",
  time: new Date().toISOString(),
}));

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

app.get("/v1/channels", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const q = req.query || {};
  const sc = channelScopeWhere(auth);
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
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
      `SELECT * FROM alert WHERE channel_id = ? ORDER BY datetime(created_at) DESC LIMIT 20`
    )
    .all(id);
  return { channel: mapChannelRow(row), monthly: metrics, alerts };
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

app.get("/v1/alerts", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const sc = channelScopeWhere(auth);
  const onlyOpen = req.query?.open === "1" || req.query?.open === "true";
  const rows = db
    .prepare(
      `SELECT a.*, c.channel_code, c.name_en
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
  const rows = db
    .prepare(`SELECT * FROM market_intel ORDER BY opportunity_score DESC`)
    .all();
  return { items: rows };
});

app.get("/v1/intel/:countryCode", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  const cc = String(req.params.countryCode || "").toUpperCase();
  const row = db.prepare(`SELECT * FROM market_intel WHERE country_code = ?`).get(cc);
  const brief = db.prepare(`SELECT * FROM sales_brief WHERE country_code = ?`).get(cc);
  if (!row && !brief) return reply.code(404).send({ error: "not_found" });
  return { intel: row, brief };
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

function normalizeChannelPayload(c) {
  const code = String(c.channel_code || "").trim();
  if (!/^SRNE-[A-Z]+-\d{3,}$/.test(code)) {
    return { error: "invalid_channel_code", hint: "格式示例：SRNE-SEA-001" };
  }
  return {
    channel_code: code,
    name_cn: c.name_cn != null ? String(c.name_cn).slice(0, 200) : null,
    name_en: String(c.name_en || "").slice(0, 200),
    country_code: String(c.country_code || "").toUpperCase().slice(0, 5),
    region: String(c.region || "SEA").toUpperCase().slice(0, 10),
    lifecycle_stage: String(c.lifecycle_stage || "active").toLowerCase(),
    abc_class: String(c.abc_class || "C").toUpperCase().slice(0, 1),
    clv_score: Number(c.clv_score) || 0,
    agreement_expire_date: c.agreement_expire_date ? String(c.agreement_expire_date).slice(0, 10) : null,
    sam_flag: c.sam_flag ? 1 : 0,
    status: String(c.status || "ACTIVE").toUpperCase(),
    owner_user_id: c.owner_user_id != null ? Number(c.owner_user_id) : null,
    last_contact_date: c.last_contact_date ? String(c.last_contact_date).slice(0, 16) : null,
    notes: c.notes != null ? String(c.notes).slice(0, 4000) : null,
    strategic_fit_score: c.strategic_fit_score != null ? Number(c.strategic_fit_score) : null,
    profit_dim_score: c.profit_dim_score != null ? Number(c.profit_dim_score) : null,
    growth_dim_score: c.growth_dim_score != null ? Number(c.growth_dim_score) : null,
    annual_revenue_usd: c.annual_revenue_usd != null ? Number(c.annual_revenue_usd) : null,
    gross_margin_pct: c.gross_margin_pct != null ? Number(c.gross_margin_pct) : null,
    ar_overdue_days: c.ar_overdue_days != null ? Number(c.ar_overdue_days) : 0,
  };
}

function executeImportChannels(list) {
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
  for (const raw of list) {
    const n = normalizeChannelPayload(raw);
    if (n.error) {
      errors.push({ channel_code: raw.channel_code, error: n.error });
      continue;
    }
    if (!n.name_en || !n.country_code) {
      errors.push({ channel_code: n.channel_code, error: "missing_name_or_country" });
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
  return { imported: ok, errors };
}

app.post("/v1/import/channels", async (req, reply) => {
  const auth = getAuth(req);
  if (!auth) return reply.code(401).send({ error: "unauthorized" });
  if (auth.role !== "admin" && auth.role !== "manager") {
    return reply.code(403).send({ error: "forbidden" });
  }
  const body = req.body || {};
  const list = Array.isArray(body.channels) ? body.channels : null;
  if (!list || !list.length) return reply.code(400).send({ error: "channels_required" });
  return executeImportChannels(list);
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
  return executeImportChannels(list);
});

if (existsSync(WEB_DIR)) {
  await app.register(fastifyStatic, {
    root: WEB_DIR,
    prefix: "/",
    index: ["index.html"],
  });
}

await app.listen({ port: PORT, host: "0.0.0.0" });
console.error(`SRNE channel ops: http://0.0.0.0:${PORT}  db=${DB_PATH}`);
