import React, { useMemo, useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Loader2, LogIn, User } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useBusinessContext } from '../context/BusinessContext';

const SHELL_STYLE = {
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  background: 'linear-gradient(135deg, var(--background) 0%, var(--muted) 55%, var(--secondary) 100%)',
};

const PANEL_STYLE = {
  width: '100%',
  maxWidth: '440px',
  padding: '2.5rem',
  background: 'color-mix(in srgb, var(--card) 92%, transparent)',
  borderRadius: 'calc(var(--radius) * 1.75)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow)',
  backdropFilter: 'blur(14px)',
};

function fieldStyle(hasError, withToggle = false) {
  return {
    width: '100%',
    padding: withToggle ? '0.95rem 3rem 0.95rem 3rem' : '0.95rem 1rem 0.95rem 3rem',
    backgroundColor: 'var(--input)',
    border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    color: 'var(--foreground)',
    outline: 'none',
    fontSize: '1rem',
  };
}

export default function LoginView() {
  const { business, login, showToast } = useBusinessContext();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const businessLabel = useMemo(() => business?.name || 'seu negocio', [business]);

  const validateForm = () => {
    const nextErrors = {};

    if (!identifier.trim()) nextErrors.identifier = 'Informe seu usuario ou e-mail.';
    if (!password) nextErrors.password = 'Informe sua senha.';
    if (password && password.length < 6) nextErrors.password = 'A senha deve ter pelo menos 6 caracteres.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;
    if (!window.navigator.onLine) {
      showToast('Sem conexao com a internet. Verifique sua rede e tente novamente.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(identifier.trim(), password);
      if (success) {
        showToast(`Acesso liberado ao ${businessLabel}.`, 'success');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={SHELL_STYLE}>
      <div style={PANEL_STYLE}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 22,
              margin: '0 auto 1.25rem',
              background: 'color-mix(in srgb, var(--primary) 18%, var(--card))',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid color-mix(in srgb, var(--primary) 28%, transparent)',
            }}
          >
            <LogIn size={34} color="var(--foreground)" />
          </div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '2rem', margin: 0 }}>Entrar</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '0.75rem 0 0' }}>
            Acesse a operacao do <strong style={{ color: 'var(--foreground)' }}>{businessLabel}</strong> com seu usuario de trabalho.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.55rem', color: 'var(--foreground)', fontWeight: 600 }}>
              Usuario ou e-mail
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
                <User size={18} />
              </span>
              <input
                type="text"
                value={identifier}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: null }));
                }}
                placeholder="Digite seu usuario ou e-mail"
                autoComplete="username"
                style={fieldStyle(!!errors.identifier)}
              />
            </div>
            {errors.identifier && (
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {errors.identifier}
              </p>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: '0.55rem', alignItems: 'center' }}>
              <label style={{ color: 'var(--foreground)', fontWeight: 600 }}>Senha</label>
              <button
                type="button"
                onClick={() => showToast('Fale com o administrador para redefinir a senha do acesso.', 'info')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                Esqueci a senha
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                }}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                style={fieldStyle(!!errors.password, true)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted-foreground)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '0.25rem',
              width: '100%',
              padding: '1rem',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: 'var(--primary-foreground)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Entrando...
              </>
            ) : (
              'Acessar sistema'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
            Ainda nao tem acesso?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              Criar conta do negocio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
