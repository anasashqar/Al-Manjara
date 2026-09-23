import React from 'react';
import { VoucherModal } from '../common/VoucherDocument';
import type { PaymentTransaction, WorkshopSettings } from '../../types';

interface PaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentTransaction | null;
  settings: WorkshopSettings;
}

// سند صرف لمورد (التصميم الموحد في VoucherDocument)
export const PaymentVoucherModal: React.FC<PaymentVoucherModalProps> = ({ isOpen, onClose, payment, settings }) => {
  if (!payment) return null;

  return (
    <VoucherModal
      isOpen={isOpen}
      onClose={onClose}
      settings={settings}
      data={{
        kind: 'payment',
        number: payment.receiptNumber,
        date: payment.date,
        party: payment.partyName,
        amount: payment.amount,
        purpose: payment.itemPurpose,
        method: payment.paymentMethod,
        remainingAfter: payment.remainingAfter,
        notes: payment.notes,
      }}
    />
  );
};
