/** CSV 单元格转义（RFC 4180 风格） */
export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvLine(cells: unknown[]): string {
  return `${cells.map(csvEscape).join(",")}\r\n`;
}

/** Excel 中文环境更易直接双击打开 */
export function withUtf8Bom(body: string): string {
  return `\uFEFF${body}`;
}
