import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Printer, Trash2, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { db, deletePayment } from '../../db/dexie';
import { printElementToA4 } from '../../utils/printHelper';
import { summarizePeriod, periodBreakdown, type BreakdownRow } from '../../utils/finance';
import { MONTHS_AR, formatDateAr, formatDayMonth, inPeriod, periodLabel, periodMode, shiftPeriod } from '../../utils/period';
import { num, pct, plain } from '../../utils/format';
import { usePeriod } from '../../context/PeriodContext';
import { PeriodPicker } from '../common/PeriodPicker';
import { OrderReceiptModal } from '../orders/OrderReceiptModal';
import { PaymentVoucherModal } from '../suppliers/PaymentVoucherModal';
import { CashflowChart, ChartLegend } from './CashflowChart';
import { PinPromptModal } from '../security/StatsPin';
import type { Order, Expense, PaymentTransaction, WorkshopSettings } from '../../types';
import { newestFirst } from '../../utils/docNumber';
import { ask } from '../common/Dialogs';

interface FinancialReportProps {
  orders: Order[];
  expenses: Expense[];
  settings: WorkshopSettings;
}

type View = 'receipts' | 'stats';

// المالية: السندات أولاً (للعمال والمحاسبين)، والإحصاءات مخفية حتى يفتحها المالك.
// الاختيار لا يُحفظ: عند العودة للشاشة تظهر السندات من جديد.
export const FinancialReport: React.FC<FinancialReportProps> = ({ orders, expenses, settings }) => {
  const { period, label } = usePeriod();
  const payments = useLiveQuery(() => db.paymentTransactions.toArray(), []) || [];
  const [view, setView] = useState<View>('receipts');
  // الرمز يُطلب في كل مرة تُفتح فيها الإحصاءات
  const [askPin, setAskPin] = useState(false);

  const openView = (v: View) => {
    if (v === 'stats' && view !== 'stats' && settings.statsPinHash) return setAskPin(true);
    setView(v);
  };
  const [search, setSearch] = useState('');
  const [receipt, setReceipt] = useState<{ order: Order; payment: PaymentTransaction } | null>(null);
  const [voucher, setVoucher] = useState<PaymentTransaction | null>(null);
  const mode = periodMode(period);

  const earliestDate = useMemo(() => {
    const dates = [
      ...orders.map((o) => o.orderDate),
      ...payments.map((p) => p.date),
      ...expenses.map((e) => e.date),
    ].filter(Boolean);
    return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : undefined;
  }, [orders, payments, expenses]);

  const receipts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments
      .filter((p) => inPeriod(p.date, period))
      .filter(
        (p) =>
          !q ||
          p.partyName.toLowerCase().includes(q) ||
          p.receiptNumber.toLowerCase().includes(q) ||
          p.itemPurpose.toLowerCase().includes(q)
      )
      .sort(newestFirst((p) => p.date, (p) => p.receiptNumber));
  }, [payments, period, search]);

  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const handleVoid = async (p: PaymentTransaction) => {
    if (await ask(`حذف السند ${p.receiptNumber}؟`)) await deletePayment(p.id);
  };

  const openPrint = (p: PaymentTransaction) => {
    if (p.type === 'supplier_out') return setVoucher(p);
    const order = ordersById.get(p.relatedId);
    if (order) setReceipt({ order, payment: p });
  };

  const th = 'py-2 px-3 border-l border-slate-200';
  const td = 'py-2 px-3 border-l border-slate-200';
  const dateOf = (d: string) => (mode === 'month' ? formatDayMonth(d) : formatDateAr(d));

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 max-w-6xl w-full mx-auto">
      <div className="shrink-0 flex flex-wrap justify-between items-center gap-2 bg-white px-3.5 py-2.5 rounded-[4px] border border-slate-300 shadow-2xs">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base font-display">المالية</h2>
          <div className="inline-flex p-0.5 bg-slate-100 rounded-[6px] no-print" role="tablist">
            {(
              [
                ['receipts', 'السندات'],
                ['stats', 'الإحصاءات'],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => openView(id)}
                className={`h-7 px-3 rounded-[4px] text-xs font-semibold ${
                  view === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {view === 'receipts' && (
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="h-8 w-full pr-8 pl-2.5 text-xs rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534] bg-white"
              />
            </div>
          )}
          <PeriodPicker earliestDate={earliestDate} />
          <button
            type="button"
            onClick={() =>
              printElementToA4(
                'printable-financial-report',
                `${view === 'receipts' ? 'السندات' : 'التقرير_المالي'}_${label.replace(/\s+/g, '_')}`
              )
            }
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs sm:text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>طباعة</span>
          </button>
        </div>
      </div>

      <div id="printable-financial-report" className="flex-1 min-h-0 flex flex-col gap-3">
        <div className="hidden print:flex justify-between items-center border-b-2 border-slate-800 pb-3">
          <h1 className="text-xl font-bold font-display text-slate-900">{settings.workshopName}</h1>
          <div className="text-sm font-bold">
            {view === 'receipts' ? 'السندات' : 'التقرير المالي'} — {label}
          </div>
        </div>

        {view === 'receipts' ? (
          <div className="min-h-0 overflow-auto bg-white rounded-[4px] border border-slate-300 shadow-2xs">
            <table className="w-full text-right text-xs sm:text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
                <tr>
                  <th className={`${th} w-28`}>الرقم</th>
                  <th className={th}>الطرف</th>
                  <th className={`${th} text-center w-28`}>الوسيلة</th>
                  <th className={`${th} text-center w-28`}>المبلغ</th>
                  <th className={`${th} text-center w-32`}>التاريخ</th>
                  <th className="py-2 px-3 w-20 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">لا سندات</td>
                  </tr>
                ) : (
                  receipts.map((p) => {
                    const isIn = p.type === 'customer_in';
                    return (
                      <tr key={p.id} onClick={() => openPrint(p)} className="cursor-pointer hover:bg-amber-50/25">
                        <td className={`${td} font-bold text-xs tabular-nums`}>{p.receiptNumber}</td>
                        <td className={td}>
                          <div className="font-bold text-slate-900">{p.partyName}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">{p.itemPurpose}</div>
                        </td>
                        <td className={`${td} text-center text-xs`}>{p.paymentMethod}</td>
                        <td className={`${td} text-center font-bold tabular-nums ${isIn ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                          <span dir="ltr">
                            {isIn ? '+' : '−'}
                            {num(p.amount)}
                          </span>
                        </td>
                        <td className={`${td} text-center text-xs text-slate-600`}>{dateOf(p.date)}</td>
                        <td className="py-2 px-3 no-print" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => openPrint(p)}
                              className="p-1 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              aria-label="طباعة"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoid(p)}
                              className="p-1 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              aria-label="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <StatsView orders={orders} expenses={expenses} payments={payments} />
        )}
      </div>

      {receipt && (
        <OrderReceiptModal
          isOpen={!!receipt}
          onClose={() => setReceipt(null)}
          order={receipt.order}
          payment={receipt.payment}
          settings={settings}
        />
      )}
      <PaymentVoucherModal isOpen={!!voucher} onClose={() => setVoucher(null)} payment={voucher} settings={settings} />
      <PinPromptModal
        isOpen={askPin}
        title="الإحصاءات"
        pinHash={settings.statsPinHash}
        onClose={() => setAskPin(false)}
        onUnlock={() => {
          setAskPin(false);
          setView('stats');
        }}
      />
    </div>
  );
};

