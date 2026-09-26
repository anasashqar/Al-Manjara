import React from 'react';
import { Printer, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { LedgerRow } from '../../utils/finance';
import type { WeekClosing } from '../../types';
import { formatDateAr, formatDayMonth } from '../../utils/period';
import { num, pct, plain } from '../../utils/format';
import { shortPurpose } from '../../utils/docNumber';

export const closingLabel = (c: Pick<WeekClosing, 'fromDate' | 'toDate'>) =>
  c.fromDate === c.toDate ? formatDateAr(c.toDate) : `${formatDayMonth(c.fromDate)} – ${formatDateAr(c.toDate)}`;

interface Totals {
  collected: number;
  expenses: number;
  net: number;
}

// المقبوض − المصروف = الصافي، مع التغير عن الأسبوع السابق إن مُرِّر
export const WeekTotals: React.FC<Totals & { previous?: Totals }> = ({ collected, expenses, net, previous }) => {
  const items: [string, string, string, number, number | undefined, boolean][] = [
    ['المقبوض', `+${num(collected)}`, 'text-[#15803d]', collected, previous?.collected, true],
    ['المصروف', `−${num(expenses)}`, 'text-[#b91c1c]', expenses, previous?.expenses, false],
    ['الصافي', num(net), net >= 0 ? 'text-slate-900' : 'text-[#b91c1c]', net, previous?.net, true],
  ];
  return (
    <div className="shrink-0 grid grid-cols-3 gap-3">
      {items.map(([title, value, color, cur, prev, goodWhenUp]) => (
        <div key={title} className="bg-white p-3 rounded-[4px] border border-slate-300 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">{title}</div>
          <div className={`mt-0.5 text-xl sm:text-2xl font-bold tabular-nums ${color}`}>
            <span dir="ltr">{value}</span> <span className="text-xs font-normal text-slate-500">₪</span>
          </div>
          {prev ? <Change change={((cur - prev) / Math.abs(prev)) * 100} goodWhenUp={goodWhenUp} /> : null}
        </div>
      ))}
    </div>
  );
};

// سهم + نسبة التغير عن الأسبوع السابق؛ الأخضر = تحسن
const Change: React.FC<{ change: number; goodWhenUp: boolean }> = ({ change, goodWhenUp }) => {
  if (Math.round(change) === 0) return <div className="mt-1 text-[11px] text-slate-500">بلا تغيير</div>;
  const up = change > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <div className="mt-1 text-[11px] text-slate-500 inline-flex items-center gap-1">
      <span className={`inline-flex items-center font-semibold ${up === goodWhenUp ? 'text-[#15803d]' : 'text-[#b91c1c]'}`}>
        <Icon className="w-3 h-3" />
        {pct(Math.abs(change))}
      </span>
      عن السابق
    </div>
  );
};

interface WeekLedgerTableProps {
  rows: LedgerRow[];
  onPrint?: (row: LedgerRow) => void;
  onDelete?: (row: LedgerRow) => void; // الأسبوع المفتوح فقط
}

