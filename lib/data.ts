import type { Idea, PortfolioPosition, VoteMap, TickerItem, Phase, Allocation } from './types';

export const IDEAS0: Idea[] = [
  { id: 'IDEA-001', ticker: 'NVDA', assetClass: 'US Equities', dir: 'LONG', entry: 875.50, stop: 810.00, target: 1052.00, hold: '3-6M', posSize: 2.5, conv: 9, expRet: 20.2, expDD: -7.5, rr: 2.68, thesis: 'Dominant AI infrastructure play. Blackwell GPU ramp accelerating data center demand. CUDA moat unassailable with 85% market share. H200 supply constraints easing Q3.', catalysts: ['Q3 earnings beat', 'Blackwell ramp announcement', 'Azure/GCP capex expansion'], risks: ['Export restriction tightening', 'AMD MI300X share gains', 'Valuation compression'], authorId: 'meyyappan.lakshmanan', submittedAt: '2025-06-23T09:15Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 3420, rank: 1, pmScore: 91.2, skillScore: 87.5, rrScore: 89.3, quantScore: 85.1, finalScore: 89.1, momentumScore: 88, rsScore: 91, earningRevScore: 85, approvalStatus: 'APPROVED' },
  { id: 'IDEA-002', ticker: 'MSFT', assetClass: 'US Equities', dir: 'LONG', entry: 425.20, stop: 398.00, target: 490.00, hold: '2-4M', posSize: 3.0, conv: 8, expRet: 15.2, expDD: -6.4, rr: 2.38, thesis: 'Copilot monetization exceeding expectations. Azure AI services driving 28%+ cloud revenue growth. Enterprise AI adoption at inflection point with Fabric platform gaining traction.', catalysts: ['Azure AI revenue acceleration', 'Copilot enterprise penetration', 'FY26 guidance raise'], risks: ['Google Workspace competition', 'Macro slowdown in enterprise spend', 'OpenAI dependency'], authorId: 'saakshi.shingare', submittedAt: '2025-06-23T10:30Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 2850, rank: 2, pmScore: 85.3, skillScore: 82.1, rrScore: 85.7, quantScore: 83.4, finalScore: 84.2, momentumScore: 82, rsScore: 87, earningRevScore: 90, approvalStatus: 'APPROVED' },
  { id: 'IDEA-003', ticker: 'META', assetClass: 'US Equities', dir: 'LONG', entry: 520.80, stop: 478.00, target: 630.00, hold: '4-8M', posSize: 2.0, conv: 8, expRet: 21.0, expDD: -8.2, rr: 2.56, thesis: 'Llama 3 driving advertising efficiency gains 18%+ YoY. Threads monetization unlocking new TAM. Reality Labs losses stabilizing at ~$5B/qtr.', catalysts: ['Ad revenue acceleration Q3', 'Threads MAU milestone', 'WhatsApp Business monetization'], risks: ['FTC antitrust action', 'TikTok regulation reversal', 'Reality Labs burn escalation'], authorId: 'intissar.elkhadiri', submittedAt: '2025-06-23T11:00Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 2640, rank: 3, pmScore: 83.7, skillScore: 80.9, rrScore: 86.2, quantScore: 81.5, finalScore: 82.8, momentumScore: 79, rsScore: 83, earningRevScore: 88, approvalStatus: 'APPROVED' },
  { id: 'IDEA-004', ticker: 'GS', assetClass: 'US Equities', dir: 'LONG', entry: 462.30, stop: 435.00, target: 520.00, hold: '2-3M', posSize: 1.5, conv: 7, expRet: 12.5, expDD: -5.9, rr: 2.12, thesis: 'IB revenue recovery accelerating with M&A pipeline at 3-year highs. Trading desk outperformance in volatile macro. Marcus consumer segment dragging less than feared.', catalysts: ['M&A fee recognition Q3-Q4', 'Fed rate cut cycle beneficiary', 'Trading revenue beat'], risks: ['Credit loss provisions', 'Regulatory capital requirements', 'Marcus consumer losses'], authorId: 'aditya.nambiar', submittedAt: '2025-06-23T13:45Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 1980, rank: 4, pmScore: 76.4, skillScore: 78.2, rrScore: 77.8, quantScore: 74.3, finalScore: 76.8, momentumScore: 74, rsScore: 78, earningRevScore: 76, approvalStatus: 'PENDING' },
  { id: 'IDEA-005', ticker: 'TSLA', assetClass: 'US Equities', dir: 'SHORT', entry: 248.50, stop: 275.00, target: 190.00, hold: '2-4M', posSize: 1.0, conv: 7, expRet: 23.5, expDD: -10.7, rr: 2.20, thesis: 'Margin compression continuing with EV price war intensifying globally. FSD still years from regulatory approval. BYD taking share in every market. Robotaxi hype priced in.', catalysts: ['Q2 delivery miss', 'FSD recall potential', 'BYD market share data'], risks: ['Robotaxi announcement beats', 'Short squeeze dynamics', 'Elon catalyst tweet'], authorId: 'labiba.angona', submittedAt: '2025-06-23T14:00Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 1840, rank: 5, pmScore: 74.8, skillScore: 71.5, rrScore: 75.2, quantScore: 72.8, finalScore: 73.9, momentumScore: 68, rsScore: 65, earningRevScore: 58, approvalStatus: 'PENDING' },
  { id: 'IDEA-006', ticker: 'AMZN', assetClass: 'US Equities', dir: 'LONG', entry: 195.40, stop: 182.00, target: 225.00, hold: '3-5M', posSize: 2.0, conv: 8, expRet: 15.2, expDD: -6.9, rr: 2.20, thesis: 'AWS re-acceleration to 22%+ growth driven by AI workloads. Advertising achieving Google-like margins. Retail profitability inflection with $10B+ operating income run rate.', catalysts: ['AWS backlog conversion', 'Prime Day revenue beat', 'Advertising margin expansion'], risks: ['Antitrust regulatory scrutiny', 'Capex expansion concerns', 'Retail macro headwinds'], authorId: 'dnyanada.kulkarni', submittedAt: '2025-06-23T15:30Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 1720, rank: 6, pmScore: 72.1, skillScore: 74.8, rrScore: 73.5, quantScore: 71.2, finalScore: 72.9, momentumScore: 76, rsScore: 79, earningRevScore: 82, approvalStatus: 'PENDING' },
  { id: 'IDEA-007', ticker: 'XOM', assetClass: 'US Equities', dir: 'SHORT', entry: 118.20, stop: 126.00, target: 98.00, hold: '3-6M', posSize: 1.0, conv: 6, expRet: 17.1, expDD: -6.6, rr: 2.59, thesis: 'Oil demand destruction accelerating from EV adoption. Pioneer synergies fully priced in. Permian cost curve under pressure from service inflation.', catalysts: ['Oil price breakdown below $75', 'EV adoption data surprise', 'OPEC+ agreement breakdown'], risks: ['Geopolitical supply disruption', 'Strong buyback program', 'Energy rotation trade'], authorId: 'jagpavit.bhurjee', submittedAt: '2025-06-24T09:00Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 1320, rank: 7, pmScore: 68.3, skillScore: 65.7, rrScore: 70.4, quantScore: 66.9, finalScore: 67.8, momentumScore: 62, rsScore: 58, earningRevScore: 55, approvalStatus: 'PENDING' },
  { id: 'IDEA-008', ticker: 'GOOGL', assetClass: 'US Equities', dir: 'LONG', entry: 178.60, stop: 165.00, target: 210.00, hold: '3-5M', posSize: 2.5, conv: 7, expRet: 17.6, expDD: -7.6, rr: 2.32, thesis: 'Search resilience underestimated. AI Overviews driving monetization of new query types. YouTube Shorts at parity. Waymo robotaxi fleet acceleration optionality.', catalysts: ['AI Overviews monetization', 'YouTube Q3 acceleration', 'Cloud growth re-acceleration'], risks: ['DOJ antitrust remedy severity', 'OpenAI search threat', 'Ad market softening'], authorId: 'vritti.shah', submittedAt: '2025-06-24T10:15Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 1280, rank: 8, pmScore: 67.5, skillScore: 70.2, rrScore: 68.9, quantScore: 68.4, finalScore: 68.6, momentumScore: 70, rsScore: 73, earningRevScore: 74, approvalStatus: 'REVIEW' },
  { id: 'IDEA-009', ticker: 'JPM', assetClass: 'US Equities', dir: 'LONG', entry: 215.40, stop: 200.00, target: 240.00, hold: '2-4M', posSize: 1.5, conv: 6, expRet: 11.4, expDD: -7.1, rr: 1.60, thesis: 'Fortress balance sheet for rate normalization. IB recovery underpriced. Consumer credit more resilient than consensus. Buyback authorization at record levels.', catalysts: ['NIM expansion from rate cuts', 'IB pipeline conversion', 'Buyback acceleration'], risks: ['Commercial real estate exposure', 'Consumer credit deterioration', 'Regulatory capital increases'], authorId: 'fenil.gala', submittedAt: '2025-06-24T11:30Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 980, rank: 9, pmScore: 63.2, skillScore: 62.8, rrScore: 60.5, quantScore: 63.7, finalScore: 62.7, momentumScore: 65, rsScore: 68, earningRevScore: 63, approvalStatus: 'REVIEW' },
  { id: 'IDEA-010', ticker: 'AAPL', assetClass: 'US Equities', dir: 'LONG', entry: 192.30, stop: 178.00, target: 220.00, hold: '4-6M', posSize: 2.0, conv: 6, expRet: 14.4, expDD: -7.4, rr: 1.94, thesis: 'Apple Intelligence super-cycle upgrade beginning. Services approaching $110B run rate. India manufacturing diversification de-risking supply chain concentration risk.', catalysts: ['iPhone 17 AI upgrade cycle', 'Services margin expansion', 'India production ramp'], risks: ['China revenue concentration', 'AI feature differentiation vs Samsung', 'App Store regulatory changes'], authorId: 'kriti.toshniwal', submittedAt: '2025-06-24T14:00Z', weekId: 'W26-2025', status: 'ACTIVE', totalCredits: 840, rank: 10, pmScore: 60.8, skillScore: 63.4, rrScore: 62.1, quantScore: 61.5, finalScore: 61.8, momentumScore: 63, rsScore: 66, earningRevScore: 67, approvalStatus: 'REVIEW' },
];

export const PORT0: PortfolioPosition[] = [
  { rank: 1, ideaId: 'IDEA-001', ticker: 'NVDA', dir: 'LONG', alloc: 15, expRet: 20.2, sector: 'Technology', beta: 1.42, pmOvr: false },
  { rank: 2, ideaId: 'IDEA-002', ticker: 'MSFT', dir: 'LONG', alloc: 15, expRet: 15.2, sector: 'Technology', beta: 0.91, pmOvr: false },
  { rank: 3, ideaId: 'IDEA-003', ticker: 'META', dir: 'LONG', alloc: 15, expRet: 21.0, sector: 'Technology', beta: 1.28, pmOvr: false },
  { rank: 4, ideaId: 'IDEA-004', ticker: 'GS', dir: 'LONG', alloc: 8, expRet: 12.5, sector: 'Financials', beta: 1.15, pmOvr: false },
  { rank: 5, ideaId: 'IDEA-005', ticker: 'TSLA', dir: 'SHORT', alloc: 8, expRet: 23.5, sector: 'Consumer', beta: 1.88, pmOvr: false },
  { rank: 6, ideaId: 'IDEA-006', ticker: 'AMZN', dir: 'LONG', alloc: 8, expRet: 15.2, sector: 'Technology', beta: 1.12, pmOvr: false },
  { rank: 7, ideaId: 'IDEA-007', ticker: 'XOM', dir: 'SHORT', alloc: 8, expRet: 17.1, sector: 'Energy', beta: 0.78, pmOvr: false },
  { rank: 8, ideaId: 'IDEA-008', ticker: 'GOOGL', dir: 'LONG', alloc: 8, expRet: 17.6, sector: 'Technology', beta: 1.05, pmOvr: false },
  { rank: 9, ideaId: 'IDEA-009', ticker: 'JPM', dir: 'LONG', alloc: 0, expRet: 11.4, sector: 'Financials', beta: 1.08, pmOvr: false },
  { rank: 10, ideaId: 'IDEA-010', ticker: 'AAPL', dir: 'LONG', alloc: 0, expRet: 14.4, sector: 'Technology', beta: 1.14, pmOvr: false },
];

export const VOTES0: VoteMap = {
  'IDEA-001': { 'saakshi.shingare': 300, 'devanshi.agrawal': 250, 'labiba.angona': 200, 'vritti.shah': 280, 'aditya.nambiar': 200, 'fenil.gala': 150, 'kashish.dhanani': 220, 'intissar.elkhadiri': 180, 'dnyanada.kulkarni': 240, 'jagpavit.bhurjee': 400 },
  'IDEA-002': { 'saakshi.shingare': 250, 'devanshi.agrawal': 180, 'dhairya.jani': 200, 'aditya.nambiar': 400, 'kriti.toshniwal': 150, 'kashish.dhanani': 180, 'dnyanada.kulkarni': 200, 'labiba.angona': 100, 'fenil.gala': 100, 'vritti.shah': 90 },
  'IDEA-003': { 'saakshi.shingare': 200, 'labiba.angona': 150, 'vritti.shah': 180, 'aditya.nambiar': 200, 'fenil.gala': 200, 'kriti.toshniwal': 180, 'meyyappan.lakshmanan': 180, 'dnyanada.kulkarni': 150, 'devanshi.agrawal': 200, 'kashish.dhanani': 200 },
  'IDEA-004': { 'saakshi.shingare': 100, 'devanshi.agrawal': 80, 'dhairya.jani': 100, 'vritti.shah': 120, 'kriti.toshniwal': 80, 'meyyappan.lakshmanan': 200, 'intissar.elkhadiri': 200, 'labiba.angona': 150, 'kashish.dhanani': 200, 'fenil.gala': 150 },
  'IDEA-005': { 'jagpavit.bhurjee': 100, 'saakshi.shingare': 50, 'devanshi.agrawal': 100, 'meyyappan.lakshmanan': 150, 'intissar.elkhadiri': 150, 'dnyanada.kulkarni': 100, 'labiba.angona': 100, 'vritti.shah': 200, 'aditya.nambiar': 200, 'kashish.dhanani': 190 },
  'IDEA-006': { 'jagpavit.bhurjee': 120, 'saakshi.shingare': 100, 'devanshi.agrawal': 500, 'labiba.angona': 100, 'dhairya.jani': 120, 'vritti.shah': 100, 'fenil.gala': 100, 'kriti.toshniwal': 100, 'kashish.dhanani': 120, 'intissar.elkhadiri': 160 },
  'IDEA-007': { 'saakshi.shingare': 50, 'devanshi.agrawal': 100, 'labiba.angona': 80, 'dhairya.jani': 870, 'vritti.shah': 50, 'intissar.elkhadiri': 50, 'dnyanada.kulkarni': 50, 'aditya.nambiar': 50, 'kriti.toshniwal': 20 },
  'IDEA-008': { 'jagpavit.bhurjee': 80, 'saakshi.shingare': 100, 'devanshi.agrawal': 80, 'dhairya.jani': 80, 'vritti.shah': 50, 'meyyappan.lakshmanan': 100, 'intissar.elkhadiri': 100, 'dnyanada.kulkarni': 100, 'kashish.dhanani': 90, 'labiba.angona': 100, 'aditya.nambiar': 300 },
  'IDEA-009': { 'jagpavit.bhurjee': 80, 'saakshi.shingare': 50, 'devanshi.agrawal': 80, 'dhairya.jani': 80, 'meyyappan.lakshmanan': 80, 'intissar.elkhadiri': 100, 'dnyanada.kulkarni': 60, 'aditya.nambiar': 50, 'kriti.toshniwal': 100, 'labiba.angona': 100, 'kashish.dhanani': 100 },
  'IDEA-010': { 'jagpavit.bhurjee': 120, 'saakshi.shingare': 50, 'devanshi.agrawal': 60, 'meyyappan.lakshmanan': 100, 'intissar.elkhadiri': 80, 'aditya.nambiar': 100, 'fenil.gala': 50, 'labiba.angona': 80, 'kashish.dhanani': 100, 'kriti.toshniwal': 100 },
};


export const TICKERS: TickerItem[] = [
  { sym: 'SPX', val: '5,842.31', chg: '+0.38%', up: true },
  { sym: 'NDX', val: '21,445.20', chg: '+0.52%', up: true },
  { sym: 'VIX', val: '14.22', chg: '-0.84%', up: false },
  { sym: 'DXY', val: '104.38', chg: '+0.12%', up: true },
  { sym: '10Y', val: '4.412%', chg: '-0.8bp', up: false },
  { sym: 'WTI', val: '78.54', chg: '-0.24%', up: false },
  { sym: 'NVDA', val: '875.50', chg: '+1.82%', up: true },
  { sym: 'MSFT', val: '425.20', chg: '+0.44%', up: true },
  { sym: 'TSLA', val: '248.50', chg: '-1.12%', up: false },
  { sym: 'META', val: '520.80', chg: '+0.73%', up: true },
];

export const WEEK_ID = process.env.WEEK_ID ?? 'W26-2025';
export const IDEA_LIMIT_PER_WEEK = 2;
export const ROUND_BUDGET = 5000;

// IST = UTC+5:30. Phase windows (times in IST):
//   Sat 09:00 → Mon 16:30  round1        ($5k budget released)
//   Mon 16:30 → Wed 09:00  round1_closed (attribution revealed)
//   Wed 09:00 → Thu 16:30  round2        ($5k more released)
//   Thu 16:30 → Sat 09:00  results       (final results)
export function getPhase(): Phase {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  const day = ist.getUTCDay();
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  if (day === 6 && mins >= 540) return 'round1';
  if (day === 0) return 'round1';
  if (day === 1 && mins <= 990) return 'round1';
  if (day === 1 && mins > 990) return 'round1_closed';
  if (day === 2) return 'round1_closed';
  if (day === 3 && mins < 540) return 'round1_closed';
  if (day === 3 && mins >= 540) return 'round2';
  if (day === 4 && mins <= 990) return 'round2';
  return 'results';
}

// 12 of 16 analysts pre-submitted Round 1 (seed data for Sat Jun 27 ballot)
export const ALLOCATIONS0: Allocation[] = [
  // saakshi.shingare (author IDEA-002) — total: $5,000
  { id: 'AL-001', userId: 'saakshi.shingare', ideaId: 'IDEA-001', amount: 1852, round: 1, submittedAt: '2026-06-27T06:15Z', weekId: 'W26-2025' },
  { id: 'AL-002', userId: 'saakshi.shingare', ideaId: 'IDEA-003', amount: 1296, round: 1, submittedAt: '2026-06-27T06:15Z', weekId: 'W26-2025' },
  { id: 'AL-003', userId: 'saakshi.shingare', ideaId: 'IDEA-004', amount: 741,  round: 1, submittedAt: '2026-06-27T06:15Z', weekId: 'W26-2025' },
  { id: 'AL-004', userId: 'saakshi.shingare', ideaId: 'IDEA-008', amount: 648,  round: 1, submittedAt: '2026-06-27T06:15Z', weekId: 'W26-2025' },
  { id: 'AL-005', userId: 'saakshi.shingare', ideaId: 'IDEA-010', amount: 463,  round: 1, submittedAt: '2026-06-27T06:15Z', weekId: 'W26-2025' },
  // devanshi.agrawal — total: $5,000
  { id: 'AL-006', userId: 'devanshi.agrawal', ideaId: 'IDEA-001', amount: 1000, round: 1, submittedAt: '2026-06-27T07:02Z', weekId: 'W26-2025' },
  { id: 'AL-007', userId: 'devanshi.agrawal', ideaId: 'IDEA-002', amount: 800,  round: 1, submittedAt: '2026-06-27T07:02Z', weekId: 'W26-2025' },
  { id: 'AL-008', userId: 'devanshi.agrawal', ideaId: 'IDEA-003', amount: 800,  round: 1, submittedAt: '2026-06-27T07:02Z', weekId: 'W26-2025' },
  { id: 'AL-009', userId: 'devanshi.agrawal', ideaId: 'IDEA-006', amount: 2000, round: 1, submittedAt: '2026-06-27T07:02Z', weekId: 'W26-2025' },
  { id: 'AL-010', userId: 'devanshi.agrawal', ideaId: 'IDEA-008', amount: 400,  round: 1, submittedAt: '2026-06-27T07:02Z', weekId: 'W26-2025' },
  // labiba.angona (author IDEA-005) — total: $5,000
  { id: 'AL-011', userId: 'labiba.angona', ideaId: 'IDEA-001', amount: 1429, round: 1, submittedAt: '2026-06-27T07:45Z', weekId: 'W26-2025' },
  { id: 'AL-012', userId: 'labiba.angona', ideaId: 'IDEA-003', amount: 1071, round: 1, submittedAt: '2026-06-27T07:45Z', weekId: 'W26-2025' },
  { id: 'AL-013', userId: 'labiba.angona', ideaId: 'IDEA-004', amount: 1071, round: 1, submittedAt: '2026-06-27T07:45Z', weekId: 'W26-2025' },
  { id: 'AL-014', userId: 'labiba.angona', ideaId: 'IDEA-008', amount: 714,  round: 1, submittedAt: '2026-06-27T07:45Z', weekId: 'W26-2025' },
  { id: 'AL-015', userId: 'labiba.angona', ideaId: 'IDEA-009', amount: 715,  round: 1, submittedAt: '2026-06-27T07:45Z', weekId: 'W26-2025' },
  // jagpavit.bhurjee (author IDEA-007) — total: $5,000
  { id: 'AL-016', userId: 'jagpavit.bhurjee', ideaId: 'IDEA-001', amount: 2424, round: 1, submittedAt: '2026-06-27T08:20Z', weekId: 'W26-2025' },
  { id: 'AL-017', userId: 'jagpavit.bhurjee', ideaId: 'IDEA-005', amount: 606,  round: 1, submittedAt: '2026-06-27T08:20Z', weekId: 'W26-2025' },
  { id: 'AL-018', userId: 'jagpavit.bhurjee', ideaId: 'IDEA-006', amount: 758,  round: 1, submittedAt: '2026-06-27T08:20Z', weekId: 'W26-2025' },
  { id: 'AL-019', userId: 'jagpavit.bhurjee', ideaId: 'IDEA-009', amount: 455,  round: 1, submittedAt: '2026-06-27T08:20Z', weekId: 'W26-2025' },
  { id: 'AL-020', userId: 'jagpavit.bhurjee', ideaId: 'IDEA-010', amount: 757,  round: 1, submittedAt: '2026-06-27T08:20Z', weekId: 'W26-2025' },
  // dhairya.jani — total: $5,000
  { id: 'AL-021', userId: 'dhairya.jani', ideaId: 'IDEA-002', amount: 714,  round: 1, submittedAt: '2026-06-27T08:55Z', weekId: 'W26-2025' },
  { id: 'AL-022', userId: 'dhairya.jani', ideaId: 'IDEA-004', amount: 357,  round: 1, submittedAt: '2026-06-27T08:55Z', weekId: 'W26-2025' },
  { id: 'AL-023', userId: 'dhairya.jani', ideaId: 'IDEA-006', amount: 447,  round: 1, submittedAt: '2026-06-27T08:55Z', weekId: 'W26-2025' },
  { id: 'AL-024', userId: 'dhairya.jani', ideaId: 'IDEA-007', amount: 3214, round: 1, submittedAt: '2026-06-27T08:55Z', weekId: 'W26-2025' },
  { id: 'AL-025', userId: 'dhairya.jani', ideaId: 'IDEA-008', amount: 268,  round: 1, submittedAt: '2026-06-27T08:55Z', weekId: 'W26-2025' },
  // fenil.gala (author IDEA-009) — total: $5,000
  { id: 'AL-026', userId: 'fenil.gala', ideaId: 'IDEA-001', amount: 1250, round: 1, submittedAt: '2026-06-27T09:10Z', weekId: 'W26-2025' },
  { id: 'AL-027', userId: 'fenil.gala', ideaId: 'IDEA-003', amount: 1667, round: 1, submittedAt: '2026-06-27T09:10Z', weekId: 'W26-2025' },
  { id: 'AL-028', userId: 'fenil.gala', ideaId: 'IDEA-004', amount: 1250, round: 1, submittedAt: '2026-06-27T09:10Z', weekId: 'W26-2025' },
  { id: 'AL-029', userId: 'fenil.gala', ideaId: 'IDEA-006', amount: 833,  round: 1, submittedAt: '2026-06-27T09:10Z', weekId: 'W26-2025' },
  // kriti.toshniwal (author IDEA-010) — total: $5,000
  { id: 'AL-030', userId: 'kriti.toshniwal', ideaId: 'IDEA-002', amount: 1230, round: 1, submittedAt: '2026-06-27T09:30Z', weekId: 'W26-2025' },
  { id: 'AL-031', userId: 'kriti.toshniwal', ideaId: 'IDEA-003', amount: 1475, round: 1, submittedAt: '2026-06-27T09:30Z', weekId: 'W26-2025' },
  { id: 'AL-032', userId: 'kriti.toshniwal', ideaId: 'IDEA-004', amount: 656,  round: 1, submittedAt: '2026-06-27T09:30Z', weekId: 'W26-2025' },
  { id: 'AL-033', userId: 'kriti.toshniwal', ideaId: 'IDEA-006', amount: 820,  round: 1, submittedAt: '2026-06-27T09:30Z', weekId: 'W26-2025' },
  { id: 'AL-034', userId: 'kriti.toshniwal', ideaId: 'IDEA-009', amount: 819,  round: 1, submittedAt: '2026-06-27T09:30Z', weekId: 'W26-2025' },
  // vritti.shah (author IDEA-008) — total: $5,000
  { id: 'AL-035', userId: 'vritti.shah', ideaId: 'IDEA-001', amount: 1538, round: 1, submittedAt: '2026-06-27T09:50Z', weekId: 'W26-2025' },
  { id: 'AL-036', userId: 'vritti.shah', ideaId: 'IDEA-003', amount: 1058, round: 1, submittedAt: '2026-06-27T09:50Z', weekId: 'W26-2025' },
  { id: 'AL-037', userId: 'vritti.shah', ideaId: 'IDEA-004', amount: 673,  round: 1, submittedAt: '2026-06-27T09:50Z', weekId: 'W26-2025' },
  { id: 'AL-038', userId: 'vritti.shah', ideaId: 'IDEA-005', amount: 1154, round: 1, submittedAt: '2026-06-27T09:50Z', weekId: 'W26-2025' },
  { id: 'AL-039', userId: 'vritti.shah', ideaId: 'IDEA-006', amount: 577,  round: 1, submittedAt: '2026-06-27T09:50Z', weekId: 'W26-2025' },
  // kashish.dhanani — total: $5,000
  { id: 'AL-040', userId: 'kashish.dhanani', ideaId: 'IDEA-001', amount: 991,  round: 1, submittedAt: '2026-06-27T10:05Z', weekId: 'W26-2025' },
  { id: 'AL-041', userId: 'kashish.dhanani', ideaId: 'IDEA-002', amount: 811,  round: 1, submittedAt: '2026-06-27T10:05Z', weekId: 'W26-2025' },
  { id: 'AL-042', userId: 'kashish.dhanani', ideaId: 'IDEA-003', amount: 901,  round: 1, submittedAt: '2026-06-27T10:05Z', weekId: 'W26-2025' },
  { id: 'AL-043', userId: 'kashish.dhanani', ideaId: 'IDEA-004', amount: 901,  round: 1, submittedAt: '2026-06-27T10:05Z', weekId: 'W26-2025' },
  { id: 'AL-044', userId: 'kashish.dhanani', ideaId: 'IDEA-005', amount: 856,  round: 1, submittedAt: '2026-06-27T10:05Z', weekId: 'W26-2025' },
  { id: 'AL-045', userId: 'kashish.dhanani', ideaId: 'IDEA-006', amount: 540,  round: 1, submittedAt: '2026-06-27T10:05Z', weekId: 'W26-2025' },
  // meyyappan.lakshmanan (author IDEA-001) — total: $5,000
  { id: 'AL-046', userId: 'meyyappan.lakshmanan', ideaId: 'IDEA-003', amount: 1351, round: 1, submittedAt: '2026-06-27T10:25Z', weekId: 'W26-2025' },
  { id: 'AL-047', userId: 'meyyappan.lakshmanan', ideaId: 'IDEA-004', amount: 1621, round: 1, submittedAt: '2026-06-27T10:25Z', weekId: 'W26-2025' },
  { id: 'AL-048', userId: 'meyyappan.lakshmanan', ideaId: 'IDEA-005', amount: 1216, round: 1, submittedAt: '2026-06-27T10:25Z', weekId: 'W26-2025' },
  { id: 'AL-049', userId: 'meyyappan.lakshmanan', ideaId: 'IDEA-008', amount: 812,  round: 1, submittedAt: '2026-06-27T10:25Z', weekId: 'W26-2025' },
  // intissar.elkhadiri (author IDEA-003) — total: $5,000
  { id: 'AL-050', userId: 'intissar.elkhadiri', ideaId: 'IDEA-001', amount: 1111, round: 1, submittedAt: '2026-06-27T10:45Z', weekId: 'W26-2025' },
  { id: 'AL-051', userId: 'intissar.elkhadiri', ideaId: 'IDEA-004', amount: 1270, round: 1, submittedAt: '2026-06-27T10:45Z', weekId: 'W26-2025' },
  { id: 'AL-052', userId: 'intissar.elkhadiri', ideaId: 'IDEA-005', amount: 952,  round: 1, submittedAt: '2026-06-27T10:45Z', weekId: 'W26-2025' },
  { id: 'AL-053', userId: 'intissar.elkhadiri', ideaId: 'IDEA-006', amount: 1032, round: 1, submittedAt: '2026-06-27T10:45Z', weekId: 'W26-2025' },
  { id: 'AL-054', userId: 'intissar.elkhadiri', ideaId: 'IDEA-009', amount: 635,  round: 1, submittedAt: '2026-06-27T10:45Z', weekId: 'W26-2025' },
  // dnyanada.kulkarni (author IDEA-006) — total: $5,000
  { id: 'AL-055', userId: 'dnyanada.kulkarni', ideaId: 'IDEA-001', amount: 1508, round: 1, submittedAt: '2026-06-27T11:00Z', weekId: 'W26-2025' },
  { id: 'AL-056', userId: 'dnyanada.kulkarni', ideaId: 'IDEA-002', amount: 1270, round: 1, submittedAt: '2026-06-27T11:00Z', weekId: 'W26-2025' },
  { id: 'AL-057', userId: 'dnyanada.kulkarni', ideaId: 'IDEA-003', amount: 952,  round: 1, submittedAt: '2026-06-27T11:00Z', weekId: 'W26-2025' },
  { id: 'AL-058', userId: 'dnyanada.kulkarni', ideaId: 'IDEA-005', amount: 635,  round: 1, submittedAt: '2026-06-27T11:00Z', weekId: 'W26-2025' },
  { id: 'AL-059', userId: 'dnyanada.kulkarni', ideaId: 'IDEA-008', amount: 635,  round: 1, submittedAt: '2026-06-27T11:00Z', weekId: 'W26-2025' },
];
