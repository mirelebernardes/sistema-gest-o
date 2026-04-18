import express from 'express';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();
const routeDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(routeDir, '../../..');
const ALLOWED_BROADCAST_TYPES = new Set(['info', 'warning', 'success', 'error']);
const DEV_PANEL_ENABLED = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_PANEL === 'true';

function parseId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeText(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength);
}

function toJsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? item.toString() : item)));
}

async function findStudioById(id) {
  return centralPrisma.business.findUnique({ where: { id } });
}

async function withTenantClient(studio, callback) {
  const { getTenantClient } = await import('../lib/prisma.js');
  const tenantPrisma = await getTenantClient(studio?.databaseUrl);

  try {
    return await callback(tenantPrisma);
  } finally {
    await tenantPrisma.$disconnect().catch(() => {});
  }
}

function runDbPush(databaseUrl = null) {
  const env = databaseUrl ? { ...process.env, DATABASE_URL: databaseUrl } : process.env;
  execSync('npx prisma db push --schema server/prisma/schema.prisma --skip-generate', {
    cwd: repoRoot,
    env,
    timeout: 60000,
    stdio: 'pipe',
  });
}

router.use((req, res, next) => {
  if (!DEV_PANEL_ENABLED) {
    return res.status(404).json({ error: 'Painel de desenvolvimento indisponível.' });
  }
  next();
});

// ── POST /api/dev/login (public) ──────────────────────────────────────────
router.post('/login', (req, res) => {
  if (!process.env.DEV_USER || !process.env.DEV_PASSWORD || !process.env.DEV_TOKEN) {
    return res.status(503).json({ error: 'Credenciais internas do painel não configuradas.' });
  }

  const username = normalizeText(req.body?.username, 120);
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ error: 'Informe usuario e senha.' });
  }
  if (
    username === process.env.DEV_USER &&
    password === process.env.DEV_PASSWORD
  ) {
    return res.json({ token: process.env.DEV_TOKEN });
  }
  return res.status(401).json({ error: 'Usuario ou senha incorretos.' });
});

// ── Middleware: require DEV_TOKEN header ───────────────────────────────────
const requireDevToken = (req, res, next) => {
  if (!process.env.DEV_TOKEN) {
    return res.status(503).json({ error: 'Token interno do painel não configurado.' });
  }

  const token = req.headers['x-dev-token'] || req.query.token;
  if (!token || token !== process.env.DEV_TOKEN) {
    return res.status(401).json({ error: 'Acesso interno nao autorizado.' });
  }
  next();
};
router.use(requireDevToken);

// ── GET /api/dev/health ────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    await centralPrisma.$queryRaw`SELECT 1`;
    const studios = await centralPrisma.business.findMany({ select: { id: true, databaseUrl: true } });

    const tenantStatus = await Promise.all(studios.map(async (studio) => {
      if (!studio.databaseUrl) return { id: studio.id, status: 'central' };
      try {
        await withTenantClient(studio, (tenantPrisma) => tenantPrisma.$queryRaw`SELECT 1`);
        return { id: studio.id, status: 'ok' };
      } catch {
        return { id: studio.id, status: 'error' };
      }
    }));

    res.json({
      api: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      centralDb: 'ok',
      tenants: tenantStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ api: 'ok', centralDb: 'error', error: err.message });
  }
});

