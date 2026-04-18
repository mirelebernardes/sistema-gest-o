import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  TrendingUp,
} from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import { APP_ROUTES } from '../utils/appRoutes';
import { downloadBlob, formatCurrency, formatShortDate } from '../utils/formatters';

function buildCsv(rows) {
  const header = ['Data', 'Descricao', 'Forma de pagamento', 'Valor total', 'Minha comissao', 'Status'];
  const lines = rows.map((row) => [
    formatShortDate(row.date),
    row.description || '-',
    (row.method || '-').toUpperCase(),
    Number(row.value || 0).toFixed(2),
    Number(row.professionalValue || 0).toFixed(2),
    row.status || 'paid',
  ]);

  return [header, ...lines]
    .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export default function ArtistDashboard() {
  const {
    payments,
    schedules,
    currentUser,
    getProfessionalPeriodMetrics,
  } = useBusinessContext();
  const navigate = useNavigate();

  const professionalId = currentUser?.professionalId || currentUser?.artistId;
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const stats = useMemo(
    () => getProfessionalPeriodMetrics(professionalId, dateRange.start, dateRange.end),
    [dateRange.end, dateRange.start, getProfessionalPeriodMetrics, professionalId],
  );

  const todayAgenda = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return schedules
      .filter((item) => item.date === today && item.professionalId === professionalId)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [professionalId, schedules]);

  const filteredPayments = useMemo(() => (
    payments
      .filter((payment) => {
        if (payment.professionalId !== professionalId || payment.type !== 'income') return false;
        if (dateRange.start && payment.date < dateRange.start) return false;
        if (dateRange.end && payment.date > dateRange.end) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  ), [dateRange.end, dateRange.start, payments, professionalId]);

  const exportedRows = useMemo(() => filteredPayments.map((payment) => ({
    ...payment,
    professionalValue:
      payment.professionalValue !== null && payment.professionalValue !== undefined
        ? payment.professionalValue
        : (Number(payment.value || 0) * Number(stats.commRate || 0)) / 100,
  })), [filteredPayments, stats.commRate]);

  const handleExport = () => {
    const csv = buildCsv(exportedRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'extrato-profissional.csv');
  };

  const summaryCards = [
    {
      label: 'Comissoes recebidas',
      value: formatCurrency(stats.confirmed),
      helper: 'Entradas confirmadas no periodo',
      icon: CheckCircle2,
      color: 'var(--success)',
    },
    {
      label: 'Previsao a receber',
      value: formatCurrency(stats.pending),
      helper: `${stats.sessions || 0} atendimentos no periodo`,
      icon: Clock3,
      color: 'var(--warning)',
    },
    {
      label: 'Total de agendamentos',
      value: String(stats.sessions || 0),
      helper: 'Atendimentos considerados no calculo',
      icon: Calendar,
      color: 'var(--primary)',
    },
    {
      label: 'Ticket medio bruto',
      value: formatCurrency(stats.avgValue),
      helper: `Comissao configurada: ${stats.commRate || 0}%`,
      icon: TrendingUp,
      color: 'var(--primary)',
    },
  ];

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header" style={{ marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="view-title">Ola, {currentUser?.name || 'profissional'}</h1>
          <p className="view-subtitle">Acompanhe comissoes, agenda do dia e extrato do seu periodo.</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="setting-item" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>De</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="setting-item" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Ate</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            />
          </div>
          <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}>
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div
              className="stat-icon"
              style={{
                backgroundColor: `color-mix(in srgb, ${card.color} 16%, transparent)`,
                color: card.color,
              }}
            >
              <card.icon size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">{card.label}</span>
              <span className="stat-value">{card.value}</span>
              <span className="stat-change">{card.helper}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Calendar size={20} className="text-primary" /> Agenda de hoje
            </h3>
            <button className="btn-text" onClick={() => navigate(APP_ROUTES.schedule)}>Ver agenda completa</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {todayAgenda.length > 0 ? todayAgenda.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center', minWidth: '64px', padding: '0.5rem', backgroundColor: 'var(--primary-soft)', borderRadius: '8px' }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>{item.time}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{item.title || item.project || 'Agendamento'}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.duration || 60} min</div>
                </div>
                <div className={`status-badge status-${item.status || 'confirmed'}`}>
                  {item.status === 'confirmed' ? 'Confirmado' : item.status || 'Confirmado'}
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <Calendar size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p>Nenhum agendamento para hoje.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <DollarSign size={20} className="text-success" /> Extrato do periodo
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Comissao atual: <strong>{stats.commRate || 0}%</strong>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descricao</th>
                  <th>Total</th>
                  <th>Minha parte</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {exportedRows.length > 0 ? exportedRows.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatShortDate(payment.date)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{payment.description || 'Servico realizado'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{(payment.method || '-').toUpperCase()}</div>
                    </td>
                    <td>{formatCurrency(payment.value)}</td>
                    <td className="text-success" style={{ fontWeight: 700 }}>{formatCurrency(payment.professionalValue)}</td>
                    <td><span className="status-badge status-paid">Recebido</span></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                      Nenhum registro encontrado no periodo selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
