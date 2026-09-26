import type { Expense, ExpenseCategory, Order, PaymentTransaction, SupplierDebt } from '../types';

// طلبية بالانتظار لم يُدفع عليها شيء = استفسار، ليست بيعاً ولا ديناً بعد
export const isUnconfirmedWaiting = (o: Order) =>
  o.workStage === 'waiting' && (o.paidAmount || 0) + (o.discountTotal || 0) <= 0;

// الطلبية الملغاة أو المنتظرة بلا دفع لا تُحسب ضمن المبيعات ولا الديون المستحقة
export const isActiveOrder = (o: Order) => o.status !== 'cancelled' && !isUnconfirmedWaiting(o);

// الطلبية منتهية: مُعلَّمة مكتملة، أو جاهزة ومدفوعة بالكامل
export const isOrderDone = (o: Order) =>
  o.status === 'completed' ||
  o.status === 'delivered' ||
  o.status === 'ready' ||
  (o.workStage === 'ready_deliver' && o.totalAmount > 0 && o.remainingAmount <= 0);

// طلبية عليها مبلغ مستحق فعلاً للتحصيل
export const isReceivable = (o: Order) => isActiveOrder(o) && o.remainingAmount > 0;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  raw_materials: 'أخشاب وألواح',
  hardware: 'إكسسوارات ومفصلات',
  finishes: 'دهانات وغراء',
  wages: 'أجور عمال',
  workshop: 'إيجار وكهرباء',
  tools: 'صيانة عدد',
  transport: 'نقل وشحن',
  general: 'نثريات',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// نفس الزبون: بالهاتف إن وُجد، وإلا بالاسم
export const customerKey = (o: Pick<Order, 'customerName' | 'customerPhone'>) =>
  o.customerPhone?.trim() || o.customerName.trim();

// ───────── حساب الأسبوع (من آخر إقفال) ─────────

export interface LedgerRow {
  id: string;
  kind: 'in' | 'out';
  date: string;
  title: string;
  detail?: string;
  amount: number;
  createdAt: number;
  payment?: PaymentTransaction;
  expense?: Expense;
}

/**
 * حركات أسبوع واحد: المقبوض من الزبائن (+) والمصروفات (−) بالترتيب الزمني.
 * closingId فارغ = الأسبوع المفتوح. سند صرف المورد له مصروف مرتبط فلا يُعدّ مرتين.
 */
export function weekLedger(payments: PaymentTransaction[], expenses: Expense[], closingId?: string): LedgerRow[] {
  const inWeek = (x: { closingId?: string }) => (x.closingId || undefined) === closingId;
  const rows: LedgerRow[] = [
    ...payments
      .filter((p) => p.type === 'customer_in' && p.amount > 0 && inWeek(p))
      .map((p) => ({
        id: p.id,
        kind: 'in' as const,
        date: p.date,
        title: p.partyName,
        detail: p.itemPurpose,
        amount: p.amount,
        createdAt: p.createdAt,
        payment: p,
      })),
    ...expenses.filter(inWeek).map((e) => ({
      id: e.id,
      kind: 'out' as const,
      date: e.date,
      title: e.title,
      amount: e.amount,
      createdAt: e.createdAt,
      expense: e,
    })),
  ];
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

export function ledgerTotals(rows: LedgerRow[]) {
  const collected = round2(rows.filter((r) => r.kind === 'in').reduce((s, r) => s + r.amount, 0));
  const expenses = round2(rows.filter((r) => r.kind === 'out').reduce((s, r) => s + r.amount, 0));
  return { collected, expenses, net: round2(collected - expenses) };
}

// تجميع مبالغ حسب مفتاح (بيان المصروف، وسيلة القبض...) من الأكبر للأصغر
export function groupTotals(rows: LedgerRow[], keyOf: (r: LedgerRow) => string) {
  const totals = new Map<string, number>();
  for (const r of rows) {
    const key = keyOf(r).trim() || '—';
    totals.set(key, (totals.get(key) || 0) + r.amount);
  }
  return [...totals]
    .map(([label, amount]) => ({ label, amount: round2(amount) }))
    .sort((a, b) => b.amount - a.amount);
}
