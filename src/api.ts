// Client HTTP unique du back-office. Tous les appels au backend passent par ce fichier ;
// les formes de données sont dans ./api/types.ts.
import type {
  AuditEntry,
  AuditVerifyResult,
  AuthTokens,
  Balance,
  Batch,
  BatchDetail,
  BrokerAccount,
  BrokerAccountState,
  ComplianceAlert,
  ComplianceCase,
  ComplianceNote,
  ConfigValue,
  FeeChangeInput,
  FeeSchedule,
  FinancialMetrics,
  Instrument,
  InstrumentInput,
  KycCase,
  Market,
  MaybeApproval,
  Me,
  MirrorRow,
  NotificationLogEntry,
  Order,
  OrderReviewInput,
  Paginated,
  Partner,
  PaymentIntent,
  PendingApproval,
  QuoteInput,
  ReconciliationItem,
  ReconciliationState,
  Stats,
  SupportTicket,
  TicketStatus,
  UserDetail,
  UserRow, MirrorSnapshot } from './api/types';

export const BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// ---- Jetons (mémoire + sessionStorage, jamais localStorage) -------------------

const ACCESS_KEY = 'alke_admin_access';
const REFRESH_KEY = 'alke_admin_refresh';

let accessToken: string | null = null;
let refreshToken: string | null = null;

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value) sessionStorage.setItem(key, value);
    else sessionStorage.removeItem(key);
  } catch {
    // stockage indisponible : on reste en mémoire
  }
}

accessToken = readStorage(ACCESS_KEY);
refreshToken = readStorage(REFRESH_KEY);

export const tokenStore = {
  hasSession: () => Boolean(accessToken || refreshToken),
  getRefreshToken: () => refreshToken,
  set(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    writeStorage(ACCESS_KEY, accessToken);
    writeStorage(REFRESH_KEY, refreshToken);
  },
  clear() {
    accessToken = null;
    refreshToken = null;
    writeStorage(ACCESS_KEY, null);
    writeStorage(REFRESH_KEY, null);
  },
};

// Notifie l'AuthProvider quand la session ne peut plus être rafraîchie.
type SessionListener = () => void;
const sessionListeners = new Set<SessionListener>();
export function onSessionExpired(listener: SessionListener) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}
function expireSession() {
  tokenStore.clear();
  for (const l of sessionListeners) l();
}

// ---- Erreurs ---------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function errorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError) return 'Serveur injoignable. Vérifiez votre connexion ou l’URL de l’API.';
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `Erreur ${res.status}`;
  let details: unknown;
  try {
    const body = await res.json();
    details = body;
    const m = body?.message ?? body?.error;
    if (Array.isArray(m)) message = m.join(', ');
    else if (typeof m === 'string' && m) message = m;
  } catch {
    // corps non JSON
  }
  if (res.status === 401 && message === 'Erreur 401') message = 'Session expirée, veuillez vous reconnecter.';
  if (res.status === 403 && message === 'Erreur 403') message = 'Action non autorisée pour votre rôle.';
  return new ApiError(message, res.status, details);
}

// ---- Rafraîchissement single-flight -----------------------------------------------

let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const rt = refreshToken;
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const tokens = (await res.json()) as AuthTokens;
    if (!tokens?.accessToken) return false;
    tokenStore.set(tokens);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// ---- Requête générique ------------------------------------------------------------

const AUTH_PATHS = ['/auth/login', '/auth/refresh'];

