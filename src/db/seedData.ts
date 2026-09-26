import { db, DEFAULT_SETTINGS, DEFAULT_PAYMENT_METHODS, reconcileLedger } from './dexie';
import type { Order, Expense, PaymentTransaction, SupplierDebt, SupplierInvoice, WorkshopNeed } from '../types';

const DAY = 86400000;
const ago = (days: number) => Date.now() - DAY * days;

// ─────────── طلبيات تجريبية ───────────
// تغطي كل الحالات: انتظار بلا سعر، انتظار بسعر مبدئي، بداية، جارٍ، جاهز عليه باقي، جاهز خالص (يظهر مكتمل)، مكتمل
export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: 'ط-1',
    customerName: 'أبو خالد الحلبي',
    customerPhone: '0599112233',
    category: 'kitchen',
    description: 'مطبخ خشب زان 4.5 متر مع جزيرة وأدراج هيدروليك',
    woodType: 'زان روماني + ساندويش 18 مقاوم للرطوبة',
    dimensions: '450سم × 60سم',
    totalAmount: 16500,
    paidAmount: 16500,
    remainingAmount: 0,
    status: 'completed',
    workStage: 'ready_deliver',
    orderDate: '2026-09-01',
    deliveryDate: '2026-09-14',
    createdAt: ago(22),
    updatedAt: ago(9),
  },
  {
    id: 'ord-102',
    orderNumber: 'ط-2',
    customerName: 'محمود البواب',
    customerPhone: '0567445566',
    category: 'doors',
    description: '6 أبواب داخلية سويد قشرة سنديان مع إطارات',
    woodType: 'سويد + قشرة سنديان أوروبي',
    dimensions: '210سم × 90سم للباب',
    totalAmount: 5000,
    paidAmount: 4800,
    discountTotal: 200,
    remainingAmount: 0,
    // جاهز ومدفوع بالكامل (مع خصم 200) ← يظهر تلقائياً في "مكتمل"
    status: 'in_progress',
    workStage: 'ready_deliver',
    orderDate: '2026-09-05',
    createdAt: ago(18),
    updatedAt: ago(7),
  },
  {
    id: 'ord-103',
    orderNumber: 'ط-3',
    customerName: 'أم سامر',
    customerPhone: '0598667744',
    category: 'bedroom',
    description: 'غرفة نوم: خزانة سحاب 3م + سرير + تسريحة بمرآة',
    woodType: 'سويد قشرة جوز طبيعي',
    dimensions: 'خزانة 300سم × 230سم',
    totalAmount: 8800,
    paidAmount: 5000,
    remainingAmount: 3800,
    status: 'in_progress',
    workStage: 'finishing',
    orderDate: '2026-09-08',
    createdAt: ago(15),
    updatedAt: ago(3),
  },
  {
    id: 'ord-104',
    orderNumber: 'ط-4',
    customerName: 'مكتب المعمار الهندسي',
    customerPhone: '0595887766',
    category: 'decoration',
    description: 'ديكور جداري خشبي لمدخل صالة مع إضاءة ليد مخفية',
    woodType: 'شرائح سنديان + فايبر أسود',
    dimensions: '3م عرض × 2.8م ارتفاع',
    totalAmount: 5500,
    paidAmount: 2500,
    remainingAmount: 3000,
    // جاهز لكن عليه باقي ← يبقى في "قيد التنفيذ" مع زر قبض
    status: 'in_progress',
    workStage: 'ready_deliver',
    orderDate: '2026-09-13',
    createdAt: ago(10),
    updatedAt: ago(1),
  },
  {
    id: 'ord-105',
    orderNumber: 'ط-5',
    customerName: 'مطعم الديوان',
    customerPhone: '0599334455',
    category: 'custom',
    description: 'طاولات وكراسي خشبية للمطعم + كاونتر استقبال',
    woodType: 'خشب زان مبخر متين',
    dimensions: '8 طاولات + 32 كرسي',
    totalAmount: 9200,
    paidAmount: 4000,
    remainingAmount: 5200,
    status: 'in_progress',
    workStage: 'manufacturing',
    orderDate: '2026-09-15',
    createdAt: ago(8),
    updatedAt: ago(2),
  },
  {
    id: 'ord-106',
    orderNumber: 'ط-6',
    customerName: 'أم علي النجار',
    customerPhone: '0597556677',
    category: 'custom',
    description: 'مكتبة جدارية للصالون مع خزائن سفلية',
    woodType: 'حسب الاتفاق',
    totalAmount: 3500,
    paidAmount: 0,
    remainingAmount: 3500,
    // انتظار بسعر مبدئي ← لا يُحسب ديناً ولا مبيعات حتى يُقبض منه
    status: 'in_progress',
    workStage: 'waiting',
    orderDate: '2026-09-20',
    createdAt: ago(3),
    updatedAt: ago(3),
  },
  {
    id: 'ord-107',
    orderNumber: 'ط-7',
    customerName: 'أبو محمد عاشور',
    customerPhone: '0592113344',
    category: 'doors',
    description: 'باب رئيسي زان + شباك مطبخ',
    woodType: 'حسب الاتفاق',
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0,
    // انتظار بلا سعر: استفسار فقط
    status: 'in_progress',
    workStage: 'waiting',
    orderDate: '2026-09-22',
    createdAt: ago(1),
    updatedAt: ago(1),
  },
];

