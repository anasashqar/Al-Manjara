import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import { printElementToA4 } from '../../utils/printHelper';
import type { Order, Expense, WorkshopSettings } from '../../types';

interface FinancialsViewProps {
  orders: Order[];
  expenses: Expense[];
  settings: WorkshopSettings;
}

export const FinancialsView: React.FC<FinancialsViewProps> = ({
  orders,
  expenses,
  settings,
}) => {
  const totalCollected = useMemo(() => orders.reduce((sum, o) => sum + o.paidAmount, 0), [orders]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const netProfit = totalCollected - totalExpenses;

  const handlePrint = () => {
    printElementToA4('printable-financial-statement', 'كشف_الأرباح_المالية');
  };

  return (
    <div className="space-y-3 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex justify-between items-center bg-white px-3.5 py-2.5 rounded-[4px] border border-slate-300 shadow-2xs">
        <h2 className="font-bold text-slate-900 text-sm sm:text-base font-display">
          الأرباح المالية
        </h2>

        <button
          type="button"
          onClick={handlePrint}
          className="h-8 inline-flex items-center gap-1.5 px-3.5 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>طباعة كشف الحساب</span>
        </button>
      </div>

      {/* Printable Area Wrapper */}
      <div id="printable-financial-statement" className="space-y-3 bg-transparent">
        {/* Printable Header */}
        <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold font-display text-slate-900">{settings.workshopName}</h1>
              <p className="text-xs text-slate-600 mt-0.5">كشف الحساب وصافي الأرباح</p>
            </div>
            <div className="text-left text-xs font-mono text-slate-600">
              <div>{new Date().toLocaleDateString('ar-EG')}</div>
            </div>
          </div>
        </div>

        {/* Clean, Unified Financial Summary Bar (No weird cards, no floating icons, no empty spaces) */}
        <div className="bg-white p-4 rounded-[4px] border border-slate-300 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Primary Net Profit */}
            <div>
              <span className="text-xs text-slate-500 font-semibold block">صافي الربح الفعلي</span>
              <div
                className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight mt-1 ${
                  netProfit >= 0 ? 'text-[#15803d]' : 'text-[#b91c1c]'
                }`}
              >
                {netProfit.toLocaleString('ar-SA')} <span className="text-sm font-sans font-normal text-slate-600">شيكل</span>
              </div>
            </div>

            {/* Income vs Expenses Summary */}
            <div className="flex items-center gap-6 sm:gap-8 border-t sm:border-t-0 sm:border-r border-slate-200 pt-3 sm:pt-0 sm:pr-8">
              <div>
                <span className="text-xs text-slate-500 block">المقبوضات</span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                  {totalCollected.toLocaleString('ar-SA')} شيكل
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">المصروفات</span>
                <span className="text-base sm:text-lg font-bold font-mono text-slate-700 mt-0.5 block">
                  {totalExpenses.toLocaleString('ar-SA')} شيكل
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Earnings Journal Table */}
        <div className="bg-white rounded-[4px] border border-slate-300 overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-slate-200 font-bold text-slate-800 text-xs sm:text-sm">
            سجل أرباح الطلبيات
          </div>
          <table className="w-full text-right text-xs sm:text-sm border-collapse">
            <thead className="bg-[#e9f0eb] text-slate-900 font-bold border-b border-[#d2dfd6]">
              <tr>
                <th className="py-2 px-3 text-center border-l border-[#d2dfd6]/60 w-24">الطلب</th>
                <th className="py-2 px-3 border-l border-[#d2dfd6]/60 w-44">الزبون</th>
                <th className="py-2 px-3 border-l border-[#d2dfd6]/60">البيان</th>
                <th className="py-2 px-3 text-center border-l border-[#d2dfd6]/60 w-32">المبلغ</th>
                <th className="py-2 px-3 text-center border-l border-[#d2dfd6]/60 w-28">الحالة</th>
                <th className="py-2 px-3 text-center w-32">المحصل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-medium">
                    لا توجد بيانات أرباح مسجلة حالياً
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isCompleted = o.status === 'completed' || o.status === 'delivered' || o.status === 'ready';
                  return (
                    <tr key={o.id} className="hover:bg-amber-50/15 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 border-l border-slate-100">
                        {o.orderNumber}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 border-l border-slate-100">
                        {o.customerName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 border-l border-slate-100">
                        {o.description}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 border-l border-slate-100">
                        {o.totalAmount.toLocaleString('ar-SA')}
                      </td>
                      <td className="py-2.5 px-3 text-center border-l border-slate-100">
                        <span
                          className={`px-2.5 py-0.5 rounded-[6px] text-xs font-semibold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCompleted ? 'مكتمل' : 'قيد التنفيذ'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#15803d]">
                        {o.paidAmount.toLocaleString('ar-SA')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
