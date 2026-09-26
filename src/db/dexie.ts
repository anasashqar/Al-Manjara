import Dexie, { type Table, type Transaction } from 'dexie';
import type {
  Order,
  Expense,
  SupplierDebt,
  SupplierInvoice,
  PaymentTransaction,
  WorkshopSettings,
  PaymentMethodItem,
  ExpenseCategory,
  WorkshopNeed,
  WeekClosing
} from '../types';
import { ledgerTotals, weekLedger } from '../utils/finance';
import { todayISO } from '../utils/date';
import { hashPin, isValidPin, verifyRecoveryWord } from '../utils/pin';
import {
  compareDocs,
  counterKey,
  formatDocNumber,
  maxDocSeq,
  parseDocNumber,
  type DocKind,
  docNo,
} from '../utils/docNumber';

export class AlManjaraDatabase extends Dexie {
  orders!: Table<Order, string>;
  expenses!: Table<Expense, string>;
  supplierDebts!: Table<SupplierDebt, string>;
  supplierInvoices!: Table<SupplierInvoice, string>;
  paymentTransactions!: Table<PaymentTransaction, string>;
  paymentMethods!: Table<PaymentMethodItem, string>;
  settings!: Table<WorkshopSettings, string>;
  workshopNeeds!: Table<WorkshopNeed, string>;
  weekClosings!: Table<WeekClosing, string>;

  constructor() {
    super('AlManjaraDB');
    this.version(2).stores({
      orders: 'id, orderNumber, customerName, customerPhone, category, status, orderDate, deliveryDate, remainingAmount, createdAt',
      expenses: 'id, expenseNumber, title, category, amount, date, paymentMethod, createdAt',
      supplierDebts: 'id, supplierName, phone, remainingDebt, updatedAt',
      paymentTransactions: 'id, receiptNumber, type, relatedId, partyName, date, createdAt',
      paymentMethods: 'id, name, type, isActive',
      settings: 'id'
    });
    // v3: جعل سجل الدفعات هو المرجع الوحيد لأرصدة الطلبيات
    this.version(3)
      .stores({
        expenses: 'id, expenseNumber, title, category, amount, date, paymentMethod, linkedPaymentId, createdAt',
      })
      .upgrade(async (tx) => {
        await reconcileTables(tx.table('orders'), tx.table('paymentTransactions'));
      });
    // v4: دفتر الموردين (فواتير شراء آجلة + سندات صرف) بدل الأرصدة اليدوية
    this.version(4)
      .stores({
        supplierInvoices: 'id, supplierId, date, createdAt',
      })
      .upgrade(async (tx) => {
        await reconcileSupplierTables(
          tx.table('supplierDebts'),
          tx.table('supplierInvoices'),
          tx.table('paymentTransactions')
        );
      });
    // v5/v6: ترقيم موحد مبسط لكل المستندات (ق/ص/ط/م/ف/ر-رقم). v6 يحوّل من صيغة v5 السابقة
    const normalizeUpgrade = async (tx: Transaction) => {
      await normalizeDocNumbers({
        orders: tx.table('orders'),
        expenses: tx.table('expenses'),
        payments: tx.table('paymentTransactions'),
        invoices: tx.table('supplierInvoices'),
        settings: tx.table('settings'),
      });
    };
    this.version(5).stores({}).upgrade(normalizeUpgrade);
    this.version(6).stores({}).upgrade(normalizeUpgrade);
    // v7: احتياجات المنجرة
    this.version(7).stores({ workshopNeeds: 'id, isDone, addedAt' });
    // v8: الانتظار صار مرحلة بدل حالة، وأُلغيت مرحلة "قارب الانتهاء"
    this.version(8).stores({}).upgrade(async (tx) => {
      await tx.table('orders').toCollection().modify((o: any) => {
        if (o.status === 'waiting') {
          o.status = 'in_progress';
          o.workStage = 'waiting';
        }
        if (o.workStage === 'ready_install') o.workStage = 'finishing';
      });
    });
    // v9: إقفال الأسبوع
    this.version(9).stores({ weekClosings: 'id, seq, closedAt' });
  }
}

export const db = new AlManjaraDatabase();

// Default Palestinian Workshop Settings
export const DEFAULT_SETTINGS: WorkshopSettings = {
  id: 'current_workshop',
  workshopName: 'منجرة الإتقان',
  managerName: 'أبو أحمد',
  phone: '0599123456',
  address: 'دير البلح - البركة',
  currency: 'شيكل',
  receiptFooter: 'شكراً لثقتكم',
  supabaseUrl: '',
  supabaseAnonKey: '',
  autoSync: false,
};

// Default Palestinian Payment Methods
export const DEFAULT_PAYMENT_METHODS: PaymentMethodItem[] = [
  { id: 'pm-1', name: 'نقداً', type: 'cash', isActive: true },
  { id: 'pm-2', name: 'بنك فلسطين', type: 'bank', isActive: true },
  { id: 'pm-3', name: 'محفظة بال بي', type: 'wallet', isActive: true },
  { id: 'pm-4', name: 'محفظة جوال بي', type: 'wallet', isActive: true },
];

