import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ChevronLeft, FileText, Users } from 'lucide-react';

import { useBusinessContext } from '../../context/BusinessContext';
import { APP_ROUTES } from '../../utils/appRoutes';
import { buildFinancialReportHtml, openPrintWindow } from '../../utils/export';
import { formatCurrency } from '../../utils/formatters';

export default function ResultDetailView() {
  const navigate = useNavigate();
  const { bookings, business, professionals, t } = useBusinessContext();

  const resultStats = useMemo(() => {
    const completedBookings = bookings.filter((booking) => booking.status === 'completed');
    let totalGross = 0;
    let totalProfessionalComm = 0;
    let totalBusinessPart = 0;

    completedBookings.forEach((booking) => {
      const gross = Number(booking.totalValue || 0);
      const professional = professionals.find((item) => item.id === booking.professionalId);
      const rate = Number(professional?.commission || 60) / 100;
      const commission = gross * rate;
      totalGross += gross;
      totalProfessionalComm += commission;
      totalBusinessPart += gross - commission;
    });

    return { totalGross, totalProfessionalComm, totalBusinessPart, completedBookings };
  }, [bookings, professionals]);

  const byProfessional = useMemo(() => professionals.map((professional) => {
    const professionalBookings = resultStats.completedBookings.filter((booking) => booking.professionalId === professional.id);
    const gross = professionalBookings.reduce((sum, booking) => sum + Number(booking.totalValue || 0), 0);
    const commission = gross * ((Number(professional.commission || 60)) / 100);
    return {
      id: professional.id,
      name: professional.name,
      sessions: professionalBookings.length,
      gross,
      commission,
    };
  }).filter((item) => item.sessions > 0).sort((a, b) => b.gross - a.gross), [professionals, resultStats.completedBookings]);

  const businessPercentage = Math.round((resultStats.totalBusinessPart / (resultStats.totalGross || 1)) * 100);

  const handleExportPdf = () => {
    openPrintWindow({
      title: 'Resultado financeiro',
      html: buildFinancialReportHtml({
        title: 'Resultado financeiro',
        subtitle: 'Split entre negocio e profissionais nos atendimentos concluidos.',
        businessName: business?.name,
        periodLabel: 'Historico de atendimentos concluidos',
        summary: [
          { label: 'Faturamento bruto', value: formatCurrency(resultStats.totalGross) },
          { label: 'Parcela do negocio', value: formatCurrency(resultStats.totalBusinessPart), helper: `${businessPercentage}% do bruto` },
          { label: 'Comissoes', value: formatCurrency(resultStats.totalProfessionalComm) },
        ],
        rows: byProfessional.map((item) => ({
          date: 'Periodo atual',
          description: item.name,
          category: `${item.sessions} atendimentos`,
          status: 'Comissao',
          professional: item.name,
          value: item.commission,
        })),
      }),
    });
  };

  return (
    <div className="result-detail-container">
      <header className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" className="btn-icon" onClick={() => navigate(APP_ROUTES.finance)}>
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0 }}>Resultado do periodo</h1>
            <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>Divisao do faturamento concluido entre negocio e profissionais.</p>
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={handleExportPdf}>
          <FileText size={18} /> Exportar PDF
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="section-card">
          <div className="section-header"><h2><Calculator size={20} /> Faturamento bruto</h2></div>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{formatCurrency(resultStats.totalGross)}</div>
        </div>
        <div className="section-card">
          <div className="section-header"><h2>Parcela do {t('business')}</h2></div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--success-color)' }}>{formatCurrency(resultStats.totalBusinessPart)}</div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{businessPercentage}% do faturamento concluido.</p>
        </div>
        <div className="section-card">
          <div className="section-header"><h2>Comissoes</h2></div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--warning)' }}>{formatCurrency(resultStats.totalProfessionalComm)}</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h2><Users size={20} /> Resultado por profissional</h2>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Atendimentos concluidos</th>
                <th>Faturamento</th>
                <th>Comissao</th>
              </tr>
            </thead>
            <tbody>
              {byProfessional.length === 0 ? (
                <tr><td colSpan="4">Nenhum atendimento concluido encontrado.</td></tr>
              ) : (
                byProfessional.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.sessions}</td>
                    <td>{formatCurrency(item.gross)}</td>
                    <td>{formatCurrency(item.commission)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
