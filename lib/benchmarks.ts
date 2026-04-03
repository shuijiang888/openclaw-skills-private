export type BenchmarkRow = {
  name: string;
  price: number;
  diffPct: number;
};

export function withDiff(
  suggested: number,
  rows: { name: string; price: number }[],
): BenchmarkRow[] {
  return rows.map((r) => ({
    name: r.name,
    price: r.price,
    diffPct:
      suggested > 0
        ? Math.round((r.price / suggested - 1) * 1000) / 10
        : 0,
  }));
}

export function defaultBenchmarkPrices(suggested: number): BenchmarkRow[] {
  const base = [
    { name: "历史相似报价", price: suggested * 0.96 },
    { name: "竞品 A 参考", price: suggested * 0.982 },
    { name: "市场均价", price: suggested * 0.971 },
    { name: "对该客户上次成交价", price: suggested * 0.944 },
    { name: "成本 +30%", price: suggested * 0.911 },
  ];
  return withDiff(
    suggested,
    base.map((b) => ({ name: b.name, price: Math.round(b.price * 100) / 100 })),
  );
}
