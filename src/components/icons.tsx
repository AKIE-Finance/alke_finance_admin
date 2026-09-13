import type { SVGProps } from 'react';

// Jeu d'icônes maison : tracé 1.75, coins arrondis, grille 24 rendue en 16 px.
// Décoratives par défaut (aria-hidden) ; le libellé est porté par le texte voisin ou aria-label.

export type IconName =
  | 'overview'
  | 'approvals'
  | 'users'
  | 'kyc'
  | 'brokerAccounts'
  | 'orders'
  | 'batches'
  | 'catalog'
  | 'partners'
  | 'payments'
  | 'reconciliation'
  | 'fees'
  | 'compliance'
  | 'audit'
  | 'config'
  | 'support'
  | 'notifications'
  | 'menu'
  | 'close'
  | 'refresh'
  | 'copy'
  | 'check'
  | 'chevronLeft'
  | 'chevronRight'
  | 'logout'
  | 'external'
  | 'documents'
  | 'files'
  | 'money'
  | 'shield'
  | 'bell'
  | 'search'
  | 'inbox';

const PATHS: Record<IconName, string> = {
  overview: 'M4 4h6v7H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 15h6v5H4z',
  approvals: 'M9 11l2.5 2.5L16 9M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z',
  users: 'M16 19v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 17.5V19M10 10.5a3.25 3.25 0 100-6.5 3.25 3.25 0 000 6.5zM20 19v-1.3a3 3 0 00-2.3-2.9M15 4.2a3.25 3.25 0 010 6.3',
  kyc: 'M3 6.5A1.5 1.5 0 014.5 5h15A1.5 1.5 0 0121 6.5v11a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5zM8.5 12.2a2 2 0 100-4 2 2 0 000 4zM5.5 16c.4-1.6 1.6-2.4 3-2.4s2.6.8 3 2.4M14 9.5h4M14 12.5h4M14 15.5h3',
  brokerAccounts: 'M4 8.5A1.5 1.5 0 015.5 7h13A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5zM9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7M4 12h16',
  orders: 'M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3',
  batches: 'M12 3l8 4.2v9.6L12 21l-8-4.2V7.2zM12 3v18M4 7.2l8 4.2 8-4.2',
  catalog: 'M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5zM5 19.5V4.5M19 18v3H6.5A1.5 1.5 0 015 19.5M9 7.5h6',
  partners: 'M3 20h18M5 20V9l7-5 7 5v11M9 20v-5h6v5M9 11h.01M15 11h.01',
  payments: 'M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 9.5h.01M17.5 14.5h.01',
  reconciliation: 'M12 3v18M6 21h12M4 7l8-1 8 1M4 7l-2.5 6a2.5 2.5 0 005 0zM20 7l-2.5 6a2.5 2.5 0 005 0z',
  fees: 'M19 5L5 19M7.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  compliance: 'M12 3l7 3v5.5c0 4.3-2.9 7.6-7 9.5-4.1-1.9-7-5.2-7-9.5V6zM9 12l2 2 4-4',
  audit: 'M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4M9 12h6M9 16h6',
  config: 'M4 7h9M17 7h3M4 17h3M11 17h9M13 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM7 14.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  support: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9',
  notifications: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20a2 2 0 004 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  refresh: 'M20 12a8 8 0 01-14.5 4.6M4 12a8 8 0 0114.5-4.6M18.5 3v4.5H14M5.5 21v-4.5H10',
  copy: 'M9 9.5A1.5 1.5 0 0110.5 8h8A1.5 1.5 0 0120 9.5v8a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 019 17.5zM6 15H5.5A1.5 1.5 0 014 13.5v-8A1.5 1.5 0 015.5 4h8A1.5 1.5 0 0115 5.5V6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevronLeft: 'M14.5 6l-6 6 6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
  logout: 'M10 4H5.5A1.5 1.5 0 004 5.5v13A1.5 1.5 0 005.5 20H10M15 8l4 4-4 4M19 12H9',
  external: 'M14 4h6v6M20 4l-8 8M18 14v4.5A1.5 1.5 0 0116.5 20h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10',
  documents: 'M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v4h4M9 12h6M9 16h4',
  files: 'M4 7.5A1.5 1.5 0 015.5 6H10l2 2h6.5A1.5 1.5 0 0120 9.5v8a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z',
  money: 'M3 7.5A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6.5 9.5h.01M17.5 14.5h.01',
  shield: 'M12 3l7 3v5.5c0 4.3-2.9 7.6-7 9.5-4.1-1.9-7-5.2-7-9.5V6zM9 12l2 2 4-4',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15zM10 20a2 2 0 004 0',
  search: 'M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM20 20l-4.8-4.8',
  inbox: 'M4 13l2.4-7.2A1 1 0 017.4 5h9.2a1 1 0 01.95.7L20 13v5a1 1 0 01-1 1H5a1 1 0 01-1-1zM4 13h4.5l1 2h5l1-2H20',
};

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Libellé accessible ; sans lui l'icône est purement décorative. */
  title?: string;
}

export default function Icon({ name, size = 16, title, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
