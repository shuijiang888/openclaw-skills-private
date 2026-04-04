"use client";

export default function CompassError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-xl font-semibold text-red-800 dark:text-red-300">
        客户价值罗盘渲染出错
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        若为升级代码后出现，请在{" "}
        <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">profit-web</code>{" "}
        执行：<code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">npx prisma generate && npm run db:repair && npm run db:seed</code>
        ，重启 dev 后重试。
      </p>
      <pre className="max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900">
        {error.message}
      </pre>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        重试
      </button>
    </div>
  );
}
