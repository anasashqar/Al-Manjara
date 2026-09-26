import React from 'react';
import { Printer } from 'lucide-react';
import { Modal } from './Modal';
import { tafqeetShekels } from '../../utils/tafqeet';
import { printElementToA4 } from '../../utils/printHelper';
import { formatDateAr } from '../../utils/period';
import { num } from '../../utils/format';
import type { WorkshopSettings } from '../../types';

export interface VoucherData {
  kind: 'receipt';
  number: string;
  date: string;
  party: string;
  amount: number;
  discount?: number;
  purpose: string;
  method: string;
  remainingAfter?: number;
  notes?: string;
}

const TITLE = 'سند قبض';

// رموز وسائل دفع قديمة قد توجد في بيانات سابقة
const METHOD_NAMES: Record<string, string> = {
  cash: 'نقداً',
  bank: 'بنك فلسطين',
  jawwal_pay: 'محفظة جوال بي',
  palpay: 'محفظة بال بي',
};

const LABEL = 'w-20 align-top px-3 py-1.5 text-slate-500 whitespace-nowrap border-l border-slate-200';
const VALUE = 'px-3 py-1.5 leading-snug';

// سند القبض: تصميم مضغوط بخطوط وإطارات واضحة، وعمود عناوين ثابت
// حتى لا تكسر النصوص الطويلة الترتيب، وحجم يظهر كاملاً دون تمرير
export const VoucherDocument: React.FC<{ data: VoucherData; settings: WorkshopSettings; id: string }> = ({
  data,
  settings,
  id,
}) => {
  const contact = [settings.phone, settings.address].filter(Boolean).join(' · ');
  const balance =
    data.remainingAfter === undefined ? null : data.remainingAfter > 0 ? (
      <span className="font-bold text-[#b91c1c]">{num(data.remainingAfter)}</span>
    ) : (
      <span className="font-bold text-[#15803d]">خالص</span>
    );

  return (
    <div id={id} className="bg-white text-slate-900 border-2 border-slate-800 rounded-[4px] text-xs max-w-md mx-auto">
      {/* الترويسة */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b-2 border-slate-800">
        <div className="min-w-0">
          <h2 className="font-bold text-sm font-display leading-tight truncate">{settings.workshopName}</h2>
          {contact && <p className="text-[10px] text-slate-500 truncate">{contact}</p>}
        </div>
        <div className="shrink-0 whitespace-nowrap border-2 border-slate-800 rounded-[4px] px-2.5 py-0.5 font-bold">
          {TITLE}
        </div>
      </div>

      <table className="w-full border-collapse">
        <tbody className="divide-y divide-slate-200">
          {/* الرقم والتاريخ */}
          <tr className="bg-slate-50">
            <td className={LABEL}>الرقم</td>
            <td className={`${VALUE} font-bold whitespace-nowrap border-l border-slate-200`}>{data.number}</td>
            <td className={LABEL}>التاريخ</td>
            <td className={`${VALUE} font-bold whitespace-nowrap`}>{formatDateAr(data.date)}</td>
          </tr>
          <tr>
            <td className={LABEL}>من</td>
            <td className={`${VALUE} font-bold`} colSpan={3}>{data.party}</td>
          </tr>
          <tr className="bg-[#e9f0eb]">
            <td className={LABEL}>المبلغ</td>
            <td className={VALUE} colSpan={3}>
              <span className="text-sm font-bold">{num(data.amount)}</span> ₪
              {data.discount ? <span className="text-slate-500"> · خصم {num(data.discount)}</span> : null}
              <div className="text-[11px] text-slate-600">{tafqeetShekels(data.amount)}</div>
            </td>
          </tr>
          <tr>
            <td className={LABEL}>البيان</td>
            <td className={VALUE} colSpan={3}>{data.purpose}</td>
          </tr>
          <tr>
            <td className={LABEL}>الوسيلة</td>
            <td className={`${VALUE} border-l border-slate-200`} colSpan={balance ? 1 : 3}>
              {METHOD_NAMES[data.method] || data.method}
            </td>
            {balance && (
              <>
                <td className={LABEL}>المتبقي</td>
                <td className={VALUE}>{balance}</td>
              </>
            )}
          </tr>
          {data.notes && (
            <tr>
              <td className={LABEL}>ملاحظات</td>
              <td className={VALUE} colSpan={3}>{data.notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* التوقيع والختم */}
      <div className="flex items-end justify-between gap-4 px-3 pt-3 pb-2.5 border-t border-slate-300">
        <div className="space-y-3">
          <div className="text-slate-500">
            المستلم: <span className="font-bold text-slate-800">{settings.managerName}</span>
          </div>
          <div className="w-28 border-b border-slate-400" />
        </div>
        <div className="w-20 h-10 border border-dashed border-slate-400 rounded-[4px] flex items-center justify-center text-[10px] text-slate-400">
          الختم
        </div>
      </div>

      {settings.receiptFooter && (
        <div className="px-3 py-1 border-t border-slate-200 text-[10px] text-slate-500 text-center">{settings.receiptFooter}</div>
      )}
    </div>
  );
};

// نافذة عرض السند مع زر الطباعة
export const VoucherModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  data: VoucherData | null;
  settings: WorkshopSettings;
}> = ({ isOpen, onClose, data, settings }) => {
  if (!data) return null;
  const id = 'voucher-receipt';
  const fileName = `${TITLE}_${data.number}_${data.party.trim().replace(/\s+/g, '_')}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={TITLE}
      maxWidth="md"
      headerActions={
        <button
          type="button"
          onClick={() => printElementToA4(id, fileName)}
          className="h-7 inline-flex items-center gap-1.5 px-3 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white text-xs font-semibold"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة</span>
        </button>
      }
    >
      <VoucherDocument data={data} settings={settings} id={id} />
    </Modal>
  );
};
