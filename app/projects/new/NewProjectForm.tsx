"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { customerTierLabel } from "@/lib/display-labels";
import { dispatchProfitDataChanged } from "@/lib/profit-data-events";

type Customer = { id: string; name: string; tier: string };

export function NewProjectForm() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [name, setName] = useState("新询价项目");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1000);
  const [leadDays, setLeadDays] = useState(15);
  const [isStandard, setIsStandard] = useState(true);
  const [isSmallOrder, setIsSmallOrder] = useState(true);
  const [material, setMaterial] = useState(8500);
  const [labor, setLabor] = useState(1200);
  const [overhead, setOverhead] = useState(2300);
  const [period, setPeriod] = useState(1000);

  useEffect(() => {
    void fetch("/api/customers")
      .then((r) => r.json())
      .then((rows: Customer[]) => {
        setCustomers(rows);
        if (rows[0]) setCustomerId(rows[0].id);
      })
      .catch(() => setErr("加载客户失败"));
  }, []);

  async function ensureCustomer(): Promise<string> {
    if (customerId) return customerId;
    if (!newCustomerName.trim()) throw new Error("请选择或新建客户");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCustomerName.trim(), tier: "NORMAL" }),
    });
    if (!res.ok) throw new Error("创建客户失败");
    const c = (await res.json()) as Customer;
    dispatchProfitDataChanged();
    return c.id;
  }

  async function submit() {
    setErr(null);
    setLoading(true);
    try {
      const cid = await ensureCustomer();
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: cid,
          name,
          productName,
          quantity,
          leadDays,
          isStandard,
          isSmallOrder,
          material,
          labor,
          overhead,
          period,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "创建失败");
      }
      const p = (await res.json()) as { id: string };
      dispatchProfitDataChanged();
      router.refresh();
      router.push(`/projects/${p.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          客户
        </h2>
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">选择已有</span>
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">（新建客户）</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {customerTierLabel(c.tier)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              或新客户名称
            </span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="未选上游客户时填写"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium">项目</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-600 dark:text-zinc-400">项目名称</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-zinc-600 dark:text-zinc-400">产品/规格摘要</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">数量</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">交期（天）</span>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={leadDays}
              onChange={(e) => setLeadDays(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isStandard}
              onChange={(e) => setIsStandard(e.target.checked)}
            />
            标准品
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isSmallOrder}
              onChange={(e) => setIsSmallOrder(e.target.checked)}
            />
            小额订单
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium">成本基准（元）</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["直接材料", material, setMaterial],
              ["直接人工", labor, setLabor],
              ["制造费用", overhead, setOverhead],
              ["期间费用", period, setPeriod],
            ] as const
          ).map(([label, val, set]) => (
            <label key={label} className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
                value={val}
                onChange={(e) => set(Number(e.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <button
        type="button"
        disabled={loading}
        onClick={() => void submit()}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "提交中…" : "创建并进入报价工作台"}
      </button>
    </div>
  );
}
