import { prisma } from '@/lib/db';

export interface RateLimitResult {
  allowed: boolean;
  msBeforeNext?: number;
}

// Login: 10 attempts per IP per 15 minutes
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// Reset: 3 requests per email per hour
const RESET_LIMIT = 3;
const RESET_WINDOW_MS = 60 * 60 * 1000;

async function check(key: string, type: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs);

  // Delete expired entries while we're here (lazy cleanup — bounded by window size)
  await prisma.rateLimitEntry.deleteMany({
    where: { key, type, createdAt: { lt: windowStart } },
  });

  const count = await prisma.rateLimitEntry.count({
    where: { key, type, createdAt: { gte: windowStart } },
  });

  if (count >= limit) {
    return { allowed: false, msBeforeNext: windowMs };
  }

  await prisma.rateLimitEntry.create({ data: { key, type } });
  return { allowed: true };
}

export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  return check(ip, 'login', LOGIN_LIMIT, LOGIN_WINDOW_MS);
}

export async function checkResetRateLimit(email: string): Promise<RateLimitResult> {
  return check(email.toLowerCase(), 'reset', RESET_LIMIT, RESET_WINDOW_MS);
}
