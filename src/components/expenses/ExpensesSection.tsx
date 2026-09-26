import React, { useState } from 'react';
import { SegmentedTabs } from '../common/SegmentedTabs';
import { ExpensesView } from './ExpensesView';
import { WorkshopNeedsPanel } from './WorkshopNeedsPanel';
import type { Expense, WorkshopSettings } from '../../types';

interface ExpensesSectionProps {
  expenses: Expense[];
  settings: WorkshopSettings;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

type Tab = 'expenses' | 'needs';

// قسم المصاريف: مصاريف الأسبوع المفتوح + احتياجات المنجرة.
// شاشة الموردين (SuppliersPanel) أُخفيت تبسيطاً؛ بياناتها باقية
export const ExpensesSection: React.FC<ExpensesSectionProps> = (props) => {
  const [tab, setTab] = useState<Tab>('expenses');

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      <SegmentedTabs<Tab>
        className="self-start shrink-0"
        size="sm"
        activeId={tab}
        onChange={setTab}
        options={[
          { id: 'expenses', label: 'المصاريف' },
          { id: 'needs', label: 'المطلوب' },
        ]}
      />
      {tab === 'expenses' && <ExpensesView {...props} />}
      {tab === 'needs' && <WorkshopNeedsPanel />}
    </div>
  );
};
