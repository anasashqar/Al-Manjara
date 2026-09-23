import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { currentMonthPeriod, inPeriod, periodLabel, type Period } from '../utils/period';

interface PeriodContextValue {
  period: Period;
  setPeriod: (p: Period) => void;
  label: string;
  isInPeriod: (date: string | undefined) => boolean;
}

const STORAGE_KEY = 'al-manjara-period';

function loadPeriod(): Period {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Period;
      const validYear = parsed.year === null || Number.isInteger(parsed.year);
      const validMonth = parsed.month === null || (parsed.month >= 1 && parsed.month <= 12);
      if (validYear && validMonth) return parsed;
    }
  } catch {
    // التخزين غير متاح (نافذة خاصة مثلاً) - نستخدم الشهر الحالي
  }
  return currentMonthPeriod();
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

// الفترة المختارة مشتركة بين كل الأقسام (الطلبيات، المصاريف، المالية)
export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [period, setPeriodState] = useState<Period>(loadPeriod);

  const setPeriod = useCallback((p: Period) => {
    setPeriodState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // تجاهل: الفترة ستعود للشهر الحالي عند إعادة التحميل
    }
  }, []);

  const value = useMemo<PeriodContextValue>(
    () => ({
      period,
      setPeriod,
      label: periodLabel(period),
      isInPeriod: (date) => inPeriod(date, period),
    }),
    [period, setPeriod]
  );

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
};

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod must be used inside PeriodProvider');
  return ctx;
}
