import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { groupTotals, isReceivable, weekLedger, type LedgerRow } from '../../utils/finance';
import { num, plain } from '../../utils/format';
import { WeekTotals, WeekLedgerTable, WeeksTable, closingLabel } from './WeekLedger';
import type { Order, Expense, PaymentTransaction, WeekClosing } from '../../types';

interface WeekStatsProps {
  orders: Order[];
  expenses: Expense[];
  payments: PaymentTransaction[];
  closings: WeekClosing[]; // الأحدث أولاً
  openId: string | null;
  onOpen: (closingId: string | null) => void;
  onReopen: () => void;
  onPrintReceipt: (row: LedgerRow) => void;
}

// الإحصاءات = الأسابيع المُقفلة: قائمة بها، والضغط على أسبوع يفتح كشفه.
// الأسبوع المفتوح لا يظهر هنا؛ مكانه تبويب "هذا الأسبوع"
export const WeekStats: React.FC<WeekStatsProps> = ({
  orders,
  expenses,
  payments,
  closings,
  openId,
  onOpen,
  onReopen,
  onPrintReceipt,
}) => {
  const index = closings.findIndex((c) => c.id === openId);
  const week = index >= 0 ? closings[index] : null;
  const previous = index >= 0 ? closings[index + 1] : undefined;

  const rows = useMemo(() => (week ? weekLedger(payments, expenses, week.id) : []), [payments, expenses, week]);

  if (!week) {
    const receivables = orders.filter(isReceivable);
    const due = receivables.reduce((s, o) => s + o.remainingAmount, 0);
    return (
      <>
        {receivables.length > 0 && (
          <div className="shrink-0 -mb-1 text-xs text-slate-600">
            ديون الزبائن: <span className="font-bold text-[#b91c1c]">{num(due)} ₪</span>
          </div>
        )}
        <WeeksTable closings={closings} onOpen={(c) => onOpen(c.id)} />
      </>
    );
  }

  const byMethod = groupTotals(rows.filter((r) => r.kind === 'in'), (r) => r.payment?.paymentMethod || '');

  return (
    <>
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 no-print">
        <button
          type="button"
          onClick={() => onOpen(null)}
          className="h-8 inline-flex items-center gap-1 px-2.5 rounded-[6px] text-slate-700 hover:bg-slate-200/60 text-xs sm:text-sm font-semibold"
        >
          <ChevronRight className="w-4 h-4" />
          الأسبوع {plain(week.seq)} · {closingLabel(week)}
        </button>
        {index === 0 && (
          <button
            type="button"
            onClick={onReopen}
            className="h-8 px-3 rounded-[6px] border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium"
          >
            إلغاء الإقفال
          </button>
        )}
      </div>
      <WeekTotals collected={week.collected} expenses={week.expenses} net={week.net} previous={previous} />
      {byMethod.length > 1 && (
        <div className="shrink-0 -mb-1 text-xs text-slate-600">
          المقبوض:{' '}
          {byMethod.map((m, i) => (
            <span key={m.label}>
              {i > 0 && ' · '}
              {m.label} <span className="font-bold tabular-nums">{num(m.amount)}</span>
            </span>
          ))}
        </div>
      )}
      <WeekLedgerTable rows={rows} onPrint={onPrintReceipt} />
    </>
  );
};
