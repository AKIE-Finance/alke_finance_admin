// Types du contrat backend AlKÉ Finance (blueprint v3.2, §4.9 / §4.17).
// Toute correction de forme se fait ici et dans ../api.ts uniquement.

export type Role = 'USER' | 'SUPPORT' | 'COMPLIANCE' | 'ADMIN';

export type KycStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AUTO_APPROVED'
  | 'MANUAL_REVIEW'
  | 'VALIDATED'
  | 'REJECTED'
  | 'RE_KYC';

export type BrokerAccountState = 'REQUESTED' | 'OPEN' | 'SUSPENDED' | 'CLOSED';
export type MarketStatus = 'SIMULATED_ONLY' | 'PARTNER_IN_PROGRESS' | 'LIVE';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus =
  | 'PENDING'
  | 'TRANSMITTED'
  | 'ACKNOWLEDGED'
  | 'PARTIALLY_EXECUTED'
  | 'EXECUTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'ADJUSTED';
export type BatchState = 'BUILT' | 'SENT' | 'ACKED' | 'PROCESSED' | 'FAILED';
export type PaymentDirection = 'IN' | 'OUT';
export type PaymentIntentState = 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type ReconciliationState = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'WRITTEN_OFF';
export type ApprovalState = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ATTACHED' | 'DISMISSED';
export type ComplianceCaseState = 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLEARED' | 'REPORTED' | 'CLOSED';
export type FeeType = 'COURTAGE_SDB' | 'COMMISSION_ALKE' | 'FX_SPREAD' | 'TAXE' | 'WITHDRAWAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---- Auth -----------------------------------------------------------------

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Me {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  kycStatus: KycStatus;
  country: string;
}

// ---- Maker-checker ---------------------------------------------------------

export interface PendingApproval {
  id: string;
  actionType: string;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
  reason: string;
  state: ApprovalState;
  maker: { id?: string; fullName: string };
  checker?: { id?: string; fullName: string } | null;
  decisionNote?: string | null;
  createdAt: string;
  decidedAt: string | null;
  executedAt: string | null;
  error: string | null;
}

/** Réponse d'un endpoint qui peut soit appliquer l'action, soit créer une demande d'approbation. */
export type MaybeApproval<T> = T | { approval: PendingApproval };

export function isApproval<T>(res: MaybeApproval<T>): res is { approval: PendingApproval } {
  return typeof res === 'object' && res !== null && 'approval' in (res as object);
}

// ---- Utilisateurs & KYC ----------------------------------------------------

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  kycStatus: KycStatus;
  role: Role;
  isBlocked: boolean;
  blockedReason?: string | null;
  createdAt: string;
}

/** Résultat de screening sanctions / PEP — forme libre côté fournisseur. */
export interface ScreeningResult {
  pep?: boolean;
  sanctions?: boolean;
  hit?: boolean;
  matches?: unknown[];
  [key: string]: unknown;
}

export interface KycSubmission {
  id: string;
  userId: string;
  status: KycStatus;
  documentType: string | null;
  documentCountry: string | null;
  documentFrontUrl: string | null;
  documentBackUrl: string | null;
  selfieUrl: string | null;
  submittedAt: string | null;
  decidedAt?: string | null;
  livenessScore: string | number | null;
  screeningResult: ScreeningResult | null;
  decisionReason?: string | null;
  rejectionReason?: string | null;
}

export interface BrokerAccount {
  id: string;
  userId?: string;
  user?: { fullName: string; email: string } | null;
  partnerId: string;
  partner?: { name: string; code: string | null } | null;
  externalAccountNo: string | null;
  state: BrokerAccountState;
  requestedAt?: string;
  openedAt?: string | null;
}

export interface Balance {
  currency: string;
  kind: string;
  balance: string;
}

export interface ComplianceCaseSummary {
  id: string;
  reference: string;
  title: string;
  state: ComplianceCaseState;
  openedAt: string;
}

export interface UserDetail extends UserRow {
  kycSubmissions: KycSubmission[];
  brokerAccounts: BrokerAccount[];
  orders: Order[];
  complianceCases: ComplianceCaseSummary[];
  balances: Balance[];
}

export interface KycCase {
  id: string;
  userId: string;
  user: { fullName: string; email: string; phone: string; country: string };
  status: KycStatus;
  documentType: string | null;
  documentCountry: string | null;
  submittedAt: string | null;
  livenessScore: string | number | null;
  screeningResult: ScreeningResult | null;
  documentFrontUrl?: string | null;
  documentBackUrl?: string | null;
  selfieUrl?: string | null;
  decisionReason?: string | null;
  rejectionReason?: string | null;
}

// ---- Catalogue -------------------------------------------------------------

export interface Market {
  id: string;
  code: string;
  name: string;
  zone?: string;
  currency: string;
  regulator: string;
  status: MarketStatus;
  liveTrading: boolean;
  settlementDays: number;
  cutoffTime: string;
  timezone?: string;
  _count?: { instruments: number; partners: number };
}

export interface Instrument {
  id: string;
  marketId: string;
  symbol: string;
  isin: string | null;
  name: string;
  assetClass: 'STOCK' | 'BOND';
  sector: string | null;
  currency: string;
  isActive: boolean;
  lotSize: number;
  tickSize: string | null;
  lastPrice: string | null;
  previousClose: string | null;
  market?: { code: string };
}

export interface InstrumentInput {
  marketId: string;
  symbol: string;
  isin?: string;
  name: string;
  assetClass: 'STOCK' | 'BOND';
  sector?: string;
  currency: string;
  isActive?: boolean;
  lotSize?: number;
}

