import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, CheckCircle, ChevronLeft, Clock, Download, FileText, Search, TrendingUp } from 'lucide-react';

import { useBusinessContext } from '../../context/BusinessContext';
import { APP_ROUTES } from '../../utils/appRoutes';
import { buildFinancialReportHtml, exportCsv, openPrintWindow } from '../../utils/export';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

export default function BillingDetailView() {
  const navigate = useNavigate();
  const { business, payments, professionals, showToast, t } = useBusinessContext();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const filterInputStyle = {
    padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    color: 'var(--text-primary)',
  };

  const filteredData = useMemo(() => payments.filter((payment) => {
    if (payment.type !== 'income') return false;

    const paymentDate = new Date(`${payment.date}T00:00:00`);
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    if (start && paymentDate < start) return false;
    if (end && paymentDate > end) return false;

    const search = searchTerm.toLowerCase();
    return payment.description.toLowerCase().includes(search) || (payment.category || '').toLowerCase().includes(search);
  }), [payments, startDate, endDate, searchTerm]);

  const stats = useMemo(() => {
    const gross = filteredData.reduce((sum, payment) => sum + Number(payment.value || 0), 0);
    const received = filteredData.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + Number(payment.value || 0), 0);
    const pending = filteredData.filter((payment) => payment.status !== 'paid').reduce((sum, payment) => sum + Number(payment.value || 0), 0);
    return { gross, received, pending };
  }, [filteredData]);

  const handleExportCsv = () => {
    exportCsv({
      headers: ['Data', 'Descricao', 'Categoria', 'Valor', 'Status', 'Profissional'],
      rows: filteredData.map((payment) => [
        formatShortDate(payment.date),
        payment.description,
        payment.category || t('service'),
        Number(payment.value || 0).toFixed(2).replace('.', ','),
        payment.status === 'paid' ? 'Recebido' : 'Pendente',
        payment.professionalId ? professionals.find((item) => item.id === payment.professionalId)?.name || '' : '',
      ]),
      fileName: `faturamento_${new Date().toISOString().split('T')[0]}.csv`,
    });
    showToast('Arquivo CSV exportado com sucesso.');
  };

  const handleExportPdf = () => {
    openPrintWindow({
      title: 'Relatorio de faturamento',
      html: buildFinancialReportHtml({
        title: 'Relatorio de faturamento',
        subtitle: 'Analise detalhada de entradas e pagamentos.',
        businessName: business?.name,
        periodLabel: startDate || endDate ? `${startDate || 'inicio'} ate ${endDate || 'hoje'}` : 'Periodo completo',
        summary: [
          { label: 'Faturamento bruto', value: formatCurrency(stats.gross) },
          { label: 'Recebido', value: formatCurrency(stats.received) },
          { label: 'Pendente', value: formatCurrency(stats.pending) },
        ],
        rows: filteredData.map((payment) => ({
          ...payment,
          professional: payment.professionalId ? professionals.find((item) => item.id === payment.professionalId)?.name : '',
          status: payment.status === 'paid' ? 'Recebido' : 'Pendente',
        })),
      }),
    });
  };

  return (
    <div className="page-section">
      <header className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" className="btn-icon" onClick={() => navigate(APP_ROUTES.finance)}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0 }}>Relatorio de faturamento</h1>
            <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>Entradas, recebimentos e valores pendentes.</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleExportCsv}><Download size={18} /> Exportar CSV</button>
          <button type="button" className="btn-primary" onClick={handleExportPdf}><FileText size={18} /> Exportar PDF</button>
        </div>
      </header>

      <div className="metrics-grid">
        <div className="metric-card revenue"><div className="metric-icon"><TrendingUp size={20} /></div><div className="metric-content"><div className="metric-label">Faturamento bruto</div><div className="metric-value">{formatCurrency(stats.gross)}</div><div className="metric-trend">Total gerado no periodo</div></div></div>
        <div className="metric-card"><div className="metric-icon"><CheckCircle size={20} /></div><div className="metric-content"><div className="metric-label">Valor recebido</div><div className="metric-value">{formatCurrency(stats.received)}</div><div className="metric-trend">Pagamentos ja compensados</div></div></div>
        <div className="metric-card"><div className="metric-icon"><Clock size={20} /></div><div className="metric-content"><div className="metric-label">Valor pendente</div><div className="metric-value">{formatCurrency(stats.pending)}</div><div className="metric-trend">Pagamentos ainda em aberto</div></div></div>
      </div>

      <div className="filters-bar" style={{ marginTop: 24 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por descricao ou categoria" style={{ ...filterInputStyle, width: '100%', paddingLeft: 40 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} color="var(--text-secondary)" />
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={filterInputStyle} />
          <span style={{ color: 'var(--text-secondary)' }}>ate</span>
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} style={filterInputStyle} />
        </div>
      </div>

      <div className="table-responsive" style={{ marginTop: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descricao</th>
              <th>Categoria</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="5"><div className="empty-state"><AlertCircle size={22} /> Nenhum registro encontrado.</div></td></tr>
            ) : (
              filteredData.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatShortDate(payment.date)}</td>
                  <td>{payment.description}</td>
                  <td>{payment.category || t('service')}</td>
                  <td>{payment.status === 'paid' ? 'Recebido' : 'Pendente'}</td>
                  <td>{formatCurrency(payment.value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
