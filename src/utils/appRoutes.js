export const APP_ROUTES = {
  dashboard: '/dashboard',
  leads: '/leads',
  clients: '/clientes',
  schedule: '/agenda',
  professionals: '/profissionais',
  portfolio: '/portfolio',
  finance: '/financeiro',
  financeBilling: '/financeiro/faturamento',
  financeExpenses: '/financeiro/despesas',
  financeProfit: '/financeiro/lucro',
  financeResult: '/financeiro/resultado',
  financeReports: '/financeiro/relatorios',
  financeTransactions: '/financeiro/transacoes',
  inventory: '/estoque',
  settings: '/configuracoes',
  captureInstagram: '/captacao/instagram',
  captureWhatsApp: '/captacao/whatsapp',
};

const SECTION_MATCHERS = [
  { prefix: '/financeiro/faturamento', section: 'finance' },
  { prefix: '/financeiro/despesas', section: 'finance' },
  { prefix: '/financeiro/lucro', section: 'finance' },
  { prefix: '/financeiro/resultado', section: 'finance' },
  { prefix: '/financeiro/relatorios', section: 'finance' },
  { prefix: '/financeiro/transacoes', section: 'finance' },
  { prefix: '/financeiro', section: 'finance' },
  { prefix: '/clientes', section: 'clients' },
  { prefix: '/agenda', section: 'schedule' },
  { prefix: '/profissionais', section: 'artists' },
  { prefix: '/tatuadores', section: 'artists' },
  { prefix: '/portfolio', section: 'portfolio' },
  { prefix: '/estoque', section: 'inventory' },
  { prefix: '/configuracoes', section: 'settings' },
  { prefix: '/leads', section: 'leads' },
  { prefix: '/captacao', section: 'leads' },
  { prefix: '/dashboard', section: 'dashboard' },
];

export function getActiveSection(pathname) {
  const match = SECTION_MATCHERS.find((item) => pathname.startsWith(item.prefix));
  return match?.section || 'dashboard';
}

export function getBreadcrumbLabel(pathname, t, userRole) {
  if (pathname.startsWith('/financeiro/faturamento')) return 'Relatório de faturamento';
  if (pathname.startsWith('/financeiro/despesas')) return 'Controle de despesas';
  if (pathname.startsWith('/financeiro/lucro')) return 'Lucro do negócio';
  if (pathname.startsWith('/financeiro/resultado')) return 'Resultado financeiro';
  if (pathname.startsWith('/financeiro/relatorios')) return 'Relatórios financeiros';
  if (pathname.startsWith('/financeiro/transacoes')) return 'Transações';
  if (pathname.startsWith('/financeiro')) return t('finance');
  if (pathname.startsWith('/clientes')) return t('clientManagement');
  if (pathname.startsWith('/agenda')) return t('schedule');
  if (pathname.startsWith('/profissionais') || pathname.startsWith('/tatuadores')) return t('professionals');
  if (pathname.startsWith('/portfolio')) return t('portfolio');
  if (pathname.startsWith('/estoque')) return t('inventory');
  if (pathname.startsWith('/configuracoes')) return t('settings');
  if (pathname.startsWith('/leads') || pathname.startsWith('/captacao')) return t('leadsManagement');
  if (pathname.startsWith('/dashboard')) return userRole === 'admin' ? t('summary') : t('dashboard');
  return t('dashboard');
}
