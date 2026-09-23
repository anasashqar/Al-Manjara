import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import type { WorkStage } from '../../types';
import { WORK_STAGE_LABELS } from '../../types';

interface StageDropdownProps {
  value?: WorkStage | '' | null;
  onChange: (stage: WorkStage | '') => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  placeholder?: string;
}

const STAGE_DOT_COLORS: Record<WorkStage, string> = {
  waiting: 'bg-slate-400',
  manufacturing: 'bg-blue-500',
  finishing: 'bg-amber-500',
  ready_deliver: 'bg-emerald-500',
};

const STAGE_BUTTON_STYLES: Record<WorkStage, string> = {
  waiting: 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100/70',
  manufacturing: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70',
  finishing: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70',
  ready_deliver: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70',
};

export const StageDropdown: React.FC<StageDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  fullWidth = false,
  placeholder = '— حدد —',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number; width: number }>({
    top: 0,
    right: 0,
    width: 140,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuEstimatedHeight = 175;

    const showAbove = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;
    const top = showAbove ? rect.top - menuEstimatedHeight - 4 : rect.bottom + 4;

    const menuWidth = Math.max(rect.width, 150);
    let right = window.innerWidth - rect.right;

    if (right + menuWidth > window.innerWidth) {
      right = window.innerWidth - menuWidth - 8;
    }
    if (right < 8) {
      right = 8;
    }

    setCoords({ top, right, width: menuWidth });
  };

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (stage: WorkStage | '') => {
    onChange(stage);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', () => setIsOpen(false));
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', () => setIsOpen(false));
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentStage = value as WorkStage | undefined;
  const currentLabel = currentStage ? WORK_STAGE_LABELS[currentStage] : placeholder;
  const dotColor = currentStage ? STAGE_DOT_COLORS[currentStage] : 'bg-slate-300';
  const buttonStyle = currentStage
    ? STAGE_BUTTON_STYLES[currentStage]
    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`inline-flex items-center justify-between gap-1.5 rounded-[4px] border font-semibold font-sans transition-all select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#166534] disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyle} ${
          fullWidth ? 'w-full px-3 py-1.5 text-xs sm:text-sm' : 'px-2 py-1 text-[11px]'
        } ${className}`}
      >
        <span className="inline-flex items-center gap-1.5 truncate">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <span className="truncate">{currentLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 opacity-60 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: `${coords.top}px`,
              right: `${coords.right}px`,
              minWidth: `${coords.width}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[9999] bg-white border border-slate-200 rounded-[6px] shadow-xl py-1 select-none font-sans text-right"
            dir="rtl"
          >
            {/* Option to clear */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-sans transition-colors cursor-pointer hover:bg-slate-50 ${
                !value ? 'text-slate-900 font-bold bg-slate-50' : 'text-slate-500'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                <span>{placeholder}</span>
              </span>
              {!value && <Check className="w-3.5 h-3.5 text-[#166534] shrink-0" />}
            </button>

            <div className="h-px bg-slate-100 my-1" />

            {/* Stages */}
            {(Object.entries(WORK_STAGE_LABELS) as [WorkStage, string][]).map(([val, label]) => {
              const isSelected = value === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSelect(val)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-sans transition-colors cursor-pointer hover:bg-slate-50 ${
                    isSelected ? 'text-slate-900 font-bold bg-slate-50' : 'text-slate-700'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STAGE_DOT_COLORS[val]}`} />
                    <span>{label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#166534] shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
