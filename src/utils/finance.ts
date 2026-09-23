import type { Expense, ExpenseCategory, Order, PaymentTransaction, SupplierDebt } from '../types';
import { inPeriod, monthKey, type Period } from './period';

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

export interface PeriodSummary {
  newOrdersCount: number;
  newOrdersValue: number;    // قيمة الطلبيات المسجلة في الفترة (غير الملغاة)
  collected: number;         // المقبوض فعلياً من الزبائن في الفترة
  receiptsCount: number;
  discounts: number;         // الخصومات الممنوحة في الفترة
  expenses: number;          // المصروفات المدفوعة في الفترة (تشمل سداد الموردين)
  net: number;               // صافي الربح النقدي = المقبوضات - المصروفات
  margin: number | null;     // نسبة الربح من المقبوضات
  supplierPaid: number;      // منها: المدفوع للموردين
  // أرصدة حالية (لا تخص فترة: الدين قائم حتى يُسدَّد)
  openReceivables: number;
  openReceivablesCount: number;
  supplierPayables: number;
  byMethod: { name: string; amount: number }[];
  byCategory: { category: ExpenseCategory; label: string; amount: number }[];
}

export function summarizePeriod(
  period: Period,
  orders: Order[],
  payments: PaymentTransaction[],
  expenses: Expense[],
  suppliers: SupplierDebt[]
): PeriodSummary {
  const periodOrders = orders.filter((o) => isActiveOrder(o) && inPeriod(o.orderDate, period));
  const receipts = payments.filter((p) => p.type === 'customer_in' && inPeriod(p.date, period));
  const periodExpenses = expenses.filter((e) => inPeriod(e.date, period));
  const receivables = orders.filter(isReceivable);

  const collected = round2(receipts.reduce((s, p) => s + p.amount, 0));
  const expenseTotal = round2(periodExpenses.reduce((s, e) => s + e.amount, 0));
  const net = round2(collected - expenseTotal);

  const methodTotals = new Map<string, number>();
  for (const p of receipts) {
    methodTotals.set(p.paymentMethod, (methodTotals.get(p.paymentMethod) || 0) + p.amount);
  }

  const categoryTotals = new Map<ExpenseCategory, number>();
  for (const e of periodExpenses) {
    categoryTotals.set(e.category, (categoryTotals.get(e.category) || 0) + e.amount);
  }

  return {
    newOrdersCount: periodOrders.length,
    newOrdersValue: round2(periodOrders.reduce((s, o) => s + o.totalAmount, 0)),
    collected,
    receiptsCount: receipts.length,
    discounts: round2(receipts.reduce((s, p) => s + (p.discountAmount || 0), 0)),
    expenses: expenseTotal,
    net,
    margin: collected > 0 ? Math.round((net / collected) * 100) : null,
    supplierPaid: round2(periodExpenses.filter((e) => e.linkedPaymentId).reduce((s, e) => s + e.amount, 0)),
    openReceivables: round2(receivables.reduce((s, o) => s + o.remainingAmount, 0)),
    openReceivablesCount: receivables.length,
    supplierPayables: round2(suppliers.reduce((s, x) => s + x.remainingDebt, 0)),
    byMethod: [...methodTotals]
      .map(([name, amount]) => ({ name, amount: round2(amount) }))
      .sort((a, b) => b.amount - a.amount),
    byCategory: [...categoryTotals]
      .map(([category, amount]) => ({
        category,
        label: EXPENSE_CATEGORY_LABELS[category] || category,
        amount: round2(amount),
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export interface BreakdownRow {
  key: string;       // YYYY-MM أو YYYY
  year: number;
  month: number | null;
  ordersValue: number;
  collected: number;
  expenses: number;
  net: number;
}

/**
 * تفصيل الأرقام: 12 شهراً إذا كانت الفترة سنة كاملة،
 * أو سنة بسنة إذا كانت الفترة "كل الفترات".
 */
export function periodBreakdown(
  period: Period,
  orders: Order[],
  payments: PaymentTransaction[],
  expenses: Expense[]
): BreakdownRow[] {
  const byYear = period.year === null;
  const keyOf = (date: string) => (byYear ? date.slice(0, 4) : monthKey(date));
  const rows = new Map<string, BreakdownRow>();

  const row = (key: string): BreakdownRow => {
    let r = rows.get(key);
    if (!r) {
      r = {
        key,
        year: parseInt(key.slice(0, 4), 10),
        month: byYear ? null : parseInt(key.slice(5, 7), 10),
        ordersValue: 0,
        collected: 0,
        expenses: 0,
        net: 0,
      };
      rows.set(key, r);
    }
    return r;
  };

  // أشهر السنة حتى الشهر الحالي فقط (لا أعمدة فارغة لأشهر لم تأتِ بعد)
  if (!byYear) {
    const now = new Date();
    const lastMonth =
      period.year! < now.getFullYear() ? 12 : period.year === now.getFullYear() ? now.getMonth() + 1 : 0;
    for (let m = 1; m <= lastMonth; m++) row(`${period.year}-${String(m).padStart(2, '0')}`);
  }

  const scope: Period = { year: period.year, month: null };
  for (const o of orders) {
    if (isActiveOrder(o) && o.orderDate && inPeriod(o.orderDate, scope)) row(keyOf(o.orderDate)).ordersValue += o.totalAmount;
  }
  for (const p of payments) {
    if (p.type === 'customer_in' && p.date && inPeriod(p.date, scope)) row(keyOf(p.date)).collected += p.amount;
  }
  for (const e of expenses) {
    if (e.date && inPeriod(e.date, scope)) row(keyOf(e.date)).expenses += e.amount;
  }

  return [...rows.values()]
    .map((r) => ({
      ...r,
      ordersValue: round2(r.ordersValue),
      collected: round2(r.collected),
      expenses: round2(r.expenses),
      net: round2(r.collected - r.expenses),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
