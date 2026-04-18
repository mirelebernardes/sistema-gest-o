import { downloadBlob, formatCurrency, formatShortDate } from './formatters.js';

export function exportCsv({ headers, rows, fileName }) {
  const csvRows = rows.map((row) =>
    row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(';'),
  );
  const csv = `\uFEFF${headers.join(';')}\n${csvRows.join('\n')}`;
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), fileName);
}

export function openPrintWindow({ title, html }) {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!printWindow) {
    throw new Error('Nao foi possivel abrir a janela de impressao.');
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
          h1, h2, h3 { margin: 0 0 12px; }
          .report-header { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
          .summary-card { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; }
          .summary-label { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
          .summary-value { font-size: 24px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; font-size: 14px; }
          th { background: #f9fafb; color: #374151; }
          .muted { color: #6b7280; font-size: 13px; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

export function buildFinancialReportHtml({
  title,
  subtitle,
  businessName,
  periodLabel,
  summary,
  rows,
}) {
  const summaryCards = summary
    .map(
      (item) => `
        <div class="summary-card">
          <div class="summary-label">${item.label}</div>
          <div class="summary-value">${item.value}</div>
          ${item.helper ? `<div class="muted">${item.helper}</div>` : ''}
        </div>
      `,
    )
    .join('');

  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td>${formatShortDate(row.date)}</td>
          <td>${row.description || '-'}</td>
          <td>${row.category || '-'}</td>
          <td>${row.status || '-'}</td>
          <td>${row.professional || '-'}</td>
          <td>${formatCurrency(row.value)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <div class="report-header">
      <div>
        <h1>${title}</h1>
        <p class="muted">${subtitle}</p>
      </div>
      <div>
        <div><strong>Negocio:</strong> ${businessName || 'Sistema'}</div>
        <div><strong>Periodo:</strong> ${periodLabel}</div>
        <div><strong>Emitido em:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
      </div>
    </div>
    <div class="summary-grid">${summaryCards}</div>
    <h2>Lancamentos</h2>
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Descricao</th>
          <th>Categoria</th>
          <th>Status</th>
          <th>Profissional</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || '<tr><td colspan="6">Nenhum registro encontrado.</td></tr>'}
      </tbody>
    </table>
  `;
}
