"use client";

import { useDeferredValue, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

function splitByH2(markdown: string): { id: string; title: string; body: string }[] {
  const parts = markdown.split(/\n(?=## )/);
  return parts.map((chunk, i) => {
    const trimmed = chunk.trim();
    const firstLine = trimmed.split("\n")[0] ?? "";
    const title = firstLine.startsWith("## ")
      ? firstLine.replace(/^##\s+/, "").trim()
      : i === 0
        ? "文档开头"
        : `片段 ${i + 1}`;
    return { id: `sec-${i}`, title, body: trimmed };
  });
}

const mdComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  h1: (props) => (
    <h1
      className="mt-10 scroll-mt-24 text-2xl font-bold tracking-tight text-slate-900 first:mt-0 dark:text-slate-50"
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      className="mt-10 scroll-mt-24 border-b border-slate-200 pb-2 text-xl font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-50"
      {...props}
    />
  ),
  h3: (props) => (
    <h3 className="mt-6 text-lg font-semibold text-slate-900 dark:text-slate-50" {...props} />
  ),
  p: (props) => (
    <p className="mt-3 leading-relaxed text-slate-700 dark:text-slate-300" {...props} />
  ),
  ul: (props) => (
    <ul className="mt-3 list-inside list-disc space-y-2 text-slate-700 dark:text-slate-300" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-3 list-inside list-decimal space-y-2 text-slate-700 dark:text-slate-300" {...props} />
  ),
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />,
  hr: () => <hr className="my-8 border-slate-200 dark:border-slate-700" />,
  blockquote: (props) => (
    <blockquote
      className="mt-3 border-l-4 border-slate-300 pl-4 text-slate-600 italic dark:border-slate-600 dark:text-slate-400"
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm" {...props} />
    </div>
  ),
  thead: (props) => (
    <thead className="bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300" {...props} />
  ),
  th: (props) => (
    <th className="border-b border-slate-200 px-3 py-2 font-medium dark:border-slate-700" {...props} />
  ),
  td: (props) => (
    <td className="border-b border-slate-100 px-3 py-2 align-top text-slate-700 dark:border-slate-800 dark:text-slate-300" {...props} />
  ),
  tr: (props) => <tr className="even:bg-slate-50/50 dark:even:bg-slate-900/40" {...props} />,
  code: ({ className, children, ...props }) => {
    const inline = !className;
    if (inline) {
      return (
        <code
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800 dark:bg-slate-800 dark:text-slate-200"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  pre: (props) => (
    <pre
      className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm text-slate-100"
      {...props}
    />
  ),
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("http")) {
      return (
        <a
          href={href}
          className="font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-400"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }
    return (
      <Link
        href={href ?? "#"}
        className="font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-400"
        {...props}
      >
        {children}
      </Link>
    );
  },
};

export function StrategyFullDoc({ markdown }: { markdown: string }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());

  const sections = useMemo(() => splitByH2(markdown), [markdown]);

  const filtered = useMemo(() => {
    if (!deferred) return sections;
    return sections.filter(
      (s) =>
        s.body.toLowerCase().includes(deferred) ||
        s.title.toLowerCase().includes(deferred),
    );
  }, [sections, deferred]);

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200/90 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-amber-800 dark:text-amber-400">
              战略与路线图同步稿
            </p>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              战略全文 · 可检索
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              与仓库{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">docs/VALUE_STRATEGY_DEPLOYMENT_ROADMAP.md</code>{" "}
              同步；按关键词过滤章节。
            </p>
          </div>
          <label className="flex w-full flex-col gap-1 text-xs sm:max-w-xs">
            <span className="font-medium text-slate-600 dark:text-slate-400">搜索（标题与正文）</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例如：价值主张、审批、企业资源计划、路线图…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
          共 {sections.length} 个片段，当前匹配{" "}
          <span className="font-bold text-slate-900 dark:text-white">
            {filtered.length}
          </span>{" "}
          个
          {deferred ? ` · 关键词「${query.trim()}」` : ""}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl space-y-10">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-slate-500">无匹配章节，请换关键词。</p>
        ) : (
          filtered.map((s) => (
            <article
              key={s.id}
              id={s.id}
              className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {s.title !== "文档开头" ? (
                <p className="text-xs font-semibold tracking-wide text-amber-800 dark:text-amber-400">
                  {s.title}
                </p>
              ) : null}
              <div className="strategy-md">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {s.body}
                </ReactMarkdown>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
