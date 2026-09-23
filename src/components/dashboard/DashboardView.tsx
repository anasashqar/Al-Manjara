import React from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  AlertCircle,
  Plus,
  Hammer
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { StickyTable } from '../common/StickyTable';
import { OrderStatusBadge, CarpentryCategoryBadge } from '../common/Badge';
import type { Order, Expense, SupplierDebt, WorkshopSettings } from '../../types';

interface DashboardViewProps {
  orders: Order[];
  expenses: Expense[];
  suppliers: SupplierDebt[];
  settings: WorkshopSettings;
  onOpenNewOrder: () => void;
  onOpenNewExpense: () => void;
  onOpenPaymentModal: () => void;
  onNavigateToOrders: () => void;
  onNavigateToDebts: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  expenses,
  suppliers,
  settings,
  onOpenNewOrder,
  onOpenNewExpense,
  onOpenPaymentModal,
  onNavigateToOrders,
  onNavigateToDebts,
}) => {
  // Financial sums
  const totalCollected = orders.reduce((sum, o) => sum + o.paidAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const realizedProfit = totalCollected - totalExpenses;

  // Active orders (new + in_progress)
  const activeOrders = orders.filter((o) => o.status === 'new' || o.status === 'in_progress');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  // Debts
  const customerDebts = orders.reduce((sum, o) => sum + o.remainingAmount, 0);
  const supplierDebts = suppliers.reduce((sum, s) => sum + s.remainingDebt, 0);

  // Recent 6 orders
  const recentOrders = [...orders]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  // Recent 5 expenses
  const recentExpenses = [...expenses]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  const orderColumns = [
    {
      key: 'orderNumber',
      header: 'رقم الطلب',
      width: '90px',
      render: (o: Order) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
          {o.orderNumber}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'العميل',
      render: (o: Order) => (
        <div>
          <span className="font-semibold text-slate-800">{o.customerName}</span>
          <span className="block text-xs text-slate-400">{o.customerPhone || '—'}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'العمل',
      render: (o: Order) => (
        <div className="flex items-center gap-1.5">
          <CarpentryCategoryBadge category={o.category} />
          <span className="text-xs text-slate-600 truncate max-w-[140px]">{o.description}</span>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'المبلغ',
      width: '110px',
      render: (o: Order) => (
        <span className="font-mono font-bold text-slate-800">
          {o.totalAmount.toLocaleString('ar-SA')} <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
        </span>
      ),
    },
    {
      key: 'remainingAmount',
      header: 'المتبقي',
      width: '110px',
      render: (o: Order) => (
        <span className={`font-mono text-xs font-semibold ${o.remainingAmount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
          {o.remainingAmount > 0 ? `${o.remainingAmount.toLocaleString('ar-SA')} ${settings.currency}` : 'مسدد بالكامل'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'الحالة',
      width: '110px',
      render: (o: Order) => <OrderStatusBadge status={o.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-800">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">{settings.workshopName}</h3>
            <p className="text-xs text-slate-500">
              ملخص سير العمل والسيولة النقدية اليومية
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewOrder}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-800 text-white hover:bg-stone-900 text-xs font-medium transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>طلبية جديدة</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-medium transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>تسجيل مصروف</span>
          </button>
          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            <span>سداد دفعة</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="صافي الربح الفعلي"
          value={realizedProfit}
          currency={settings.currency}
          icon={TrendingUp}
          variant={realizedProfit >= 0 ? 'success' : 'danger'}
          subtitle="السيولة المحصلة بعد خصم المصاريف"
        />

        <StatCard
          title="الطلبيات النشطة بالورشة"
          value={activeOrders.length}
          icon={Clock}
          variant="primary"
          subtitle={`${readyOrders.length} طلبية جاهزة للتسليم`}
        />

        <StatCard
          title="ديون العملاء (لنا)"
          value={customerDebts}
          currency={settings.currency}
          icon={ShoppingBag}
          variant="warning"
          subtitle="مبالغ مؤجلة على طلبيات قيد العمل"
        />

        <StatCard
          title="ديون الموردين (علينا)"
          value={supplierDebts}
          currency={settings.currency}
          icon={AlertCircle}
          variant="danger"
          subtitle="فواتير أخشاب ومستلزمات مستحقة"
        />
      </div>

      {/* Main Content: Recent Orders & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm">أحدث الطلبيات والمبيعات</h4>
            <button
              type="button"
              onClick={onNavigateToOrders}
              className="text-xs text-stone-700 hover:text-stone-900 font-medium hover:underline"
            >
              عرض كافة الطلبيات ({orders.length}) &larr;
            </button>
          </div>

          <StickyTable
            columns={orderColumns}
            data={recentOrders}
            keyExtractor={(item) => item.id}
            emptyMessage="لا توجد طلبيات مسجلة"
            maxHeight="max-h-[360px]"
          />
        </div>

        {/* Right 1 Col: Recent Expenses and Debt summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm">أحدث المصروفات</h4>
              <span className="font-mono text-xs text-rose-700 font-bold">
                {totalExpenses.toLocaleString('ar-SA')} {settings.currency}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {recentExpenses.length === 0 ? (
                <div className="py-6 text-center text-slate-400">لا توجد مصروفات مسجلة</div>
              ) : (
                recentExpenses.map((exp) => (
                  <div key={exp.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800 line-clamp-1">{exp.title}</p>
                      <span className="text-[11px] text-slate-400 font-mono">{exp.date}</span>
                    </div>
                    <span className="font-mono font-bold text-rose-700 whitespace-nowrap">
                      {exp.amount.toLocaleString('ar-SA')} {settings.currency}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick status box for debts */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-amber-800 font-semibold block">متابعة الديون والتحصيل</span>
              <span className="text-amber-700 text-[11px]">
                {customerDebts > 0 ? `هناك ${customerDebts.toLocaleString('ar-SA')} ${settings.currency} بانتظار التحصيل` : 'تم تحصيل كافة الديون'}
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateToDebts}
              className="px-3 py-1.5 rounded-lg bg-amber-800 text-white font-medium hover:bg-amber-900 transition-colors whitespace-nowrap"
            >
              فتح الديون
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