// ─────────── قبض من الزبائن + صرف للموردين ───────────
export const SAMPLE_PAYMENTS: PaymentTransaction[] = [
  {
    id: 'pay-1',
    receiptNumber: 'ق-1',
    type: 'customer_in',
    relatedId: 'ord-101',
    partyName: 'أبو خالد الحلبي',
    itemPurpose: 'دفعة عربون للطلبية ط-1',
    amount: 8000,
    discountAmount: 0,
    remainingAfter: 8500,
    date: '2026-09-01',
    paymentMethod: 'نقداً',
    createdAt: ago(22),
  },
  {
    id: 'pay-2',
    receiptNumber: 'ق-2',
    type: 'customer_in',
    relatedId: 'ord-102',
    partyName: 'محمود البواب',
    itemPurpose: 'دفعة عربون للطلبية ط-2',
    amount: 2000,
    discountAmount: 0,
    remainingAfter: 3000,
    date: '2026-09-05',
    paymentMethod: 'نقداً',
    createdAt: ago(18),
  },
  {
    id: 'pay-3',
    receiptNumber: 'ق-3',
    type: 'customer_in',
    relatedId: 'ord-103',
    partyName: 'أم سامر',
    itemPurpose: 'دفعة عربون للطلبية ط-3',
    amount: 5000,
    discountAmount: 0,
    remainingAfter: 3800,
    date: '2026-09-08',
    paymentMethod: 'محفظة جوال بي',
    createdAt: ago(15),
  },
  {
    id: 'pay-4',
    receiptNumber: 'ق-4',
    type: 'customer_in',
    relatedId: 'ord-104',
    partyName: 'مكتب المعمار الهندسي',
    itemPurpose: 'دفعة عربون للطلبية ط-4',
    amount: 2500,
    discountAmount: 0,
    remainingAfter: 3000,
    date: '2026-09-13',
    paymentMethod: 'محفظة بال بي',
    createdAt: ago(10),
  },
  {
    id: 'pay-5',
    receiptNumber: 'ق-5',
    type: 'customer_in',
    relatedId: 'ord-101',
    partyName: 'أبو خالد الحلبي',
    itemPurpose: 'دفعة من طلبية ط-1',
    amount: 8500,
    discountAmount: 0,
    remainingAfter: 0,
    date: '2026-09-14',
    paymentMethod: 'بنك فلسطين',
    createdAt: ago(9),
  },
  {
    id: 'pay-6',
    receiptNumber: 'ق-6',
    type: 'customer_in',
    relatedId: 'ord-105',
    partyName: 'مطعم الديوان',
    itemPurpose: 'دفعة عربون للطلبية ط-5',
    amount: 4000,
    discountAmount: 0,
    remainingAfter: 5200,
    date: '2026-09-15',
    paymentMethod: 'بنك فلسطين',
    createdAt: ago(8),
  },
  {
    id: 'pay-7',
    receiptNumber: 'ق-7',
    type: 'customer_in',
    relatedId: 'ord-102',
    partyName: 'محمود البواب',
    itemPurpose: 'دفعة من طلبية ط-2',
    amount: 2800,
    discountAmount: 200,
    remainingAfter: 0,
    date: '2026-09-16',
    paymentMethod: 'نقداً',
    createdAt: ago(7),
  },
  // ── صرف للموردين (كل سند صرف يقابله مصروف مرتبط، كما في البرنامج) ──
  {
    id: 'pay-8',
    receiptNumber: 'ص-1',
    type: 'supplier_out',
    relatedId: 'sup-301',
    partyName: 'شركة القدس للأخشاب',
    itemPurpose: 'سداد للمورد: شركة القدس للأخشاب',
    amount: 4000,
    remainingAfter: 5500,
    date: '2026-09-10',
    paymentMethod: 'بنك فلسطين',
    createdAt: ago(13),
  },
  {
    id: 'pay-9',
    receiptNumber: 'ص-2',
    type: 'supplier_out',
    relatedId: 'sup-302',
    partyName: 'معرض الأمل للإكسسوارات',
    itemPurpose: 'سداد للمورد: معرض الأمل للإكسسوارات',
    amount: 1200,
    remainingAfter: 900,
    date: '2026-09-12',
    paymentMethod: 'نقداً',
    createdAt: ago(11),
  },
];

