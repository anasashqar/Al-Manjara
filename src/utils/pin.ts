/**
 * رمز الإحصاءات: 4 أرقام. يُخزَّن كبصمة وليس كنص حتى لا يظهر في ملف النسخة الاحتياطية.
 * الهدف منع الاطلاع العابر وليس حماية تشفيرية (البيانات محلية على الجهاز).
 */

export const PIN_LENGTH = 4;

export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

// FNV-1a 32bit: متزامن ويعمل حتى خارج السياقات الآمنة (http على الشبكة المحلية)
export function hashPin(pin: string): string {
  let h = 0x811c9dc5;
  for (const ch of `al-manjara:${pin}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const verifyPin = (pin: string, hash: string | undefined) => !!hash && hashPin(pin) === hash;

// كلمة الاستعادة عند نسيان الرمز (مخزنة كبصمة فقط)
const RECOVERY_HASH = '7816de1d';
export const verifyRecoveryWord = (word: string) => hashPin(`recover:${word.trim().toLowerCase()}`) === RECOVERY_HASH;
