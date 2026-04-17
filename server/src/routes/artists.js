import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { centralPrisma } from '../lib/prisma.js';

const router = express.Router();

// GET /api/professionals
router.get('/', requireAuth, async (req, res) => {
  try {
    const professionals = await centralPrisma.professional.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { name: 'asc' }
    });
    res.json(professionals.map(a => {
      let parsedSettings = null;
      try {
        parsedSettings = a.notificationSettings ? JSON.parse(a.notificationSettings) : null;
      } catch (err) {
        console.error('Erro ao processar notificationSettings do profissional:', err.message);
        parsedSettings = null;
      }
      return { ...a, notificationSettings: parsedSettings };
    }));
  } catch {
    res.status(500).json({ error: 'Erro ao listar profissionais.' });
  }
});

// POST /api/professionals
router.post('/', requireAuth, async (req, res) => {
  const { name, specialty, phone, commission, notificationSettings } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório.' });
  try {
    const professional = await centralPrisma.professional.create({
      data: {
        name, specialty, phone,
        commission: commission ?? 60,
        notificationSettings: notificationSettings ? JSON.stringify(notificationSettings) : null,
        mpAccessToken: req.body.mpAccessToken || null,
        businessId: req.user.businessId
      }
    });
    res.status(201).json(professional);
  } catch {
    res.status(500).json({ error: 'Erro ao criar profissional.' });
  }
});

// PUT /api/professionals/:id
router.put('/:id', requireAuth, async (req, res) => {
  const { name, specialty, phone, commission, notificationSettings } = req.body;
  try {
    const existing = await centralPrisma.professional.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Profissional não encontrado ou acesso negado.' });
    }

    const professional = await centralPrisma.professional.update({
      where: { id: existing.id },
      data: {
        name, specialty, phone,
        commission: commission !== undefined ? Number(commission) : undefined,
        notificationSettings: notificationSettings ? JSON.stringify(notificationSettings) : undefined,
        mpAccessToken: req.body.mpAccessToken !== undefined ? req.body.mpAccessToken : undefined
      }
    });
    res.json(professional);
  } catch (err) {
    console.error('Erro ao atualizar profissional:', err);
    res.status(500).json({ error: 'Erro interno ao atualizar profissional.' });
  }
});

// DELETE /api/professionals/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await centralPrisma.professional.findFirst({
      where: { id: Number(req.params.id), businessId: req.user.businessId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Profissional não encontrado para remoção.' });
    }

    await centralPrisma.professional.delete({ where: { id: existing.id } });
    res.json({ message: 'Profissional removido com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover profissional:', err);
    res.status(500).json({ error: 'Erro interno ao remover profissional.' });
  }
});

export default router;
