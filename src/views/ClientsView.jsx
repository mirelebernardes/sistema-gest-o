import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileText, Mail, Phone, Plus, Search, Trash2, Upload, Users, X } from 'lucide-react';

import AnamnesisModule from '../components/AnamnesisModule';
import ConsentModule from '../components/ConsentModule';
import PaginationControls from '../components/PaginationControls';
import { useBusinessContext } from '../context/BusinessContext';
import { formatCurrency, formatDateTime, formatShortDate } from '../utils/formatters';

const CLIENT_TABS = [
  { id: 'overview', label: 'Resumo' },
  { id: 'history', label: 'Histórico' },
  { id: 'anamnesis', label: 'Anamnese' },
  { id: 'consent', label: 'Termos' },
  { id: 'documents', label: 'Documentos' },
];
const CLIENTS_PAGE_SIZE = 24;

export default function ClientsView() {
  const {
    addAnamnesis,
    addBooking,
    addClient,
    addConsent,
    anamnesis,
    bookings,
    clientDocuments,
    clients,
    consents,
    deleteClient,
    payments,
    professionals,
    showToast,
    t,
    updateClient,
    uploadDocument,
  } = useBusinessContext();

  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientsPage, setClientsPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    allergies: 'Nenhuma',
    notes: '',
    bodymap: [],
  });
  const [newBooking, setNewBooking] = useState({
    professionalId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    duration: 1,
    project: '',
    totalValue: '',
    deposit: '',
  });

  const filteredClients = useMemo(
    () => clients.filter((client) => (
      client.name?.toLowerCase().includes(searchTerm.toLowerCase())
      || client.phone?.includes(searchTerm)
      || client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )),
    [clients, searchTerm],
  );

  const safeClientsPage = Math.min(
    clientsPage,
    Math.max(1, Math.ceil(filteredClients.length / CLIENTS_PAGE_SIZE)),
  );

  const paginatedClients = useMemo(
    () => filteredClients.slice((safeClientsPage - 1) * CLIENTS_PAGE_SIZE, safeClientsPage * CLIENTS_PAGE_SIZE),
    [filteredClients, safeClientsPage],
  );

  const selectedClientBookings = useMemo(
    () => bookings.filter((booking) => booking.clientId === selectedClient?.id),
    [bookings, selectedClient],
  );

  const selectedClientPayments = useMemo(
    () => payments.filter((payment) => selectedClientBookings.some((booking) => booking.id === payment.bookingId) && payment.type === 'income'),
    [payments, selectedClientBookings],
  );

  const selectedClientDocuments = useMemo(
    () => clientDocuments.filter((document) => document.clientId === selectedClient?.id),
    [clientDocuments, selectedClient],
  );

  const selectedClientAnamnesis = useMemo(
    () => anamnesis.find((item) => item.clientId === selectedClient?.id),
    [anamnesis, selectedClient],
  );

  const selectedClientConsents = useMemo(
    () => consents.filter((item) => item.clientId === selectedClient?.id),
    [consents, selectedClient],
  );

  const totalSpent = selectedClientPayments.reduce((sum, payment) => sum + Number(payment.value || 0), 0);

  const handleAddClient = async (event) => {
    event.preventDefault();
    if (!newClient.name || !newClient.phone) {
      showToast('Nome e telefone sao obrigatorios.', 'error');
      return;
    }

    try {
      await addClient(newClient);
      setShowAddClient(false);
      setNewClient({
        name: '',
        phone: '',
        email: '',
        birthDate: '',
        allergies: 'Nenhuma',
        notes: '',
        bodymap: [],
      });
    } catch {
      showToast('Não foi possível cadastrar o cliente.', 'error');
    }
  };

  const toggleBodyPart = async (region) => {
    if (!selectedClient) return;
    const currentMap = selectedClient.bodymap || [];
    const nextMap = currentMap.includes(region)
      ? currentMap.filter((item) => item !== region)
      : [...currentMap, region];

    try {
      const updatedClient = await updateClient(selectedClient.id, { ...selectedClient, bodymap: nextMap });
      setSelectedClient((prev) => ({ ...prev, ...updatedClient, bodymap: updatedClient.bodymap || nextMap }));
    } catch {
      showToast('Não foi possível atualizar o mapa corporal.', 'error');
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }

    try {
      await deleteClient(selectedClient.id);
      setSelectedClient(null);
      setConfirmDelete(false);
    } catch {
      showToast('Não foi possível excluir o cliente.', 'error');
    }
  };

  const handleQuickSchedule = async () => {
    if (!selectedClient || !newBooking.professionalId || !newBooking.date || !newBooking.time) {
      showToast('Profissional, data e horário são obrigatórios.', 'error');
      return;
    }

    try {
      await addBooking({
        clientId: selectedClient.id,
        professionalId: Number(newBooking.professionalId),
        date: newBooking.date,
        time: newBooking.time,
        duration: Number(newBooking.duration) || 1,
        project: newBooking.project || `${t('booking')} para ${selectedClient.name}`,
        totalValue: Number(newBooking.totalValue) || 0,
        deposit: Number(newBooking.deposit) || 0,
      });
      setShowScheduleModal(false);
      setNewBooking({
        professionalId: '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        duration: 1,
        project: '',
        totalValue: '',
        deposit: '',
      });
    } catch {
      showToast('Não foi possível criar o agendamento.', 'error');
    }
  };

  const handlePrintConsent = (consent) => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Termo de consentimento</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #111827; line-height: 1.6; }
            h1 { margin-bottom: 8px; }
            .signature { margin-top: 32px; }
            .signature img { max-height: 140px; border-bottom: 1px solid #111827; }
          </style>
        </head>
        <body>
          <h1>Termo de consentimento</h1>
          <p>Cliente: <strong>${consent.clientName || selectedClient?.name || ''}</strong></p>
          <p>Data da assinatura: <strong>${formatDateTime(consent.signedAt || consent.timestamp)}</strong></p>
          <p>Este documento confirma a autorização e responsabilidade do cliente para a realização do serviço.</p>
          ${consent.signature ? `<div class="signature"><img src="${consent.signature}" alt="Assinatura" /></div>` : ''}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const openDocument = (document) => {
    const fileUrl = document.url || document.data;
    if (fileUrl) {
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      showToast('Documento sem link disponível.', 'error');
    }
  };

  return (
    <div className="clients-container">
      <div className="view-header">
        <h1><Users size={28} /> {t('clientManagement')}</h1>
        <button type="button" className="btn-primary" onClick={() => setShowAddClient(true)}>
          <Plus size={18} /> {t('newClient')}
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="clients-grid">
        {paginatedClients.map((client) => {
          const clientBookings = bookings.filter((booking) => booking.clientId === client.id);
          const clientTotalSpent = payments
            .filter((payment) => clientBookings.some((booking) => booking.id === payment.bookingId) && payment.type === 'income')
            .reduce((sum, payment) => sum + Number(payment.value || 0), 0);

          return (
            <button
              key={client.id}
              type="button"
              className="client-card"
              onClick={() => {
                setSelectedClient(client);
                setActiveTab('overview');
                setConfirmDelete(false);
              }}
              style={{ textAlign: 'left', border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer' }}
            >
              <div className="client-header">
                <div className="client-avatar">{client.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div>
                <div className="client-info">
                  <div className="client-name">{client.name}</div>
                  <div className="client-contact"><Phone size={12} /> {client.phone || '-'}</div>
                  <div className="client-contact"><Mail size={12} /> {client.email || '-'}</div>
                </div>
              </div>
              <div className="client-stats">
                <div className="stat-item">
                  <span className="stat-number">{clientBookings.length}</span>
                  <span className="stat-label">{t('bookings')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">{formatCurrency(clientTotalSpent)}</span>
                  <span className="stat-label">{t('totalSpent')}</span>
                </div>
              </div>
              {client.allergies && client.allergies !== 'Nenhuma' ? (
                <div className="client-alert">
                  <FileText size={14} /> Alergias: {client.allergies}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <PaginationControls
        page={safeClientsPage}
        pageSize={CLIENTS_PAGE_SIZE}
        totalItems={filteredClients.length}
        onPageChange={setClientsPage}
        label="clientes"
      />

      {showAddClient && (
        <div className="modal-overlay" onClick={() => setShowAddClient(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('registerNewClient')}</h2>
              <button type="button" className="btn-icon" onClick={() => setShowAddClient(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddClient} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('fullName')}</label>
                  <input type="text" value={newClient.name} onChange={(event) => setNewClient((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('phone')}</label>
                  <input type="text" value={newClient.phone} onChange={(event) => setNewClient((prev) => ({ ...prev, phone: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>E-mail</label>
                  <input type="email" value={newClient.email} onChange={(event) => setNewClient((prev) => ({ ...prev, email: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>{t('birthDate')}</label>
                  <input type="date" value={newClient.birthDate} onChange={(event) => setNewClient((prev) => ({ ...prev, birthDate: event.target.value }))} />
                </div>
                <div className="form-group full-width">
                  <label>{t('allergies')}</label>
                  <input type="text" value={newClient.allergies} onChange={(event) => setNewClient((prev) => ({ ...prev, allergies: event.target.value }))} />
                </div>
                <div className="form-group full-width">
                  <label>{t('notes')}</label>
                  <textarea value={newClient.notes} onChange={(event) => setNewClient((prev) => ({ ...prev, notes: event.target.value }))} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddClient(false)}>{t('cancel')}</button>
                <button type="submit" className="btn-primary">{t('saveClient')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
          <div className="modal-content large" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedClient.name}</h2>
              <button type="button" className="btn-icon" onClick={() => setSelectedClient(null)}><X size={18} /></button>
            </div>

            <div className="client-detail-tabs">
              {CLIENT_TABS.map((tab) => (
                <button key={tab.id} type="button" className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="client-tab-content">
              {activeTab === 'overview' && (
                <div className="client-detail-grid">
                  <div className="client-detail-section">
                    <h3>Informações de contato</h3>
                    <div className="detail-item"><label>{t('fullName')}</label><div>{selectedClient.name}</div></div>
                    <div className="detail-item"><label>{t('phone')}</label><div>{selectedClient.phone || '-'}</div></div>
                    <div className="detail-item"><label>E-mail</label><div>{selectedClient.email || '-'}</div></div>
                    <div className="detail-item"><label>{t('birthDate')}</label><div>{selectedClient.birthdate || selectedClient.birthDate ? formatShortDate(selectedClient.birthdate || selectedClient.birthDate) : '-'}</div></div>
                    <div className="detail-item"><label>{t('notes')}</label><div>{selectedClient.notes || '-'}</div></div>
                  </div>

                  <div className="client-detail-section">
                    <h3>Resumo financeiro</h3>
                    <div className="detail-item"><label>Total investido</label><div>{formatCurrency(totalSpent)}</div></div>
                    <div className="detail-item"><label>Agendamentos</label><div>{selectedClientBookings.length}</div></div>
                    <div className="detail-item"><label>Concluídos</label><div>{selectedClientBookings.filter((booking) => booking.status === 'completed').length}</div></div>
                    <div className="detail-item"><label>Alergias</label><div>{selectedClient.allergies || 'Nenhuma'}</div></div>
                  </div>

                  <div className="client-detail-section full-width">
                    <h3>{t('bodyMap')}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {['head', 'neck', 'chest', 'stomach', 'arm_left', 'arm_right', 'forearm_left', 'forearm_right', 'leg_left', 'leg_right', 'calf_left', 'calf_right'].map((region) => {
                        const active = selectedClient.bodymap?.includes(region);
                        return (
                          <button
                            key={region}
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => toggleBodyPart(region)}
                            style={{
                              background: active ? 'var(--primary-soft)' : undefined,
                              borderColor: active ? 'color-mix(in srgb, var(--primary) 24%, transparent)' : undefined,
                            }}
                          >
                            {region.replaceAll('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="histórico-view">
                  <div className="metrics-grid" style={{ marginBottom: 24 }}>
                    <div className="metric-card"><div className="metric-content"><div className="metric-label">Total de agendamentos</div><div className="metric-value">{selectedClientBookings.length}</div></div></div>
                    <div className="metric-card"><div className="metric-content"><div className="metric-label">{t('totalSpent')}</div><div className="metric-value">{formatCurrency(totalSpent)}</div></div></div>
                    <div className="metric-card"><div className="metric-content"><div className="metric-label">Ultimo atendimento</div><div className="metric-value">{selectedClientBookings[0] ? formatShortDate(selectedClientBookings[0].date) : '-'}</div></div></div>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {selectedClientBookings.length === 0 ? (
                      <div className="empty-state">Nenhum agendamento encontrado.</div>
                    ) : (
                      [...selectedClientBookings]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((booking) => (
                          <div key={booking.id} className="section-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                              <div>
                                <strong>{booking.project || t('booking')}</strong>
                                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                                  {formatShortDate(booking.date)} as {booking.time} com {booking.professionalName || t('professional')}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div>{formatCurrency(booking.totalValue)}</div>
                                <small style={{ color: 'var(--text-secondary)' }}>{booking.status}</small>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'anamnesis' && (
                <div className="section-card" style={{ padding: 20 }}>
                  <AnamnesisModule
                    client={selectedClient}
                    initialData={selectedClientAnamnesis}
                    onUpdate={async (data) => {
                      try {
                        await addAnamnesis(selectedClient.id, data);
                      } catch {
                        showToast('Não foi possível salvar a anamnese.', 'error');
                      }
                    }}
                  />
                </div>
              )}

              {activeTab === 'consent' && (
                <div className="section-card" style={{ padding: 20, display: 'grid', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ marginBottom: 6 }}>Termos e consentimentos</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Registre a assinatura digital e mantenha o histórico do cliente sempre acessível.
                      </p>
                    </div>
                    <button type="button" className="btn-primary" onClick={() => setShowConsentForm((prev) => !prev)}>
                      <Plus size={16} /> {showConsentForm ? 'Ocultar formulário' : 'Novo termo'}
                    </button>
                  </div>

                  {showConsentForm && (
                    <ConsentModule
                      client={selectedClient}
                      onSave={async (record) => {
                        try {
                          await addConsent(selectedClient.id, record);
                          setShowConsentForm(false);
                        } catch {
                          showToast('Não foi possível salvar o termo.', 'error');
                        }
                      }}
                    />
                  )}

                  <div style={{ display: 'grid', gap: 12 }}>
                    {selectedClientConsents.length === 0 ? (
                      <div className="empty-state">Nenhum termo registrado para este cliente.</div>
                    ) : (
                      [...selectedClientConsents]
                        .sort((a, b) => new Date(b.signedAt || b.timestamp) - new Date(a.signedAt || a.timestamp))
                        .map((consent) => (
                          <div key={consent.id} className="section-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                              <div>
                                <strong>Termo assinado</strong>
                                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                                  {formatDateTime(consent.signedAt || consent.timestamp)}
                                </div>
                              </div>
                              <button type="button" className="btn-secondary" onClick={() => handlePrintConsent(consent)}>
                                <Download size={16} /> Imprimir
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="section-card" style={{ padding: 20, display: 'grid', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ marginBottom: 6 }}>Documentos do cliente</h3>
                      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        Anexe arquivos e abra rapidamente os documentos relacionados ao atendimento.
                      </p>
                    </div>
                    <label className="btn-primary" style={{ cursor: 'pointer' }}>
                      <Upload size={16} /> Enviar arquivo
                      <input
                        type="file"
                        hidden
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file || !selectedClient) return;
                          try {
                            await uploadDocument(selectedClient.id, file);
                          } catch {
                            showToast('Não foi possível anexar o documento.', 'error');
                          } finally {
                            event.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {selectedClientDocuments.length === 0 ? (
                      <div className="empty-state">Nenhum documento anexado para este cliente.</div>
                    ) : (
                      selectedClientDocuments.map((document) => (
                        <div key={document.id} className="section-card" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <FileText size={18} />
                              <div>
                                <strong>{document.name || document.originalName || 'Documento'}</strong>
                                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                                  {formatDateTime(document.createdAt || document.timestamp || new Date().toISOString())}
                                </div>
                              </div>
                            </div>
                            <button type="button" className="btn-secondary" onClick={() => openDocument(document)}>
                              <Download size={16} /> Abrir
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ borderTop: '1px solid var(--border-color)', marginTop: 24, paddingTop: 20 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowScheduleModal(true)}>
                <Calendar size={16} /> Novo agendamento
              </button>
              <button type="button" className={`btn-secondary ${confirmDelete ? 'btn-danger' : ''}`} onClick={handleDeleteClient}>
                <Trash2 size={16} /> {confirmDelete ? 'Confirmar exclusão' : 'Excluir cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedClient && showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Agendar para {selectedClient.name}</h2>
              <button type="button" className="btn-icon" onClick={() => setShowScheduleModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Profissional</label>
                  <select value={newBooking.professionalId} onChange={(event) => setNewBooking((prev) => ({ ...prev, professionalId: event.target.value }))}>
                    <option value="">Selecione</option>
                    {professionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>{professional.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" value={newBooking.date} onChange={(event) => setNewBooking((prev) => ({ ...prev, date: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Horario</label>
                  <input type="time" value={newBooking.time} onChange={(event) => setNewBooking((prev) => ({ ...prev, time: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Duracao (h)</label>
                  <input type="number" min="1" value={newBooking.duration} onChange={(event) => setNewBooking((prev) => ({ ...prev, duration: event.target.value }))} />
                </div>
                <div className="form-group full-width">
                  <label>Descrição do serviço</label>
                  <input type="text" value={newBooking.project} onChange={(event) => setNewBooking((prev) => ({ ...prev, project: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Valor total</label>
                  <input type="number" min="0" value={newBooking.totalValue} onChange={(event) => setNewBooking((prev) => ({ ...prev, totalValue: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Sinal</label>
                  <input type="number" min="0" value={newBooking.deposit} onChange={(event) => setNewBooking((prev) => ({ ...prev, deposit: event.target.value }))} />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowScheduleModal(false)}>Cancelar</button>
                <button type="button" className="btn-primary" onClick={handleQuickSchedule}>Salvar agendamento</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