async function rawFetch(path: string, init: RequestInit, withAuth: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (withAuth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function fetchWithRefresh(path: string, init: RequestInit): Promise<Response> {
  const isAuthPath = AUTH_PATHS.some((p) => path.startsWith(p));
  let res = await rawFetch(path, init, !isAuthPath);
  if (res.status === 401 && !isAuthPath) {
    const ok = await refreshOnce();
    if (!ok) {
      expireSession();
      throw await parseError(res);
    }
    res = await rawFetch(path, init, true);
    if (res.status === 401) expireSession();
  }
  return res;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithRefresh(path, init);
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

function json(body: unknown): RequestInit {
  return { body: body === undefined ? undefined : JSON.stringify(body) };
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', ...json(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', ...json(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', ...json(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Télécharge une ressource protégée (bearer) et l'ouvre / l'enregistre via un object URL. */
export async function downloadBlob(path: string, filename: string): Promise<void> {
  const res = await fetchWithRefresh(path, { method: 'GET' });
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Construit une query string en ignorant les valeurs vides. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ---- Endpoints typés ----------------------------------------------------------------

export const api = {
  auth: {
    login: (identifier: string, password: string) =>
      http.post<AuthTokens>('/auth/login', { identifier, password }),
    me: () => http.get<Me>('/auth/me'),
    logout: (body: { refreshToken?: string | null; all?: boolean }) => http.post<void>('/auth/logout', body),
  },

  users: {
    list: (p: { search?: string; kycStatus?: string; page?: number; pageSize?: number }) =>
      http.get<Paginated<UserRow>>(`/admin/users${qs(p)}`),
    get: (id: string) => http.get<UserDetail>(`/admin/users/${id}`),
    block: (id: string, body: { isBlocked: boolean; blockedReason?: string }) =>
      http.patch<MaybeApproval<UserDetail>>(`/admin/users/${id}/block`, body),
  },

  kyc: {
    queue: (p: { status?: string }) => http.get<KycCase[]>(`/admin/kyc/queue${qs(p)}`),
    get: (id: string) => http.get<KycCase>(`/admin/kyc/cases/${id}`),
    decide: (id: string, body: { decision: 'VALIDATED' | 'REJECTED'; reason?: string }) =>
      http.post<MaybeApproval<KycCase>>(`/admin/kyc/cases/${id}/decision`, body),
  },

  brokerAccounts: {
    list: (p: { state?: string }) => http.get<BrokerAccount[]>(`/admin/broker-accounts${qs(p)}`),
    exportCsv: () => downloadBlob('/admin/broker-accounts/export.csv', 'comptes-titres.csv'),
    update: (id: string, body: { externalAccountNo: string; state: BrokerAccountState }) =>
      http.patch<BrokerAccount>(`/admin/broker-accounts/${id}`, body),
  },

  markets: {
    list: () => http.get<Market[]>('/markets'),
    setLiveTrading: (id: string, body: { liveTrading: boolean; reason: string }) =>
      http.patch<PendingApproval>(`/admin/markets/${id}/live-trading`, body),
  },

  instruments: {
    list: (p: { marketId?: string }) => http.get<Instrument[]>(`/instruments${qs(p)}`),
    create: (body: InstrumentInput) => http.post<Instrument>('/instruments', body),
    update: (id: string, body: Partial<InstrumentInput>) => http.patch<Instrument>(`/instruments/${id}`, body),
    addQuote: (id: string, body: QuoteInput) => http.post<Instrument>(`/instruments/${id}/quotes`, body),
  },

  partners: {
    list: () => http.get<Partner[]>('/partners'),
    create: (body: Partial<Partner>) => http.post<Partner>('/partners', body),
    update: (id: string, body: Partial<Partner>) => http.patch<Partner>(`/partners/${id}`, body),
  },

  orders: {
    list: (p: { marketId?: string; status?: string; batchId?: string }) => http.get<Order[]>(`/orders${qs(p)}`),
    review: (id: string, body: OrderReviewInput) =>
      http.patch<PendingApproval>(`/orders/${id}/review`, body),
  },

  batches: {
    list: (p: { marketId?: string; state?: string }) => http.get<Batch[]>(`/admin/batches${qs(p)}`),
    get: (id: string) => http.get<BatchDetail>(`/admin/batches/${id}`),
    build: (body: { marketId: string; partnerId: string }) => http.post<Batch>('/admin/batches/build', body),
    buildWdr: (body: { partnerId: string }) => http.post<Batch>('/admin/batches/wdr/build', body),
    downloadFile: (id: string, fileName: string) => downloadBlob(`/admin/batches/${id}/file`, fileName),
    markSent: (id: string) => http.post<Batch>(`/admin/batches/${id}/sent`),
    importAck: (id: string, content: string) => http.post<Batch>(`/admin/batches/${id}/ack`, { content }),
    importExe: (id: string, content: string) => http.post<Batch>(`/admin/batches/${id}/exe`, { content }),
    importCsh: (partnerId: string, content: string) =>
      http.post<{ imported?: number; items?: ReconciliationItem[] }>(`/admin/partners/${partnerId}/csh`, {
        content,
      }),
  },

  payments: {
    intents: (p: { state?: string; direction?: string }) =>
      http.get<PaymentIntent[]>(`/admin/payments/intents${qs(p)}`),
    recheck: (id: string) => http.post<PaymentIntent>(`/admin/payments/intents/${id}/recheck`),
    forceComplete: (id: string, body: { reason: string }) =>
      http.post<PendingApproval>(`/admin/payments/intents/${id}/force-complete`, body),
  },

  reconciliation: {
    list: (p: { state?: string }) => http.get<ReconciliationItem[]>(`/admin/reconciliation${qs(p)}`),
    update: (id: string, body: { state: ReconciliationState; reason: string; matchedTxnId?: string }) =>
      http.patch<ReconciliationItem>(`/admin/reconciliation/${id}`, body),
    writeOff: (id: string, body: { reason: string }) =>
      http.post<PendingApproval>(`/admin/reconciliation/${id}/write-off`, body),
    mirror: async (): Promise<MirrorRow[]> => {
      const snap = await http.get<MirrorSnapshot>('/admin/reconciliation/mirror');
      return snap.totals.map((t) => {
        const open = snap.openMirrorItems.find((i) => i.currency === t.currency);
        const diff = open ? Number(open.amount) : null;
        return {
          currency: t.currency,
          ledgerTotal: t.ledgerTotal,
          difference: open ? open.amount : null,
          statementBalance: open && diff !== null ? String(Number(t.ledgerTotal) - diff) : null,
          asOf: open?.occurredAt ?? null,
        };
      });
    },
    metrics: () => http.get<FinancialMetrics>('/admin/metrics/financial'),
  },

  approvals: {
    list: (p: { state?: string; actionType?: string }) =>
      http.get<PendingApproval[]>(`/admin/approvals${qs(p)}`),
    approve: (id: string, body: { note?: string }) =>
      http.post<PendingApproval>(`/admin/approvals/${id}/approve`, body),
    reject: (id: string, body: { note: string }) => http.post<PendingApproval>(`/admin/approvals/${id}/reject`, body),
  },

  compliance: {
    alerts: (p: { status?: string; severity?: string }) =>
      http.get<ComplianceAlert[]>(`/admin/compliance/alerts${qs(p)}`),
    cases: (p: { state?: string }) => http.get<ComplianceCase[]>(`/admin/compliance/cases${qs(p)}`),
    getCase: (id: string) => http.get<ComplianceCase>(`/admin/compliance/cases/${id}`),
    createCase: (body: { title: string; subjectUserId?: string; alertIds: string[] }) =>
      http.post<ComplianceCase>('/admin/compliance/cases', body),
    addNote: (id: string, body: { body: string }) =>
      http.post<ComplianceNote>(`/admin/compliance/cases/${id}/notes`, body),
    decide: (id: string, body: { decision: string; reason: string; regulatoryReportRef?: string }) =>
      http.post<PendingApproval>(`/admin/compliance/cases/${id}/decision`, body),
    exportCsv: (month: string) =>
      downloadBlob(`/admin/compliance/export.csv${qs({ month })}`, `conformite-${month}.csv`),
  },

  fees: {
    list: (p: { marketId?: string }) => http.get<FeeSchedule[]>(`/fees${qs(p)}`),
    requestChange: (body: FeeChangeInput) => http.post<PendingApproval>('/admin/fees/changes', body),
  },

  config: {
    list: () => http.get<ConfigValue[]>('/admin/config'),
    requestChange: (key: string, body: { value: unknown; reason: string }) =>
      http.put<PendingApproval>(`/admin/config-changes/${encodeURIComponent(key)}`, body),
  },

  support: {
    tickets: (p: { status?: string }) => http.get<SupportTicket[]>(`/admin/support/tickets${qs(p)}`),
    addMessage: (id: string, body: string) =>
      http.post<TicketMessageResponse>(`/admin/support/tickets/${id}/messages`, { body }),
    setStatus: (id: string, status: TicketStatus) =>
      http.patch<SupportTicket>(`/admin/support/tickets/${id}`, { status }),
  },

  audit: {
    list: (p: {
      entityType?: string;
      action?: string;
      page?: number;
      pageSize?: number;
      from?: string;
      to?: string;
    }) => http.get<Paginated<AuditEntry>>(`/admin/audit-log${qs(p)}`),
    verify: () => http.get<AuditVerifyResult>('/admin/audit-log/verify'),
  },

  stats: {
    get: () => http.get<Stats>('/admin/stats'),
  },

  notifications: {
    // Le backend renvoie une page ({ items, total… }) ; certaines versions renvoient un tableau brut.
    log: async (p: { status?: string }): Promise<NotificationLogEntry[]> => {
      const res = await http.get<NotificationLogEntry[] | Paginated<NotificationLogEntry>>(`/admin/notifications/log${qs(p)}`);
      return Array.isArray(res) ? res : res?.items ?? [];
    },
  },
};

type TicketMessageResponse = { id: string } | SupportTicket;

export type { Balance };
