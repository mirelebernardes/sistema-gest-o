import React from 'react';

export default function PaginationControls({ page, pageSize, totalItems, onPageChange, label = 'registros' }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  if (totalItems <= pageSize) return null;

  return (
    <div className="pagination-controls">
      <span>
        Exibindo {start}-{end} de {totalItems} {label}
      </span>
      <div className="pagination-actions">
        <button type="button" className="btn-secondary btn-sm" onClick={() => onPageChange(safePage - 1)} disabled={safePage <= 1}>
          Anterior
        </button>
        <strong>{safePage}/{totalPages}</strong>
        <button type="button" className="btn-secondary btn-sm" onClick={() => onPageChange(safePage + 1)} disabled={safePage >= totalPages}>
          Próxima
        </button>
      </div>
    </div>
  );
}
