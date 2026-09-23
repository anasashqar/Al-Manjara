export type OrderStatus = 'in_progress' | 'completed' | 'new' | 'ready' | 'delivered' | 'cancelled';

export type CarpentryCategory = 
  | 'doors'        // أبواب وشبابيك
  | 'kitchen'      // مطابخ
  | 'bedroom'      // غرف نوم ودواليب
  | 'decoration'   // ديكورات وخشب جداري
  | 'maintenance'  // صيانة وتجديد
  | 'custom';      // تفصيل خاص

// مرحلة تنفيذ الطلبية (بدل تاريخ التسليم الثابت)
export type WorkStage =
  | 'waiting'          // انتظار: لم يبدأ العمل بعد (الافتراضي للطلبية الجديدة)
  | 'manufacturing'    // قيد التصنيع
  | 'finishing'        // جاهز للدهان
  | 'ready_deliver';   // جاهز للتسليم

export const WORK_STAGE_LABELS: Record<WorkStage, string> = {
  waiting:       'انتظار',
  manufacturing: 'بداية',
  finishing:     'جارٍ',
  ready_deliver: 'جاهز',
};

export const WORK_STAGE_COLORS: Record<WorkStage, string> = {
  waiting:       'bg-slate-50 text-slate-700 border-slate-300',
  manufacturing: 'bg-blue-50 text-blue-700 border-blue-200',
  finishing:     'bg-amber-50 text-amber-700 border-amber-200',
  ready_deliver: 'bg-green-50 text-green-700 border-green-200',
};

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  category: CarpentryCategory;
  description: string;
  woodType: string;
  dimensions?: string;
  totalAmount: number;      // المبلغ الإجمالي بالشيكل
  // الحقول الثلاثة التالية مشتقة من سجل الدفعات (paymentTransactions) ولا تُعدَّل يدوياً
  paidAmount: number;       // المسدد بالشيكل
  discountTotal?: number;   // مجموع الخصومات الممنوحة
  remainingAmount: number;  // المتبقي = الإجمالي - المسدد - الخصومات
  status: OrderStatus;
  workStage?: WorkStage;    // مرحلة التنفيذ الحالية (للطلبيات قيد التنفيذ)
  orderDate: string;        // YYYY-MM-DD
  deliveryDate?: string;    // تاريخ تسليم تقريبي — اختياري
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type ExpenseCategory = 
  | 'raw_materials' // أخشاب وألواح
  | 'hardware'      // إكسسوارات ومفصلات ومقابض
  | 'finishes'      // دهانات وغراء
  | 'wages'         // أجور عمال
  | 'workshop'      // إيجار وكهرباء
  | 'tools'         // صيانة عدد
  | 'transport'     // نقل وشحن
  | 'general';      // نثريات

export interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  category: ExpenseCategory;
  amount: number;           // بالشيكل
  date: string;
  paymentMethod: string;
  supplierName?: string;
  linkedPaymentId?: string;   // سند سداد المورد الذي أنشأ هذا المصروف تلقائياً
  receiptAttachment?: string; // إشعار بنكي أو وصل
  notes?: string;
  createdAt: number;
}

export interface SupplierDebt {
  id: string;
  supplierName: string;
  phone: string;
  category: string;
  // الحقول الثلاثة التالية مشتقة من فواتير المورد وسندات الصرف ولا تُعدَّل يدوياً
  totalInvoiced: number;
  totalPaid: number;
  remainingDebt: number;
  lastPaymentDate?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// فاتورة شراء آجلة من مورد (تزيد دين المورد ولا تُحسب مصروفاً حتى تُدفع)
export interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;   // رقم فاتورة المورد الورقية
  description: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: number;
}

export type PaymentMethodType = 'cash' | 'bank' | 'wallet';

export interface PaymentMethodItem {
  id: string;
  name: string;
  type: PaymentMethodType;
  isActive: boolean;
}

export interface PaymentTransaction {
  id: string;
  receiptNumber: string;    // رقم الوصل الرسمي مثل: W-2026/1001
  type: 'customer_in' | 'supplier_out';
  relatedId: string;
  partyName: string;
  itemPurpose: string;      // البند، مثل: دفعة عربون تفصيل مطبخ
  amount: number;           // المبلغ بالشيكل
  discountAmount?: number;  // الخصم المسجل
  remainingAfter?: number;  // المتبقي على الطلبية بعد هذه الدفعة (لإعادة طباعة السند بشكل صحيح)
  date: string;
  paymentMethod: string;    // نقداً، بنك فلسطين، محفظة جوال بي، محفظة بال بي
  receiptAttachment?: string; // صورة إشعار البنك أو المحفظة
  notes?: string;
  createdAt: number;
}

// احتياجات المنجرة: قائمة مشتريات داخلية
export type NeedCategory = 'tools' | 'wood' | 'materials' | 'other';

export const NEED_CATEGORY_LABELS: Record<NeedCategory, string> = {
  tools: 'أدوات',
  wood: 'خشب',
  materials: 'مواد',
  other: 'أخرى',
};

export interface WorkshopNeed {
  id: string;
  title: string;
  category: NeedCategory;
  notes?: string;
  isDone: boolean;
  addedAt: number;
}

export interface WorkshopSettings {
  id: string;
  workshopName: string;
  managerName: string;
  phone: string;
  address: string;
  currency: string;
  receiptFooter: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSync: boolean;
  lastSyncedAt?: number;
  receiptCounters?: Record<string, number>; // آخر رقم سند صدر في كل سنة (لا يُعاد استخدامه بعد الحذف)
  statsPinHash?: string;                    // بصمة رمز الإحصاءات (4 أرقام)؛ فارغ = بدون رمز
}
