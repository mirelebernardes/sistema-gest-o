import React, { useEffect, useState } from 'react';
import { Camera, Check, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useBusinessContext } from '../context/BusinessContext';
import api from '../lib/api.js';

export default function PublicLeadForm({ origin = 'site', publicBusinessId = null }) {
  const { addLead, business, showToast, t } = useBusinessContext();
  const { id: routeBusinessId } = useParams();
  const targetPublicBusinessId = publicBusinessId || routeBusinessId || null;
  const [biz, setBiz] = useState(business || { name: t('managementSystem') });
  const [loading, setLoading] = useState(!!targetPublicBusinessId && !business);
  const [sent, setSent] = useState(false);
  const [leadData, setLeadData] = useState({
    name: '',
    phone: '',
    description: '',
    size: '',
    bodyLocation: '',
    origin,
  });

  useEffect(() => {
    if (!targetPublicBusinessId) return undefined;

    const fetchBusiness = async () => {
      try {
        const { data } = await api.get(`/business/public/${targetPublicBusinessId}`);
        setBiz(data);
      } catch (error) {
        console.error('Erro ao buscar negocio publico:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
    return undefined;
  }, [targetPublicBusinessId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (targetPublicBusinessId) {
        await api.post(`/leads/public/${targetPublicBusinessId}`, leadData);
      } else {
        await addLead(leadData);
      }

      setSent(true);
    } catch {
      showToast(t('error_sending_request'), 'error');
    }
  };

  if (sent) {
    return (
      <div className="public-form-success">
        <div className="success-icon"><Check size={48} /></div>
        <h2>{t('request_sent')}!</h2>
        <p>{t('thanks')}, <strong>{leadData.name}</strong>. {t('contact_soon_wa')}</p>
        <button type="button" className="btn-primary" onClick={() => setSent(false)}>{t('send_another')}</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="public-form-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="public-form-container">
      <div className="public-form-header">
        <h1>{biz.name}</h1>
        <p>{t('request_budget_now')}</p>
      </div>

      <form onSubmit={handleSubmit} className="public-lead-form">
        <div className="form-group">
          <label>{t('what_is_your_name')}?</label>
          <input
            type="text"
            required
            value={leadData.name}
            onChange={(event) => setLeadData((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={t('full_name')}
          />
        </div>

        <div className="form-group">
          <label>WhatsApp / {t('phone')}</label>
          <input
            type="tel"
            required
            value={leadData.phone}
            onChange={(event) => setLeadData((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="form-group">
          <label>{t('describe_your_idea')}?</label>
          <textarea
            required
            value={leadData.description}
            onChange={(event) => setLeadData((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={t('idea_placeholder')}
          />
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Tamanho aproximado</label>
            <input
              type="text"
              value={leadData.size}
              onChange={(event) => setLeadData((prev) => ({ ...prev, size: event.target.value }))}
              placeholder="Ex.: 15 cm"
            />
          </div>
          <div className="form-group">
            <label>Local do corpo ou area</label>
            <input
              type="text"
              value={leadData.bodyLocation}
              onChange={(event) => setLeadData((prev) => ({ ...prev, bodyLocation: event.target.value }))}
              placeholder="Ex.: antebraco, rosto, unhas"
            />
          </div>
        </div>

        <div className="form-group">
          <label>{t('reference_image')} ({t('optional')})</label>
          <div className="upload-placeholder">
            <Camera size={24} />
            <span>{t('tap_to_attach_photos')}</span>
          </div>
        </div>

        <button type="submit" className="btn-primary btn-large" style={{ width: '100%', marginTop: 20 }}>
          {t('request_budget')} <ChevronRight size={18} />
        </button>
      </form>

      <div className="public-footer">
        <p>&copy; 2026 - {biz.name}</p>
      </div>
    </div>
  );
}
