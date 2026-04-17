import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Camera, CheckCircle2, MessageCircle, Play, RefreshCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import api from '../lib/api.js';

function fallbackImage(event) {
  event.currentTarget.src = 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=900&q=80';
  event.currentTarget.style.opacity = '0.65';
}

export default function PublicPortfolio() {
  const { publicId } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPortfolio = useCallback(async () => {
    if (!publicId || publicId.length < 4) {
      setError('Link publico invalido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/business/public/${publicId}`);
      setBusiness(data);
      document.title = `${data.name} | Portfolio`;
    } catch (requestError) {
      console.error('Erro ao carregar portfolio publico:', requestError);
      setError('Nao foi possivel carregar este portfolio agora.');
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    fetchPortfolio();
    return () => {
      document.title = 'Sistema';
    };
  }, [fetchPortfolio]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ height: 48, width: 260, background: 'color-mix(in srgb, var(--foreground) 8%, transparent)', borderRadius: 12, marginBottom: 16 }} />
          <div style={{ height: 18, width: 180, background: 'color-mix(in srgb, var(--foreground) 6%, transparent)', borderRadius: 8, marginBottom: 40 }} />
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} style={{ aspectRatio: '1 / 1.2', borderRadius: 20, background: 'color-mix(in srgb, var(--foreground) 6%, transparent)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--background)', color: 'var(--foreground)', padding: '1.5rem' }}>
        <div style={{ maxWidth: 440, width: '100%', background: 'var(--card)', borderRadius: 28, padding: '2.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
          <AlertTriangle size={60} style={{ color: 'var(--warning)', marginBottom: '1rem' }} />
          <h1 style={{ margin: 0 }}>Portfolio indisponivel</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '0.9rem 0 1.5rem' }}>{error || 'Este portfolio nao foi encontrado.'}</p>
          <button type="button" className="btn-primary" onClick={fetchPortfolio}>
            <RefreshCcw size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, color-mix(in srgb, var(--background) 92%, var(--accent)) 0%, var(--background) 100%)', color: 'var(--foreground)' }}>
      <header style={{ padding: '5rem 1.5rem 3rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.9rem', borderRadius: 999, background: 'var(--success-soft)', color: 'var(--success)', marginBottom: '1.25rem', fontWeight: 700 }}>
            <CheckCircle2 size={16} /> Vitrine oficial
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(2.4rem, 6vw, 4.4rem)', lineHeight: 1, letterSpacing: '-0.04em' }}>{business.name}</h1>
          <p style={{ color: 'var(--muted-foreground)', maxWidth: 680, margin: '1rem auto 0', fontSize: '1.05rem' }}>
            Conheca os trabalhos publicados, estilos atendidos e entre em contato com a equipe para pedir um orcamento.
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        {business.portfolio?.length > 0 ? (
          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {business.portfolio.map((item) => (
              <article key={item.id} style={{ overflow: 'hidden', borderRadius: 24, background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div style={{ aspectRatio: '1 / 1.18', background: 'color-mix(in srgb, var(--muted) 80%, transparent)' }}>
                  {item.mediaType === 'video' ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <video
                        src={item.imageUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                        loop
                        playsInline
                        controls
                      />
                      <span style={{ position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%', background: 'color-mix(in srgb, var(--card) 80%, transparent)', display: 'grid', placeItems: 'center' }}>
                        <Play size={16} />
                      </span>
                    </div>
                  ) : (
                    <img src={item.imageUrl} alt={item.title || item.style || 'Trabalho'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={fallbackImage} />
                  )}
                </div>
                <div style={{ padding: 18, display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ color: 'var(--warning)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {item.style || 'Portfolio'}
                    </div>
                    <strong style={{ display: 'block', marginTop: 6, fontSize: '1.05rem' }}>{item.region || item.title || 'Trabalho publicado'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: 'var(--muted-foreground)', fontSize: '0.92rem' }}>
                    <span>{item.professionalName || 'Profissional da equipe'}</span>
                    <span>{item.date ? new Date(item.date).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '5rem 1.5rem', borderRadius: 28, border: '1px dashed var(--border)', background: 'color-mix(in srgb, var(--card) 85%, transparent)' }}>
            <Camera size={48} style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }} />
            <h2 style={{ margin: 0 }}>Nenhum trabalho publicado</h2>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '0.8rem' }}>Esta vitrine ainda nao possui itens disponiveis.</p>
          </div>
        )}
      </main>

      <footer style={{ padding: '4rem 1.5rem 5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', background: 'var(--card)', borderRadius: 30, padding: '2.5rem 1.75rem', border: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>Gostou do que viu?</h2>
          <p style={{ color: 'var(--muted-foreground)', margin: '1rem auto 1.75rem', maxWidth: 620 }}>
            Solicite um orcamento ou fale com a equipe para tirar duvidas sobre estilos, agenda e disponibilidade.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link
              to={`/budget/${publicId}`}
              className="btn-primary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Calendar size={16} /> Solicitar orcamento
            </Link>
            {business.phone && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => window.open(`https://wa.me/${business.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Ola ${business.name}, vi o portfolio e gostaria de mais informacoes.`)}`, '_blank', 'noopener,noreferrer')}
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
