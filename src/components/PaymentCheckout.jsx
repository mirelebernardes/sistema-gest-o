import React, { useState } from 'react';
import { Activity, CreditCard, FileText, Loader2, QrCode } from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import { formatCurrency } from '../utils/formatters';

export default function PaymentCheckout({ bill, onConfirm }) {
  const { setBookings, showToast, t } = useBusinessContext();
  const [method, setMethod] = useState('pix');
  const [processing, setProcessing] = useState(false);

  if (!bill) {
    return (
      <div className="checkout-container">
        <div className="checkout-card">
          <div className="empty-state">Cobranca nao encontrada.</div>
        </div>
      </div>
    );
  }

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText('00020126580014br.gov.bcb.pix...');
      showToast(t('copied'), 'success');
    } catch {
      showToast('Nao foi possivel copiar o codigo Pix.', 'error');
    }
  };

  const handleSimulatePayment = () => {
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      onConfirm?.(bill.id);

      if (bill.bookingId) {
        setBookings((prev) => prev.map((booking) => (
          booking.id === bill.bookingId
            ? { ...booking, status: booking.status === 'pending' ? 'deposit_paid' : 'completed' }
            : booking
        )));
      }

      showToast(t('payment_confirmed_msg'), 'success');
    }, 1800);
  };

  return (
    <div className="checkout-container">
      <div className="checkout-card">
        <div className="checkout-header">
          <h2>{t('finalize_payment')}</h2>
          <div className="bill-amount">{formatCurrency(bill.value || 0)}</div>
        </div>

        <div className="payment-methods-toggle">
          <button type="button" className={`method-btn ${method === 'pix' ? 'active' : ''}`} onClick={() => setMethod('pix')}>
            <QrCode size={16} /> Pix
          </button>
          <button type="button" className={`method-btn ${method === 'card' ? 'active' : ''}`} onClick={() => setMethod('card')}>
            <CreditCard size={16} /> {t('card')}
          </button>
        </div>

        {method === 'pix' ? (
          <div className="pix-section">
            <div className="qr-placeholder" style={{ background: 'var(--muted)', borderRadius: 18, display: 'grid', placeItems: 'center', minHeight: 240, position: 'relative' }}>
              <Activity size={120} color="var(--primary-color)" />
              <div className="qr-overlay" style={{ position: 'absolute', fontWeight: 800, fontSize: 24 }}>PIX</div>
            </div>
            <p>{t('scan_qr_to_pay')}</p>
            <div className="pix-copy-box">
              <code>00020126580014br.gov.bcb.pix...</code>
              <button type="button" className="btn-icon" onClick={handleCopyPix}>
                <FileText size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="card-section">
            <div className="form-group">
              <label>{t('card_number')}</label>
              <input type="text" placeholder="**** **** **** ****" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>{t('expiry')}</label>
                <input type="text" placeholder="MM/AA" />
              </div>
              <div className="form-group">
                <label>CVV</label>
                <input type="text" placeholder="***" />
              </div>
            </div>
            <div className="form-group">
              <label>{t('card_name')}</label>
              <input type="text" placeholder={t('as_on_card')} />
            </div>
          </div>
        )}

        <button type="button" className="btn-primary checkout-btn" onClick={handleSimulatePayment} disabled={processing}>
          {processing ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Processando...
            </>
          ) : (
            t('confirm_payment_sim')
          )}
        </button>

        <p className="checkout-footer-text">{t('transaction_secure_wa')}</p>
      </div>
    </div>
  );
}
