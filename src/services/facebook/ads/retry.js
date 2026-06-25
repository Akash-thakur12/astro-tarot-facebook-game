/**
 * Utility for execution retries with exponential backoff and optional jitter.
 * Contains no Facebook-specific or ad-specific dependencies.
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    backoffFactor = 2,
    jitter = true
  } = options;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }
      
      let delay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      console.warn(`[Retry Engine] Attempt ${attempt} failed. Retrying in ${Math.round(delay)}ms... Error:`, error.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