export interface QuoteInput {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Partner {
  id: string;
  marketId: string;
  code: string | null;
  name: string;
  type: 'SDB' | 'SGI' | 'BROKER';
  agreementStatus: string;
  integrationTier: string;
  aelpParticipant: boolean;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  agreementNumber: string | null;
  market: { code: string };
}

// ---- Ordres & lots ----------------------------------------------------------

export interface Order {
  id: string;
  user: { fullName: string; email: string };
  instrument: { symbol: string; isin: string | null; name: string; currency?: string };
  market: { code: string };
  side: OrderSide;
  quantity: string;
  estimatedPrice: string;
  estimatedTotal: string;
  maxAmount: string;
  filledQuantity: string;
  avgExecutedPrice: string | null;
  status: OrderStatus;
  simulated: boolean;
  sdbRef: string | null;
  batchId: string | null;
  submittedAt: string;
  transmittedAt: string | null;
  executedAt: string | null;
  rejectionReason: string | null;
}

export interface OrderReviewInput {
  status: OrderStatus;
  executedPrice?: number;
  executedQuantity?: number;
  sdbRef?: string;
  reason: string;
}

export interface Batch {
  id: string;
  type?: 'ORD' | 'WDR';
  sequence: number;
  partner: { name: string; code: string | null };
  market: { code: string };
  cutoffAt: string;
  fileName: string;
  fileHash: string | null;
  state: BatchState;
  sentAt?: string | null;
  ackAt: string | null;
  processedAt?: string | null;
  orderCount: number;
}

export interface BatchDetail extends Batch {
  orders: Order[];
}

// ---- Paiements & rapprochement --------------------------------------------

export interface PaymentIntent {
  id: string;
  user: { fullName: string; email: string };
  direction: PaymentDirection;
  channel: string;
  amount: string;
  currency: string;
  reference: string;
  state: PaymentIntentState;
  providerRef: string | null;
  msisdn: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface ReconciliationItem {
  id: string;
  source: string;
  externalRef: string;
  amount: string;
  currency: string;
  occurredAt: string | null;
  state: ReconciliationState;
  reason: string | null;
  matchedTxnId: string | null;
}

export interface MirrorRow {
  currency: string;
  ledgerTotal: string;
  statementBalance: string | null;
  difference: string | null;
  asOf: string | null;
}

/** Raw shape of GET /admin/reconciliation/mirror. */
export interface MirrorSnapshot {
  materiality: string;
  totals: { currency: string; ledgerTotal: string }[];
  openMirrorItems: { id: string; currency: string; amount: string; occurredAt: string; reason: string | null; state: string }[];
}

export interface FinancialMetrics {
  mirrorMismatchXaf: string | number;
  openReconciliationItems: number;
  oldestPendingWithdrawalHours: number | null;
  ackLatencyMinutesLast: number | null;
}

// ---- Conformité --------------------------------------------------------------

export interface ComplianceAlert {
  id: string;
  source: string;
  severity: AlertSeverity;
  status: AlertStatus;
  userId: string | null;
  user?: { fullName: string; email: string } | null;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  details: unknown;
  caseId: string | null;
  createdAt: string;
}

export interface ComplianceNote {
  id: string;
  authorId: string;
  author?: { fullName: string } | null;
  body: string;
  createdAt: string;
}

export interface ComplianceDecision {
  id: string;
  decision: string;
  decidedById: string;
  decidedBy?: { fullName: string } | null;
  approvalId: string | null;
  regulatoryReportRef: string | null;
  decidedAt: string;
}

export interface ComplianceCase extends ComplianceCaseSummary {
  subjectUserId: string | null;
  subject?: { fullName: string; email: string } | null;
  ownerId: string | null;
  closedAt: string | null;
  alerts?: ComplianceAlert[];
  notes?: ComplianceNote[];
  decisions?: ComplianceDecision[];
}

// ---- Frais & configuration ---------------------------------------------------

export interface FeeSchedule {
  id: string;
  marketId: string | null;
  market?: { code: string } | null;
  feeType: FeeType;
  isPercentage: boolean;
  value: string;
  minAmount: string | null;
  maxAmount: string | null;
  label: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface FeeChangeInput {
  marketId?: string;
  feeType: FeeType;
  isPercentage: boolean;
  value: number;
  minAmount?: number;
  maxAmount?: number;
  label: string;
  reason: string;
}

export interface ConfigValue {
  key: string;
  value: unknown;
  effectiveFrom: string;
  approvedBy: { fullName: string } | string | null;
}

// ---- Support, audit, stats, notifications -----------------------------------

export interface TicketMessage {
  id: string;
  authorType: 'USER' | 'AGENT';
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: string;
  createdAt?: string;
  user: { fullName: string; email: string };
  messages: TicketMessage[];
}

export interface AuditEntry {
  id: string;
  seq: number | string;
  prevHash: string | null;
  hash: string;
  actorType: string;
  actorRole: string | null;
  actor: { fullName: string; email: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface AuditVerifyResult {
  ok: boolean;
  checked: number;
  brokenAtSeq?: number | string | null;
}

export interface Stats {
  users: { byKycStatus: Record<string, number> };
  orders: { byStatus: Record<string, number> };
  deposits: { paidByCurrency: Record<string, string | number> };
  pendingApprovals: number;
  openReconciliationItems: number;
  kycQueue: number;
  openComplianceAlerts: number;
  markets: { code: string; liveTrading: boolean }[];
}

export interface NotificationLogEntry {
  id: string;
  userId: string | null;
  channel: string;
  recipient: string;
  template: string;
  status: NotificationStatus;
  attempts: number;
  providerRef: string | null;
  error: string | null;
  eventName: string | null;
  createdAt: string;
  sentAt: string | null;
}
