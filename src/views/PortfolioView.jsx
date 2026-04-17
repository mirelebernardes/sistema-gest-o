import React, { useEffect, useMemo, useState } from 'react';
import { Camera, MessageCircle, Share2, Trash2, Upload, Users, X } from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';

function normalize(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function PortfolioView() {
  const {
    business,
    deletePortfolioItem,
    portfolio,
    professionals,
    showToast,
    t,
    uploadPortfolioFile,
  } = useBusinessContext();

  const [filterStyle, setFilterStyle] = useState('all');
  const [filterProfessional, setFilterProfessional] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [uploadData, setUploadData] = useState({
    professionalId: '',
    professionalName: '',
    style: 'Geral',
    region: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => () => {
    selectedMedia.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, [selectedMedia]);

  const filteredPortfolio = useMemo(
    () => portfolio
      .filter((item) => {
        const matchStyle = filterStyle === 'all' || normalize(item.style) === normalize(filterStyle);
        const matchProfessional = filterProfessional === 'all' || Number(item.professionalId) === Number(filterProfessional);
        return matchStyle && matchProfessional;
      })
      .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)),
    [filterProfessional, filterStyle, portfolio],
  );

  const handleFileChange = (files) => {
    const nextFiles = Array.from(files || []);
    if (nextFiles.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    const validFiles = nextFiles
      .filter((file) => {
        const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (!allowedTypes.includes(file.type)) {
          showToast(`Formato nao suportado: ${file.name}`, 'error');
          return false;
        }
        if (file.size > maxSize) {
          showToast(`Arquivo acima do limite: ${file.name}`, 'error');
          return false;
        }
        return true;
      })
      .slice(0, 10 - selectedMedia.length)
      .map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}`,
        file,
        mediaType: file.type.startsWith('video/') ? 'video' : 'image',
        previewUrl: URL.createObjectURL(file),
      }));

    setSelectedMedia((prev) => [...prev, ...validFiles].slice(0, 10));
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!uploadData.professionalId || !uploadData.region.trim() || selectedMedia.length === 0) {
      showToast('Selecione o profissional, informe a area e escolha ao menos um arquivo.', 'error');
      return;
    }

    setUploading(true);
    try {
      for (const media of selectedMedia) {
        const formData = new FormData();
        formData.append('file', media.file);
        formData.append('professionalId', uploadData.professionalId);
        formData.append('professionalName', uploadData.professionalName);
        formData.append('style', uploadData.style);
        formData.append('region', uploadData.region);
        formData.append('date', uploadData.date);
        formData.append('title', `${uploadData.style} - ${uploadData.region}`);
        await uploadPortfolioFile(formData);
      }

      setShowUploadModal(false);
      setSelectedMedia([]);
      setUploadData({
        professionalId: '',
        professionalName: '',
        style: 'Geral',
        region: '',
        date: new Date().toISOString().split('T')[0],
      });
    } catch {
      showToast('Nao foi possivel concluir o upload do portfolio.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const shareUrl = `${window.location.origin}/p/${business?.publicId || ''}`;

  return (
    <div className="portfolio-view app-page">
      <div className="view-header">
        <div>
          <h1>Galeria do {t('business')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
            Organize os trabalhos publicados e compartilhe a vitrine comercial do negocio.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              showToast('Link publico copiado.');
            }}
          >
            <Share2 size={16} /> Copiar link
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Confira nosso portfolio: ${shareUrl}`)}`, '_blank', 'noopener,noreferrer')}
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} /> Novo item
          </button>
        </div>
      </div>

      <div className="section-card" style={{ padding: 18, display: 'grid', gap: 14, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Estilo</label>
            <select value={filterStyle} onChange={(event) => setFilterStyle(event.target.value)}>
              <option value="all">Todos os estilos</option>
              <option value="Geral">Geral</option>
              <option value="Realismo">Realismo</option>
              <option value="Old School">Old School</option>
              <option value="Blackwork">Blackwork</option>
              <option value="Fine Line">Fine Line</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>{t('professional')}</label>
            <select value={filterProfessional} onChange={(event) => setFilterProfessional(event.target.value)}>
              <option value="all">Todos os profissionais</option>
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="portfolio-grid" style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {filteredPortfolio.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            Nenhum item publicado com os filtros atuais.
          </div>
        ) : (
          filteredPortfolio.map((item) => (
            <div key={item.id} className="section-card" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ aspectRatio: '1 / 1.1', background: 'var(--muted)' }}>
                {item.mediaType === 'video' ? (
                  <video src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls muted />
                ) : (
                  <img src={item.imageUrl} alt={item.title || item.style || 'Portfolio'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                  <div>
                    <strong>{item.title || item.style || 'Trabalho publicado'}</strong>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
                      {item.region || 'Area nao informada'}
                    </div>
                  </div>
                  <button type="button" className="btn-icon text-danger" onClick={() => deletePortfolioItem(item.id)} title="Excluir item">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                  <span><Users size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {item.professionalName || 'Profissional'}</span>
                  <span>{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" style={{ maxWidth: 720 }} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Adicionar item ao portfolio</h2>
              <button type="button" className="btn-icon" onClick={() => setShowUploadModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpload} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>{t('professional')}</label>
                  <select
                    value={uploadData.professionalId}
                    onChange={(event) => {
                      const professional = professionals.find((item) => Number(item.id) === Number(event.target.value));
                      setUploadData((prev) => ({
                        ...prev,
                        professionalId: event.target.value,
                        professionalName: professional?.name || '',
                      }));
                    }}
                  >
                    <option value="">Selecione</option>
                    {professionals.map((professional) => (
                      <option key={professional.id} value={professional.id}>{professional.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Estilo</label>
                  <select value={uploadData.style} onChange={(event) => setUploadData((prev) => ({ ...prev, style: event.target.value }))}>
                    <option value="Geral">Geral</option>
                    <option value="Realismo">Realismo</option>
                    <option value="Old School">Old School</option>
                    <option value="Blackwork">Blackwork</option>
                    <option value="Fine Line">Fine Line</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Area</label>
                  <input type="text" value={uploadData.region} onChange={(event) => setUploadData((prev) => ({ ...prev, region: event.target.value }))} placeholder="Ex.: antebraco direito" />
                </div>
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" value={uploadData.date} onChange={(event) => setUploadData((prev) => ({ ...prev, date: event.target.value }))} />
                </div>
              </div>

              <div className="section-card" style={{ padding: 18, background: 'var(--bg-secondary)' }}>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 600 }}>Arquivos</label>
                <label className="btn-secondary" style={{ cursor: 'pointer', width: 'fit-content' }}>
                  <Camera size={16} /> Selecionar imagens ou videos
                  <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => handleFileChange(event.target.files)} />
                </label>

                {selectedMedia.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 16 }}>
                    {selectedMedia.map((media) => (
                      <div key={media.id} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', background: 'var(--muted)' }}>
                        {media.mediaType === 'video' ? (
                          <video src={media.previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={media.previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ position: 'absolute', top: 6, right: 6, background: 'var(--overlay)' }}
                          onClick={() => setSelectedMedia((prev) => prev.filter((item) => item.id !== media.id))}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', marginTop: 14, marginBottom: 0 }}>
                    Envie imagens ou videos para publicar os trabalhos do negocio.
                  </p>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowUploadModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={uploading || selectedMedia.length === 0}>
                  {uploading ? 'Enviando...' : `Publicar ${selectedMedia.length || ''}`.trim()}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
