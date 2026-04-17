import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Edit, MessageCircle, Plus, Users, X } from 'lucide-react';

import PaginationControls from '../components/PaginationControls';
import { useBusinessContext } from '../context/BusinessContext';
import { formatCurrency, formatShortDate } from '../utils/formatters';

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const BOOKINGS_PAGE_SIZE = 12;

function parseDateValue(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(value) {
  const date = parseDateValue(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameDay(dateString, date) {
  const dateKey = toDateKey(date);
  return !!dateString && !!dateKey && dateString === dateKey;
}

function formatDateLabel(value, options, fallback = 'Data não informada') {
  const date = parseDateValue(value);
  if (!date) return fallback;
  return date.toLocaleDateString('pt-BR', options);
}

function getStatusLabel(status) {
  if (status === 'quote') return 'Orçamento';
  if (status === 'completed') return 'Concluído';
  if (status === 'deposit_paid') return 'Sinal pago';
  return 'Pendente';
}

export default function ScheduleView() {
  const {
    addBooking,
    bookings,
    business,
    clients,
    professionals,
    showToast,
    t,
    updateBooking,
  } = useBusinessContext();

  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingForm, setBookingForm] = useState({
    clientId: '',
    professionalId: '',
    date: toDateKey(today),
    time: '10:00',
    duration: 1,
    project: '',
    totalValue: '',
    deposit: '',
    paymentMethod: 'pix',
    type: 'session',
  });

  const safeSelectedDate = useMemo(() => parseDateValue(selectedDate) || today, [selectedDate, today]);
  const selectedDateKey = useMemo(() => toDateKey(safeSelectedDate), [safeSelectedDate]);
  const selectedDateTitle = useMemo(
    () => formatDateLabel(safeSelectedDate, { weekday: 'long', day: 'numeric', month: 'long' }),
    [safeSelectedDate],
  );
  const selectedMonthTitle = useMemo(
    () => formatDateLabel(safeSelectedDate, { month: 'long', year: 'numeric' }),
    [safeSelectedDate],
  );

  const dayBookings = useMemo(
    () => bookings
      .filter((booking) => sameDay(booking.date, safeSelectedDate))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
    [bookings, safeSelectedDate],
  );

  const safeBookingsPage = Math.min(
    bookingsPage,
    Math.max(1, Math.ceil(dayBookings.length / BOOKINGS_PAGE_SIZE)),
  );

  const paginatedDayBookings = useMemo(
    () => dayBookings.slice((safeBookingsPage - 1) * BOOKINGS_PAGE_SIZE, safeBookingsPage * BOOKINGS_PAGE_SIZE),
    [dayBookings, safeBookingsPage],
  );

  const currentBusinessId = Number(business?.id || 0);

  const availableClients = useMemo(
    () => clients.filter((client) => !currentBusinessId || Number(client.businessId) === currentBusinessId),
    [clients, currentBusinessId],
  );

  const availableProfessionals = useMemo(
    () => professionals.filter((professional) => !currentBusinessId || Number(professional.businessId) === currentBusinessId),
    [currentBusinessId, professionals],
  );

  const monthDays = useMemo(() => {
    const firstDay = new Date(safeSelectedDate.getFullYear(), safeSelectedDate.getMonth(), 1);
    const lastDay = new Date(safeSelectedDate.getFullYear(), safeSelectedDate.getMonth() + 1, 0);
    const prefix = firstDay.getDay();
    const total = 42;
    const days = [];

    for (let index = prefix - 1; index >= 0; index -= 1) {
      days.push(new Date(safeSelectedDate.getFullYear(), safeSelectedDate.getMonth(), -index));
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(safeSelectedDate.getFullYear(), safeSelectedDate.getMonth(), day));
    }

    while (days.length < total) {
      days.push(new Date(safeSelectedDate.getFullYear(), safeSelectedDate.getMonth() + 1, days.length - lastDay.getDate() - prefix + 1));
    }

    return days;
  }, [safeSelectedDate]);

  const checkConflict = (payload) => {
    const start = new Date(`${payload.date}T${payload.time}`);
    const end = new Date(start.getTime() + Number(payload.duration || 1) * 60 * 60 * 1000);

    return bookings.some((booking) => {
      if (editingId && booking.id === editingId) return false;
      if (Number(booking.professionalId) !== Number(payload.professionalId) || booking.date !== payload.date) return false;

      const bookingStart = new Date(`${booking.date}T${booking.time}`);
      const bookingEnd = new Date(bookingStart.getTime() + Number(booking.duration || 1) * 60 * 60 * 1000);
      return start < bookingEnd && end > bookingStart;
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setBookingForm({
      clientId: '',
      professionalId: '',
      date: selectedDateKey,
      time: '10:00',
      duration: 1,
      project: '',
      totalValue: '',
      deposit: '',
      paymentMethod: 'pix',
      type: 'session',
    });
  };

  const openNewBooking = () => {
    resetForm();
    setShowBookingModal(true);
  };

  const openEditBooking = (booking) => {
    setEditingId(booking.id);
    setBookingForm({
      clientId: String(booking.clientId || ''),
      professionalId: String(booking.professionalId || ''),
      date: toDateKey(booking.date) || selectedDateKey,
      time: booking.time || '10:00',
      duration: Number(booking.duration || 1),
      project: booking.project || '',
      totalValue: booking.totalValue || '',
      deposit: booking.deposit || '',
      paymentMethod: booking.method || 'pix',
      type: booking.status === 'quote' ? 'quote' : 'session',
    });
    setShowBookingModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!bookingForm.clientId || !bookingForm.professionalId || !bookingForm.date || !bookingForm.time || !bookingForm.project) {
      showToast('Preencha os campos obrigatórios.', 'error');
      return;
    }

    if (checkConflict(bookingForm)) {
      showToast(`Já existe um horário ocupado para este ${t('professional')}.`, 'error');
      return;
    }

    const payload = {
      clientId: Number(bookingForm.clientId),
      professionalId: Number(bookingForm.professionalId),
      date: bookingForm.date,
      time: bookingForm.time,
      duration: Number(bookingForm.duration || 1),
      project: bookingForm.project,
      totalValue: Number(bookingForm.totalValue || 0),
      deposit: Number(bookingForm.deposit || 0),
      method: bookingForm.paymentMethod,
      status: bookingForm.type === 'quote' ? 'quote' : 'pending',
    };

    const hasValidClient = availableClients.some((client) => Number(client.id) === payload.clientId);
    const hasValidProfessional = availableProfessionals.some(
      (professional) => Number(professional.id) === payload.professionalId,
    );

    if (!hasValidClient || !hasValidProfessional) {
      showToast('Cliente ou profissional inválido para este negócio. Atualize a tela e tente novamente.', 'error');
      return;
    }

    try {
      if (editingId) {
        await updateBooking(editingId, payload);
      } else {
        await addBooking(payload);
      }
      setShowBookingModal(false);
      resetForm();
    } catch (err) {
      showToast(err.response?.data?.error || 'Não foi possível salvar o agendamento.', 'error');
    }
  };

  return (
    <div className="schedule-container">
      <div className="view-header">
        <h1><Calendar size={28} /> Agenda</h1>
        <button type="button" className="btn-primary" onClick={openNewBooking}>
          <Plus size={18} /> Novo agendamento
        </button>
      </div>

      {showBookingModal && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar agendamento' : 'Novo agendamento'}</h2>
              <button type="button" className="btn-icon" onClick={() => setShowBookingModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Cliente</label>
                  <select value={bookingForm.clientId} onChange={(event) => setBookingForm((prev) => ({ ...prev, clientId: event.target.value }))}>
                    <option value="">Selecione</option>
                    {availableClients.map((client) => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('professional')}</label>
                  <select value={bookingForm.professionalId} onChange={(event) => setBookingForm((prev) => ({ ...prev, professionalId: event.target.value }))}>
                    <option value="">Selecione</option>
                    {availableProfessionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>{professional.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" value={bookingForm.date} onChange={(event) => setBookingForm((prev) => ({ ...prev, date: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <input type="time" value={bookingForm.time} onChange={(event) => setBookingForm((prev) => ({ ...prev, time: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Duração (h)</label>
                  <input type="number" min="1" value={bookingForm.duration} onChange={(event) => setBookingForm((prev) => ({ ...prev, duration: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={bookingForm.type} onChange={(event) => setBookingForm((prev) => ({ ...prev, type: event.target.value }))}>
                    <option value="session">Agendamento</option>
                    <option value="quote">Orçamento</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Descrição do serviço</label>
                  <input type="text" value={bookingForm.project} onChange={(event) => setBookingForm((prev) => ({ ...prev, project: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Valor total</label>
                  <input type="number" min="0" value={bookingForm.totalValue} onChange={(event) => setBookingForm((prev) => ({ ...prev, totalValue: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Sinal</label>
                  <input type="number" min="0" value={bookingForm.deposit} onChange={(event) => setBookingForm((prev) => ({ ...prev, deposit: event.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Forma de pagamento</label>
                  <select value={bookingForm.paymentMethod} onChange={(event) => setBookingForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}>
                    <option value="pix">Pix</option>
                    <option value="credit">Cartão de crédito</option>
                    <option value="debit">Cartão de débito</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowBookingModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingId ? 'Salvar alterações' : 'Confirmar agendamento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="schedule-layout schedule-layout-refined">
        <div className="calendar-section section-card">
          <div className="calendar-header">
            <button type="button" className="btn-icon" onClick={() => setSelectedDate(new Date(safeSelectedDate.getFullYear(), safeSelectedDate.getMonth() - 1, 1))}>
              <ChevronLeft size={18} />
            </button>
            <h2>{selectedMonthTitle}</h2>
            <button type="button" className="btn-icon" onClick={() => setSelectedDate(new Date(safeSelectedDate.getFullYear(), safeSelectedDate.getMonth() + 1, 1))}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {WEEK_DAYS.map((day) => <div key={day} className="weekday">{day}</div>)}
            </div>
            <div className="calendar-days">
              {monthDays.map((day) => {
                const currentMonth = day.getMonth() === safeSelectedDate.getMonth();
                const isToday = sameDay(toDateKey(day), today);
                const isSelected = sameDay(toDateKey(day), safeSelectedDate);
                const hasBookings = bookings.some((booking) => sameDay(booking.date, day));

                return (
                  <button
                    key={`${day.toISOString()}-${currentMonth}`}
                    type="button"
                    className={`calendar-day ${currentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasBookings ? 'has-appointments' : ''}`}
                    onClick={() => setSelectedDate(day)}
                  >
                    {day.getDate()}
                    {hasBookings && <span className="appointment-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="timeline-section schedule-panel">
          <div className="schedule-day-summary">
            <div className="timeline-header schedule-day-summary-header">
              <div>
                <span className="schedule-eyebrow">Dia selecionado</span>
                <h2>{selectedDateTitle}</h2>
                <p>
                  {dayBookings.length === 0 ? 'Nenhum compromisso para esta data.' : `${dayBookings.length} compromisso(s) programado(s).`}
                </p>
              </div>
              <div className="timeline-stats">
                {formatShortDate(safeSelectedDate)}
              </div>
            </div>
          </div>

          <div className="timeline schedule-list">
            {dayBookings.length === 0 ? (
              <div className="empty-state schedule-empty-state">Escolha um dia com agendamentos ou crie um novo compromisso.</div>
            ) : (
              paginatedDayBookings.map((booking) => (
                <div key={booking.id} className={`section-card schedule-card schedule-card-refined ${booking.status === 'quote' ? 'quote-style' : ''}`}>
                  <div className="schedule-card-main">
                    <div className="schedule-card-content">
                      <div className="schedule-card-title-row">
                        <strong>{booking.project || t('booking')}</strong>
                        <span className="status-badge">{getStatusLabel(booking.status)}</span>
                      </div>
                      <div className="schedule-card-meta">
                        <span><Clock size={14} /> {booking.time || 'Horário não informado'} ({booking.duration || 1}h)</span>
                        <span><Users size={14} /> {booking.clientName || availableClients.find((client) => client.id === booking.clientId)?.name || 'Cliente'}</span>
                      </div>
                      <div className="schedule-card-professional">
                        {booking.professionalName || availableProfessionals.find((professional) => professional.id === booking.professionalId)?.name || t('professional')}
                      </div>
                    </div>

                    <div className="schedule-card-side">
                      <strong>{formatCurrency(booking.totalValue || 0)}</strong>
                      <div className="schedule-card-actions">
                        <button type="button" className="btn-secondary btn-sm" onClick={() => openEditBooking(booking)}>
                          <Edit size={14} /> Editar
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            const phone = booking.clientPhone || availableClients.find((client) => client.id === booking.clientId)?.phone || '';
                            if (!phone) {
                              showToast('Cliente sem telefone cadastrado.', 'error');
                              return;
                            }
                            const message = `Olá! Confirmando seu agendamento para ${formatShortDate(booking.date)} às ${booking.time || 'horário combinado'} em ${business?.name || 'nosso negócio'}.`;
                            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <PaginationControls
            page={safeBookingsPage}
            pageSize={BOOKINGS_PAGE_SIZE}
            totalItems={dayBookings.length}
            onPageChange={setBookingsPage}
            label="agendamentos"
          />
        </div>
      </div>
    </div>
  );
}

