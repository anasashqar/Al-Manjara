import React, { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Lock } from 'lucide-react';
import { db, closeWeek, deleteExpense, deletePayment, reopenLastWeek } from '../../db/dexie';
import { printElementToA4 } from '../../utils/printHelper';
import { weekLedger, ledgerTotals, type LedgerRow } from '../../utils/finance';
import { formatDateAr } from '../../utils/period';
import { num, plain } from '../../utils/format';
import { OrderReceiptModal } from '../orders/OrderReceiptModal';
import { PinPromptModal } from '../security/StatsPin';
import { WeekTotals, WeekLedgerTable, closingLabel } from './WeekLedger';
import { WeekStats } from './WeekStats';
import { docNo } from '../../utils/docNumber';
import type { Order, Expense, PaymentTransaction, WorkshopSettings } from '../../types';
import { ask, notify } from '../common/Dialogs';

interface FinancialReportProps {
  orders: Order[];
  expenses: Expense[];
  settings: WorkshopSettings;
}

type View = 'week' | 'stats';
type PinAction = 'stats' | 'close' | 'reopen';

// المالية تبويبان فقط، ولا يظهر شيء في مكانين:
// "هذا الأسبوع" = الحركات منذ آخر إقفال، و"الإحصاءات" = الأسابيع المُقفلة وكشف كل منها.
// الإقفال يرحّل حركات الأسبوع إلى الإحصاءات ويبدأ حساب جديد من الصفر.
export const FinancialReport: React.FC<FinancialReportProps> = ({ orders, expenses, settings }) => {
  const payments = useLiveQuery(() => db.paymentTransactions.toArray(), []) || [];
  const closings = useLiveQuery(() => db.weekClosings.orderBy('seq').reverse().toArray(), []) || [];
  const [view, setView] = useState<View>('week');
  const [openClosingId, setOpenClosingId] = useState<string | null>(null);
  // الرمز يُطلب في كل مرة (الإحصاءات، الإقفال، التراجع عنه)
  const [pinFor, setPinFor] = useState<PinAction | null>(null);
  const [receipt, setReceipt] = useState<{ order: Order; payment: PaymentTransaction } | null>(null);
  // طباعة كشف الأسبوع بعد إقفاله مباشرة (تنتظر ظهوره في الإحصاءات)
  const [printPending, setPrintPending] = useState(false);

  const openRows = useMemo(() => weekLedger(payments, expenses), [payments, expenses]);
  const openTotals = ledgerTotals(openRows);

  const openClosing = closings.find((c) => c.id === openClosingId) ?? null;

  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const withPin = (action: PinAction, run: () => void) => (settings.statsPinHash ? setPinFor(action) : run());

  const openView = (v: View) => {
    if (v === view) return;
    setOpenClosingId(null);
    if (v === 'stats') return withPin('stats', () => setView('stats'));
    setView(v);
  };

  const doClose = async () => {
    const ok = await ask('إقفال الأسبوع؟', {
      message: `الصافي ${num(openTotals.net)} ₪`,
      confirmLabel: 'إقفال',
      danger: false,
    });
    if (!ok) return;
    try {
      const closing = await closeWeek();
      const wantPrint = await ask(`تم إقفال الأسبوع ${plain(closing.seq)}. طباعة الكشف؟`, {
        confirmLabel: 'طباعة',
        danger: false,
      });
      if (!wantPrint) return;
      setOpenClosingId(closing.id);
      setView('stats');
      setPrintPending(true);
    } catch (err: any) {
      notify(err?.message || 'تعذر الإقفال');
    }
  };

  const doReopen = async () => {
    if (!openClosing) return;
    const ok = await ask(`إلغاء إقفال الأسبوع ${plain(openClosing.seq)}؟`, {
      confirmLabel: 'إلغاء الإقفال',
    });
    if (!ok) return;
    await reopenLastWeek();
    setOpenClosingId(null);
  };

  const runPinAction = (action: PinAction) => {
    if (action === 'stats') setView('stats');
    if (action === 'close') doClose();
    if (action === 'reopen') doReopen();
  };

  const handleDelete = async (r: LedgerRow) => {
    const ok = r.payment
      ? await ask(`حذف السند رقم ${docNo(r.payment.receiptNumber)}؟`)
      : await ask('حذف المصروف؟', {
          message: r.expense?.linkedPaymentId ? 'يُحذف معه سند الصرف' : r.title,
        });
    if (!ok) return;
    try {
      if (r.payment) await deletePayment(r.payment.id);
      else if (r.expense) await deleteExpense(r.expense.id);
    } catch (err: any) {
      notify(err?.message || 'تعذر الحذف');
    }
  };

  const openPrint = (r: LedgerRow) => {
    const order = r.payment && ordersById.get(r.payment.relatedId);
    if (order && r.payment) setReceipt({ order, payment: r.payment });
  };

  const printTitle =
    view === 'week'
      ? 'حساب الأسبوع'
      : openClosing
        ? `الأسبوع ${plain(openClosing.seq)} (${closingLabel(openClosing)})`
        : 'الأسابيع';

  const print = () => printElementToA4('printable-financial-report', printTitle.replace(/\s+/g, '_'));

  useEffect(() => {
    if (!printPending || view !== 'stats' || !openClosing) return;
    setPrintPending(false);
    print();
  }, [printPending, view, openClosing]);

  const tabs: [View, string][] = [
    ['week', 'هذا الأسبوع'],
    ['stats', 'الإحصاءات'],
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 max-w-6xl w-full mx-auto">
      <div className="shrink-0 flex flex-wrap justify-between items-center gap-2 bg-white px-3.5 py-2.5 rounded-[4px] border border-slate-300 shadow-2xs">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base font-display">المالية</h2>
          <div className="inline-flex p-0.5 bg-slate-100 rounded-[6px] no-print" role="tablist">
            {tabs.map(([id, text]) => (
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
          {view === 'week' && (
            <button
              type="button"
              onClick={() => withPin('close', doClose)}
              disabled={openRows.length === 0}
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-[6px] bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs sm:text-sm font-semibold disabled:opacity-40"
            >
              <Lock className="w-4 h-4" />
              <span>إقفال الأسبوع</span>
            </button>
          )}
          <button
            type="button"
            onClick={print}
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
          <div className="text-sm font-bold">{printTitle}</div>
        </div>

        {view === 'week' && (
          <>
            <WeekTotals {...openTotals} />
            {openRows.length > 0 && (
              <div className="shrink-0 -mb-1 text-xs text-slate-500">
                منذ {formatDateAr(openRows[0].date)}
              </div>
            )}
            <WeekLedgerTable rows={openRows} onPrint={openPrint} onDelete={handleDelete} />
          </>
        )}

        {view === 'stats' && (
          <WeekStats
            orders={orders}
            expenses={expenses}
            payments={payments}
            closings={closings}
            openId={openClosingId}
            onOpen={setOpenClosingId}
            onReopen={() => withPin('reopen', doReopen)}
            onPrintReceipt={openPrint}
          />
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
      <PinPromptModal
        isOpen={!!pinFor}
        title={pinFor === 'stats' ? 'الإحصاءات' : pinFor === 'close' ? 'إقفال الأسبوع' : 'إلغاء الإقفال'}
        pinHash={settings.statsPinHash}
        onClose={() => setPinFor(null)}
        onUnlock={() => {
          const action = pinFor;
          setPinFor(null);
          if (action) runPinAction(action);
        }}
      />
    </div>
  );
};
