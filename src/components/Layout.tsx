import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { label } from '../labels';
import Button, { IconButton } from './Button';
import Icon from './icons';
import { environmentInfo } from '../env';
import { NAV_ITEMS } from '../nav';

const COLLAPSE_KEY = 'alke_admin_sidebar_collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function Layout() {
  const { user, loading, logout, can } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      // stockage indisponible : l'état reste en mémoire
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="app-loading" role="status" aria-label="Chargement de la session">
        <div className="skeleton skeleton-block" />
        <div className="skeleton skeleton-block" />
        <div className="skeleton skeleton-block" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  const visible = NAV_ITEMS.filter((i) => can(i.action));
  const groups = Array.from(new Set(visible.map((i) => i.group)));
  const env = environmentInfo();
  const current = NAV_ITEMS.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to) && i.to !== '/'));

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'nav-open' : ''}`.replace(/\s+/g, ' ').trim()}>
      <a href="#main" className="skip-link">
        Aller au contenu
      </a>

      <header className="topbar">
        <IconButton icon={mobileOpen ? 'close' : 'menu'} label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setMobileOpen((v) => !v)} aria-expanded={mobileOpen} aria-controls="sidebar" />
        <span className="topbar-title">{current?.label ?? 'AlKÉ Back-office'}</span>
        <span className={`env-pill env-${env.tone}`} title={env.host}>
          {env.name}
        </span>
      </header>

      {mobileOpen && <div className="nav-backdrop" onMouseDown={() => setMobileOpen(false)} />}

      <aside className="sidebar" id="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span className="brand-text">
            <span className="brand-name">AlKÉ Back-office</span>
            <span className="brand-env" title={`API : ${env.host}`}>
              <span className={`env-pill env-${env.tone}`}>{env.name}</span>
              <span className="brand-host">{env.host}</span>
            </span>
          </span>
        </div>

        <nav aria-label="Navigation principale">
          {groups.map((g) => (
            <div key={g} className="nav-group">
              <div className="nav-group-title">
                <span>{g}</span>
              </div>
              {visible
                .filter((i) => i.group === g)
                .map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.end} title={item.label} onClick={() => setMobileOpen(false)}>
                    <Icon name={item.icon} />
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" title={`${user.fullName} · ${label('role', user.role)}`}>
            <span className="avatar" aria-hidden="true">
              {user.fullName
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p.charAt(0).toUpperCase())
                .join('')}
            </span>
            <span className="sidebar-user-text">
              <span className="sidebar-user-name">{user.fullName}</span>
              <span className="sidebar-user-role">{label('role', user.role)}</span>
            </span>
          </div>
          <div className="sidebar-footer-actions">
            <Button variant="ghost" icon="logout" onClick={() => void logout()} className="sidebar-logout" title="Se déconnecter">
              <span className="nav-label">Se déconnecter</span>
            </Button>
            <IconButton
              icon={collapsed ? 'chevronRight' : 'chevronLeft'}
              label={collapsed ? 'Déployer la navigation' : 'Réduire la navigation'}
              onClick={() => setCollapsed((v) => !v)}
              className="sidebar-toggle"
              aria-pressed={collapsed}
            />
          </div>
        </div>
      </aside>

      <main className="content" id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
