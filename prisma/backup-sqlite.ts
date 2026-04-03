/**
 * 备份当前 DATABASE_URL 指向的 SQLite 文件（仅 file: 协议）。
 * 用法：npm run db:backup
 * 输出目录：prisma/backups/（与库文件同扩展名，带时间戳）
 */
import { config } from "dotenv";
config();

import fs from "fs";
import path from "path";

function resolveSqlitePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("db:backup 仅支持 SQLite，DATABASE_URL 须为 file:... 形式");
  }
  let rest = databaseUrl.slice("file:".length).trim();
  const q = rest.indexOf("?");
  if (q >= 0) rest = rest.slice(0, q);
  if (rest.startsWith("//")) {
    rest = rest.slice(2);
  }
  return path.isAbsolute(rest)
    ? rest
    : path.resolve(process.cwd(), rest.replace(/^\.\//, ""));
}

function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("未设置 DATABASE_URL");
  }
  const src = resolveSqlitePath(url);
  if (!fs.existsSync(src)) {
    throw new Error(`数据库文件不存在: ${src}`);
  }

  const base = path.basename(src, path.extname(src)) || "db";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(process.cwd(), "prisma", "backups");
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, `${base}-${stamp}.db`);

  fs.copyFileSync(src, dest);
  const stat = fs.statSync(dest);
  console.log(
    `[db:backup] ${src} -> ${dest}（${(stat.size / 1024).toFixed(1)} KB）`,
  );
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
