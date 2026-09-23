import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

// بديل داخل البرنامج لـ window.confirm و alert (بدل نوافذ المتصفح "localhost says")

interface AskOptions {
  message?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

interface PendingAsk extends AskOptions {
  title: string;
  resolve: (ok: boolean) => void;
}

interface Notice {
  id: number;
  text: string;
  kind: 'error' | 'success';
}

let showAsk: ((a: PendingAsk) => void) | null = null;
let showNotice: ((n: Notice) => void) | null = null;
let noticeSeq = 0;

// تأكيد: const ok = await ask('حذف السند؟')
export function ask(title: string, options: AskOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!showAsk) return resolve(false);
    showAsk({ title, confirmLabel: 'حذف', danger: true, ...options, resolve });
  });
}

// تنبيه قصير يختفي وحده
export function notify(text: string, kind: Notice['kind'] = 'error') {
  showNotice?.({ id: ++noticeSeq, text, kind });
}

// يُركَّب مرة واحدة في App
export const DialogHost: React.FC = () => {
  const [pending, setPending] = useState<PendingAsk | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    showAsk = setPending;
    showNotice = setNotice;
    return () => {
      showAsk = null;
      showNotice = null;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice((n) => (n?.id === notice.id ? null : n)), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <>
      <ConfirmDialog
        isOpen={!!pending}
        title={pending?.title ?? ''}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        danger={pending?.danger}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />

      {notice && (
        <div
          role="status"
          onClick={() => setNotice(null)}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-[6px] shadow-lg text-sm font-semibold cursor-pointer ${
            notice.kind === 'error' ? 'bg-[#b91c1c] text-white' : 'bg-[#166534] text-white'
          }`}
        >
          {notice.text}
        </div>
      )}
    </>
  );
};
