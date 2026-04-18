import React, { useState } from 'react';
import { Check } from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import SignaturePad from './SignaturePad';

export default function AnamnesisModule({ client, initialData, onUpdate }) {
  const { t } = useBusinessContext();

  const [formData, setFormData] = useState(initialData || {
    allergies: { has: false, desc: '' },
    diabetes: false,
    heartProblems: false,
    skinDiseases: false,
    medications: { has: false, desc: '' },
    previousReactions: { has: false, desc: '' },
    pregnancy: false,
    breastfeeding: false,
    hemophilia: false,
    hepatite: false,
    hiv: false,
    alcohol24h: false,
    anticoagulants: false,
    artistNotes: '',
    signature: null,
    clientId: client.id,
    timestamp: new Date().toISOString(),
  });

  const isHighRisk = formData.diabetes || formData.heartProblems || formData.skinDiseases || formData.hemophilia || formData.hepatite || formData.hiv;

  return (
    <div className="anamnesis-form">
      <div className={`risk-indicator ${isHighRisk ? 'high' : 'low'}`}>
        {isHighRisk ? 'ALTO RISCO: Condições médicas detectadas' : 'Baixo risco detectado'}
      </div>

      <div className="form-sections-grid" style={{ display: 'flex', gap: '24px' }}>
        <div className="anamnesis-section" style={{ flex: 1 }}>
          <h4>Condições de Saúde</h4>
          <div className="checkbox-grid">
            {[
              { id: 'diabetes', label: 'Diabetes' },
              { id: 'heartProblems', label: 'Problemas Cardíacos' },
              { id: 'skinDiseases', label: 'Doenças de Pele' },
              { id: 'pregnancy', label: 'Gravidez' },
              { id: 'breastfeeding', label: 'Amamentação' },
              { id: 'hemophilia', label: 'Hemofilia' },
              { id: 'hepatite', label: 'Hepatite' },
              { id: 'hiv', label: 'HIV' },
              { id: 'alcohol24h', label: 'Consumo de Álcool (24h)' },
              { id: 'anticoagulants', label: 'Uso de Anticoagulantes' },
            ].map((item) => (
              <div key={item.id} className="checkbox-group">
                <input
                  type="checkbox"
                  id={item.id}
                  checked={formData[item.id] || false}
                  onChange={(event) => setFormData({ ...formData, [item.id]: event.target.checked })}
                />
                <label htmlFor={item.id}>{item.label}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="anamnesis-section" style={{ flex: 1 }}>
          <h4>Detalhes Específicos</h4>
          {[
            { id: 'allergies', label: 'Alergias' },
            { id: 'medications', label: 'Medicamentos Contínuos' },
            { id: 'previousReactions', label: `Reação a ${t('service')}s antigos` },
          ].map((item) => (
            <div key={item.id} className="expanded-input">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id={item.id}
                  checked={formData[item.id]?.has || false}
                  onChange={(event) => setFormData({ ...formData, [item.id]: { ...formData[item.id], has: event.target.checked } })}
                />
                <label htmlFor={item.id}>{item.label}</label>
              </div>
              {formData[item.id]?.has && (
                <input
                  type="text"
                  placeholder="Especifique..."
                  value={formData[item.id]?.desc || ''}
                  onChange={(event) => setFormData({ ...formData, [item.id]: { ...formData[item.id], desc: event.target.value } })}
                />
              )}
            </div>
          ))}

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Observações do {t('professional')}</label>
            <textarea
              value={formData.artistNotes || ''}
              onChange={(event) => setFormData({ ...formData, artistNotes: event.target.value })}
              placeholder="Notas sobre a saúde ou recomendações..."
            />
          </div>
        </div>
      </div>

      <div className="signature-section" style={{ marginTop: '24px' }}>
        <SignaturePad
          onSave={(sig) => setFormData((prev) => ({ ...prev, signature: sig }))}
          initialSignature={formData.signature}
        />
      </div>

      <button
        className="btn-primary"
        onClick={() => onUpdate(formData)}
        style={{ width: '100%', marginTop: '30px', height: '50px', fontSize: '16px' }}
      >
        <Check size={20} /> Salvar Anamnese Efetivada
      </button>
    </div>
  );
}
