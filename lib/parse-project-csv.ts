import { splitCsvLine } from "@/lib/parse-customer-csv";

const VALID_STATUS = new Set([
  "DRAFT",
  "PRICED",
  "PENDING_APPROVAL",
  "APPROVED",
  "CLOSED_LOST",
]);

export type ParsedProjectRow = {
  customerName: string;
  projectName: string;
  productName: string;
  quantity: number;
  leadDays: number;
  isStandard: boolean;
  isSmallOrder: boolean;
  status: string;
  material: number;
  labor: number;
  overhead: number;
  period: number;
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
  counterPrice: number | null;
  approvedPrice: number | null;
  pendingRole: string | null;
  wsPrice: number;
  wsRelation: number;
  wsDelivery: number;
  wsTech: number;
  wsPayment: number;
};

const DEF = {
  coeffCustomer: 1.15,
  coeffIndustry: 1.1,
  coeffRegion: 0.95,
  coeffProduct: 1.2,
  coeffLead: 1.08,
  coeffQty: 0.92,
  wsPrice: 85,
  wsRelation: 90,
  wsDelivery: 88,
  wsTech: 92,
  wsPayment: 75,
} as const;

function idx(headerCells: string[], key: string): number {
  return headerCells.indexOf(key.toLowerCase());
}

function parseBool(raw: string, def: boolean): boolean {
  const s = raw.trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return def;
}

function parseIntCell(
  raw: string,
  def: number,
  min: number,
  max: number,
): { ok: true; v: number } | { ok: false; msg: string } {
  const s = raw.trim();
  if (!s) return { ok: true, v: def };
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    return { ok: false, msg: `须为 ${min}–${max} 的整数` };
  }
  return { ok: true, v: n };
}

function parseFloatCell(
  raw: string,
  def: number | null,
  name: string,
): { ok: true; v: number | null } | { ok: false; msg: string } {
  const s = raw.trim();
  if (!s) {
    if (def === null) return { ok: false, msg: `${name} 不能为空` };
    return { ok: true, v: def };
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, msg: `${name} 须为数字` };
  return { ok: true, v: n };
}