// كشف حركات الأسبوع: قبض (+) وصرف (−) بالترتيب الزمني
export const WeekLedgerTable: React.FC<WeekLedgerTableProps> = ({ rows, onPrint, onDelete }) => {
  const th = 'py-2 px-3 border-l border-slate-200';
  const td = 'py-2 px-3 border-l border-slate-200';
  const hasActions = !!(onPrint || onDelete);

  return (
    <div className="min-h-0 overflow-auto bg-white rounded-[4px] border border-slate-300 shadow-2xs">
      <table className="w-full text-right text-xs sm:text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
          <tr>
            <th className={`${th} w-28`}>التاريخ</th>
            <th className={th}>البيان</th>
            <th className={`${th} text-center w-28`}>قبض</th>
            <th className={`${th} text-center w-28`}>صرف</th>
            {hasActions && <th className="py-2 px-3 w-20 no-print"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={hasActions ? 5 : 4} className="py-10 text-center text-slate-400">
                لا حركات
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const canPrint = onPrint && r.kind === 'in';
              return (
                <tr key={r.id}>
                  <td className={`${td} text-xs text-slate-600`}>{formatDayMonth(r.date)}</td>
                  <td className={td}>
                    <div className="font-bold text-slate-900">{r.title}</div>
                    {r.detail && <div className="text-xs text-slate-500 line-clamp-1">{shortPurpose(r.detail)}</div>}
                  </td>
                  <td className={`${td} text-center font-bold tabular-nums text-[#15803d]`}>
                    {r.kind === 'in' && <span dir="ltr">+{num(r.amount)}</span>}
                  </td>
                  <td className={`${td} text-center font-bold tabular-nums text-[#b91c1c]`}>
                    {r.kind === 'out' && <span dir="ltr">−{num(r.amount)}</span>}
                  </td>
                  {hasActions && (
                    <td className="py-2 px-3 no-print">
                      <div className="flex items-center justify-center gap-1">
                        {canPrint && (
                          <button
                            type="button"
                            onClick={() => onPrint(r)}
                            className="p-1 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            aria-label="طباعة السند"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(r)}
                            className="p-1 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            aria-label="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

// الأسابيع المُقفلة (الأحدث أولاً): شريط الصافي يغني عن رسم بياني، والمجموع في آخر سطر
export const WeeksTable: React.FC<{ closings: WeekClosing[]; onOpen: (c: WeekClosing) => void }> = ({
  closings,
  onOpen,
}) => {
  const th = 'py-2 px-3 border-l border-slate-200';
  const td = 'py-2 px-3 border-l border-slate-200';
  const maxNet = Math.max(0, ...closings.map((c) => Math.abs(c.net)));
  const sum = (key: 'collected' | 'expenses' | 'net') => closings.reduce((s, c) => s + c[key], 0);
  const total = sum('net');

  return (
    <div className="min-h-0 overflow-auto bg-white rounded-[4px] border border-slate-300 shadow-2xs">
      <table className="w-full text-right text-xs sm:text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
          <tr>
            <th className={`${th} w-14 text-center`}>رقم</th>
            <th className={th}>الأسبوع</th>
            <th className={`${th} text-center w-28`}>المقبوض</th>
            <th className={`${th} text-center w-28`}>المصروف</th>
            <th className="py-2 px-3 w-56">الصافي</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 tabular-nums">
          {closings.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-10 text-center text-slate-400">
                لا أسابيع
              </td>
            </tr>
          ) : (
            closings.map((c) => (
              <tr key={c.id} onClick={() => onOpen(c)} className="cursor-pointer hover:bg-amber-50/40">
                <td className={`${td} text-center font-bold`}>{plain(c.seq)}</td>
                <td className={`${td} font-semibold`}>{closingLabel(c)}</td>
                <td className={`${td} text-center text-[#15803d]`}>{num(c.collected)}</td>
                <td className={`${td} text-center text-[#b91c1c]`}>{num(c.expenses)}</td>
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-16 shrink-0 font-bold ${c.net >= 0 ? 'text-slate-900' : 'text-[#b91c1c]'}`}>
                      {num(c.net)}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${c.net >= 0 ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`}
                        style={{ width: `${maxNet ? (Math.abs(c.net) / maxNet) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        {closings.length > 1 && (
          <tfoot className="sticky bottom-0 bg-slate-50 font-bold border-t-2 border-slate-300 tabular-nums">
            <tr>
              <td className={td} colSpan={2}>
                المجموع
              </td>
              <td className={`${td} text-center text-[#15803d]`}>{num(sum('collected'))}</td>
              <td className={`${td} text-center text-[#b91c1c]`}>{num(sum('expenses'))}</td>
              <td className={`py-2 px-3 ${total >= 0 ? 'text-slate-900' : 'text-[#b91c1c]'}`}>{num(total)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};
