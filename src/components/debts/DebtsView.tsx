import React, { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { OrderReceiptModal } from '../orders/OrderReceiptModal';
import { isActiveOrder, isReceivable } from '../../utils/finance';
import type { Order, PaymentMethodItem, PaymentTransaction, WorkshopSettings } from '../../types';

interface DebtsViewProps {
  orders: Order[];
  payments: PaymentTransaction[];
  paymentMethods: PaymentMethodItem[];
  settings: WorkshopSettings;
}

export const DebtsView: React.FC<DebtsViewProps> = ({
  orders,
  payments,
  paymentMethods,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'due' | 'paid'>('all');
  const [selectedOrderForPay, setSelectedOrderForPay] = useState<Order | null>(null);
  // true عند الفتح من الزر العام "تسديد دفعة" ليظهر اختيار الزبون
  const [payFromPicker, setPayFromPicker] = useState(false);
  const [newReceiptModalData, setNewReceiptModalData] = useState<{
    order: Order;
    payment: PaymentTransaction;
  } | null>(null);

  // Financial Calculations (الطلبيات الملغاة خارج الديون والمبيعات)
  const activeOrders = useMemo(() => orders.filter(isActiveOrder), [orders]);
  const receivables = useMemo(
    () =>
      orders
        .filter(isReceivable)
        .sort((a, b) => a.customerName.localeCompare(b.customerName, 'ar')),
    [orders]
  );

  const totalDue = useMemo(() => {
    return receivables.reduce((sum, o) => sum + o.remainingAmount, 0);
  }, [receivables]);

  const debtorsCount = useMemo(
    () => new Set(receivables.map((o) => o.customerPhone || o.customerName)).size,
    [receivables]
  );

  const receiptsCount = useMemo(
    () => payments.filter((p) => p.type === 'customer_in').length,
    [payments]
  );

  const totalCollected = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.paidAmount, 0);
  }, [orders]);

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'in_progress' || o.status === 'new').length;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return activeOrders.filter((o) => {
      if (filterState === 'due' && o.remainingAmount <= 0) return false;
      if (filterState === 'paid' && o.remainingAmount > 0) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.customerName.toLowerCase().includes(q) ||
        (o.customerPhone && o.customerPhone.includes(q)) ||
        o.orderNumber.toLowerCase().includes(q)
      );
    });
  }, [activeOrders, filterState, searchQuery]);

  // الطلبية المُرجعة محدثة بعد الدفعة، فيظهر المتبقي الصحيح في السند
  const handlePaymentSuccess = (result: { payment: PaymentTransaction; order: Order }) => {
    setNewReceiptModalData(result);
  };

  return (
    <div className="space-y-2.5">
      {/* 4 Compact Metric Cards: rounded-[4px] */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Card 1: المستحقات */}
        <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-slate-300 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-0.5">المستحقات</div>
          <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-[#b91c1c]">
            {totalDue.toLocaleString('ar-SA')} <span className="text-[10px] font-sans font-normal">شيكل</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {debtorsCount} زبون
          </div>
        </div>

        {/* Card 2: المقبوضات */}
        <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-slate-300 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-0.5">المقبوضات</div>
          <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-[#15803d]">
            {totalCollected.toLocaleString('ar-SA')} <span className="text-[10px] font-sans font-normal">شيكل</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
            {receiptsCount} سند
          </div>
        </div>

        {/* Card 3: الطلبيات النشطة */}
        <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-slate-300 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-0.5">الطلبيات النشطة</div>
          <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-900">
            {pendingOrdersCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            قيد التنفيذ
          </div>
        </div>

        {/* Card 4: إجمالي الأعمال */}
        <div className="bg-white p-2.5 sm:p-3 rounded-[4px] border border-slate-300 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 mb-0.5">إجمالي الأعمال</div>
          <div className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-900">
            {activeOrders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString('ar-SA')}{' '}
            <span className="text-[10px] font-sans font-normal">شيكل</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {activeOrders.length} طلبية
          </div>
        </div>
      </div>

      {/* Action Bar: rounded-[4px] container, rounded-[6px] buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white p-2 rounded-[4px] border border-slate-300">
        <div className="flex items-center gap-2">
          {/* Button: rounded-[6px] */}
          <button
            type="button"
            onClick={() => {
              setPayFromPicker(true);
              setSelectedOrderForPay(receivables[0] || null);
            }}
            disabled={receivables.length === 0}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>قبض دفعة</span>
          </button>

          {/* Filter: rounded-[4px] */}
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value as any)}
            className="h-8 px-2.5 py-1 rounded-[4px] border border-slate-300 bg-white text-xs text-slate-700 cursor-pointer"
          >
            <option value="all">الكل</option>
            <option value="due">بهم ديون</option>
            <option value="paid">خالصون</option>
          </select>
        </div>

        {/* Search: rounded-[4px] */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث..."
            className="h-8 w-full pr-8 pl-2.5 py-1 text-xs rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534] bg-white text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Table: rounded-[4px] container, warm gold header */}
      <div className="bg-white rounded-[4px] border border-slate-300 overflow-hidden shadow-2xs">
        <table className="w-full text-right text-xs border-collapse">
          <thead className="bg-[#e9f0eb] text-slate-900 font-bold border-b border-[#d2dfd6]">
            <tr>
              <th className="py-1.5 px-2.5 text-center w-10 border-l border-[#d2dfd6]/60">#</th>
              <th className="py-1.5 px-2.5 border-l border-[#d2dfd6]/60">الزبون</th>
              <th className="py-1.5 px-2.5 border-l border-[#d2dfd6]/60">البيان</th>
              <th className="py-1.5 px-2.5 text-center border-l border-[#d2dfd6]/60 w-32">المستحق</th>
              <th className="py-1.5 px-2.5 text-center w-20">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-sans">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                  لا حسابات
                </td>
              </tr>
            ) : (
              filteredOrders.map((o, idx) => (
                <tr key={o.id} className="hover:bg-amber-50/15 transition-colors">
                  <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono border-l border-slate-100">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2.5 border-l border-slate-100">
                    <div className="font-bold text-slate-900 text-xs sm:text-[13px]">
                      {o.customerName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono dir-ltr text-right">
                      {o.customerPhone || '—'}
                    </div>
                  </td>
                  <td className="py-1.5 px-2.5 border-l border-slate-100">
                    <div className="font-medium text-slate-800 line-clamp-1">
                      {o.description}
                    </div>
                  </td>
                  <td className="py-1.5 px-2.5 text-center border-l border-slate-100">
                    {o.remainingAmount > 0 ? (
                      <div>
                        <span className="font-bold text-[#b91c1c] text-xs sm:text-sm font-mono">
                          {o.remainingAmount.toLocaleString('ar-SA')} شيكل
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-[#15803d]">
                        لا مستحق
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2.5 text-center">
                    {o.remainingAmount > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPayFromPicker(false);
                          setSelectedOrderForPay(o);
                        }}
                        className="h-6.5 px-2.5 py-0.5 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold shadow-2xs transition-colors"
                      >
                        قبض
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">خالص</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={!!selectedOrderForPay}
        onClose={() => setSelectedOrderForPay(null)}
        order={selectedOrderForPay}
        paymentMethods={paymentMethods}
        onPaymentSuccess={handlePaymentSuccess}
        selectableOrders={payFromPicker ? receivables : undefined}
      />

      {/* Official Receipt Modal */}
      {newReceiptModalData && (
        <OrderReceiptModal
          isOpen={!!newReceiptModalData}
          onClose={() => setNewReceiptModalData(null)}
          order={newReceiptModalData.order}
          payment={newReceiptModalData.payment}
          settings={settings}
        />
      )}
    </div>
  );
};
