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

// Test password that meets all requirements
const TEST_PASSWORD = 'Test@Century1';

const argon2Opts = { memoryCost: 65536, timeCost: 3, parallelism: 4 };

// Accounts to reset: legacyId → display label
const ACCOUNTS = [
  { legacyId: 'arun.john',           label: 'Arun Leslie John (CIO)' },
  { legacyId: 'bhavik.mehta',        label: 'Bhavik Mehta (PM)' },
  { legacyId: 'deepa.sachanandani',  label: 'Deepa Sachanandani (PM)' },
  { legacyId: 'meyyappan.lakshmanan',label: 'Meyyappan Lakshmanan (SR_ANALYST)' },
  { legacyId: 'intissar.elkhadiri',  label: 'Intissar El Khadiri (SR_ANALYST)' },
];

async function main() {
  const passwordHash = await hash(TEST_PASSWORD, argon2Opts);
  const now = new Date();

  for (const { legacyId, label } of ACCOUNTS) {
    await prisma.user.update({
      where: { legacyId },
      data: {
        passwordHash,
        passwordChangedAt: now,      // skip forced password change
        passwordExpiresAt: null,     // no expiry
        failedAttempts: 0,
        lockedUntil: null,
        mfaEnabled: false,           // no TOTP needed
        mfaEnrolledAt: now,          // skip MFA enrollment gate for CIO/PM
        mfaSecret: null,
        pendingMfaSecret: null,
      },
    });
    console.log(`✓ ${label} → password set to "${TEST_PASSWORD}"`);
  }

  await pool.end();
  console.log('\nDone. All accounts ready for immediate login (no password change, no MFA).');
}

main().catch(e => { console.error(e); process.exit(1); });
