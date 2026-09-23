import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import {
  createSupplier,
  updateSupplier,
  addSupplierInvoice,
  addSupplierPayment,
  getNextInvoiceNumber,
} from '../../db/dexie';
import { todayISO } from '../../utils/date';
import { EXPENSE_CATEGORY_LABELS } from '../../utils/finance';
import type { ExpenseCategory, PaymentMethodItem, PaymentTransaction, SupplierDebt } from '../../types';
import { notify } from '../common/Dialogs';

export const inputCls =
  'w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534] bg-white text-slate-900';
const labelCls = 'block text-slate-700 font-semibold mb-1';

const FormActions: React.FC<{ onClose: () => void; busy: boolean }> = ({ onClose, busy }) => (
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
      disabled={busy}
      className="h-8 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white font-semibold disabled:opacity-50"
    >
      حفظ
    </button>
  </div>
);

async function runSafely(fn: () => Promise<void>, setBusy: (b: boolean) => void) {
  setBusy(true);
  try {
    await fn();
  } catch (err: any) {
    notify(err?.message || 'تعذر الحفظ');
  } finally {
    setBusy(false);
  }
}

// ───────── مورد جديد / تعديل ─────────

export const SupplierFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDebt | null;
}> = ({ isOpen, onClose, supplier }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [opening, setOpening] = useState<number | ''>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(supplier?.supplierName || '');
    setPhone(supplier?.phone || '');
    setCategory(supplier?.category || '');
    setOpening('');
  }, [supplier, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSafely(async () => {
      const data = { supplierName: name, phone, category };
      if (supplier) await updateSupplier(supplier.id, data);
      else await createSupplier(data, Number(opening) || 0);
      onClose();
    }, setBusy);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={supplier ? 'تعديل مورد' : 'مورد جديد'} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className={labelCls}>الاسم *</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelCls}>الهاتف</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className={labelCls}>التصنيف</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
          </div>
        </div>
        {!supplier && (
          <div>
            <label className={labelCls}>رصيد سابق</label>
            <input
              type="number"
              min="0"
              step="any"
              value={opening}
              onChange={(e) => setOpening(e.target.value === '' ? '' : Number(e.target.value))}
              className={`${inputCls} font-mono`}
            />
          </div>
        )}
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
};

// ───────── فاتورة شراء آجل ─────────

export const SupplierInvoiceModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDebt | null;
}> = ({ isOpen, onClose, supplier }) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAmount('');
    setDate(todayISO());
    setDescription('');
    // توليد رقم الفاتورة تلقائياً من النظام
    getNextInvoiceNumber().then(setInvoiceNumber);
  }, [supplier, isOpen]);

  if (!supplier) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSafely(async () => {
      await addSupplierInvoice(supplier.id, { amount: Number(amount), date, invoiceNumber, description });
      onClose();
    }, setBusy);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`شراء — ${supplier.supplierName}`} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelCls}>المبلغ *</label>
            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className={`${inputCls} font-mono font-bold`}
            />
          </div>
          <div>
            <label className={labelCls}>التاريخ</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} font-mono`} />
          </div>
        </div>
        <div>
          <label className={labelCls}>البيان</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
};

// ───────── سداد لمورد (سند صرف) ─────────

export const SupplierPaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDebt | null;
  paymentMethods: PaymentMethodItem[];
  onPaid: (tx: PaymentTransaction) => void;
}> = ({ isOpen, onClose, supplier, paymentMethods, onPaid }) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('raw_materials');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const activeMethods = paymentMethods.filter((m) => m.isActive);

  useEffect(() => {
    setAmount(supplier && supplier.remainingDebt > 0 ? supplier.remainingDebt : '');
    setMethod(activeMethods[0]?.name || 'نقداً');
    setDate(todayISO());
    setCategory('raw_materials');
    setNotes('');
  }, [supplier, isOpen]);

  if (!supplier) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSafely(async () => {
      const tx = await addSupplierPayment(supplier.id, {
        amount: Number(amount),
        paymentMethod: method,
        date,
        notes,
        expenseCategory: category,
      });
      onClose();
      onPaid(tx);
    }, setBusy);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`صرف — ${supplier.supplierName}`} maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="flex justify-between bg-slate-50 border border-slate-200 rounded-[4px] px-2.5 py-2">
          <span className="text-slate-500">المتبقي</span>
          <span className="font-mono font-bold text-[#b91c1c]">
            {supplier.remainingDebt.toLocaleString('ar-SA')} ₪
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelCls}>المبلغ *</label>
            <input
              type="number"
              min="0.01"
              max={supplier.remainingDebt || undefined}
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className={`${inputCls} font-mono font-bold`}
            />
          </div>
          <div>
            <label className={labelCls}>التاريخ</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} font-mono`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className={labelCls}>الوسيلة</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              {activeMethods.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>البيان</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={inputCls}>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>ملاحظات</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
        </div>
        <FormActions onClose={onClose} busy={busy} />
      </form>
    </Modal>
  );
};
