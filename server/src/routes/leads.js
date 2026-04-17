import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

// PUBLIC POST /api/leads/public/:publicId
router.post('/public/:publicId', async (req, res) => {
  const { name, phone, email, origin, project, description, size, bodyLocation } = req.body;
  const { publicId } = req.params;

  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
  
  try {
    const business = await centralPrisma.business.findUnique({
      where: { publicId }
    });

    if (!business) {
      return res.status(404).json({ error: 'Negócio não encontrado.' });
    }

    const lead = await centralPrisma.lead.create({
      data: {
        name,
        phone,
        email,
        origin: origin || 'public_form',
        project: project || description,
        notes: [size ? `Tamanho: ${size}` : null, bodyLocation ? `Local: ${bodyLocation}` : null]
          .filter(Boolean)
          .join(' | ') || null,
        status: 'new',
        businessId: business.id
      }
    });
    res.status(201).json(lead);
  } catch (err) {
    console.error('Erro na criação de lead público:', err);
    res.status(500).json({ error: 'Erro interno ao criar lead.' });
  }
});

// GET /api/leads
router.get('/', requireAuth, async (req, res) => {
  try {
    const leads = await centralPrisma.lead.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leads);
  } catch (err) {
    console.error('Erro ao listar leads:', err);
    res.status(500).json({ error: 'Erro ao listar leads.' });
  }
});

// PRIVATE POST /api/leads
router.post('/', requireAuth, async (req, res) => {
  const { name, phone, email, origin, project, description, status, notes, clientId } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
  try {
    // Validar cliente se fornecido
    if (clientId) {
      const client = await centralPrisma.client.findFirst({
        where: { id: Number(clientId), businessId: req.user.businessId }
      });
      if (!client) {
        return res.status(403).json({ error: 'Cliente inválido para este negócio.' });
      }
    }

    const lead = await centralPrisma.lead.create({
      data: {
        name, phone, email, origin, project: project || description,
        status: status || 'new', notes,
        clientId: clientId ? Number(clientId) : null,
        businessId: req.user.businessId
      }
    });
    res.status(201).json(lead);
  } catch (err) {
    console.error('Erro ao criar lead:', err);
    res.status(500).json({ error: 'Erro interno ao criar lead.' });
  }
});

// PUT /api/leads/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { name, phone, email, origin, project, description, status, notes, clientId } = req.body;
  try {
    const existing = await centralPrisma.lead.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Lead não encontrado para atualização.' });
    }

    if (clientId) {
      const client = await centralPrisma.client.findFirst({
        where: { id: Number(clientId), businessId: req.user.businessId }
      });
      if (!client) {
        return res.status(403).json({ error: 'Cliente inválido para este negócio.' });
      }
    }

    const lead = await centralPrisma.lead.update({
      where: { id: existing.id },
      data: {
        name,
        phone,
        email,
        origin,
        project: project || description,
        status,
        notes,
        clientId: clientId ? Number(clientId) : undefined,
      }
    });
    res.json(lead);
  } catch (err) {
    console.error('Erro ao atualizar lead:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar lead.' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await centralPrisma.lead.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Lead não encontrado para remoção.' });
    }

    await centralPrisma.lead.delete({ where: { id: existing.id } });
    res.json({ message: 'Lead removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover lead:', err);
    res.status(500).json({ error: 'Erro interno ao remover lead.' });
  }
});

export default router;
