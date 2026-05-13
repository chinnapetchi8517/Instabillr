export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const withTimeout = (promise, timeoutMs = 12000, message = "Operation timeout") =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);

export const getExponentialBackoffMs = (attempt, baseMs = 1200, maxMs = 10000) => {
  const safeAttempt = Math.max(1, attempt);
  const delay = Math.min(maxMs, baseMs * Math.pow(2, safeAttempt - 1));
  const jitter = Math.floor(Math.random() * 150);
  return delay + jitter;
};
