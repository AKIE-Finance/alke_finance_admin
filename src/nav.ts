import type { Action } from './auth';
import type { IconName } from './components/icons';

export interface NavItem {
  to: string;
  label: string;
  action: Action;
  end?: boolean;
  group: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Vue d’ensemble', action: 'stats.view', end: true, group: 'Pilotage', icon: 'overview' },
  { to: '/approvals', label: 'Approbations', action: 'approvals.view', group: 'Pilotage', icon: 'approvals' },
  { to: '/users', label: 'Utilisateurs', action: 'users.view', group: 'Clients', icon: 'users' },
  { to: '/kyc', label: 'File KYC', action: 'kyc.view', group: 'Clients', icon: 'kyc' },
  { to: '/broker-accounts', label: 'Comptes-titres', action: 'brokerAccounts.view', group: 'Clients', icon: 'brokerAccounts' },
  { to: '/orders', label: 'Ordres', action: 'orders.view', group: 'Marchés', icon: 'orders' },
  { to: '/batches', label: 'Lots SDB', action: 'batches.view', group: 'Marchés', icon: 'batches' },
  { to: '/catalog', label: 'Catalogue', action: 'catalog.view', group: 'Marchés', icon: 'catalog' },
  { to: '/partners', label: 'Partenaires', action: 'partners.view', group: 'Marchés', icon: 'partners' },
  { to: '/payments', label: 'Paiements', action: 'payments.view', group: 'Finance', icon: 'payments' },
  { to: '/reconciliation', label: 'Rapprochement', action: 'reconciliation.view', group: 'Finance', icon: 'reconciliation' },
  { to: '/fees', label: 'Frais', action: 'fees.view', group: 'Finance', icon: 'fees' },
  { to: '/compliance', label: 'Conformité', action: 'compliance.view', group: 'Contrôle', icon: 'compliance' },
  { to: '/audit-log', label: 'Journal d’audit', action: 'audit.view', group: 'Contrôle', icon: 'audit' },
  { to: '/config', label: 'Configuration', action: 'config.view', group: 'Contrôle', icon: 'config' },
  { to: '/support', label: 'Support', action: 'support.view', group: 'Opérations', icon: 'support' },
  { to: '/notifications', label: 'Notifications', action: 'notifications.view', group: 'Opérations', icon: 'notifications' },
];

/** Groupe de navigation d'une route (pour le fil d'Ariane). */
export function sectionOf(pathname: string): string | undefined {
  const item = NAV_ITEMS.find((i) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(`${i.to}/`)));
  return item?.group;
}
