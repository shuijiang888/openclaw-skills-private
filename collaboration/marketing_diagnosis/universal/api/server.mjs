/**
 * MVP: GET /v1/health, POST/GET submissions, POST /v1/leads
 * SQLite file: DIAG_DB_PATH or ./diag_mvp.db
 */
import Fastify from "fastify";
import cors from "@fastify/cors";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const API_KEY = (process.env.API_KEY || "").trim();
const DB_PATH = process.env.DIAG_DB_PATH || join(__dirname, "diag_mvp.db");
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const LEAD_KINDS = new Set(["diagnosis_summary", "expert_opportunity"]);

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS diag_submission (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  profile_company TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  profile_phone TEXT NOT NULL,
  profile_email TEXT,
  profile_title TEXT,
  profile_industry TEXT,
  role TEXT NOT NULL,
  sale_mode TEXT,
  score_total REAL NOT NULL,
  score_band TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  client_ip TEXT,
  user_agent TEXT,
  campaign_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diag_submission_created ON diag_submission(created_at);
CREATE INDEX IF NOT EXISTS idx_diag_submission_phone ON diag_submission(profile_phone);

CREATE TABLE IF NOT EXISTS diag_lead (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  submission_id INTEGER REFERENCES diag_submission(id) ON DELETE SET NULL,
  lead_kind TEXT NOT NULL CHECK (lead_kind IN ('diagnosis_summary','expert_opportunity')),
  payload_json TEXT NOT NULL,
  crm_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diag_lead_submission ON diag_lead(submission_id);
CREATE INDEX IF NOT EXISTS idx_diag_lead_kind ON diag_lead(lead_kind, created_at);

CREATE TABLE IF NOT EXISTS sync_job (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,
  ref_type TEXT NOT NULL,
  ref_id INTEGER NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sync_job_status_next ON sync_job(status, next_run_at);

CREATE TABLE IF NOT EXISTS daily_stat (
  stat_date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (stat_date, metric)
);
`);

function bumpDaily(metric) {
  const day = new Date().toISOString().slice(0, 10);
  db.prepare(
    `INSERT INTO daily_stat (stat_date, metric, value) VALUES (?, ?, 1)
     ON CONFLICT(stat_date, metric) DO UPDATE SET value = value + 1`
  ).run(day, metric);
}

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ALLOWED_ORIGINS[0] === "*" ? true : ALLOWED_ORIGINS,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
});

app.addHook("preHandler", async (req, reply) => {
  if (!API_KEY) return;
  if (req.url.startsWith("/v1/health")) return;
  const k = req.headers["x-api-key"];
  if (k !== API_KEY) {
    reply.code(401).send({ error: "unauthorized" });
    return reply;
  }
});

app.get("/v1/health", async () => ({ ok: true, service: "marketing-diagnosis-api", time: new Date().toISOString() }));

function extractSubmissionRow(body) {
  const p = body.profile || {};
  const scores = body.scores || {};
  return {
    profile_company: String(p.company || "").slice(0, 256),
    profile_name: String(p.name || "").slice(0, 128),
    profile_phone: String(p.phone || "").slice(0, 32),
    profile_email: p.email ? String(p.email).slice(0, 256) : null,
    profile_title: p.jobTitle ? String(p.jobTitle).slice(0, 128) : null,
    profile_industry: p.industry ? String(p.industry).slice(0, 256) : null,
    role: String(body.role || ""),
    sale_mode: body.saleMode != null ? String(body.saleMode) : null,
    score_total: Number(scores.total),
    score_band: String(scores.overallBand || ""),
  };
}

app.post("/v1/submissions", async (req, reply) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return reply.code(400).send({ error: "invalid_body" });
  }
  const row = extractSubmissionRow(body);
  if (!row.profile_company || !row.profile_name || !row.profile_phone || !row.role) {
    return reply.code(400).send({ error: "missing_required_fields" });
  }
  if (Number.isNaN(row.score_total) || !row.score_band) {
    return reply.code(400).send({ error: "invalid_scores" });
  }
  const publicId = randomUUID();
  const payloadJson = JSON.stringify(body);
  const ip = req.ip;
  const ua = req.headers["user-agent"] || null;

  const stmt = db.prepare(`
    INSERT INTO diag_submission (
      public_id, profile_company, profile_name, profile_phone, profile_email, profile_title, profile_industry,
      role, sale_mode, score_total, score_band, payload_json, client_ip, user_agent
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const info = stmt.run(
    publicId,
    row.profile_company,
    row.profile_name,
    row.profile_phone,
    row.profile_email,
    row.profile_title,
    row.profile_industry,
    row.role,
    row.sale_mode,
    row.score_total,
    row.score_band,
    payloadJson,
    ip,
    ua
  );

  bumpDaily("submissions");

  return reply.code(201).send({
    id: info.lastInsertRowid,
    publicId,
    createdAt: new Date().toISOString(),
  });
});

app.get("/v1/submissions/:publicId", async (req, reply) => {
  const { publicId } = req.params;
  const r = db.prepare(`SELECT * FROM diag_submission WHERE public_id = ?`).get(publicId);
  if (!r) return reply.code(404).send({ error: "not_found" });
  let payload;
  try {
    payload = JSON.parse(r.payload_json);
  } catch {
    payload = null;
  }
  return {
    publicId: r.public_id,
    createdAt: r.created_at,
    profile: {
      company: r.profile_company,
      name: r.profile_name,
      phone: r.profile_phone,
      email: r.profile_email,
      jobTitle: r.profile_title,
      industry: r.profile_industry,
    },
    role: r.role,
    saleMode: r.sale_mode,
    scores: { total: r.score_total, overallBand: r.score_band },
    payloadJson: payload,
  };
});

app.post("/v1/leads", async (req, reply) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    return reply.code(400).send({ error: "invalid_body" });
  }
  const leadKind = body.leadKind;
  if (!LEAD_KINDS.has(leadKind)) {
    return reply.code(400).send({ error: "invalid_lead_kind", allowed: [...LEAD_KINDS] });
  }
  let submissionId = null;
  if (body.submissionPublicId) {
    const s = db.prepare(`SELECT id FROM diag_submission WHERE public_id = ?`).get(body.submissionPublicId);
    if (!s) {
      return reply.code(400).send({ error: "submission_not_found" });
    }
    submissionId = s.id;
  }
  const publicId = randomUUID();
  const payloadJson = JSON.stringify(body);
  const stmt = db.prepare(`
    INSERT INTO diag_lead (public_id, submission_id, lead_kind, payload_json)
    VALUES (?,?,?,?)
  `);
  const info = stmt.run(publicId, submissionId, leadKind, payloadJson);
  bumpDaily(leadKind === "expert_opportunity" ? "expert_leads" : "leads");

  return reply.code(201).send({
    leadId: info.lastInsertRowid,
    publicId,
    crmStatus: "pending",
  });
});

app.get("/v1/stats/daily", async (req, reply) => {
  const q = req.query || {};
  const from = typeof q.from === "string" ? q.from : "";
  const to = typeof q.to === "string" ? q.to : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return reply.code(400).send({ error: "invalid_range", hint: "from=YYYY-MM-DD&to=YYYY-MM-DD" });
  }
  if (from > to) return reply.code(400).send({ error: "from_after_to" });
  const rows = db
    .prepare(
      `SELECT stat_date AS date, metric, value FROM daily_stat
       WHERE stat_date >= ? AND stat_date <= ?
       ORDER BY stat_date ASC, metric ASC`
    )
    .all(from, to);
  return { rows };
});

await app.listen({ port: PORT, host: "0.0.0.0" });
console.error(`diag API listening on http://0.0.0.0:${PORT} db=${DB_PATH}`);
