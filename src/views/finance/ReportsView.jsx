import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronLeft, FileText, TrendingUp } from 'lucide-react';

import { useBusinessContext } from '../../context/BusinessContext';
import { APP_ROUTES } from '../../utils/appRoutes';
import { buildFinancialReportHtml, openPrintWindow } from '../../utils/export';
import { formatCurrency } from '../../utils/formatters';

export default function ReportsView() {
  const navigate = useNavigate();
  const { bookings, business, metrics, payments, professionals } = useBusinessContext();

  const professionalPerformance = useMemo(() => professionals.map((professional) => {
    const professionalBookings = bookings.filter((booking) => booking.professionalId === professional.id && booking.status === 'completed');
    const gross = professionalBookings.reduce((sum, booking) => sum + Number(booking.totalValue || 0), 0);
    return {
      name: professional.name,
      sessions: professionalBookings.length,
      gross,
      avg: professionalBookings.length ? gross / professionalBookings.length : 0,
      specialty: professional.specialty,
    };
  }).sort((a, b) => b.gross - a.gross), [bookings, professionals]);

  const monthlyTrends = useMemo(() => {
    const data = {};
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const label = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      data[label] = { income: 0, sessions: 0, label };
    }

    payments.filter((payment) => payment.type === 'income').forEach((payment) => {
      const label = new Date(`${payment.date}T00:00:00`).toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      if (data[label]) data[label].income += Number(payment.value || 0);
    });

    bookings.filter((booking) => booking.status === 'completed').forEach((booking) => {
      const label = new Date(`${booking.date}T00:00:00`).toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      if (data[label]) data[label].sessions += 1;
    });

    return Object.values(data);
  }, [bookings, payments]);

  const maxRevenue = Math.max(...monthlyTrends.map((item) => item.income), 1000);

  const handleExportPdf = () => {
    openPrintWindow({
      title: 'Relatorios financeiros',
      html: buildFinancialReportHtml({
        title: 'Relatorios financeiros',
        subtitle: 'Visao executiva de performance financeira e produtividade.',
        businessName: business?.name,
        periodLabel: 'Ultimos 6 meses',
        summary: [
          { label: 'Faturamento total', value: formatCurrency(metrics.totalRevenue) },
          { label: 'Ticket medio', value: formatCurrency(metrics.totalRevenue / (bookings.filter((booking) => booking.status === 'completed').length || 1)) },
          { label: 'Lucro do negocio', value: formatCurrency(metrics.studioProfit) },
        ],
        rows: professionalPerformance.map((item) => ({
          date: 'Periodo atual',
          description: item.name,
          category: item.specialty || 'Profissional',
          status: `${item.sessions} atendimentos`,
          professional: item.name,
          value: item.gross,
        })),
      }),
    });
  };

  return (
    <div className="reports-view-container">
      <header className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" className="btn-icon" onClick={() => navigate(APP_ROUTES.finance)}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0 }}>Relatorios financeiros</h1>
            <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>Analise de performance, produtividade e tendencia de faturamento.</p>
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={handleExportPdf}>
          <FileText size={18} /> Exportar PDF
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: 24, marginBottom: 24 }}>
        <div className="section-card">
          <div className="section-header">
            <h2><TrendingUp size={20} /> Evolucao do faturamento</h2>
          </div>
          <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            {monthlyTrends.map((item) => (
              <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: '100%', height: 240, background: 'color-mix(in srgb, var(--card) 94%, transparent)', borderRadius: 12, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: `${(item.income / maxRevenue) * 100}%`, background: 'linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)', borderRadius: '12px 12px 0 0' }} />
                </div>
                <strong>{item.label}</strong>
                <small style={{ color: 'var(--text-secondary)' }}>{item.sessions} atendimentos</small>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div className="section-card">
            <div className="section-header">
              <h2>Ticket medio</h2>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{formatCurrency(metrics.totalRevenue / (bookings.filter((booking) => booking.status === 'completed').length || 1))}</div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Valor medio por atendimento concluido.</p>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2><Activity size={20} /> Atendimentos concluidos</h2>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{bookings.filter((booking) => booking.status === 'completed').length}</div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Volume consolidado no historico.</p>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h2>Ranking de desempenho</h2>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Atendimentos concluidos</th>
                <th>Total gerado</th>
                <th>Ticket medio</th>
                <th>Participacao</th>
              </tr>
            </thead>
            <tbody>
              {professionalPerformance.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.sessions}</td>
                  <td>{formatCurrency(item.gross)}</td>
                  <td>{formatCurrency(item.avg)}</td>
                  <td>{Math.round((item.gross / (metrics.totalRevenue || 1)) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
