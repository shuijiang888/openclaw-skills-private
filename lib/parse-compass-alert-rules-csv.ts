import { splitCsvLine } from "@/lib/parse-customer-csv";

export type ParsedCompassAlertRuleRow = {
  conditionLabel: string;
  actionLabel: string;
  sortOrder: number;
};

const MAX_LABEL_LEN = 200;

export function parseCompassAlertRulesCsvImport(text: string): {
  ok: true;
  rows: ParsedCompassAlertRuleRow[];
  skipped: number;
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

  const headerCells = splitCsvLine(lines[0])
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const idx = (key: string) => headerCells.indexOf(key.toLowerCase());
  const iCond = idx("conditionlabel");
  const iAction = idx("actionlabel");
  const iSort = idx("sortorder");

  if (iCond < 0 || iAction < 0 || iSort < 0) {
    return {
      ok: false,
      error: "表头须包含 conditionLabel、actionLabel、sortOrder",
    };
  }

  const rows: ParsedCompassAlertRuleRow[] = [];
  let skipped = 0;

  for (let r = 1; r < lines.length; r++) {
    const rowNum = r + 1;
    const cells = splitCsvLine(lines[r]);

    const conditionLabel = (cells[iCond] ?? "").trim();
    const actionLabel = (cells[iAction] ?? "").trim();
    const sortRaw = (cells[iSort] ?? "").trim();

    if (!conditionLabel && !actionLabel && !sortRaw) {
      skipped++;
      continue;
    }

    if (!conditionLabel || !actionLabel) {
      return {
        ok: false,
        error: `第 ${rowNum} 行：conditionLabel / actionLabel 不能为空`,
      };
    }

    if (conditionLabel.length > MAX_LABEL_LEN) {
      return {
        ok: false,
        error: `第 ${rowNum} 行：conditionLabel 过长（建议 <= ${MAX_LABEL_LEN} 字符）`,
      };
    }
    if (actionLabel.length > MAX_LABEL_LEN) {
      return {
        ok: false,
        error: `第 ${rowNum} 行：actionLabel 过长（建议 <= ${MAX_LABEL_LEN} 字符）`,
      };
    }

    if (!sortRaw) {
      return {
        ok: false,
        error: `第 ${rowNum} 行：sortOrder 不能为空（建议从 0 开始）`,
      };
    }
    const n = Number(sortRaw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      return {
        ok: false,
        error: `第 ${rowNum} 行：sortOrder 须为非负整数`,
      };
    }

    rows.push({
      conditionLabel,
      actionLabel,
      sortOrder: n,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "没有有效数据行（需 conditionLabel 与 actionLabel）" };
  }

  return { ok: true, rows, skipped };
}

