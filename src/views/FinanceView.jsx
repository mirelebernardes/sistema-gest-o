import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BarChart3, CreditCard, DollarSign, Download, FileText, Plus, Printer, Send, Trash2, TrendingUp, X } from 'lucide-react';

import PaginationControls from '../components/PaginationControls';
import { useBusinessContext } from '../context/BusinessContext';
import { APP_ROUTES } from '../utils/appRoutes';
import { buildFinancialReportHtml, exportCsv, openPrintWindow } from '../utils/export';
import { formatCurrency, formatShortDate } from '../utils/formatters';

function normalizeCategory(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const PAYMENTS_PAGE_SIZE = 20;

export default function FinanceView() {
  const navigate = useNavigate();
  const {
    addPayment,
    business,
    bookings,
    deletePayment,
    generatePaymentLink,
    metrics,
    payments,
    professionals,
    showToast,
    t,
  } = useBusinessContext();

  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('month');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedProfessionalId, setExpandedProfessionalId] = useState(null);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [newTransaction, setNewTransaction] = useState({
    type: 'income',
    description: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    professionalId: '',
    category: t('service'),
  });

  const incomeCategories = [t('service'), t('sale'), t('workshop'), t('others')];
  const expenseCategories = [t('materials'), t('rent'), t('utilities'), t('maintenance'), t('marketing'), t('others')];

  const displayPayments = useMemo(() => {
    const now = new Date();

    return payments.filter((payment) => {
      const paymentDate = new Date(`${payment.date}T00:00:00`);
      if (periodFilter === 'month') {
        return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
      }
      if (periodFilter === '90days') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        return paymentDate >= ninetyDaysAgo;
      }
      return true;
    });
  }, [payments, periodFilter]);

  const safePaymentsPage = Math.min(
    paymentsPage,
    Math.max(1, Math.ceil(displayPayments.length / PAYMENTS_PAGE_SIZE)),
  );

  const paginatedPayments = useMemo(
    () => displayPayments.slice((safePaymentsPage - 1) * PAYMENTS_PAGE_SIZE, safePaymentsPage * PAYMENTS_PAGE_SIZE),
    [displayPayments, safePaymentsPage],
  );

  const periodIncomes = displayPayments
    .filter((payment) => payment.type === 'income')
    .reduce((sum, payment) => sum + Number(payment.value || 0), 0);

  const periodExpenses = displayPayments
    .filter((payment) => payment.type === 'expense')
    .reduce((sum, payment) => sum + Number(payment.value || 0), 0);

  const periodProfessionalCommissions = displayPayments
    .filter((payment) => payment.type === 'income' && payment.professionalId)
    .reduce((sum, payment) => {
      if (payment.professionalValue !== null && payment.professionalValue !== undefined) {
        return sum + Number(payment.professionalValue || 0);
      }
      const professional = professionals.find((item) => item.id === payment.professionalId);
      if (!professional || normalizeCategory(payment.category) === 'sinal' || normalizeCategory(payment.category) === normalizeCategory(t('deposit'))) return sum;
      return sum + (Number(payment.value || 0) * (Number(professional.commission || 60) / 100));
    }, 0);

  const periodProfit = periodIncomes - periodExpenses - periodProfessionalCommissions;
  const totalRevenue = payments.filter((payment) => payment.type === 'income' && payment.status === 'paid')
    .reduce((sum, payment) => sum + Number(payment.value || 0), 0);
  const totalExpenses = payments.filter((payment) => payment.type === 'expense' && payment.status === 'paid')
    .reduce((sum, payment) => sum + Number(payment.value || 0), 0);

  const handleAddTransaction = async (event) => {
    event.preventDefault();
    if (!newTransaction.description || !newTransaction.value) {
      showToast('Preencha descricao e valor da transacao.', 'error');
      return;
    }

    try {
      await addPayment({
        type: newTransaction.type,
        description: newTransaction.description,
        value: parseFloat(newTransaction.value),
        date: newTransaction.date,
        category: newTransaction.category,
        professionalId: newTransaction.professionalId ? Number(newTransaction.professionalId) : null,
      });

      setShowAddTransaction(false);
      setNewTransaction({
        type: 'income',
        description: '',
        value: '',
        date: new Date().toISOString().split('T')[0],
        professionalId: '',
        category: t('service'),
      });
    } catch {
      showToast('Nao foi possivel registrar a transacao.', 'error');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 5000);
      return;
    }

    try {
      await deletePayment(id);
      setConfirmDeleteId(null);
    } catch {
      showToast('Nao foi possivel remover a transacao.', 'error');
    }
  };

  const handleExportCsv = () => {
    exportCsv({
      headers: ['Data', 'Tipo', 'Categoria', 'Descricao', 'Valor', 'Profissional'],
      rows: displayPayments.map((payment) => [
        formatShortDate(payment.date),
        payment.type === 'income' ? 'Entrada' : 'Saida',
        payment.category || 'Geral',
        payment.description,
        Number(payment.value || 0).toFixed(2).replace('.', ','),
        payment.professionalId ? professionals.find((item) => item.id === payment.professionalId)?.name || '' : '',
      ]),
      fileName: `financeiro_${periodFilter}_${new Date().toISOString().split('T')[0]}.csv`,
    });
    showToast('Arquivo CSV exportado com sucesso.');
  };

  const handleExportPdf = () => {
    const periodLabel =
      periodFilter === 'month' ? 'Este mes' : periodFilter === '90days' ? 'Ultimos 90 dias' : 'Historico completo';

    openPrintWindow({
      title: 'Relatorio financeiro',
      html: buildFinancialReportHtml({
        title: 'Relatorio financeiro',
        subtitle: 'Consolidado de entradas, saidas e resultado do periodo.',
        businessName: business?.name,
        periodLabel,
        summary: [
          { label: 'Entradas', value: formatCurrency(periodIncomes) },
          { label: 'Saidas', value: formatCurrency(periodExpenses) },
          { label: 'Resultado', value: formatCurrency(periodProfit), helper: `Comissoes: ${formatCurrency(periodProfessionalCommissions)}` },
        ],
        rows: displayPayments.map((payment) => ({
          ...payment,
          professional: payment.professionalId ? professionals.find((item) => item.id === payment.professionalId)?.name : '',
          status: payment.status === 'paid' ? 'Pago' : 'Pendente',
        })),
      }),
    });
  };

  const summaryCards = [
    {
      label: t('total_revenue'),
      value: formatCurrency(totalRevenue),
      helper: 'Entradas recebidas',
      className: 'revenue',
      icon: TrendingUp,
      path: APP_ROUTES.financeBilling,
    },
    {
      label: t('total_expenses'),
      value: formatCurrency(totalExpenses),
      helper: 'Saidas operacionais pagas',
      className: 'expenses',
      icon: DollarSign,
      path: APP_ROUTES.financeExpenses,
    },
    {
      label: t('business_profit'),
      value: formatCurrency(metrics.studioProfit),
      helper: 'Resultado liquido consolidado',
      className: 'profit',
      icon: BarChart3,
      path: APP_ROUTES.financeProfit,
    },
  ];

  return (
    <div className="finance-container">
      <div className="view-header">
        <h1><DollarSign size={28} /> {t('financial_dashboard')}</h1>
        <div className="header-actions" style={{ position: 'relative' }}>
          <div className="export-dropdown-container" style={{ position: 'relative' }}>
            <button type="button" className="btn-secondary" onClick={() => setShowExportDropdown((prev) => !prev)}>
              <Download size={18} /> {t('export')}
            </button>

            {showExportDropdown && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 180, padding: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, zIndex: 40 }}>
                <button type="button" className="btn-text" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { handleExportCsv(); setShowExportDropdown(false); }}>
                  <FileText size={16} /> {t('export_csv')}
                </button>
                <button type="button" className="btn-text" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => { handleExportPdf(); setShowExportDropdown(false); }}>
                  <Printer size={16} /> {t('export_pdf')}
                </button>
              </div>
            )}
          </div>

          <button type="button" className="btn-primary" onClick={() => setShowAddTransaction(true)}>
            <Plus size={18} /> {t('new_transaction')}
          </button>
        </div>
      </div>

      {showAddTransaction && (
        <div className="modal-overlay" onClick={() => setShowAddTransaction(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('register_new_transaction')}</h2>
              <button type="button" className="btn-icon" onClick={() => setShowAddTransaction(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddTransaction} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('type')}</label>
                  <select value={newTransaction.type} onChange={(event) => setNewTransaction((prev) => ({ ...prev, type: event.target.value, category: event.target.value === 'income' ? t('service') : t('materials') }))}>
                    <option value="income">{t('income')}</option>
                    <option value="expense">{t('expense')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('value')}</label>
                  <input type="number" step="0.01" value={newTransaction.value} onChange={(event) => setNewTransaction((prev) => ({ ...prev, value: event.target.value }))} />
                </div>

                <div className="form-group full-width">
                  <label>{t('description')}</label>
                  <input type="text" value={newTransaction.description} onChange={(event) => setNewTransaction((prev) => ({ ...prev, description: event.target.value }))} placeholder={t('description_placeholder')} />
                </div>

                <div className="form-group">
                  <label>{t('date')}</label>
                  <input type="date" value={newTransaction.date} onChange={(event) => setNewTransaction((prev) => ({ ...prev, date: event.target.value }))} />
                </div>

                <div className="form-group">
                  <label>{t('category')}</label>
                  <select value={newTransaction.category} onChange={(event) => setNewTransaction((prev) => ({ ...prev, category: event.target.value }))}>
                    {(newTransaction.type === 'income' ? incomeCategories : expenseCategories).map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('professional')} ({t('optional')})</label>
                  <select value={newTransaction.professionalId} onChange={(event) => setNewTransaction((prev) => ({ ...prev, professionalId: event.target.value }))}>
                    <option value="">{t('none')}</option>
                    {professionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>{professional.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddTransaction(false)}>{t('cancel')}</button>
                <button type="submit" className="btn-primary">{t('save_transaction')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="metrics-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} type="button" className={`metric-card ${card.className}`} onClick={() => navigate(card.path)} style={{ cursor: 'pointer', textAlign: 'left' }}>
              <div className="metric-icon"><Icon size={22} /></div>
              <div className="metric-content">
                <div className="metric-label">{card.label}</div>
                <div className="metric-value">{card.value}</div>
                <div className="metric-trend">{card.helper}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="finance-overview" style={{ marginTop: 20, marginBottom: 20 }}>
        <button type="button" className="finance-card profit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: 24, borderRadius: 20, textAlign: 'left', cursor: 'pointer' }} onClick={() => navigate(APP_ROUTES.financeResult)}>
          <div className="finance-icon"><Activity size={22} /></div>
          <div className="finance-content">
            <div className="finance-label">{t('period_result')}</div>
            <div className="finance-value">{formatCurrency(periodProfit)}</div>
            <div className="finance-margin">Comissoes do periodo: {formatCurrency(periodProfessionalCommissions)}</div>
          </div>
        </button>
      </div>

      <button type="button" className="finance-visual-breakdown" onClick={() => navigate(APP_ROUTES.financeReports)} style={{ padding: 24, width: '100%', cursor: 'pointer', textAlign: 'left' }}>
        <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>{t('visual_summary')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div className="donut-chart" style={{ position: 'relative', width: 128, height: 128 }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15.9" fill="transparent" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="transparent"
                stroke="var(--success)"
                strokeWidth="3"
                strokeDasharray={`${(periodIncomes / (periodIncomes + periodExpenses || 1)) * 100} 100`}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('margin')}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{Math.round((periodProfit / (periodIncomes || 1)) * 100)}%</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 240, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Entradas</span><strong>{formatCurrency(periodIncomes)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Saidas</span><strong>{formatCurrency(periodExpenses)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Comissoes</span><strong>{formatCurrency(periodProfessionalCommissions)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
              <span>{t('result')}</span>
              <strong style={{ color: periodProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>{formatCurrency(periodProfit)}</strong>
            </div>
          </div>
        </div>
      </button>

      <div className="transactions-section" style={{ marginTop: 24, padding: 24 }}>
        <div className="section-header">
          <h2>{t('period_transactions')}</h2>
          <div className="transaction-filters">
            {[
              { id: 'month', label: t('this_month') },
              { id: '90days', label: '90 dias' },
              { id: 'all', label: 'Historico' },
            ].map((filter) => (
              <button key={filter.id} type="button" className={`filter-btn ${periodFilter === filter.id ? 'active' : ''}`} onClick={() => setPeriodFilter(filter.id)}>
                {filter.label}
              </button>
            ))}
            <button type="button" className="btn-text" onClick={() => navigate(APP_ROUTES.financeTransactions)}>Ver pagina completa</button>
          </div>
        </div>

        <div className="transactions-list">
          {displayPayments.length === 0 ? (
            <div className="empty-state">{t('no_transactions_found')}</div>
          ) : (
            paginatedPayments.map((payment) => (
              <div key={payment.id} className={`transaction-item ${payment.type}`}>
                <div className="transaction-icon">
                  {payment.type === 'income' ? <TrendingUp size={18} /> : <DollarSign size={18} />}
                </div>

                <div className="transaction-details">
                  <div className="transaction-description">
                    {payment.description}
                    <span className="category-tag" style={{ marginLeft: 12, fontSize: 11, background: 'color-mix(in srgb, var(--accent) 72%, var(--card))', padding: '2px 8px', borderRadius: 999 }}>
                      {payment.category || 'Geral'}
                    </span>
                  </div>
                  <div className="transaction-professional" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {payment.professionalId ? professionals.find((item) => item.id === payment.professionalId)?.name : 'Sem profissional vinculado'}
                    {(payment.businessValue !== null || payment.professionalValue !== null) && (
                      <span style={{ fontSize: 10, color: 'var(--info)', background: 'var(--info-soft)', padding: '2px 8px', borderRadius: 999 }}>
                        Negocio {formatCurrency(payment.businessValue)} | Profissional {formatCurrency(payment.professionalValue)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="transaction-date">{formatShortDate(payment.date)}</div>

                <div className={`transaction-value ${payment.type}`} style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <span>{payment.type === 'income' ? '+' : '-'} {formatCurrency(payment.value)}</span>

                  {payment.type === 'income' && payment.status !== 'paid' && (
                    <>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          const pref = await generatePaymentLink(payment.id);
                          if (pref?.init_point) window.open(pref.init_point, '_blank', 'noopener,noreferrer');
                        }}
                        title="Gerar link"
                      >
                        <CreditCard size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={async () => {
                          const pref = await generatePaymentLink(payment.id);
                          if (pref?.init_point && payment.booking?.client?.phone) {
                            const waUrl = `https://wa.me/${payment.booking.client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Segue o link para pagamento: ${pref.init_point}`)}`;
                            window.open(waUrl, '_blank', 'noopener,noreferrer');
                          } else {
                            showToast('Nao foi possivel enviar o link por WhatsApp.', 'error');
                          }
                        }}
                        title="Enviar por WhatsApp"
                      >
                        <Send size={14} />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    className={`btn-icon ${confirmDeleteId === payment.id ? 'btn-danger' : ''}`}
                    onClick={() => handleDeleteTransaction(payment.id)}
                    style={{ background: confirmDeleteId === payment.id ? 'var(--danger)' : 'transparent', color: confirmDeleteId === payment.id ? 'var(--primary-foreground)' : undefined }}
                    title={confirmDeleteId === payment.id ? 'Confirmar exclusao' : 'Excluir'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <PaginationControls
          page={safePaymentsPage}
          pageSize={PAYMENTS_PAGE_SIZE}
          totalItems={displayPayments.length}
          onPageChange={setPaymentsPage}
          label="transações"
        />
      </div>

      <div className="commission-section" style={{ marginTop: 32 }}>
        <div className="section-header">
          <h2>Desempenho por profissional</h2>
          <div className="period-badge" style={{ fontSize: 12, background: 'color-mix(in srgb, var(--accent) 72%, var(--card))', padding: '4px 12px', borderRadius: 999, color: 'var(--text-secondary)' }}>
            {periodFilter === 'month' ? 'Este mes' : periodFilter === '90days' ? 'Ultimos 90 dias' : 'Historico completo'}
          </div>
        </div>

        <div className="professional-report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {professionals.map((professional) => {
            const professionalBookings = bookings.filter((booking) => booking.professionalId === professional.id && booking.status === 'completed');
            const totalProfessionalCommission = professionalBookings.reduce((sum, booking) => sum + (Number(booking.totalValue || 0) * (Number(professional.commission || 60) / 100)), 0);
            const totalBusinessShare = professionalBookings.reduce((sum, booking) => sum + Number(booking.totalValue || 0), 0) - totalProfessionalCommission;

            return (
              <div key={professional.id} className="professional-report-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {professional.name[0]}
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{professional.name}</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{professional.commission}% de comissao</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Agendamentos concluidos</span><strong>{professionalBookings.length}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Comissao acumulada</span><strong style={{ color: 'var(--success-color)' }}>{formatCurrency(totalProfessionalCommission)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Parcela do negocio</span><strong style={{ color: 'var(--info)' }}>{formatCurrency(totalBusinessShare)}</strong></div>
                </div>

                <button type="button" className="btn-text" style={{ width: '100%', marginTop: 16 }} onClick={() => setExpandedProfessionalId((prev) => prev === professional.id ? null : professional.id)}>
                  {expandedProfessionalId === professional.id ? t('hide_details') : t('show_details')}
                </button>

                {expandedProfessionalId === professional.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                    <div className="table-responsive">
                      <table style={{ minWidth: 420 }}>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Servico</th>
                            <th>Total</th>
                            <th>Comissao</th>
                          </tr>
                        </thead>
                        <tbody>
                          {professionalBookings.length === 0 ? (
                            <tr><td colSpan="4">Nenhum atendimento concluido.</td></tr>
                          ) : (
                            professionalBookings.map((booking) => (
                              <tr key={booking.id}>
                                <td>{formatShortDate(booking.date)}</td>
                                <td>{booking.project || t('service')}</td>
                                <td>{formatCurrency(booking.totalValue)}</td>
                                <td>{formatCurrency(Number(booking.totalValue || 0) * (Number(professional.commission || 60) / 100))}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
