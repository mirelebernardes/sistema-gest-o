import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, Store, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useBusinessContext } from '../context/BusinessContext';
import api from '../lib/api.js';

const NICHE_OPTIONS = [
  { value: 'tattoo', label: 'Tatuagem e piercing' },
  { value: 'beauty', label: 'Salao, beleza e estetica' },
  { value: 'barber', label: 'Barbearia' },
  { value: 'clinic', label: 'Clinica e saude' },
  { value: 'generic', label: 'Outros servicos' },
];

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
  maxWidth: '560px',
  padding: '2.5rem',
  background: 'color-mix(in srgb, var(--card) 92%, transparent)',
  borderRadius: 'calc(var(--radius) * 1.75)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow)',
  backdropFilter: 'blur(14px)',
};

function fieldStyle(hasError, withIcon = true, withToggle = false) {
  const leftPadding = withIcon ? '3rem' : '1rem';
  const rightPadding = withToggle ? '3rem' : '1rem';

  return {
    width: '100%',
    padding: `0.95rem ${rightPadding} 0.95rem ${leftPadding}`,
    backgroundColor: 'var(--input)',
    border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    color: 'var(--foreground)',
    outline: 'none',
    fontSize: '1rem',
  };
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'var(--muted-foreground)' };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'Fraca', color: 'var(--danger)' };
  if (score <= 3) return { score, label: 'Media', color: 'var(--warning)' };
  return { score, label: 'Forte', color: 'var(--success)' };
}

