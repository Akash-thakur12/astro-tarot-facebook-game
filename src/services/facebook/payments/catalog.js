import { getPaymentsInstance, isPaymentsSupported } from '../../fbinstant';

export const fetchCatalog = async () => {
  if (!isPaymentsSupported()) {
    console.warn('[Payments Catalog] Payments SDK not supported, returning mock catalog');
    return [
      {
        productID: 'premium_seeker_status',
        title: 'Divine Seeker Status',
        description: 'Unlock unlimited readings and consultations',
        price: '₹99',
        priceCurrencyCode: 'INR'
      }
    ];
  }

  const payments = getPaymentsInstance();
  try {
    const catalog = await payments.getCatalogAsync();
    return catalog.map(p => ({
      productID: p.productID,
      title: p.title,
      description: p.description,
      price: p.price,
      priceCurrencyCode: p.priceCurrencyCode,
      imageURI: p.imageURI
    }));
  } catch (error) {
    console.error('[Payments Catalog] Failed to fetch catalog:', error);
    throw error;
  }
};
