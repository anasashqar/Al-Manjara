/**
 * نظام الفترات المحاسبية: شهر محدد، سنة كاملة، أو كل الفترات.
 * التواريخ في النظام مخزنة كنص YYYY-MM-DD لذا تتم المقارنة نصياً دون مشاكل المناطق الزمنية.
 */
import { plain } from './format';

export interface Period {
  year: number | null;  // null = كل الفترات
  month: number | null; // 1-12، و null = السنة كاملة
}

export type PeriodMode = 'month' | 'year' | 'all';

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function currentMonthPeriod(): Period {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export const periodMode = (p: Period): PeriodMode =>
  p.year === null ? 'all' : p.month === null ? 'year' : 'month';

export function inPeriod(date: string | undefined, p: Period): boolean {
  if (p.year === null) return true;
  if (!date) return false;
  if (!date.startsWith(`${p.year}-`)) return false;
  if (p.month === null) return true;
  return date.slice(5, 7) === String(p.month).padStart(2, '0');
}

export function periodLabel(p: Period): string {
  if (p.year === null) return 'كل الفترات';
  if (p.month === null) return plain(p.year);
  return `${MONTHS_AR[p.month - 1]} ${plain(p.year)}`;
}

// الانتقال للشهر/السنة السابقة أو التالية
export function shiftPeriod(p: Period, delta: number): Period {
  if (p.year === null) return p;
  if (p.month === null) return { year: p.year + delta, month: null };
  const index = p.year * 12 + (p.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

// ترتيب زمني للمقارنة: -1 إذا a قبل b
export function comparePeriods(a: Period, b: Period): number {
  const key = (p: Period) => (p.year ?? 0) * 100 + (p.month ?? 0);
  return Math.sign(key(a) - key(b));
}

// مفتاح الشهر YYYY-MM من تاريخ
export const monthKey = (date: string) => date.slice(0, 7);

// يوم + شهر فقط (عندما تكون السنة معروفة من الفترة المختارة)
export function formatDayMonth(date: string): string {
  const [, m, d] = date.split('-');
  return m && d ? `${plain(parseInt(d, 10))} ${MONTHS_AR[parseInt(m, 10) - 1] ?? ''}` : date;
}

export function formatDateAr(date: string | undefined): string {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return date;
  return `${plain(parseInt(d, 10))} ${MONTHS_AR[parseInt(m, 10) - 1] ?? ''} ${plain(parseInt(y, 10))}`;
}