export default function RegisterView() {
  const { showToast } = useBusinessContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    studioName: '',
    userName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessNiche: 'tattoo',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (formData.studioName.trim().length < 3) nextErrors.studioName = 'Informe um nome comercial com pelo menos 3 caracteres.';
    if (formData.userName.trim().length < 4) nextErrors.userName = 'O usuario precisa ter pelo menos 4 caracteres.';
    if (formData.email && !emailRegex.test(formData.email.trim())) nextErrors.email = 'Informe um e-mail valido.';
    if (formData.password.length < 8) nextErrors.password = 'A senha precisa ter pelo menos 8 caracteres.';
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'As senhas precisam ser iguais.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await api.post('/register', {
        studioName: formData.studioName.trim(),
        userName: formData.userName.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        businessNiche: formData.businessNiche,
      });
      setIsSuccess(true);
      showToast('Cadastro concluido com sucesso. Agora voce ja pode entrar no sistema.', 'success');
    } catch (error) {
      const message = error.response?.data?.error || 'Nao foi possivel concluir o cadastro. Tente novamente com outro usuario ou e-mail.';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={SHELL_STYLE}>
        <div style={{ ...PANEL_STYLE, maxWidth: 460, textAlign: 'center' }}>
          <CheckCircle2 size={64} style={{ color: 'var(--success)', marginBottom: '1.5rem' }} />
          <h1 style={{ color: 'var(--foreground)', margin: 0 }}>Conta criada</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '0.85rem 0 1.5rem' }}>
            O negocio <strong style={{ color: 'var(--foreground)' }}>{formData.studioName}</strong> foi preparado com sucesso.
          </p>

          <div style={{ textAlign: 'left', background: 'var(--input)', borderRadius: 'calc(var(--radius) * 1.25)', padding: '1.25rem', border: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 0.35rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>Nicho selecionado</p>
            <p style={{ margin: '0 0 1rem', color: 'var(--foreground)', fontWeight: 700 }}>
              {NICHE_OPTIONS.find((item) => item.value === formData.businessNiche)?.label || 'Outros servicos'}
            </p>
            <p style={{ margin: '0 0 0.35rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>Usuario principal</p>
            <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 700 }}>{formData.userName.toLowerCase()}</p>
            {formData.email && (
              <>
                <p style={{ margin: '1rem 0 0.35rem', color: 'var(--muted-foreground)', fontSize: '0.82rem' }}>E-mail cadastrado</p>
                <p style={{ margin: 0, color: 'var(--foreground)', fontWeight: 700 }}>{formData.email.toLowerCase()}</p>
              </>
            )}
          </div>

          <p style={{ color: 'var(--muted-foreground)', margin: '1.5rem 0 1.25rem' }}>
            O cadastro foi concluido. Entre no sistema com o usuario criado para continuar a configuracao do negocio.
          </p>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: 'var(--radius)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                color: 'var(--primary-foreground)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Ir para o login
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSuccess(false);
                setFormData({
                  studioName: '',
                  userName: '',
                  email: '',
                  password: '',
                  confirmPassword: '',
                  businessNiche: 'tattoo',
                });
              }}
              style={{
                width: '100%',
                padding: '0.95rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--foreground)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Criar outro cadastro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={SHELL_STYLE}>
      <div style={PANEL_STYLE}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: 24,
              margin: '0 auto 1.25rem',
              background: 'color-mix(in srgb, var(--primary) 16%, var(--card))',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid color-mix(in srgb, var(--primary) 28%, transparent)',
            }}
          >
            <Store size={34} color="var(--foreground)" />
          </div>
          <h1 style={{ color: 'var(--foreground)', fontSize: '2rem', margin: 0 }}>Criar conta</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: '0.75rem 0 0' }}>
            Estruture seu negocio e deixe a operacao pronta para atendimento, agenda e financeiro.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.55rem', color: 'var(--foreground)', fontWeight: 600 }}>
              Nicho do negocio
            </label>
            <select
              name="businessNiche"
              value={formData.businessNiche}
              onChange={handleChange}
              style={fieldStyle(false, false)}
            >
              {NICHE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.55rem', color: 'var(--foreground)', fontWeight: 600 }}>
              Nome do negocio
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
                <Store size={18} />
              </span>
              <input
                name="studioName"
                type="text"
                value={formData.studioName}
                onChange={handleChange}
                placeholder="Ex.: Negocio Aurora"
                style={fieldStyle(!!errors.studioName)}
              />
            </div>
            {errors.studioName && (
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {errors.studioName}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.55rem', color: 'var(--foreground)', fontWeight: 600 }}>
                Usuario principal
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
                  <User size={18} />
                </span>
                <input
                  name="userName"
                  type="text"
                  value={formData.userName}
                  onChange={handleChange}
                  placeholder="gestao.principal"
                  style={fieldStyle(!!errors.userName)}
                />
              </div>
              {errors.userName && (
                <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} /> {errors.userName}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.55rem', color: 'var(--foreground)', fontWeight: 600 }}>
                E-mail comercial
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
                  <Mail size={18} />
                </span>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contato@negocio.com"
                  style={fieldStyle(!!errors.email)}
                />
              </div>
              {errors.email && (
                <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} /> {errors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: '0.55rem', alignItems: 'center' }}>
              <label style={{ color: 'var(--foreground)', fontWeight: 600 }}>Senha de acesso</label>
              {formData.password && (
                <span style={{ color: passwordStrength.color, fontSize: '0.8rem', fontWeight: 700 }}>
                  {passwordStrength.label}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
                <Lock size={18} />
              </span>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Crie uma senha forte"
                style={fieldStyle(!!errors.password, true, true)}
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
            <div style={{ height: 6, borderRadius: 999, background: 'var(--secondary)', overflow: 'hidden', marginTop: 10 }}>
              <div
                style={{
                  height: '100%',
                  width: `${(passwordStrength.score / 4) * 100}%`,
                  background: passwordStrength.color,
                  transition: 'all 0.25s ease',
                }}
              />
            </div>
            {errors.password && (
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {errors.password}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.55rem', color: 'var(--foreground)', fontWeight: 600 }}>
              Confirmar senha
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }}>
                <Lock size={18} />
              </span>
              <input
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repita a senha"
                style={fieldStyle(!!errors.confirmPassword, true, true)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
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
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} /> {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '1rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
              color: 'var(--primary-foreground)',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Criando estrutura...
              </>
            ) : (
              <>
                Criar conta <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>
            Ja tem cadastro?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
              Entrar no sistema
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
