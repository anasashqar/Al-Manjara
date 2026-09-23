# دليل إصدار التحديثات — نسخة سطح المكتب

البرنامج مبني بـ **Tauri 2** ويحدّث نفسه تلقائياً من **GitHub Releases**.
كل ما عليك: رفع رقم الإصدار ودفع وسم (tag)، والباقي يتم تلقائياً.

---

## إصدار تحديث جديد (الخطوات المعتادة)

1. **ارفع رقم الإصدار** في `package.json`:
   ```json
   "version": "1.0.1"
   ```
   > هذا هو المصدر الوحيد لرقم الإصدار؛ `src-tauri/tauri.conf.json` يقرأ منه تلقائياً.
   > يجب أن يكون أكبر من الإصدار السابق (`1.0.0` ← `1.0.1` ← `1.1.0` ...).

2. **اكتب ما الجديد** في `RELEASE_NOTES.md` (يظهر للمستخدم داخل إشعار التحديث):
   ```markdown
   - إضافة تقرير الأرباح الشهري
   - إصلاح مشكلة الطباعة
   ```

3. **ارفع التعديلات ثم الوسم** (يجب أن يطابق الوسم رقم الإصدار مع حرف `v`):
   ```bash
   git add -A
   git commit -m "Release v1.0.1"
   git push
   git tag v1.0.1
   git push --tags
   ```

4. **انتظر ~10 دقائق** وتابع البناء من تبويب **Actions** في المستودع.
   عند نجاحه يظهر الإصدار في **Releases** ومعه:
   - `Al-Manjara_1.0.1_x64-setup.exe` — ملف التثبيت
   - `Al-Manjara_1.0.1_x64-setup.exe.sig` — توقيع التحديث
   - `latest.json` — الملف الذي يقرؤه البرنامج ليعرف أن هناك تحديثاً

5. **انتهى.** البرامج المثبّتة ستُظهر إشعار «يتوفر تحديث جديد»، وبضغطة واحدة
   يتم التنزيل والتثبيت وإعادة التشغيل.

---

## كيف يعمل النظام

```
package.json (version) ──► git tag v* ──► GitHub Actions (.github/workflows/release.yml)
                                              │  يبني البرنامج ويوقّعه بالمفتاح السري
                                              ▼
                                   GitHub Releases + latest.json
                                              │
            البرنامج المثبّت يفحص عند التشغيل، كل 10 دقائق، وعند العودة للنافذة
                                              ▼
                   ينزّل ← يتحقق من التوقيع ← يثبّت ← يعيد التشغيل
```

- رابط الفحص: `https://github.com/anasashqar/Woodshop/releases/latest/download/latest.json`
  (يعمل لأن المستودع **عام**؛ إن جعلته خاصاً ستتوقف التحديثات).
- البرنامج يرفض أي تحديث غير موقّع بمفتاحنا، فلا يمكن لأحد دفع تحديث مزيّف.
- يمكن للمستخدم إغلاق الإشعار؛ سيظهر مجدداً في الجلسة التالية.

### الملفات المعنية

| الملف | الدور |
|---|---|
| `package.json` | رقم الإصدار |
| `RELEASE_NOTES.md` | ملاحظات الإصدار الظاهرة للمستخدم |
| `.github/workflows/release.yml` | البناء والنشر التلقائي عند دفع وسم `v*` |
| `src-tauri/tauri.conf.json` | إعدادات البرنامج + المفتاح العام + رابط التحديث |
| `src/utils/updater.ts` | منطق الفحص والتنزيل والتثبيت |
| `src/components/update/UpdateBanner.tsx` | إشعار التحديث وشريط التقدم |
| `src-tauri/app-icon.png` | الشعار الأصلي (مصدر الأيقونات) |

---

## مفتاح التوقيع ⚠️ مهم جداً

- **المفتاح الخاص:** `C:\Users\sa\.tauri\al-manjara.key` (بدون كلمة سر)
  - محفوظ في GitHub كـ Secret باسم `TAURI_SIGNING_PRIVATE_KEY`.
  - **لا ترفعه للمستودع أبداً.**
  - **احتفظ بنسخة احتياطية** (فلاشة / مدير كلمات سر). إن ضاع، لن تستطيع إرسال
    تحديثات للأجهزة المثبّت عليها البرنامج، وسيلزم تثبيت نسخة جديدة يدوياً على كل جهاز.
- **المفتاح العام:** موجود داخل `src-tauri/tauri.conf.json` (آمن للنشر).

---

## البناء محلياً (للتجربة)

```bash
npm run desktop:dev     # تشغيل البرنامج أثناء التطوير
npm run desktop:build   # بناء ملف التثبيت
```

البناء المحلي مع توقيع التحديث (PowerShell):
```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "$HOME\.tauri\al-manjara.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npm run desktop:build
```
الناتج في: `src-tauri\target\release\bundle\nsis\`

> أول بناء يستغرق ~8 دقائق (تجميع مكتبات Rust)، وما بعده أسرع بكثير.

### تغيير الشعار
ضع الصورة الجديدة (PNG مربعة، 1024px أو أكبر، بخلفية شفافة) مكان `src-tauri/app-icon.png` ثم:
```bash
npx tauri icon src-tauri/app-icon.png
```
وانسخ `src-tauri/icons/128x128@2x.png` إلى `src/assets/logo.png` و `public/logo.png`.

---

## حل المشاكل

| المشكلة | الحل |
|---|---|
| فشل البناء في Actions بخطأ توقيع | تأكد من وجود Secret `TAURI_SIGNING_PRIVATE_KEY` في Settings ← Secrets ← Actions |
| لا يظهر إشعار التحديث | تأكد أن رقم الإصدار أكبر من المثبّت، وأن الإصدار في Releases ليس Draft/Pre-release، وأن `latest.json` موجود فيه |
| نشرت إصداراً خاطئاً | انشر إصداراً أحدث مصحّحاً (مثلاً `1.0.2`)؛ لا يمكن الرجوع لرقم أقدم |
| خطأ Rust محلياً `only metadata stub found for rlib core` | `rustup component remove rust-std-x86_64-pc-windows-msvc` ثم `rustup component add rust-std-x86_64-pc-windows-msvc` |

---

## اختياري: Supabase (غير مفعّل حالياً)

النظام يعمل بالكامل بدون Supabase. عند ربطه لاحقاً (من إعدادات البرنامج) وتشغيل
`supabase/app_releases.sql`، يمكن إضافة صف لكل إصدار للحصول على:
- **تحديث إلزامي** (`mandatory = true`) يمنع استخدام البرنامج حتى يُحدَّث.
- ملاحظات تُعدَّل دون إعادة بناء.

```sql
insert into app_releases (version, notes, mandatory)
values ('1.0.1', E'إصلاح مهم في الحسابات', true);
```
