import { createHash } from "node:crypto";

/** 审计侧不落库原文：仅保留长度与哈希前缀便于对账与排障 */
export function textDigestForAudit(text: string): {
  length: number;
  sha256Prefix: string;
} {
  const normalized = text.normalize("NFKC");
  const hash = createHash("sha256").update(normalized, "utf8").digest("hex");
  return {
    length: normalized.length,
    sha256Prefix: hash.slice(0, 16),
  };
}