// ─────────── مصاريف ───────────
export const SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'exp-201',
    expenseNumber: 'م-1',
    title: 'إيجار الورشة — شهر سبتمبر',
    category: 'workshop',
    amount: 1800,
    date: '2026-09-01',
    paymentMethod: 'بنك فلسطين',
    createdAt: ago(22),
  },
  {
    id: 'exp-202',
    expenseNumber: 'م-2',
    title: 'ألواح MDF 18 مم',
    category: 'raw_materials',
    amount: 1450,
    date: '2026-09-04',
    paymentMethod: 'نقداً',
    createdAt: ago(19),
  },
  {
    id: 'exp-203',
    expenseNumber: 'م-3',
    title: 'سداد للمورد (شركة القدس للأخشاب)',
    category: 'raw_materials',
    amount: 4000,
    date: '2026-09-10',
    paymentMethod: 'بنك فلسطين',
    supplierName: 'شركة القدس للأخشاب',
    linkedPaymentId: 'pay-8',
    notes: 'سند صرف ص-1',
    createdAt: ago(13),
  },
  {
    id: 'exp-204',
    expenseNumber: 'م-4',
    title: 'دهانات + سيلر + لك شفاف',
    category: 'finishes',
    amount: 1200,
    date: '2026-09-11',
    paymentMethod: 'محفظة جوال بي',
    createdAt: ago(12),
  },
  {
    id: 'exp-205',
    expenseNumber: 'م-5',
    title: 'سداد للمورد (معرض الأمل للإكسسوارات)',
    category: 'hardware',
    amount: 1200,
    date: '2026-09-12',
    paymentMethod: 'نقداً',
    supplierName: 'معرض الأمل للإكسسوارات',
    linkedPaymentId: 'pay-9',
    notes: 'سند صرف ص-2',
    createdAt: ago(11),
  },
  {
    id: 'exp-206',
    expenseNumber: 'م-6',
    title: 'أجور أسبوعية للنجارين',
    category: 'wages',
    amount: 3200,
    date: '2026-09-14',
    paymentMethod: 'نقداً',
    createdAt: ago(9),
  },
  {
    id: 'exp-207',
    expenseNumber: 'م-7',
    title: 'نقل خشب من المستودع',
    category: 'transport',
    amount: 150,
    date: '2026-09-18',
    paymentMethod: 'نقداً',
    createdAt: ago(5),
  },
];

// ─────────── موردون (للشراء بالدَّين فقط) ───────────
export const SAMPLE_SUPPLIERS: SupplierDebt[] = [
  {
    id: 'sup-301',
    supplierName: 'شركة القدس للأخشاب',
    phone: '0599887766',
    category: 'أخشاب وألواح',
    totalInvoiced: 0, // تُحسب تلقائياً من المشتريات والسندات
    totalPaid: 0,
    remainingDebt: 0,
    createdAt: ago(30),
    updatedAt: ago(30),
  },
  {
    id: 'sup-302',
    supplierName: 'معرض الأمل للإكسسوارات',
    phone: '0598776655',
    category: 'إكسسوارات ومفصلات',
    totalInvoiced: 0,
    totalPaid: 0,
    remainingDebt: 0,
    createdAt: ago(20),
    updatedAt: ago(20),
  },
  {
    id: 'sup-303',
    supplierName: 'محلات حسونة للدهانات',
    phone: '0567223344',
    category: 'دهانات وغراء',
    totalInvoiced: 0,
    totalPaid: 0,
    remainingDebt: 0,
    createdAt: ago(25),
    updatedAt: ago(25),
  },
];

