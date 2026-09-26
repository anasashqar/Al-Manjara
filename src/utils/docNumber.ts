/**
 * ترقيم موحد ومبسط لكل مستندات النظام: حرف عربي + رقم متسلسل (مثل ق-15).
 * التسلسل مستمر لكل نوع ولا يُعاد استخدام أي رقم بعد الحذف.
 */

export type DocKind = 'R' | 'P' | 'O' | 'E' | 'I' | 'OB';

export const DOC_PREFIX: Record<DocKind, string> = {
  R: 'ق', // سند قبض
  P: 'ص', // سند صرف
  O: 'ط', // طلبية
  E: 'م', // مصروف
  I: 'ف', // فاتورة مورد
  OB: 'ر', // رصيد سابق
};

export const DOC_LABELS: Record<DocKind, string> = {
  R: 'سند قبض',
  P: 'سند صرف',
  O: 'طلبية',
  E: 'مصروف',
  I: 'فاتورة مورد',
  OB: 'رصيد سابق',
};

const KIND_BY_PREFIX = Object.fromEntries(
  Object.entries(DOC_PREFIX).map(([kind, prefix]) => [prefix, kind as DocKind])
) as Record<string, DocKind>;

const PATTERN = /^(ق|ص|ط|م|ف|ر)-(\d+)$/;

export function parseDocNumber(n: string | undefined): { kind: DocKind; seq: number } | null {
  const m = n ? PATTERN.exec(n) : null;
  return m ? { kind: KIND_BY_PREFIX[m[1]], seq: parseInt(m[2], 10) } : null;
}

export const formatDocNumber = (kind: DocKind, seq: number) => `${DOC_PREFIX[kind]}-${seq}`;

// للعرض: الرقم فقط بلا رمز النوع (ق-15 ← 15)، فالنوع واضح من مكان ظهوره
export function docNo(n: string | undefined): string {
  const p = parseDocNumber(n);
  if (p) return String(p.seq);
  // قيود التسوية القديمة مثل "رصيد-سابق/ط-2"
  return n?.startsWith('رصيد') ? 'رصيد سابق' : n || '';
}

// بيان الدفعة بكلمة واحدة: النصوص القديمة "دفعة عربون للطلبية ط-15" ← "عربون"
export function shortPurpose(text: string): string {
  if (text.startsWith('دفعة عربون')) return 'عربون';
  if (/^دفعة من طلبية/.test(text)) return 'دفعة';
  return plainDocText(text);
}

// يزيل رموز الأنواع من نص محفوظ سابقاً، مثل "دفعة من طلبية ط-15"
export const plainDocText = (text: string) => text.replace(/(^|[\s(])(?:ق|ص|ط|م|ف|ر)-(\d+)/g, '$1$2');

export const counterKey = (kind: DocKind) => `doc:${kind}`;

// أكبر تسلسل صادر لنوع معين
export function maxDocSeq(numbers: (string | undefined)[], kind: DocKind): number {
  let max = 0;
  for (const n of numbers) {
    const p = parseDocNumber(n);
    if (p && p.kind === kind) max = Math.max(max, p.seq);
  }
  return max;
}

// ترتيب موحد للمستندات: بالتاريخ ثم بالرقم (تصاعدي). للأحدث أولاً استخدم newestFirst
export function compareDocs(aDate: string, aNum: string, bDate: string, bNum: string): number {
  return (aDate || '').localeCompare(bDate || '') || (aNum || '').localeCompare(bNum || '', 'ar', { numeric: true });
}

export const newestFirst =
  <T,>(date: (x: T) => string, num: (x: T) => string) =>
  (a: T, b: T) =>
    compareDocs(date(b), num(b), date(a), num(a));

export const oldestFirst =
  <T,>(date: (x: T) => string, num: (x: T) => string) =>
  (a: T, b: T) =>
    compareDocs(date(a), num(a), date(b), num(b));
