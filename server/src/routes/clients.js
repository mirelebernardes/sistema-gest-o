import express from 'express';

import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

const safeJsonParse = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch (err) {
    console.error('Erro ao processar JSON do cliente:', err.message);
    return fallback;
  }
};

const parseAnamnesis = (record) => {
  const parsedData = safeJsonParse(record.data, {});
  return {
    ...record,
    ...parsedData,
    data: parsedData,
    timestamp: record.createdAt,
  };
};

const parseConsent = (record) => {
  const parsedData = safeJsonParse(record.data, {});
  return {
    ...record,
    ...parsedData,
    data: parsedData,
    timestamp: record.signedAt || record.createdAt,
  };
};

const parseClient = (client) => ({
  ...client,
  bodymap: safeJsonParse(client.bodymap, null),
  anamnesis: Array.isArray(client.anamnesis) ? client.anamnesis.map(parseAnamnesis) : client.anamnesis,
  consents: Array.isArray(client.consents) ? client.consents.map(parseConsent) : client.consents,
});

const ensureClientOwnership = async (clientId, businessId) => centralPrisma.client.findFirst({
  where: { id: Number(clientId), businessId },
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const clients = await centralPrisma.client.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { name: 'asc' },
      include: {
        bookings: true,
        anamnesis: true,
        consents: true,
        documents: true,
      },
    });

    res.json(clients.map(parseClient));
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    res.status(500).json({ error: 'Erro ao listar clientes.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const client = await centralPrisma.client.findFirst({
      where: {
        id: Number(req.params.id),
        businessId: req.user.businessId,
      },
      include: {
        bookings: { include: { professional: true, payments: true, services: true } },
        anamnesis: true,
        consents: true,
        documents: true,
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente nao encontrado ou acesso negado.' });
    }

    res.json(parseClient(client));
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    res.status(500).json({ error: 'Erro interno ao buscar cliente.' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, phone, email, birthdate, birthDate, notes, bodymap } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome obrigatorio.' });
  }

  try {
    const client = await centralPrisma.client.create({
      data: {
        name: name.trim(),
        phone,
        email,
        birthdate: birthdate ?? birthDate ?? null,
        notes,
        bodymap: bodymap ? JSON.stringify(bodymap) : null,
        businessId: req.user.businessId,
      },
    });

    res.status(201).json(parseClient(client));
  } catch (err) {
    console.error('Erro ao criar cliente:', err);
    res.status(500).json({ error: 'Erro ao criar cliente.' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, phone, email, birthdate, birthDate, notes, bodymap } = req.body;

  try {
    const existing = await ensureClientOwnership(req.params.id, req.user.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente nao encontrado para atualizacao.' });
    }

    const client = await centralPrisma.client.update({
      where: { id: existing.id },
      data: {
        name,
        phone,
        email,
        birthdate: birthdate ?? birthDate ?? undefined,
        notes,
        bodymap: bodymap !== undefined ? JSON.stringify(bodymap) : undefined,
      },
    });

    res.json(parseClient(client));
  } catch (err) {
    console.error('Erro ao atualizar cliente:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar cliente.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await ensureClientOwnership(req.params.id, req.user.businessId);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente nao encontrado para remocao.' });
    }

    await centralPrisma.client.delete({ where: { id: existing.id } });
    res.json({ message: 'Cliente removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover cliente:', err);
    res.status(500).json({ error: 'Erro interno ao remover cliente.' });
  }
});

router.post('/:id/anamnesis', requireAuth, async (req, res) => {
  try {
    const client = await ensureClientOwnership(req.params.id, req.user.businessId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente nao encontrado para vincular anamnese.' });
    }

    const payload = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
    const signature = req.body.signature ?? payload.signature ?? null;

    const anamnesis = await centralPrisma.anamnesis.create({
      data: {
        clientId: client.id,
        data: JSON.stringify(payload),
        signature,
      },
    });

    res.status(201).json(parseAnamnesis(anamnesis));
  } catch (err) {
    console.error('Erro ao salvar anamnese:', err);
    res.status(500).json({ error: 'Erro interno ao salvar anamnese.' });
  }
});

router.post('/:id/consents', requireAuth, async (req, res) => {
  try {
    const client = await ensureClientOwnership(req.params.id, req.user.businessId);
    if (!client) {
      return res.status(404).json({ error: 'Cliente nao encontrado para vincular consentimento.' });
    }

    const payload = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
    const signature = req.body.signature ?? payload.signature ?? null;
    const type = req.body.type ?? payload.type ?? 'geral';

    const consent = await centralPrisma.consent.create({
      data: {
        clientId: client.id,
        type,
        data: JSON.stringify(payload),
        signature,
        signedAt: new Date(),
      },
    });

    res.status(201).json(parseConsent(consent));
  } catch (err) {
    console.error('Erro ao salvar consentimento:', err);
    res.status(500).json({ error: 'Erro interno ao salvar consentimento.' });
  }
});

export default router;
