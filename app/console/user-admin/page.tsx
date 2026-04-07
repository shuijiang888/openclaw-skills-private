"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/client-base-path";
import { demoHeaders } from "@/components/RoleSwitcher";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  teamId: string | null;
  createdAt: string | Date;
};

type TeamRow = {
  id: string;
  name: string;
  managerId: string;
};

const ROLES = [
  { value: "SALES_MANAGER", label: "销售经理" },
  { value: "SALES_DIRECTOR", label: "销售总监" },
  { value: "SALES_VP", label: "销售副总裁" },
  { value: "GM", label: "总经理" },
  { value: "ADMIN", label: "管理员" },
  { value: "SUPER_ADMIN", label: "超级管理员" },
] as const;

const EMPTY_FORM = {
  email: "",
  name: "",
  password: "",
  role: "SALES_MANAGER",
  teamId: "",
};

export default function ProfitUserAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchUsers = useCallback(async () => {
    const res = await fetch(apiUrl("/api/users"), {
      headers: { ...demoHeaders() },
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "加载用户列表失败");
    }
    const data = (await res.json()) as { users: UserRow[]; teams: TeamRow[] };
    setUsers(data.users ?? []);
    setTeams(data.teams ?? []);
  }, []);

  useEffect(() => {
    fetchUsers().catch((e) => {
      setError(e instanceof Error ? e.message : "加载用户列表失败");
    });
  }, [fetchUsers]);

  async function saveUser() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const endpoint = editingId
        ? apiUrl(`/api/users/${editingId}`)
        : apiUrl("/api/users");
      const method = editingId ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role,
        teamId: form.teamId || null,
      };

      if (!editingId) {
        body.email = form.email.trim();
        body.password = form.password;
      } else if (form.password.trim()) {
        body.password = form.password;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...demoHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "保存失败");
      }

      setForm(EMPTY_FORM);
      setShowForm(false);
      setEditingId(null);
      setMessage(editingId ? "用户已更新" : "用户已创建");
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`确认删除用户 ${email}？`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/api/users/${id}`), {
        method: "DELETE",
        headers: { ...demoHeaders() },
        credentials: "include",
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "删除失败");
      }
      setMessage("用户已删除");
      await fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError(null);
    setMessage(null);
  }

  function openEdit(user: UserRow) {
    setEditingId(user.id);
    setForm({
      email: user.email,
      name: user.name ?? "",
      password: "",
      role: user.role,
      teamId: user.teamId ?? "",
    });
    setShowForm(true);
    setError(null);
    setMessage(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            用户管理
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            盈利系统账号管理（销售经理/总监/副总裁/总经理/管理员/超级管理员）
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
        >
          + 新建用户
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {showForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {editingId ? "编辑用户" : "新建用户"}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {!editingId ? (
              <label className="block">
                <span className="text-xs text-slate-500">邮箱 *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs text-slate-500">姓名</span>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-500">
                {editingId ? "新密码（可留空）" : "密码 *"}
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block">
              <span className="text-xs text-slate-500">角色</span>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, role: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-slate-500">团队</span>
              <select
                value={form.teamId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, teamId: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">无团队</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void saveUser()}
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            >
              {busy ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-950/60">
            <tr>
              <th className="px-4 py-3">邮箱</th>
              <th className="px-4 py-3">姓名</th>
              <th className="px-4 py-3">角色</th>
              <th className="px-4 py-3">团队</th>
              <th className="px-4 py-3">创建时间</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={6}>
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {u.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {teams.find((t) => t.id === u.teamId)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 text-xs">
                      <button
                        type="button"
                        className="font-medium text-blue-600 hover:underline"
                        onClick={() => openEdit(u)}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="font-medium text-red-600 hover:underline"
                        onClick={() => void deleteUser(u.id, u.email)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
