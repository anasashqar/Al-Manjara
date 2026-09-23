/**
 * تاريخ اليوم بصيغة YYYY-MM-DD حسب التوقيت المحلي للجهاز.
 * (toISOString يعطي تاريخ UTC، فيسجل اليوم السابق بعد منتصف الليل بتوقيت فلسطين)
 */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
