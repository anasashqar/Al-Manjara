import { db, updateWorkshopSettings } from './dexie';
import { getSupabaseClient } from './supabaseClient';

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'offline' | 'unconfigured' | 'error';
  message: string;
  lastSyncedAt?: number;
}

export async function performFullSync(): Promise<SyncStatus> {
  if (!navigator.onLine) {
    return { state: 'offline', message: 'الجهاز غير متصل بالإنترنت حالياً' };
  }

  const client = await getSupabaseClient();
  if (!client) {
    return { state: 'unconfigured', message: 'لم يتم ربط بيانات Supabase بعد (العمل محلي بالكامل)' };
  }

  try {
    const orders = await db.orders.toArray();
    const expenses = await db.expenses.toArray();
    const supplierDebts = await db.supplierDebts.toArray();
    const payments = await db.paymentTransactions.toArray();

    // 1. Sync orders
    if (orders.length > 0) {
      const { error: ordErr } = await client.from('orders').upsert(orders, { onConflict: 'id' });
      if (ordErr) console.warn('Supabase orders sync notice:', ordErr.message);
    }

    // 2. Sync expenses
    if (expenses.length > 0) {
      const { error: expErr } = await client.from('expenses').upsert(expenses, { onConflict: 'id' });
      if (expErr) console.warn('Supabase expenses sync notice:', expErr.message);
    }

    // 3. Sync supplier debts
    if (supplierDebts.length > 0) {
      const { error: supErr } = await client.from('supplier_debts').upsert(supplierDebts, { onConflict: 'id' });
      if (supErr) console.warn('Supabase supplierDebts sync notice:', supErr.message);
    }

    // 4. Sync payments
    if (payments.length > 0) {
      const { error: payErr } = await client.from('payment_transactions').upsert(payments, { onConflict: 'id' });
      if (payErr) console.warn('Supabase payments sync notice:', payErr.message);
    }

    const now = Date.now();
    await updateWorkshopSettings({ lastSyncedAt: now });

    return {
      state: 'synced',
      message: 'تمت المزامنة بنجاح مع السحابة',
      lastSyncedAt: now,
    };
  } catch (err: any) {
    console.error('Sync failure:', err);
    return {
      state: 'error',
      message: err?.message || 'تعذر إتمام المزامنة',
    };
  }
}
