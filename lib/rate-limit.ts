import { RateLimiterMemory } from 'rate-limiter-flexible';

// 10 login attempts per IP per 15 minutes
const loginLimiter = new RateLimiterMemory({
  keyPrefix: 'login',
  points: 10,
  duration: 900,  // 15 min
  blockDuration: 900,
});

// 3 password reset requests per email per hour
const resetLimiter = new RateLimiterMemory({
  keyPrefix: 'reset',
  points: 3,
  duration: 3600,
  blockDuration: 3600,
});

export interface RateLimitResult {
  allowed: boolean;
  msBeforeNext?: number;
}

export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    await loginLimiter.consume(ip);
    return { allowed: true };
  } catch (e: unknown) {
    const err = e as { msBeforeNext?: number };
    return { allowed: false, msBeforeNext: err.msBeforeNext };
  }
}

export async function checkResetRateLimit(email: string): Promise<RateLimitResult> {
  try {
    await resetLimiter.consume(email.toLowerCase());
    return { allowed: true };
  } catch (e: unknown) {
    const err = e as { msBeforeNext?: number };
    return { allowed: false, msBeforeNext: err.msBeforeNext };
  }
}
