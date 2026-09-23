import React, { useState, useMemo } from 'react';
import { Plus, Search, Pencil } from 'lucide-react';
import { OrderAccountModal } from './OrderAccountModal';
import type { Order, WorkshopSettings, WorkStage } from '../../types';
import { StageDropdown } from './StageDropdown';
import { newestFirst } from '../../utils/docNumber';
import { updateOrderStage } from '../../db/dexie';
import { isOrderDone, isUnconfirmedWaiting } from '../../utils/finance';

interface OrdersViewProps {
  orders: Order[];
  settings: WorkshopSettings;
  onOpenNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  onQuickPay: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  settings,
  onOpenNewOrder,
  onEditOrder,
  onQuickPay,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'completed'>('in_progress');
  const [searchQuery, setSearchQuery] = useState('');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const tabs = [
    { id: 'all', label: 'الكل' },
    { id: 'in_progress', label: 'قيد التنفيذ' },
    { id: 'completed', label: 'مكتمل' },
  ];

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const isCompleted = isOrderDone(o);
        if (activeTab === 'in_progress' && isCompleted) return false;
        if (activeTab === 'completed' && !isCompleted) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          (o.customerPhone && o.customerPhone.includes(q)) ||
          o.description.toLowerCase().includes(q)
        );
      })
      .sort(newestFirst((o) => o.orderDate, (o) => o.orderNumber));
  }, [orders, activeTab, searchQuery]);

  const handleStageChange = async (orderId: string, stage: string) => {
    await updateOrderStage(orderId, stage as WorkStage | '');
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 max-w-6xl w-full mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-[4px] border border-slate-300 shadow-2xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 select-none">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`h-8 px-4 rounded-[6px] text-xs sm:text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#166534] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Search & New */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث..."
              className="h-8 w-full pr-8 pl-2.5 text-xs sm:text-sm rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534] bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={onOpenNewOrder}
            className="h-8 inline-flex items-center gap-1.5 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>طلبية جديدة</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="min-h-0 overflow-auto bg-white rounded-[4px] border border-slate-300 shadow-2xs">
        <table className="w-full text-right text-xs sm:text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-[#e9f0eb] text-slate-900 font-bold border-b-2 border-[#d2dfd6]">
            <tr>
              <th className="py-2.5 px-3 text-center border-l border-[#d2dfd6]/60 w-10">#</th>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60 w-44">الزبون</th>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60">البيان</th>
              <th className="py-2.5 px-3 border-l border-[#d2dfd6]/60 w-36 text-center">الحالة</th>
              <th className="py-2.5 px-3 text-center border-l border-[#d2dfd6]/60 w-32">المتبقي</th>
              <th className="py-2.5 px-3 text-center w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-sans">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                  لا طلبيات
                </td>
              </tr>
            ) : (
              filteredOrders.map((o, index) => {
                const hasDue = o.remainingAmount > 0;
                const unconfirmed = isUnconfirmedWaiting(o);
                const isCompleted = o.status === 'completed' || o.status === 'delivered';
                return (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    {/* # */}
                    <td className="py-3 px-3 text-center border-l border-slate-200 font-mono text-slate-400 text-xs">
                      {index + 1}
                    </td>

                    {/* الزبون */}
                    <td className="py-3 px-3 border-l border-slate-200">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{o.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 dir-ltr text-right">
                        {o.customerPhone || '—'}
                      </div>
                    </td>

                    {/* البيان */}
                    <td className="py-3 px-3 border-l border-slate-200">
                      <div className="font-medium text-slate-800 text-xs sm:text-sm line-clamp-2">
                        {o.description}
                      </div>
                    </td>

                    {/* الحالة — Dropdown مخصص يتبع الخط تماماً أو شارة للمكتملة */}
                    <td className="py-2 px-2 border-l border-slate-200 text-center">
                      {isCompleted ? (
                        <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-[4px] bg-green-50 text-green-700 border border-green-200">
                          مكتمل
                        </span>
                      ) : (
                        <StageDropdown
                          value={o.workStage}
                          onChange={(stage) => handleStageChange(o.id, stage)}
                        />
                      )}
                    </td>

                    {/* المبلغ */}
                    <td className="py-3 px-3 text-center border-l border-slate-200">
                      {o.totalAmount <= 0 ? (
                        // بلا سعر: عادي بالانتظار، لكنه تنبيه إذا بدأ العمل
                        <div className={unconfirmed ? 'text-slate-400 text-xs' : 'font-semibold text-amber-600 text-xs'}>
                          {unconfirmed ? '—' : 'بدون سعر'}
                        </div>
                      ) : unconfirmed ? (
                        // سعر مبدئي لم يُثبَّت بعد: ليس ديناً
                        <div className="font-mono text-slate-400 text-sm">
                          {o.totalAmount.toLocaleString('ar-SA')} ₪
                        </div>
                      ) : hasDue ? (
                        <div className="font-bold font-mono text-[#b91c1c] text-sm">
                          {o.remainingAmount.toLocaleString('ar-SA')} ₪
                        </div>
                      ) : (
                        <div className="font-bold text-[#15803d] text-xs">خالص</div>
                      )}
                    </td>

                    {/* إجراءات — زر تعديل + قبض/سند */}
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* زر تعديل دائماً */}
                        <button
                          type="button"
                          onClick={() => onEditOrder(o)}
                          title="تعديل"
                          className="h-7 w-7 inline-flex items-center justify-center rounded-[6px] border border-slate-300 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* قبض أو سند */}
                        {hasDue ? (
                          <button
                            type="button"
                            onClick={() => onQuickPay(o)}
                            className="h-7 px-3 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold shadow-2xs transition-colors"
                          >
                            قبض
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(o)}
                            className="h-7 px-2.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                          >
                            سند
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {receiptOrder && (
        <OrderAccountModal
          isOpen={!!receiptOrder}
          onClose={() => setReceiptOrder(null)}
          order={receiptOrder}
          settings={settings}
        />
      )}
    </div>
  );
};
