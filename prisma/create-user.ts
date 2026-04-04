import { config } from "dotenv";
config();

/**
 * 为会话模式创建/更新用户（不触碰业务表）。
 * 用法：
 *   npx tsx prisma/create-user.ts <email> <password> <ROLE>
 * ROLE: SDR | AE | PRE_SALES | SALES_MANAGER | VP
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { DemoRole } from "../lib/approval";

const prisma = new PrismaClient();

const ALLOWED = new Set<string>([
  "SDR",
  "AE",
  "PRE_SALES",
  "SALES_MANAGER",
  "VP",
]);

function normalizeRoleInput(raw: string): DemoRole | null {
  const r = raw.trim().toUpperCase();
  if (r === "SE" || r === "PRESALES") return "PRE_SALES";
  if (r === "MANAGER") return "SALES_MANAGER";
  if (r === "DIRECTOR") return "AE";
  if (r === "SALES_DIRECTOR") return "AE";
  if (r === "SALES_VP") return "VP";
  if (r === "GM" || r === "GENERAL_MANAGER" || r === "ADMIN" || r === "SYSTEM")
    return "VP";
  if (ALLOWED.has(r)) return r as DemoRole;
  return null;
}

function usage(): never {
  console.error(
    "用法: npx tsx prisma/create-user.ts <email> <password> <ROLE>\n" +
      "ROLE: SDR | AE | PRE_SALES | SALES_MANAGER | VP",
  );
  process.exit(1);
}

async function main() {
  const [, , emailRaw, password, roleRaw] = process.argv;
  if (!emailRaw || !password || !roleRaw) usage();
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@")) {
    console.error("邮箱格式无效");
    process.exit(1);
  }
  const role = normalizeRoleInput(roleRaw);
  if (!role) {
    console.error("无效 ROLE:", roleRaw);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role },
    update: { passwordHash, role },
  });
  console.log("已保存用户", email, "角色", role);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
