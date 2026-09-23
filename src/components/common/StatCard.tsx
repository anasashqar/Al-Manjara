import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  currency?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'neutral',
  currency,
  badge,
}) => {
  const borderStyles = {
    neutral: 'border-slate-200/80 bg-white hover:border-slate-300',
    primary: 'border-blue-100 bg-white hover:border-blue-200',
    success: 'border-emerald-100 bg-white hover:border-emerald-200',
    warning: 'border-amber-100 bg-white hover:border-amber-200',
    danger: 'border-rose-100 bg-white hover:border-rose-200',
  }[variant];

  const iconStyles = {
    neutral: 'text-slate-600 bg-slate-100',
    primary: 'text-blue-700 bg-blue-50',
    success: 'text-emerald-700 bg-emerald-50',
    warning: 'text-amber-700 bg-amber-50',
    danger: 'text-rose-700 bg-rose-50',
  }[variant];

  const formattedValue = typeof value === 'number' ? value.toLocaleString('ar-SA') : value;

  return (
    <div
      className={`p-3 rounded-[4px] border transition-all duration-150 shadow-xs flex flex-col justify-between ${borderStyles}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-[4px] ${iconStyles}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-0.5">
        <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 font-mono">
          {formattedValue}
        </span>
        {currency && <span className="text-[11px] text-slate-500 font-medium">{currency}</span>}
      </div>

      {(subtitle || badge) && (
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 text-[11px]">
          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
          {badge && (
            <span className="inline-block text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-[6px]">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
