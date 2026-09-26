import React, { useState, useEffect } from 'react';
import { Save, Upload, X, Paperclip, ChevronDown } from 'lucide-react';
import { Modal } from '../common/Modal';
import { addCustomerPayment } from '../../db/dexie';
import { todayISO } from '../../utils/date';
import type { Order, PaymentMethodItem, PaymentTransaction } from '../../types';
import { notify } from '../common/Dialogs';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  paymentMethods: PaymentMethodItem[];
  // يستقبل السند والطلبية بعد تحديث رصيدها (لعرض المتبقي الصحيح في السند)
  onPaymentSuccess?: (result: { payment: PaymentTransaction; order: Order }) => void;
  // عند تمريرها يظهر حقل لاختيار الزبون/الطلبية بدل تثبيت طلبية واحدة
  selectableOrders?: Order[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  paymentMethods,
  onPaymentSuccess,
  selectableOrders,
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [itemPurpose, setItemPurpose] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // البيان والتاريخ والإشعار والملاحظات نادراً ما تتغير، فتبقى مطوية
  const [showMore, setShowMore] = useState(false);

  // Active payment methods
  const activeMethods = paymentMethods.filter((m) => m.isActive);

  useEffect(() => {
    setSelectedOrderId(order?.id ?? null);
  }, [order, isOpen]);

  // الطلبية الفعلية: المختارة من القائمة إن وُجدت، وإلا الممررة
  const currentOrder =
    (selectedOrderId && selectableOrders?.find((o) => o.id === selectedOrderId)) || order;

  useEffect(() => {
    if (currentOrder) {
      setItemPurpose('دفعة');
      setAmount(currentOrder.remainingAmount > 0 ? currentOrder.remainingAmount : '');
      setHasDiscount(false);
      setDiscountAmount('');
      const defaultMethod = activeMethods[0]?.name || 'نقداً';
      setPaymentMethod(defaultMethod);
      setDate(todayISO());
      setNotes('');
      setAttachmentData(null);
      setAttachmentName(null);
      setShowMore(false);
    }
  }, [currentOrder?.id, isOpen]);

  if (!currentOrder) return null;
  const remaining = currentOrder.remainingAmount;
  const discountVal = hasDiscount ? Number(discountAmount) || 0 : 0;

  // File upload for bank/wallet receipt
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachmentName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachmentData(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount) || 0;
    if (numAmount < 0 || discountVal < 0 || numAmount + discountVal <= 0) {
      notify('المبلغ غير صحيح');
      return;
    }
    if (numAmount + discountVal > remaining + 0.005) {
      notify(`أكبر من المتبقي (${remaining.toLocaleString('ar-SA')} ₪)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addCustomerPayment(currentOrder.id, {
        amount: numAmount,
        discountAmount: discountVal,
        paymentMethod,
        itemPurpose,
        date,
        receiptAttachment: attachmentData || undefined,
        notes,
      });
      onPaymentSuccess?.(result);
      onClose();
    } catch (err: any) {
      console.error('Payment record error:', err);
      notify(err.message || 'تعذر الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`قبض — ${currentOrder.customerName}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {/* Customer & Due info box */}
        <div className="bg-slate-50 border border-slate-200 rounded-[4px] p-2.5 text-right">
          <div className="text-slate-500 font-medium text-[11px] mb-0.5">الزبون</div>
          {selectableOrders && selectableOrders.length > 1 ? (
            <select
              value={currentOrder.id}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 bg-white font-bold text-slate-900"
            >
              {selectableOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.customerName} — {o.description} — متبقي {o.remainingAmount.toLocaleString('ar-SA')}
                </option>
              ))}
            </select>
          ) : (
            <div className="font-bold text-slate-900 text-xs sm:text-sm">
              {currentOrder.customerName}{' '}
              <span className="text-[11px] text-slate-500 font-normal">
                ({currentOrder.description || currentOrder.category})
              </span>
            </div>
          )}
          <div className="mt-1 text-xs">
            <span className="text-slate-500">المتبقي: </span>
            <span className="font-bold text-[#b91c1c] text-xs sm:text-sm font-mono">
              {remaining.toLocaleString('ar-SA')} ₪
            </span>
          </div>
        </div>

        {/* المبلغ والوسيلة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              المبلغ *
            </label>
            <input
              type="number"
              min="0"
              max={Math.max(0, remaining - discountVal) || undefined}
              step="any"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-mono font-bold text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              الوسيلة
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white"
            >
              {activeMethods.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* خصم + خيارات أكثر */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2">
            <input
              id="discount-check"
              type="checkbox"
              checked={hasDiscount}
              onChange={(e) => setHasDiscount(e.target.checked)}
              className="w-3.5 h-3.5 rounded-[4px] text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer accent-[#166534]"
            />
            <label htmlFor="discount-check" className="text-slate-700 select-none cursor-pointer text-xs">
              خصم
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            المزيد
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {hasDiscount && (
          <div className="p-2.5 bg-amber-50/70 rounded-[4px] border border-amber-200 animate-in fade-in duration-150">
            <label className="block text-amber-900 font-medium mb-1 text-xs">
              مبلغ الخصم
            </label>
            <input
              type="number"
              min="0"
              max={Math.max(0, remaining - (Number(amount) || 0)) || undefined}
              step="any"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="w-full px-2.5 py-1 rounded-[4px] border border-amber-300 focus:ring-1 focus:ring-amber-600 bg-white font-mono text-xs"
            />
          </div>
        )}

        {showMore && (
          <div className="space-y-3 p-2.5 bg-slate-50 rounded-[4px] border border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">البيان</label>
                <input
                  type="text"
                  value={itemPurpose}
                  onChange={(e) => setItemPurpose(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">التاريخ</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white font-mono"
                />
              </div>
            </div>

            {/* إشعار تحويل بنكي أو محفظة */}
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] border border-slate-300 bg-white hover:bg-slate-100 cursor-pointer text-slate-700 text-xs font-medium">
                <Upload className="w-3.5 h-3.5" />
                <span>رفع إشعار</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              {attachmentName && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-[6px] border border-emerald-200">
                  <Paperclip className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{attachmentName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentData(null);
                      setAttachmentName(null);
                    }}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">ملاحظات</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:ring-1 focus:ring-[#166534] bg-white"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-start gap-2 pt-2 border-t border-slate-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-8 inline-flex items-center gap-1.5 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white font-semibold shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'حفظ...' : 'حفظ'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-[6px] border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
};
