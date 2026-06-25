export const saveCachedStatus = (premium, expiry) => {
  try {
    localStorage.setItem('premium_status', JSON.stringify({ premium, expiry }));
  } catch (e) {
    console.error('Failed to write local premium cache:', e);
  }
};

export const getCachedStatus = () => {
  try {
    const data = localStorage.getItem('premium_status');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};
