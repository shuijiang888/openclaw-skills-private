"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/portal";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
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
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
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
