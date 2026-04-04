"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { withClientBasePath } from "@/lib/client-url";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/dashboard";
  const forceChange = params.get("forceChange") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!forceChange) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(withClientBasePath("/api/auth/session"), {
          credentials: "include",
        });
        const j = (await r.json()) as {
          user?: { mustChangePassword?: boolean } | null;
        };
        if (!cancelled && j.user?.mustChangePassword) {
          setMustChangePassword(true);
          setError("首次登录需要先修改密码");
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [forceChange]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await fetch(withClientBasePath("/api/auth/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        error?: string;
        mustChangePassword?: boolean;
      };
      if (!r.ok) {
        if (r.status === 429) {
          const sec = r.headers.get("retry-after");
          setError(
            sec
              ? `尝试过于频繁，请 ${sec} 秒后再试`
              : (j.error ?? "尝试过于频繁，请稍后再试"),
          );
          return;
        }
        setError(j.error ?? "登录失败");
        return;
      }
      if (j.mustChangePassword) {
        setCurrentPassword(password);
        setMustChangePassword(true);
        setError("首次登录需要先修改密码");
        return;
      }
      const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
      router.replace(withClientBasePath(safeNext));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await fetch(withClientBasePath("/api/auth/change-password"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setError(j.error ?? "修改密码失败");
        return;
      }
      const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
      router.replace(withClientBasePath(safeNext));
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (mustChangePassword) {
    return (
      <form
        onSubmit={onChangePassword}
        className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
      >
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          首次登录，请先修改密码
        </h2>
        <div>
          <label
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
            htmlFor="profit-change-current-password"
          >
            当前密码
          </label>
          <input
            id="profit-change-current-password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label
            className="text-xs font-medium text-slate-600 dark:text-slate-400"
            htmlFor="profit-change-new-password"
          >
            新密码（至少8位）
          </label>
          <input
            id="profit-change-new-password"
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
        >
          {pending ? "保存中…" : "修改并继续"}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
    >
      <div>
        <label
          className="text-xs font-medium text-slate-600 dark:text-slate-400"
          htmlFor="profit-login-email"
        >
          邮箱
        </label>
        <input
          id="profit-login-email"
          type="email"
          autoComplete="username"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label
          className="text-xs font-medium text-slate-600 dark:text-slate-400"
          htmlFor="profit-login-password"
        >
          密码
        </label>
        <input
          id="profit-login-password"
          type="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
      >
        {pending ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
