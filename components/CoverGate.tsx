"use client";

import { useMemo, useState } from "react";
import { withClientBasePath } from "@/lib/client-url";

function worldTime(offsetHours: number): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const dt = new Date(utcMs + offsetHours * 3_600_000);
  return dt.toISOString().slice(11, 16);
}

export function CoverGate() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedForSec, setLockedForSec] = useState<number | null>(null);

  const times = useMemo(
    () => [
      `北京 ${worldTime(8)}`,
      `旧金山 ${worldTime(-7)}`,
      `纽约 ${worldTime(-4)}`,
      `伦敦 ${worldTime(1)}`,
    ],
    [],
  );

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setLockedForSec(null);
    try {
      const res = await fetch(withClientBasePath("/api/auth/verify"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        retryAfterSec?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "验证失败");
        if (typeof data.retryAfterSec === "number") {
          setLockedForSec(data.retryAfterSec);
        }
        return;
      }
      window.location.reload();
    } catch {
      setError("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-[calc(100vh-8rem)] overflow-hidden rounded-3xl border border-slate-700/50 bg-gradient-to-br from-[#0a0f1a] via-[#0e1729] to-[#1a1a2e] p-4 text-slate-100 shadow-2xl sm:p-8"
      style={{
        backgroundImage:
          "linear-gradient(130deg, rgba(10,15,26,0.94), rgba(26,26,46,0.92)), url('/images/platform-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(245,158,11,0.2),transparent)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-amber-200/90">
              AI VALUE SERVICE PLATFORM
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              AI价值服务作战平台
            </h1>
            <p className="mt-1 text-xs text-slate-300">纷享销客 · 中西南</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-slate-100 backdrop-blur">
            {times.join(" | ")}
          </div>
        </header>

        <section className="space-y-2">
          <p className="text-lg font-semibold text-amber-200 sm:text-xl">欢迎回来</p>
          <p className="text-sm text-slate-200/90">江水</p>
        </section>

        <section className="mx-auto w-full max-w-xl rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-md sm:p-6">
          <h2 className="text-sm font-semibold text-amber-100">🔐 请输入访问密码</h2>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={password}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              className="w-full rounded-xl border border-white/25 bg-slate-950/50 px-4 py-3 text-base tracking-[0.2em] text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
              placeholder="●●●●●●"
            />
            <button
              type="button"
              disabled={loading || password.length < 6}
              onClick={() => void submit()}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "验证中…" : "进入系统"}
            </button>
          </div>
          {error ? (
            <p className="mt-3 text-xs text-rose-200">
              × {error}
              {lockedForSec ? `（请 ${lockedForSec} 秒后再试）` : ""}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
