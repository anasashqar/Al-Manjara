import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Printer, 
  Layers,
  PieChart
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { ExpenseCategoryBadge } from '../common/Badge';
import type { Order, Expense, SupplierDebt, WorkshopSettings, ExpenseCategory } from '../../types';

interface ReportsViewProps {
  orders: Order[];
  expenses: Expense[];
  suppliers: SupplierDebt[];
  settings: WorkshopSettings;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  orders,
  expenses,
  suppliers,
  settings,
}) => {
  const [period, setPeriod] = useState<'all' | 'month' | 'quarter'>('all');

  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM

  // Filter by period
  const filteredOrders = useMemo(() => {
    if (period === 'all') return orders;
    if (period === 'month') return orders.filter((o) => o.orderDate.startsWith(currentMonth));
    // Last 90 days
    const quarterAgo = new Date();
    quarterAgo.setDate(quarterAgo.getDate() - 90);
    const qStr = quarterAgo.toISOString().split('T')[0];
    return orders.filter((o) => o.orderDate >= qStr);
  }, [orders, period, currentMonth]);

  const filteredExpenses = useMemo(() => {
    if (period === 'all') return expenses;
    if (period === 'month') return expenses.filter((e) => e.date.startsWith(currentMonth));
    const quarterAgo = new Date();
    quarterAgo.setDate(quarterAgo.getDate() - 90);
    const qStr = quarterAgo.toISOString().split('T')[0];
    return expenses.filter((e) => e.date >= qStr);
  }, [expenses, period, currentMonth]);

  // Financial calculations
  const totalSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [filteredOrders]);

  const totalCollected = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.paidAmount, 0);
  }, [filteredOrders]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Realized Net Profit = Collected cash - Total expenses
  const realizedProfit = totalCollected - totalExpenses;

  // Projected Net Profit = Total Sales - Total expenses
  const projectedProfit = totalSales - totalExpenses;

  // Outstanding Customer debts in this period
  const customerDebts = filteredOrders.reduce((sum, o) => sum + o.remainingAmount, 0);

  // Profit Margin %
  const profitMargin = totalSales > 0 ? ((projectedProfit / totalSales) * 100).toFixed(1) : '0';

  // Category Breakdown for expenses
  const expenseBreakdown = useMemo(() => {
    const categories: Record<ExpenseCategory, number> = {
      raw_materials: 0,
      hardware: 0,
      finishes: 0,
      wages: 0,
      workshop: 0,
      tools: 0,
      transport: 0,
      general: 0,
    };

    filteredExpenses.forEach((e) => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });

    return Object.entries(categories)
      .map(([cat, amount]) => ({
        category: cat as ExpenseCategory,
        amount,
        percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenses]);

  return (
    <div className="space-y-6">
      {/* Top Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-800 text-base">تقرير الأرباح والتحليل المالي</h3>
          <p className="text-xs text-slate-500">حساب الأرباح المحققة ومصروفات التشغيل</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                period === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-md transition-colors ${
                period === 'month' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1 rounded-md transition-colors ${
                period === 'quarter' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              آخر 3 أشهر
            </button>
          </div>

          {/* Print button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium"
            title="طباعة التقرير"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Net Profit */}
        <StatCard
          title="صافي الربح الفعلي (المحصل)"
          value={realizedProfit}
          currency={settings.currency}
          icon={Wallet}
          variant={realizedProfit >= 0 ? 'success' : 'danger'}
          subtitle="المقبوض الفعلي - المصروفات"
          badge={realizedProfit >= 0 ? 'سيولة موجبة' : 'عجز سيولة'}
        />

        {/* Projected Total Profit */}
        <StatCard
          title="الربح الدفتري المتوقع"
          value={projectedProfit}
          currency={settings.currency}
          icon={TrendingUp}
          variant="primary"
          subtitle={`هامش ربح تقديري: ${profitMargin}%`}
          badge="شامل ديون الطلبيات"
        />

        {/* Total Collected Sales */}
        <StatCard
          title="إجمالي المبيعات المحصلة"
          value={totalCollected}
          currency={settings.currency}
          icon={ArrowDownLeft}
          variant="neutral"
          subtitle={`من أصل ${totalSales.toLocaleString('ar-SA')} ${settings.currency}`}
        />

        {/* Total Expenses */}
        <StatCard
          title="إجمالي المصروفات المسجلة"
          value={totalExpenses}
          currency={settings.currency}
          icon={ArrowUpRight}
          variant="danger"
          subtitle={`${filteredExpenses.length} حركة صرف`}
        />
      </div>

      {/* Breakdown Section: Category Distribution & Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Expense Category Breakdown */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-500" />
              <h4 className="font-bold text-slate-800 text-sm">توزيع المصروفات التشغيلية</h4>
            </div>
            <span className="font-mono text-xs text-slate-500">
              الإجمالي: {totalExpenses.toLocaleString('ar-SA')} {settings.currency}
            </span>
          </div>

          {expenseBreakdown.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا توجد مصروفات مسجلة لهذه الفترة
            </div>
          ) : (
            <div className="space-y-3.5">
              {expenseBreakdown.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <ExpenseCategoryBadge category={item.category} />
                      <span className="font-mono text-slate-400 text-[11px]">{item.percent}%</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {item.amount.toLocaleString('ar-SA')} <span className="font-sans text-[10px] text-slate-400">{settings.currency}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-700 rounded-full transition-all duration-300"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Balance Sheet & Profit Summary */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layers className="w-4 h-4 text-slate-500" />
              <h4 className="font-bold text-slate-800 text-sm">موجز المركز المالي</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">إجمالي قيمة العقود والطلبيات:</span>
                <span className="font-mono font-bold text-slate-800">
                  {totalSales.toLocaleString('ar-SA')} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">السيولة المقبوضة فعلياً:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {totalCollected.toLocaleString('ar-SA')} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">ديون متبقية عند العملاء:</span>
                <span className="font-mono font-bold text-amber-700">
                  {customerDebts.toLocaleString('ar-SA')} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">المصروفات المنصرفة:</span>
                <span className="font-mono font-bold text-rose-700">
                  {totalExpenses.toLocaleString('ar-SA')} {settings.currency}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-600">مستحقات الموردين القائمة:</span>
                <span className="font-mono font-bold text-rose-800">
                  {suppliers.reduce((acc, s) => acc + s.remainingDebt, 0).toLocaleString('ar-SA')} {settings.currency}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">صافي الأرباح المحققة بعد المصاريف:</span>
            <div className={`text-xl font-bold font-mono mt-1 ${realizedProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {realizedProfit.toLocaleString('ar-SA')} {settings.currency}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
