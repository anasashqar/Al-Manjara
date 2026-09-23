import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { usePeriod } from '../../context/PeriodContext';
import {
  comparePeriods,
  currentMonthPeriod,
  periodLabel,
  periodMode,
  shiftPeriod,
  type Period,
  type PeriodMode,
} from '../../utils/period';

interface PeriodPickerProps {
  // أقدم تاريخ فيه بيانات؛ لا يُسمح بالرجوع قبله ولا بالتقدم بعد الفترة الحالية
  earliestDate?: string;
}

const MODES: { id: PeriodMode; label: string }[] = [
  { id: 'month', label: 'شهر' },
  { id: 'year', label: 'سنة' },
  { id: 'all', label: 'الكل' },
];

// نوع الفترة (شهر / سنة / الكل) + تنقل بالأسهم ضمن حدود البيانات
export const PeriodPicker: React.FC<PeriodPickerProps> = ({ earliestDate }) => {
  const { period, setPeriod } = usePeriod();
  const mode = periodMode(period);
  const now = currentMonthPeriod();

  const bounds = (m: PeriodMode): { min: Period; max: Period } => {
    const minYear = earliestDate ? parseInt(earliestDate.slice(0, 4), 10) : now.year!;
    const minMonth = earliestDate ? parseInt(earliestDate.slice(5, 7), 10) : now.month!;
    return m === 'year'
      ? { min: { year: minYear, month: null }, max: { year: now.year, month: null } }
      : { min: { year: minYear, month: minMonth }, max: now };
  };

  const changeMode = (m: PeriodMode) => {
    if (m === mode) return;
    if (m === 'all') return setPeriod({ year: null, month: null });
    const year = period.year ?? now.year;
    if (m === 'year') return setPeriod({ year, month: null });
    // من سنة إلى شهر: الشهر الحالي إن كانت السنة الحالية، وإلا آخر شهر فيها
    setPeriod({ year, month: year === now.year ? now.month : 12 });
  };

  const { min, max } = bounds(mode);
  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const canPrev = mode !== 'all' && comparePeriods(prev, min) >= 0;
  const canNext = mode !== 'all' && comparePeriods(next, max) <= 0;

  const arrowCls =
    'p-1 rounded-[6px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-25 disabled:hover:bg-transparent';

  return (
    <div className="flex items-center gap-2 no-print">
      <div className="inline-flex p-0.5 bg-slate-100 rounded-[6px]" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => changeMode(m.id)}
            className={`h-7 px-3 rounded-[4px] text-xs font-semibold transition-colors ${
              mode === m.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode !== 'all' && (
        <div className="flex items-center">
          <button type="button" onClick={() => setPeriod(prev)} disabled={!canPrev} className={arrowCls} aria-label="السابق">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="min-w-[88px] text-center text-sm font-bold text-slate-900">{periodLabel(period)}</span>
          <button type="button" onClick={() => setPeriod(next)} disabled={!canNext} className={arrowCls} aria-label="التالي">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
