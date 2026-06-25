import { logFBEvent } from '../../fbinstant';

export const logPaymentEvent = (eventName, parameters = {}) => {
  console.log(`[Payment Analytics] Event: ${eventName}`, parameters);
  logFBEvent(eventName, 1, {
    timestamp: Date.now().toString(),
    ...parameters
  });
};
