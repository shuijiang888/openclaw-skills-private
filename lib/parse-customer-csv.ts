const TIERS = new Set(["NORMAL", "KEY", "STRATEGIC"]);

export type ParsedCustomerRow = {
  name: string;
  tier: string;
  arDays: number;
};

export function parseCustomerCsvImport(text: string): {
  ok: true;
  rows: ParsedCustomerRow[];
} | {
  ok: false;
  error: string;
} {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) return { ok: false, error: "文件为空" };

  const lines = normalized.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "至少需要表头一行与一行数据" };
  }

  const headerCells = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (key: string) => headerCells.indexOf(key);

  const iName = idx("name");
  const iTier = idx("tier");
  const iAr = idx("ardays");
  if (iName < 0) {
    return { ok: false, error: "表头须包含列 name" };
  }

  const rows: ParsedCustomerRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]);
    const name = (cells[iName] ?? "").trim();
    if (!name) continue;

    const tierRaw = (iTier >= 0 ? cells[iTier] : "NORMAL")?.trim() || "NORMAL";
    const tier = tierRaw.toUpperCase();
    if (!TIERS.has(tier)) {
      return {
        ok: false,
        error: `第 ${r + 1} 行：tier 须为 NORMAL / KEY / STRATEGIC，当前为 ${tierRaw}`,
      };
    }

    let arDays = 30;
    if (iAr >= 0 && cells[iAr] !== undefined && String(cells[iAr]).trim() !== "") {
      const n = Number(String(cells[iAr]).trim());
      if (!Number.isFinite(n) || n < 0 || n > 3650) {
        return {
          ok: false,
          error: `第 ${r + 1} 行：arDays 须为 0–3650 的整数`,
        };
      }
      arDays = Math.round(n);
    }

    rows.push({ name, tier, arDays });
  }

  if (rows.length === 0) return { ok: false, error: "没有有效数据行（需有 name）" };
  return { ok: true, rows };
}

/** 极简 CSV 行解析：支持双引号包裹 */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}