// هامش لمقارنة المبالغ العشرية
const EPS = 0.005;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getWorkshopSettings(): Promise<WorkshopSettings> {
  const current = await db.settings.get('current_workshop');
  if (!current) {
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return current;
}

export async function updateWorkshopSettings(settings: Partial<WorkshopSettings>): Promise<void> {
  const current = await getWorkshopSettings();
  // الرمز والعدادات لا تتغير من نموذج الإعدادات العام (قد يحمل نسخة قديمة منها)
  const { statsPinHash: _pin, receiptCounters: _counters, ...rest } = settings;
  await db.settings.put({ ...current, ...rest, id: 'current_workshop' });
}

// تعيين رمز الإحصاءات أو إزالته (null)؛ التغيير والإزالة يتطلبان الرمز الحالي
// تعيين رمز الحماية أو إزالته (null). يُستدعى من الإعدادات، وهي نفسها محمية بالرمز
export async function setStatsPin(newPin: string | null): Promise<void> {
  if (newPin !== null && !isValidPin(newPin)) throw new Error('الرمز 4 أرقام');
  await getWorkshopSettings();
  await db.settings.update('current_workshop', { statsPinHash: newPin === null ? undefined : hashPin(newPin) });
}

// عند نسيان الرمز: كلمة الاستعادة تسمح بتعيين رمز جديد
export async function resetPinWithRecovery(word: string, newPin: string): Promise<void> {
  if (!verifyRecoveryWord(word)) throw new Error('كلمة الاستعادة خاطئة');
  await setStatsPin(newPin);
}

export async function resetPaymentMethodsToDefault(): Promise<void> {
  await db.paymentMethods.clear();
  await db.paymentMethods.bulkAdd(DEFAULT_PAYMENT_METHODS);
}

// ───────────────────────── الترقيم الموحد ─────────────────────────
// كل المستندات بصيغة واحدة مبسطة: حرف + رقم متسلسل مستمر (ق-15، ص-7، ط-23...).
// آخر رقم صادر يُحفظ في الإعدادات حتى لا يتكرر رقم مستند محذوف أو ملغى.

function numbersOf(kind: DocKind): Promise<string[]> {
  switch (kind) {
    case 'O':
      return db.orders.toArray((os) => os.map((o) => o.orderNumber));
    case 'E':
      return db.expenses.toArray((es) => es.map((e) => e.expenseNumber));
    case 'I':
      return db.supplierInvoices.toArray((is) => is.map((i) => i.invoiceNumber || ''));
    default:
      return db.paymentTransactions.toArray((ts) => ts.map((t) => t.receiptNumber));
  }
}

async function nextDocSeq(kind: DocKind): Promise<number> {
  const numbers = await numbersOf(kind);
  const settings = await db.settings.get('current_workshop');
  const issued = settings?.receiptCounters?.[counterKey(kind)] ?? 0;
  return Math.max(maxDocSeq(numbers, kind), issued) + 1;
}

// معاينة الرقم التالي دون حجزه (للعرض في النماذج)
export async function peekDocNumber(kind: DocKind): Promise<string> {
  return formatDocNumber(kind, await nextDocSeq(kind));
}

// يحجز الرقم فعلياً؛ يجب استدعاؤه داخل معاملة تشمل جدول المستند و settings
async function claimDocNumber(kind: DocKind): Promise<string> {
  const seq = await nextDocSeq(kind);
  const settings = (await db.settings.get('current_workshop')) || DEFAULT_SETTINGS;
  await db.settings.put({
    ...settings,
    receiptCounters: { ...settings.receiptCounters, [counterKey(kind)]: seq },
  });
  return formatDocNumber(kind, seq);
}

export const getNextReceiptNumber = (kind: 'R' | 'P' = 'R') => peekDocNumber(kind);
export const getNextOrderNumber = () => peekDocNumber('O');
export const getNextExpenseNumber = () => peekDocNumber('E');
export const getNextInvoiceNumber = () => peekDocNumber('I');

const isOpeningEntry = (t: PaymentTransaction) =>
  t.id.startsWith('PAY-OPEN') || t.id.startsWith('SUPPAY-OPEN') || !t.receiptNumber || t.receiptNumber.startsWith('رصيد');

const kindOfPayment = (t: PaymentTransaction): DocKind =>
  isOpeningEntry(t) ? 'OB' : t.type === 'customer_in' ? 'R' : 'P';

/**
 * يحوّل الأرقام القديمة (ص-201 للمصروف، W-2026/1001، S-...، FAT-...، R-2026-0001، رصيد-سابق/...) إلى الصيغة الموحدة
 * بالترتيب الزمني، ويحدّث الإشارات إليها في نصوص البيان والملاحظات. لا يلمس الأرقام الصحيحة أصلاً.
 */
async function normalizeDocNumbers(t: {
  orders: Table<Order, string>;
  expenses: Table<Expense, string>;
  payments: Table<PaymentTransaction, string>;
  invoices: Table<SupplierInvoice, string>;
  settings: Table<WorkshopSettings, string>;
}): Promise<void> {
  type Item = { kind: DocKind; number: string; date: string; createdAt: number; apply: (n: string) => Promise<unknown> };
  const [orders, expenses, payments, invoices] = await Promise.all([
    t.orders.toArray(),
    t.expenses.toArray(),
    t.payments.toArray(),
    t.invoices.toArray(),
  ]);

  const items: Item[] = [
    ...orders.map((o) => ({ kind: 'O' as DocKind, number: o.orderNumber, date: o.orderDate, createdAt: o.createdAt, apply: (n: string) => t.orders.update(o.id, { orderNumber: n }) })),
    ...expenses.map((e) => ({ kind: 'E' as DocKind, number: e.expenseNumber, date: e.date, createdAt: e.createdAt, apply: (n: string) => t.expenses.update(e.id, { expenseNumber: n }) })),
    ...payments.map((p) => ({ kind: kindOfPayment(p), number: p.receiptNumber, date: p.date, createdAt: p.createdAt, apply: (n: string) => t.payments.update(p.id, { receiptNumber: n }) })),
    ...invoices.map((i) => ({ kind: 'I' as DocKind, number: i.invoiceNumber || '', date: i.date, createdAt: i.createdAt, apply: (n: string) => t.invoices.update(i.id, { invoiceNumber: n }) })),
  ];

  const settings = await t.settings.get('current_workshop');
  const counters: Record<string, number> = { ...(settings?.receiptCounters ?? {}) };
  const bump = (key: string, seq: number) => (counters[key] = Math.max(counters[key] ?? 0, seq));

  const pending: Item[] = [];
  for (const item of items) {
    const parsed = parseDocNumber(item.number);
    if (parsed && parsed.kind === item.kind) bump(counterKey(parsed.kind), parsed.seq);
    else pending.push(item);
  }
  if (!pending.length) return;

  pending.sort((a, b) => compareDocs(a.date, String(a.createdAt).padStart(15, '0'), b.date, String(b.createdAt).padStart(15, '0')));
  const renames: [string, string][] = [];
  for (const item of pending) {
    const key = counterKey(item.kind);
    const seq = (counters[key] ?? 0) + 1;
    bump(key, seq);
    const next = formatDocNumber(item.kind, seq);
    if (item.number) renames.push([item.number, next]);
    await item.apply(next);
  }

  // تحديث الإشارات للأرقام القديمة داخل النصوص (الأطول أولاً حتى لا يُستبدل جزء من رقم أطول)
  renames.sort((a, b) => b[0].length - a[0].length);
  const rewrite = (text: string | undefined) =>
    text ? renames.reduce((s, [from, to]) => (s.includes(from) ? s.split(from).join(to) : s), text) : text;
  for (const p of await t.payments.toArray()) {
    const itemPurpose = rewrite(p.itemPurpose) ?? p.itemPurpose;
    const notes = rewrite(p.notes);
    if (itemPurpose !== p.itemPurpose || notes !== p.notes) await t.payments.update(p.id, { itemPurpose, notes });
  }
  for (const e of await t.expenses.toArray()) {
    const title = rewrite(e.title) ?? e.title;
    const notes = rewrite(e.notes);
    if (title !== e.title || notes !== e.notes) await t.expenses.update(e.id, { title, notes });
  }

  if (settings) await t.settings.update('current_workshop', { receiptCounters: counters });
}

// ───────────────────────── أرصدة الطلبيات ─────────────────────────

// يحسب رصيد الطلبية من سجل دفعاتها (المرجع الوحيد للمسدد والخصم)
function computeBalance(totalAmount: number, txs: PaymentTransaction[]) {
  let paid = 0;
  let discount = 0;
  for (const t of txs) {
    if (t.type !== 'customer_in') continue;
    paid += Number(t.amount) || 0;
    discount += Number(t.discountAmount) || 0;
  }
  paid = round2(paid);
  discount = round2(discount);
  return {
    paidAmount: paid,
    discountTotal: discount,
    remainingAmount: Math.max(0, round2(Number(totalAmount) - paid - discount)),
  };
}

async function recalcOrder(orderId: string): Promise<Order> {
  const order = await db.orders.get(orderId);
  if (!order) throw new Error('الطلبية غير موجودة');
  const txs = await db.paymentTransactions.where('relatedId').equals(orderId).toArray();
  const balance = computeBalance(order.totalAmount, txs);
  await db.orders.update(orderId, { ...balance, updatedAt: Date.now() });
  return { ...order, ...balance };
}

/**
 * يربط أرصدة الطلبيات القديمة بسجل الدفعات:
 * إذا كان المسدد المسجل على الطلبية أكبر من مجموع سنداتها (بيانات أُدخلت يدوياً سابقاً)
 * يُضاف قيد "رصيد مدفوع سابقاً" بالفرق، ثم يُعاد حساب كل الأرصدة من السجل.
 */
async function reconcileTables(
  orders: Table<Order, string>,
  payments: Table<PaymentTransaction, string>
): Promise<void> {
  const allOrders = await orders.toArray();
  const allTxs = await payments.toArray();
  for (const order of allOrders) {
    const txs = allTxs.filter((t) => t.type === 'customer_in' && t.relatedId === order.id);
    const ledgerPaid = txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const gap = round2((Number(order.paidAmount) || 0) - ledgerPaid);
    if (gap > EPS) {
      const opening: PaymentTransaction = {
        id: uid('PAY-OPEN'),
        receiptNumber: `رصيد-سابق/${order.orderNumber}`,
        type: 'customer_in',
        relatedId: order.id,
        partyName: order.customerName,
        itemPurpose: `رصيد مدفوع سابقاً للطلبية ${order.orderNumber}`,
        amount: gap,
        discountAmount: 0,
        date: order.orderDate,
        paymentMethod: 'غير محدد',
        notes: 'قيد تسوية تلقائي لمبالغ سُجلت قبل اعتماد سجل الدفعات',
        createdAt: order.createdAt || Date.now(),
      };
      await payments.add(opening);
      txs.push(opening);
    }
    const balance = computeBalance(order.totalAmount, txs);
    await orders.update(order.id, balance);
  }
}

// يعيد ربط أرصدة الطلبيات والموردين بسجلاتها (بعد الاستيراد أو حقن العينات)
export async function reconcileLedger(): Promise<void> {
  await db.transaction(
    'rw',
    [db.orders, db.expenses, db.paymentTransactions, db.supplierDebts, db.supplierInvoices, db.settings],
    async () => {
      await reconcileTables(db.orders, db.paymentTransactions);
      await reconcileSupplierTables(db.supplierDebts, db.supplierInvoices, db.paymentTransactions);
      await normalizeDocNumbers({
        orders: db.orders,
        expenses: db.expenses,
        payments: db.paymentTransactions,
        invoices: db.supplierInvoices,
        settings: db.settings,
      });
    }
  );
}

// ───────────────────────── الطلبيات ─────────────────────────

// الحقول المالية المشتقة لا تُقبل من النماذج
type OrderInput = Omit<
  Partial<Order>,
  'id' | 'orderNumber' | 'paidAmount' | 'remainingAmount' | 'discountTotal' | 'createdAt' | 'updatedAt'
>;

export interface InitialDeposit {
  amount: number;
  paymentMethod: string;
}

export async function createOrder(
  data: OrderInput,
  deposit?: InitialDeposit
): Promise<{ order: Order; payment?: PaymentTransaction }> {
  // طلبية بالانتظار قد لا يكون سعرها محدداً بعد
  const isWaiting = (data.workStage || 'waiting') === 'waiting';
  const totalAmount = round2(Number(data.totalAmount) || 0);
  if (totalAmount <= 0 && !isWaiting) throw new Error('أدخل المبلغ');
  const depositAmount = isWaiting ? 0 : round2(Number(deposit?.amount) || 0);
  if (depositAmount < 0) throw new Error('عربون غير صالح');
  if (depositAmount > totalAmount + EPS) throw new Error('العربون أكبر من المبلغ');

  return db.transaction('rw', [db.orders, db.paymentTransactions, db.settings], async () => {
    const now = Date.now();
    const today = todayISO();
    const order: Order = {
      id: uid('ord'),
      orderNumber: await claimDocNumber('O'),
      customerName: data.customerName?.trim() || '',
      customerPhone: data.customerPhone?.trim() || '',
      category: data.category || 'custom',
      description: data.description?.trim() || '',
      woodType: data.woodType || 'حسب الاتفاق',
      dimensions: data.dimensions,
      totalAmount,
      paidAmount: 0,
      discountTotal: 0,
      remainingAmount: totalAmount,
      status: data.status || 'new',
      workStage: data.workStage || 'waiting',
      orderDate: data.orderDate || today,
      deliveryDate: data.deliveryDate || today,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
    await db.orders.add(order);

    if (depositAmount > 0) {
      const payment = await insertCustomerPayment(order, {
        amount: depositAmount,
        paymentMethod: deposit!.paymentMethod,
        itemPurpose: 'عربون',
        date: order.orderDate,
      });
      return { order: await recalcOrder(order.id), payment };
    }
    return { order };
  });
}

export async function updateOrder(orderId: string, data: OrderInput): Promise<Order> {
  return db.transaction('rw', db.orders, db.paymentTransactions, async () => {
    const order = await db.orders.get(orderId);
    if (!order) throw new Error('الطلبية غير موجودة');

    const changes: Partial<Order> = { ...data };
    // حماية من تمرير الحقول المشتقة بالخطأ
    delete changes.paidAmount;
    delete changes.remainingAmount;
    delete changes.discountTotal;

    if (changes.totalAmount !== undefined) {
      const newTotal = round2(Number(changes.totalAmount) || 0);
      const settled = round2(order.paidAmount + (order.discountTotal || 0));
      const staysWaiting = (changes.workStage ?? order.workStage) === 'waiting';
      if (newTotal <= 0 && !staysWaiting) throw new Error('أدخل المبلغ');
      if (newTotal + EPS < settled) {
        throw new Error(
          `المبلغ أقل من المدفوع (${settled.toLocaleString('ar-SA')} ₪)`
        );
      }
      changes.totalAmount = newTotal;
    }

    await db.orders.update(orderId, { ...changes, updatedAt: Date.now() });
    return recalcOrder(orderId);
  });
}

// تحديث مرحلة التنفيذ فقط — خفيف بدون إعادة حساب مالي
export async function updateOrderStage(orderId: string, stage: import('../types').WorkStage | ''): Promise<void> {
  await db.orders.update(orderId, { workStage: stage || undefined, updatedAt: Date.now() });
}

export async function countOrderPayments(orderId: string): Promise<number> {
  return db.paymentTransactions.where('relatedId').equals(orderId).count();
}

// حذف الطلبية مع سندات القبض التابعة لها حتى لا تبقى مقبوضات يتيمة في التقارير
export async function deleteOrder(orderId: string): Promise<void> {
  await db.transaction('rw', db.orders, db.paymentTransactions, async () => {
    const txs = await db.paymentTransactions.where('relatedId').equals(orderId).toArray();
    if (txs.some((t) => t.closingId)) throw new Error('لها دفعات في أسبوع مُقفل');
    await db.paymentTransactions
      .where('relatedId')
      .equals(orderId)
      .filter((t) => t.type === 'customer_in')
      .delete();
    await db.orders.delete(orderId);
  });
}

// ───────────────────────── الدفعات ─────────────────────────

export interface CustomerPaymentInput {
  amount: number;
  discountAmount?: number;
  paymentMethod: string;
  itemPurpose?: string;
  date?: string;
  receiptAttachment?: string;
  notes?: string;
}

// يفترض أنه يُستدعى داخل معاملة تشمل orders و paymentTransactions و settings
async function insertCustomerPayment(
  order: Order,
  input: CustomerPaymentInput
): Promise<PaymentTransaction> {
  const amount = round2(Number(input.amount) || 0);
  const discount = round2(Number(input.discountAmount) || 0);

  if (amount < 0 || discount < 0) throw new Error('مبلغ غير صالح');
  if (amount + discount <= 0) throw new Error('أدخل المبلغ');
  if (order.status === 'cancelled') throw new Error('الطلبية ملغاة');
  if (amount + discount > order.remainingAmount + EPS) {
    throw new Error(
      `أكبر من المتبقي (${order.remainingAmount.toLocaleString('ar-SA')} ₪)`
    );
  }

  const tx: PaymentTransaction = {
    id: uid('PAY'),
    receiptNumber: await claimDocNumber('R'),
    type: 'customer_in',
    relatedId: order.id,
    partyName: order.customerName,
    itemPurpose: input.itemPurpose?.trim() || 'دفعة',
    amount,
    discountAmount: discount,
    remainingAfter: Math.max(0, round2(order.remainingAmount - amount - discount)),
    date: input.date || todayISO(),
    paymentMethod: input.paymentMethod || 'نقداً',
    receiptAttachment: input.receiptAttachment,
    notes: input.notes?.trim() || undefined,
    createdAt: Date.now(),
  };
  await db.paymentTransactions.add(tx);
  return tx;
}

export async function addCustomerPayment(
  orderId: string,
  input: CustomerPaymentInput
): Promise<{ payment: PaymentTransaction; order: Order }> {
  return db.transaction('rw', [db.orders, db.paymentTransactions, db.settings], async () => {
    // إعادة الحساب قبل التحقق لضمان أن المتبقي مطابق للسجل
    const order = await recalcOrder(orderId);
    const payment = await insertCustomerPayment(order, input);
    return { payment, order: await recalcOrder(orderId) };
  });
}

// ───────────────────────── الموردين ─────────────────────────

function computeSupplierBalance(invoices: SupplierInvoice[], txs: PaymentTransaction[]) {
  const totalInvoiced = round2(invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0));
  const outs = txs.filter((t) => t.type === 'supplier_out');
  const totalPaid = round2(outs.reduce((s, t) => s + (Number(t.amount) || 0), 0));
  const lastPaymentDate = outs.map((t) => t.date).sort().pop();
  return {
    totalInvoiced,
    totalPaid,
    remainingDebt: Math.max(0, round2(totalInvoiced - totalPaid)),
    lastPaymentDate,
  };
}

async function recalcSupplier(supplierId: string): Promise<SupplierDebt> {
  const supplier = await db.supplierDebts.get(supplierId);
  if (!supplier) throw new Error('المورد غير موجود');
  const invoices = await db.supplierInvoices.where('supplierId').equals(supplierId).toArray();
  const txs = await db.paymentTransactions.where('relatedId').equals(supplierId).toArray();
  const balance = computeSupplierBalance(invoices, txs);
  await db.supplierDebts.update(supplierId, { ...balance, updatedAt: Date.now() });
  return { ...supplier, ...balance };
}

/**
 * يحوّل الأرصدة اليدوية القديمة للموردين إلى قيود في الدفتر:
 * الفرق في الفواتير يصبح "رصيد افتتاحي"، والفرق في المدفوع يصبح "دفعات سابقة"
 * (بدون مصروف مقابل لأنها دُفعت قبل النظام).
 */
async function reconcileSupplierTables(
  suppliers: Table<SupplierDebt, string>,
  invoicesTable: Table<SupplierInvoice, string>,
  payments: Table<PaymentTransaction, string>
): Promise<void> {
  const allSuppliers = await suppliers.toArray();
  const allInvoices = await invoicesTable.toArray();
  const allTxs = await payments.toArray();
  for (const sup of allSuppliers) {
    const invoices = allInvoices.filter((i) => i.supplierId === sup.id);
    const txs = allTxs.filter((t) => t.type === 'supplier_out' && t.relatedId === sup.id);
    const openingDate = new Date(sup.createdAt || Date.now()).toISOString().slice(0, 10);

    const invoiceGap = round2((Number(sup.totalInvoiced) || 0) - invoices.reduce((s, i) => s + i.amount, 0));
    if (invoiceGap > EPS) {
      const opening: SupplierInvoice = {
        id: uid('INV-OPEN'),
        supplierId: sup.id,
        supplierName: sup.supplierName,
        description: 'رصيد افتتاحي (فواتير سابقة)',
        amount: invoiceGap,
        date: openingDate,
        createdAt: sup.createdAt || Date.now(),
      };
      await invoicesTable.add(opening);
      invoices.push(opening);
    }

    const paidGap = round2((Number(sup.totalPaid) || 0) - txs.reduce((s, t) => s + t.amount, 0));
    if (paidGap > EPS) {
      const opening: PaymentTransaction = {
        id: uid('SUPPAY-OPEN'),
        receiptNumber: `رصيد-سابق/${sup.supplierName}`,
        type: 'supplier_out',
        relatedId: sup.id,
        partyName: sup.supplierName,
        itemPurpose: 'دفعات سابقة للمورد قبل اعتماد الدفتر',
        amount: paidGap,
        date: sup.lastPaymentDate || openingDate,
        paymentMethod: 'غير محدد',
        notes: 'قيد تسوية تلقائي',
        createdAt: sup.createdAt || Date.now(),
      };
      await payments.add(opening);
      txs.push(opening);
    }

    await suppliers.update(sup.id, computeSupplierBalance(invoices, txs));
  }
}

export interface SupplierInput {
  supplierName: string;
  phone?: string;
  category?: string;
  notes?: string;
}

export async function createSupplier(data: SupplierInput, openingBalance = 0): Promise<SupplierDebt> {
  const name = data.supplierName?.trim();
  if (!name) throw new Error('أدخل اسم المورد');
  const opening = round2(Number(openingBalance) || 0);
  if (opening < 0) throw new Error('الرصيد الافتتاحي غير صالح');

  return db.transaction('rw', [db.supplierDebts, db.supplierInvoices, db.paymentTransactions, db.settings], async () => {
    const exists = await db.supplierDebts.where('supplierName').equals(name).count();
    if (exists) throw new Error('يوجد مورد بنفس الاسم');
    const now = Date.now();
    const supplier: SupplierDebt = {
      id: uid('sup'),
      supplierName: name,
      phone: data.phone?.trim() || '',
      category: data.category?.trim() || 'مورد عام',
      totalInvoiced: 0,
      totalPaid: 0,
      remainingDebt: 0,
      notes: data.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    await db.supplierDebts.add(supplier);
    if (opening > 0) {
      await db.supplierInvoices.add({
        id: uid('INV-OPEN'),
        supplierId: supplier.id,
        supplierName: name,
        invoiceNumber: await claimDocNumber('I'),
        description: 'رصيد افتتاحي (دين سابق)',
        amount: opening,
        date: todayISO(),
        createdAt: now,
      });
    }
    return recalcSupplier(supplier.id);
  });
}

export async function updateSupplier(supplierId: string, data: Partial<SupplierInput>): Promise<void> {
  const name = data.supplierName?.trim();
  if (data.supplierName !== undefined && !name) throw new Error('أدخل اسم المورد');
  await db.transaction(
    'rw',
    [db.supplierDebts, db.supplierInvoices, db.paymentTransactions, db.expenses],
    async () => {
      const supplier = await db.supplierDebts.get(supplierId);
      if (!supplier) throw new Error('المورد غير موجود');
      await db.supplierDebts.update(supplierId, {
        ...(name ? { supplierName: name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category.trim() } : {}),
        ...(data.notes !== undefined ? { notes: data.notes.trim() || undefined } : {}),
        updatedAt: Date.now(),
      });
      // الاسم مخزن في الحركات لعرضها، فيُحدَّث معها
      if (name && name !== supplier.supplierName) {
        await db.supplierInvoices.where('supplierId').equals(supplierId).modify({ supplierName: name });
        const txs = await db.paymentTransactions.where('relatedId').equals(supplierId).toArray();
        for (const t of txs) {
          await db.paymentTransactions.update(t.id, { partyName: name });
          await db.expenses.where('linkedPaymentId').equals(t.id).modify({ supplierName: name });
        }
      }
    }
  );
}

// لا يُحذف مورد له فواتير أو سندات حتى لا تختفي مصاريف وديون من التقارير
export async function deleteSupplier(supplierId: string): Promise<void> {
  await db.transaction('rw', db.supplierDebts, db.supplierInvoices, db.paymentTransactions, async () => {
    const invoices = await db.supplierInvoices.where('supplierId').equals(supplierId).count();
    const payments = await db.paymentTransactions.where('relatedId').equals(supplierId).count();
    if (invoices + payments > 0) {
      throw new Error('للمورد حركات مسجلة');
    }
    await db.supplierDebts.delete(supplierId);
  });
}

export interface SupplierInvoiceInput {
  amount: number;
  description?: string;
  invoiceNumber?: string;
  date?: string;
  notes?: string;
}

export async function addSupplierInvoice(
  supplierId: string,
  input: SupplierInvoiceInput
): Promise<SupplierInvoice> {
  const amount = round2(Number(input.amount) || 0);
  if (amount <= 0) throw new Error('أدخل المبلغ');
  return db.transaction('rw', [db.supplierDebts, db.supplierInvoices, db.paymentTransactions, db.settings], async () => {
    const supplier = await db.supplierDebts.get(supplierId);
    if (!supplier) throw new Error('المورد غير موجود');
    // رقم النظام الموحد يُحجز عند الحفظ (رقم المعاينة في النموذج قد يسبقه غيره)
    const autoInvoiceNumber = await claimDocNumber('I');
    const invoice: SupplierInvoice = {
      id: uid('INV'),
      supplierId,
      supplierName: supplier.supplierName,
      invoiceNumber: autoInvoiceNumber,
      description: input.description?.trim() || 'شراء',
      amount,
      date: input.date || todayISO(),
      notes: input.notes?.trim() || undefined,
      createdAt: Date.now(),
    };
    await db.supplierInvoices.add(invoice);
    await recalcSupplier(supplierId);
    return invoice;
  });
}

export async function deleteSupplierInvoice(invoiceId: string): Promise<void> {
  await db.transaction('rw', db.supplierDebts, db.supplierInvoices, db.paymentTransactions, async () => {
    const invoice = await db.supplierInvoices.get(invoiceId);
    if (!invoice) return;
    const supplier = await recalcSupplier(invoice.supplierId);
    if (supplier.totalInvoiced - invoice.amount + EPS < supplier.totalPaid) {
      throw new Error('احذف سند الصرف أولاً');
    }
    await db.supplierInvoices.delete(invoiceId);
    await recalcSupplier(invoice.supplierId);
  });
}

export interface SupplierPaymentInput {
  amount: number;
  paymentMethod: string;
  itemPurpose?: string;
  date?: string;
  notes?: string;
  receiptAttachment?: string;
  expenseCategory?: ExpenseCategory;
}

export async function addSupplierPayment(
  supplierId: string,
  input: SupplierPaymentInput
): Promise<PaymentTransaction> {
  return db.transaction(
    'rw',
    [db.supplierDebts, db.supplierInvoices, db.paymentTransactions, db.expenses, db.settings],
    async () => {
      const supplier = await recalcSupplier(supplierId);

      const value = round2(Number(input.amount) || 0);
      if (value <= 0) throw new Error('أدخل المبلغ');
      if (value > supplier.remainingDebt + EPS) {
        throw new Error(
          `أكبر من دين المورد (${supplier.remainingDebt.toLocaleString('ar-SA')} ₪)`
        );
      }

      const payDate = input.date || todayISO();
      const tx: PaymentTransaction = {
        id: uid('SUPPAY'),
        receiptNumber: await claimDocNumber('P'),
        type: 'supplier_out',
        relatedId: supplierId,
        partyName: supplier.supplierName,
        itemPurpose: input.itemPurpose?.trim() || `سداد للمورد: ${supplier.supplierName}`,
        amount: value,
        remainingAfter: Math.max(0, round2(supplier.remainingDebt - value)),
        date: payDate,
        paymentMethod: input.paymentMethod || 'نقداً',
        receiptAttachment: input.receiptAttachment,
        notes: input.notes?.trim() || undefined,
        createdAt: Date.now(),
      };
      await db.paymentTransactions.add(tx);

      // المحاسبة على الأساس النقدي: المصروف يُسجل عند الدفع الفعلي للمورد
      // (لذلك لا تُسجَّل فواتير الشراء الآجلة كمصروف حتى لا تُحسب مرتين)
      const expense: Expense = {
        id: uid('EXP-SUP'),
        expenseNumber: await claimDocNumber('E'),
        title: `سداد للمورد (${supplier.supplierName})`,
        category: input.expenseCategory || 'raw_materials',
        amount: value,
        date: payDate,
        paymentMethod: tx.paymentMethod,
        supplierName: supplier.supplierName,
        linkedPaymentId: tx.id,
        receiptAttachment: input.receiptAttachment,
        notes: tx.notes || `سند صرف رقم ${docNo(tx.receiptNumber)}`,
        createdAt: Date.now(),
      };
      await db.expenses.add(expense);

      await recalcSupplier(supplierId);
      return tx;
    }
  );
}

// إلغاء سند (قبض أو صرف) وإرجاع أثره على رصيد الطلبية أو المورد
export async function deletePayment(paymentId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.orders, db.paymentTransactions, db.supplierDebts, db.supplierInvoices, db.expenses],
    async () => {
      const tx = await db.paymentTransactions.get(paymentId);
      if (!tx) return;
      assertOpen(tx);
      await db.paymentTransactions.delete(paymentId);

      if (tx.type === 'customer_in') {
        if (await db.orders.get(tx.relatedId)) await recalcOrder(tx.relatedId);
        return;
      }

      await db.expenses.where('linkedPaymentId').equals(paymentId).delete();
      if (await db.supplierDebts.get(tx.relatedId)) await recalcSupplier(tx.relatedId);
    }
  );
}

