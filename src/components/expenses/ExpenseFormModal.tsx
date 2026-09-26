import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { Expense, PaymentMethodItem } from '../../types';
import { notify } from '../common/Dialogs';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Partial<Expense>) => Promise<void>;
  initialExpense?: Expense | null;
  paymentMethods: PaymentMethodItem[];
  // البيانات السابقة كاقتراحات، حتى يُكتب البند نفسه بنفس الاسم كل مرة
  titleSuggestions: string[];
}

// نموذج مبسط: البيان والمبلغ فقط. التاريخ اليوم والوسيلة الافتراضية،
// والمصروف يدخل حساب الأسبوع المفتوح حتى يُقفل
export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExpense,
  paymentMethods,
  titleSuggestions,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTitle(initialExpense?.title ?? '');
    setAmount(initialExpense?.amount ?? '');
  }, [initialExpense, isOpen]);

  const isLinkedToSupplier = !!initialExpense?.linkedPaymentId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || Number(amount) <= 0) {
      notify('أكمل الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        amount: Number(amount),
        ...(initialExpense ? {} : { paymentMethod: paymentMethods.find((m) => m.isActive)?.name || 'نقداً' }),
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving expense:', err);
      notify(err?.message || 'تعذر الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialExpense ? 'تعديل مصروف' : 'مصروف جديد'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs sm:text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1">البيان *</label>
            <input
              type="text"
              required
              autoFocus
              list="expense-titles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-medium text-slate-900"
            />
            <datalist id="expense-titles">
              {titleSuggestions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">المبلغ ₪ *</label>
            <input
              type="number"
              min="0.1"
              step="any"
              required
              disabled={isLinkedToSupplier}
              title={isLinkedToSupplier ? 'مرتبط بسند صرف' : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 font-mono font-bold text-[#b91c1c] bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-[6px] border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-8 px-5 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white font-semibold shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'حفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
