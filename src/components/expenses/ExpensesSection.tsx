import React, { useState } from 'react';
import { SegmentedTabs } from '../common/SegmentedTabs';
import { ExpensesView } from './ExpensesView';
import { SuppliersPanel } from '../suppliers/SuppliersPanel';
import { WorkshopNeedsPanel } from './WorkshopNeedsPanel';
import type { Expense, WorkshopSettings } from '../../types';

interface ExpensesSectionProps {
  expenses: Expense[];
  settings: WorkshopSettings;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
}

type Tab = 'expenses' | 'suppliers' | 'needs';

// قسم المصاريف: المصاريف النقدية + الموردون (المشتريات الآجلة وسدادها) + احتياجات المنجرة + احتياجات المنجرة
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
          { id: 'suppliers', label: 'الموردون' },
          { id: 'needs', label: 'المطلوب' },
        ]}
      />
      {tab === 'expenses' && <ExpensesView {...props} />}
      {tab === 'suppliers' && <SuppliersPanel settings={props.settings} />}
      {tab === 'needs' && <WorkshopNeedsPanel />}
    </div>
  );
};