// ───────────────────────── المصاريف ─────────────────────────

type ExpenseInput = Omit<Partial<Expense>, 'id' | 'expenseNumber' | 'createdAt' | 'linkedPaymentId'>;

export async function createExpense(data: ExpenseInput): Promise<Expense> {
  const amount = round2(Number(data.amount) || 0);
  if (amount <= 0) throw new Error('أدخل المبلغ');
  return db.transaction('rw', [db.expenses, db.settings], async () => {
    const expense: Expense = {
      id: uid('exp'),
      expenseNumber: await claimDocNumber('E'),
      title: data.title?.trim() || '',
      category: data.category || 'general',
      amount,
      date: data.date || todayISO(),
      paymentMethod: data.paymentMethod || 'نقداً',
      supplierName: data.supplierName,
      receiptAttachment: data.receiptAttachment,
      notes: data.notes,
      createdAt: Date.now(),
    };
    await db.expenses.add(expense);
    return expense;
  });
}

export async function updateExpense(expenseId: string, data: ExpenseInput): Promise<void> {
  const changes: ExpenseInput = { ...data };
  if (changes.amount !== undefined) {
    changes.amount = round2(Number(changes.amount) || 0);
    if (changes.amount <= 0) throw new Error('أدخل المبلغ');
  }
  await db.transaction('rw', db.expenses, db.paymentTransactions, async () => {
    const existing = await db.expenses.get(expenseId);
    if (!existing) throw new Error('المصروف غير موجود');
    assertOpen(existing);
    if (existing.linkedPaymentId && changes.amount !== undefined && changes.amount !== existing.amount) {
      throw new Error('مرتبط بسند صرف');
    }
    await db.expenses.update(expenseId, changes);
    // المصروف وسند الصرف المرتبط به يبقيان بنفس التاريخ والوسيلة
    if (existing.linkedPaymentId) {
      await db.paymentTransactions.update(existing.linkedPaymentId, {
        ...(changes.date ? { date: changes.date } : {}),
        ...(changes.paymentMethod ? { paymentMethod: changes.paymentMethod } : {}),
      });
    }
  });
}

