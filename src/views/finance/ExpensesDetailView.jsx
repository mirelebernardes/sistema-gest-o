import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, ChevronLeft, Download, FileText, Search, ShoppingCart } from 'lucide-react';

import { useBusinessContext } from '../../context/BusinessContext';
import { APP_ROUTES } from '../../utils/appRoutes';
import { buildFinancialReportHtml, exportCsv, openPrintWindow } from '../../utils/export';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

export default function ExpensesDetailView() {
  const navigate = useNavigate();
  const { business, payments, showToast, t } = useBusinessContext();
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
    if (payment.type !== 'expense') return false;

    const paymentDate = new Date(`${payment.date}T00:00:00`);
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    if (start && paymentDate < start) return false;
    if (end && paymentDate > end) return false;

    const search = searchTerm.toLowerCase();
    return payment.description.toLowerCase().includes(search) || (payment.category || '').toLowerCase().includes(search);
  }), [payments, searchTerm, startDate, endDate]);

  const totalExpenses = filteredData.reduce((sum, payment) => sum + Number(payment.value || 0), 0);

  const handleExportCsv = () => {
    exportCsv({
      headers: ['Data', 'Descricao', 'Categoria', 'Valor'],
      rows: filteredData.map((payment) => [
        formatShortDate(payment.date),
        payment.description,
        payment.category || t('inventory'),
        Number(payment.value || 0).toFixed(2).replace('.', ','),
      ]),
      fileName: `despesas_${new Date().toISOString().split('T')[0]}.csv`,
    });
    showToast('Arquivo CSV exportado com sucesso.');
  };

  const handleExportPdf = () => {
    openPrintWindow({
      title: 'Controle de despesas',
      html: buildFinancialReportHtml({
        title: 'Controle de despesas',
        subtitle: 'Custos e saidas operacionais do periodo.',
        businessName: business?.name,
        periodLabel: startDate || endDate ? `${startDate || 'inicio'} ate ${endDate || 'hoje'}` : 'Periodo completo',
        summary: [
          { label: 'Total de despesas', value: formatCurrency(totalExpenses) },
          { label: 'Lancamentos', value: String(filteredData.length) },
          { label: 'Categoria principal', value: filteredData[0]?.category || 'Sem categoria' },
        ],
        rows: filteredData.map((payment) => ({
          ...payment,
          status: 'Despesa',
          professional: '',
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
            <h1 style={{ margin: 0 }}>Controle de despesas</h1>
            <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>Custos fixos, variaveis e compras do negocio.</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleExportCsv}><Download size={18} /> Exportar CSV</button>
          <button type="button" className="btn-primary" onClick={handleExportPdf}><FileText size={18} /> Exportar PDF</button>
        </div>
      </header>

      <div className="metric-card expenses" style={{ marginBottom: 24 }}>
        <div className="metric-icon"><ShoppingCart size={20} /></div>
        <div className="metric-content">
          <div className="metric-label">Total de despesas no periodo</div>
          <div className="metric-value">{formatCurrency(totalExpenses)}</div>
          <div className="metric-trend">{filteredData.length} lancamentos encontrados</div>
        </div>
      </div>

      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar despesa" style={{ ...filterInputStyle, width: '100%', paddingLeft: 40 }} />
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
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="4"><div className="empty-state"><AlertCircle size={22} /> Nenhuma despesa encontrada.</div></td></tr>
            ) : (
              filteredData.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatShortDate(payment.date)}</td>
                  <td>{payment.description}</td>
                  <td>{payment.category || t('inventory')}</td>
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
