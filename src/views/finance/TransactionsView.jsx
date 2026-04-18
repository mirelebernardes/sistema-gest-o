import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, Download, FileText, Search } from 'lucide-react';

import { useBusinessContext } from '../../context/BusinessContext';
import { APP_ROUTES } from '../../utils/appRoutes';
import { buildFinancialReportHtml, exportCsv, openPrintWindow } from '../../utils/export';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

export default function TransactionsView() {
  const navigate = useNavigate();
  const { bookings, business, payments, professionals, showToast } = useBusinessContext();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const filterInputStyle = {
    padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    color: 'var(--text-primary)',
  };

  const filteredTransactions = useMemo(() => payments.filter((payment) => {
    if (filterStatus !== 'all' && payment.status !== filterStatus) return false;

    const paymentDate = new Date(`${payment.date}T00:00:00`);
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;
    if (start && paymentDate < start) return false;
    if (end && paymentDate > end) return false;

    let clientName = '';
    if (payment.bookingId) {
      const booking = bookings.find((item) => item.id === payment.bookingId);
      clientName = booking?.clientName || '';
    }

    const search = searchTerm.toLowerCase();
    return payment.description.toLowerCase().includes(search)
      || clientName.toLowerCase().includes(search)
      || (payment.category || '').toLowerCase().includes(search);
  }), [bookings, endDate, filterStatus, payments, searchTerm, startDate]);

  const handleExportCsv = () => {
    exportCsv({
      headers: ['Data', 'Tipo', 'Categoria', 'Descricao', 'Valor', 'Status'],
      rows: filteredTransactions.map((payment) => [
        formatShortDate(payment.date),
        payment.type === 'income' ? 'Entrada' : 'Saida',
        payment.category || 'Geral',
        payment.description,
        Number(payment.value || 0).toFixed(2).replace('.', ','),
        payment.status === 'paid' ? 'Pago' : 'Pendente',
      ]),
      fileName: `transacoes_${new Date().toISOString().split('T')[0]}.csv`,
    });
    showToast('Arquivo CSV exportado com sucesso.');
  };

  const handleExportPdf = () => {
    openPrintWindow({
      title: 'Historico de transacoes',
      html: buildFinancialReportHtml({
        title: 'Historico de transacoes',
        subtitle: 'Entradas e saidas filtradas para conferencia financeira.',
        businessName: business?.name,
        periodLabel: startDate || endDate ? `${startDate || 'inicio'} ate ${endDate || 'hoje'}` : 'Periodo completo',
        summary: [
          { label: 'Lancamentos', value: String(filteredTransactions.length) },
          { label: 'Entradas', value: formatCurrency(filteredTransactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.value || 0), 0)) },
          { label: 'Saidas', value: formatCurrency(filteredTransactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.value || 0), 0)) },
        ],
        rows: filteredTransactions.map((payment) => ({
          ...payment,
          professional: payment.professionalId ? professionals.find((item) => item.id === payment.professionalId)?.name : '',
          status: payment.status === 'paid' ? 'Pago' : 'Pendente',
        })),
      }),
    });
  };

  return (
    <div className="transactions-view-container">
      <header className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" className="btn-icon" onClick={() => navigate(APP_ROUTES.finance)}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0 }}>Historico de transacoes</h1>
            <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>Listagem completa de entradas e saidas do negocio.</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handleExportCsv}><Download size={18} /> Exportar CSV</button>
          <button type="button" className="btn-primary" onClick={handleExportPdf}><FileText size={18} /> Exportar PDF</button>
        </div>
      </header>

      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por descricao, categoria ou cliente" style={{ ...filterInputStyle, width: '100%', paddingLeft: 40 }} />
        </div>
        <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} style={filterInputStyle}>
          <option value="all">Todos os status</option>
          <option value="paid">Pagos</option>
          <option value="pending">Pendentes</option>
        </select>
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
              <th>Tipo</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr><td colSpan="6">Nenhuma transacao encontrada para os filtros aplicados.</td></tr>
            ) : (
              filteredTransactions.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatShortDate(payment.date)}</td>
                  <td>{payment.description}</td>
                  <td>{payment.category || 'Geral'}</td>
                  <td>{payment.type === 'income' ? 'Entrada' : 'Saida'}</td>
                  <td>{payment.status === 'paid' ? 'Pago' : 'Pendente'}</td>
                  <td>{payment.type === 'income' ? '+' : '-'} {formatCurrency(payment.value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
