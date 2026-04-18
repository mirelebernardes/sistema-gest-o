import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

import { useBusinessContext } from './context/BusinessContext';
import { APP_ROUTES, getActiveSection, getBreadcrumbLabel } from './utils/appRoutes';

import DashboardView from './views/DashboardView';
import ArtistDashboard from './views/ArtistDashboard';
import ReceptionDashboard from './views/ReceptionDashboard';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';
import LeadsView from './views/LeadsView';
import ClientsView from './views/ClientsView';
import ScheduleView from './views/ScheduleView';
import ArtistsView from './views/ArtistsView';
import PortfolioView from './views/PortfolioView';
import FinanceView from './views/FinanceView';
import InventoryView from './views/InventoryView';
import SettingsView from './views/SettingsView';
import PublicPortfolio from './views/PublicPortfolio';
import DevPanelView from './views/DevPanelView';
import BillingDetailView from './views/finance/BillingDetailView';
import ExpensesDetailView from './views/finance/ExpensesDetailView';
import ProfitDetailView from './views/finance/ProfitDetailView';
import ResultDetailView from './views/finance/ResultDetailView';
import ReportsView from './views/finance/ReportsView';
import TransactionsView from './views/finance/TransactionsView';
import PublicLeadForm from './components/PublicLeadForm';
import PaymentCheckout from './components/PaymentCheckout';
import ThemeSelector from './components/ThemeSelector';

const {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Calendar,
  Check,
  DollarSign,
  Image,
  LogOut,
  Menu,
  Package,
  Phone,
  Settings,
  TrendingUp,
  Users,
  X,
} = LucideIcons;

function getBusinessIcon(niche) {
  if (niche === 'tattoo') return 'T';
  if (niche === 'beauty') return 'B';
  if (niche === 'barber') return 'BR';
  return 'N';
}

