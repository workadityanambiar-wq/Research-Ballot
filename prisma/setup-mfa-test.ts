import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import QRCode from 'qrcode';
import { generateTotpSecret, getTotpUri, encryptTotpSecret } from '../lib/auth-helpers';
import * as fs from 'fs';
import * as path from 'path';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ACCOUNTS = ['test.alpha', 'test.beta', 'test.gamma'];

async function main() {
  const now = new Date();
  const results: { name: string; email: string; secret: string; uri: string; qr: string }[] = [];

  for (const legacyId of ACCOUNTS) {
    const user = await prisma.user.findUnique({ where: { legacyId } });
    if (!user) { console.error(`Not found: ${legacyId}`); continue; }

    const secret = generateTotpSecret();
    const uri = await getTotpUri(user.email!, secret);
    const qrDataUrl = await QRCode.toDataURL(uri);
    const encryptedSecret = encryptTotpSecret(secret);

    await prisma.user.update({
      where: { legacyId },
      data: { mfaSecret: encryptedSecret, mfaEnabled: true, mfaEnrolledAt: now, pendingMfaSecret: null },
    });

    results.push({ name: user.displayName, email: user.email!, secret, uri, qr: qrDataUrl });
    console.log(`\n✓ ${user.displayName} (${user.email})`);
    console.log(`  Secret : ${secret}`);
    console.log(`  URI    : ${uri}`);
  }

  // Write an HTML file with all QR codes for easy scanning
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>MFA Setup — Century Financial Test Accounts</title>
<style>
  body { font-family: monospace; background: #0d1117; color: #e6edf3; padding: 32px; }
  h1 { font-size: 16px; color: #e8a000; margin-bottom: 24px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin-bottom: 20px; display: flex; gap: 24px; align-items: flex-start; }
  img { width: 160px; height: 160px; border: 1px solid #30363d; border-radius: 4px; }
  .info { flex: 1; }
  .label { font-size: 10px; color: #8b949e; margin-bottom: 2px; }
  .value { font-size: 13px; color: #58a6ff; word-break: break-all; margin-bottom: 12px; }
  .name { font-size: 15px; font-weight: bold; color: #e6edf3; margin-bottom: 16px; }
</style></head><body>
<h1>Century Financial — MFA QR Codes (Test Accounts)</h1>
${results.map(r => `
<div class="card">
  <img src="${r.qr}" alt="QR for ${r.name}">
  <div class="info">
    <div class="name">${r.name}</div>
    <div class="label">EMAIL</div>
    <div class="value">${r.email}</div>
    <div class="label">TOTP SECRET (manual entry)</div>
    <div class="value">${r.secret}</div>
    <div class="label">PASSWORD</div>
    <div class="value">[set via TEST_CIO_PASSWORD env var]</div>
  </div>
</div>`).join('')}
</body></html>`;

  const outPath = path.join(process.cwd(), 'prisma', 'mfa-qr-codes.html');
  fs.writeFileSync(outPath, html);
  console.log(`\n✅ QR codes written to: prisma/mfa-qr-codes.html`);
  console.log('   Open that file in a browser and scan with Google Authenticator / Authy.');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
