import React, { useMemo, useState } from 'react';
import { Bell, Check, Edit, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import { formatCurrency } from '../utils/formatters';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function getCurrentMonthRevenue(payments, professionalId) {
  const now = new Date();
  return payments
    .filter((payment) => (
      payment.type === 'income'
      && Number(payment.professionalId) === Number(professionalId)
      && new Date(payment.date).getMonth() === now.getMonth()
      && new Date(payment.date).getFullYear() === now.getFullYear()
    ))
    .reduce((sum, payment) => sum + Number(payment.value || 0), 0);
}

export default function ArtistsView() {
  const {
    addProfessional,
    bookings,
    clients,
    deleteProfessional,
    payments,
    professionals,
    showToast,
    t,
    triggerProfessionalNotification,
    updateProfessional,
  } = useBusinessContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddProfessional, setShowAddProfessional] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newProfessional, setNewProfessional] = useState({
    name: '',
    specialty: '',
    phone: '',
    commission: 60,
    notificationSettings: { enabled: true, autoSend: false },
  });

  const filteredProfessionals = useMemo(
    () => professionals.filter((professional) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;
      return (
        professional.name?.toLowerCase().includes(term)
        || professional.specialty?.toLowerCase().includes(term)
        || professional.phone?.includes(term)
      );
    }),
    [professionals, searchTerm],
  );

  const handleAddProfessional = async (event) => {
    event.preventDefault();

    if (!newProfessional.name.trim() || !newProfessional.phone.trim()) {
      showToast('Nome e telefone sao obrigatorios.', 'error');
      return;
    }

    try {
      await addProfessional({
        ...newProfessional,
        name: newProfessional.name.trim(),
        specialty: newProfessional.specialty.trim(),
      });
      setShowAddProfessional(false);
      setNewProfessional({
        name: '',
        specialty: '',
        phone: '',
        commission: 60,
        notificationSettings: { enabled: true, autoSend: false },
      });
    } catch {
      showToast(`Nao foi possivel cadastrar o ${t('professional')}.`, 'error');
    }
  };

  const handleSaveProfessional = async () => {
    if (!editingProfessional?.name?.trim() || !editingProfessional?.phone?.trim()) {
      showToast('Nome e telefone sao obrigatorios.', 'error');
      return;
    }

    try {
      await updateProfessional(editingProfessional.id, {
        ...editingProfessional,
        name: editingProfessional.name.trim(),
        specialty: editingProfessional.specialty?.trim() || '',
      });
      setEditingProfessional(null);
    } catch {
      showToast('Nao foi possivel salvar as alteracoes.', 'error');
    }
  };

  const handleDeleteProfessional = async (professionalId) => {
    if (confirmDeleteId !== professionalId) {
      setConfirmDeleteId(professionalId);
      window.setTimeout(() => setConfirmDeleteId((current) => (current === professionalId ? null : current)), 3000);
      return;
    }

    try {
      await deleteProfessional(professionalId);
      setConfirmDeleteId(null);
    } catch {
      showToast(`Nao foi possivel remover o ${t('professional')}.`, 'error');
    }
  };

  return (
    <div className="artists-container">
      <div className="view-header">
        <h1><Users size={28} /> Profissionais</h1>
        <button type="button" className="btn-primary" onClick={() => setShowAddProfessional(true)}>
          <Plus size={18} /> Novo profissional
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: 20 }}>
        <Search size={18} />
        <input
          type="text"
          placeholder="Buscar por nome, especialidade ou telefone"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="artists-grid">
        {filteredProfessionals.length === 0 ? (
          <div className="empty-state">Nenhum profissional encontrado com os filtros atuais.</div>
        ) : (
          filteredProfessionals.map((professional) => {
            const professionalBookings = bookings.filter((booking) => Number(booking.professionalId) === Number(professional.id));
            const completedBookings = professionalBookings.filter((booking) => booking.status === 'completed').length;
            const activeClients = new Set(professionalBookings.map((booking) => booking.clientId)).size;
            const monthlyRevenue = getCurrentMonthRevenue(payments, professional.id);
            const deleteConfirm = confirmDeleteId === professional.id;

            return (
              <div key={professional.id} className="artist-card section-card" style={{ padding: 20 }}>
                <div className="artist-card-header" style={{ marginBottom: 18 }}>
                  <div className="artist-card-avatar">{getInitials(professional.name)}</div>
                  <div className="artist-card-info">
                    <h3>{professional.name}</h3>
                    <div className="artist-specialty-badge">{professional.specialty || 'Atendimento geral'}</div>
                    <div className="artist-rating" style={{ marginTop: 8 }}>
                      {activeClients} cliente(s) atendido(s)
                    </div>
                  </div>
                </div>

                <div className="artist-metrics">
                  <div className="artist-metric">
                    <div className="metric-label">Comissao</div>
                    <div className="metric-value">{Number(professional.commission || 0)}%</div>
                  </div>
                  <div className="artist-metric">
                    <div className="metric-label">Faturamento no mes</div>
                    <div className="metric-value">{formatCurrency(monthlyRevenue)}</div>
                  </div>
                  <div className="artist-metric">
                    <div className="metric-label">Agendamentos concluidos</div>
                    <div className="metric-value">{completedBookings}</div>
                  </div>
                </div>

                <div className="artist-notifications-preview" style={{ marginTop: 16 }}>
                  <div className={`status-dot ${professional.notificationSettings?.enabled ? 'active' : ''}`} />
                  <span>
                    Alertas {professional.notificationSettings?.enabled ? (professional.notificationSettings?.autoSend ? 'automaticos' : 'manuais') : 'desativados'}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 8, marginTop: 12, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={14} /> {professional.phone || 'Telefone nao informado'}
                  </div>
                  <div>
                    Base de clientes: {clients.filter((client) => professionalBookings.some((booking) => booking.clientId === client.id)).length}
                  </div>
                </div>

                <div className="artist-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 18 }}>
                  <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingProfessional({ ...professional })}>
                    <Edit size={16} /> Editar
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => triggerProfessionalNotification(professional.id)}
                  >
                    <Bell size={16} /> Testar alerta
                  </button>
                  <button
                    type="button"
                    className={deleteConfirm ? 'btn-danger' : 'btn-icon text-danger'}
                    title="Remover profissional"
                    onClick={() => handleDeleteProfessional(professional.id)}
                    style={deleteConfirm ? { minWidth: 160 } : undefined}
                  >
                    {deleteConfirm ? <><Check size={16} /> Confirmar</> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddProfessional && (
        <div className="modal-overlay" onClick={() => setShowAddProfessional(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo profissional</h2>
              <button type="button" className="btn-icon" onClick={() => setShowAddProfessional(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleAddProfessional} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome completo</label>
                  <input
                    type="text"
                    value={newProfessional.name}
                    onChange={(event) => setNewProfessional((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={newProfessional.phone}
                    onChange={(event) => setNewProfessional((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Especialidade</label>
                  <input
                    type="text"
                    value={newProfessional.specialty}
                    onChange={(event) => setNewProfessional((prev) => ({ ...prev, specialty: event.target.value }))}
                    placeholder="Ex.: tatuagem autoral, cortes, coloracao, maquiagem"
                  />
                </div>
                <div className="form-group">
                  <label>Comissao (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProfessional.commission}
                    onChange={(event) => setNewProfessional((prev) => ({ ...prev, commission: Number(event.target.value || 0) }))}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddProfessional(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar profissional</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProfessional && (
        <div className="modal-overlay" onClick={() => setEditingProfessional(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar profissional</h2>
              <button type="button" className="btn-icon" onClick={() => setEditingProfessional(null)}><X size={18} /></button>
            </div>

            <div className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome completo</label>
                  <input
                    type="text"
                    value={editingProfessional.name || ''}
                    onChange={(event) => setEditingProfessional((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Telefone</label>
                  <input
                    type="text"
                    value={editingProfessional.phone || ''}
                    onChange={(event) => setEditingProfessional((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Especialidade</label>
                  <input
                    type="text"
                    value={editingProfessional.specialty || ''}
                    onChange={(event) => setEditingProfessional((prev) => ({ ...prev, specialty: event.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Comissao (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingProfessional.commission || 0}
                    onChange={(event) => setEditingProfessional((prev) => ({ ...prev, commission: Number(event.target.value || 0) }))}
                  />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 4 }}>
                <label className="checkbox-group" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!editingProfessional.notificationSettings?.enabled}
                    onChange={(event) => setEditingProfessional((prev) => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        enabled: event.target.checked,
                      },
                    }))}
                  />
                  <span>Receber alertas internos</span>
                </label>
                <label className="checkbox-group" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!editingProfessional.notificationSettings?.autoSend}
                    onChange={(event) => setEditingProfessional((prev) => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        autoSend: event.target.checked,
                      },
                    }))}
                  />
                  <span>Automatizar disparos quando disponivel</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingProfessional(null)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={handleSaveProfessional}>Salvar alteracoes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
