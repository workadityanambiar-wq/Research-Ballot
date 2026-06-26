export type Role = 'CIO' | 'PM';
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
