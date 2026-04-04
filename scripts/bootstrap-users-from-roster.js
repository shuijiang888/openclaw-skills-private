#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.BOOTSTRAP_DEFAULT_PASSWORD || "88888888";
const ROSTER_PATH = process.env.ROSTER_PATH || "";
const DRY_RUN = process.env.DRY_RUN === "1";

function normalizeEmail(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return "";
  if (v.includes("@")) return v;
  return `${v.replace(/\s+/g, "")}@zt007.local`;
}

function normalizeName(raw) {
  return String(raw || "").trim();
}

function normalizeMobile(raw) {
  return String(raw || "").trim();
}

function chooseField(row, keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim() !== "") {
      return row[k];
    }
  }
  return "";
}

function deriveIdentity(row, idx) {
  const name = normalizeName(
    chooseField(row, ["姓名", "名字", "名称", "Name", "name", "员工姓名"]),
  );
  const email = normalizeEmail(
    chooseField(row, ["邮箱", "email", "Email", "邮箱地址", "企业邮箱"]),
  );
  const mobile = normalizeMobile(
    chooseField(row, ["手机", "手机号", "mobile", "Mobile", "联系电话"]),
  );
  const employeeNo = String(
    chooseField(row, ["工号", "员工编号", "employeeNo", "EmployeeNo"]),
  ).trim();

  if (!name && !email && !mobile) {
    return null;
  }

  const fallbackLocal = employeeNo
    ? `user-${employeeNo}`
    : `user-${idx + 1}-${crypto.randomBytes(2).toString("hex")}`;

  const finalEmail =
    email ||
    (mobile
      ? `${mobile.replace(/\D/g, "") || fallbackLocal}@zt007.local`
      : `${fallbackLocal}@zt007.local`);

  const isJiangShui =
    name === "江水" ||
    finalEmail === "jiangshui@zt007.local" ||
    finalEmail === "jiangshui@profit.local";

  return {
    name: name || finalEmail.split("@")[0],
    email: finalEmail,
    mobile,
    isJiangShui,
  };
}

async function main() {
  if (!ROSTER_PATH) {
    throw new Error(
      "ROSTER_PATH is required. Example: ROSTER_PATH=/workspace/data/roster.xlsx node scripts/bootstrap-users-from-roster.js",
    );
  }

  const abs = path.resolve(ROSTER_PATH);
  if (!fs.existsSync(abs)) {
    throw new Error(`Roster file not found: ${abs}`);
  }

  const wb = XLSX.readFile(abs);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error("Roster sheet is empty.");
  }

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const identity = deriveIdentity(rows[i], i);
    if (!identity) {
      skipped += 1;
      continue;
    }

    const role = identity.isJiangShui ? "SUPERADMIN" : "SOLDIER";
    const isSuperAdmin = identity.isJiangShui;

    if (DRY_RUN) {
      console.log(
        `[DRY_RUN] ${identity.email} => role=${role}, superAdmin=${isSuperAdmin}, mustChangePassword=true`,
      );
      continue;
    }

    const existing = await prisma.user.findUnique({
      where: { email: identity.email },
      select: { id: true, email: true },
    });

    await prisma.user.upsert({
      where: { email: identity.email },
      update: {
        name: identity.name,
        mobile: identity.mobile,
        role,
        isActive: true,
        isSuperAdmin,
        mustChangePassword: true,
        passwordHash: hash,
      },
      create: {
        email: identity.email,
        name: identity.name,
        mobile: identity.mobile,
        role,
        isActive: true,
        isSuperAdmin,
        mustChangePassword: true,
        passwordHash: hash,
        ztAllowInteractiveLlm: true,
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        roster: abs,
        totalRows: rows.length,
        created,
        updated,
        skipped,
        defaultPassword: DEFAULT_PASSWORD,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