// ── GET /api/dev/studios ───────────────────────────────────────────────────
router.get('/studios', async (req, res) => {
  try {
    const studios = await centralPrisma.business.findMany({
      include: {
        _count: { select: { users: true, clients: true, bookings: true, leads: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(studios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/dev/studios/:id/toggle ────────────────────────────────────
router.patch('/studios/:id/toggle', async (req, res) => {
  const studioId = parseId(req.params.id);
  if (!studioId) return res.status(400).json({ error: 'Negocio invalido.' });

  try {
    const studio = await findStudioById(studioId);
    if (!studio) return res.status(404).json({ error: 'Negocio nao encontrado.' });
    const updated = await centralPrisma.business.update({
      where: { id: studioId },
      data: { isActive: !studio.isActive }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dev/migrate ─────────────────────────────────────────────────
// Runs prisma db push on all tenant DBs + central DB
router.post('/migrate', async (req, res) => {
  const results = [];
  try {
    // Central DB
    try {
      runDbPush();
      results.push({ target: 'central', status: 'ok' });
    } catch (e) {
      results.push({ target: 'central', status: 'error', error: e.message });
    }

    // Tenant DBs
    const studios = await centralPrisma.business.findMany({
      where: { databaseUrl: { not: null } },
      select: { id: true, name: true, databaseUrl: true }
    });

    for (const studio of studios) {
      try {
        runDbPush(studio.databaseUrl);
        results.push({ target: studio.name, id: studio.id, status: 'ok' });
      } catch (e) {
        results.push({ target: studio.name, id: studio.id, status: 'error', error: e.message });
      }
    }

    res.json({ results, completedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message, results });
  }
});

// ── POST /api/dev/broadcast ────────────────────────────────────────────────
// Stores a broadcast message that all studios will receive
const broadcasts = [];
router.post('/broadcast', async (req, res) => {
  const title = normalizeText(req.body?.title, 120);
  const message = normalizeText(req.body?.message, 800);
  const type = ALLOWED_BROADCAST_TYPES.has(req.body?.type) ? req.body.type : 'info';

  if (!title || !message) {
    return res.status(400).json({ error: 'Titulo e mensagem sao obrigatorios.' });
  }

  const broadcast = { id: Date.now(), title, message, type, createdAt: new Date().toISOString() };
  broadcasts.unshift(broadcast);
  if (broadcasts.length > 50) broadcasts.pop();
  res.json(broadcast);
});

router.get('/broadcasts', (req, res) => {
  res.json(broadcasts);
});

// ── POST /api/dev/ai ───────────────────────────────────────────────────────
// Proxy to Groq API (free, no credit card needed)
router.post('/ai', async (req, res) => {
  const message = normalizeText(req.body?.message, 3000);
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];
  const apiKey = process.env.GROQ_API_KEY;
  if (!message) return res.status(400).json({ error: 'Informe uma pergunta para o assistente.' });
  if (!apiKey) return res.status(400).json({ error: 'GROQ_API_KEY nao configurada no ambiente.' });

  try {
    const { default: fetch } = await import('node-fetch');

    const messages = [
      {
        role: 'system',
        content: 'You are an expert developer assistant for a multi-tenant tattoo studio SaaS. The stack is: Node.js, Express, Prisma ORM, SQLite (dev) / PostgreSQL (prod), React, Vite. Help with maintenance, debugging, database queries, and feature development. Respond in Portuguese (Brazil).'
      },
      ...history.map((item) => ({
        role: item.role === 'model' ? 'assistant' : 'user',
        content: normalizeText(item.text, 3000),
      })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 2048
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || data.error?.message || 'Sem resposta da IA.';
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dev/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [studioCount, userCount] = await Promise.all([
      centralPrisma.business.count(),
      centralPrisma.user.count()
    ]);
    res.json({ studioCount, userCount, nodeVersion: process.version, env: process.env.NODE_ENV });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dev/tenant/:id/data ───────────────────────────────────────────
router.get('/tenant/:id/data', async (req, res) => {
  const studioId = parseId(req.params.id);
  if (!studioId) return res.status(400).json({ error: 'Negocio invalido.' });

  try {
    const studio = await findStudioById(studioId);
    if (!studio) return res.status(404).json({ error: 'Negocio nao encontrado.' });

    const { clients, sessions, leads, artists, schedules } = await withTenantClient(studio, async (tenantPrisma) => {
      const [clientRows, bookingRows, leadRows, professionalRows, scheduleRows] = await Promise.all([
        tenantPrisma.client.findMany({ take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, phone: true, createdAt: true } }),
        tenantPrisma.booking.findMany({ take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, totalValue: true, createdAt: true } }),
        tenantPrisma.lead.findMany({ take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, name: true, status: true, createdAt: true } }),
        tenantPrisma.professional.findMany({ select: { id: true, name: true, specialty: true } }),
        tenantPrisma.schedule.findMany({ take: 10, orderBy: { date: 'desc' }, select: { id: true, date: true, status: true } }).catch(() => []),
      ]);

      return {
        clients: clientRows,
        sessions: bookingRows,
        leads: leadRows,
        artists: professionalRows,
        schedules: scheduleRows,
      };
    });

    res.json({ studio: studio.name, clients, sessions, leads, artists, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dev/query ────────────────────────────────────────────────────
// Execute raw SQL on specified target (central | tenant id)
router.post('/query', async (req, res) => {
  const sql = String(req.body?.sql || '').trim();
  const target = req.body?.target || 'central';

  if (!sql) return res.status(400).json({ error: 'Informe uma consulta SQL.' });
  if (sql.length > 5000) return res.status(400).json({ error: 'Consulta muito longa.' });

  const firstKeyword = sql.split(/\s+/)[0]?.toLowerCase();
  if (!['select', 'with', 'explain', 'pragma'].includes(firstKeyword)) {
    return res.status(403).json({ error: 'Somente consultas de leitura sao permitidas neste painel.' });
  }

  try {
    let result;
    if (target === 'central') {
      result = await centralPrisma.$queryRawUnsafe(sql);
    } else {
      const studioId = parseId(target);
      if (!studioId) return res.status(400).json({ error: 'Negocio invalido.' });
      const studio = await findStudioById(studioId);
      if (!studio) return res.status(404).json({ error: 'Negocio nao encontrado.' });
      result = await withTenantClient(studio, (tenantPrisma) => tenantPrisma.$queryRawUnsafe(sql));
    }
    res.json({ rows: toJsonSafe(result) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dev/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const users = await centralPrisma.user.findMany({
      include: { business: { select: { name: true, id: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users.map((user) => {
      const sanitizedUser = { ...user };
      delete sanitizedUser.password;
      return sanitizedUser;
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/dev/users/:id/toggle ───────────────────────────────────────
router.patch('/users/:id/toggle', async (req, res) => {
  const userId = parseId(req.params.id);
  if (!userId) return res.status(400).json({ error: 'Usuario invalido.' });

  try {
    const user = await centralPrisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuario nao encontrado.' });
    const updated = await centralPrisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive }
    });
    res.json({ id: updated.id, name: updated.name, isActive: updated.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/dev/users/:id/reset-password ────────────────────────────────
router.patch('/users/:id/reset-password', async (req, res) => {
  const userId = parseId(req.params.id);
  const newPassword = String(req.body?.newPassword || '');
  if (!userId) return res.status(400).json({ error: 'Usuario invalido.' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Senha minima de 6 caracteres.' });
  try {
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash(newPassword, 10);
    await centralPrisma.user.update({ where: { id: userId }, data: { password: hash } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dev/integrations/test ───────────────────────────────────────
router.post('/integrations/test', async (req, res) => {
  const { type } = req.body;
  const results = {};
  try {
    const { default: fetch } = await import('node-fetch');
    if (type === 'whatsapp' || !type) {
      const url = process.env.WHATSAPP_INSTANCE_URL;
      if (!url) { results.whatsapp = { status: 'not_configured' }; }
      else {
        try {
          const r = await fetch(`${url}/instance/connectionState/${process.env.WHATSAPP_INSTANCE_ID}`, {
            headers: { apikey: process.env.WHATSAPP_API_KEY || '' }, signal: AbortSignal.timeout(5000)
          });
          const d = await r.json();
          results.whatsapp = { status: r.ok ? 'ok' : 'error', state: d?.instance?.state || d };
        } catch (e) { results.whatsapp = { status: 'error', error: e.message }; }
      }
    }
    if (type === 'mercadopago' || !type) {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!token) { results.mercadopago = { status: 'not_configured' }; }
      else {
        try {
          const r = await fetch('https://api.mercadopago.com/users/me', {
            headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000)
          });
          const d = await r.json();
          results.mercadopago = { status: r.ok ? 'ok' : 'error', nickname: d?.nickname, id: d?.id };
        } catch (e) { results.mercadopago = { status: 'error', error: e.message }; }
      }
    }
    if (type === 'groq' || !type) {
      const key = process.env.GROQ_API_KEY;
      if (!key) { results.groq = { status: 'not_configured' }; }
      else {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/models', {
            headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000)
          });
          results.groq = { status: r.ok ? 'ok' : 'error' };
        } catch (e) { results.groq = { status: 'error', error: e.message }; }
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dev/tenant/:id/export ─────────────────────────────────────────
router.get('/tenant/:id/export', async (req, res) => {
  const studioId = parseId(req.params.id);
  if (!studioId) return res.status(400).json({ error: 'Negocio invalido.' });

  try {
    const studio = await findStudioById(studioId);
    if (!studio) return res.status(404).json({ error: 'Negocio nao encontrado.' });
    const { clients, sessions, leads, artists, inventory } = await withTenantClient(studio, async (tenantPrisma) => {
      const [clientRows, bookingRows, leadRows, professionalRows, inventoryRows] = await Promise.all([
        tenantPrisma.client.findMany(),
        tenantPrisma.booking.findMany(),
        tenantPrisma.lead.findMany(),
        tenantPrisma.professional.findMany(),
        tenantPrisma.inventoryItem.findMany().catch(() => []),
      ]);

      return {
        clients: clientRows,
        sessions: bookingRows,
        leads: leadRows,
        artists: professionalRows,
        inventory: inventoryRows,
      };
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      studio: { id: studio.id, name: studio.name, publicId: studio.publicId },
      counts: { clients: clients.length, sessions: sessions.length, leads: leads.length, artists: artists.length },
      clients, sessions, leads, artists, inventory
    };
    const json = JSON.stringify(exportData, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="studio_${studio.id}_${Date.now()}.json"`);
    res.send(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dev/requests ─────────────────────────────────────────────────
router.get('/requests', async (req, res) => {
  try {
    const { requestLog } = await import('../index.js');
    res.json(requestLog);
  } catch {
    res.json([]);
  }
});

// ── Migrations history (in-memory)
const migrationHistory = [];
router.get('/migration-history', (req, res) => res.json(migrationHistory));

// Override migrate to store history
router.post('/migrate-v2', async (req, res) => {
  const results = [];
  try {
    try {
      runDbPush();
      results.push({ target: 'central', status: 'ok' });
    } catch (e) {
      results.push({ target: 'central', status: 'error', error: e.message.slice(0, 200) });
    }
    const studios = await centralPrisma.business.findMany({ where: { databaseUrl: { not: null } }, select: { id: true, name: true, databaseUrl: true } });
    for (const studio of studios) {
      try {
        runDbPush(studio.databaseUrl);
        results.push({ target: studio.name, id: studio.id, status: 'ok' });
      } catch (e) {
        results.push({ target: studio.name, id: studio.id, status: 'error', error: e.message.slice(0, 200) });
      }
    }
    const record = { id: Date.now(), completedAt: new Date().toISOString(), results };
    migrationHistory.unshift(record);
    if (migrationHistory.length > 20) migrationHistory.pop();
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message, results });
  }
});

// ── POST /api/dev/studios/create ──────────────────────────────────────────
router.post('/studios/create', async (req, res) => {
  const name = normalizeText(req.body?.name, 120);
  const ownerName = normalizeText(req.body?.ownerName, 120);
  const ownerEmail = normalizeText(req.body?.ownerEmail, 160).toLowerCase();
  const ownerPassword = String(req.body?.ownerPassword || '');
  const plan = normalizeText(req.body?.plan, 40) || 'basic';
  if (!name || !ownerEmail || !ownerPassword) return res.status(400).json({ error: 'Nome do negocio, email e senha do responsavel sao obrigatorios.' });
  if (!ownerEmail.includes('@')) return res.status(400).json({ error: 'Informe um email valido para o responsavel.' });
  if (ownerPassword.length < 6) return res.status(400).json({ error: 'A senha inicial precisa ter no minimo 6 caracteres.' });
  try {
    const bcrypt = await import('bcryptjs');
    const crypto = await import('crypto');
    const existingUser = await centralPrisma.user.findFirst({ where: { email: ownerEmail } });
    if (existingUser) return res.status(409).json({ error: 'Ja existe um usuario com este email.' });
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const publicId = `${slug || 'negocio'}-${crypto.default.randomBytes(3).toString('hex')}`;
    const passwordHash = await bcrypt.default.hash(ownerPassword, 10);
    const studio = await centralPrisma.business.create({
      data: {
        name, publicId, plan, isActive: true,
        users: {
          create: { name: ownerName || ownerEmail, email: ownerEmail, password: passwordHash, role: 'admin' }
        }
      },
      include: { users: { select: { id: true, email: true, name: true } } }
    });
    res.json({ ok: true, studio });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/dev/restart ─────────────────────────────────────────────────
router.post('/restart', (req, res) => {
  res.json({ ok: true, message: 'Servidor será reiniciado em 2 segundos...' });
  setTimeout(() => process.exit(0), 2000); // nodemon will restart
});

export default router;
