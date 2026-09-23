import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-sm bg-white rounded-[6px] shadow-xl border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-150"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="p-5 text-right">
          <div className="flex items-center gap-3 mb-3">
            {danger && (
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#b91c1c]" />
              </div>
            )}
            <h3 className="font-bold text-slate-900 text-sm leading-snug flex-1">
              {title}
            </h3>
          </div>
          {message ? <p className="text-xs text-slate-600 leading-relaxed mb-5">{message}</p> : <div className="mb-4" />}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-4 rounded-[6px] border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`h-8 px-4 rounded-[6px] text-white text-xs font-semibold transition-colors shadow-xs ${
                danger
                  ? 'bg-[#b91c1c] hover:bg-[#991b1b]'
                  : 'bg-[#166534] hover:bg-[#14532d]'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
