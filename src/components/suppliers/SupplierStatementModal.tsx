import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Printer, Trash2, Plus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { db, deletePayment, deleteSupplierInvoice } from '../../db/dexie';
import { printElementToA4 } from '../../utils/printHelper';
import { PaymentVoucherModal } from './PaymentVoucherModal';
import type { PaymentTransaction, SupplierDebt, WorkshopSettings } from '../../types';
import { ask, notify } from '../common/Dialogs';

interface Row {
  id: string;
  date: string;
  createdAt: number;
  text: string;
  debit: number;  // فاتورة تزيد الدين
  credit: number; // دفعة تنقصه
  payment?: PaymentTransaction;
  balance: number;
}


export const SupplierStatementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDebt | null;
  settings: WorkshopSettings;
  onAddInvoice?: (supplier: SupplierDebt) => void;
  onPay?: (supplier: SupplierDebt) => void;
}> = ({ isOpen, onClose, supplier, settings, onAddInvoice, onPay }) => {
  const supplierId = supplier?.id ?? '';
  const invoices = useLiveQuery(() => db.supplierInvoices.where('supplierId').equals(supplierId).toArray(), [supplierId]) || [];
  const payments = useLiveQuery(() => db.paymentTransactions.where('relatedId').equals(supplierId).toArray(), [supplierId]) || [];
  const live = useLiveQuery(() => db.supplierDebts.get(supplierId), [supplierId]);
  const [voucher, setVoucher] = useState<PaymentTransaction | null>(null);

  const rows = useMemo(() => {
    const list: Omit<Row, 'balance'>[] = [
      ...invoices.map((i) => ({
        id: i.id,
        date: i.date,
        createdAt: i.createdAt,
        text: i.invoiceNumber ? `${i.description} (${i.invoiceNumber})` : i.description,
        debit: i.amount,
        credit: 0,
      })),
      ...payments
        .filter((p) => p.type === 'supplier_out')
        .map((p) => ({
          id: p.id,
          date: p.date,
          createdAt: p.createdAt,
          text: `صرف — ${p.paymentMethod}`,
          debit: 0,
          credit: p.amount,
          payment: p,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

    let balance = 0;
    return list.map((r) => {
      balance = Math.round((balance + r.debit - r.credit) * 100) / 100;
      return { ...r, balance };
    });
  }, [invoices, payments]);

  if (!supplier) return null;
  const current = live || supplier;

  const handleDelete = async (r: Row) => {
    if (!(await ask(r.payment ? `حذف السند ${r.payment.receiptNumber}؟` : 'حذف الشراء؟'))) return;
    try {
      if (r.payment) await deletePayment(r.id);
      else await deleteSupplierInvoice(r.id);
    } catch (err: any) {
      notify(err?.message || 'تعذر الحذف');
    }
  };

  const td = 'py-2 px-3 border-l border-slate-200';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={current.supplierName}
      maxWidth="2xl"
      headerActions={
        <div className="flex items-center gap-1.5 no-print">
          {onAddInvoice && (
            <button
              type="button"
              onClick={() => onAddInvoice(current)}
              className="h-7 inline-flex items-center gap-1 px-2.5 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>شراء</span>
            </button>
          )}
          {onPay && current.remainingDebt > 0 && (
            <button
              type="button"
              onClick={() => onPay(current)}
              className="h-7 inline-flex items-center gap-1 px-2.5 rounded-[6px] bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <span>صرف</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => printElementToA4('printable-supplier-statement', `كشف_${current.supplierName.replace(/\s+/g, '_')}`)}
            className="h-7 inline-flex items-center gap-1 px-2.5 rounded-[6px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>طباعة</span>
          </button>
        </div>
      }
    >
      <div id="printable-supplier-statement" className="space-y-3.5 text-xs">
        {/* Print Header */}
        <div className="hidden print:flex justify-between border-b-2 border-slate-800 pb-2">
          <span className="font-bold text-base">{settings.workshopName}</span>
          <span className="font-bold">كشف حساب مورد: {current.supplierName}</span>
        </div>

        {/* رقم واحد: كم عليك للمورد */}
        <div className={`flex items-center justify-between border rounded-[4px] px-3 py-2.5 ${current.remainingDebt > 0 ? 'bg-rose-50/40 border-rose-200/70' : 'bg-emerald-50/40 border-emerald-200/70'}`}>
          <span className="font-semibold text-slate-700 text-sm">المتبقي</span>
          <span className={`font-mono font-bold text-base ${current.remainingDebt > 0 ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
            {current.remainingDebt > 0 ? `${current.remainingDebt.toLocaleString('ar-SA')} ₪` : 'خالص'}
          </span>
        </div>

        <table className="w-full text-right border-collapse border border-slate-200 rounded-[4px] overflow-hidden">
          <thead className="bg-[#e9f0eb] font-bold border-b border-slate-200">
            <tr>
              <th className={`${td} w-24`}>التاريخ</th>
              <th className={td}>البيان</th>
              <th className={`${td} text-center w-28`}>المبلغ</th>
              <th className={`${td} text-center w-24`}>المتبقي</th>
              <th className="py-1.5 px-2.5 w-16 no-print"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">لا حركات</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => {
                    if (r.payment) setVoucher(r.payment);
                  }}
                  className={`group transition-colors ${
                    r.payment ? 'cursor-pointer hover:bg-amber-50/25' : 'hover:bg-slate-50'
                  }`}
                  title={r.payment ? 'عرض السند' : undefined}
                >
                  <td className={`${td} font-mono text-slate-600`}>{r.date}</td>
                  <td className={td}>{r.text}</td>
                  {/* أحمر = شراء (زاد الدين)، أخضر = صرف */}
                  <td className={`${td} text-center font-mono font-semibold ${r.debit ? 'text-[#b91c1c]' : 'text-[#15803d]'}`}>
                    {(r.debit || r.credit).toLocaleString('ar-SA')}
                  </td>
                  <td className={`${td} text-center font-mono font-bold text-slate-900`}>{r.balance.toLocaleString('ar-SA')}</td>
                  <td className="py-1.5 px-2.5 no-print" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.payment && (
                        <button
                          type="button"
                          onClick={() => setVoucher(r.payment!)}
                          className="p-1 rounded-[4px] text-slate-500 hover:bg-slate-200 transition-colors"
                          title="عرض السند"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="p-1 rounded-[4px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={r.payment ? 'حذف السند' : 'حذف'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaymentVoucherModal isOpen={!!voucher} onClose={() => setVoucher(null)} payment={voucher} settings={settings} />
    </Modal>
  );
};