export function parseProjectCsvImport(text: string): {
  ok: true;
  rows: ParsedProjectRow[];
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
  const ic = (k: string) => idx(headerCells, k);

  const need = ["customername", "projectname", "material", "labor", "overhead", "period"] as const;
  for (const k of need) {
    if (ic(k) < 0) {
      return {
        ok: false,
        error: `表头须包含列 ${k === "customername" ? "customerName" : k === "projectname" ? "projectName" : k}（及成本四列 material,labor,overhead,period）`,
      };
    }
  }

  const rows: ParsedProjectRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const rowNum = r + 1;
    const cells = splitCsvLine(lines[r]);
    const get = (k: string) => {
      const i = ic(k);
      return i >= 0 ? (cells[i] ?? "").trim() : "";
    };

    const customerName = get("customername");
    const projectName = get("projectname");
    if (!customerName || !projectName) continue;

    const material = parseFloatCell(get("material"), null, "material");
    const labor = parseFloatCell(get("labor"), null, "labor");
    const overhead = parseFloatCell(get("overhead"), null, "overhead");
    const period = parseFloatCell(get("period"), null, "period");
    if (!material.ok) return { ok: false, error: `第 ${rowNum} 行：${material.msg}` };
    if (!labor.ok) return { ok: false, error: `第 ${rowNum} 行：${labor.msg}` };
    if (!overhead.ok) return { ok: false, error: `第 ${rowNum} 行：${overhead.msg}` };
    if (!period.ok) return { ok: false, error: `第 ${rowNum} 行：${period.msg}` };
    const mat = material.v;
    const lab = labor.v;
    const ovh = overhead.v;
    const per = period.v;
    if (mat == null || lab == null || ovh == null || per == null) {
      return { ok: false, error: `第 ${rowNum} 行：成本四列须为有效数字` };
    }

    const qn = parseIntCell(get("quantity"), 1, 1, 1_000_000);
    const ld = parseIntCell(get("leaddays"), 15, 0, 3650);
    if (!qn.ok) return { ok: false, error: `第 ${rowNum} 行：quantity ${qn.msg}` };
    if (!ld.ok) return { ok: false, error: `第 ${rowNum} 行：leadDays ${ld.msg}` };

    const statusRaw = get("status").toUpperCase() || "DRAFT";
    if (!VALID_STATUS.has(statusRaw)) {
      return {
        ok: false,
        error:
          "第 " +
          rowNum +
          " 行：status 须为 DRAFT / PRICED / PENDING_APPROVAL / APPROVED / CLOSED_LOST",
      };
    }

    const coeffCustomer = parseFloatCell(
      get("coeffcustomer"),
      DEF.coeffCustomer,
      "coeffCustomer",
    );
    const coeffIndustry = parseFloatCell(
      get("coeffindustry"),
      DEF.coeffIndustry,
      "coeffIndustry",
    );
    const coeffRegion = parseFloatCell(
      get("coeffregion"),
      DEF.coeffRegion,
      "coeffRegion",
    );
    const coeffProduct = parseFloatCell(
      get("coeffproduct"),
      DEF.coeffProduct,
      "coeffProduct",
    );
    const coeffLead = parseFloatCell(get("coefflead"), DEF.coeffLead, "coeffLead");
    const coeffQty = parseFloatCell(get("coeffqty"), DEF.coeffQty, "coeffQty");
    if (!coeffCustomer.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${coeffCustomer.msg}` };
    }
    if (!coeffIndustry.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${coeffIndustry.msg}` };
    }
    if (!coeffRegion.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${coeffRegion.msg}` };
    }
    if (!coeffProduct.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${coeffProduct.msg}` };
    }
    if (!coeffLead.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${coeffLead.msg}` };
    }
    if (!coeffQty.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${coeffQty.msg}` };
    }

    const counterRaw = get("counterprice");
    let counterPrice: number | null = null;
    if (counterRaw !== "") {
      const cp = parseFloatCell(counterRaw, null, "counterPrice");
      if (!cp.ok) return { ok: false, error: `第 ${rowNum} 行：${cp.msg}` };
      counterPrice = cp.v;
    }

    const apprRaw = get("approvedprice");
    let approvedPrice: number | null = null;
    if (apprRaw !== "") {
      const ap = parseFloatCell(apprRaw, null, "approvedPrice");
      if (!ap.ok) return { ok: false, error: `第 ${rowNum} 行：${ap.msg}` };
      approvedPrice = ap.v;
    }

    const pendingRaw = get("pendingrole").trim();
    const pendingRole = pendingRaw || null;

    const wsPrice = parseFloatCell(get("wsprice"), DEF.wsPrice, "wsPrice");
    const wsRelation = parseFloatCell(get("wsrelation"), DEF.wsRelation, "wsRelation");
    const wsDelivery = parseFloatCell(get("wsdelivery"), DEF.wsDelivery, "wsDelivery");
    const wsTech = parseFloatCell(get("wstech"), DEF.wsTech, "wsTech");
    const wsPayment = parseFloatCell(get("wspayment"), DEF.wsPayment, "wsPayment");
    if (!wsPrice.ok) return { ok: false, error: `第 ${rowNum} 行：${wsPrice.msg}` };
    if (!wsRelation.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${wsRelation.msg}` };
    }
    if (!wsDelivery.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${wsDelivery.msg}` };
    }
    if (!wsTech.ok) return { ok: false, error: `第 ${rowNum} 行：${wsTech.msg}` };
    if (!wsPayment.ok) {
      return { ok: false, error: `第 ${rowNum} 行：${wsPayment.msg}` };
    }

    rows.push({
      customerName,
      projectName,
      productName: get("productname"),
      quantity: qn.v,
      leadDays: ld.v,
      isStandard: parseBool(get("isstandard"), true),
      isSmallOrder: parseBool(get("issmallorder"), true),
      status: statusRaw,
      material: mat,
      labor: lab,
      overhead: ovh,
      period: per,
      coeffCustomer: coeffCustomer.v ?? DEF.coeffCustomer,
      coeffIndustry: coeffIndustry.v ?? DEF.coeffIndustry,
      coeffRegion: coeffRegion.v ?? DEF.coeffRegion,
      coeffProduct: coeffProduct.v ?? DEF.coeffProduct,
      coeffLead: coeffLead.v ?? DEF.coeffLead,
      coeffQty: coeffQty.v ?? DEF.coeffQty,
      counterPrice,
      approvedPrice,
      pendingRole,
      wsPrice: wsPrice.v ?? DEF.wsPrice,
      wsRelation: wsRelation.v ?? DEF.wsRelation,
      wsDelivery: wsDelivery.v ?? DEF.wsDelivery,
      wsTech: wsTech.v ?? DEF.wsTech,
      wsPayment: wsPayment.v ?? DEF.wsPayment,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: "没有有效数据行（需 customerName、projectName 与成本四列）" };
  }
  return { ok: true, rows };
}
