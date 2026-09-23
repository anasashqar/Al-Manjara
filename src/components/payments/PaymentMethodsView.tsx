import React, { useState } from 'react';
import { Plus, Edit2, RotateCcw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { db, resetPaymentMethodsToDefault } from '../../db/dexie';
import type { PaymentMethodItem, PaymentMethodType } from '../../types';

interface PaymentMethodsViewProps {
  methods: PaymentMethodItem[];
}

export const PaymentMethodsView: React.FC<PaymentMethodsViewProps> = ({ methods }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethodType>('bank');

  const handleOpenAdd = () => {
    setEditingMethod(null);
    setName('');
    setType('bank');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: PaymentMethodItem) => {
    setEditingMethod(m);
    setName(m.name);
    setType(m.type);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await db.paymentMethods.update(id, { isActive: !current });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingMethod) {
      await db.paymentMethods.update(editingMethod.id, { name: name.trim(), type });
    } else {
      await db.paymentMethods.add({
        id: `pm-${Date.now()}`,
        name: name.trim(),
        type,
        isActive: true,
      });
    }
    setIsModalOpen(false);
  };

  const handleResetDefaults = async () => {
    if (window.confirm('هل تريد استعادة وسائل الدفع الافتراضية للنظام؟')) {
      await resetPaymentMethodsToDefault();
    }
  };

  return (
    <div className="space-y-2.5 max-w-4xl mx-auto">
      {/* Top action button */}
      <div className="flex justify-end items-center gap-2">
        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-7 inline-flex items-center gap-1.5 px-3 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-medium transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>وسيلة جديدة</span>
          <span className="bg-[#14532d] text-white px-1.5 py-0.2 rounded-[6px] text-[11px] font-mono">
            {methods.length}
          </span>
        </button>
      </div>

      {/* Table with Unified Warm Gold Header */}
      <div className="bg-white rounded-[4px] border border-slate-300 overflow-hidden shadow-2xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-[#e9f0eb] text-slate-900 font-bold border-b border-[#d2dfd6]">
            <tr>
              <th className="py-1.5 px-2.5 text-center w-10 border-l border-[#d2dfd6]/60">#</th>
              <th className="py-1.5 px-2.5 border-l border-[#d2dfd6]/60">اسم وسيلة الدفع</th>
              <th className="py-1.5 px-2.5 text-center border-l border-[#d2dfd6]/60 w-24">النوع</th>
              <th className="py-1.5 px-2.5 text-center border-l border-[#d2dfd6]/60 w-20">الحالة</th>
              <th className="py-1.5 px-2.5 text-center w-20">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {methods.map((m, index) => (
              <tr key={m.id} className="hover:bg-amber-50/15 transition-colors">
                <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono font-medium border-l border-slate-100">
                  {index + 1}
                </td>
                <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-l border-slate-100">
                  {m.name}
                </td>
                <td className="py-1.5 px-2.5 text-center border-l border-slate-100">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-[6px] text-[11px] font-semibold ${
                      m.type === 'cash'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : m.type === 'bank'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {m.type === 'cash' ? 'نقدي' : m.type === 'bank' ? 'بنكي' : 'محفظة'}
                  </span>
                </td>
                <td className="py-1.5 px-2.5 text-center border-l border-slate-100">
                  <input
                    type="checkbox"
                    checked={m.isActive}
                    onChange={() => handleToggleActive(m.id, m.isActive)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded-[4px] border-slate-300 focus:ring-emerald-500 cursor-pointer accent-[#166534]"
                  />
                </td>
                <td className="py-1.5 px-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(m)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-[6px] transition-colors"
                    title="تعديل"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer reset link */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 hover:underline"
        >
          <RotateCcw className="w-3 h-3" />
          <span>استعادة وسائل الدفع الافتراضية للنظام</span>
        </button>
      </div>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMethod ? 'تعديل وسيلة الدفع' : 'إضافة وسيلة دفع جديدة'}
        maxWidth="sm"
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">اسم وسيلة الدفع *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">النوع</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentMethodType)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white"
            >
              <option value="cash">نقدي</option>
              <option value="bank">بنكي</option>
              <option value="wallet">محفظة رقمية</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 rounded-[6px] border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white font-semibold"
            >
              حفظ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
