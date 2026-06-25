export const verifyPurchaseOnServer = async (getToken, provider, payload) => {
  const token = await getToken();
  if (!token) {
    throw new Error('UNAUTHORIZED_MISSING_TOKEN');
  }

  const response = await fetch('/api/payments/verify-purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      provider,
      payload
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'VERIFICATION_FAILED');
  }

  return data;
};
