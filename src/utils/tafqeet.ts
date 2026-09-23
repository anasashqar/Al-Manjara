/**
 * دالة تفقيط المبالغ المالية باللغة العربية بصبغة فلسطينية (شيكل وأغورة)
 */

const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
const teens = [
  'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];

function convertGroup(n: number): string {
  let result = '';
  const h = Math.floor(n / 100);
  const remainder = n % 100;
  const t = Math.floor(remainder / 10);
  const o = remainder % 10;

  if (h > 0) {
    result += hundreds[h];
  }

  if (remainder > 0) {
    if (result.length > 0) result += ' و';

    if (remainder >= 11 && remainder <= 19) {
      result += teens[remainder - 11];
    } else if (o > 0) {
      result += ones[o];
      if (t > 0) result += ' و' + tens[t];
    } else if (t > 0) {
      result += tens[t];
    }
  }

  return result;
}

interface NounForms {
  one: string;        // ألف / مليون / شيكل
  two: string;        // ألفان / مليونان / شيكلان
  plural: string;     // آلاف / ملايين / شواكل  (3 - 10)
  accusative: string; // ألفاً / مليوناً / شيكلاً (11 - 99)
}

/**
 * العدد مع معدوده حسب قواعد التمييز: يعتمد شكل المعدود على آخر رقمين من العدد
 * (100 شيكل، 105 شواكل، 150 شيكلاً، 1000 ألف...)
 */
function countWithNoun(n: number, forms: NounForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  const lastTwo = n % 100;
  const number = convertGroup(n);
  if (lastTwo >= 3 && lastTwo <= 10) return `${number} ${forms.plural}`;
  if (lastTwo >= 11) return `${number} ${forms.accusative}`;
  return `${number} ${forms.one}`;
}

const THOUSAND: NounForms = { one: 'ألف', two: 'ألفان', plural: 'آلاف', accusative: 'ألفاً' };
const MILLION: NounForms = { one: 'مليون', two: 'مليونان', plural: 'ملايين', accusative: 'مليوناً' };
const SHEKEL: NounForms = { one: 'شيكل', two: 'شيكلان', plural: 'شواكل', accusative: 'شيكلاً' };

function convertInteger(n: number): string {
  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  if (millions > 0) parts.push(countWithNoun(millions, MILLION));
  if (thousands > 0) parts.push(countWithNoun(thousands, THOUSAND));
  if (rest > 0) parts.push(convertGroup(rest));
  return parts.join(' و');
}

export function tafqeetShekels(amount: number): string {
  if (!amount || isNaN(amount)) {
    return 'فقط صفر شيكل لا غير';
  }

  const absAmount = Math.abs(amount);
  let integerPart = Math.floor(absAmount);
  let decimalPart = Math.round((absAmount - integerPart) * 100);
  if (decimalPart === 100) {
    integerPart += 1;
    decimalPart = 0;
  }

  let text = '';

  if (integerPart === 1) {
    text = 'شيكل واحد';
  } else if (integerPart === 2) {
    text = 'شيكلان';
  } else if (integerPart > 2) {
    // شكل كلمة "شيكل" يتبع آخر رقمين من المبلغ
    const lastTwo = integerPart % 100;
    const noun =
      lastTwo >= 3 && lastTwo <= 10 ? SHEKEL.plural
      : lastTwo >= 11 ? SHEKEL.accusative
      : SHEKEL.one;
    let number = convertInteger(integerPart);
    // إذا جاءت "شيكل" مباشرة بعد ألف/مليون/مائتين فهي مضاف إليه: ألفا شيكل، مائتا شيكل، عشرون ألف شيكل
    if (noun === SHEKEL.one) {
      number = number
        .replace(/(ألف|مليون)اً$/, '$1')
        .replace(/(ألف|مليون|مائت)ان$/, '$1ا');
    }
    text = `${number} ${noun}`;
  }

  if (decimalPart > 0) {
    const agorot = `${convertGroup(decimalPart)} أغورة`;
    text = text ? `${text} و${agorot}` : agorot;
  }

  return `فقط ${text} لا غير`;
}
