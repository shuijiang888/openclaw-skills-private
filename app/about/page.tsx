"use client";

import { useState, useRef } from "react";
import { PageContainer } from "@/components/PageContainer";

/* ================================================================
   Tab1: 价值主张
   ================================================================ */
function TabValueProposition() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-slate-50 p-6 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-950">
        <p className="text-lg font-bold leading-relaxed text-slate-900 dark:text-white">
          给高科技制造业老板的一句话：
        </p>
        <p className="mt-2 text-xl font-black text-amber-700 dark:text-amber-400">
          "您的销售团队，每个月报出多少笔'亏本单'？每笔亏本单，平均亏多少？"
        </p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          纷享销客智能盈利管理系统，让每一笔报价都有数据依据、每一次让步都有毛利底线、每一个决策都可追溯。
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">一、老板最关心的三个问题</h2>
        <div className="mt-4 space-y-4">
          {[
            { q: "Q1: 我的销售，有没有报亏本价？", a: "系统实时计算成本+毛利，低于底线自动拦截或强制审批留痕" },
            { q: "Q2: 同样一个产品，不同销售报的价格差多少？", a: "系统标准化系数+分层授权，杜绝「同单不同价」" },
            { q: "Q3: 这个月整体盈利结构有没有在恶化？", a: "盈利罗盘实时呈现：明星项目/现金牛/问题项目/瘦狗一目了然" },
          ].map((item) => (
            <div key={item.q} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <p className="font-semibold text-slate-900 dark:text-white">{item.q}</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">→ {item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">二、核心价值（可量化）</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "报价响应时间", from: "天级", to: "分钟级", icon: "⚡" },
            { label: "报价准确率", from: "历史偏差大", to: "提升 20%+", icon: "🎯" },
            { label: "审批效率", from: "人工追单", to: "自动化 60%+", icon: "✅" },
            { label: "盈利可视", from: "事后算账", to: "实时 P&L 监控", icon: "📊" },
          ].map((v) => (
            <div key={v.label} className="card-hover rounded-xl border border-slate-200 bg-gradient-to-br from-white to-amber-50/30 p-4 dark:border-slate-700 dark:from-slate-900 dark:to-amber-950/10">
              <span className="text-2xl">{v.icon}</span>
              <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white">{v.label}</p>
              <p className="mt-1 text-[10px] text-red-500 line-through">{v.from}</p>
              <p className="text-sm font-bold text-emerald-600">{v.to}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">三、最小行动</h2>
        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          只需做一件事：让销售用系统报价 4 周。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { week: "第 1-2 周", action: "系统学习 + 并行双轨", desc: "系统 + Excel 同步走" },
            { week: "第 3-4 周", action: "系统为主", desc: "Excel 为辅，仅验证" },
            { week: "第 5 周起", action: "系统为唯一依据", desc: "报价全部走系统" },
          ].map((s) => (
            <div key={s.week} className="rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-800 dark:bg-slate-900">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{s.week}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{s.action}</p>
              <p className="mt-0.5 text-xs text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          效果承诺：如果 4 周内没有感受到报价效率提升，我们一起复盘原因。
        </p>
      </section>
    </div>
  );
}

/* ================================================================
   Tab2: 专家风采
   ================================================================ */
function TabExpert() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 px-6 py-12 text-white sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_75%_-10%,rgba(251,191,36,0.15),transparent)]" />
          <div className="pointer-events-none absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:items-center">
            {/* 巨幅真实照片 */}
            <div className="relative shrink-0">
              <div className="h-44 w-44 overflow-hidden rounded-2xl shadow-2xl shadow-amber-500/30 ring-4 ring-white/20 sm:h-56 sm:w-44">
                <img
                  src="/images/experts/chenwei_portrait1.jpeg"
                  alt="陈玮 Kevin"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-[10px] font-bold text-white shadow-lg">
                华为系专家
              </div>
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">Special Expert</p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">陈玮 Kevin</h2>
              <p className="mt-2 text-lg font-semibold text-amber-300">战略 & 市场 & 销售专家</p>
              <p className="mt-1 text-sm text-slate-300">萃升咨询营销研究院负责人</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                {["30+亿美金产品线", "15年500强", "50+上市公司", "20+行业"].map(tag => (
                  <span key={tag} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">核心背景</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />前华为 30+ 亿美金产品线 MKT 部长</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />15 年 500 强标杆企业工作经验（Ericsson、NSN、Huawei）</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />历任研发、交付、销售、MKT 重要岗位</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />华为 LTC 和 MTL 变革的亲历者</li>
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">现任</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />某华为系知名咨询集团副总裁，创办战略营销 BG</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />AI 医疗 & 眼视光创业者</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />服务超过 20 个行业 50 余家上市公司</li>
            </ul>
          </section>
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">专长行业</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["ICT 高新科技", "新能源", "智能制造", "医疗器械"].map(t => (
                  <span key={t} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">{t}</span>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">核心能力</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                精通销售管理、策略制定、合同谈判，足迹遍及拉美、亚太、中东、欧洲、非洲。能将战略规划、策略制定、营销管理等各方面有效结合，为企业创造真正的价值和效益。
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Tab3: 损失测算计算器
   ================================================================ */
function TabLossCalculator() {
  const [inputs, setInputs] = useState({
    monthlyQuotes: 10,
    lossRatio: 15,
    avgLossAmount: 5,
    mgmtHours: 8,
    hourlyRate: 500,
    lostCustomers: 3,
    avgCustomerValue: 50,
    teamSize: 10,
  });
  const reportRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof typeof inputs, value: number) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const annualDirectLoss = inputs.monthlyQuotes * 12 * (inputs.lossRatio / 100) * inputs.avgLossAmount;
  const annualMgmtLoss = inputs.monthlyQuotes * 12 * (inputs.lossRatio / 100) * inputs.mgmtHours * inputs.hourlyRate / 10000;
  const annualChurnLoss = inputs.lostCustomers * inputs.avgCustomerValue;
  const totalLoss = annualDirectLoss + annualMgmtLoss + annualChurnLoss;
  const conservativeLoss = totalLoss * 0.8;

  const fields: { key: keyof typeof inputs; label: string; unit: string; example: string }[] = [
    { key: "monthlyQuotes", label: "月均报价单数", unit: "笔", example: "每月报价项目数量" },
    { key: "lossRatio", label: "亏损单比例", unit: "%", example: "亏本单占比" },
    { key: "avgLossAmount", label: "平均亏损额", unit: "万元", example: "每笔亏本单平均亏损" },
    { key: "mgmtHours", label: "管理层处理时间", unit: "小时/月", example: "每月处理亏损单耗时" },
    { key: "hourlyRate", label: "时薪成本", unit: "元/小时", example: "管理层每小时成本" },
    { key: "lostCustomers", label: "年流失客户数", unit: "个", example: "因亏损单流失" },
    { key: "avgCustomerValue", label: "平均客户价值", unit: "万元", example: "年客单价" },
    { key: "teamSize", label: "销售团队人数", unit: "人", example: "团队规模" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-red-200/70 bg-gradient-to-br from-red-50 to-white p-6 shadow-sm dark:border-red-900/40 dark:from-red-950/20 dark:to-slate-900">
        <h2 className="text-lg font-bold text-red-800 dark:text-red-300">不采纳系统的隐性损失</h2>
        <p className="mt-1 text-sm text-slate-500">输入您的企业数据，实时计算每年因报价管理缺失造成的损失</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">输入企业数据</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {fields.map(f => (
              <label key={f.key} className="block">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    value={inputs[f.key]}
                    onChange={e => set(f.key, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-950"
                  />
                  <span className="shrink-0 text-xs text-slate-400">{f.unit}</span>
                </div>
                <span className="mt-0.5 block text-[10px] text-slate-400">{f.example}</span>
              </label>
            ))}
          </div>
        </section>

        <div ref={reportRef} className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">计算公式</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>年直接损失 = {inputs.monthlyQuotes} × 12 × {inputs.lossRatio}% × {inputs.avgLossAmount}万 = <strong className="text-red-600">{annualDirectLoss.toFixed(2)} 万</strong></p>
              <p>年管理损失 = {inputs.monthlyQuotes} × 12 × {inputs.lossRatio}% × {inputs.mgmtHours}h × {inputs.hourlyRate}元 ÷ 10000 = <strong className="text-red-600">{annualMgmtLoss.toFixed(2)} 万</strong></p>
              <p>年客户流失 = {inputs.lostCustomers} × {inputs.avgCustomerValue}万 = <strong className="text-red-600">{annualChurnLoss.toFixed(2)} 万</strong></p>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-white p-5 shadow-md dark:border-red-800 dark:from-red-950/30 dark:to-slate-900">
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">损失评估报告</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">年直接损失</span>
                <span className="text-lg font-bold tabular-nums text-red-600">{annualDirectLoss.toFixed(2)} 万</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">年管理损失</span>
                <span className="text-lg font-bold tabular-nums text-red-600">{annualMgmtLoss.toFixed(2)} 万</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">年客户流失损失</span>
                <span className="text-lg font-bold tabular-nums text-red-600">{annualChurnLoss.toFixed(2)} 万</span>
              </div>
              <div className="border-t border-red-200 pt-3 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">总隐性损失</span>
                  <span className="text-2xl font-black tabular-nums text-red-600">{totalLoss.toFixed(2)} 万/年</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-slate-500">保守估算（×0.8）</span>
                  <span className="text-lg font-bold tabular-nums text-red-500">{conservativeLoss.toFixed(2)} 万/年</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-red-100/80 px-4 py-3 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200">
              这是保守估算。实际可能高达 {(totalLoss * 1.5).toFixed(0)}-{(totalLoss * 2).toFixed(0)} 万/年。
              而引入智能盈利管理系统的年费，约为这笔损失的 10%-15%。
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Tab4: 收益测算计算器
   ================================================================ */
function TabGainCalculator() {
  const [inputs, setInputs] = useState({
    monthlyQuotes: 10,
    avgOrderAmount: 100,
    adoptionRateUp: 5,
    marginRateUp: 2,
    savedHoursMonth: 20,
    hourlyRate: 500,
    retainedCustomers: 2,
    avgCustomerValue: 50,
    systemAnnualFee: 30,
  });
  const reportRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof typeof inputs, value: number) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const annualDirectGain = inputs.monthlyQuotes * 12 * (inputs.adoptionRateUp / 100) * inputs.avgOrderAmount * (inputs.marginRateUp / 100);
  const annualMgmtGain = inputs.savedHoursMonth * 12 * inputs.hourlyRate / 10000;
  const annualRetentionGain = inputs.retainedCustomers * inputs.avgCustomerValue;
  const totalGain = annualDirectGain + annualMgmtGain + annualRetentionGain;
  const roi = inputs.systemAnnualFee > 0 ? totalGain / inputs.systemAnnualFee : 0;

  const fields: { key: keyof typeof inputs; label: string; unit: string }[] = [
    { key: "monthlyQuotes", label: "月均报价单数", unit: "笔" },
    { key: "avgOrderAmount", label: "平均订单额", unit: "万元" },
    { key: "adoptionRateUp", label: "采纳率提升", unit: "%" },
    { key: "marginRateUp", label: "毛利率提升", unit: "%" },
    { key: "savedHoursMonth", label: "每月节省工时", unit: "小时" },
    { key: "hourlyRate", label: "时薪成本", unit: "元" },
    { key: "retainedCustomers", label: "新增留存客户", unit: "个/年" },
    { key: "avgCustomerValue", label: "客户年价值", unit: "万元" },
    { key: "systemAnnualFee", label: "系统年费", unit: "万元" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-slate-900">
        <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">采纳系统后的年化收益</h2>
        <p className="mt-1 text-sm text-slate-500">基于您的业务数据，测算系统带来的可量化收益与投资回报</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">输入业务数据</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {fields.map(f => (
              <label key={f.key} className="block">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
                <div className="mt-1 flex items-center gap-1">
                  <input
                    type="number"
                    value={inputs[f.key]}
                    onChange={e => set(f.key, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-950"
                  />
                  <span className="shrink-0 text-xs text-slate-400">{f.unit}</span>
                </div>
              </label>
            ))}
          </div>
        </section>

        <div ref={reportRef} className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">计算明细</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <p>毛利提升收益 = {inputs.monthlyQuotes} × 12 × {inputs.adoptionRateUp}% × {inputs.avgOrderAmount}万 × {inputs.marginRateUp}% = <strong className="text-emerald-600">{annualDirectGain.toFixed(2)} 万</strong></p>
              <p>管理效率收益 = {inputs.savedHoursMonth}h × 12 × {inputs.hourlyRate}元 ÷ 10000 = <strong className="text-emerald-600">{annualMgmtGain.toFixed(2)} 万</strong></p>
              <p>客户留存收益 = {inputs.retainedCustomers} × {inputs.avgCustomerValue}万 = <strong className="text-emerald-600">{annualRetentionGain.toFixed(2)} 万</strong></p>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-md dark:border-emerald-800 dark:from-emerald-950/30 dark:to-slate-900">
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">收益评估报告</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">毛利提升收益</span>
                <span className="text-lg font-bold tabular-nums text-emerald-600">{annualDirectGain.toFixed(2)} 万</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">管理效率收益</span>
                <span className="text-lg font-bold tabular-nums text-emerald-600">{annualMgmtGain.toFixed(2)} 万</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">客户留存收益</span>
                <span className="text-lg font-bold tabular-nums text-emerald-600">{annualRetentionGain.toFixed(2)} 万</span>
              </div>
              <div className="border-t border-emerald-200 pt-3 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">年化总收益</span>
                  <span className="text-2xl font-black tabular-nums text-emerald-600">{totalGain.toFixed(2)} 万/年</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-100/80 px-4 py-3 dark:bg-emerald-950/40">
                <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">投资回报率 ROI</span>
                <span className="text-2xl font-black tabular-nums text-emerald-700 dark:text-emerald-300">{roi.toFixed(1)} 倍</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              对赌对比：系统年费 {inputs.systemAnnualFee} 万 → 年收益 {totalGain.toFixed(1)} 万 → <strong>ROI {roi.toFixed(1)} 倍</strong>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   主页面：4 Tab 布局
   ================================================================ */
const TABS = [
  { key: "value", label: "价值主张" },
  { key: "expert", label: "专家风采" },
  { key: "loss", label: "损失测算" },
  { key: "gain", label: "收益测算" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("value");

  return (
    <PageContainer className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">价值主张</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          让每一笔报价都有数据依据，让每一次决策都可追溯
        </p>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-white text-amber-700 shadow-sm dark:bg-slate-800 dark:text-amber-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === "value" && <TabValueProposition />}
      {activeTab === "expert" && <TabExpert />}
      {activeTab === "loss" && <TabLossCalculator />}
      {activeTab === "gain" && <TabGainCalculator />}
    </PageContainer>
  );
}
