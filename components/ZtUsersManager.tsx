"use client";

import { useCallback, useState } from "react";
import { withClientBasePath } from "@/lib/client-url";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  mobile: string;
  orgUnit: { id: string; name: string; code: string } | null;
  ztAllowInteractiveLlm: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type OrgRow = { id: string; name: string; code: string };

const ROLE_OPTIONS = [
  { value: "SOLDIER", label: "战士" },
  { value: "SQUAD_LEADER", label: "班长" },
  { value: "PLATOON_LEADER", label: "排长" },
  { value: "COMPANY_COMMANDER", label: "连长" },
  { value: "DIVISION_COMMANDER", label: "师长" },
  { value: "CORPS_COMMANDER", label: "军长" },
  { value: "COMMANDER", label: "司令" },
  { value: "GENERAL", label: "将军" },
  { value: "ADMIN", label: "管理员" },
  { value: "SUPERADMIN", label: "超超级管理员" },
] as const;

export function ZtUsersManager({
  initialUsers,
  orgUnits,
}: {
  initialUsers: UserRow[];
  orgUnits: OrgRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "SOLDIER",
    mobile: "",
    orgUnitId: "",
  });

  const reload = useCallback(async () => {
    const res = await fetch(withClientBasePath("/api/console/zt/users"), {
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      const data = (await res.json()) as { items: UserRow[] };
      setUsers(data.items);
    }
  }, []);

  async function patchUser(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(withClientBasePath("/api/console/zt/users"), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: id, ...patch }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "更新失败");
      setMessage("已更新用户");
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusyId(null);
    }
  }

  async function createUser() {
    setBusyId("__create__");
    setMessage(null);
    try {
      const res = await fetch(withClientBasePath("/api/console/zt/users"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...createForm,
          orgUnitId: createForm.orgUnitId || null,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? "创建失败");
      setCreateForm({
        email: "",
        name: "",
        password: "",
        role: "SOLDIER",
        mobile: "",
        orgUnitId: "",
      });
      setMessage("已创建用户");
      await reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "创建失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
          {message}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold">新增用户</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={createForm.email}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, email: e.target.value }))
            }
            placeholder="邮箱"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="姓名"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <input
            value={createForm.password}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, password: e.target.value }))
            }
            type="password"
            placeholder="初始密码（至少6位）"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <select
            value={createForm.role}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, role: e.target.value }))
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <input
            value={createForm.mobile}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, mobile: e.target.value }))
            }
            placeholder="手机号"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <select
            value={createForm.orgUnitId}
            onChange={(e) =>
              setCreateForm((p) => ({ ...p, orgUnitId: e.target.value }))
            }
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          >
            <option value="">组织（可选）</option>
            {orgUnits.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.code})
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busyId !== null}
          onClick={() => void createUser()}
          className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          {busyId === "__create__" ? "创建中…" : "创建用户"}
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2">用户</th>
              <th className="px-3 py-2">角色</th>
              <th className="px-3 py-2">组织</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">LLM交互</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">
                  <div className="font-medium">{u.name || "未命名"}</div>
                  <div className="text-slate-500">{u.email}</div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) =>
                          x.id === u.id ? { ...x, role: e.target.value } : x,
                        ),
                      )
                    }
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-950"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={u.orgUnit?.id ?? ""}
                    onChange={(e) =>
                      setUsers((prev) =>
                        prev.map((x) =>
                          x.id === u.id
                            ? {
                                ...x,
                                orgUnit:
                                  orgUnits.find((o) => o.id === e.target.value) ??
                                  null,
                              }
                            : x,
                        ),
                      )
                    }
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-950"
                  >
                    <option value="">未设置</option>
                    {orgUnits.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={u.isActive}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((x) =>
                            x.id === u.id
                              ? { ...x, isActive: e.target.checked }
                              : x,
                          ),
                        )
                      }
                    />
                    启用
                  </label>
                </td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={u.ztAllowInteractiveLlm}
                      onChange={(e) =>
                        setUsers((prev) =>
                          prev.map((x) =>
                            x.id === u.id
                              ? { ...x, ztAllowInteractiveLlm: e.target.checked }
                              : x,
                          ),
                        )
                      }
                    />
                    允许
                  </label>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() =>
                      void patchUser(u.id, {
                        role: u.role,
                        orgUnitId: u.orgUnit?.id ?? null,
                        isActive: u.isActive,
                        ztAllowInteractiveLlm: u.ztAllowInteractiveLlm,
                      })
                    }
                    className="rounded-md border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    {busyId === u.id ? "保存中…" : "保存"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
