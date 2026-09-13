import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth, type Action } from './auth';
import EmptyState from './components/EmptyState';
import Layout from './components/Layout';
import { NAV_ITEMS } from './nav';
import PageHeader from './components/PageHeader';
import RequirePermission from './components/RequirePermission';
import ToastHost from './components/Toast';
import ApprovalsPage from './pages/ApprovalsPage';
import AuditLogPage from './pages/AuditLogPage';
import BatchesPage from './pages/BatchesPage';
import BrokerAccountsPage from './pages/BrokerAccountsPage';
import CatalogPage from './pages/CatalogPage';
import CompliancePage from './pages/CompliancePage';
import ConfigPage from './pages/ConfigPage';
import FeesPage from './pages/FeesPage';
import KycQueuePage from './pages/KycQueuePage';
import LoginPage from './pages/LoginPage';
import NotificationsPage from './pages/NotificationsPage';
import OrdersPage from './pages/OrdersPage';
import OverviewPage from './pages/OverviewPage';
import PartnersPage from './pages/PartnersPage';
import PaymentsPage from './pages/PaymentsPage';
import ReconciliationPage from './pages/ReconciliationPage';
import SupportPage from './pages/SupportPage';
import UserDetailPage from './pages/UserDetailPage';
import UsersPage from './pages/UsersPage';

/** Page d'accueil : vue d'ensemble si autorisée, sinon première section accessible au rôle. */
function Home() {
  const { can } = useAuth();
  if (can('stats.view')) return <OverviewPage />;
  const first = NAV_ITEMS.find((i) => i.to !== '/' && can(i.action));
  if (first) return <Navigate to={first.to} replace />;
  return (
    <RequirePermission action="stats.view">
      <OverviewPage />
    </RequirePermission>
  );
}

function NotFound() {
  return (
    <div>
      <PageHeader title="Page introuvable" breadcrumb={[{ label: 'AlKÉ Back-office' }, { label: 'Page introuvable' }]} />
      <div className="card">
        <EmptyState
          kind="search"
          title="Cette adresse ne correspond à aucune section du back-office"
          hint="Vérifiez le lien ou utilisez la navigation de gauche."
          action={
            <Link to="/" className="btn btn-primary">
              Retour à l’accueil
            </Link>
          }
        />
      </div>
    </div>
  );
}

const guard = (action: Action, page: ReactNode) => <RequirePermission action={action}>{page}</RequirePermission>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/approvals" element={guard('approvals.view', <ApprovalsPage />)} />
            <Route path="/users" element={guard('users.view', <UsersPage />)} />
            <Route path="/users/:id" element={guard('users.view', <UserDetailPage />)} />
            <Route path="/kyc" element={guard('kyc.view', <KycQueuePage />)} />
            <Route path="/broker-accounts" element={guard('brokerAccounts.view', <BrokerAccountsPage />)} />
            <Route path="/orders" element={guard('orders.view', <OrdersPage />)} />
            <Route path="/batches" element={guard('batches.view', <BatchesPage />)} />
            <Route path="/catalog" element={guard('catalog.view', <CatalogPage />)} />
            <Route path="/partners" element={guard('partners.view', <PartnersPage />)} />
            <Route path="/payments" element={guard('payments.view', <PaymentsPage />)} />
            <Route path="/reconciliation" element={guard('reconciliation.view', <ReconciliationPage />)} />
            <Route path="/fees" element={guard('fees.view', <FeesPage />)} />
            <Route path="/compliance" element={guard('compliance.view', <CompliancePage />)} />
            <Route path="/audit-log" element={guard('audit.view', <AuditLogPage />)} />
            <Route path="/config" element={guard('config.view', <ConfigPage />)} />
            <Route path="/support" element={guard('support.view', <SupportPage />)} />
            <Route path="/notifications" element={guard('notifications.view', <NotificationsPage />)} />
            <Route path="/wallet" element={<Navigate to="/payments" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        <ToastHost />
      </AuthProvider>
    </BrowserRouter>
  );
}
