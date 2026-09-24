# 🚀 دليل نشر إصدار جديد — المنجرة

## كيف يعمل النظام؟

```
كود → git push + tag → GitHub Actions → بناء تلقائي → GitHub Release → تحديث تلقائي للمستخدمين
```

التطبيق يتحقق من هذا الرابط عند كل تشغيل:
```
https://github.com/anasashqar/Al-Manjara/releases/latest/download/latest.json
```
فإذا وجد إصداراً أحدث من المثبَّت، يعرض للمستخدم إشعار التحديث.

---

## خطوات نشر إصدار جديد

### الخطوة 1 — أجرِ تعديلاتك كالمعتاد
```powershell
git add -A
git commit -m "وصف التغييرات"
```

### الخطوة 2 — ارفع رقم الإصدار
```powershell
# تغيير بسيط (bug fix): 1.0.1 → 1.0.2
npm version patch

# ميزة جديدة: 1.0.0 → 1.1.0
npm version minor

# تغيير جذري: 1.0.0 → 2.0.0
npm version major
```
> هذا يحدّث `package.json` تلقائياً، وبما أن `tauri.conf.json` يقرأ منه، فلا تحتاج تعديله.

### الخطوة 3 — ارفع الكود والـ Tag معاً
```powershell
git push origin main
git push origin v1.0.2   # ← نفس الرقم الجديد
```

### الخطوة 4 — انتظر البناء (10–20 دقيقة)
تابع التقدم على:
👉 https://github.com/anasashqar/Al-Manjara/actions

عند اكتمال البناء يظهر Release جديد تلقائياً على:
👉 https://github.com/anasashqar/Al-Manjara/releases

---

## ملاحظات الإصدار (اختياري)

إذا أردت أن تظهر رسالة للمستخدم تشرح التغييرات، عدِّل الملف:
```
RELEASE_NOTES.md
```
قبل رفع الـ tag. إذا لم يوجد الملف، تظهر رسالة افتراضية:
> "تحسينات وإصلاحات عامة."

---

## متطلبات GitHub Secrets

هذه القيم يجب أن تكون مضبوطة في:
`GitHub → Settings → Secrets and variables → Actions`

| Secret | الوصف |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | المفتاح الخاص لتوقيع التحديثات |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | كلمة مرور المفتاح |
| `VITE_SUPABASE_URL` | رابط Supabase |
| `VITE_SUPABASE_ANON_KEY` | مفتاح Supabase العام |

> ⚠️ لا تشارك `TAURI_SIGNING_PRIVATE_KEY` مع أحد. إذا ضاع، لا يمكن للمستخدمين القدامى تثبيت التحديثات.

---

## ملخص سريع (للحفظ)

```powershell
git add -A
git commit -m "v?.?.?: وصف"
npm version patch
git push origin main
git push origin vX.X.X
```
