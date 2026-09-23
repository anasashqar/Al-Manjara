import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { SupplierDebt } from '../../types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplierData: Partial<SupplierDebt>) => Promise<void>;
  initialSupplier?: SupplierDebt | null;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSupplier,
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [totalInvoiced, setTotalInvoiced] = useState<number | ''>('');
  const [totalPaid, setTotalPaid] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSupplier) {
      setSupplierName(initialSupplier.supplierName);
      setPhone(initialSupplier.phone || '');
      setCategory(initialSupplier.category || '');
      setTotalInvoiced(initialSupplier.totalInvoiced);
      setTotalPaid(initialSupplier.totalPaid);
      setNotes(initialSupplier.notes || '');
    } else {
      setSupplierName('');
      setPhone('');
      setCategory('');
      setTotalInvoiced('');
      setTotalPaid('');
      setNotes('');
    }
  }, [initialSupplier, isOpen]);

  const numInvoiced = Number(totalInvoiced) || 0;
  const numPaid = Number(totalPaid) || 0;
  const remainingDebt = Math.max(0, numInvoiced - numPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('يرجى إدخال اسم المورد');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        supplierName: supplierName.trim(),
        phone: phone.trim(),
        category: category.trim() || 'مورد عام',
        totalInvoiced: numInvoiced,
        totalPaid: numPaid,
        remainingDebt,
        notes: notes.trim() || undefined,
        updatedAt: Date.now(),
      });
      onClose();
    } catch (err) {
      console.error('Save supplier error:', err);
      alert('حدث خطأ أثناء حفظ بيانات المورد');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialSupplier ? 'تعديل بيانات المورد' : 'مورد جديد'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        <div>
          <label className="block text-slate-700 font-medium mb-1">
            المورد *
          </label>
          <input
            type="text"
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-stone-600 bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-stone-600 bg-white font-mono text-left"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              نوع التوريد
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-stone-600 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-slate-700 font-medium mb-1">
              الفواتير
            </label>
            <input
              type="number"
              min="0"
              value={totalInvoiced}
              onChange={(e) => setTotalInvoiced(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-stone-600 bg-white font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              المدفوع
            </label>
            <input
              type="number"
              min="0"
              value={totalPaid}
              onChange={(e) => setTotalPaid(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-stone-600 bg-white font-mono font-bold text-emerald-700"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              المتبقي
            </label>
            <div className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-rose-700">
              {remainingDebt.toLocaleString('ar-SA')}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-medium mb-1">
            ملاحظات
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-stone-600 bg-white"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-lg bg-stone-800 text-white hover:bg-stone-900 font-medium disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