// حذف مصروف مرتبط بسداد مورد يلغي السند ويعيد الدين للمورد
export async function deleteExpense(expenseId: string): Promise<void> {
  const existing = await db.expenses.get(expenseId);
  if (!existing) return;
  assertOpen(existing);
  if (existing.linkedPaymentId) await deletePayment(existing.linkedPaymentId);
  await db.expenses.delete(expenseId);
}

// ───────────────────────── إقفال الأسبوع ─────────────────────────

// الحركات المُرحَّلة لأسبوع مُقفل ثابتة حتى لا يتغير كشف محفوظ
function assertOpen(x: { closingId?: string }) {
  if (x.closingId) throw new Error('الأسبوع مُقفل');
}

// يرحّل كل الحركات المفتوحة إلى أسبوع مُقفل جديد، فيبدأ الحساب من الصفر
export async function closeWeek(): Promise<WeekClosing> {
  return db.transaction('rw', [db.paymentTransactions, db.expenses, db.weekClosings], async () => {
    const payments = await db.paymentTransactions.filter((t) => !t.closingId).toArray();
    const expenses = await db.expenses.filter((e) => !e.closingId).toArray();
    const rows = weekLedger(payments, expenses);
    if (!rows.length) throw new Error('لا حركات');

    const today = todayISO();
    const last = await db.weekClosings.orderBy('seq').last();
    const lastDate = rows[rows.length - 1].date;
    const closing: WeekClosing = {
      id: uid('week'),
      seq: (last?.seq ?? 0) + 1,
      fromDate: rows[0].date,
      toDate: lastDate > today ? lastDate : today,
      ...ledgerTotals(rows),
      closedAt: Date.now(),
    };
    await db.weekClosings.add(closing);
    // سندات صرف الموردين تُرحَّل مع مصروفاتها المرتبطة
    await db.paymentTransactions.bulkUpdate(payments.map((t) => ({ key: t.id, changes: { closingId: closing.id } })));
    await db.expenses.bulkUpdate(expenses.map((e) => ({ key: e.id, changes: { closingId: closing.id } })));
    return closing;
  });
}

