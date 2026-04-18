import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowDownRight, ArrowUpRight, ChevronLeft, FileText } from 'lucide-react';

import { useBusinessContext } from '../../context/BusinessContext';
import { APP_ROUTES } from '../../utils/appRoutes';
import { buildFinancialReportHtml, openPrintWindow } from '../../utils/export';
import { formatCurrency } from '../../utils/formatters';

export default function ProfitDetailView() {
  const navigate = useNavigate();
  const { business, metrics, payments, professionals, t } = useBusinessContext();

  const monthlyData = useMemo(() => {
    const data = {};
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const label = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      data[label] = { income: 0, expense: 0, commissions: 0, net: 0, label };
    }

    payments.forEach((payment) => {
      const paymentDate = new Date(`${payment.date}T00:00:00`);
      const label = paymentDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      if (!data[label]) return;

      if (payment.type === 'income') {
        data[label].income += Number(payment.value || 0);
        if (payment.professionalId) {
          const professional = professionals.find((item) => item.id === payment.professionalId);
          data[label].commissions += Number(payment.value || 0) * ((Number(professional?.commission) || 60) / 100);
        }
      } else {
        data[label].expense += Number(payment.value || 0);
      }
    });

    Object.values(data).forEach((item) => {
      item.net = item.income - item.expense - item.commissions;
    });

    return Object.values(data);
  }, [payments, professionals]);

  const comparison = useMemo(() => {
    if (monthlyData.length < 2) return { diff: '0,0', trend: 'up' };
    const current = monthlyData.at(-1)?.net || 0;
    const previous = monthlyData.at(-2)?.net || 0;
    if (previous === 0) return { diff: '100,0', trend: 'up' };
    const diff = ((current - previous) / Math.abs(previous)) * 100;
    return { diff: Math.abs(diff).toFixed(1), trend: diff >= 0 ? 'up' : 'down' };
  }, [monthlyData]);

  const maxValue = Math.max(...monthlyData.map((item) => Math.max(item.income, item.expense)), 1000);

  const handleExportPdf = () => {
    openPrintWindow({
      title: 'Lucro do negocio',
      html: buildFinancialReportHtml({
        title: 'Lucro do negocio',
        subtitle: 'Historico de resultado liquido e composicao por mes.',
        businessName: business?.name,
        periodLabel: 'Ultimos 6 meses',
        summary: [
          { label: 'Faturamento total', value: formatCurrency(metrics.totalRevenue) },
          { label: 'Despesas', value: formatCurrency(metrics.totalExpenses) },
          { label: 'Lucro do negocio', value: formatCurrency(metrics.studioProfit), helper: `Comissoes: ${formatCurrency(metrics.totalCommissions)}` },
        ],
        rows: monthlyData.map((item) => ({
          date: `${item.label}/2026`,
          description: 'Resumo mensal',
          category: 'Resultado',
          status: 'Liquido',
          professional: '',
          value: item.net,
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
            <h1 style={{ margin: 0 }}>{t('financial_result')}</h1>
            <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{t('net_profit_history')}</p>
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={handleExportPdf}>
          <FileText size={18} /> {t('export_pdf')}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 24 }}>
        <div className="section-card">
          <div className="section-header">
            <h2>Historico dos ultimos 6 meses</h2>
          </div>
          <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            {monthlyData.map((item) => (
              <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                <div style={{ width: '100%', height: 240, display: 'flex', alignItems: 'flex-end', gap: 4, background: 'color-mix(in srgb, var(--card) 94%, transparent)', borderRadius: 12, padding: '0 4px' }}>
                  <div style={{ flex: 1, height: `${(item.income / maxValue) * 100}%`, background: 'var(--success)', borderRadius: '8px 8px 0 0' }} />
                  <div style={{ flex: 1, height: `${(item.expense / maxValue) * 100}%`, background: 'var(--danger)', borderRadius: '8px 8px 0 0' }} />
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          <div className="section-card" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, transparent), color-mix(in srgb, var(--primary) 8%, transparent))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Lucro acumulado</div>
                <div style={{ fontSize: 34, fontWeight: 800 }}>{formatCurrency(metrics.studioProfit)}</div>
              </div>
              <Activity size={48} />
            </div>
            <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'color-mix(in srgb, var(--card) 92%, transparent)', padding: '8px 12px', borderRadius: 12 }}>
              {comparison.trend === 'up' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              <strong>{comparison.diff}%</strong>
              <span style={{ color: 'var(--text-secondary)' }}>{t('vs_last_month')}</span>
            </div>
          </div>

          <div className="section-card">
            <div className="section-header">
              <h2>{t('cost_summary')}</h2>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Faturamento total</span><strong>{formatCurrency(metrics.totalRevenue)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Despesas operacionais</span><strong>{formatCurrency(metrics.totalExpenses)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Comissoes</span><strong>{formatCurrency(metrics.totalCommissions)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}><span>{t('final_profit')}</span><strong>{formatCurrency(metrics.studioProfit)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
