import React from 'react';
import type { OrderStatus, CarpentryCategory, ExpenseCategory } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const styles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
  }[variant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-xs font-semibold border ${styles} ${className}`}
    >
      {children}
    </span>
  );
};

export const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  switch (status) {
    case 'new':
      return <Badge variant="info">جديد</Badge>;
    case 'in_progress':
      return <Badge variant="warning">قيد التنفيذ</Badge>;
    case 'ready':
      return <Badge variant="neutral">جاهز</Badge>;
    case 'delivered':
      return <Badge variant="success">مسلّم</Badge>;
    case 'cancelled':
      return <Badge variant="danger">ملغي</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export const CarpentryCategoryBadge: React.FC<{ category: CarpentryCategory }> = ({ category }) => {
  const labels: Record<CarpentryCategory, string> = {
    kitchen: 'مطبخ',
    doors: 'أبواب',
    bedroom: 'غرف نوم',
    decoration: 'ديكور',
    maintenance: 'صيانة',
    custom: 'تفصيل',
  };

  return <Badge variant="default">{labels[category] || category}</Badge>;
};

export const ExpenseCategoryBadge: React.FC<{ category: ExpenseCategory }> = ({ category }) => {
  const labels: Record<ExpenseCategory, string> = {
    raw_materials: 'أخشاب',
    hardware: 'إكسسوارات',
    finishes: 'دهانات',
    wages: 'أجور',
    workshop: 'فواتير',
    tools: 'صيانة',
    transport: 'نقل',
    general: 'نثريات',
  };

  return <Badge variant="neutral">{labels[category] || category}</Badge>;
};
