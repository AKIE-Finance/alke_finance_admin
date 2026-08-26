import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV_ITEMS = [
  { to: '/', label: 'Vue d’ensemble', end: true },
  { to: '/users', label: 'Utilisateurs & KYC' },
  { to: '/catalog', label: 'Catalogue' },
  { to: '/partners', label: 'Partenaires (SDB/SGI)' },
  { to: '/orders', label: 'Ordres' },
  { to: '/wallet', label: 'Dépôts & retraits' },
  { to: '/fees', label: 'Frais' },
  { to: '/support', label: 'Support' },
  { to: '/audit-log', label: 'Journal d’audit' },
];

export default function Layout() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="empty-state">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="dot" />
          AlKÉ Back-office
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
            {user.fullName}
            <br />
            <span style={{ opacity: 0.7 }}>{user.role}</span>
          </div>
          <button onClick={logout}>Se déconnecter</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
