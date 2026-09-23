-- جدول إصدارات التطبيق: كل صف = تحديث جديد يظهر للمستخدمين
create table if not exists public.app_releases (
  id          bigint generated always as identity primary key,
  version     text        not null unique,          -- مثال: 1.1.0 (يطابق version في package.json)
  notes       text        default '',               -- ما الجديد (يظهر للمستخدم)
  mandatory   boolean     not null default false,   -- true = يمنع الاستخدام حتى التحديث
  published   boolean     not null default true,    -- false = مسودة لا تظهر
  created_at  timestamptz not null default now()
);

alter table public.app_releases enable row level security;

-- القراءة متاحة للجميع (مفتاح anon)، والإضافة من لوحة Supabase فقط
drop policy if exists "read published releases" on public.app_releases;
create policy "read published releases" on public.app_releases
  for select using (published = true);

-- مثال لإعلان تحديث:
-- insert into public.app_releases (version, notes, mandatory)
-- values ('1.1.0', E'إضافة تقارير جديدة\nإصلاح أخطاء الطباعة', false);
