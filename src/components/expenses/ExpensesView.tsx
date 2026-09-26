import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';
import { deleteExpense } from '../../db/dexie';
import type { Expense, WorkshopSettings } from '../../types';
import { newestFirst } from '../../utils/docNumber';
import { ask, notify } from '../common/Dialogs';
import { formatDayMonth } from '../../utils/period';

interface ExpensesViewProps {
  expenses: Expense[];
  settings: WorkshopSettings;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onOpenNewExpense,
  onEditExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // الأسبوع المفتوح فقط؛ المصاريف المُقفلة في المالية ← الأسابيع المُقفلة
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        if (e.closingId) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.expenseNumber.toLowerCase().includes(q) ||
          (e.supplierName && e.supplierName.toLowerCase().includes(q))
        );
      })
      .sort(newestFirst((e) => e.date, (e) => e.expenseNumber));
  }, [expenses, searchQuery]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleDelete = async (exp: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await ask('حذف المصروف؟', {
      message: exp.linkedPaymentId ? 'يُحذف معه سند الصرف' : exp.title,
    });
    if (!ok) return;
    try {
      await deleteExpense(exp.id);
    } catch (err: any) {
      notify(err?.message || 'تعذر الحذف');
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 max-w-6xl w-full mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-[4px] border border-slate-300 shadow-2xs">
        <div className="font-semibold text-slate-800 text-xs sm:text-sm">
          المجموع:{' '}
          <span className="font-mono font-bold text-[#b91c1c] text-sm sm:text-base mr-1">
            {totalAmount.toLocaleString('ar-SA')} ₪
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              className="h-8 w-full pr-8 pl-2.5 text-xs sm:text-sm rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534] bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={onOpenNewExpense}
            className="h-8 inline-flex items-center gap-1.5 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>مصروف جديد</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="min-h-0 overflow-auto bg-white rounded-[4px] border border-slate-300 shadow-2xs">
        <table className="w-full text-right text-xs sm:text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
            <tr>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60">البيان</th>
              <th className="py-2.5 px-3 text-center border-l border-[#d2dfd6]/60 w-32">المبلغ</th>
              <th className="py-2.5 px-3 text-center border-l border-[#d2dfd6]/60 w-28">التاريخ</th>
              <th className="py-2.5 px-3 text-center w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-sans">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                  لا مصروفات
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-amber-50/15 transition-colors">
                  <td className="py-3 px-3 border-l border-slate-200">
                    <span className="font-semibold text-slate-900">{exp.title}</span>
                  </td>
                  <td className="py-3 px-3 text-center border-l border-slate-200 font-mono font-bold text-[#b91c1c]">
                    {exp.amount.toLocaleString('ar-SA')}
                  </td>
                  <td className="py-3 px-3 text-center border-l border-slate-200 text-xs text-slate-600">
                    {formatDayMonth(exp.date)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditExpense(exp)}
                        className="p-1.5 rounded-[6px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(exp, e)}
                        className="p-1.5 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