// ───────── الإحصاءات ─────────

const StatsView: React.FC<{ orders: Order[]; expenses: Expense[]; payments: PaymentTransaction[] }> = ({
  orders,
  expenses,
  payments,
}) => {
  const { period, setPeriod } = usePeriod();
  const suppliers = useLiveQuery(() => db.supplierDebts.toArray(), []) || [];
  const [chartView, setChartView] = useState<'chart' | 'table'>('chart');
  const mode = periodMode(period);

  const summary = useMemo(
    () => summarizePeriod(period, orders, payments, expenses, suppliers),
    [period, orders, payments, expenses, suppliers]
  );
  const previous = useMemo(
    () => (mode === 'all' ? null : summarizePeriod(shiftPeriod(period, -1), orders, payments, expenses, suppliers)),
    [mode, period, orders, payments, expenses, suppliers]
  );

  // الرسم: أشهر السنة، أو السنوات عند "الكل" (فقط إذا كانت هناك أكثر من سنة)
  const breakdown = useMemo(() => {
    if (mode === 'month') return [];
    const rows = periodBreakdown(period, orders, payments, expenses);
    return mode === 'all' && rows.length < 2 ? [] : rows;
  }, [mode, period, orders, payments, expenses]);
  const activeRows = breakdown.filter((r) => r.collected || r.expenses || r.ordersValue);

  const prevPeriod = shiftPeriod(period, -1);
  const prevLabel = mode === 'month' ? MONTHS_AR[(prevPeriod.month ?? 1) - 1] : periodLabel(prevPeriod);
  const change = (cur: number, prev: number) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : undefined);
  const delta = (cur: number, prev: number | undefined, goodWhenUp: boolean) => {
    const c = prev === undefined ? undefined : change(cur, prev);
    return c === undefined ? undefined : { change: c, goodWhenUp };
  };

  const cards = [
    {
      title: 'صافي الربح',
      value: summary.net,
      color: summary.net >= 0 ? 'text-[#15803d]' : 'text-[#b91c1c]',
      delta: delta(summary.net, previous?.net, true),
    },
    { title: 'المقبوضات', value: summary.collected, color: 'text-slate-900', delta: delta(summary.collected, previous?.collected, true) },
    { title: 'المصاريف', value: summary.expenses, color: 'text-slate-900', delta: delta(summary.expenses, previous?.expenses, false) },
    {
      title: 'ديون الزبائن',
      value: summary.openReceivables,
      color: 'text-[#b91c1c]',
      note: summary.openReceivablesCount ? `${plain(summary.openReceivablesCount)} طلبيات` : undefined,
    },
  ];

  const selectRow = (r: BreakdownRow) => setPeriod({ year: r.year, month: r.month });
  const th = 'py-2 px-3 border-l border-slate-200';
  const td = 'py-2 px-3 border-l border-slate-200';

  const lists = (
    <>
      <ShareList title="المصاريف حسب التصنيف" total={summary.expenses} rows={summary.byCategory.map((c) => ({ label: c.label, amount: c.amount }))} />
      <ShareList title="المقبوضات حسب الوسيلة" total={summary.collected} rows={summary.byMethod.map((m) => ({ label: m.name, amount: m.amount }))} />
    </>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto lg:overflow-hidden">
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.title} className="bg-white p-3.5 rounded-[4px] border border-slate-300 shadow-xs">
            <div className="text-xs font-semibold text-slate-500">{c.title}</div>
            <div className={`mt-1 text-2xl font-bold ${c.color}`}>
              {num(c.value)} <span className="text-xs font-normal text-slate-500">₪</span>
            </div>
            <div className="mt-1 h-4 text-[11px] text-slate-500">
              {c.delta ? <Delta {...c.delta} against={prevLabel} /> : c.note}
            </div>
          </div>
        ))}
      </div>

      {breakdown.length > 0 ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 min-h-0 flex flex-col bg-white rounded-[4px] border border-slate-300 shadow-2xs">
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-slate-200">
              <ChartLegend />
              <div className="inline-flex p-0.5 bg-slate-100 rounded-[6px] no-print">
                {(['chart', 'table'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setChartView(v)}
                    className={`h-6 px-2.5 rounded-[4px] text-[11px] font-semibold ${
                      chartView === v ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    {v === 'chart' ? 'رسم' : 'جدول'}
                  </button>
                ))}
              </div>
            </div>
            {chartView === 'chart' ? (
              <div className="px-3 pt-3 pb-1">
                <CashflowChart rows={breakdown} onSelect={selectRow} />
              </div>
            ) : (
              <div className="min-h-0 overflow-auto">
                <table className="w-full text-right text-xs sm:text-sm border-collapse">
                  <thead className="sticky top-0 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
                    <tr>
                      <th className={th}>{mode === 'all' ? 'السنة' : 'الشهر'}</th>
                      <th className={`${th} text-center`}>المقبوضات</th>
                      <th className={`${th} text-center`}>المصاريف</th>
                      <th className="py-2 px-3 text-center">الصافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 tabular-nums">
                    {activeRows.map((r) => (
                      <tr key={r.key} onClick={() => selectRow(r)} className="cursor-pointer hover:bg-amber-50/40">
                        <td className={`${td} font-semibold`}>{r.month === null ? plain(r.year) : MONTHS_AR[r.month - 1]}</td>
                        <td className={`${td} text-center`}>{num(r.collected)}</td>
                        <td className={`${td} text-center`}>{num(r.expenses)}</td>
                        <td className={`py-2 px-3 text-center font-bold ${r.net >= 0 ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
                          {num(r.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="min-h-0 flex flex-col gap-3">{lists}</div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">{lists}</div>
      )}
    </div>
  );
};

// سهم + نسبة التغير عن الفترة السابقة؛ الأخضر = تحسن
const Delta: React.FC<{ change: number; goodWhenUp: boolean; against: string }> = ({ change, goodWhenUp, against }) => {
  if (Math.round(change) === 0) return <span>بلا تغيير عن {against}</span>;
  const up = change > 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center font-semibold ${good ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
        <Icon className="w-3 h-3" />
        {pct(Math.abs(change))}
      </span>
      <span>عن {against}</span>
    </span>
  );
};

// قائمة مع شريط نسبة لكل بند من المجموع؛ تمرر من داخلها عند الطول
const ShareList: React.FC<{ title: string; total: number; rows: { label: string; amount: number }[] }> = ({ title, total, rows }) => (
  <div className="min-h-0 max-h-full flex flex-col bg-white rounded-[4px] border border-slate-300 shadow-2xs">
    <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 font-bold text-slate-800 text-xs sm:text-sm">{title}</div>
    {rows.length === 0 ? (
      <div className="py-4 text-center text-xs text-slate-400">—</div>
    ) : (
      <ul className="min-h-0 overflow-auto px-3.5 py-2 space-y-2 text-xs sm:text-sm">
        {rows.map((r) => {
          const share = total > 0 ? (r.amount / total) * 100 : 0;
          return (
            <li key={r.label}>
              <div className="flex justify-between gap-2">
                <span className="text-slate-700">{r.label}</span>
                <span className="font-bold tabular-nums text-slate-900">
                  {num(r.amount)} <span className="text-[11px] font-normal text-slate-400">{pct(share)}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${share}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);
