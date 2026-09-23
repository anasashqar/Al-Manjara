import React from 'react';
import { VoucherModal } from '../common/VoucherDocument';
import type { Order, PaymentTransaction, WorkshopSettings } from '../../types';

interface OrderReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  payment?: PaymentTransaction | null;
  settings: WorkshopSettings;
}

// سند قبض من زبون (التصميم الموحد في VoucherDocument)
export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({ isOpen, onClose, order, payment, settings }) => {
  if (!order) return null;

  return (
    <VoucherModal
      isOpen={isOpen}
      onClose={onClose}
      settings={settings}
      data={{
        kind: 'receipt',
        // بدون سند محدد: ملخص المدفوع على الطلبية برقمها
        number: payment?.receiptNumber || order.orderNumber,
        date: payment?.date || order.orderDate,
        party: order.customerName,
        amount: payment ? payment.amount : order.paidAmount,
        discount: payment?.discountAmount || undefined,
        purpose: payment?.itemPurpose || order.description,
        method: payment?.paymentMethod || '—',
        // المتبقي لحظة إصدار السند، حتى عند إعادة طباعة سند قديم
        remainingAfter: payment?.remainingAfter ?? order.remainingAmount,
        notes: payment?.notes,
      }}
    />
  );
};
