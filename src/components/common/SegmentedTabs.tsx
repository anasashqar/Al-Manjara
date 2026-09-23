
export interface TabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedTabsProps<T extends string = string> {
  options: TabOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedTabs<T extends string = string>({
  options,
  activeId,
  onChange,
  className = '',
  size = 'md',
}: SegmentedTabsProps<T>) {
  const pad = size === 'sm' ? 'py-1 px-2.5 text-xs' : 'py-1.5 px-3.5 text-xs sm:text-sm';

  return (
    <div
      className={`inline-flex items-center p-0.5 bg-slate-200/80 rounded-[4px] select-none gap-0.5 max-w-full overflow-x-auto ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.id)}
            className={`whitespace-nowrap font-medium rounded-[6px] transition-all duration-150 flex items-center gap-1.5 focus:outline-none ${pad} ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-[6px] font-mono ${
                  isActive
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-slate-300/70 text-slate-700'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