// تراجع عن آخر إقفال فقط (إن تم بالخطأ): تعود حركاته للأسبوع المفتوح
export async function reopenLastWeek(): Promise<void> {
  await db.transaction('rw', [db.paymentTransactions, db.expenses, db.weekClosings], async () => {
    const last = await db.weekClosings.orderBy('seq').last();
    if (!last) return;
    await db.paymentTransactions.filter((t) => t.closingId === last.id).modify((t) => void delete t.closingId);
    await db.expenses.filter((e) => e.closingId === last.id).modify((e) => void delete e.closingId);
    await db.weekClosings.delete(last.id);
  });
}

// ───────────────────────── احتياجات المنجرة ─────────────────────────

export async function addWorkshopNeed(data: Pick<WorkshopNeed, 'title' | 'category' | 'notes'>): Promise<void> {
  const title = data.title.trim();
  if (!title) throw new Error('أدخل البند');
  await db.workshopNeeds.add({
    id: uid('need'),
    title,
    category: data.category,
    notes: data.notes?.trim() || undefined,
    isDone: false,
    addedAt: Date.now(),
  });
}

export async function toggleWorkshopNeed(id: string, isDone: boolean): Promise<void> {
  await db.workshopNeeds.update(id, { isDone });
}

export async function deleteWorkshopNeed(id: string): Promise<void> {
  await db.workshopNeeds.delete(id);
}

