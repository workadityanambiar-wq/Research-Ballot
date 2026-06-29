import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { hash } from '@node-rs/argon2';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PASSWORD = process.env.TEST_CIO_PASSWORD;
if (!PASSWORD) { console.error('TEST_CIO_PASSWORD env var is not set'); process.exit(1); }
const argon2Opts = { memoryCost: 65536, timeCost: 3, parallelism: 4 };
const now = new Date();

const TEST_CIOS = [
  { legacyId: 'test.alpha', email: 'alpha@century.ae',  displayName: 'Test Alpha', title: 'Chief Market Analyst' },
  { legacyId: 'test.beta',  email: 'beta@century.ae',   displayName: 'Test Beta',  title: 'Chief Market Analyst' },
  { legacyId: 'test.gamma', email: 'gamma@century.ae',  displayName: 'Test Gamma', title: 'Chief Market Analyst' },
];

async function main() {
  const passwordHash = await hash(PASSWORD!, argon2Opts);

  // Get total user count for legacyId uniqueness
  const total = await prisma.user.count();

  for (let i = 0; i < TEST_CIOS.length; i++) {
    const u = TEST_CIOS[i];
    await prisma.user.upsert({
      where: { legacyId: u.legacyId },
      update: {
        passwordHash,
        passwordChangedAt: now,
        passwordExpiresAt: null,
        failedAttempts: 0,
        lockedUntil: null,
        mfaEnabled: false,
        mfaEnrolledAt: now,
        mfaSecret: null,
        pendingMfaSecret: null,
      },
      create: {
        legacyId: u.legacyId,
        email: u.email,
        name: u.displayName,
        displayName: u.displayName,
        title: u.title,
        role: 'CIO',
        tier: 'A_PLUS',
        passwordHash,
        passwordChangedAt: now,
        passwordExpiresAt: null,
        mfaEnabled: false,
        mfaEnrolledAt: now,
        failedAttempts: 0,
        hitRate: 70, avgRet: 17, sharpe: 1.75, drawCtrl: 88,
        consistency: 85, peerScore: 92, ideaScore: 86, allocScore: 90, researchScore: 89,
      },
    });
    console.log(`✓ ${u.displayName} → ${u.email}`);
  }

  await pool.end();
  console.log('\nDone — 3 CIO test accounts ready.');
}

main().catch(e => { console.error(e); process.exit(1); });
