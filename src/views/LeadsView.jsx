import React, { useState } from 'react';
import { useBusinessContext } from '../context/BusinessContext';
import * as LucideIcons from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const { 
  FileText, TrendingUp, Phone, X, Plus,
} = LucideIcons;

const LEAD_COLUMNS = [
  { id: 'new', title: 'Novos' },
  { id: 'contacted', title: 'Em contato' },
  { id: 'quoted', title: 'Orçamento' },
  { id: 'deposit_paid', title: 'Sinal pago' },
  { id: 'scheduled', title: 'Agendado' },
  { id: 'completed', title: 'Finalizado' },
  { id: 'lost', title: 'Perdido' }
];
const LEADS_COLUMN_PAGE_SIZE = 40;
const COLUMN_CONTENT_STYLE = { display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '100px' };
const EMPTY_COLUMN_STYLE = { fontSize: '12px', opacity: 0.5, textAlign: 'center', padding: '20px' };
const HEADER_ACTIONS_STYLE = { display: 'flex', gap: '8px' };
const SECTION_GRID_MARGIN_TOP = { marginTop: '32px' };
const MODAL_ACTIONS_MARGIN_TOP = { marginTop: '24px' };
const LEAD_PHONE_LINK_STYLE = {
  color: 'var(--whatsapp)',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  textDecoration: 'none',
  fontWeight: '600',
};

