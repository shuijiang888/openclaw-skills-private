/**
 * 演示用「自然语言 → 系数调整」规则解析（本地规则，可替换为真实大模型接口）。
 */

export type CoeffPatch = Partial<{
  coeffCustomer: number;
  coeffIndustry: number;
  coeffRegion: number;
  coeffProduct: number;
  coeffLead: number;
  coeffQty: number;
}>;

export type ParseQuoteLanguageResult = {
  summary: string[];
  hints: string[];
  patch: CoeffPatch;
};

const COEFF_MIN = 0.55;
const COEFF_MAX = 1.85;
const round2 = (n: number) => Math.round(n * 100) / 100;

function clamp(n: number) {
  return Math.min(COEFF_MAX, Math.max(COEFF_MIN, round2(n)));
}

/** 六项系数默认值（与业务配置一致，供大模型结果对齐） */
export const QUOTE_COEFF_DEFAULTS = {
  coeffCustomer: 1.15,
  coeffIndustry: 1.1,
  coeffRegion: 0.95,
  coeffProduct: 1.2,
  coeffLead: 1.08,
  coeffQty: 0.92,
} as const;

export type QuoteCoeffKey = keyof typeof QUOTE_COEFF_DEFAULTS;

const COEFF_KEYS: QuoteCoeffKey[] = [
  "coeffCustomer",
  "coeffIndustry",
  "coeffRegion",
  "coeffProduct",
  "coeffLead",
  "coeffQty",
];

/** 将系数限制在演示允许区间 */
export function clampQuoteCoefficient(n: number): number {
  return clamp(n);
}

/**
 * 将大模型返回的 patch 对象清洗为相对 baseline 有变化的系数（含夹紧）。
 */
export function normalizeModelCoeffPatch(
  patchIn: unknown,
  baseline: Partial<Record<QuoteCoeffKey, number>>,
): CoeffPatch {
  if (!patchIn || typeof patchIn !== "object" || Array.isArray(patchIn)) {
    return {};
  }
  const p = patchIn as Record<string, unknown>;
  const out: CoeffPatch = {};
  for (const k of COEFF_KEYS) {
    const v = p[k];
    let n: number;
    if (typeof v === "number" && Number.isFinite(v)) {
      n = v;
    } else if (typeof v === "string" && v.trim() !== "") {
      const parsed = Number(v.trim());
      if (!Number.isFinite(parsed)) continue;
      n = parsed;
    } else {
      continue;
    }
    const clamped = clamp(n);
    const base =
      baseline[k] ??
      QUOTE_COEFF_DEFAULTS[k];
    if (round2(clamped) !== round2(base)) {
      (out as Record<string, number>)[k] = clamped;
    }
  }
  return out;
}

export function parseQuoteNaturalLanguage(
  raw: string,
  baseline: CoeffPatch & Record<string, number>,
): ParseQuoteLanguageResult {
  const t = raw.trim();
  const summary: string[] = [];
  const hints: string[] = [];
  if (!t) {
    return { summary: [], hints: ["请输入商机背景、客户与交期等描述。"], patch: {} };
  }

  let cC = baseline.coeffCustomer ?? 1.15;
  let cI = baseline.coeffIndustry ?? 1.1;
  let cR = baseline.coeffRegion ?? 0.95;
  let cP = baseline.coeffProduct ?? 1.2;
  let cL = baseline.coeffLead ?? 1.08;
  let cQ = baseline.coeffQty ?? 0.92;

  const apply = (
    next: { cC?: number; cI?: number; cR?: number; cP?: number; cL?: number; cQ?: number },
    line: string,
  ) => {
    if (next.cC != null) {
      cC = clamp(next.cC);
      summary.push(line);
    }
    if (next.cI != null) {
      cI = clamp(next.cI);
      summary.push(line);
    }
    if (next.cR != null) {
      cR = clamp(next.cR);
      summary.push(line);
    }
    if (next.cP != null) {
      cP = clamp(next.cP);
      summary.push(line);
    }
    if (next.cL != null) {
      cL = clamp(next.cL);
      summary.push(line);
    }
    if (next.cQ != null) {
      cQ = clamp(next.cQ);
      summary.push(line);
    }
  };

  if (/战略|龙头|总部直签|集团客户/.test(t)) {
    apply({ cC: cC + 0.06 }, "识别到战略/头部客户语义：客户系数上调");
  }
  if (/重点维护|长期合作|关系深|粘度/.test(t)) {
    apply({ cC: cC + 0.04 }, "识别到重点客情：客户系数小幅上调");
  }
  if (/价格敏感|红海|竞标|低价抢单|内卷/.test(t)) {
    apply({ cC: cC - 0.05 }, "识别到价格竞争压力：客户系数下调");
  }

  if (/定制|非标|方案型|多轮改板/.test(t)) {
    apply({ cP: cP + 0.07 }, "识别到定制复杂度：产品系数上调");
    hints.push("定制/非标通常不走「自动通道」，请以分流结论为准。");
  }
  if (/标品|目录料|成熟料号/.test(t)) {
    apply({ cP: cP - 0.03 }, "识别到标准品倾向：产品系数小幅下调");
  }

  if (/加急|赶工|硬节点|插单|锁交付/.test(t)) {
    apply({ cL: cL + 0.1 }, "识别到紧交期：交期系数明显上调");
  }
  if (/交期宽裕|可分批|不赶/.test(t)) {
    apply({ cL: cL - 0.04 }, "识别到交期缓和：交期系数小幅下调");
  }

  if (/小批量|试产|样品|打样|首单/.test(t)) {
    apply({ cQ: cQ + 0.06 }, "识别到小批量/打样：批量系数上调（小单议价空间）");
  }
  if (/百万级|大单|年度框|集中交付/.test(t)) {
    apply({ cQ: cQ - 0.05 }, "识别到规模订单：批量系数小幅下调");
  }

  if (/出口|海外认证|报关|离岸/.test(t)) {
    apply({ cR: cR + 0.05 }, "识别到海外场景：区域系数上调");
  }
  if (/内销|本地配套|园区直供/.test(t)) {
    apply({ cR: cR - 0.03 }, "识别到内销/本地：区域系数小幅下调");
  }

  if (/壁垒高|专利|国产替代|稀缺产能/.test(t)) {
    apply({ cI: cI + 0.06 }, "识别到行业壁垒：行业系数上调");
  }
  if (/大宗|材料占比较高|行情波动/.test(t)) {
    apply({ cI: cI - 0.04 }, "识别到成本敏感行业：行业系数小幅下调");
  }

  const patch: CoeffPatch = {};
  if (round2(cC) !== round2(baseline.coeffCustomer ?? 1.15))
    patch.coeffCustomer = cC;
  if (round2(cI) !== round2(baseline.coeffIndustry ?? 1.1))
    patch.coeffIndustry = cI;
  if (round2(cR) !== round2(baseline.coeffRegion ?? 0.95))
    patch.coeffRegion = cR;
  if (round2(cP) !== round2(baseline.coeffProduct ?? 1.2))
    patch.coeffProduct = cP;
  if (round2(cL) !== round2(baseline.coeffLead ?? 1.08))
    patch.coeffLead = cL;
  if (round2(cQ) !== round2(baseline.coeffQty ?? 0.92))
    patch.coeffQty = cQ;

  if (summary.length === 0) {
    hints.push(
      "未匹配到明确规则。可尝试包含：战略客户、加急、小批量、定制、出口等关键词。",
    );
  }

  return {
    summary: [...new Set(summary)],
    hints,
    patch,
  };
}
