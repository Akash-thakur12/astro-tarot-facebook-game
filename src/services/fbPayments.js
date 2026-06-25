import { fetchCatalog } from './facebook/payments/catalog';
import { executePurchase } from './facebook/payments/purchase';
import { fetchPurchases, consumePurchase } from './facebook/payments/restore';
import { verifyPurchaseOnServer } from './facebook/payments/verify';
import { logPaymentEvent } from './facebook/payments/analytics';
import { saveCachedStatus, getCachedStatus } from './facebook/payments/cache';
import { ProductIds, PaymentErrors } from './facebook/payments/types';

export { ProductIds, PaymentErrors };

/**
 * Initializes payments module readiness.
 */
export const initializePayments = async () => {
  return new Promise((resolve) => {
    // In Instant Games, check window.FBInstant.payments.onReady
    if (typeof window !== 'undefined' && window.FBInstant && window.FBInstant.payments) {
      window.FBInstant.payments.onReady(() => {
        logPaymentEvent('payments_initialized');
        resolve(true);
      });
    } else {
      resolve(false);
    }
  });
};

/**
 * Gets available product list.
 */
export const getCatalog = async () => {
  try {
    logPaymentEvent('catalog_fetch_start');
    const catalog = await fetchCatalog();
    logPaymentEvent('catalog_fetch_success', { count: catalog.length });
    return catalog;
  } catch (error) {
    logPaymentEvent('catalog_fetch_failed', { error: error.message });
    throw error;
  }
};

/**
 * Purchases the Divine Seeker Premium product.
 */
export const purchasePremium = async (getToken) => {
  try {
    logPaymentEvent('purchase_start', { productID: ProductIds.PREMIUM_SEEKER });
    const purchase = await executePurchase(ProductIds.PREMIUM_SEEKER);
    logPaymentEvent('purchase_completed_sdk', { paymentID: purchase.paymentID });

    // Orchestrate server verification
    logPaymentEvent('verification_start', { paymentID: purchase.paymentID });
    const verifyResult = await verifyPurchaseOnServer(getToken, 'meta', {
      signedRequest: purchase.signedRequest,
      paymentID: purchase.paymentID,
      productID: purchase.productID,
      purchaseToken: purchase.purchaseToken
    });

    logPaymentEvent('verification_success', { paymentID: purchase.paymentID });
    
    // Save to local cache
    if (verifyResult.success) {
      saveCachedStatus(true, verifyResult.expiry);
    }

    return verifyResult;
  } catch (error) {
    logPaymentEvent('purchase_failed', { error: error.message });
    throw error;
  }
};

/**
 * Restores and synchronizes previous purchases.
 * Attempts to verify any active unconsumed premium purchases.
 */
export const restorePurchases = async (getToken) => {
  try {
    logPaymentEvent('restore_start');
    const activePurchases = await fetchPurchases();
    
    if (activePurchases.length === 0) {
      logPaymentEvent('restore_no_purchases');
      return { success: false, reason: 'NO_ACTIVE_PURCHASES' };
    }

    // Filter to locate our premium status product
    const premiumPurchase = activePurchases.find(p => p.productID === ProductIds.PREMIUM_SEEKER);
    if (!premiumPurchase) {
      logPaymentEvent('restore_no_premium_purchase');
      return { success: false, reason: 'NO_PREMIUM_PURCHASE' };
    }

    // Verify on server
    logPaymentEvent('restore_verification_start', { paymentID: premiumPurchase.paymentID });
    const verifyResult = await verifyPurchaseOnServer(getToken, 'meta', {
      signedRequest: premiumPurchase.signedRequest,
      paymentID: premiumPurchase.paymentID,
      productID: premiumPurchase.productID,
      purchaseToken: premiumPurchase.purchaseToken
    });

    logPaymentEvent('restore_verification_success', { paymentID: premiumPurchase.paymentID });
    
    if (verifyResult.success) {
      saveCachedStatus(true, verifyResult.expiry);
    }

    return verifyResult;
  } catch (error) {
    logPaymentEvent('restore_failed', { error: error.message });
    throw error;
  }
};

/**
 * Clean up local cached status if needed.
 */
export const clearLocalPremiumStatus = () => {
  saveCachedStatus(false, null);
};

/**
 * Checks cached premium status.
 */
export const getCachedPremiumStatus = () => {
  const cached = getCachedStatus();
  if (cached && cached.premium && cached.expiry) {
    const expiryDate = new Date(cached.expiry);
    if (new Date() < expiryDate) {
      return { premium: true, expiry: cached.expiry };
    }
  }
  return { premium: false, expiry: null };
};
