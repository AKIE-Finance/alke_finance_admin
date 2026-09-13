// Libellés français de toutes les énumérations du contrat backend (src/api/types.ts).
// Les valeurs restent les clés techniques ; seule la présentation change.
// `label(kind, value)` renvoie toujours une chaîne lisible (repli : Title Case de la clé).

export type LabelKind =
  | 'role'
  | 'kyc'
  | 'brokerAccount'
  | 'market'
  | 'liveTrading'
  | 'orderSide'
  | 'order'
  | 'batch'
  | 'batchType'
  | 'paymentDirection'
  | 'payment'
  | 'paymentChannel'
  | 'reconciliation'
  | 'reconciliationSource'
  | 'approval'
  | 'approvalAction'
  | 'severity'
  | 'alert'
  | 'complianceCase'
  | 'complianceDecision'
  | 'fee'
  | 'ticket'
  | 'ticketPriority'
  | 'notification'
  | 'notificationChannel'
  | 'partnerAgreement'
  | 'integrationTier'
  | 'partnerType'
  | 'assetClass'
  | 'ledgerKind'
  | 'actorType'
  | 'authorType'
  | 'account'
  | 'boolean'
  | 'country';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface Entry {
  label: string;
  tone: Tone;
}

type Table = Record<string, Entry>;

const e = (label: string, tone: Tone = 'neutral'): Entry => ({ label, tone });

