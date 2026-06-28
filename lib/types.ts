export type Role = 'CIO' | 'PM' | 'SR_ANALYST' | 'ANALYST';
export type Tier = 'A+' | 'A' | 'B';
export type ApprovalStatus = 'APPROVED' | 'PENDING' | 'REVIEW' | 'REJECTED';
export type Direction = 'LONG' | 'SHORT';

export interface User {
  id: string;
  email: string;
  name: string;
  title: string;
  role: Role;
  tier: Tier;
  hitRate: number;
  avgRet: number;
  sharpe: number;
  drawCtrl: number;
  consistency: number;
  peerScore: number;
  ideaScore: number;
  allocScore: number;
  researchScore: number;
}

export interface Idea {
  id: string;
  ticker: string;
  assetClass: string;
  dir: Direction;
  entry: number;
  stop: number;
  target: number;
  hold: string;
  posSize: number;
  conv: number;
  expRet: number;
  expDD: number;
  rr: number;
  thesis: string;
  catalysts: string[];
  risks: string[];
  authorId: string;
  submittedAt: string;
  weekId: string;
  status: string;
  totalCredits: number;
  rank: number;
  pmScore: number;
  skillScore: number;
  rrScore: number;
  quantScore: number;
  finalScore: number;
  momentumScore: number;
  rsScore: number;
  earningRevScore: number;
  approvalStatus: ApprovalStatus;
  imageUrl?: string;
}

export type VoteMap = Record<string, Record<string, number>>;

export interface PortfolioPosition {
  rank: number;
  ideaId: string;
  ticker: string;
  dir: Direction;
  alloc: number;
  expRet: number;
  sector: string;
  beta: number;
  pmOvr: boolean;
}

export interface AuditEntry {
  id: string;
  ts: string;
  userId: string;
  action: string;
  detail: string;
  ip: string;
  dev: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Session {
  userId: string;
  name: string;
  role: string;
  ip: string;
  dev: string;
  lastAct: string;
  status: 'ACTIVE' | 'IDLE' | 'BLOCKED' | 'TERMINATED';
  mfa: boolean;
  risk: number;
}

export interface GamingFlag {
  id: string;
  type: string;
  sev: 'HIGH' | 'MEDIUM' | 'LOW';
  users: string[];
  detail: string;
  score: number;
  ts: string;
}

export interface TickerItem {
  sym: string;
  val: string;
  chg: string;
  up: boolean;
}

export type Phase = 'round1' | 'round1_closed' | 'round2' | 'results';

export type ResearchStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETE' | 'RISK_REVIEW' | 'COMMITTEE_REVIEW' | 'ARCHIVED';

export interface ResearchDoc {
  id: string;
  ideaId: string;
  status: ResearchStatus;
  templateType: string | null;
  thesis: string | null;
  financials: string | null;
  valuation: string | null;
  technical: string | null;
  overview: string | null;
  completionScore: number;
  qualityScore: number;
  authorId: string;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchCatalyst {
  id: string;
  docId: string;
  title: string;
  description: string;
  expectedImpact: string | null;
  probability: number | null;
  timeline: string | null;
  importance: string;
  sortOrder: number;
  createdAt: string;
}

export interface ResearchRisk {
  id: string;
  docId: string;
  description: string;
  severity: string;
  probability: number | null;
  mitigation: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface ResearchAttachment {
  id: string;
  docId: string;
  title: string;
  description: string | null;
  fileType: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedBy: string;
  createdAt: string;
}

export interface ResearchReference {
  id: string;
  docId: string;
  title: string;
  source: string;
  url: string | null;
  publishDate: string | null;
  notes: string | null;
  addedBy: string;
  createdAt: string;
}

export interface ResearchComment {
  id: string;
  docId: string;
  parentId: string | null;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: ResearchComment[];
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  notes: string | null;
  addedBy: string;
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isPublic: boolean;
  color: string | null;
  createdAt: string;
  items: WatchlistItem[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: string;
  date: string;
  ticker: string | null;
  ideaId: string | null;
  description: string | null;
  importance: string;
  createdBy: string;
  createdAt: string;
}

export interface PostMortem {
  id: string;
  ideaId: string;
  authorId: string;
  entryDate: string | null;
  exitDate: string | null;
  entryPrice: number | null;
  exitPrice: number | null;
  actualReturn: number | null;
  maxDrawdown: number | null;
  holdDays: number | null;
  originalThesis: string | null;
  whatWorked: string | null;
  whatFailed: string | null;
  mistakes: string | null;
  lessonsLearned: string | null;
  futureAction: string | null;
  committeeNotes: string | null;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Allocation {
  id: string;
  userId: string;
  ideaId: string;
  amount: number;
  round: 1 | 2;
  submittedAt: string;
  weekId: string;
}
