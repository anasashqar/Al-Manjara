import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { applyUpdate, checkForUpdate, CURRENT_VERSION, type ReleaseInfo } from '../../utils/updater';

const CHECK_INTERVAL_MS = 10 * 60 * 1000;
const DISMISS_KEY = 'dismissedUpdateVersion';

export function UpdateBanner() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // إزالة معامل كسر الكاش من الرابط بعد التحديث
    const url = new URL(window.location.href);
    if (url.searchParams.has('v')) {
      url.searchParams.delete('v');
      window.history.replaceState(null, '', url.toString());
    }

    let cancelled = false;
    const run = async () => {
      const info = await checkForUpdate();
      if (cancelled) return;
      let dismissed: string | null = null;
      try { dismissed = sessionStorage.getItem(DISMISS_KEY); } catch { /* ignore */ }
      if (info && !info.mandatory && dismissed === info.version) return;
      setRelease(info);
    };

    run();
    const timer = window.setInterval(run, CHECK_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', run);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', run);
    };
  }, []);

  if (!release) return null;

  const handleUpdate = async () => {
    setUpdating(true);
    setError(null);
    try {
      await applyUpdate(setProgress);
    } catch (err: any) {
      console.error('Update failed:', err);
      setError(err?.message || String(err));
      setUpdating(false);
      setProgress(null);
    }
  };

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, release.version); } catch { /* ignore */ }
    setRelease(null);
  };

  const body = (
    <>
      <div className="flex-1 min-w-0">
        <p className="font-bold">
          يتوفر تحديث جديد <span dir="ltr">v{release.version}</span>
          <span className="font-normal opacity-80 text-xs mr-2" dir="ltr">(الحالي v{CURRENT_VERSION})</span>
        </p>
        {release.notes && <p className="text-sm opacity-90 whitespace-pre-line mt-1">{release.notes}</p>}
        {!release.deployed && (
          <p className="text-xs opacity-80 mt-1">جارٍ تجهيز حزمة التحديث، قد يستغرق ذلك بضع دقائق.</p>
        )}
        {updating && progress !== null && (
          <div className="mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-xs bg-red-600/80 rounded px-2 py-1 mt-2">تعذر التحديث: {error}</p>}
      </div>
      <button
        onClick={handleUpdate}
        disabled={updating || !release.deployed}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white text-emerald-700 font-bold px-3 py-1.5 text-sm disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
        {updating ? (progress !== null ? `${progress}%` : 'جارٍ التحديث…') : 'تحديث الآن'}
      </button>
    </>
  );

  if (release.mandatory) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/70 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-emerald-700 text-white rounded-2xl shadow-xl p-5 max-w-md w-full flex flex-col gap-4">
          <p className="text-sm opacity-90">هذا التحديث إلزامي لمتابعة استخدام النظام.</p>
          <div className="flex items-start gap-3">{body}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-[100] bg-emerald-700 text-white rounded-xl shadow-lg p-3 flex items-start gap-3"
      dir="rtl"
    >
      {body}
      <button onClick={dismiss} aria-label="إغلاق" className="shrink-0 opacity-80 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