const TABLES: Record<LabelKind, Table> = {
  role: {
    USER: e('Client'),
    SUPPORT: e('Support', 'info'),
    COMPLIANCE: e('Conformité', 'info'),
    ADMIN: e('Administrateur', 'info'),
  },
  kyc: {
    NOT_STARTED: e('Non commencé'),
    DRAFT: e('Brouillon'),
    SUBMITTED: e('Soumis', 'warning'),
    AUTO_APPROVED: e('Approuvé automatiquement', 'success'),
    MANUAL_REVIEW: e('Revue manuelle', 'warning'),
    VALIDATED: e('Validé', 'success'),
    REJECTED: e('Rejeté', 'danger'),
    RE_KYC: e('Renouvellement KYC', 'info'),
  },
  brokerAccount: {
    REQUESTED: e('Demandé', 'warning'),
    OPEN: e('Ouvert', 'success'),
    SUSPENDED: e('Suspendu', 'danger'),
    CLOSED: e('Clos'),
  },
  market: {
    SIMULATED_ONLY: e('Simulation uniquement'),
    PARTNER_IN_PROGRESS: e('Partenaire en cours', 'info'),
    LIVE: e('En production', 'success'),
  },
  liveTrading: {
    LIVE: e('Réel', 'success'),
    SIMULATED: e('Simulé'),
    SIMULATED_ONLY: e('Simulé'),
  },
  orderSide: {
    BUY: e('Achat', 'success'),
    SELL: e('Vente', 'danger'),
  },
  order: {
    PENDING: e('En attente', 'warning'),
    TRANSMITTED: e('Transmis', 'info'),
    ACKNOWLEDGED: e('Accusé réception', 'info'),
    PARTIALLY_EXECUTED: e('Partiellement exécuté', 'warning'),
    EXECUTED: e('Exécuté', 'success'),
    REJECTED: e('Rejeté', 'danger'),
    CANCELLED: e('Annulé'),
    EXPIRED: e('Expiré'),
    ADJUSTED: e('Ajusté', 'info'),
  },
  batch: {
    BUILT: e('Construit'),
    SENT: e('Envoyé', 'info'),
    ACKED: e('Accusé réception', 'warning'),
    PROCESSED: e('Traité', 'success'),
    FAILED: e('Échoué', 'danger'),
  },
  batchType: {
    ORD: e('Ordres', 'info'),
    WDR: e('Retraits', 'info'),
  },
  paymentDirection: {
    IN: e('Dépôt', 'success'),
    OUT: e('Retrait', 'info'),
  },
  payment: {
    CREATED: e('Créé'),
    PENDING: e('En attente', 'warning'),
    PAID: e('Payé', 'success'),
    FAILED: e('Échoué', 'danger'),
    EXPIRED: e('Expiré'),
    CANCELLED: e('Annulé'),
  },
  paymentChannel: {
    MTN_MOMO: e('MTN Mobile Money'),
    MTN_MOBILE_MONEY: e('MTN Mobile Money'),
    ORANGE_MONEY: e('Orange Money'),
    AIRTEL_MONEY: e('Airtel Money'),
    MOOV_MONEY: e('Moov Money'),
    WAVE: e('Wave'),
    BANK_TRANSFER: e('Virement bancaire'),
    CARD: e('Carte bancaire'),
    AGGREGATOR: e('Agrégateur'),
    CINETPAY: e('CinetPay'),
    FLUTTERWAVE: e('Flutterwave'),
    MANUAL: e('Saisie manuelle'),
  },
  reconciliation: {
    OPEN: e('Ouvert', 'warning'),
    INVESTIGATING: e('En investigation', 'info'),
    RESOLVED: e('Résolu', 'success'),
    WRITTEN_OFF: e('Passé en perte', 'danger'),
  },
  reconciliationSource: {
    CSH: e('Relevé espèces SDB'),
    SDB_CSH: e('Relevé espèces SDB'),
    MIRROR: e('Contrôle miroir'),
    PAYMENT_PROVIDER: e('Fournisseur de paiement'),
    MOMO: e('Mobile money'),
    BANK: e('Banque'),
    LEDGER: e('Grand livre'),
    MANUAL: e('Saisie manuelle'),
  },
  approval: {
    PENDING: e('En attente', 'warning'),
    APPROVED: e('Approuvée', 'success'),
    REJECTED: e('Rejetée', 'danger'),
    EXECUTED: e('Exécutée', 'success'),
    FAILED: e('Échouée', 'danger'),
  },
  approvalAction: {
    USER_BLOCK: e('Blocage de compte'),
    USER_UNBLOCK: e('Déblocage de compte'),
    KYC_DECISION: e('Décision KYC'),
    KYC_VALIDATE: e('Validation KYC'),
    KYC_REJECT: e('Rejet KYC'),
    ORDER_REVIEW: e('Revue d’ordre'),
    MARKET_LIVE_TRADING: e('Passage en réel d’un marché'),
    MARKET_LIVE_TOGGLE: e('Passage en réel d’un marché'),
    FEE_CHANGE: e('Modification tarifaire'),
    CONFIG_CHANGE: e('Modification de configuration'),
    PAYMENT_FORCE_COMPLETE: e('Complétion forcée de paiement'),
    RECONCILIATION_WRITE_OFF: e('Passation en perte'),
    COMPLIANCE_DECISION: e('Décision de conformité'),
    BROKER_ACCOUNT_UPDATE: e('Mise à jour compte-titres'),
    PARTNER_UPDATE: e('Mise à jour partenaire'),
  },
  severity: {
    LOW: e('Faible'),
    MEDIUM: e('Moyenne', 'warning'),
    HIGH: e('Élevée', 'danger'),
    CRITICAL: e('Critique', 'danger'),
  },
  alert: {
    OPEN: e('Ouverte', 'warning'),
    ATTACHED: e('Rattachée', 'info'),
    DISMISSED: e('Écartée'),
  },
  complianceCase: {
    OPEN: e('Ouvert', 'warning'),
    UNDER_REVIEW: e('En revue', 'info'),
    ESCALATED: e('Escaladé', 'danger'),
    CLEARED: e('Classé sans suite', 'success'),
    REPORTED: e('Déclaré', 'info'),
    CLOSED: e('Clos'),
  },
  complianceDecision: {
    CLEARED: e('Classé sans suite', 'success'),
    ESCALATED: e('Escaladé', 'danger'),
    REPORTED: e('Déclaré au régulateur', 'info'),
    CLOSED: e('Clôturé'),
  },
  fee: {
    COURTAGE_SDB: e('Courtage SDB'),
    COMMISSION_ALKE: e('Commission AlKÉ'),
    FX_SPREAD: e('Marge de change'),
    TAXE: e('Taxe'),
    WITHDRAWAL: e('Frais de retrait'),
  },
  ticket: {
    OPEN: e('Ouvert', 'warning'),
    IN_PROGRESS: e('En cours', 'info'),
    RESOLVED: e('Résolu', 'success'),
    CLOSED: e('Clos'),
  },
  ticketPriority: {
    LOW: e('Basse'),
    NORMAL: e('Normale'),
    MEDIUM: e('Normale'),
    HIGH: e('Haute', 'warning'),
    URGENT: e('Urgente', 'danger'),
  },
  notification: {
    QUEUED: e('En file', 'warning'),
    SENT: e('Envoyée', 'success'),
    FAILED: e('Échouée', 'danger'),
  },
  notificationChannel: {
    SMS: e('SMS'),
    EMAIL: e('E-mail'),
    PUSH: e('Notification push'),
    WHATSAPP: e('WhatsApp'),
  },
  partnerAgreement: {
    PROSPECT: e('Prospect'),
    CONTACTED: e('Contacté', 'warning'),
    MEETING_SCHEDULED: e('Rendez-vous planifié', 'warning'),
    IN_DISCUSSION: e('En discussion', 'warning'),
    TERM_SHEET: e('Term sheet', 'info'),
    SIGNED: e('Signé', 'info'),
    ACTIVE: e('Actif', 'success'),
    DECLINED: e('Écarté', 'danger'),
  },
  integrationTier: {
    TIER0_SIMULATED: e('Palier 0 — simulation'),
    TIER1_FILE: e('Palier 1 — échange de fichiers'),
    TIER2_BACKOFFICE_LINK: e('Palier 2 — lien back-office'),
    TIER3_API: e('Palier 3 — API'),
  },
  partnerType: {
    SDB: e('Société de bourse (SDB)'),
    SGI: e('Société de gestion (SGI)'),
    BROKER: e('Courtier'),
  },
  assetClass: {
    STOCK: e('Action'),
    BOND: e('Obligation'),
  },
  ledgerKind: {
    CASH: e('Espèces'),
    AVAILABLE: e('Disponible'),
    RESERVED: e('Réservé'),
    PENDING: e('En attente'),
    SECURITIES: e('Titres'),
    FEES: e('Frais'),
    CLIENT_CASH: e('Espèces clientèle'),
  },
  actorType: {
    USER: e('Utilisateur'),
    ADMIN: e('Opérateur'),
    STAFF: e('Opérateur'),
    SYSTEM: e('Système'),
    SERVICE: e('Service'),
  },
  authorType: {
    USER: e('Client'),
    AGENT: e('Support'),
  },
  account: {
    ACTIVE: e('Actif', 'success'),
    BLOCKED: e('Bloqué', 'danger'),
  },
  boolean: {
    true: e('Oui', 'success'),
    false: e('Non'),
    ON: e('Oui', 'success'),
    OFF: e('Non'),
    OK: e('RAS', 'success'),
    HIT: e('Correspondance', 'danger'),
  },
  country: {
    CM: e('Cameroun'),
    GA: e('Gabon'),
    CG: e('Congo'),
    TD: e('Tchad'),
    CF: e('République centrafricaine'),
    GQ: e('Guinée équatoriale'),
    CI: e('Côte d’Ivoire'),
    SN: e('Sénégal'),
    BJ: e('Bénin'),
    BF: e('Burkina Faso'),
    ML: e('Mali'),
    NE: e('Niger'),
    TG: e('Togo'),
    GW: e('Guinée-Bissau'),
    GN: e('Guinée'),
    CD: e('RD Congo'),
    NG: e('Nigéria'),
    GH: e('Ghana'),
    FR: e('France'),
    BE: e('Belgique'),
    CH: e('Suisse'),
    CA: e('Canada'),
    US: e('États-Unis'),
    GB: e('Royaume-Uni'),
    CMR: e('Cameroun'),
    GAB: e('Gabon'),
    COG: e('Congo'),
    TCD: e('Tchad'),
    CAF: e('République centrafricaine'),
    GNQ: e('Guinée équatoriale'),
    CIV: e('Côte d’Ivoire'),
    SEN: e('Sénégal'),
    BEN: e('Bénin'),
    BFA: e('Burkina Faso'),
    MLI: e('Mali'),
    NER: e('Niger'),
    TGO: e('Togo'),
    GNB: e('Guinée-Bissau'),
    GIN: e('Guinée'),
    COD: e('RD Congo'),
    NGA: e('Nigéria'),
    GHA: e('Ghana'),
    FRA: e('France'),
    BEL: e('Belgique'),
    CHE: e('Suisse'),
    CAN: e('Canada'),
    USA: e('États-Unis'),
    GBR: e('Royaume-Uni'),
  },
};

