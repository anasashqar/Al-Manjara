import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { todayISO } from '../../utils/date';
import type { Order, PaymentMethodItem, WorkStage } from '../../types';

import { StageDropdown } from './StageDropdown';
import type { InitialDeposit } from '../../db/dexie';
import { notify } from '../common/Dialogs';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Partial<Order>, deposit?: InitialDeposit) => Promise<void>;
  initialOrder?: Order | null;
  paymentMethods: PaymentMethodItem[];
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialOrder,
  paymentMethods,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [depositMethod, setDepositMethod] = useState('نقداً');
  const [workStage, setWorkStage] = useState<WorkStage | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(initialOrder);
  // بالانتظار: المبلغ اختياري لأن السعر قد لا يكون متفقاً عليه بعد
  const isWaiting = workStage === 'waiting';
  const activeMethods = paymentMethods.filter((m) => m.isActive);

  useEffect(() => {
    if (initialOrder) {
      setCustomerName(initialOrder.customerName);
      setCustomerPhone(initialOrder.customerPhone || '');
      setDescription(initialOrder.description || '');
      setTotalAmount(initialOrder.totalAmount || '');
      setDepositAmount('');
      setWorkStage((initialOrder.workStage as WorkStage) || '');
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setDescription('');
      setTotalAmount('');
      setDepositAmount('');
      setWorkStage('waiting'); // افتراضياً: انتظار
      setDepositMethod(activeMethods[0]?.name || 'نقداً');
    }
  }, [initialOrder, isOpen]);

  const numTotal = Number(totalAmount) || 0;
  const numDeposit = Number(depositAmount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !description.trim() || (!isWaiting && numTotal <= 0)) {
      notify('أكمل الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          description: description.trim(),
          totalAmount: numTotal,
          workStage: workStage || undefined,
        },
        !isEditing && numDeposit > 0 ? { amount: numDeposit, paymentMethod: depositMethod } : undefined
      );
      onClose();
    } catch (err: any) {
      console.error('Error saving order:', err);
      notify(err?.message || 'تعذر الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialOrder ? 'تعديل طلبية' : 'طلبية جديدة'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs sm:text-sm">
        {/* Row 1: الزبون والهاتف */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">الزبون *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-medium text-slate-900"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-semibold mb-1">الهاتف</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="059xxxxxxx"
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-mono dir-ltr text-right"
            />
          </div>
        </div>

        {/* Row 2: البيان */}
        <div>
          <label className="block text-slate-700 font-semibold mb-1">البيان *</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white text-slate-900"
          />
        </div>

        {/* Row 3: الحساب المالي (المبلغ والعربون) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-[4px] border border-slate-200">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">{isWaiting ? 'المبلغ ₪' : 'المبلغ ₪ *'}</label>
            <input
              type="number"
              min={isWaiting ? '0' : '1'}
              step="any"
              required={!isWaiting}
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 bg-white font-mono font-bold text-slate-900"
            />
          </div>

          {!isEditing ? (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">عربون</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={numTotal || undefined}
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-1/2 px-3 py-1.5 rounded-[4px] border border-slate-300 bg-white font-mono font-bold text-[#15803d]"
                />
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-1/2 px-2 py-1.5 rounded-[4px] border border-slate-300 bg-white text-xs"
                >
                  {activeMethods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">المدفوع</label>
              <div className="w-full px-3 py-1.5 rounded-[4px] border border-slate-300 bg-slate-100 font-mono font-bold text-[#15803d]">
                {initialOrder?.paidAmount?.toLocaleString('ar-SA') || 0}
              </div>
            </div>
          )}
        </div>

        {/* Row 4: مرحلة التنفيذ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-700 font-semibold">مرحلة التنفيذ</label>
          </div>
          <StageDropdown
            value={workStage}
            onChange={(stage) => setWorkStage(stage)}
            disabled={initialOrder?.status === 'completed'}
            fullWidth
            placeholder="— مرحلة —"
          />
        </div>

        {/* Action Buttons */}
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
