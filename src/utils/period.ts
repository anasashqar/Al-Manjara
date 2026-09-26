// تنسيق التواريخ بالعربية. التواريخ في النظام مخزنة كنص YYYY-MM-DD
import { plain } from './format';

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

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