/** Repli lisible pour une clé inconnue : « PARTNER_IN_PROGRESS » → « Partner in progress ». */
export function titleCase(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '—';
}

export function label(kind: LabelKind, value: string | boolean | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const key = String(value);
  const hit = TABLES[kind][key]?.label;
  if (hit) return hit;
  // Codes pays / devise inconnus : on garde le code tel quel plutôt qu'un faux mot.
  if (kind === 'country' && /^[A-Za-z]{2,3}$/.test(key)) return key.toUpperCase();
  return titleCase(key);
}

export function tone(kind: LabelKind | undefined, value: string | boolean | null | undefined): Tone {
  if (value === null || value === undefined) return 'neutral';
  const key = String(value);
  if (kind) return TABLES[kind][key]?.tone ?? 'neutral';
  // Sans kind : première table qui connaît la clé.
  for (const table of Object.values(TABLES)) {
    const hit = table[key];
    if (hit) return hit.tone;
  }
  return 'neutral';
}

/** Options `{ value, label }` pour un <select>, dans l'ordre fourni. */
export function options(kind: LabelKind, values: readonly string[]): { value: string; label: string }[] {
  return values.map((v) => ({ value: v, label: label(kind, v) }));
}

/** Toutes les clés connues d'une énumération (utile pour les filtres). */
export function knownValues(kind: LabelKind): string[] {
  return Object.keys(TABLES[kind]);
}
