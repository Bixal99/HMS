/**
 * Login rate limit lives in Next.js (not express-rate-limit) because credentials
 * verification is a Server Action, not an Express route. Express rate-limit is
 * reserved if login is later proxied through the API.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptRecord = {
  count: number;
  windowStart: number;
};

const attempts = new Map<string, AttemptRecord>();

function keyFor(ip: string, email: string) {
  return `${ip}:${email.toLowerCase()}`;
}

export function isLoginRateLimited(ip: string, email: string): boolean {
  const key = keyFor(ip, email);
  const now = Date.now();
  const record = attempts.get(key);

  if (!record) return false;
  if (now - record.windowStart > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(ip: string, email: string): void {
  const key = keyFor(ip, email);
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return;
  }

  record.count += 1;
  attempts.set(key, record);
}

export function clearLoginAttempts(ip: string, email: string): void {
  attempts.delete(keyFor(ip, email));
}
