import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, onSessionExpired, tokenStore } from './api';
import type { Me, Role } from './api/types';
import { toast } from './toast';

// ---- Matrice des rôles (blueprint §4.9) ------------------------------------------

export type Action =
  | 'stats.view'
  | 'users.view'
  | 'users.block'
  | 'kyc.view'
  | 'kyc.decide'
  | 'brokerAccounts.view'
  | 'brokerAccounts.manage'
  | 'catalog.view'
  | 'catalog.manage'
  | 'partners.view'
  | 'partners.manage'
  | 'orders.view'
  | 'orders.review'
  | 'batches.view'
  | 'batches.manage'
  | 'payments.view'
  | 'payments.manage'
  | 'reconciliation.view'
  | 'reconciliation.edit'
  | 'approvals.view'
  | 'approvals.decide'
  | 'compliance.view'
  | 'compliance.manage'
  | 'fees.view'
  | 'fees.change'
  | 'config.view'
  | 'config.change'
  | 'support.view'
  | 'support.manage'
  | 'audit.view'
  | 'notifications.view';

export const BACK_OFFICE_ROLES: Role[] = ['ADMIN', 'COMPLIANCE', 'SUPPORT'];

const ROLE_MATRIX: Record<Exclude<Role, 'USER'>, ReadonlySet<Action> | 'all'> = {
  ADMIN: 'all',
  COMPLIANCE: new Set<Action>([
    'stats.view',
    'users.view',
    'kyc.view',
    'kyc.decide',
    'brokerAccounts.view',
    'orders.view',
    'orders.review',
    'batches.view',
    'payments.view',
    'reconciliation.view',
    'reconciliation.edit',
    'approvals.view',
    'approvals.decide',
    'compliance.view',
    'compliance.manage',
    'audit.view',
    'config.view',
  ]),
  SUPPORT: new Set<Action>(['users.view', 'support.view', 'support.manage', 'notifications.view']),
};

export function roleCan(role: Role | undefined, action: Action): boolean {
  if (!role || role === 'USER') return false;
  const perms = ROLE_MATRIX[role];
  return perms === 'all' || perms.has(action);
}

// ---- Contexte ------------------------------------------------------------------------

interface AuthContextValue {
  user: Me | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (action: Action) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadMe = useCallback(async () => {
    const me = await api.auth.me();
    if (!BACK_OFFICE_ROLES.includes(me.role)) {
      tokenStore.clear();
      setUser(null);
      throw new Error('Ce compte n’a pas accès au back-office.');
    }
    setUser(me);
  }, []);

  useEffect(() => {
    if (!tokenStore.hasSession()) {
      setLoading(false);
      return;
    }
    loadMe()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [loadMe]);

  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        toast.info('Session expirée, veuillez vous reconnecter.');
        navigate('/login', { replace: true });
      }),
    [navigate],
  );

  const login = useCallback(
    async (identifier: string, password: string) => {
      const tokens = await api.auth.login(identifier, password);
      tokenStore.set(tokens);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefreshToken();
    try {
      await api.auth.logout({ refreshToken });
    } catch {
      // la session locale est de toute façon supprimée
    } finally {
      tokenStore.clear();
      setUser(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const can = useCallback((action: Action) => roleCan(user?.role, action), [user]);

  const value = useMemo(() => ({ user, loading, login, logout, can }), [user, loading, login, logout, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé à l’intérieur de AuthProvider');
  return ctx;
}
