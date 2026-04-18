import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, Check, Clock, DollarSign, TrendingUp, Users } from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import { APP_ROUTES } from '../utils/appRoutes';
import { formatCurrency } from '../utils/formatters';

export default function DashboardView() {
  const navigate = useNavigate();
  const { bookings, db, inventory, leads, metrics, payments, t } = useBusinessContext();

  const today = new Date().toISOString().split('T')[0];

  const todayBookings = useMemo(
    () => bookings.filter((booking) => booking.date === today),
    [bookings, today],
  );

  const monthlyRevenueData = useMemo(() => (
    payments
      .filter((payment) => payment.status === 'paid' && payment.type === 'income')
      .reduce((accumulator, payment) => {
        const date = payment.date ? new Date(`${payment.date}T00:00:00`) : new Date(payment.createdAt);
        const month = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
        accumulator[month] = (accumulator[month] || 0) + Number(payment.value || 0);
        return accumulator;
      }, {})
  ), [payments]);

  const chartLabels = Object.keys(monthlyRevenueData).slice(-6);
  const maxRevenue = Math.max(...Object.values(monthlyRevenueData), 1000);
  const lowStockItems = inventory.filter((item) => item.quantity <= item.minQuantity);
  const convertedLeads = leads.filter((lead) => ['completed', 'converted'].includes(lead.status)).length;

  const topProfessionals = useMemo(() => (
    db.professionals.all().map((professional) => {
      const professionalBookings = bookings.filter((booking) => booking.professionalId === professional.id);
      const professionalRevenue = db.payments.all()
        .filter((payment) => payment.professionalId === professional.id && payment.type === 'income')
        .reduce((sum, payment) => sum + Number(payment.value || 0), 0);

      return {
        ...professional,
        bookingsCount: professionalBookings.length,
        revenue: professionalRevenue,
        commissionValue: professionalRevenue * ((Number(professional.commission) || 60) / 100),
      };
    }).sort((a, b) => b.revenue - a.revenue)
  ), [bookings, db]);

  const summaryCards = [
    {
      key: 'revenue',
      label: t('total_revenue'),
      value: formatCurrency(metrics.totalRevenue),
      helper: t('gross_revenue'),
      icon: DollarSign,
      className: 'revenue',
      path: APP_ROUTES.financeBilling,
    },
    {
      key: 'expenses',
      label: t('total_expenses'),
      value: formatCurrency(metrics.totalExpenses),
      helper: t('operational_outflows'),
      icon: TrendingUp,
      className: 'expenses',
      path: APP_ROUTES.financeExpenses,
    },
    {
      key: 'profit',
      label: t('business_profit'),
      value: formatCurrency(metrics.studioProfit),
      helper: t('net_result'),
      icon: BarChart3,
      className: 'profit',
      path: APP_ROUTES.financeProfit,
    },
    {
      key: 'leads',
      label: t('total_leads'),
      value: String(leads.length),
      helper: `${convertedLeads} convertidos`,
      icon: Users,
      className: 'revenue',
      path: APP_ROUTES.leads,
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="date-display">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="metrics-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              className={`metric-card ${card.className}`}
              onClick={() => navigate(card.path)}
              style={{ cursor: 'pointer', textAlign: 'left' }}
            >
              <div className="metric-icon"><Icon /></div>
              <div className="metric-content">
                <div className="metric-label">{card.label}</div>
                <div className="metric-value">{card.value}</div>
                <div className="metric-subtitle">{card.helper}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="revenue-chart-container">
        <div className="chart-header">
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{t('revenue_performance')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: 4 }}>
              Evolucao mensal do faturamento recebido
            </p>
          </div>
          <div className="metric-value" style={{ fontSize: '1.4rem' }}>
            {formatCurrency(Object.values(monthlyRevenueData).reduce((total, value) => total + value, 0))}
            <small style={{ display: 'block', fontSize: '0.72rem', color: 'var(--success-color)', textAlign: 'right' }}>
              {t('total_period')}
            </small>
          </div>
        </div>

        <div className="chart-bars">
          {chartLabels.map((label) => {
            const value = monthlyRevenueData[label] || 0;
            const height = (value / maxRevenue) * 100;

            return (
              <div key={label} className="chart-bar-wrapper">
                <div className="chart-bar" style={{ height: `${Math.max(height, 6)}%` }}>
                  <div className="chart-bar-value">{formatCurrency(value)}</div>
                </div>
                <div className="chart-label">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className="alert-section">
          <div className="alert-card warning" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <AlertTriangle size={20} />
            <div style={{ flex: 1 }}>
              <strong>{t('stock_alerts')}</strong>
              <p>{lowStockItems.length} {lowStockItems.length === 1 ? t('item_below_min') : t('items_below_min')}</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(APP_ROUTES.inventory)}>
              {t('view_stock')}
            </button>
          </div>
        </div>
      )}

      <div className="section-grid">
        <div className="section-card">
          <div className="section-header">
            <h2><Clock size={20} /> {t('todays_schedule')}</h2>
            <button type="button" className="btn-text" onClick={() => navigate(APP_ROUTES.schedule)}>
              {t('view_all')}
            </button>
          </div>

          <div className="appointments-list">
            {todayBookings.length === 0 ? (
              <div className="empty-state">{t('no_booking_today')}</div>
            ) : (
              todayBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="appointment-item"
                  style={{
                    padding: 16,
                    background: 'color-mix(in srgb, var(--card) 94%, transparent)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="appointment-time">{booking.time}</div>
                  <div className="appointment-details">
                    <div className="appointment-client">{booking.clientName}</div>
                    <div className="appointment-project">{booking.project || t('service')}</div>
                    <div className="appointment-meta">
                      <span>{booking.professionalName || t('professional')}</span>
                      <span>{booking.duration}h</span>
                      <span>{formatCurrency(booking.totalValue)}</span>
                    </div>
                  </div>
                  <div className={`appointment-status ${booking.status}`}>
                    {booking.status === 'completed' ? <Check size={14} /> : null}
                    <span>{t(booking.status)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2><BarChart3 size={20} /> {t('financial_summary')}</h2>
            <button type="button" className="btn-text" onClick={() => navigate(APP_ROUTES.finance)}>
              {t('details')}
            </button>
          </div>

          <div className="financial-summary">
            <button type="button" className="financial-item" onClick={() => navigate(APP_ROUTES.financeBilling)}>
              <div className="financial-label">{t('gross_revenue_global')}</div>
              <div className="financial-value positive">{formatCurrency(metrics.totalRevenue)}</div>
              <small>Total movimentado</small>
            </button>
            <div className="financial-item">
              <div className="financial-label">{t('retained_commissions')}</div>
              <div className="financial-value" style={{ color: 'var(--warning)' }}>{formatCurrency(metrics.totalCommissions)}</div>
              <small>{t('professionals_share')}</small>
            </div>
            <button type="button" className="financial-item" onClick={() => navigate(APP_ROUTES.financeExpenses)}>
              <div className="financial-label">Despesas operacionais</div>
              <div className="financial-value negative">{formatCurrency(metrics.totalExpenses)}</div>
              <small>Custos fixos e variaveis</small>
            </button>
            <button type="button" className="financial-item" onClick={() => navigate(APP_ROUTES.financeProfit)}>
              <div className="financial-label">{t('business_profit')}</div>
              <div className="financial-value total">{formatCurrency(metrics.studioProfit)}</div>
              <small>Resultado liquido real</small>
            </button>
          </div>
        </div>
      </div>

      <div className="section-card" style={{ marginTop: 'var(--page-gap)' }}>
        <div className="section-header">
          <h2><TrendingUp size={20} /> Desempenho dos profissionais</h2>
          <button type="button" className="btn-text" onClick={() => navigate(APP_ROUTES.professionals)}>
            Ver equipe
          </button>
        </div>

        <div className="artists-performance">
          {topProfessionals.map((professional) => (
            <div
              key={professional.id}
              className="artist-performance-item"
              style={{
                padding: 16,
                background: 'color-mix(in srgb, var(--card) 94%, transparent)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="artist-info">
                <div className="artist-avatar">{professional.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div>
                  <div className="artist-name">{professional.name}</div>
                  <div className="artist-specialty">{professional.specialty || 'Profissional'}</div>
                </div>
              </div>

              <div className="artist-stats">
                <div className="stat">
                  <div className="stat-value">{professional.bookingsCount}</div>
                  <div className="stat-label">Atendimentos</div>
                </div>
                <div className="stat">
                  <div className="stat-value" style={{ color: 'var(--success-color)' }}>{formatCurrency(professional.revenue)}</div>
                  <div className="stat-label">Faturado</div>
                </div>
                <div className="stat">
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>{formatCurrency(professional.commissionValue)}</div>
                  <div className="stat-label">Comissao</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
