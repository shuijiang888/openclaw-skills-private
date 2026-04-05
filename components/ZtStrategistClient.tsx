"use client";

import { useMemo, useState } from "react";
import { demoHeaders } from "@/components/RoleSwitcher";
import { withClientBasePath } from "@/lib/client-url";

type StrategistResponse = {
  ok: boolean;
  report: {
    title: string;
    generatedAt: string;
    portraits: {
      submissionCount: number;
      activeTaskCount: number;
      activeIntelDefinitions: number;
      topRegions: Array<{ region: string; count: number }>;
      topSignalTypes: Array<{ signalType: string; count: number }>;
      hotIntelDefinitions: Array<{ code: string; name: string; count: number }>;
      roleActivity: Array<{ actorRole: string; count: number }>;
      trendHints: string[];
    };
    analysis: string[];
    forecast: string[];
    recommendations: string[];
  };
};

const DEFAULT_QUESTIONS = [
  "本周最值得老板关注的三类商情是什么？",
  "哪些区域在升温，哪些区域需要防守？",
  "从竞争与决策链角度，下周应优先打哪几场仗？",
];

export function ZtStrategistClient() {
  const [question, setQuestion] = useState(DEFAULT_QUESTIONS[0]);
  const [history, setHistory] = useState<Array<{ q: string; a: StrategistResponse["report"] }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastReport, setLastReport] = useState<StrategistResponse["report"] | null>(null);

  async function ask() {
    const q = question.trim();
    if (!q) {
      setError("请输入你想问大军师的问题。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(withClientBasePath("/api/zt/strategist"), {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...demoHeaders(),
        },
        body: JSON.stringify({ question: q }),
      });
      const payload = (await res.json().catch(() => ({}))) as
        | StrategistResponse
        | { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(
          (payload as { message?: string; error?: string }).message ??
            (payload as { error?: string }).error ??
            "大军师暂时离线",
        );
      }
      const report = (payload as StrategistResponse).report;
      setLastReport(report);
      setHistory((prev) => [{ q, a: report }, ...prev].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : "对话失败");
    } finally {
      setBusy(false);
    }
  }

  const hotRegionLine = useMemo(() => {
    if (!lastReport) return "";
    if (lastReport.portraits.topRegions.length === 0) return "暂无区域热点";
    return lastReport.portraits.topRegions
      .map((x) => `${x.region}(${x.count})`)
      .join(" · ");
  }, [lastReport]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-300/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-5 text-slate-100">
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-400/40 bg-slate-950/40 p-3">
            <img
              src={withClientBasePath("/images/platform-bg.jpg")}
              alt="AI大军师形象"
              className="h-40 w-40 rounded-full border border-amber-400/40 object-cover shadow-lg shadow-amber-600/20"
            />
            <p className="mt-2 text-xs text-amber-200">AI大军师 · 战情占卜师</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-amber-300/80">
              Strategist War Room
            </p>
            <h2 className="mt-1 text-2xl font-bold text-amber-100">AI大军师</h2>
            <p className="mt-2 text-sm text-slate-300">
              面向全量商业情报，进行分析、研判、预判与解读。允许大胆假设，但必须给出可执行建议。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {DEFAULT_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/20"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="向大军师提问：例如“华南本周是否会出现竞品价格战？”"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void ask()}
                className="rounded-lg border border-amber-400/60 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 disabled:opacity-60"
              >
                {busy ? "研判中…" : "请军师解读"}
              </button>
            </div>
            {error ? (
              <p className="mt-2 rounded-md border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {lastReport ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card label="情报总量" value={String(lastReport.portraits.submissionCount)} />
          <Card label="进行中任务" value={String(lastReport.portraits.activeTaskCount)} />
          <Card label="活跃定义" value={String(lastReport.portraits.activeIntelDefinitions)} />
        </section>
      ) : null}

      {lastReport ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            热点态势
          </h3>
          <p className="mt-1 text-xs text-slate-500">区域热度：{hotRegionLine}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {lastReport.analysis.map((x, idx) => (
              <li key={`${idx}-${x}`}>{x}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {lastReport ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Panel title="预判">
            {lastReport.forecast.map((x, idx) => (
              <p key={`${idx}-${x}`} className="text-sm text-slate-700 dark:text-slate-300">
                - {x}
              </p>
            ))}
          </Panel>
          <Panel title="行动建议">
            {lastReport.recommendations.map((x, idx) => (
              <p key={`${idx}-${x}`} className="text-sm text-slate-700 dark:text-slate-300">
                - {x}
              </p>
            ))}
          </Panel>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">对话记录</h3>
        <div className="mt-2 space-y-3">
          {history.map((x, idx) => (
            <div
              key={`${idx}-${x.q}`}
              className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/40"
            >
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">问：{x.q}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(x.a.generatedAt).toLocaleString("zh-CN")}
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                {x.a.analysis[0] ?? "暂无回答"}
              </p>
            </div>
          ))}
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">暂无对话，先提一个战情问题试试。</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}
