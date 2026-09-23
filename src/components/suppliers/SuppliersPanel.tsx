import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { db, deleteSupplier } from '../../db/dexie';
import { SupplierFormModal, SupplierInvoiceModal, SupplierPaymentModal } from './SupplierModals';
import { SupplierStatementModal } from './SupplierStatementModal';
import { PaymentVoucherModal } from './PaymentVoucherModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { PaymentTransaction, SupplierDebt, WorkshopSettings } from '../../types';
import { notify } from '../common/Dialogs';

type Dialog = 'form' | 'invoice' | 'pay' | 'statement' | null;

export const SuppliersPanel: React.FC<{ settings: WorkshopSettings }> = ({ settings }) => {
  const suppliers = useLiveQuery(() => db.supplierDebts.toArray(), []) || [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []) || [];
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selected, setSelected] = useState<SupplierDebt | null>(null);
  const [voucher, setVoucher] = useState<PaymentTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierDebt | null>(null);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers
      .filter((s) => !q || s.supplierName.toLowerCase().includes(q) || s.phone.includes(q))
      .sort((a, b) => b.remainingDebt - a.remainingDebt || a.supplierName.localeCompare(b.supplierName, 'ar'));
  }, [suppliers, search]);

  const totalDue = useMemo(() => suppliers.reduce((s, x) => s + x.remainingDebt, 0), [suppliers]);

  const open = (d: Dialog, s: SupplierDebt | null) => {
    setSelected(s);
    setDialog(d);
  };
  const close = () => setDialog(null);

  const handleDelete = (s: SupplierDebt) => {
    setDeleteTarget(s);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier(deleteTarget.id);
      if (dialog === 'statement') close();
    } catch (err: any) {
      notify(err?.message || 'تعذر الحذف');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 max-w-6xl w-full mx-auto">
      {/* Top Bar: Summary + Search + Add Supplier */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-[4px] border border-slate-300 shadow-2xs">
        <div className="font-semibold text-slate-800 text-xs sm:text-sm">
          المتبقي للموردين:{' '}
          <span className="font-mono font-bold text-[#b91c1c] text-sm sm:text-base mr-1">
            {totalDue.toLocaleString('ar-SA')} ₪
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="h-8 w-full pr-8 pl-2.5 text-xs sm:text-sm rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534] bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={() => open('form', null)}
            className="h-8 inline-flex items-center gap-1.5 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>مورد جديد</span>
          </button>
        </div>
      </div>

      {/* Simplified, Clean Table (Matching reference design) */}
      <div className="min-h-0 overflow-auto bg-white rounded-[4px] border border-slate-300 shadow-2xs">
        <table className="w-full text-right text-xs sm:text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
            <tr>
              <th className="py-2.5 px-3 text-center border-l border-[#d2dfd6]/60 w-12">#</th>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60">المورد</th>
              <th className="py-2.5 px-3 text-center border-l border-[#d2dfd6]/60 w-36">المتبقي</th>
              <th className="py-2.5 px-3 text-center w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-sans">
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 font-medium">
                  لا موردين
                </td>
              </tr>
            ) : (
              list.map((s, index) => {
                const hasDebt = s.remainingDebt > 0;
                return (
                  <tr
                    key={s.id}
                    onClick={() => open('statement', s)}
                    className="group hover:bg-amber-50/20 transition-colors cursor-pointer"
                    title="الحساب"
                  >
                    {/* Index */}
                    <td className="py-3 px-3 text-center border-l border-slate-200 font-mono text-slate-500">
                      {index + 1}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-3 border-l border-slate-200">
                      <div className="font-bold text-slate-900">
                        {s.supplierName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 dir-ltr text-right">
                        {s.phone || (s.category ? s.category : '—')}
                      </div>
                    </td>

                    {/* Due Amount */}
                    <td className="py-3 px-3 text-center border-l border-slate-200">
                      {hasDebt ? (
                        <div className="font-bold font-mono text-[#b91c1c] text-sm sm:text-base">
                          {s.remainingDebt.toLocaleString('ar-SA')} ₪
                        </div>
                      ) : (
                        <div className="font-bold text-[#15803d] text-sm">
                          خالص
                        </div>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {hasDebt ? (
                          <button
                            type="button"
                            onClick={() => open('pay', s)}
                            className="h-7 px-3.5 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold shadow-2xs transition-colors"
                          >
                            صرف
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => open('statement', s)}
                            className="h-7 px-3 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          >
                            الحساب
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => open('form', s)}
                          className="p-1 rounded-[4px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          className="p-1 rounded-[4px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <SupplierFormModal isOpen={dialog === 'form'} onClose={close} supplier={selected} />
      <SupplierInvoiceModal isOpen={dialog === 'invoice'} onClose={close} supplier={selected} />
      <SupplierPaymentModal
        isOpen={dialog === 'pay'}
        onClose={close}
        supplier={selected}
        paymentMethods={paymentMethods}
        onPaid={setVoucher}
      />
      <SupplierStatementModal
        isOpen={dialog === 'statement'}
        onClose={close}
        supplier={selected}
        settings={settings}
        onAddInvoice={() => open('invoice', selected)}
        onPay={() => open('pay', selected)}
      />
      <PaymentVoucherModal isOpen={!!voucher} onClose={() => setVoucher(null)} payment={voucher} settings={settings} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="حذف المورد؟"
        message={
          <span className="font-bold text-slate-900">{deleteTarget?.supplierName}</span>
        }
        confirmLabel="حذف"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
