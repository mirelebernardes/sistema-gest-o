import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Briefcase, Clock, Link, Plus, Save, Settings, Store, Users, X } from 'lucide-react';

import { useBusinessContext } from '../context/BusinessContext';
import ThemeSelector from '../components/ThemeSelector';

function ensureObject(value, fallback) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {
      // Ignore parse errors and use fallback object.
    }
  }
  return fallback;
}

function normalizeModuleToken(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const TABS = [
  { id: 'geral', label: 'Perfil do negócio', icon: Store },
  { id: 'nicho', label: 'Nicho e módulos', icon: Briefcase },
  { id: 'horarios', label: 'Horário de funcionamento', icon: Clock },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'equipe', label: 'Equipe e acessos', icon: Users },
  { id: 'integracoes', label: 'Integracoes', icon: Link },
];
const SETTINGS_TAB_STORAGE_KEY = 'settings_active_tab';

function getInitialSettingsTab() {
  const fallback = 'geral';
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = window.localStorage.getItem(SETTINGS_TAB_STORAGE_KEY);
    if (saved && TABS.some((tab) => tab.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore storage issues and keep fallback tab.
  }
  return fallback;
}

export default function SettingsView() {
  const {
    addProfessional,
    addUser,
    business,
    professionals,
    showToast,
    t,
    updateBusiness,
    updateProfessional,
    users,
  } = useBusinessContext();

  const [activeTab, setActiveTab] = useState(getInitialSettingsTab);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', role: 'reception', phone: '', password: '', professionalId: '' });
  const [professionalForm, setProfessionalForm] = useState({ name: '', specialty: '', phone: '', commission: 60, mpAccessToken: '' });

  const handleTabChange = useCallback((nextTab) => {
    if (!TABS.some((tab) => tab.id === nextTab)) return;
    setActiveTab(nextTab);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SETTINGS_TAB_STORAGE_KEY, activeTab);
    } catch {
      // Ignore storage issues and keep UI responsive.
    }
  }, [activeTab]);

  const initialSettingsData = {
    name: business?.name || '',
    address: business?.address || '',
    phone: business?.phone || '',
    email: business?.email || '',
    type: business?.type || 'generic',
    modules: business?.modules || 'agenda,financeiro,clientes,profissionais',
    hours: ensureObject(business?.hours, { weekdays: { start: '09:00', end: '19:00' }, saturday: { start: '09:00', end: '14:00' } }),
    notifications: ensureObject(business?.notifications, { lowStock: true, sessionReminders: true, whatsappAuto: false }),
    mpAccessToken: business?.mpAccessToken || '',
    waInstanceId: business?.waInstanceId || '',
    waInstanceUrl: business?.waInstanceUrl || '',
    waApiKey: business?.waApiKey || '',
  };

  return (
    <SettingsContent
      key={business?.id || 'settings'}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
      addProfessional={addProfessional}
      addUser={addUser}
      handleCreateUser={async () => {}}
      initialSettingsData={initialSettingsData}
      newUser={newUser}
      setNewUser={setNewUser}
      professionals={professionals}
      setEditingProfessional={setEditingProfessional}
      setProfessionalForm={setProfessionalForm}
      setShowProfessionalModal={setShowProfessionalModal}
      setShowUserModal={setShowUserModal}
      showProfessionalModal={showProfessionalModal}
      showToast={showToast}
      showUserModal={showUserModal}
      t={t}
      updateBusiness={updateBusiness}
      updateProfessional={updateProfessional}
      users={users}
      professionalForm={professionalForm}
      editingProfessional={editingProfessional}
    />
  );
}

