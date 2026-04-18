import React from 'react';
import './FinancialReportPDF.css';

export default function FinancialReportPDF() {
  const data = {
    metrics: [
      { id: 1, label: 'Faturamento', current: 500.0, previous: 420.0, change: '+19%', status: 'up' },
      { id: 2, label: 'Despesas', current: 0.0, previous: 50.0, change: '-100%', status: 'up' }, // Down is good for expenses
      { id: 3, label: 'Lucro Líquido', current: 500.0, previous: 370.0, change: '+35%', status: 'up' },
      { id: 4, label: 'Comissões', current: 240.0, previous: 190.0, change: '+26%', status: 'neutral' },
    ],
    kpis: [
      { label: 'Crescimento Faturamento', value: '19%', status: 'up' },
      { label: 'Redução de Despesas', value: '100%', status: 'up' },
      { label: 'Crescimento de Lucro', value: '35%', status: 'up' },
    ],
    highlights: [
      'Recorde de faturamento no período de Páscoa.',
      'Aumento de 15% na retenção de clientes recorrentes.',
      'Dia 05/04 foi o melhor dia com R$ 400,00 de entrada única.',
      'Serviços de "Blackwork" foram os mais procurados.'
    ],
    alerts: [
      'Necessidade de reposição de estoque de tintas premium.',
      'Acompanhar variação de preços de fornecedores de agulhas.',
      'Pequena pendência de integração com sistema de pagamentos Pix.',
    ]
  };

  return (
    <div className="pdf-document-wrapper">
      <div className="pdf-page">
        {/* Topo do Cabeçalho */}
        <header className="pdf-modern-header">
          <div className="pdf-header-titles">
            <h1>RELATÓRIO FINANCEIRO</h1>
            <h2>Mestres da Tinta</h2>
          </div>
          <div className="pdf-header-meta">
            <p><strong>Período:</strong> Abril 2026</p>
            <p><strong>Emitido em:</strong> 05/04/2026</p>
          </div>
        </header>

        {/* Seção 1 — Métricas principais */}
        <section className="pdf-section">
          <h3>Métricas do Período</h3>
          <table className="pdf-executive-table">
            <thead>
              <tr>
                <th>Indicador</th>
                <th>Este Período</th>
                <th>Período Anterior</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              {data.metrics.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.label}</strong></td>
                  <td>R$ {m.current.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>R$ {m.previous.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`pdf-variation ${m.status}`}>
                      {m.change} {m.status === 'up' ? '↑' : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Seção 2 — Gráfico Comparativo (SVG Canvas) */}
        <section className="pdf-section">
          <h3>Comparativo de Performance</h3>
          <div className="pdf-chart-container">
            <svg width="600" height="200" viewBox="0 0 600 200">
              {/* Grid Lines */}
              <line x1="50" y1="160" x2="550" y2="160" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="50" y1="110" x2="550" y2="110" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="50" y1="60" x2="550" y2="60" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

              {/* Bars - Revenue */}
              <rect x="100" y="60" width="30" height="100" fill="#e2e8f0" rx="4" />
              <rect x="135" y="40" width="30" height="120" fill="#3b82f6" rx="4" />
              <text x="132" y="180" fontSize="10" fontWeight="600" fill="#64748b" textAnchor="middle">Faturamento</text>

              {/* Bars - Expenses */}
              <rect x="250" y="140" width="30" height="20" fill="#e2e8f0" rx="4" />
              <rect x="285" y="160" width="30" height="0" fill="#f43f5e" rx="4" />
              <text x="282" y="180" fontSize="10" fontWeight="600" fill="#64748b" textAnchor="middle">Despesas</text>

              {/* Bars - Profit */}
              <rect x="400" y="80" width="30" height="80" fill="#e2e8f0" rx="4" />
              <rect x="435" y="50" width="30" height="110" fill="#10b981" rx="4" />
              <text x="432" y="180" fontSize="10" fontWeight="600" fill="#64748b" textAnchor="middle">Lucro</text>

              {/* Legend */}
              <rect x="500" y="10" width="10" height="10" fill="#e2e8f0" rx="2" />
              <text x="515" y="19" fontSize="9" fill="#64748b">Anterior</text>
              <rect x="500" y="25" width="10" height="10" fill="#3b82f6" rx="2" />
              <text x="515" y="34" fontSize="9" fill="#64748b">Atual</text>
            </svg>
          </div>
        </section>

        {/* Seção 3 — Indicadores Principais */}
        <section className="pdf-section">
          <h3>Indicadores de Crescimento</h3>
          <div className="pdf-kpi-grid">
            {data.kpis.map(kpi => (
              <div key={kpi.label} className="pdf-kpi-card">
                <label>{kpi.label}</label>
                <span className="pdf-kpi-value" style={{ color: kpi.status === 'up' ? '#10b981' : '#f43f5e' }}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="pdf-analysis-grid">
          {/* Seção 4 — Destaques */}
          <section className="pdf-section">
            <h3>Destaques</h3>
            {data.highlights.map((h, i) => (
              <div key={i} className="pdf-list-item">
                <div className="pdf-bullet" style={{ background: '#10b981' }}></div>
                <p>{h}</p>
              </div>
            ))}
          </section>

          {/* Seção 5 — Pontos de Atenção */}
          <section className="pdf-section">
            <h3>Pontos de Atenção</h3>
            {data.alerts.map((a, i) => (
              <div key={i} className="pdf-list-item">
                <div className="pdf-bullet" style={{ background: '#f43f5e' }}></div>
                <p>{a}</p>
              </div>
            ))}
          </section>
        </div>

        <footer className="pdf-modern-footer">
          Relatório gerado automaticamente pelo sistema Mestres da Tinta
        </footer>
      </div>
    </div>
  );
}
