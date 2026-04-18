import React, { useState } from 'react';

import { useBusinessContext } from '../context/BusinessContext';
import SignatureCanvas from './SignatureCanvas';

export default function ConsentModule({ client, onSave }) {
  const { t } = useBusinessContext();

  const [signature, setSignature] = useState(null);
  const [checks, setChecks] = useState({
    major: false,
    risks: false,
    aftercare: false,
    responsibility: false,
  });

  const canSign = checks.major && checks.risks && checks.aftercare && checks.responsibility;

  const handleSave = () => {
    const consentRecord = {
      id: Date.now(),
      clientId: client.id,
      timestamp: new Date().toISOString(),
      clientName: client.name,
      signature,
      deviceId: navigator.userAgent,
      checks,
    };
    onSave(consentRecord);
  };

  return (
    <div className="consent-module">
      <div className="consent-text">
        <h3>Termo de Consentimento e Responsabilidade</h3>
        <p>
          Eu, <strong>{client.name}</strong>, autorizo a realização do procedimento de {t('service')} em meu corpo.
          Declaro estar ciente dos riscos inerentes ao procedimento, incluindo possíveis reações alérgicas,
          infecções se as orientações de pós-procedimento não forem seguidas, e a permanência do trabalho na pele.
        </p>

        <div className="mandatory-checks">
          <div className="checkbox-group">
            <input type="checkbox" id="check-major" checked={checks.major} onChange={(event) => setChecks({ ...checks, major: event.target.checked })} />
            <label htmlFor="check-major">Confirmo que sou maior de idade (18+ anos).</label>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" id="check-risks" checked={checks.risks} onChange={(event) => setChecks({ ...checks, risks: event.target.checked })} />
            <label htmlFor="check-risks">Estou ciente dos riscos e complicações possíveis.</label>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" id="check-aftercare" checked={checks.aftercare} onChange={(event) => setChecks({ ...checks, aftercare: event.target.checked })} />
            <label htmlFor="check-aftercare">Comprometo-me a seguir todas as orientações pós-procedimento.</label>
          </div>
          <div className="checkbox-group">
            <input type="checkbox" id="check-resp" checked={checks.responsibility} onChange={(event) => setChecks({ ...checks, responsibility: event.target.checked })} />
            <label htmlFor="check-resp">Assumo total responsabilidade pela decisão de realizar o serviço.</label>
          </div>
        </div>
      </div>

      {canSign && !signature && (
        <div className="signature-section">
          <label>Assinatura Digital (desenhe abaixo)</label>
          <SignatureCanvas onSave={setSignature} />
        </div>
      )}

      {signature && (
        <div className="signature-preview">
          <label>Assinatura capturada:</label>
          <img src={signature} alt="Assinatura" style={{ background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }} />
          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button type="button" className="btn-secondary" onClick={() => setSignature(null)}>Refazer</button>
            <button type="button" className="btn-primary" onClick={handleSave}>Finalizar e salvar termo</button>
          </div>
        </div>
      )}

      {!canSign && !signature && <div className="info-box">Marque todos os itens obrigatórios para habilitar a assinatura.</div>}
    </div>
  );
}
