import { getPaymentsInstance, isPaymentsSupported } from '../../fbinstant';

export const fetchPurchases = async () => {
  if (!isPaymentsSupported()) {
    console.warn('[Payments Restore] SDK not supported, returning empty purchases');
    return [];
  }

  const payments = getPaymentsInstance();
  try {
    const purchases = await payments.getPurchasesAsync();
    return purchases.map(p => ({
      paymentID: p.paymentID,
      productID: p.productID,
      purchaseTime: p.purchaseTime,
      purchaseToken: p.purchaseToken,
      signedRequest: p.signedRequest
    }));
  } catch (error) {
    console.error('[Payments Restore] Failed to fetch purchases:', error);
    throw error;
  }
};

export const consumePurchase = async (purchaseToken) => {
  if (!isPaymentsSupported()) {
    console.warn('[Payments Consume] SDK not supported, returning mock success');
    return true;
  }

  const payments = getPaymentsInstance();
  try {
    await payments.consumePurchaseAsync(purchaseToken);
    return true;
  } catch (error) {
    console.error('[Payments Consume] Failed to consume purchase:', error);
    throw error;
  }
};
