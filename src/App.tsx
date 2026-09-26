import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  DEFAULT_SETTINGS,
  getWorkshopSettings,
  createOrder,
  updateOrder,
  createExpense,
  updateExpense,
  type InitialDeposit,
} from './db/dexie';
import { initializeCleanDatabase } from './db/seedData';
import { todayISO } from './utils/date';
import { Sidebar, type NavSection } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OrdersView } from './components/orders/OrdersView';
import { ExpensesSection } from './components/expenses/ExpensesSection';
import { isReceivable } from './utils/finance';
import { FinancialReport } from './components/financials/FinancialReport';
import { SettingsView } from './components/settings/SettingsView';
import { OrderFormModal } from './components/orders/OrderFormModal';
import { ExpenseFormModal } from './components/expenses/ExpenseFormModal';
import { PaymentModal } from './components/debts/PaymentModal';
import { OrderReceiptModal } from './components/orders/OrderReceiptModal';
import { PinPromptModal } from './components/security/StatsPin';
import { DialogHost } from './components/common/Dialogs';
import { UpdateBanner } from './components/update/UpdateBanner';
import type { Order, Expense, PaymentTransaction, WorkshopSettings } from './types';

export function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('orders');
  const [askSettingsPin, setAskSettingsPin] = useState(false);
  // القائمة ظاهرة دائماً على الحاسوب؛ هذه الحالة تتحكم بدرج الجوال فقط
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [quickPayOrder, setQuickPayOrder] = useState<Order | null>(null);
  const [receiptData, setReceiptData] = useState<{
    order: Order;
    payment: PaymentTransaction;
  } | null>(null);

  // Live Dexie queries
  const orders = useLiveQuery(() => db.orders.toArray(), []) || [];
  const expenses = useLiveQuery(() => db.expenses.toArray(), []) || [];
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray(), []) || [];
  const settingsLive = useLiveQuery(() => db.settings.get('current_workshop'), []);
  const settings: WorkshopSettings = settingsLive || DEFAULT_SETTINGS;

  // Initialize clean database without seed data on startup
  useEffect(() => {
    initializeCleanDatabase().catch(console.error);
  }, []);

  // Save Order
  const handleSaveOrder = async (
    orderData: Partial<Order>,
    deposit?: InitialDeposit
  ) => {
    if (editingOrder) {
      const changes: Partial<Order> = {
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        description: orderData.description,
        totalAmount: orderData.totalAmount,
        status: orderData.status,
        workStage: orderData.workStage,
        notes: orderData.notes,
      };
      // لا نمرر الحقول غير المعبأة حتى لا تُمسح القيم المحفوظة
      (Object.keys(changes) as (keyof Order)[]).forEach((k) => changes[k] === undefined && delete changes[k]);
      await updateOrder(editingOrder.id, changes);
    } else {
      const { order: created, payment: receipt } = await createOrder(
        {
          customerName: orderData.customerName || '',
          customerPhone: orderData.customerPhone || '',
          category: orderData.category || 'custom',
          description: orderData.description || '',
          woodType: orderData.woodType || 'حسب الاتفاق',
          dimensions: orderData.dimensions,
          totalAmount: orderData.totalAmount || 0,
          status: orderData.status || 'in_progress',
          workStage: orderData.workStage,
          deliveryDate: orderData.deliveryDate || todayISO(),
          notes: orderData.notes,
        },
        deposit
      );
      if (receipt) {
        setReceiptData({ order: created, payment: receipt });
      }
    }
    setEditingOrder(null);
  };

  // Save Expense
  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    if (editingExpense) {
      await updateExpense(editingExpense.id, expenseData);
    } else {
      await createExpense({
        title: expenseData.title || '',
        category: expenseData.category || 'general',
        amount: expenseData.amount || 0,
        date: expenseData.date || todayISO(),
        paymentMethod: expenseData.paymentMethod || 'نقداً',
        supplierName: expenseData.supplierName,
        notes: expenseData.notes,
      });
    }
    setEditingExpense(null);
  };

  // بيانات المصاريف السابقة، الأكثر تكراراً أولاً (سندات الموردين لها بيان تلقائي فتُستثنى)
  const expenseTitles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) {
      const t = e.title.trim();
      if (t && !e.linkedPaymentId) counts.set(t, (counts.get(t) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [expenses]);

  // الطلبيات الملغاة ليست ديوناً
  const ordersWithDebt = orders.filter(isReceivable);
  const pendingDebtsCount = ordersWithDebt.length;

  return (
    <div className="h-dvh overflow-hidden bg-[#f4f7f6] text-slate-900 flex font-sans antialiased" dir="rtl">
      {/* Sidebar: 4 Non-overlapping sections */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(sec) => {
          // الإعدادات محمية بالرمز في كل مرة تُفتح
          if (sec === 'settings' && currentSection !== 'settings' && settings.statsPinHash) {
            setAskSettingsPin(true);
          } else {
            setCurrentSection(sec);
          }
        }}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        pendingDebtsCount={pendingDebtsCount}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 lg:mr-60">
        {/* Header */}
        <Header
          settings={settings}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Section Views (1 Place for Each Service) */}
        {/* الشاشة ثابتة: كل قسم يملأ المساحة والتمرير داخل الجداول فقط */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-2.5 sm:p-4 max-w-7xl w-full mx-auto">
          {currentSection === 'orders' && (
            <OrdersView
              orders={orders}
              settings={settings}
              onOpenNewOrder={() => {
                setEditingOrder(null);
                setIsOrderModalOpen(true);
              }}
              onEditOrder={(order) => {
                setEditingOrder(order);
                setIsOrderModalOpen(true);
              }}
              onQuickPay={(order) => setQuickPayOrder(order)}
            />
          )}

          {currentSection === 'expenses' && (
            <ExpensesSection
              expenses={expenses}
              settings={settings}
              onOpenNewExpense={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
              onEditExpense={(expense) => {
                setEditingExpense(expense);
                setIsExpenseModalOpen(true);
              }}
            />
          )}

          {currentSection === 'financials' && (
            <FinancialReport
              orders={orders}
              expenses={expenses}
              settings={settings}
            />
          )}

          {currentSection === 'settings' && (
            <SettingsView
              settings={settings}
              onRefreshSettings={() => getWorkshopSettings()}
            />
          )}
        </main>
      </div>

      {/* Order Form Modal */}
      <OrderFormModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        initialOrder={editingOrder}
        paymentMethods={paymentMethods}
      />

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
        initialExpense={editingExpense}
        paymentMethods={paymentMethods}
        titleSuggestions={expenseTitles}
      />

      {/* Quick Pay Modal with Customer Picker */}
      {quickPayOrder && (
        <PaymentModal
          isOpen={!!quickPayOrder}
          onClose={() => setQuickPayOrder(null)}
          order={quickPayOrder}
          selectableOrders={ordersWithDebt}
          paymentMethods={paymentMethods}
          onPaymentSuccess={(result) => setReceiptData(result)}
        />
      )}

      {/* Official Receipt Modal */}
      {receiptData && (
        <OrderReceiptModal
          isOpen={!!receiptData}
          onClose={() => setReceiptData(null)}
          order={receiptData.order}
          payment={receiptData.payment}
          settings={settings}
        />
      )}

      <DialogHost />

      <UpdateBanner />

      <PinPromptModal
        isOpen={askSettingsPin}
        title="الإعدادات"
        pinHash={settings.statsPinHash}
        onClose={() => setAskSettingsPin(false)}
        onUnlock={() => {
          setAskSettingsPin(false);
          setCurrentSection('settings');
        }}
      />
    </div>
  );
}

export default App;
