"use client";

import Link from "next/link";
import { withClientBasePath } from "@/lib/client-url";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto my-8 w-full max-w-3xl rounded-2xl border border-rose-300 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <h2 className="text-lg font-semibold">页面暂时不可用</h2>
      <p className="mt-2 text-sm">
        系统检测到运行异常，已阻止页面崩溃。请先点击“重试”，若仍失败可返回门户或稍后再试。
      </p>
      <p className="mt-2 break-all text-xs opacity-80">
        {error?.message ? `错误信息：${error.message}` : "错误信息：未知异常"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md border border-rose-400/60 bg-white px-3 py-1.5 text-sm font-medium hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/40"
        >
          重试
        </button>
        <Link
          href={withClientBasePath("/")}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          返回门户
        </Link>
      </div>
    </div>
  );
}
