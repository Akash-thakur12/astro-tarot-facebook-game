import { getPaymentsInstance, isPaymentsSupported } from '../../fbinstant';
import { PaymentErrors } from './types';

export const executePurchase = async (productID) => {
  if (!isPaymentsSupported()) {
    console.warn('[Payments Purchase] SDK not supported, returning mock purchase');
    return {
      paymentID: `mock_payment_${Date.now()}`,
      productID,
      purchaseTime: Date.now().toString(),
      purchaseToken: 'mock.purchase.token',
      signedRequest: 'mock.signature_payload'
    };
  }

  const payments = getPaymentsInstance();
  try {
    const purchase = await payments.purchaseAsync({ productID });
    return {
      paymentID: purchase.paymentID,
      productID: purchase.productID,
      purchaseTime: purchase.purchaseTime,
      purchaseToken: purchase.purchaseToken,
      signedRequest: purchase.signedRequest
    };
  } catch (error) {
    console.error('[Payments Purchase] Purchase failed:', error);
    if (error.code === 'USER_INPUT_CANCELLED') {
      throw new Error(PaymentErrors.USER_CANCELLED);
    }
    throw error;
  }
};