function SettingsContent({
  activeTab,
  addProfessional,
  addUser,
  editingProfessional,
  initialSettingsData,
  newUser,
  professionalForm,
  professionals,
  setActiveTab,
  setEditingProfessional,
  setNewUser,
  setProfessionalForm,
  setShowProfessionalModal,
  setShowUserModal,
  showProfessionalModal,
  showToast,
  showUserModal,
  t,
  updateBusiness,
  updateProfessional,
  users,
}) {
  const [settingsData, setSettingsData] = useState(initialSettingsData);

  const handleSave = async () => {
    try {
      await updateBusiness(settingsData);
      showToast('Configuracoes salvas com sucesso.');
    } catch {
      showToast('Nao foi possivel salvar as configuracoes.', 'error');
    }
  };

  const toggleModule = (moduleName) => {
    const normalizedCurrent = Array.from(new Set(
      String(settingsData.modules || '')
        .split(',')
        .map((item) => normalizeModuleToken(item))
        .filter(Boolean),
    ));
    const normalizedTarget = normalizeModuleToken(moduleName);
    const next = normalizedCurrent.includes(normalizedTarget)
      ? normalizedCurrent.filter((item) => item !== normalizedTarget)
      : [...normalizedCurrent, normalizedTarget];
    setSettingsData((prev) => ({ ...prev, modules: next.join(',') }));
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.password) {
      showToast('Nome e senha sao obrigatorios.', 'error');
      return;
    }

    try {
      await addUser({
        name: newUser.name,
        role: newUser.role,
        phone: newUser.phone,
        password: newUser.password,
        professionalId: newUser.professionalId ? Number(newUser.professionalId) : null,
      });
      setShowUserModal(false);
      setNewUser({ name: '', role: 'reception', phone: '', password: '', professionalId: '' });
    } catch {
      showToast('Não foi possível cadastrar o usuário.', 'error');
    }
  };

  const openNewProfessional = () => {
    setEditingProfessional(null);
    setProfessionalForm({ name: '', specialty: '', phone: '', commission: 60, mpAccessToken: '' });
    setShowProfessionalModal(true);
  };

  const openEditProfessional = (professional) => {
    setEditingProfessional(professional);
    setProfessionalForm({
      name: professional.name || '',
      specialty: professional.specialty || '',
      phone: professional.phone || '',
      commission: professional.commission || 60,
      mpAccessToken: professional.mpAccessToken || '',
    });
    setShowProfessionalModal(true);
  };

  const handleSaveProfessional = async () => {
    if (!professionalForm.name.trim()) {
      showToast('Informe o nome do profissional.', 'error');
      return;
    }

    try {
      if (editingProfessional) {
        await updateProfessional(editingProfessional.id, professionalForm);
      } else {
        await addProfessional(professionalForm);
      }
      setShowProfessionalModal(false);
      setEditingProfessional(null);
    } catch {
      showToast('Nao foi possivel salvar o profissional.', 'error');
    }
  };

  const moduleOptions = [
    { id: 'agenda', label: 'Agenda' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'profissionais', label: 'Profissionais' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'estoque', label: 'Estoque' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'captacao', label: 'Captacao' },
  ];

  return (
    <div className="settings-container">
      <div className="view-header">
        <h1><Settings size={28} /> {t('settings')}</h1>
        <button type="button" className="btn-primary" onClick={handleSave}>
          <Save size={18} /> Salvar alterações
        </button>
      </div>

      <div className="settings-layout" style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 24 }}>
        <div className="section-card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const activateTab = () => setActiveTab(tab.id);
              const handlePointerDown = (event) => {
                if (tab.id !== 'integracoes') return;
                if (typeof event.button === 'number' && event.button !== 0) return;
                setActiveTab(tab.id);
              };
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn-text settings-tab-button ${tab.id === 'integracoes' ? 'settings-tab-button-integracoes' : ''} ${activeTab === tab.id ? 'active' : ''}`}
                  data-tab-id={tab.id}
                  onClick={activateTab}
                  onPointerDown={handlePointerDown}
                  style={{
                    justifyContent: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    background: activeTab === tab.id ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
                    border: activeTab === tab.id ? '1px solid color-mix(in srgb, var(--primary) 22%, transparent)' : '1px solid transparent',
                    color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  <Icon size={18} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="section-card">
          {activeTab === 'geral' && (
            <>
              <div className="section-header"><h2>Perfil do negócio</h2></div>
              <div className="form-grid">
                <div className="form-group"><label>Nome do negócio</label><input type="text" value={settingsData.name} onChange={(event) => setSettingsData((prev) => ({ ...prev, name: event.target.value }))} /></div>
                <div className="form-group"><label>Telefone</label><input type="text" value={settingsData.phone} onChange={(event) => setSettingsData((prev) => ({ ...prev, phone: event.target.value }))} /></div>
                <div className="form-group full-width"><label>Endereço</label><input type="text" value={settingsData.address} onChange={(event) => setSettingsData((prev) => ({ ...prev, address: event.target.value }))} /></div>
                <div className="form-group full-width"><label>E-mail</label><input type="email" value={settingsData.email} onChange={(event) => setSettingsData((prev) => ({ ...prev, email: event.target.value }))} /></div>
                <div className="form-group full-width">
                  <label>Tema do sistema</label>
                  <ThemeSelector />
                </div>
              </div>
            </>
          )}

          {activeTab === 'nicho' && (
            <>
              <div className="section-header"><h2>Nicho e módulos ativos</h2></div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo do negócio</label>
                  <select value={settingsData.type} onChange={(event) => setSettingsData((prev) => ({ ...prev, type: event.target.value }))}>
                    <option value="tattoo">Tattoo</option>
                    <option value="beauty">Beleza</option>
                    <option value="barber">Barbearia</option>
                    <option value="clinic">Estetica</option>
                    <option value="generic">Generico</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
                {moduleOptions.map((module) => {
                  const active = String(settingsData.modules || '')
                    .split(',')
                    .map((item) => normalizeModuleToken(item))
                    .includes(normalizeModuleToken(module.id));
                  return (
                    <button
                      key={module.id}
                      type="button"
                      className="btn-secondary"
                      onClick={() => toggleModule(module.id)}
                      style={{
                        justifyContent: 'flex-start',
                        background: active ? 'var(--primary-soft)' : undefined,
                        borderColor: active ? 'color-mix(in srgb, var(--primary) 24%, transparent)' : undefined,
                      }}
                    >
                      {module.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'horarios' && (
            <>
              <div className="section-header"><h2>Horário de funcionamento</h2></div>
              <div className="form-grid">
                <div className="form-group"><label>Segunda a sexta - inicio</label><input type="time" value={settingsData.hours.weekdays.start} onChange={(event) => setSettingsData((prev) => ({ ...prev, hours: { ...prev.hours, weekdays: { ...prev.hours.weekdays, start: event.target.value } } }))} /></div>
                <div className="form-group"><label>Segunda a sexta - fim</label><input type="time" value={settingsData.hours.weekdays.end} onChange={(event) => setSettingsData((prev) => ({ ...prev, hours: { ...prev.hours, weekdays: { ...prev.hours.weekdays, end: event.target.value } } }))} /></div>
                <div className="form-group"><label>Sábado - inicio</label><input type="time" value={settingsData.hours.saturday.start} onChange={(event) => setSettingsData((prev) => ({ ...prev, hours: { ...prev.hours, saturday: { ...prev.hours.saturday, start: event.target.value } } }))} /></div>
                <div className="form-group"><label>Sábado - fim</label><input type="time" value={settingsData.hours.saturday.end} onChange={(event) => setSettingsData((prev) => ({ ...prev, hours: { ...prev.hours, saturday: { ...prev.hours.saturday, end: event.target.value } } }))} /></div>
              </div>
            </>
          )}

          {activeTab === 'notificacoes' && (
            <>
              <div className="section-header"><h2>Notificações</h2></div>
              <div className="settings-notifications-grid">
                {[
                  { key: 'lowStock', label: 'Alertar estoque baixo' },
                  { key: 'sessionReminders', label: 'Lembrar agendamentos' },
                  { key: 'whatsappAuto', label: 'Automações no WhatsApp' },
                ].map((item) => (
                  <label key={item.key} className="setting-toggle settings-notification-toggle">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={!!settingsData.notifications[item.key]}
                      onChange={(event) => setSettingsData((prev) => ({ ...prev, notifications: { ...prev.notifications, [item.key]: event.target.checked } }))}
                    />
                  </label>
                ))}
              </div>
            </>
          )}

          {activeTab === 'equipe' && (
            <>
              <div className="section-header">
                <h2>Equipe e acessos</h2>
                <div className="header-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowUserModal(true)}><Plus size={16} /> Novo usuário</button>
                  <button type="button" className="btn-primary" onClick={openNewProfessional}><Plus size={16} /> Novo profissional</button>
                </div>
              </div>

              <div className="settings-team-grid">
                <div className="settings-team-panel">
                  <h3>Usuários</h3>
                  <div className="table-responsive">
                    <table className="settings-team-table">
                      <thead>
                        <tr><th>Nome</th><th>Perfil</th><th>Telefone</th></tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? <tr><td colSpan="3">Nenhum usuário cadastrado.</td></tr> : users.map((user) => (
                          <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{t(user.role)}</td>
                            <td>{user.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="settings-team-panel">
                  <h3>Profissionais</h3>
                  <div className="table-responsive">
                    <table className="settings-team-table">
                      <thead>
                        <tr><th>Nome</th><th>Especialidade</th><th>Comissão</th><th>Ações</th></tr>
                      </thead>
                      <tbody>
                        {professionals.length === 0 ? <tr><td colSpan="4">Nenhum profissional cadastrado.</td></tr> : professionals.map((professional) => (
                          <tr key={professional.id}>
                            <td>{professional.name}</td>
                            <td>{professional.specialty || '-'}</td>
                            <td>{professional.commission || 60}%</td>
                            <td><button type="button" className="btn-text" onClick={() => openEditProfessional(professional)}>Editar</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'integracoes' && (
            <>
              <div className="section-header"><h2>Integracoes</h2></div>
              <div className="form-grid">
                <div className="form-group full-width"><label>Access token do Mercado Pago</label><input type="password" value={settingsData.mpAccessToken} onChange={(event) => setSettingsData((prev) => ({ ...prev, mpAccessToken: event.target.value }))} /></div>
                <div className="form-group"><label>URL da instancia WhatsApp</label><input type="text" value={settingsData.waInstanceUrl} onChange={(event) => setSettingsData((prev) => ({ ...prev, waInstanceUrl: event.target.value }))} /></div>
                <div className="form-group"><label>Instance ID</label><input type="text" value={settingsData.waInstanceId} onChange={(event) => setSettingsData((prev) => ({ ...prev, waInstanceId: event.target.value }))} /></div>
                <div className="form-group full-width"><label>API key do WhatsApp</label><input type="password" value={settingsData.waApiKey} onChange={(event) => setSettingsData((prev) => ({ ...prev, waApiKey: event.target.value }))} /></div>
              </div>
            </>
          )}
        </div>
      </div>

      {showUserModal && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo usuário</h2>
              <button type="button" className="btn-icon" onClick={() => setShowUserModal(false)}><X size={18} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group"><label>Nome</label><input type="text" value={newUser.name} onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))} /></div>
              <div className="form-group"><label>Telefone</label><input type="text" value={newUser.phone} onChange={(event) => setNewUser((prev) => ({ ...prev, phone: event.target.value }))} /></div>
              <div className="form-group"><label>Senha</label><input type="password" value={newUser.password} onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))} /></div>
              <div className="form-group"><label>Perfil</label><select value={newUser.role} onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value }))}><option value="reception">Recepção</option><option value="professional">Profissional</option><option value="admin">Administrador</option></select></div>
              {newUser.role === 'professional' && (
                <div className="form-group full-width">
                  <label>Profissional vinculado</label>
                  <select value={newUser.professionalId} onChange={(event) => setNewUser((prev) => ({ ...prev, professionalId: event.target.value }))}>
                    <option value="">Selecione</option>
                    {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowUserModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={handleCreateUser}>Salvar usuário</button>
            </div>
          </div>
        </div>
      )}

      {showProfessionalModal && (
        <div className="modal-overlay" onClick={() => setShowProfessionalModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProfessional ? 'Editar profissional' : 'Novo profissional'}</h2>
              <button type="button" className="btn-icon" onClick={() => setShowProfessionalModal(false)}><X size={18} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group"><label>Nome</label><input type="text" value={professionalForm.name} onChange={(event) => setProfessionalForm((prev) => ({ ...prev, name: event.target.value }))} /></div>
              <div className="form-group"><label>Especialidade</label><input type="text" value={professionalForm.specialty} onChange={(event) => setProfessionalForm((prev) => ({ ...prev, specialty: event.target.value }))} /></div>
              <div className="form-group"><label>Telefone</label><input type="text" value={professionalForm.phone} onChange={(event) => setProfessionalForm((prev) => ({ ...prev, phone: event.target.value }))} /></div>
              <div className="form-group"><label>Comissão (%)</label><input type="number" min="0" max="100" value={professionalForm.commission} onChange={(event) => setProfessionalForm((prev) => ({ ...prev, commission: Number(event.target.value) }))} /></div>
              <div className="form-group full-width"><label>Token do split (opcional)</label><input type="password" value={professionalForm.mpAccessToken} onChange={(event) => setProfessionalForm((prev) => ({ ...prev, mpAccessToken: event.target.value }))} /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowProfessionalModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={handleSaveProfessional}>Salvar profissional</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