export default function LeadsView() {
  const context = useBusinessContext();
  const {
    showToast, professionals, clients,
    payments, setPayments, leads, setLeads,
    db, addBooking, addLead, addClient, addPayment, updateLead, sendWhatsAppMessage, t, business
  } = context;

  const businessLeads = leads;
  
  const leadsByOrigin = businessLeads.reduce((acc, lead) => {
    const origin = lead.origin || lead.source || 'sem origem';
    acc[origin] = (acc[origin] || 0) + 1;
    return acc;
  }, {});

  const convertedStatuses = ['converted', 'completed'];
  const conversionRate = businessLeads.length > 0
    ? (businessLeads.filter((lead) => convertedStatuses.includes(lead.status)).length / businessLeads.length * 100).toFixed(1)
    : 0;

  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [visibleLeadLimit, setVisibleLeadLimit] = useState(LEADS_COLUMN_PAGE_SIZE);
  const [newLeadData, setNewLeadData] = useState({ name: '', phone: '', origin: 'site', description: '' });
  
  const businessIdentifier = business?.publicId || 'business';
  
  const captureSettings = business?.captureSettings?.instaLink ? business.captureSettings : {
    instaLink: `${window.location.origin}/budget/${businessIdentifier}`,
    whatsLink: `${window.location.origin}/atendimento/${businessIdentifier}`
  };

    const handleConvertLead = async (lead) => {
    let client = clients.find(c => c.phone === lead.phone);

    if (!client) {
      client = await addClient({
        name: lead.name,
        phone: lead.phone,
        email: '',
        notes: `Lead convertida de ${lead.origin}. Bio: ${lead.description}`,
      });
    }

    const totalValue = 1000;
    const depositValue = totalValue * 0.2;
    const description = `Orçamento: ${lead.description}`;

    const existingPayment = payments.find(
      p => p.description === description
    );

    if (!existingPayment) {
      const paymentRecord = await addPayment({
        type: 'income',
        value: depositValue,
        description,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        category: 'Sinal',
      });

      await updateLead(lead.id, { ...lead, status: 'quoted', paymentId: paymentRecord.id, clientId: client.id });
      showToast('Orçamento gerado e vinculado ao cliente!');
    } else {
      await updateLead(lead.id, { ...lead, status: 'quoted', paymentId: existingPayment.id, clientId: client.id });
      showToast('Lead vinculada a orçamento existente.');
    }

    setSelectedLead(null);
  };
  const handleConfirmPayment = async (paymentId) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    setPayments(payments.map(p => p.id === paymentId ? { ...p, status: 'paid' } : p));

    if (payment.description.includes('Orçamento')) {
      const client = db.clients.get(payment.clientId);
      const pro = db.professionals.all()[0];
      if (!client || !pro) {
        showToast('Nao foi possivel localizar cliente/profissional para criar o agendamento.', 'error');
        return;
      }
      
      const newBooking = {
        clientId: client.id,
        professionalId: pro.id,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '14:00',
        duration: 3,
        project: payment.description.replace('Orçamento: ', ''),
        totalValue: payment.value / 0.2,
        deposit: payment.value,
        status: 'deposit_paid'
      };

      await addBooking(newBooking);
      setLeads(leads.map(l => l.paymentId === paymentId ? { ...l, status: 'converted' } : l));
      showToast('Sinal pago! Agendamento automático realizado.');
    }
  };

  const createBookingSchedule = async (lead) => {
    let clientId = lead.clientId;
    if (!clientId) {
      const existingClient = clients.find(c => c.phone === lead.phone);
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const createdClient = await addClient({
          name: lead.name,
          phone: lead.phone,
          email: '',
          notes: `Cliente criado automaticamente a partir da lead ${lead.id}.`,
        });
        clientId = createdClient.id;
      }
    }

    const professionalId = professionals[0]?.id;
    if (!professionalId) {
      showToast('Cadastre ao menos um profissional antes de agendar.', 'error');
      return;
    }

    const newBooking = {
      clientId,
      professionalId,
      project: lead.description || `${t('booking')} de ${t('service')}`,
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '14:00',
      duration: 3,
      totalValue: 0,
      deposit: 0,
      status: 'pending'
    };
    
    try {
      const createdBooking = await addBooking(newBooking);
      showToast(`${t('booking')} agendado com sucesso`);
      sendWhatsAppMessage(
        lead.phone,
        `Olá ${lead.name}\nSeu ${t('booking')} está confirmado para ${createdBooking.date} às ${createdBooking.time}.\nTe esperamos no ${t('business')}.`
      );
    } catch {
      showToast(`Erro ao agendar ${t('booking')}`, 'error');
    }
  };

  const runLeadAutomation = (lead, newStatus) => {
    if (newStatus === 'new') {
      sendWhatsAppMessage(lead.phone, `Olá ${lead.name}, recebemos sua solicitação e em breve entraremos em contato.`);
    } else if (newStatus === 'quoted') {
      handleConvertLead(lead).catch(() => {
        showToast('Nao foi possivel converter o lead.', 'error');
      });
      sendWhatsAppMessage(lead.phone, `Olá ${lead.name}, seu orçamento foi enviado. Assim que o sinal for confirmado, seu agendamento será realizado.`);
    } else if (newStatus === 'deposit_paid') {
      if (lead.paymentId) {
        handleConfirmPayment(lead.paymentId).catch(() => {
          showToast('Nao foi possivel confirmar pagamento e criar agendamento.', 'error');
        });
      } else {
        showToast('Aviso: Esta lead não possui fatura vinculada.');
      }
    } else if (newStatus === 'scheduled') {
      createBookingSchedule(lead);
    } else if (newStatus === 'completed') {
      showToast('Pós-atendimento iniciado! Enviando instruções...');
      sendWhatsAppMessage(lead.phone, `Obrigado por escolher nosso ${t('business')}. Seguem os cuidados pós ${t('service')}: siga as orientações e qualquer dúvida nos chame.`);
    } else {
      showToast(`Lead movida para ${newStatus}`);
    }
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const movedLead = leads.find(l => String(l.id) === draggableId);
    if (!movedLead) return;

    const newStatus = destination.droppableId;
    setLeads(prev => prev.map(l => String(l.id) === draggableId ? { ...l, status: newStatus } : l));
    updateLead(movedLead.id, { ...movedLead, status: newStatus }).catch(() => {
      showToast('Nao foi possivel salvar a etapa da lead.', 'error');
    });
    runLeadAutomation(movedLead, newStatus);
  };

  const handleCreateLead = async (event) => {
    event.preventDefault();
    if (!newLeadData.name || !newLeadData.phone) {
      showToast('Nome e WhatsApp sao obrigatorios.', 'error');
      return;
    }

    try {
      await addLead({
        name: newLeadData.name,
        phone: newLeadData.phone,
        origin: newLeadData.origin,
        project: newLeadData.description,
        notes: newLeadData.description,
        status: 'new',
      });
      setShowAddLeadModal(false);
      setNewLeadData({ name: '', phone: '', origin: 'site', description: '' });
    } catch {
      showToast('Nao foi possivel cadastrar a lead.', 'error');
    }
  };

  const handleOpenAddLeadModal = () => {
    setShowAddLeadModal(true);
  };

  return (
    <div className="leads-container">
      <div className="view-header">
        <h1><TrendingUp size={28} /> Captação de Clientes</h1>
        <div className="header-actions" style={HEADER_ACTIONS_STYLE}>
          <button
            type="button"
            className="btn-primary btn-sm lead-create-btn"
            onClick={handleOpenAddLeadModal}
          >
            <Plus size={18} /> Novo Lead
          </button>
        </div>
      </div>

      <div className="crm-stats-container">
        <div className="crm-compact-card">
          <span className="crm-stat-label">Leads</span>
          <span className="crm-stat-value">{businessLeads.length}</span>
        </div>
        <div className="crm-compact-card">
          <span className="crm-stat-label">Conversão</span>
          <span className="crm-stat-value">{conversionRate}%</span>
        </div>
        <div className="crm-compact-card crm-origins-card">
          <span className="crm-stat-label">Origens</span>
          <div className="crm-origin-list">
            {Object.entries(leadsByOrigin).map(([origin, count]) => (
              <div key={origin} className="crm-origin-tag">
                {origin}: <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {LEAD_COLUMNS.map(column => {
            const columnLeads = businessLeads.filter((lead) => {
              if (column.id === 'completed' && lead.status === 'converted') return true;
              return lead.status === column.id;
            });
            const visibleColumnLeads = columnLeads.slice(0, visibleLeadLimit);

            return (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided) => (
                  <div 
                    className="kanban-column"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h3>
                      {column.title}
                      <span className="column-count">{columnLeads.length}</span>
                    </h3>

                    <div className="column-content" style={COLUMN_CONTENT_STYLE}>
                      {columnLeads.length === 0 ? (
                        <div className="empty-state" style={EMPTY_COLUMN_STYLE}>
                          Vazio
                        </div>
                      ) : (
                        visibleColumnLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                                onClick={() => setSelectedLead(lead)}
                              >
                                <span className="card-name">{lead.name}</span>
                                <p className="card-description">{lead.description}</p>
                                
                                <div className="card-footer">
                                  <span className={`card-origin ${lead.origin || lead.source || 'sem-origem'}`}>
                                    {lead.origin || lead.source || 'sem origem'}
                                  </span>
                                  <span className="card-date">
                                    {new Date(lead.timestamp || lead.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                      {columnLeads.length > visibleLeadLimit ? (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => setVisibleLeadLimit((current) => current + LEADS_COLUMN_PAGE_SIZE)}
                        >
                          Mostrar mais ({columnLeads.length - visibleLeadLimit})
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes da Lead</h2>
              <button className="btn-icon" onClick={() => setSelectedLead(null)}><X /></button>
            </div>
            <div className="lead-detail">
              <div className="detail-item">
                <label>Nome</label>
                <div>{selectedLead.name}</div>
              </div>
              <div className="detail-item">
                <label>WhatsApp</label>
                <a 
                  href={`https://wa.me/55${selectedLead.phone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-link"
                  style={LEAD_PHONE_LINK_STYLE}
                >
                  <Phone size={14} /> {selectedLead.phone}
                </a>
              </div>
              <div className="detail-item">
                <label>Descrição do {t('service')}</label>
                <div className="quote-box">{selectedLead.description}</div>
              </div>
              
              <div className="modal-actions" style={MODAL_ACTIONS_MARGIN_TOP}>
                 <button className="btn-secondary" onClick={() => setSelectedLead(null)}>Fechar</button>
                 <button className="btn-primary" onClick={() => handleConvertLead(selectedLead).catch(() => showToast('Nao foi possivel converter o lead.', 'error'))}>
                    Converter em Cliente
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddLeadModal && (
        <div className="modal-overlay" onClick={() => setShowAddLeadModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo lead</h2>
              <button className="btn-icon" onClick={() => setShowAddLeadModal(false)}><X /></button>
            </div>
            <form onSubmit={handleCreateLead} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome</label>
                  <input type="text" value={newLeadData.name} onChange={(event) => setNewLeadData((prev) => ({ ...prev, name: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input type="text" value={newLeadData.phone} onChange={(event) => setNewLeadData((prev) => ({ ...prev, phone: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Origem</label>
                  <select value={newLeadData.origin} onChange={(event) => setNewLeadData((prev) => ({ ...prev, origin: event.target.value }))}>
                    <option value="site">Site</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="indicacao">Indicacao</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Interesse do cliente</label>
                  <textarea value={newLeadData.description} onChange={(event) => setNewLeadData((prev) => ({ ...prev, description: event.target.value }))} placeholder="Descreva o servico solicitado" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddLeadModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="section-grid" style={SECTION_GRID_MARGIN_TOP}>
        <div className="section-card">
          <div className="section-header">
            <h2>Links de Atendimento</h2>
          </div>
          <div className="links-tool">
            <p className="subtitle">Links para suas redes sociais:</p>
            <div className="link-item">
              <div className="link-label">Instagram Bio</div>
              <div className="link-copy-group">
                <input type="text" readOnly value={captureSettings.instaLink} />
                <button className="btn-icon" onClick={() => { navigator.clipboard.writeText(captureSettings.instaLink); showToast('Copiado!'); }}><FileText size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


