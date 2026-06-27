import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const TEMP_PASSWORD = 'Apex@2025';

const argon2Opts = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// Role mapping based on title/position
// 1 CIO, 2 PMs, 3 SR_ANALYSTs, 10 ANALYSTs = 16 total
const USERS = [
  { legacyId: 'arun.john', email: 'arun@century.ae', displayName: 'Arun Leslie John', title: 'Chief Market Analyst', role: 'CIO' as const, tier: 'A_PLUS' as const, mfaEnabled: true, hitRate: 73, avgRet: 18.4, sharpe: 1.82, drawCtrl: 91, consistency: 88, peerScore: 94, ideaScore: 88, allocScore: 92, researchScore: 91 },
  { legacyId: 'bhavik.mehta', email: 'bhavik@century.ae', displayName: 'Bhavik Mehta', title: 'Deputy Head Research', role: 'PM' as const, tier: 'A_PLUS' as const, mfaEnabled: true, hitRate: 71, avgRet: 16.2, sharpe: 1.74, drawCtrl: 88, consistency: 85, peerScore: 90, ideaScore: 85, allocScore: 90, researchScore: 88 },
  { legacyId: 'deepa.sachanandani', email: 'deepa@century.ae', displayName: 'Deepa Sachanandani', title: 'Deputy Head Research', role: 'PM' as const, tier: 'A_PLUS' as const, mfaEnabled: true, hitRate: 65, avgRet: 14.1, sharpe: 1.58, drawCtrl: 82, consistency: 79, peerScore: 84, ideaScore: 79, allocScore: 84, researchScore: 82 },
  { legacyId: 'meyyappan.lakshmanan', email: 'meyyappan@century.ae', displayName: 'Meyyappan Lakshmanan', title: 'Sr. Research Analyst', role: 'SR_ANALYST' as const, tier: 'A' as const, mfaEnabled: false, hitRate: 68, avgRet: 15.3, sharpe: 1.65, drawCtrl: 85, consistency: 82, peerScore: 86, ideaScore: 82, allocScore: 78, researchScore: 83 },
  { legacyId: 'intissar.elkhadiri', email: 'intissar@century.ae', displayName: 'Intissar El Khadiri', title: 'Senior Research Analyst', role: 'SR_ANALYST' as const, tier: 'A' as const, mfaEnabled: false, hitRate: 63, avgRet: 13.8, sharpe: 1.45, drawCtrl: 80, consistency: 76, peerScore: 81, ideaScore: 76, allocScore: 81, researchScore: 78 },
  { legacyId: 'dnyanada.kulkarni', email: 'dnyanada.k@century.ae', displayName: 'Dnyanada Kulkarni', title: 'Senior Research Analyst', role: 'SR_ANALYST' as const, tier: 'A' as const, mfaEnabled: false, hitRate: 61, avgRet: 12.9, sharpe: 1.38, drawCtrl: 78, consistency: 73, peerScore: 77, ideaScore: 73, allocScore: 75, researchScore: 75 },
  { legacyId: 'jagpavit.bhurjee', email: 'jagpavit.bhurjee@century.ae', displayName: 'Jagpavit Bhurjee', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 55, avgRet: 10.2, sharpe: 1.12, drawCtrl: 70, consistency: 65, peerScore: 68, ideaScore: 64, allocScore: 68, researchScore: 66 },
  { legacyId: 'saakshi.shingare', email: 'saakshi.shingare@century.ae', displayName: 'Saakshi Shingare', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'A' as const, mfaEnabled: false, hitRate: 62, avgRet: 13.1, sharpe: 1.41, drawCtrl: 79, consistency: 74, peerScore: 80, ideaScore: 74, allocScore: 72, researchScore: 75 },
  { legacyId: 'devanshi.agrawal', email: 'devanshi.agrawal@centuryiq.in', displayName: 'Devanshi Agrawal', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 52, avgRet: 9.4, sharpe: 1.05, drawCtrl: 66, consistency: 62, peerScore: 64, ideaScore: 61, allocScore: 63, researchScore: 62 },
  { legacyId: 'labiba.angona', email: 'labiba.angona@century.ae', displayName: 'Labiba Zoha Angona', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 57, avgRet: 11.3, sharpe: 1.21, drawCtrl: 72, consistency: 68, peerScore: 71, ideaScore: 67, allocScore: 70, researchScore: 68 },
  { legacyId: 'aditya.nambiar', email: 'aditya.nambiar@centuryiq.in', displayName: 'Aditya Nambiar', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'A' as const, mfaEnabled: false, hitRate: 60, avgRet: 12.5, sharpe: 1.38, drawCtrl: 77, consistency: 72, peerScore: 76, ideaScore: 72, allocScore: 74, researchScore: 73 },
  { legacyId: 'fenil.gala', email: 'fenil.gala@centuryiq.in', displayName: 'Fenil Gala', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 53, avgRet: 9.8, sharpe: 1.08, drawCtrl: 67, consistency: 63, peerScore: 65, ideaScore: 62, allocScore: 61, researchScore: 62 },
  { legacyId: 'kriti.toshniwal', email: 'kriti.toshniwal@centuryiq.in', displayName: 'Kriti Toshniwal', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 56, avgRet: 10.9, sharpe: 1.18, drawCtrl: 71, consistency: 66, peerScore: 69, ideaScore: 66, allocScore: 69, researchScore: 67 },
  { legacyId: 'dhairya.jani', email: 'dhairya.jani@centuryiq.in', displayName: 'Dhairya Jani', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 44, avgRet: 7.2, sharpe: 0.87, drawCtrl: 55, consistency: 50, peerScore: 52, ideaScore: 52, allocScore: 55, researchScore: 53 },
  { legacyId: 'vritti.shah', email: 'vritti.shah@century.ae', displayName: 'Vritti Shah', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 58, avgRet: 11.8, sharpe: 1.25, drawCtrl: 73, consistency: 69, peerScore: 72, ideaScore: 68, allocScore: 65, researchScore: 67 },
  { legacyId: 'kashish.dhanani', email: 'kashish.dhanani@century.ae', displayName: 'Kashish Dhanani', title: 'Research Analyst', role: 'ANALYST' as const, tier: 'B' as const, mfaEnabled: false, hitRate: 46, avgRet: 7.8, sharpe: 0.91, drawCtrl: 58, consistency: 53, peerScore: 55, ideaScore: 54, allocScore: 57, researchScore: 55 },
];

async function main() {
  console.log('Seeding 16 users...');

  const passwordHash = await hash(TEMP_PASSWORD, argon2Opts);

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { legacyId: u.legacyId },
      update: {},
      create: {
        legacyId: u.legacyId,
        email: u.email,
        name: u.displayName,
        displayName: u.displayName,
        title: u.title,
        role: u.role,
        tier: u.tier,
        passwordHash,
        passwordChangedAt: null,  // Forces password change on first login
        mfaEnabled: u.mfaEnabled,
        hitRate: u.hitRate,
        avgRet: u.avgRet,
        sharpe: u.sharpe,
        drawCtrl: u.drawCtrl,
        consistency: u.consistency,
        peerScore: u.peerScore,
        ideaScore: u.ideaScore,
        allocScore: u.allocScore,
        researchScore: u.researchScore,
      },
    });
    console.log(`  ✓ ${u.displayName} (${u.role})`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
