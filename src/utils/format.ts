// تنسيق موحد للأرقام بالأرقام العربية (نفس نظام باقي الشاشات) حتى لا تختلط ٢٠٢٦ مع 2026

export const num = (n: number) => n.toLocaleString('ar-SA', { maximumFractionDigits: 2 });

// بدون فواصل الآلاف: للسنوات والأرقام التسلسلية
export const plain = (n: number) => n.toLocaleString('ar-SA', { useGrouping: false });

export const pct = (n: number) => `${plain(Math.round(n))}٪`;

// مختصر لمحاور الرسوم: ١٢ ألف، ١٫٥ مليون
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${num(Math.round((n / 1_000_000) * 10) / 10)} مليون`;
  if (abs >= 1_000) return `${num(Math.round((n / 1_000) * 10) / 10)} ألف`;
  return num(n);
}