// ─────────── مشتريات بالدَّين من الموردين ───────────
export const SAMPLE_SUPPLIER_INVOICES: SupplierInvoice[] = [
  {
    id: 'inv-1',
    supplierId: 'sup-301',
    supplierName: 'شركة القدس للأخشاب',
    invoiceNumber: 'ف-1',
    description: 'زان روماني + ساندويش 18 مم',
    amount: 9500,
    date: '2026-09-02',
    createdAt: ago(21),
  },
  {
    id: 'inv-2',
    supplierId: 'sup-302',
    supplierName: 'معرض الأمل للإكسسوارات',
    invoiceNumber: 'ف-2',
    description: 'مفصلات هيدروليك + مجاري أدراج',
    amount: 2100,
    date: '2026-09-07',
    createdAt: ago(16),
  },
  {
    id: 'inv-3',
    supplierId: 'sup-303',
    supplierName: 'محلات حسونة للدهانات',
    invoiceNumber: 'ف-3',
    description: 'دهانات + مواد تشطيب',
    amount: 1800,
    date: '2026-09-10',
    createdAt: ago(13),
  },
];

// ─────────── احتياجات المنجرة ───────────
export const SAMPLE_NEEDS: WorkshopNeed[] = [
  { id: 'need-1', title: 'منشار دائري', category: 'tools', isDone: false, addedAt: ago(6) },
  { id: 'need-2', title: 'لوح MDF 18 مم × 10', category: 'wood', notes: 'لطلبية مطعم الديوان', isDone: false, addedAt: ago(4) },
  { id: 'need-3', title: 'ورق صنفرة 120', category: 'materials', isDone: false, addedAt: ago(2) },
  { id: 'need-4', title: 'غراء خشب', category: 'materials', isDone: true, addedAt: ago(9) },
];

// ─────────── حقن بيانات تجريبية ───────────
export async function injectSampleDataToDatabase() {
  await db.transaction(
    'rw',
    [db.orders, db.expenses, db.paymentTransactions, db.supplierDebts, db.supplierInvoices, db.workshopNeeds, db.weekClosings, db.paymentMethods, db.settings],
    async () => {
      await db.orders.clear();
      await db.expenses.clear();
      await db.paymentTransactions.clear();
      await db.supplierDebts.clear();
      await db.supplierInvoices.clear();
      await db.workshopNeeds.clear();
      await db.weekClosings.clear();

      const settingsCount = await db.settings.count();
      if (settingsCount === 0) {
        await db.settings.put(DEFAULT_SETTINGS);
      }
      await db.settings.update('current_workshop', { receiptCounters: {} });

      await db.orders.bulkAdd(SAMPLE_ORDERS);
      await db.expenses.bulkAdd(SAMPLE_EXPENSES);
      await db.paymentTransactions.bulkAdd(SAMPLE_PAYMENTS);
      await db.supplierDebts.bulkAdd(SAMPLE_SUPPLIERS);
      await db.supplierInvoices.bulkAdd(SAMPLE_SUPPLIER_INVOICES);
      await db.workshopNeeds.bulkAdd(SAMPLE_NEEDS);

      const pmCount = await db.paymentMethods.count();
      if (pmCount === 0) {
        await db.paymentMethods.bulkAdd(DEFAULT_PAYMENT_METHODS);
      }
    }
  );

  // يحسب الأرصدة من السندات ويضبط عدّادات الترقيم على آخر رقم مستخدم
  await reconcileLedger();
}

export async function wipeAllDataClean() {
  await db.transaction(
    'rw',
    [db.orders, db.expenses, db.paymentTransactions, db.supplierDebts, db.supplierInvoices, db.workshopNeeds, db.weekClosings, db.settings],
    async () => {
      await db.orders.clear();
      await db.expenses.clear();
      await db.paymentTransactions.clear();
      await db.supplierDebts.clear();
      await db.supplierInvoices.clear();
      await db.workshopNeeds.clear();
      await db.weekClosings.clear();
      // البداية من جديد تعني أيضاً بدء ترقيم السندات من 1
      await db.settings.update('current_workshop', { receiptCounters: {} });
    }
  );
}

export async function initializeCleanDatabase() {
  const pmCount = await db.paymentMethods.count();
  if (pmCount === 0) {
    await db.paymentMethods.bulkAdd(DEFAULT_PAYMENT_METHODS);
  }
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put(DEFAULT_SETTINGS);
  }
}
