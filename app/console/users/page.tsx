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
  createdAt: string;
};

type TeamRow = { id: string; name: string; managerId: string };

const ROLES = [
  { value: "SALES_MANAGER", label: "销售经理" },
  { value: "SALES_DIRECTOR", label: "销售总监" },
  { value: "SALES_VP", label: "销售副总裁" },
  { value: "GM", label: "总经理" },
  { value: "ADMIN", label: "管理员" },
  { value: "SUPER_ADMIN", label: "超级管理员" },
];

const ROLE_BADGE: Record<string, string> = {
  SALES_MANAGER: "bg-slate-100 text-slate-700",
  SALES_DIRECTOR: "bg-blue-100 text-blue-800",
  SALES_VP: "bg-violet-100 text-violet-800",
  GM: "bg-amber-100 text-amber-800",
  ADMIN: "bg-emerald-100 text-emerald-800",
  SUPER_ADMIN: "bg-red-100 text-red-800",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "SALES_MANAGER", teamId: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    void fetch(apiUrl("/api/users"), { headers: { ...demoHeaders() } })
      .then(r => r.ok ? r.json() : Promise.reject("加载失败"))
      .then((data: { users: UserRow[]; teams: TeamRow[] }) => {
        setUsers(data.users);
        setTeams(data.teams);
        setErr(null);
      })
      .catch(e => setErr(String(e)));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const url = editingId ? apiUrl(`/api/users/${editingId}`) : apiUrl("/api/users");
      const method = editingId ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        name: form.name,
        role: form.role,
        teamId: form.teamId || null,
      };
      if (!editingId) {
        body.email = form.email;
        body.password = form.password;
      }
      if (editingId && form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...demoHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ email: "", name: "", password: "", role: "SALES_MANAGER", teamId: "" });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`确认删除用户 ${email}？`)) return;
    const res = await fetch(apiUrl(`/api/users/${id}`), {
      method: "DELETE",
      headers: { ...demoHeaders() },
    });
    if (res.ok) load();
    else setErr("删除失败");
  }

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setForm({ email: u.email, name: u.name, password: "", role: u.role, teamId: u.teamId ?? "" });
    setShowForm(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">用户管理</h2>
          <p className="mt-1 text-sm text-slate-500">管理系统账号、角色和团队归属</p>
        </div>
        <button type="button"
          onClick={() => { setEditingId(null); setForm({ email: "", name: "", password: "", role: "SALES_MANAGER", teamId: "" }); setShowForm(true); }}
          className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-bold text-white shadow-md transition hover:from-amber-600 hover:to-amber-700">
          + 新建用户
        </button>
      </div>

      {err && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{err}</div>}

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{editingId ? "编辑用户" : "新建用户"}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {!editingId && (
              <label className="block">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">邮箱 *</span>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">姓名</span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{editingId ? "新密码（留空不改）" : "密码 *"}</span>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">角色</span>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">团队</span>
              <select value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                <option value="">无团队</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void save()}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-sm font-bold text-white shadow disabled:opacity-50">
              {busy ? "保存中…" : "保存"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 用户列表 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">邮箱</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">姓名</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">角色</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">团队</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">创建时间</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">暂无用户，请先创建</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[u.role] ?? "bg-slate-100 text-slate-600"}`}>
                        {ROLES.find(r => r.value === u.role)?.label ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{teams.find(t => t.id === u.teamId)?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-slate-500">{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(u)}
                          className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400">编辑</button>
                        <button type="button" onClick={() => void deleteUser(u.id, u.email)}
                          className="text-xs font-medium text-red-600 hover:underline">删除</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
