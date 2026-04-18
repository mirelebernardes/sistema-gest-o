import React, { useCallback, useEffect, useRef, useState } from 'react';

const DEV_API = '/api/dev';
function devFetch(path, options = {}) {
  const token = localStorage.getItem('dev_token') || '';
  return fetch(DEV_API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-dev-token': token, ...(options.headers || {}) }
  }).then(r => r.json());
}
function devFetchRaw(path, options = {}) {
  const token = localStorage.getItem('dev_token') || '';
  return fetch(DEV_API + path, { ...options, headers: { 'x-dev-token': token, ...(options.headers || {}) } });
}

const S = {
  wrap: { display: 'flex', minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', fontFamily: "'DM Sans', 'Inter', sans-serif", fontSize: 14 },
  side: { width: 230, minWidth: 230, background: 'var(--card)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' },
  sideHeader: { borderBottom: '1px solid var(--border)', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 10 },
  sideFooter: { marginTop: 'auto', padding: 16, borderTop: '1px solid var(--border)' },
  navBtn: (active) => ({ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', border: 'none', borderRadius: 8, background: active ? 'color-mix(in srgb, var(--primary) 18%, transparent)' : 'none', color: active ? 'var(--primary)' : 'var(--muted-foreground)', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left', transition: 'all 0.13s', fontWeight: active ? 600 : 400 }),
  main: { flex: 1, padding: '28px 32px', overflowY: 'auto' },
  h2: { fontSize: '1.3rem', fontWeight: 700, marginBottom: 20, color: 'var(--foreground)' },
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  cLabel: { fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  cValue: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' },
  badge: (c = 'var(--success)') => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: c, color: 'var(--primary-foreground)', fontSize: 12, fontWeight: 600 }),
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--card)', borderRadius: 10, overflow: 'hidden' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--foreground)', fontSize: 13 },
  btn: (c = 'var(--primary)') => ({ padding: '9px 20px', background: c, border: 'none', borderRadius: 8, color: 'var(--primary-foreground)', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, transition: 'opacity 0.15s' }),
  btnSm: (c = 'var(--primary)') => ({ padding: '4px 12px', background: c, border: 'none', borderRadius: 6, color: 'var(--primary-foreground)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }),
  input: { width: '100%', padding: '9px 13px', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  label: { display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--muted-foreground)' },
  code: { background: 'color-mix(in srgb, var(--muted) 80%, transparent)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)' },
  loading: { color: 'var(--muted-foreground)', padding: 16 },
  loginWrap: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' },
  loginCard: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 20, padding: 40, width: 380, textAlign: 'center' },
};

const TABS = [
  { id: 'health', icon: '🟢', label: 'Saúde' },
  { id: 'studios', icon: '🏢', label: 'Negócios' },
  { id: 'data', icon: '📊', label: 'Dados do Tenant' },
  { id: 'query', icon: '🗄️', label: 'Query SQL' },
  { id: 'users', icon: '👥', label: 'Usuários' },
  { id: 'migrate', icon: '⚡', label: 'Migrações' },
  { id: 'history', icon: '📋', label: 'Histórico' },
  { id: 'requests', icon: '📡', label: 'Requisições' },
  { id: 'integrations', icon: '🔌', label: 'Integrações' },
  { id: 'export', icon: '💾', label: 'Backup / Export' },
  { id: 'create', icon: '➕', label: 'Novo Negócio' },
  { id: 'broadcast', icon: '📢', label: 'Broadcast' },
  { id: 'ai', icon: '🤖', label: 'IA Assistant' },
];

export default function DevPanelView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('health');
  // Data state
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [studios, setStudios] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [migHistory, setMigHistory] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  // Actions
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);
  // Tenant data viewer
  const [tenantId, setTenantId] = useState('');
  const [tenantData, setTenantData] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  // SQL query
  const [sqlQuery, setSqlQuery] = useState('SELECT id, name FROM Business LIMIT 10');
  const [sqlTarget, setSqlTarget] = useState('central');
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  // Integration test
  const [intResult, setIntResult] = useState(null);
  const [intLoading, setIntLoading] = useState(false);
  // Broadcast
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'info' });
  const [broadcastSent, setBroadcastSent] = useState(false);
  // Create studio
  const [newStudio, setNewStudio] = useState({ name: '', ownerName: '', ownerEmail: '', ownerPassword: '', plan: 'basic' });
  const [createResult, setCreateResult] = useState(null);
  // Reset password modal
  const [resetUser, setResetUser] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  // Chat
  const [chat, setChat] = useState([{ role: 'model', text: '👋 Assistente ativo! Posso ajudar com queries, debugging, manutenção e desenvolvimento da plataforma.' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef(null);

  const loadAll = useCallback(async () => {
    const [h, s, st, br, mh] = await Promise.all([
      devFetch('/health'),
      devFetch('/stats'),
      devFetch('/studios'),
      devFetch('/broadcasts'),
      devFetch('/migration-history'),
    ]);

    setHealth(h);
    setStats(st);
    setStudios(Array.isArray(s) ? s : []);
    setBroadcasts(Array.isArray(br) ? br : []);
    setMigHistory(Array.isArray(mh) ? mh : []);

    const u = await devFetch('/users');
    setUsers(Array.isArray(u) ? u : []);
  }, []);

  const loadRequests = useCallback(async () => {
    const r = await devFetch('/requests');
    setRequests(Array.isArray(r) ? r : []);
  }, []);

  // Auto-login from stored token
  useEffect(() => {
    const saved = localStorage.getItem('dev_token');
    if (saved) {
      devFetch('/stats').then(r => {
        if (!r.error) { setAuthed(true); loadAll(); }
        else localStorage.removeItem('dev_token');
      });
    }
  }, [loadAll]);

  useEffect(() => { chatRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  const handleTabChange = async (nextTab) => {
    setTab(nextTab);
    if (authed && nextTab === 'requests') {
      await loadRequests();
    }
  };

  const login = async () => {
    setLoginError('');
    try {
      const r = await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }).then(x => x.json());
      if (r.error) { setLoginError(r.error); return; }
      localStorage.setItem('dev_token', r.token);
      setAuthed(true);
      loadAll();
    } catch { setLoginError('Erro ao conectar.'); }
  };

  const runMigrate = async () => { setMigrating(true); setMigrateResult(null); const r = await devFetch('/migrate-v2', { method: 'POST' }); setMigrateResult(r); setMigrating(false); loadAll(); };
  const toggleStudio = async (id) => { const r = await devFetch(`/studios/${id}/toggle`, { method: 'PATCH' }); if (!r.error) setStudios(p => p.map(s => s.id === id ? { ...s, isActive: r.isActive } : s)); };
  const toggleUser = async (id) => { const r = await devFetch(`/users/${id}/toggle`, { method: 'PATCH' }); if (!r.error) setUsers(p => p.map(u => u.id === id ? { ...u, isActive: r.isActive } : u)); };
  const resetPassword = async () => { const r = await devFetch(`/users/${resetUser.id}/reset-password`, { method: 'PATCH', body: JSON.stringify({ newPassword: resetPwd }) }); if (r.ok) { setResetUser(null); setResetPwd(''); alert('Senha redefinida!'); } else alert(r.error); };
  const loadTenantData = async () => { if (!tenantId) return; setTenantLoading(true); const r = await devFetch(`/tenant/${tenantId}/data`); setTenantData(r); setTenantLoading(false); };
  const runSQL = async () => { setSqlLoading(true); setSqlResult(null); const r = await devFetch('/query', { method: 'POST', body: JSON.stringify({ sql: sqlQuery, target: sqlTarget }) }); setSqlResult(r); setSqlLoading(false); };
  const testIntegrations = async () => { setIntLoading(true); const r = await devFetch('/integrations/test', { method: 'POST', body: JSON.stringify({}) }); setIntResult(r); setIntLoading(false); };
  const exportTenant = async (id, name) => { const r = await devFetchRaw(`/tenant/${id}/export`); const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${name.replace(/\s/g, '_')}_export.json`; a.click(); };
  const createStudio = async () => { const r = await devFetch('/studios/create', { method: 'POST', body: JSON.stringify(newStudio) }); setCreateResult(r); if (r.ok) { setNewStudio({ name: '', ownerName: '', ownerEmail: '', ownerPassword: '', plan: 'basic' }); await loadAll(); } };
  const sendBroadcast = async () => { const r = await devFetch('/broadcast', { method: 'POST', body: JSON.stringify(broadcast) }); if (!r.error) { setBroadcasts(p => [r, ...p]); setBroadcastSent(true); setBroadcast({ title: '', message: '', type: 'info' }); setTimeout(() => setBroadcastSent(false), 3000); } };
  const restartServer = async () => { if (!confirm('Reiniciar o servidor agora?')) return; await devFetch('/restart', { method: 'POST' }); alert('Reiniciando... aguarde 5 segundos e recarregue.'); };
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput; setChatInput(''); setChat(p => [...p, { role: 'user', text: msg }]); setChatLoading(true);
    const r = await devFetch('/ai', { method: 'POST', body: JSON.stringify({ message: msg, history: chat }) });
    setChat(p => [...p, { role: 'model', text: r.reply || r.error || 'Erro.' }]); setChatLoading(false);
  };

  const stColor = { ok: 'var(--success)', error: 'var(--danger)', not_configured: 'var(--muted-foreground)', central: 'var(--success)' };
  const typeColors = { info: 'var(--info)', warning: 'var(--warning)', success: 'var(--success)', error: 'var(--danger)' };
  const memMb = health?.memory?.heapUsed ? (health.memory.heapUsed / 1024 / 1024).toFixed(1) : '—';
  const getBookingsCount = (businessItem) => businessItem?._count?.bookings ?? businessItem?._count?.sessions ?? 0;

  if (!authed) return (
    <div style={S.loginWrap}>
      <div style={S.loginCard}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚙️</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>Developer Panel</h1>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: 32 }}>Service Manager — Acesso Restrito</p>
        <input type="text" placeholder="Usuário" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} style={{ ...S.input, marginBottom: 14, textAlign: 'center' }} autoComplete="username" />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} style={{ ...S.input, marginBottom: loginError ? 8 : 20, textAlign: 'center' }} autoComplete="current-password" />
        {loginError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 14 }}>{loginError}</p>}
        <button onClick={login} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', border: 'none', borderRadius: 10, color: 'var(--primary-foreground)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>Entrar</button>
      </div>
    </div>
  );

  return (
    <div style={S.wrap}>
      {/* Sidebar */}
      <aside style={S.side}>
        <div style={S.sideHeader}>
          <span style={{ fontSize: '1.4rem' }}>⚙️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)' }}>Dev Panel</div>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Service Manager</div>
          </div>
        </div>
        <nav style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} style={S.navBtn(tab === t.id)}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
        {stats && (
          <div style={{ padding: '10px 16px', fontSize: 12, color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)' }}>
            <div>🏢 {stats.studioCount} unidades • 👤 {stats.userCount} usuários</div>
            <div style={{ marginTop: 4 }}>⚙️ Node {stats.nodeVersion}</div>
          </div>
        )}
        <div style={S.sideFooter}>
          <button onClick={() => devFetch('/health').then(h => { setHealth(h); }).then(() => loadAll())} style={{ ...S.btn('var(--secondary)'), width: '100%', marginBottom: 8, justifyContent: 'center', fontSize: 12 }}>🔄 Atualizar dados</button>
          <button onClick={restartServer} style={{ ...S.btn('var(--danger)'), width: '100%', marginBottom: 8, justifyContent: 'center', fontSize: 12 }}>🔁 Reiniciar Servidor</button>
          <button onClick={() => { setAuthed(false); localStorage.removeItem('dev_token'); }} style={{ width: '100%', padding: '8px', border: '1px solid var(--danger)', borderRadius: 8, background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main style={S.main}>

        {/* ── SAÚDE ── */}
        {tab === 'health' && (
          <div>
            <h2 style={S.h2}>🟢 Status do Sistema</h2>
            {health ? (
              <>
                <div style={S.grid4}>
                  {[
                    { label: 'API', value: <span style={S.badge(health.api === 'ok' ? 'var(--success)' : 'var(--danger)')}>{health.api}</span> },
                    { label: 'Banco Central', value: <span style={S.badge(health.centralDb === 'ok' ? 'var(--success)' : 'var(--danger)')}>{health.centralDb}</span> },
                    { label: 'RAM Usada', value: `${memMb} MB` },
                    { label: 'Uptime', value: `${Math.floor(health.uptime / 60)}m ${Math.floor(health.uptime % 60)}s` },
                  ].map(c => (
                    <div key={c.label} style={S.card}>
                      <div style={S.cLabel}>{c.label}</div>
                      <div style={S.cValue}>{c.value}</div>
                    </div>
                  ))}
                </div>
                {health.tenants?.length > 0 && (
                  <div style={S.card}>
                    <h3 style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>Conexões de Tenant (DBs)</h3>
                    <table style={S.table}>
                      <thead><tr><th style={S.th}>Negócio</th><th style={S.th}>Status</th></tr></thead>
                      <tbody>{health.tenants.map(t => (
                        <tr key={t.id}><td style={S.td}>#{t.id}</td><td style={S.td}><span style={S.badge(stColor[t.status] || 'var(--muted-foreground)')}>{t.status}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </>
            ) : <div style={S.loading}>Carregando...</div>}
          </div>
        )}

        {/* ── ESTÚDIOS ── */}
        {tab === 'studios' && (
          <div>
            <h2 style={S.h2}>🏢 Todos os Negócios ({studios.length})</h2>
            <table style={S.table}>
              <thead><tr>{['ID','Nome','PublicId','Usuários','Clientes','Agendamentos','Leads','Status','Ação'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{studios.map(st => (
                <tr key={st.id}>
                  <td style={S.td}>{st.id}</td>
                  <td style={S.td}><strong>{st.name}</strong></td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)' }}>{st.publicId || '—'}</td>
                  <td style={S.td}>{st._count?.users}</td><td style={S.td}>{st._count?.clients}</td>
                  <td style={S.td}>{getBookingsCount(st)}</td><td style={S.td}>{st._count?.leads}</td>
                  <td style={S.td}><span style={S.badge(st.isActive ? 'var(--success)' : 'var(--muted-foreground)')}>{st.isActive ? 'ativo' : 'inativo'}</span></td>
                  <td style={S.td}><button onClick={() => toggleStudio(st.id)} style={S.btnSm(st.isActive ? 'var(--danger)' : 'var(--success)')}>{st.isActive ? 'Desativar' : 'Ativar'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* ── DADOS DO TENANT ── */}
        {tab === 'data' && (
          <div>
            <h2 style={S.h2}>📊 Dados por Unidade</h2>
            <div style={{ ...S.card, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={S.label}>Selecione o Negócio</label>
                <select value={tenantId} onChange={e => setTenantId(e.target.value)} style={S.input}>
                  <option value="">-- escolha --</option>
                  {studios.map(s => <option key={s.id} value={s.id}>{s.id} — {s.name}</option>)}
                </select>
              </div>
              <button onClick={loadTenantData} style={S.btn()} disabled={!tenantId}>Carregar dados</button>
            </div>
            {tenantLoading && <div style={S.loading}>Carregando dados do tenant...</div>}
            {tenantData && !tenantData.error && (
              <div>
                {[
                  { label: 'Clientes', key: 'clients', cols: ['ID','Nome','Telefone','Criado em'] },
                  { label: 'Agendamentos', key: 'sessions', cols: ['ID','Status','Valor','Criado em'] },
                  { label: 'Leads', key: 'leads', cols: ['ID','Nome','Status','Criado em'] },
                  { label: 'Profissionais', key: 'artists', cols: ['ID','Nome','Especialidade'] },
                ].map(section => (
                  <div key={section.key} style={{ marginBottom: 24 }}>
                    <h3 style={{ color: 'var(--muted-foreground)', fontSize: 13, marginBottom: 10 }}>{section.label} ({tenantData[section.key]?.length})</h3>
                    <table style={S.table}><thead><tr>{section.cols.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
                      <tbody>{(tenantData[section.key] || []).map(row => (
                        <tr key={row.id}>{Object.values(row).map((v, i) => (
                          <td key={i} style={S.td}>{v instanceof Date || (typeof v === 'string' && v.includes('T')) ? new Date(v).toLocaleString('pt-BR') : String(v ?? '—')}</td>
                        ))}</tr>
                      ))}</tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
            {tenantData?.error && <div style={{ color: 'var(--danger)' }}>{tenantData.error}</div>}
          </div>
        )}

        {/* ── QUERY SQL ── */}
        {tab === 'query' && (
          <div>
            <h2 style={S.h2}>🗄️ Query SQL Direta</h2>
            <div style={S.card}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Banco de dados</label>
                <select value={sqlTarget} onChange={e => setSqlTarget(e.target.value)} style={{ ...S.input, marginBottom: 12 }}>
                  <option value="central">Central (negócios, usuários)</option>
                  {studios.map(s => <option key={s.id} value={s.id}>Tenant: {s.name}</option>)}
                </select>
                <label style={S.label}>Query SQL</label>
                <textarea value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} rows={5} style={{ ...S.input, fontFamily: 'monospace', resize: 'vertical' }} />
              </div>
              <button onClick={runSQL} disabled={sqlLoading} style={S.btn()}>
                {sqlLoading ? '⏳ Executando...' : '▶ Executar'}
              </button>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 11, marginTop: 10 }}>⚠️ Somente consultas de leitura (SELECT, WITH, EXPLAIN, PRAGMA) são permitidas.</p>
            </div>
            {sqlResult?.rows && (
              <div style={S.card}>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>{sqlResult.rows.length} linha(s)</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={S.table}><thead><tr>{Object.keys(sqlResult.rows[0] || {}).map(k => <th key={k} style={S.th}>{k}</th>)}</tr></thead>
                    <tbody>{sqlResult.rows.map((row, i) => <tr key={i}>{Object.values(row).map((v, j) => <td key={j} style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{JSON.stringify(v)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
            {sqlResult?.error && <div style={{ ...S.card, color: 'var(--danger)', borderColor: 'var(--danger)' }}>{sqlResult.error}</div>}
          </div>
        )}

        {/* ── USUÁRIOS ── */}
        {tab === 'users' && (
          <div>
            <h2 style={S.h2}>👥 Usuários ({users.length})</h2>
            {resetUser && (
              <div style={{ ...S.card, border: '1px solid var(--primary)', marginBottom: 20 }}>
                <strong style={{ color: 'var(--primary)' }}>Reset de senha — {resetUser.name}</strong>
                <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
                  <input type="password" placeholder="Nova senha (mín. 6 chars)" value={resetPwd} onChange={e => setResetPwd(e.target.value)} style={{ ...S.input, flex: 1 }} />
                  <button onClick={resetPassword} style={S.btn('var(--primary)')}>Confirmar</button>
                  <button onClick={() => setResetUser(null)} style={S.btn('var(--secondary)')}>Cancelar</button>
                </div>
              </div>
            )}
            <table style={S.table}>
              <thead><tr>{['ID','Nome','Email','Estúdio','Função','Status','Ações'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{users.map(u => (
                <tr key={u.id}>
                  <td style={S.td}>{u.id}</td>
                  <td style={S.td}><strong>{u.name}</strong></td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{u.email}</td>
                  <td style={S.td}>{u.business?.name || u.studio?.name || '—'}</td>
                  <td style={S.td}><span style={S.badge(u.role === 'admin' ? 'var(--primary)' : 'var(--secondary)')}>{u.role}</span></td>
                  <td style={S.td}><span style={S.badge(u.isActive !== false ? 'var(--success)' : 'var(--muted-foreground)')}>{u.isActive !== false ? 'ativo' : 'inativo'}</span></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => toggleUser(u.id)} style={S.btnSm(u.isActive !== false ? 'var(--danger)' : 'var(--success)')}>{u.isActive !== false ? 'Desativar' : 'Ativar'}</button>
                      <button onClick={() => setResetUser(u)} style={S.btnSm('var(--primary)')}>Reset pwd</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* ── MIGRAÇÕES ── */}
        {tab === 'migrate' && (
          <div>
            <h2 style={S.h2}>⚡ Migração de Banco de Dados</h2>
            <div style={S.card}>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: 16 }}>Executa <span style={S.code}>prisma db push</span> em todos os bancos. O resultado é salvo no histórico.</p>
              <button onClick={runMigrate} disabled={migrating} style={{ ...S.btn(), opacity: migrating ? 0.6 : 1 }}>
                {migrating ? '⏳ Migrando todos os bancos...' : '▶ Executar Migração'}
              </button>
            </div>
            {migrateResult?.results && (
              <div style={S.card}>
                <h3 style={{ color: 'var(--muted-foreground)', fontSize: 13, marginBottom: 12 }}>Resultado — {migrateResult.completedAt}</h3>
                <table style={S.table}><thead><tr>{['Target','Status','Detalhe'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>{migrateResult.results.map((r, i) => (
                    <tr key={i}><td style={S.td}>{r.target}</td><td style={S.td}><span style={S.badge(r.status === 'ok' ? 'var(--success)' : 'var(--danger)')}>{r.status}</span></td><td style={{ ...S.td, fontSize: 12, color: 'var(--muted-foreground)' }}>{r.error || '✓'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── HISTÓRICO DE MIGRAÇÕES ── */}
        {tab === 'history' && (
          <div>
            <h2 style={S.h2}>📋 Histórico de Migrações</h2>
            {migHistory.length === 0 ? <div style={S.loading}>Nenhuma migração executada nesta sessão.</div> :
              migHistory.map(m => (
                <div key={m.id} style={{ ...S.card, marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <strong style={{ color: 'var(--foreground)' }}>{new Date(m.completedAt).toLocaleString('pt-BR')}</strong>
                    <span style={S.badge(m.results?.every(r => r.status === 'ok') ? 'var(--success)' : 'var(--danger)')}>
                      {m.results?.filter(r => r.status === 'ok').length}/{m.results?.length} ok
                    </span>
                  </div>
                  <table style={S.table}><thead><tr>{['Target','Status'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>{m.results?.map((r, i) => (<tr key={i}><td style={S.td}>{r.target}</td><td style={S.td}><span style={S.badge(r.status === 'ok' ? 'var(--success)' : 'var(--danger)')}>{r.status}</span></td></tr>))}</tbody>
                  </table>
                </div>
              ))}
          </div>
        )}

        {/* ── REQUISIÇÕES ── */}
        {tab === 'requests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ ...S.h2, marginBottom: 0 }}>📡 Monitor de Requisições</h2>
              <button onClick={loadRequests} style={S.btn('var(--secondary)')}>🔄 Atualizar</button>
            </div>
            <table style={S.table}>
              <thead><tr>{['Método','Rota','Status','Tempo','IP','Horário'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{requests.map(r => (
                <tr key={r.id}>
                  <td style={S.td}><span style={S.badge(r.method === 'GET' ? 'var(--info)' : r.method === 'POST' ? 'var(--success)' : r.method === 'DELETE' ? 'var(--danger)' : 'var(--muted-foreground)')}>{r.method}</span></td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{r.path}</td>
                  <td style={S.td}><span style={S.badge(r.status < 300 ? 'var(--success)' : r.status < 400 ? 'var(--warning)' : 'var(--danger)')}>{r.status}</span></td>
                  <td style={S.td}>{r.ms}ms</td>
                  <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12 }}>{r.ip}</td>
                  <td style={{ ...S.td, fontSize: 12 }}>{new Date(r.at).toLocaleTimeString('pt-BR')}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* ── INTEGRAÇÕES ── */}
        {tab === 'integrations' && (
          <div>
            <h2 style={S.h2}>🔌 Teste de Integrações</h2>
            <div style={S.card}>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: 16 }}>Testa a conectividade com todas as integrações configuradas no <span style={S.code}>.env</span>.</p>
              <button onClick={testIntegrations} disabled={intLoading} style={S.btn()}>
                {intLoading ? '⏳ Testando...' : '▶ Testar Todas as Integrações'}
              </button>
            </div>
            {intResult && (
              <div style={{ ...S.grid2, marginTop: 16 }}>
                {Object.entries(intResult).map(([key, val]) => (
                  <div key={key} style={{ ...S.card, borderLeft: `4px solid ${stColor[val.status] || 'var(--muted-foreground)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong style={{ textTransform: 'capitalize', color: 'var(--foreground)' }}>{key}</strong>
                      <span style={S.badge(stColor[val.status] || 'var(--muted-foreground)')}>{val.status}</span>
                    </div>
                    {val.state && <div style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>State: {JSON.stringify(val.state)}</div>}
                    {val.nickname && <div style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Conta: {val.nickname} ({val.id})</div>}
                    {val.error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{val.error}</div>}
                    {val.status === 'not_configured' && <div style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Não configurado no .env</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BACKUP / EXPORT ── */}
        {tab === 'export' && (
          <div>
            <h2 style={S.h2}>💾 Backup / Exportar Dados</h2>
            <table style={S.table}>
              <thead><tr>{['ID','Nome','Clientes','Agendamentos','Leads','Exportar'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
              <tbody>{studios.map(st => (
                <tr key={st.id}>
                  <td style={S.td}>{st.id}</td>
                  <td style={S.td}><strong>{st.name}</strong></td>
                  <td style={S.td}>{st._count?.clients}</td>
                  <td style={S.td}>{getBookingsCount(st)}</td>
                  <td style={S.td}>{st._count?.leads}</td>
                  <td style={S.td}>
                    <button onClick={() => exportTenant(st.id, st.name)} style={S.btnSm('var(--info)')}>⬇ JSON</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            <div style={{ ...S.card, marginTop: 20, color: 'var(--muted-foreground)', fontSize: 13 }}>
              💡 O export inclui todos os clientes, agendamentos, leads, profissionais e inventário do negócio em formato JSON.
            </div>
          </div>
        )}

        {/* ── CRIAR ESTÚDIO ── */}
        {tab === 'create' && (
          <div>
            <h2 style={S.h2}>➕ Criar Novo Negócio</h2>
            <div style={{ ...S.card, maxWidth: 520 }}>
              {[
                { key: 'name', label: 'Nome do Negócio', type: 'text', placeholder: 'Ex: Clínica de Estética Bella' },
                { key: 'ownerName', label: 'Nome do Proprietário', type: 'text', placeholder: 'Ex: Carlos Mendes' },
                { key: 'ownerEmail', label: 'Email do Proprietário', type: 'email', placeholder: 'Ex: carlos@studioredin.com' },
                { key: 'ownerPassword', label: 'Senha inicial', type: 'password', placeholder: 'Mínimo 6 caracteres' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={S.label}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={newStudio[f.key]} onChange={e => setNewStudio(p => ({ ...p, [f.key]: e.target.value }))} style={S.input} />
                </div>
              ))}
              <div style={{ marginBottom: 18 }}>
                <label style={S.label}>Plano</label>
                <select value={newStudio.plan} onChange={e => setNewStudio(p => ({ ...p, plan: e.target.value }))} style={S.input}>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <button onClick={createStudio} style={S.btn()}>✅ Criar Negócio</button>
              {createResult?.ok && <div style={{ color: 'var(--success)', marginTop: 12 }}>✅ Negócio criado! ID: {createResult.studio?.id} | PublicId: {createResult.studio?.publicId}</div>}
              {createResult?.error && <div style={{ color: 'var(--danger)', marginTop: 12 }}>{createResult.error}</div>}
            </div>
          </div>
        )}

        {/* ── BROADCAST ── */}
        {tab === 'broadcast' && (
          <div style={S.grid2}>
            <div>
              <h2 style={S.h2}>📢 Novo Broadcast</h2>
              <div style={S.card}>
                <div style={{ marginBottom: 14 }}><label style={S.label}>Tipo</label>
                  <select value={broadcast.type} onChange={e => setBroadcast(p => ({ ...p, type: e.target.value }))} style={S.input}>
                    {[['info','ℹ️ Informação'],['warning','⚠️ Aviso'],['success','✅ Sucesso'],['error','🚨 Urgente']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}><label style={S.label}>Título</label><input value={broadcast.title} onChange={e => setBroadcast(p => ({ ...p, title: e.target.value }))} style={S.input} placeholder="Título do aviso" /></div>
                <div style={{ marginBottom: 18 }}><label style={S.label}>Mensagem</label><textarea value={broadcast.message} onChange={e => setBroadcast(p => ({ ...p, message: e.target.value }))} rows={4} style={{ ...S.input, resize: 'vertical' }} placeholder="Descrição..." /></div>
                <button onClick={sendBroadcast} style={S.btn()}>{broadcastSent ? '✅ Enviado!' : '📢 Enviar para Todos'}</button>
              </div>
            </div>
            <div>
              <h2 style={S.h2}>📋 Histórico ({broadcasts.length})</h2>
              {broadcasts.map(b => (
                <div key={b.id} style={{ ...S.card, borderLeft: `4px solid ${typeColors[b.type] || 'var(--info)'}`, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ color: 'var(--foreground)' }}>{b.title}</strong><span style={S.badge(typeColors[b.type])}>{b.type}</span></div>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: 12, margin: '6px 0' }}>{b.message}</p>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>{new Date(b.createdAt).toLocaleString('pt-BR')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── IA ASSISTANT ── */}
        {tab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
            <h2 style={S.h2}>🤖 IA Developer Assistant <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 400 }}>— Llama 3.3 via Groq</span></h2>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 12 }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: 12, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', ...(m.role === 'user' ? { background: 'var(--primary)', color: 'var(--primary-foreground)', borderBottomRightRadius: 4 } : { background: 'var(--border)', color: 'var(--foreground)', borderBottomLeftRadius: 4 }) }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && <div style={{ color: 'var(--muted-foreground)', fontSize: 13, padding: 8 }}>⏳ Pensando...</div>}
              <div ref={chatRef} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} placeholder="Pergunte sobre o sistema, banco de dados, bugs..." style={{ ...S.input, flex: 1 }} />
              <button onClick={sendChat} style={S.btn()}>Enviar</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}