function normalizeModuleName(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizePathname(pathname = '') {
  if (!pathname) return '/';
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function isPrivateAppRoute(pathname = '') {
  const normalizedPathname = normalizePathname(pathname);

  if (
    !normalizedPathname
    || normalizedPathname === '/'
    || normalizedPathname.startsWith('/login')
    || normalizedPathname.startsWith('/register')
  ) {
    return false;
  }

  const allowedPrefixes = [
    APP_ROUTES.dashboard,
    APP_ROUTES.leads,
    APP_ROUTES.clients,
    APP_ROUTES.schedule,
    APP_ROUTES.professionals,
    '/tatuadores',
    APP_ROUTES.portfolio,
    APP_ROUTES.finance,
    APP_ROUTES.inventory,
    APP_ROUTES.settings,
    APP_ROUTES.captureInstagram,
    APP_ROUTES.captureWhatsApp,
    '/checkout/',
  ];

  return allowedPrefixes.some((prefix) => normalizedPathname.startsWith(prefix));
}

function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function DevPanelRoute({ enabled, isAuthenticated, userRole }) {
  if (!enabled || !isAuthenticated || userRole !== 'admin') {
    return <Navigate to={isAuthenticated ? APP_ROUTES.dashboard : '/login'} replace />;
  }
  return <DevPanelView />;
}

function CheckoutWrapper({ bills, showToast }) {
  const { id } = useParams();
  const bill = bills.find((item) => item.id === Number(id));

  return (
    <PaymentCheckout
      bill={bill}
      onConfirm={() => showToast('Pagamento confirmado com sucesso.', 'success')}
    />
  );
}

export default function App() {
  const {
    setActiveView,
    sidebarOpen,
    setSidebarOpen,
    userRole,
    uiNotifications,
    setUiNotifications,
    showNotifications,
    setShowNotifications,
    toast,
    showToast,
    inventory,
    isLoading,
    payments,
    isAuthenticated,
    logout,
    currentUser,
    business,
    businessNiche,
    enabledModules,
    t,
  } = useBusinessContext();

  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile && window.innerWidth > 1024) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarOpen]);

  useEffect(() => {
    const normalizedPath = normalizePathname(location.pathname);
    setActiveView(getActiveSection(normalizedPath));
    localStorage.setItem('last_route', normalizedPath);
  }, [location.pathname, setActiveView]);

  const unreadNotifications = uiNotifications.filter((item) => !item.read).length;
  const businessIcon = getBusinessIcon(businessNiche);
  const currentSection = getActiveSection(location.pathname);
  const breadcrumb = getBreadcrumbLabel(location.pathname, t, userRole);
  const lowStockCount = inventory.filter((item) => item.quantity < item.minQuantity).length;
  const bills = payments.filter((item) => item.status === 'pending');
  const enabledModuleSet = useMemo(
    () => new Set(enabledModules.map((item) => normalizeModuleName(item))),
    [enabledModules],
  );
  const lastVisitedRoute = useMemo(() => {
    const stored = normalizePathname(localStorage.getItem('last_route') || '');
    if (!isPrivateAppRoute(stored)) {
      return APP_ROUTES.dashboard;
    }
    return stored;
  }, []);
  const devPanelEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_PANEL === 'true';

  const hasModule = useCallback(
    (...moduleNames) => moduleNames.some((moduleName) => enabledModuleSet.has(normalizeModuleName(moduleName))),
    [enabledModuleSet],
  );

  const navigationItems = useMemo(() => {
    if (userRole === 'professional' || userRole === 'artist') {
      return [
        { key: 'dashboard', label: t('myDashboard'), path: APP_ROUTES.dashboard, icon: BarChart3, visible: true },
        { key: 'schedule', label: t('myAgenda'), path: APP_ROUTES.schedule, icon: Calendar, visible: true },
        { key: 'portfolio', label: t('portfolio'), path: APP_ROUTES.portfolio, icon: Image, visible: hasModule('portfolio', 'portfólio') },
      ];
    }

    return [
      { key: 'dashboard', label: t('home'), path: APP_ROUTES.dashboard, icon: BarChart3, visible: true },
      { key: 'leads', label: t('leads'), path: APP_ROUTES.leads, icon: TrendingUp, visible: hasModule('captacao', 'captação') },
      { key: 'clients', label: t('clients'), path: APP_ROUTES.clients, icon: Users, visible: hasModule('clientes') },
      { key: 'schedule', label: t('schedule'), path: APP_ROUTES.schedule, icon: Calendar, visible: hasModule('agenda') },
      { key: 'artists', label: t('professionals'), path: APP_ROUTES.professionals, icon: Activity, visible: hasModule('profissionais') },
      { key: 'portfolio', label: t('portfolio'), path: APP_ROUTES.portfolio, icon: Image, visible: hasModule('portfolio', 'portfólio') },
      { key: 'finance', label: t('finance'), path: APP_ROUTES.finance, icon: DollarSign, visible: userRole === 'admin' && hasModule('financeiro') },
      { key: 'inventory', label: t('inventory'), path: APP_ROUTES.inventory, icon: Package, visible: hasModule('estoque'), badge: lowStockCount },
      { key: 'settings', label: t('settings'), path: APP_ROUTES.settings, icon: Settings, visible: userRole === 'admin' },
    ].filter((item) => item.visible);
  }, [hasModule, lowStockCount, t, userRole]);

  const goTo = (path) => {
    navigate(path);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const renderNavItems = () =>
    navigationItems.map((item) => {
      const Icon = item.icon;
      const isActive = currentSection === item.key;

      return (
        <button
          key={item.key}
          type="button"
          className={`app-nav-item ${isActive ? 'active' : ''}`}
          onClick={() => goTo(item.path)}
          title={!sidebarOpen && !isMobile ? item.label : undefined}
        >
          <span className="app-nav-icon">
            <Icon size={20} />
          </span>
          <span className="app-nav-label">{item.label}</span>
          {!!item.badge && <span className="app-nav-badge">{item.badge}</span>}
        </button>
      );
    });

  if (isLoading && !isAuthenticated) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-icon">{businessIcon}</div>
        <div className="app-loading-title">{business?.name || t('managementSystem')}</div>
        <div className="app-loading-spinner" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated
              ? <Navigate to={lastVisitedRoute} replace />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="/p/:publicId" element={<PublicPortfolio />} />

        <Route path="/login" element={!isAuthenticated ? <LoginView /> : <Navigate to={APP_ROUTES.dashboard} replace />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterView /> : <Navigate to={APP_ROUTES.dashboard} replace />} />
        <Route path="/budget/:id" element={<PublicLeadForm origin="budget" />} />
        <Route path="/atendimento/:id" element={<PublicLeadForm origin="atendimento" />} />
        <Route
          path="/dev-panel"
          element={<DevPanelRoute enabled={devPanelEnabled} isAuthenticated={isAuthenticated} userRole={userRole} />}
        />

        <Route
          path="/*"
          element={(
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <div className={`app-shell ${sidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
                {isMobile && sidebarOpen && (
                  <button
                    type="button"
                    className="sidebar-backdrop-visible"
                    aria-label="Fechar menu"
                    onClick={() => setSidebarOpen(false)}
                  />
                )}

                <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : 'desktop'}`}>
                  <div className="app-sidebar-header">
                    <button type="button" className="app-brand" onClick={() => goTo(APP_ROUTES.dashboard)}>
                      <span className="app-brand-icon">{businessIcon}</span>
                      <span className="app-brand-copy">
                        <strong>{business?.name || t('system')}</strong>
                        <small>{currentUser?.name || t(userRole)}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="sidebar-toggle-btn"
                      onClick={() => setSidebarOpen((prev) => !prev)}
                      aria-label={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
                    >
                      {isMobile ? <X size={18} /> : <Menu size={18} />}
                    </button>
                  </div>

                  <nav className="app-sidebar-nav">{renderNavItems()}</nav>

                  <div className="app-sidebar-footer">
                    <div className="app-user-card">
                      <div className="app-user-avatar">
                        {(currentUser?.name || t(userRole))
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="app-user-copy">
                        <strong>{currentUser?.name || t(userRole)}</strong>
                        <small>{t(userRole)}</small>
                      </div>
                    </div>
                  </div>
                </aside>

                <main className="app-main">
                  <header className="app-topbar">
                    <div className="app-topbar-left">
                      <button
                        type="button"
                        className="btn-icon mobile-menu-btn"
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        aria-label="Abrir menu"
                      >
                        <Menu size={20} />
                      </button>
                      <div className="app-breadcrumb">{breadcrumb}</div>
                    </div>

                    <div className="app-topbar-actions">
                      <ThemeSelector compact />

                      <button
                        type="button"
                        className="btn-icon notification-btn"
                        onClick={() => setShowNotifications((prev) => !prev)}
                      >
                        <Bell size={20} />
                        {unreadNotifications > 0 && <span className="notification-badge">{unreadNotifications}</span>}
                      </button>

                      <button type="button" className="btn-icon" onClick={logout} title={t('logout')}>
                        <LogOut size={20} />
                      </button>

                      {showNotifications && (
                        <div className="notifications-dropdown">
                          <div className="notifications-header">
                            <h3>{t('notifications')}</h3>
                            <button
                              type="button"
                              className="btn-text btn-sm"
                              onClick={() => setUiNotifications((prev) => prev.map((item) => ({ ...item, read: true })))}
                            >
                              {t('markAllAsRead')}
                            </button>
                          </div>

                          <div className="notifications-list">
                            {uiNotifications.length === 0 ? (
                              <div className="empty-notifications">{t('noNotifications')}</div>
                            ) : (
                              uiNotifications.map((notification) => (
                                <div key={notification.id} className={`notification-item ${notification.read ? 'read' : ''}`}>
                                  <div className="notification-content">
                                    <div className="notification-title">{notification.title}</div>
                                    <div className="notification-message">{notification.message}</div>
                                    <div className="notification-time">
                                      {new Date(notification.timestamp).toLocaleTimeString('pt-BR')}
                                    </div>
                                    {notification.waUrl && (
                                      <a
                                        href={notification.waUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="wa-link-btn"
                                        onClick={() =>
                                          setUiNotifications((prev) =>
                                            prev.map((item) => (
                                              item.id === notification.id ? { ...item, read: true } : item
                                            )),
                                          )}
                                      >
                                        <Phone size={14} /> Enviar WhatsApp
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </header>

                  <section className="content-area">
                    <Routes>
                      <Route
                        path="dashboard"
                        element={userRole === 'admin' ? <DashboardView /> : userRole === 'artist' ? <ArtistDashboard /> : <ReceptionDashboard />}
                      />
                      <Route path="leads" element={<LeadsView />} />
                      <Route path="clientes" element={<ClientsView />} />
                      <Route path="agenda/*" element={<ScheduleView />} />
                      <Route path="profissionais" element={<ArtistsView />} />
                      <Route path="tatuadores" element={<Navigate to={APP_ROUTES.professionals} replace />} />
                      <Route path="portfolio" element={<PortfolioView />} />
                      <Route path="financeiro" element={<FinanceView />} />
                      <Route path="financeiro/faturamento" element={<BillingDetailView />} />
                      <Route path="financeiro/despesas" element={<ExpensesDetailView />} />
                      <Route path="financeiro/lucro" element={<ProfitDetailView />} />
                      <Route path="financeiro/resultado" element={<ResultDetailView />} />
                      <Route path="financeiro/relatorios" element={<ReportsView />} />
                      <Route path="financeiro/transacoes" element={<TransactionsView />} />
                      <Route path="estoque" element={<InventoryView />} />
                      <Route path="configuracoes" element={<SettingsView />} />
                      <Route path="captacao/instagram" element={<PublicLeadForm origin="instagram" />} />
                      <Route path="captacao/whatsapp" element={<PublicLeadForm origin="whatsapp" />} />
                      <Route path="checkout/:id" element={<CheckoutWrapper bills={bills} showToast={showToast} />} />
                      <Route path="*" element={<Navigate to={APP_ROUTES.dashboard} replace />} />
                    </Routes>
                  </section>
                </main>
              </div>
            </ProtectedRoute>
          )}
        />
      </Routes>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