// ───────────────────────── النسخ الاحتياطي ─────────────────────────

export async function exportDatabaseBackup(): Promise<string> {
  const orders = await db.orders.toArray();
  const expenses = await db.expenses.toArray();
  const supplierDebts = await db.supplierDebts.toArray();
  const supplierInvoices = await db.supplierInvoices.toArray();
  const paymentTransactions = await db.paymentTransactions.toArray();
  const paymentMethods = await db.paymentMethods.toArray();
  const settings = await db.settings.toArray();
  const workshopNeeds = await db.workshopNeeds.toArray();
  const weekClosings = await db.weekClosings.toArray();

  const backupData = {
    version: 5,
    exportedAt: new Date().toISOString(),
    data: {
      orders,
      expenses,
      supplierDebts,
      supplierInvoices,
      paymentTransactions,
      paymentMethods,
      settings,
      workshopNeeds,
      weekClosings
    }
  };

  return JSON.stringify(backupData, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data) throw new Error('ملف غير صالح');

    await db.transaction('rw', [db.orders, db.expenses, db.supplierDebts, db.supplierInvoices, db.paymentTransactions, db.paymentMethods, db.settings, db.workshopNeeds, db.weekClosings], async () => {
      // النسخ الأقدم من v5 بلا إقفالات: كل حركاتها تعود للأسبوع المفتوح
      await db.weekClosings.clear();
      if (parsed.data.weekClosings) {
        await db.weekClosings.bulkAdd(parsed.data.weekClosings);
      }
      if (parsed.data.workshopNeeds) {
        await db.workshopNeeds.clear();
        await db.workshopNeeds.bulkAdd(parsed.data.workshopNeeds);
      }
      if (parsed.data.orders) {
        await db.orders.clear();
        await db.orders.bulkAdd(parsed.data.orders);
      }
      if (parsed.data.expenses) {
        await db.expenses.clear();
        await db.expenses.bulkAdd(parsed.data.expenses);
      }
      if (parsed.data.supplierDebts) {
        await db.supplierDebts.clear();
        await db.supplierDebts.bulkAdd(parsed.data.supplierDebts);
      }
      // النسخ الأقدم من v4 لا تحتوي فواتير الموردين، فتُبنى من أرصدتهم
      await db.supplierInvoices.clear();
      if (parsed.data.supplierInvoices) {
        await db.supplierInvoices.bulkAdd(parsed.data.supplierInvoices);
      }
      if (parsed.data.paymentTransactions) {
        await db.paymentTransactions.clear();
        await db.paymentTransactions.bulkAdd(parsed.data.paymentTransactions);
      }
      if (parsed.data.paymentMethods) {
        await db.paymentMethods.clear();
        await db.paymentMethods.bulkAdd(parsed.data.paymentMethods);
      }
      if (parsed.data.settings) {
        await db.settings.clear();
        await db.settings.bulkAdd(parsed.data.settings);
      }
      // ملفات النسخ القديمة قد تحتوي أرصدة غير مطابقة لسجل الدفعات
      await reconcileTables(db.orders, db.paymentTransactions);
      await reconcileSupplierTables(db.supplierDebts, db.supplierInvoices, db.paymentTransactions);
      await normalizeDocNumbers({
        orders: db.orders,
        expenses: db.expenses,
        payments: db.paymentTransactions,
        invoices: db.supplierInvoices,
        settings: db.settings,
      });
    });
    return true;
  } catch (err) {
    console.error('Backup import error:', err);
    return false;
  }
}
