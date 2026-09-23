import { isTauri } from '@tauri-apps/api/core';
import type { Update } from '@tauri-apps/plugin-updater';
import { getSupabaseClient } from '../db/supabaseClient';

export const CURRENT_VERSION = __APP_VERSION__;
export const IS_DESKTOP = isTauri();

export interface ReleaseInfo {
  version: string;
  notes: string;
  /** تحديث إجباري: يمنع استخدام التطبيق حتى يتم التحديث */
  mandatory: boolean;
  /** هل حزمة التحديث جاهزة للتنزيل (نُشرت على GitHub / الخادم) */
  deployed: boolean;
}

/** مقارنة أرقام الإصدارات بصيغة 1.2.3 — تعيد موجباً إذا كانت a أحدث */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

// حزمة التحديث التي عثر عليها Tauri (تُستخدم عند التثبيت)
let pendingUpdate: Update | null = null;

/** نسخة سطح المكتب: يقرأ latest.json من GitHub Releases ويتحقق من التوقيع */
async function fetchDesktopUpdate(): Promise<{ version: string; notes: string } | null> {
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    pendingUpdate = update;
    return update ? { version: update.version, notes: update.body ?? '' } : null;
  } catch (err) {
    console.warn('Desktop update check notice:', err);
    return null;
  }
}

/** نسخة الويب: يقرأ version.json من الخادم */
async function fetchWebDeployedVersion(): Promise<string | null> {
  if (import.meta.env.DEV) return null;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

/** إعلان الإصدار من Supabase: ملاحظات + هل هو إلزامي */
async function fetchLatestRelease(): Promise<{ version: string; notes: string; mandatory: boolean } | null> {
  try {
    const client = await getSupabaseClient();
    if (!client) return null;
    const { data, error } = await client
      .from('app_releases')
      .select('version, notes, mandatory')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return { version: data.version, notes: data.notes ?? '', mandatory: !!data.mandatory };
  } catch {
    return null;
  }
}

/** يفحص وجود تحديث (GitHub Releases لسطح المكتب أو version.json للويب) مع بيانات Supabase */
export async function checkForUpdate(): Promise<ReleaseInfo | null> {
  if (!navigator.onLine) return null;

  const [available, release] = await Promise.all([
    IS_DESKTOP
      ? fetchDesktopUpdate()
      : fetchWebDeployedVersion().then((v) => (v ? { version: v, notes: '' } : null)),
    fetchLatestRelease(),
  ]);

  const availableNewer = available && compareVersions(available.version, CURRENT_VERSION) > 0 ? available : null;
  const releaseNewer = release && compareVersions(release.version, CURRENT_VERSION) > 0 ? release : null;

  if (!availableNewer && !releaseNewer) return null;

  const version = releaseNewer?.version ?? availableNewer!.version;
  const deployed = availableNewer
    ? compareVersions(availableNewer.version, version) >= 0
    : !IS_DESKTOP && available === null; // ويب بدون version.json (تشغيل محلي): نفترض أنه منشور

  return {
    version,
    notes: releaseNewer?.notes || availableNewer?.notes || '',
    mandatory: releaseNewer?.mandatory ?? false,
    deployed,
  };
}

/**
 * سطح المكتب: ينزّل الحزمة الموقّعة ويثبّتها ثم يعيد تشغيل البرنامج.
 * الويب: يمسح الكاش ويعيد تحميل الصفحة.
 */
export async function applyUpdate(onProgress?: (percent: number | null) => void): Promise<void> {
  if (IS_DESKTOP) {
    if (!pendingUpdate) throw new Error('لا توجد حزمة تحديث جاهزة');
    let total = 0;
    let downloaded = 0;
    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0;
        onProgress?.(total ? 0 : null);
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        onProgress?.(total ? Math.round((downloaded / total) * 100) : null);
      }
    });
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
    return;
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    console.warn('Update cache cleanup notice:', err);
  }
  const url = new URL(window.location.href);
  url.searchParams.set('v', Date.now().toString());
  window.location.replace(url.toString());
}
