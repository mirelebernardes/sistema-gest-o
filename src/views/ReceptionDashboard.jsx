import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  Check,
  DollarSign,
  Plus,
  Receipt,
  UserRound,
  X,
} from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import { APP_ROUTES } from '../utils/appRoutes';
import { formatCurrency } from '../utils/formatters';

function StatusBadge({ status, label }) {
  const palette = {
    pending: { background: 'var(--warning-soft)', color: 'var(--warning)' },
    confirmed: { background: 'var(--primary-soft)', color: 'var(--primary)' },
    deposit_paid: { background: 'var(--success-soft)', color: 'var(--success)' },
    completed: { background: 'var(--secondary)', color: 'var(--text-primary)' },
  };

  const current = palette[status] || palette.pending;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '0.3rem 0.65rem',
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        backgroundColor: current.background,
        color: current.color,
      }}
    >
      {label}
    </span>
  );
}

export default function ReceptionDashboard() {
  const {
    bookings,
    clients,
    professionals,
    showToast,
    updateBooking,
    addPayment,
    t,
  } = useBusinessContext();
  const navigate = useNavigate();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const todayStr = new Date().toISOString().split('T')[0];

  const todayBookings = useMemo(() => (
    bookings
      .filter((booking) => booking.date === todayStr)
      .sort((a, b) => a.time.localeCompare(b.time))
  ), [bookings, todayStr]);

  const metrics = useMemo(() => {
    const totalCount = todayBookings.length;
    const checkIns = todayBookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed').length;
    const totalValue = todayBookings.reduce((sum, booking) => sum + Number(booking.totalValue || 0), 0);
    const pendingValue = todayBookings
      .filter((booking) => booking.status !== 'completed')
      .reduce((sum, booking) => sum + Number(booking.totalValue || 0), 0);

    return { totalCount, checkIns, totalValue, pendingValue };
  }, [todayBookings]);

  const getClientName = (id) => clients.find((client) => client.id === id)?.name || 'Cliente';
  const getProfessionalName = (id) => professionals.find((professional) => professional.id === id)?.name || t('professional');

  const getStatusLabel = (status) => {
    if (status === 'pending') return t('pending');
    if (status === 'confirmed') return t('confirmed');
    if (status === 'deposit_paid') return t('statusDepositPaid');
    if (status === 'completed') return t('completed');
    return 'Em aberto';
  };

  const isBookingDelayed = (booking) => {
    if (!booking?.time || booking.status === 'completed') return false;
    const now = new Date();
    const [hours, minutes] = booking.time.split(':').map(Number);
    const bookingDate = new Date();
    bookingDate.setHours(hours, minutes, 0, 0);
    return bookingDate < now && booking.date === todayStr;
  };

  const handleCheckIn = async (booking) => {
    try {
      await updateBooking(booking.id, { status: 'confirmed' });
      showToast(`Check-in realizado para ${getClientName(booking.clientId)}.`, 'success');
    } catch {
      showToast('Nao foi possivel confirmar o check-in.', 'error');
    }
  };

  const handleReceivePayment = async () => {
    if (!selectedBooking) return;

    try {
      await addPayment({
        clientId: selectedBooking.clientId,
        bookingId: selectedBooking.id,
        professionalId: selectedBooking.professionalId,
        value: selectedBooking.totalValue,
        method: paymentMethod,
        type: 'income',
        status: 'paid',
        category: t('service'),
        description: selectedBooking.project || 'Atendimento',
        date: todayStr,
      });

      await updateBooking(selectedBooking.id, { status: 'completed' });
      setPaymentModalOpen(false);
      setSelectedBooking(null);
      setPaymentMethod('pix');
      showToast('Pagamento registrado e agendamento finalizado.', 'success');
    } catch {
      showToast(t('error_payment'), 'error');
    }
  };

  const summaryCards = [
    {
      label: 'Agendamentos do dia',
      value: metrics.totalCount,
      helper: 'Compromissos previstos para hoje',
      icon: Calendar,
      color: 'var(--primary)',
    },
    {
      label: 'Check-ins realizados',
      value: metrics.checkIns,
      helper: 'Atendimentos ja confirmados',
      icon: Check,
      color: 'var(--success)',
    },
    {
      label: 'Recebimentos pendentes',
      value: formatCurrency(metrics.pendingValue),
      helper: 'Valor ainda em aberto hoje',
      icon: AlertCircle,
      color: 'var(--warning)',
    },
    {
      label: 'Faturamento previsto',
      value: formatCurrency(metrics.totalValue),
      helper: 'Total estimado para o dia',
      icon: DollarSign,
      color: 'var(--primary)',
    },
  ];

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header" style={{ marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 className="view-title">Operacao da recepcao</h1>
          <p className="view-subtitle">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate(APP_ROUTES.clients)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} /> Novo cliente
          </button>
          <button className="btn-secondary" onClick={() => navigate(APP_ROUTES.schedule)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} /> Abrir agenda
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div
              className="stat-icon"
              style={{
                backgroundColor: `color-mix(in srgb, ${card.color} 16%, transparent)`,
                color: card.color,
              }}
            >
              <card.icon size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-label">{card.label}</span>
              <span className="stat-value">{card.value}</span>
              <span className="stat-change">{card.helper}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Agenda do dia</h3>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>Fluxo operacional com check-in e recebimento rapido.</p>
          </div>
          <button className="btn-text" onClick={() => navigate(APP_ROUTES.schedule)}>Ver agenda completa</button>
        </div>

        {todayBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
            <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.35 }} />
            <p>Nenhum agendamento para hoje.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {todayBookings.map((booking) => {
              const delayed = isBookingDelayed(booking);
              return (
                <div
                  key={booking.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1.15rem 1.25rem',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: '12px',
                    border: `1px solid ${delayed ? 'var(--danger)' : 'var(--border-color)'}`,
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{booking.time}</div>
                    {delayed && <div style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 700, marginTop: '0.25rem' }}>Atrasado</div>}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{getClientName(booking.clientId)}</strong>
                      <StatusBadge status={booking.status} label={getStatusLabel(booking.status)} />
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <UserRound size={14} /> {getProfessionalName(booking.professionalId)}
                      </span>
                      <span>{booking.project || 'Servico'}</span>
                      <span>{formatCurrency(booking.totalValue)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {booking.status === 'pending' && (
                      <button className="btn-primary" onClick={() => handleCheckIn(booking)} style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}>
                        <Check size={14} /> Check-in
                      </button>
                    )}
                    {booking.status !== 'completed' && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setPaymentModalOpen(true);
                        }}
                        style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', gap: '0.4rem' }}
                      >
                        <Receipt size={14} /> Receber
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Check size={16} /> Finalizado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {paymentModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.75rem', position: 'relative' }}>
            <button type="button" onClick={() => setPaymentModalOpen(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={20} style={{ color: 'var(--primary-color)' }} /> Recebimento rapido
            </h3>

            <div style={{ padding: '1rem', borderRadius: '10px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cliente: {getClientName(selectedBooking?.clientId)}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.45rem' }}>{formatCurrency(selectedBooking?.totalValue)}</div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Forma de pagamento</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {['pix', 'credito', 'dinheiro'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      padding: '0.75rem 0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: paymentMethod === method ? 'var(--primary)' : 'var(--bg-primary)',
                      color: paymentMethod === method ? 'var(--primary-foreground)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={handleReceivePayment} className="btn-primary" style={{ width: '100%', padding: '1rem', fontWeight: 700 }}>
              Confirmar recebimento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
