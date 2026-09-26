import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Printer, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { db, deletePayment } from '../../db/dexie';
import { printElementToA4 } from '../../utils/printHelper';
import { customerKey, isActiveOrder } from '../../utils/finance';
import { OrderReceiptModal } from './OrderReceiptModal';
import type { Order, PaymentTransaction, WorkshopSettings } from '../../types';
import { docNo, oldestFirst } from '../../utils/docNumber';
import { ask, notify } from '../common/Dialogs';

interface OrderAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  settings: WorkshopSettings;
}

type View = 'order' | 'customer';
const fmt = (n: number) => n.toLocaleString('ar-SA');

// حساب الطلبية (سنداتها) + كشف حساب الزبون (كل طلبياته)
export const OrderAccountModal: React.FC<OrderAccountModalProps> = ({ isOpen, onClose, order, settings }) => {
  const [view, setView] = useState<View>('order');
  const [reprint, setReprint] = useState<PaymentTransaction | null>(null);
  const orderId = order?.id ?? '';

  const liveOrder = useLiveQuery(() => db.orders.get(orderId), [orderId]);
  const allOrders = useLiveQuery(() => db.orders.toArray(), []) || [];
  const allReceipts = useLiveQuery(() => db.paymentTransactions.where('type').equals('customer_in').toArray(), []) || [];

  const current = liveOrder || order;
  const key = current ? customerKey(current) : '';

  const orderReceipts = useMemo(
    () => allReceipts.filter((p) => p.relatedId === orderId).sort(oldestFirst((p) => p.date, (p) => p.receiptNumber)),
    [allReceipts, orderId]
  );

  const customerOrders = useMemo(
    () => allOrders.filter((o) => customerKey(o) === key).sort(oldestFirst((o) => o.orderDate, (o) => o.orderNumber)),
    [allOrders, key]
  );

  if (!current) return null;

  const active = customerOrders.filter(isActiveOrder);
  const customerTotals = {
    total: active.reduce((s, o) => s + o.totalAmount, 0),
    paid: active.reduce((s, o) => s + o.paidAmount, 0),
    remaining: active.reduce((s, o) => s + o.remainingAmount, 0),
  };

  const handleVoid = async (p: PaymentTransaction) => {
    if (!(await ask(`حذف السند رقم ${docNo(p.receiptNumber)}؟`))) return;
    try {
      await deletePayment(p.id);
    } catch (err: any) {
      notify(err?.message || 'تعذر الحذف');
    }
  };

  const tab = (id: View, text: string) => (
    <button
      type="button"
      onClick={() => setView(id)}
      className={`h-7 px-3 rounded-[6px] text-xs font-semibold ${
        view === id ? 'bg-[#166534] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {text}
    </button>
  );

  const td = 'py-1.5 px-2.5 border-l border-slate-200';
  const summaryBox = (items: [string, number, string][]) => (
    <div className="grid grid-cols-3 gap-2 text-center">
      {items.map(([title, value, color]) => (
        <div key={title} className="bg-slate-50 border border-slate-200 rounded-[4px] py-2">
          <div className="text-slate-500">{title}</div>
          <div className={`font-mono font-bold text-sm ${color}`}>{fmt(value)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${current.customerName} — طلبية ${docNo(current.orderNumber)}`}
      maxWidth="2xl"
      headerActions={
        <button
          type="button"
          onClick={() =>
            printElementToA4('printable-account', `كشف_${current.customerName.trim().replace(/\s+/g, '_')}`)
          }
          className="h-7 inline-flex items-center gap-1.5 px-3 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PDF</span>
        </button>
      }
    >
      <div className="flex gap-1 mb-3 no-print">
        {tab('order', 'الطلبية')}
        {tab('customer', `الزبون (${customerOrders.length})`)}
      </div>

      <div id="printable-account" className="space-y-3 text-xs">
        <div className="hidden print:flex justify-between border-b-2 border-slate-800 pb-2">
          <span className="font-bold text-base">{settings.workshopName}</span>
          <span className="font-bold">
            كشف حساب: {current.customerName}
            {view === 'order' ? ` — طلبية ${docNo(current.orderNumber)}` : ''}
          </span>
        </div>

        {view === 'order' ? (
          <>
            <div className="text-slate-700">
              {current.description}
              {current.status === 'cancelled' && <span className="text-rose-600 font-bold mr-2">ملغاة</span>}
            </div>
            {summaryBox([
              ['المبلغ', current.totalAmount, 'text-slate-900'],
              ['المدفوع', current.paidAmount, 'text-[#15803d]'],
              ['المتبقي', current.remainingAmount, 'text-[#b91c1c]'],
            ])}
            <table className="w-full text-right border-collapse border border-slate-200 rounded-[4px] overflow-hidden">
              <thead className="bg-[#e9f0eb] font-bold border-b border-slate-200">
                <tr>
                  <th className={`${td} w-28`}>الرقم</th>
                  <th className={`${td} w-24`}>التاريخ</th>
                  <th className={td}>الوسيلة</th>
                  <th className={`${td} text-center w-24`}>المبلغ</th>
                  <th className={`${td} text-center w-20`}>خصم</th>
                  <th className="py-1.5 px-2.5 w-16 no-print"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orderReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">لا سندات</td>
                  </tr>
                ) : (
                  orderReceipts.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setReprint(p)}
                      className="hover:bg-amber-50/25 transition-colors cursor-pointer"
                      title="عرض السند"
                    >
                      <td className={`${td} font-mono font-bold`}>{docNo(p.receiptNumber)}</td>
                      <td className={`${td} font-mono`}>{p.date}</td>
                      <td className={td}>{p.paymentMethod}</td>
                      <td className={`${td} text-center font-mono font-bold text-[#15803d]`}>{fmt(p.amount)}</td>
                      <td className={`${td} text-center font-mono`}>{p.discountAmount ? fmt(p.discountAmount) : ''}</td>
                      <td className="py-1.5 px-2.5 no-print" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setReprint(p)}
                            className="p-1 rounded-[6px] text-slate-500 hover:bg-slate-100 transition-colors"
                            title="عرض السند"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVoid(p)}
                            className="p-1 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف السند"
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
          </>
        ) : (
          <>
            {summaryBox([
              ['المجموع', customerTotals.total, 'text-slate-900'],
              ['المدفوع', customerTotals.paid, 'text-[#15803d]'],
              ['المتبقي', customerTotals.remaining, 'text-[#b91c1c]'],
            ])}
            <table className="w-full text-right border-collapse border border-slate-200 rounded-[4px] overflow-hidden">
              <thead className="bg-[#e9f0eb] font-bold border-b border-slate-200">
                <tr>
                  <th className={`${td} w-20`}>الطلبية</th>
                  <th className={`${td} w-24`}>التاريخ</th>
                  <th className={td}>البيان</th>
                  <th className={`${td} text-center w-24`}>المبلغ</th>
                  <th className={`${td} text-center w-24`}>المدفوع</th>
                  <th className="py-1.5 px-2.5 text-center w-24">المتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {customerOrders.map((o) => (
                  <tr key={o.id} className={o.status === 'cancelled' ? 'text-slate-400 line-through' : ''}>
                    <td className={`${td} font-mono font-bold`}>{docNo(o.orderNumber)}</td>
                    <td className={`${td} font-mono`}>{o.orderDate}</td>
                    <td className={td}>{o.description}</td>
                    <td className={`${td} text-center font-mono`}>{fmt(o.totalAmount)}</td>
                    <td className={`${td} text-center font-mono text-[#15803d]`}>{fmt(o.paidAmount)}</td>
                    <td className="py-1.5 px-2.5 text-center font-mono font-bold">
                      {o.remainingAmount > 0 ? fmt(o.remainingAmount) : 'خالص'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {reprint && (
        <OrderReceiptModal
          isOpen={!!reprint}
          onClose={() => setReprint(null)}
          order={current}
          payment={reprint}
          settings={settings}
        />
      )}
    </Modal>
  );
};
