import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { todayISO } from '../../utils/date';
import type { Expense, ExpenseCategory, PaymentMethodItem } from '../../types';
import { notify } from '../common/Dialogs';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: Partial<Expense>) => Promise<void>;
  initialExpense?: Expense | null;
  paymentMethods: PaymentMethodItem[];
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialExpense,
  paymentMethods,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('raw_materials');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('نقداً');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialExpense) {
      setTitle(initialExpense.title);
      setCategory(initialExpense.category);
      setAmount(initialExpense.amount);
      setDate(initialExpense.date);
      setPaymentMethod(initialExpense.paymentMethod || 'نقداً');
    } else {
      setTitle('');
      setCategory('raw_materials');
      setAmount('');
      setDate(todayISO());
      setPaymentMethod(paymentMethods.find((m) => m.isActive)?.name || 'نقداً');
    }
  }, [initialExpense, isOpen]);

  // الوسائل المفعلة + الوسيلة المحفوظة على المصروف حتى لو عُطلت لاحقاً
  const methodOptions = paymentMethods
    .filter((m) => m.isActive || m.name === paymentMethod)
    .map((m) => m.name);
  if (paymentMethod && !methodOptions.includes(paymentMethod)) methodOptions.unshift(paymentMethod);
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
        category,
        amount: Number(amount),
        date: date || todayISO(),
        paymentMethod,
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
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">البيان *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-medium text-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 font-mono font-bold text-[#b91c1c] bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">التصنيف</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white"
            >
              <option value="raw_materials">أخشاب وألواح</option>
              <option value="hardware">إكسسوارات ومفصلات</option>
              <option value="finishes">دهانات وغراء</option>
              <option value="wages">أجور عمال</option>
              <option value="workshop">إيجار وكهرباء</option>
              <option value="tools">صيانة عدد</option>
              <option value="transport">نقل وشحن</option>
              <option value="general">نثريات</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">الوسيلة</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white"
            >
              {methodOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">التاريخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-[6px] border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-8 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'حفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
