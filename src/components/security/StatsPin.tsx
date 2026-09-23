import React, { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { resetPinWithRecovery, setStatsPin } from '../../db/dexie';
import { PIN_LENGTH, verifyPin } from '../../utils/pin';
import { DOC_LABELS, DOC_PREFIX, type DocKind } from '../../utils/docNumber';
import type { WorkshopSettings } from '../../types';
import { ask } from '../common/Dialogs';

// ───────── إدخال 4 أرقام في مربعات ─────────
// حقل واحد شفاف فوق المربعات: أبسط وأثبت من التنقل بين 4 حقول
export const PinInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  autoFocus?: boolean;
  invalid?: boolean;
  label: string;
}> = ({ value, onChange, onComplete, autoFocus, invalid, label }) => {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <div className="relative inline-flex gap-2" dir="ltr">
      {Array.from({ length: PIN_LENGTH }, (_, i) => {
        const active = focused && i === Math.min(value.length, PIN_LENGTH - 1);
        return (
          <div
            key={i}
            className={`w-10 h-11 rounded-[6px] border-2 flex items-center justify-center text-xl font-bold bg-white ${
              invalid ? 'border-rose-400' : active ? 'border-[#166534]' : 'border-slate-300'
            }`}
          >
            {value[i] ? '•' : ''}
          </div>
        );
      })}
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
          onChange(v);
          if (v.length === PIN_LENGTH) onComplete?.(v);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="off"
        maxLength={PIN_LENGTH}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  );
};

// ───────── طلب الرمز (الإحصاءات والإعدادات) ─────────
export const PinPromptModal: React.FC<{
  isOpen: boolean;
  pinHash: string | undefined;
  title: string;
  onClose: () => void;
  onUnlock: () => void;
}> = ({ isOpen, pinHash, title, onClose, onUnlock }) => {
  const [mode, setMode] = useState<'enter' | 'recover'>('enter');
  const [pin, setPin] = useState('');
  const [word, setWord] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMode('enter');
    setPin('');
    setWord('');
    setNewPin('');
    setError('');
  }, [isOpen]);

  const check = (v: string) => {
    if (verifyPin(v, pinHash)) return onUnlock();
    setError('رمز خاطئ');
    setPin('');
  };

  const recover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPinWithRecovery(word, newPin);
      onUnlock();
    } catch (err: any) {
      setError(err?.message || 'تعذر الحفظ');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      {mode === 'enter' ? (
        <div className="flex flex-col items-center gap-3 py-2 text-xs">
          <Lock className="w-5 h-5 text-slate-400" />
          <PinInput
            value={pin}
            onChange={(v) => {
              setPin(v);
              if (v) setError('');
            }}
            onComplete={check}
            invalid={!!error}
            autoFocus
            label="الرمز"
          />
          <div className="h-4 text-rose-600 font-semibold">{error}</div>
          <button
            type="button"
            onClick={() => {
              setMode('recover');
              setError('');
            }}
            className="text-slate-500 hover:text-slate-800 underline"
          >
            نسيت الرمز؟
          </button>
        </div>
      ) : (
        <form onSubmit={recover} className="space-y-3 text-xs">
          <label className="block space-y-1">
            <span className="block font-semibold text-slate-700">كلمة الاستعادة</span>
            <input
              value={word}
              onChange={(e) => {
                setWord(e.target.value);
                setError('');
              }}
              autoFocus
              autoComplete="off"
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#166534]"
            />
          </label>
          <div className="space-y-1">
            <span className="block font-semibold text-slate-700">رمز جديد</span>
            <PinInput value={newPin} onChange={setNewPin} label="رمز جديد" />
          </div>
          <div className="h-4 text-rose-600 font-semibold">{error}</div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!word.trim() || newPin.length !== PIN_LENGTH}
              className="h-8 px-4 rounded-[6px] bg-[#166534] hover:bg-[#14532d] text-white font-semibold disabled:opacity-40"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setMode('enter')}
              className="h-8 px-3.5 rounded-[6px] border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              رجوع
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};

// ───────── قسم الرمز في الإعدادات ─────────
export const StatsPinSettings: React.FC<{ settings: WorkshopSettings }> = ({ settings }) => {
  const hasPin = !!settings.statsPinHash;
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [saved, setSaved] = useState('');

  const save = async (value: string | null) => {
    await setStatsPin(value);
    setEditing(false);
    setPin('');
    setSaved(value === null ? 'أُزيل الرمز' : 'تم الحفظ');
  };

  const btn = 'h-8 px-3.5 rounded-[6px] text-xs font-semibold';

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-slate-300 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div>
          <h2 className="font-bold text-slate-900 text-sm font-display">رمز الحماية</h2>
          <p className="text-[11px] text-slate-500">للإحصاءات والإعدادات. عند النسيان: «نسيت الرمز؟»</p>
        </div>
        <span className={`text-xs font-semibold ${hasPin ? 'text-[#15803d]' : 'text-slate-400'}`}>
          {hasPin ? 'مفعّل' : 'غير مفعّل'}
        </span>
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <PinInput value={pin} onChange={setPin} autoFocus label="الرمز الجديد" />
          <button
            type="button"
            onClick={() => save(pin)}
            disabled={pin.length !== PIN_LENGTH}
            className={`${btn} bg-[#166534] hover:bg-[#14532d] text-white disabled:opacity-40`}
          >
            حفظ
          </button>
          <button type="button" onClick={() => setEditing(false)} className={`${btn} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
            إلغاء
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setSaved('');
            }}
            className={`${btn} ${hasPin ? 'border border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-[#166534] hover:bg-[#14532d] text-white'}`}
          >
            {hasPin ? 'تغيير' : 'تفعيل'}
          </button>
          {hasPin && (
            <button
              type="button"
              onClick={async () => (await ask('إزالة الرمز؟', { confirmLabel: 'إزالة' })) && save(null)}
              className={`${btn} border border-rose-200 text-rose-600 hover:bg-rose-50`}
            >
              إزالة
            </button>
          )}
          {saved && <span className="text-xs font-semibold text-[#15803d]">{saved}</span>}
        </div>
      )}
    </div>
  );
};

// ───────── رموز المستندات ─────────
const LEGEND: DocKind[] = ['R', 'P', 'O', 'E', 'I', 'OB'];

export const DocCodesLegend: React.FC = () => (
  <div className="bg-white p-3.5 sm:p-4 rounded-[4px] border border-slate-300 space-y-2.5 shadow-2xs">
    <h2 className="font-bold text-slate-900 text-sm font-display border-b border-slate-200 pb-2">رموز المستندات</h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
      {LEGEND.map((k) => (
        <div key={k} className="flex items-center gap-2 border border-slate-200 rounded-[4px] px-2.5 py-1.5">
          <span className="font-bold text-[#166534] whitespace-nowrap">{DOC_PREFIX[k]}-15</span>
          <span className="text-slate-600">{DOC_LABELS[k]}</span>
        </div>
      ))}
    </div>
  </div>
);
